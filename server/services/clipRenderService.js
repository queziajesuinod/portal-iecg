const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { YoutubeVideo, VideoTranscript, VideoClip } = require('../models');
const ffmpeg = require('./ffmpegService');
const {
  ANIMATIONS, CAPTION_MODES, normalizeWord, hexToAssColor, sanitizePlan,
} = require('./captionStyle');

const TARGET_W = 1080;
const TARGET_H = 1920;
const TARGET_AR = 9 / 16;
// Le um numero de env com fallback (ignora valores vazios/invalidos).
function envNum(name, def) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : def;
}

// Reenquadramento com camera "operada a mao": ela persegue o rosto de forma
// CONTINUA e suave, com uma mola criticamente amortecida (sem overshoot, sem
// start-stop). O segredo do resultado fluido e (1) grade FINA de keyframes
// (~30 Hz) para o sendcmd nao dar teletransportes visiveis e (2) um seguidor
// continuo no lugar do antigo "trava-e-salta". Tunavel por env (ver .env.example).
const CAM_FPS = envNum('CLIP_CAM_FPS', 30); // Hz da grade do caminho de camera (keyframes finos)
const GRID_STEP = 1 / CAM_FPS; // s entre keyframes de crop (grade fina -> pan continuo)
// Janela do filtro de mediana ~0.7s (rejeita deteccoes outliers sem borrar o sinal).
const MEDIAN_WIN = (() => {
  const w = Math.round(0.7 / GRID_STEP);
  return w % 2 === 0 ? w + 1 : w;
})();
// Frequencia de corte (Hz) do seguidor no CENTRO: MENOR = mais leve/preguicoso.
// ~0.45 Hz da um deslize sem pressa quando o rosto esta bem enquadrado.
const SMOOTH_CUTOFF_HZ = envNum('CLIP_SMOOTH_CUTOFF_HZ', 0.45);
// Quanto a mola ENRIJECE quando o rosto se aproxima da borda (multiplicador da rigidez).
// Mantem o movimento leve no centro mas ALCANCA rapido nos movimentos grandes -> nunca
// deixa a pessoa fugir do quadro. MAIOR = catch-up mais agressivo.
const SMOOTH_CATCHUP = envNum('CLIP_SMOOTH_CATCHUP', 5);
// Margem de seguranca: fracao da largura do crop que fica de folga entre o rosto e a
// borda. O rosto NUNCA passa disso (trava dura). MAIOR = rosto mais centralizado.
const FRAME_MARGIN_FRAC = envNum('CLIP_FRAME_MARGIN_FRAC', 0.14);
// Zona morta: micro-movimentos do rosto dentro de +-X da largura do crop nao movem a
// camera (evita "respiracao" nervosa). MAIOR = camera mais parada.
const SAFE_ZONE_FRAC = envNum('CLIP_SAFE_ZONE_FRAC', 0.1);
// Teto de velocidade do pan (fracao da largura do crop / s) -> trava de seguranca (raramente
// atingida; a leveza vem do cutoff, nao daqui). Alto o bastante p/ nao perder o rosto.
const MAX_PAN_VEL_FRAC = envNum('CLIP_MAX_PAN_VEL_FRAC', 1);
const STATIC_RANGE_FRAC = 0.02; // se a camera anda menos que isso no clipe todo -> crop estatico
const FACE_SAMPLE_FPS = envNum('FACE_TRACK_SAMPLE_FPS', 10); // amostragem da deteccao (Hz)
// Enquadramento: por padrao a camera fica FIXA no orador (zero movimento). Para seguir
// o orador com pans suaves, defina CLIP_CROP_MODE=auto (e dose o movimento com
// CLIP_SAFE_ZONE_FRAC: maior = menos movimento).
const CROP_FIXED = !['auto', 'follow', 'dynamic', 'smooth'].includes(String(process.env.CLIP_CROP_MODE || '').toLowerCase());
const FACE_TRACK_SCRIPT = path.join(__dirname, '..', 'scripts', 'face_track.py');

// Estilo da legenda queimada (ASS)
const CAPTION_FONT_SIZE = 46;
const CAPTION_MARGIN_H = 60; // MarginL / MarginR (px)
const CAPTION_MARGIN_V = 820; // MarginV (px)
const CAPTION_FADE_MS = 130; // fade in/out (ms) -> transicao suave ao trocar de legenda
const CAPTION_POP_MS = 150; // duracao do "pop" (zoom-in) de entrada
const CAPTION_POP_SCALE = 82; // escala inicial (%) do pop -> anima ate 100
// Desloca TODAS as legendas no tempo (segundos). Positivo = ATRASA a legenda
// (use se ela estiver aparecendo adiantada em relacao a fala). Default 0.
const CAPTION_OFFSET_SEC = Number(process.env.CLIP_CAPTION_OFFSET_SEC || 0);
// ── Estilo base da legenda (defaults por env; o plano de estilo do clip sobrepoe) ──
// Fonte precisa estar instalada no VPS (fontconfig). Default Arial = comportamento atual.
const CAPTION_FONT = process.env.CLIP_CAPTION_FONT || 'Arial';
const CAPTION_PRIMARY_HEX = process.env.CLIP_CAPTION_COLOR || '#FFFFFF';
const CAPTION_HIGHLIGHT_HEX = process.env.CLIP_CAPTION_HIGHLIGHT_COLOR || '#FFD24A';
const CAPTION_ANIM = ANIMATIONS.includes(process.env.CLIP_CAPTION_ANIM)
  ? process.env.CLIP_CAPTION_ANIM : 'pop';
// Modo padrao da legenda: 'phrase' (frase por vez) ou 'word' (palavra por palavra).
const CAPTION_MODE = CAPTION_MODES.includes(process.env.CLIP_CAPTION_MODE)
  ? process.env.CLIP_CAPTION_MODE : 'phrase';
// Fator de tamanho das palavras-chave no modo 'word' (1.28 = 28% maiores).
const CAPTION_EMPHASIS_SCALE = envNum('CLIP_CAPTION_EMPHASIS_SCALE', 1.28);
// Largura util e limite de caracteres por linha (Arial Bold MAIUSCULO ~0.66*fontsize por char).
const CAPTION_AVAIL_W = TARGET_W - CAPTION_MARGIN_H * 2;
const MAX_CHARS_PER_LINE = Math.max(1, Math.floor(CAPTION_AVAIL_W / (CAPTION_FONT_SIZE * 0.66)));

function getClipRoot() {
  return process.env.CLIP_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'clips');
}

function getPythonBin() {
  return process.env.FACE_TRACK_PYTHON_PATH
    || process.env.WHISPER_PYTHON_PATH
    || (process.platform === 'win32' ? 'python' : 'python3');
}

function makeEven(n) {
  const v = Math.round(n);
  return v % 2 === 0 ? v : v - 1;
}

// ───────────────────────── Rastreamento de rosto ─────────────────────────

async function runFaceTrack(videoPath, start, end) {
  const outJson = path.join(os.tmpdir(), `facetrack-${crypto.randomBytes(4).toString('hex')}.json`);
  const args = [FACE_TRACK_SCRIPT, videoPath, String(start), String(end), outJson, String(FACE_SAMPLE_FPS)];
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(getPythonBin(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', (c) => { stderr += c.toString(); });
      proc.on('error', reject);
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr.slice(-300) || `exit ${code}`))));
    });
    const raw = await fs.readFile(outJson, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[clipRender] face tracking indisponivel (${err.message}); usando crop central`);
    return null;
  } finally {
    await fs.unlink(outJson).catch(() => {});
  }
}

// Filtro de mediana deslizante: remove picos isolados (deteccoes espurias) sem borrar o sinal.
function medianFilter(arr, win) {
  const half = Math.floor(win / 2);
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - half), Math.min(arr.length, i + half + 1))
      .slice().sort((a, b) => a - b);
    return slice[Math.floor(slice.length / 2)];
  });
}

// Interpola as amostras do centro do rosto sobre a grade fina e remove picos isolados
// (mediana). NAO suaviza o movimento aqui -> quem da o ease e o seguidor de camera
// (smoothCamera), que trabalha sobre este sinal ja limpo de outliers.
function buildFocusTrack(samples, srcW, duration) {
  const valid = (samples || [])
    .filter((s) => Number.isFinite(s.t) && Number.isFinite(s.cx))
    .sort((a, b) => a.t - b.t);
  if (valid.length === 0) return null;

  const times = [];
  for (let t = 0; t <= duration + 1e-6; t += GRID_STEP) times.push(Number(t.toFixed(3)));

  // Interpolacao linear das amostras (cx normalizado -> pixels).
  let j = 0;
  const interp = times.map((t) => {
    while (j < valid.length - 1 && valid[j + 1].t < t) j += 1;
    const a = valid[Math.min(j, valid.length - 1)];
    const b = valid[Math.min(j + 1, valid.length - 1)];
    let cx;
    if (t <= a.t || a === b) cx = a.cx;
    else if (t >= b.t) cx = b.cx;
    else cx = a.cx + (b.cx - a.cx) * ((t - a.t) / (b.t - a.t));
    return cx * srcW;
  });

  // Mediana: descarta deteccoes fora da curva antes de planejar a camera.
  const clean = medianFilter(interp, MEDIAN_WIN);
  return times.map((t, i) => ({ t, cxPx: clean[i] }));
}

// Seguidor continuo criticamente amortecido (mola sem overshoot) com rigidez ADAPTATIVA
// e trava de enquadramento. A camera persegue o rosto com ease natural; a rigidez e
// baixa perto do centro (movimento leve) e sobe conforme o rosto se aproxima da borda
// (alcanca rapido) -> leve quando calmo, firme quando a pessoa se move. Uma trava dura
// garante que o rosto NUNCA saia da margem segura: impossivel perder a pessoa.
//
//   x'' = w^2 (alvo - x) - 2w x'   (w cresce com a "urgencia" = quao perto da borda)
//
// Roda na grade fina (~30 Hz) para o pan sair continuo, nao em degraus.
function smoothCamera(focusPx, cropW) {
  const dt = GRID_STEP;
  const omega0 = 2 * Math.PI * SMOOTH_CUTOFF_HZ;
  const vMax = cropW * MAX_PAN_VEL_FRAC;
  const dead = cropW * SAFE_ZONE_FRAC;
  // Deslocamento maximo permitido entre o rosto e o centro do crop (deixa a margem de folga).
  const leash = cropW * Math.max(0.05, 0.5 - FRAME_MARGIN_FRAC);
  let x = focusPx[0];
  let v = 0;
  return focusPx.map((face) => {
    const raw = face - x;
    const urgency = Math.min(1, Math.abs(raw) / leash); // 0 no centro, 1 na borda segura
    // Zona morta so vale quando esta calmo; perto da borda ela some (nao pode ignorar o rosto).
    let err = raw;
    if (Math.abs(raw) <= dead && urgency < 0.9) err = 0;
    else if (err !== 0) err -= Math.sign(err) * Math.min(dead, Math.abs(err));
    // Rigidez adaptativa: leve no centro, firme perto da borda (cresce com urgency^2).
    const omega = omega0 * (1 + (SMOOTH_CATCHUP - 1) * urgency * urgency);
    const a = omega * omega * err - 2 * omega * v; // criticamente amortecido na rigidez atual
    v = Math.max(-vMax, Math.min(vMax, v + a * dt));
    const prev = x;
    x += v * dt;
    // Trava dura: o rosto nunca ultrapassa a margem segura.
    if (x < face - leash) x = face - leash;
    else if (x > face + leash) x = face + leash;
    v = (x - prev) / dt; // mantem v coerente com o movimento real (evita windup na trava)
    return x;
  });
}

// Define geometria do crop 9:16 e a trajetoria (estatica ou dinamica) de x.
function buildCropPlan(meta, samples, duration) {
  const { width: srcW, height: srcH } = meta;
  let cropW;
  let cropH;
  let y = 0;
  let trackable;

  if (srcW / srcH > TARGET_AR) {
    // Fonte mais larga que 9:16 -> recorta largura (altura cheia). Da pra seguir o rosto.
    cropH = makeEven(srcH);
    cropW = makeEven(srcH * TARGET_AR);
    trackable = true;
  } else {
    // Fonte mais alta/estreita -> recorta altura (largura cheia). Sem tracking horizontal.
    cropW = makeEven(srcW);
    cropH = makeEven(srcW / TARGET_AR);
    y = Math.max(0, Math.round((srcH - cropH) / 2));
    trackable = false;
  }

  const maxX = Math.max(0, srcW - cropW);
  const centerX = Math.round(maxX / 2);

  if (!trackable || maxX === 0) {
    return {
      cropW, cropH, y, mode: 'static', x: centerX
    };
  }

  const focus = buildFocusTrack(samples, srcW, duration);
  if (!focus) {
    return {
      cropW, cropH, y, mode: 'static', x: centerX
    };
  }

  // Modo FIXO (padrao): enquadra o orador na posicao mediana do clipe e NAO mexe.
  // Elimina qualquer "vai-e-volta" do rastreamento.
  if (CROP_FIXED) {
    const targetXs = focus
      .map((f) => Math.max(0, Math.min(maxX, Math.round(f.cxPx - cropW / 2))))
      .sort((a, b) => a - b);
    return {
      cropW, cropH, y, mode: 'static', x: targetXs[Math.floor(targetXs.length / 2)]
    };
  }

  // Caminho de camera: perseguicao continua e suave (mola criticamente amortecida).
  const camCenter = smoothCamera(focus.map((f) => f.cxPx), cropW);

  // Centro da camera -> x (canto esquerdo do crop), dentro dos limites.
  const xs = camCenter.map((cc) => Math.max(0, Math.min(maxX, Math.round(cc - cropW / 2))));

  const range = Math.max(...xs) - Math.min(...xs);
  if (range < cropW * STATIC_RANGE_FRAC) {
    // Camera praticamente imovel: crop estatico na mediana (evita keyframes a toa).
    const sorted = [...xs].sort((a, b) => a - b);
    return {
      cropW, cropH, y, mode: 'static', x: sorted[Math.floor(sorted.length / 2)]
    };
  }

  // Keyframes: so onde x muda (o sendcmd so dispara em mudancas reais).
  const keyframes = focus
    .map((f, i) => ({ t: f.t, x: xs[i] }))
    .filter((k, i, arr) => i === 0 || k.x !== arr[i - 1].x);

  return {
    cropW, cropH, y, mode: 'dynamic', keyframes, initialX: keyframes[0].x
  };
}

// ───────────────────────── Legendas (ASS) ─────────────────────────

function assTime(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.round((s - Math.floor(s)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function escapeAss(text) {
  return String(text || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .trim();
}

// Legenda no estilo Shorts/Reels: TUDO MAIUSCULO e sem nenhuma pontuacao.
// Mantem hifen/apostrofo dentro de palavras (ex.: NAO-SEI, D'AGUA) pra nao juntar letras.
function toCaption(text) {
  return escapeAss(text)
    .toUpperCase()
    .replace(/[.,;:!?¿¡…"“”«»()[\]{}/\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Empacota palavras em linhas de no maximo MAX_CHARS_PER_LINE (guloso).
function packLines(words) {
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= MAX_CHARS_PER_LINE) cur += ` ${w}`;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Quebra um texto que cabe em ate 2 linhas no ponto mais equilibrado possivel.
function balanceTwoLines(text) {
  if (text.length <= MAX_CHARS_PER_LINE) return text;
  const words = text.split(' ');
  if (words.length < 2) return text; // palavra unica gigante
  let best = null;
  let fallback = null;
  let line1 = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const line2 = words.slice(i).join(' ');
    const diff = Math.abs(line1.length - line2.length);
    if (fallback === null || diff < fallback.diff) fallback = { diff, line1, line2 };
    if (line1.length <= MAX_CHARS_PER_LINE && line2.length <= MAX_CHARS_PER_LINE && (best === null || diff < best.diff)) {
      best = { diff, line1, line2 };
    }
    line1 += ` ${words[i]}`;
  }
  const chosen = best || fallback;
  return `${chosen.line1}\\N${chosen.line2}`;
}

// Divide a legenda em blocos de NO MAXIMO 2 linhas. Se o texto nao couber em 2 linhas,
// vira varios blocos sequenciais (a frase avanca -> troca a legenda).
function chunkCaption(text) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  const lines = packLines(clean.split(' '));
  if (lines.length <= 2) return [balanceTwoLines(clean)];
  const chunks = [];
  for (let i = 0; i < lines.length; i += 2) chunks.push(lines.slice(i, i + 2).join('\\N'));
  return chunks;
}

// Resolve o estilo efetivo da legenda: defaults por env sobrepostos pelo plano do
// clip (diretor de arte via IA). Sem plano e sem env => identico ao estilo atual.
function resolveCaptionStyle(stylePlan) {
  const plan = sanitizePlan(stylePlan) || {};
  const animation = ANIMATIONS.includes(plan.animation) ? plan.animation : CAPTION_ANIM;
  const mode = CAPTION_MODES.includes(plan.mode) ? plan.mode : CAPTION_MODE;
  return {
    font: plan.font || CAPTION_FONT,
    primary: hexToAssColor(plan.primaryColor || CAPTION_PRIMARY_HEX),
    highlight: hexToAssColor(plan.highlightColor || CAPTION_HIGHLIGHT_HEX),
    animation,
    mode,
    emphasisScale: CAPTION_EMPHASIS_SCALE,
    keywords: new Set((plan.keywords || []).map(normalizeWord).filter(Boolean)),
  };
}

// Tag de override de ENTRADA por animacao (todas seguras quanto a posicao).
function buildIntro(animation) {
  const fadeOut = Math.round(CAPTION_FADE_MS / 2);
  const fad = `\\fad(${CAPTION_FADE_MS},${fadeOut})`;
  switch (animation) {
    case 'none':
      return '';
    case 'fade':
      return `{${fad}}`;
    case 'punch':
      return `{${fad}\\fscx115\\fscy115\\t(0,${CAPTION_POP_MS},\\fscx100\\fscy100)}`;
    case 'pop':
    default:
      return `{${fad}\\fscx${CAPTION_POP_SCALE}\\fscy${CAPTION_POP_SCALE}\\t(0,${CAPTION_POP_MS},\\fscx100\\fscy100)}`;
  }
}

// Destaca (troca de cor inline) as palavras-chave dentro de um bloco de legenda,
// preservando as quebras de linha (\N). Sem palavras-chave => devolve o bloco intacto.
function highlightChunk(chunk, style) {
  if (!style.keywords.size) return chunk;
  const open = `{\\c${style.highlight}}`;
  const close = `{\\c${style.primary}}`;
  return chunk
    .split(/(\\N)/)
    .map((part) => {
      if (part === '\\N') return part;
      return part
        .split(' ')
        .map((word) => (word && style.keywords.has(normalizeWord(word)) ? `${open}${word}${close}` : word))
        .join(' ');
    })
    .join('');
}

// ── Modo "palavra por palavra" (as palavras APARECEM e acumulam numa unica linha) ──

// Distribui o tempo do segmento [s,e] (relativos ao recorte) entre as palavras,
// proporcional ao tamanho de cada uma. Usado quando nao ha timestamp por palavra.
function estimateWordTimings(words, s, e) {
  const weights = words.map((w) => Math.max(1, w.length));
  const totalW = weights.reduce((a, b) => a + b, 0);
  let t = s;
  return words.map((w, i) => {
    const dur = (e - s) * (weights[i] / totalW);
    const ws = t;
    const we = i === words.length - 1 ? e : t + dur;
    t = we;
    return { word: w, start: ws, end: we };
  });
}

// Palavras + tempos do segmento (relativos ao recorte). Se o Whisper gravou
// timestamp por palavra (seg.words, tempos ABSOLUTOS), usa o SINCRONISMO REAL —
// derivando palavra e tempo da MESMA fonte (evita divergir da contagem do texto).
// Senao, cai para a estimativa proporcional ao tamanho da palavra.
function segmentWords(seg, s, e, clipStart) {
  const real = Array.isArray(seg.words) ? seg.words : null;
  if (real && real.length) {
    const out = [];
    for (const w of real) {
      const token = toCaption(w.word); // normaliza igual a legenda (MAIUSCULA, sem pontuacao)
      if (!token) continue; // token so de pontuacao
      const rs = Number(w.start);
      const re = Number(w.end);
      out.push({
        word: token,
        start: Number.isFinite(rs) ? Math.max(s, Math.min(e, rs - clipStart)) : null,
        end: Number.isFinite(re) ? Math.max(s, Math.min(e, re - clipStart)) : null,
      });
    }
    // Garante tempos crescentes e sem buracos (preenche nulos/invertidos).
    let prev = s;
    for (let i = 0; i < out.length; i += 1) {
      if (out[i].start == null || out[i].start < prev) out[i].start = prev;
      if (out[i].end == null || out[i].end <= out[i].start) {
        out[i].end = i === out.length - 1 ? e : out[i].start + 0.12;
      }
      prev = out[i].end;
    }
    if (out.length) return out;
  }
  const words = toCaption(seg.text).split(' ').filter(Boolean);
  return estimateWordTimings(words, s, e);
}

// Renderiza uma palavra do modo 'word': keyword = maior + cor de destaque; a mais
// nova ("isNewest") ganha um leve "pop" de entrada (aparecer com vida, sem karaoke).
function renderWordToken(word, isNewest, style, baseFs, bigFs) {
  const kw = style.keywords.has(normalizeWord(word));
  const fontSize = kw ? bigFs : baseFs;
  const color = kw ? style.highlight : style.primary;
  let tags = `\\fs${fontSize}\\c${color}`;
  if (isNewest) tags += '\\fscx112\\fscy112\\t(0,90,\\fscx100\\fscy100)';
  return `{${tags}}${word}`;
}

// Agrupa as palavras em blocos que cabem em UMA linha (respeitando a largura util).
// Palavra-chave conta como maior (emphasisScale) para o bloco nao estourar a linha.
function groupWordsSingleLine(timed, style) {
  const groups = [];
  let cur = [];
  let curLen = 0;
  for (const tw of timed) {
    const kw = style.keywords.has(normalizeWord(tw.word));
    const eff = tw.word.length * (kw ? style.emphasisScale : 1);
    const need = cur.length ? curLen + 1 + eff : eff;
    if (cur.length && need > MAX_CHARS_PER_LINE) {
      groups.push(cur);
      cur = [tw];
      curLen = eff;
    } else {
      cur.push(tw);
      curLen = need;
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}

// Gera os Dialogue do segmento no modo 'word': para cada palavra, um evento que
// mostra as palavras do bloco ate ela (acumulando). Uma linha por vez.
function emitWordDialogues(seg, s, e, clipStart, duration, style) {
  const words = toCaption(seg.text).split(' ').filter(Boolean);
  if (!words.length) return [];
  const baseFs = CAPTION_FONT_SIZE;
  const bigFs = Math.round(CAPTION_FONT_SIZE * style.emphasisScale);
  const timed = segmentWords(seg, s, e, clipStart);
  const groups = groupWordsSingleLine(timed, style);

  const out = [];
  for (const group of groups) {
    for (let i = 0; i < group.length; i += 1) {
      const wsRaw = group[i].start;
      const weRaw = i < group.length - 1 ? group[i + 1].start : group[group.length - 1].end;
      const a = Math.max(0, Math.min(duration, wsRaw + CAPTION_OFFSET_SEC));
      const b = Math.max(0, Math.min(duration, weRaw + CAPTION_OFFSET_SEC));
      if (b - a < 0.04) continue;
      const text = group
        .slice(0, i + 1)
        .map((tw, idx) => renderWordToken(tw.word, idx === i, style, baseFs, bigFs))
        .join(' ');
      out.push(`Dialogue: 0,${assTime(a)},${assTime(b)},Legenda,,0,0,0,,${text}`);
    }
  }
  return out;
}

function buildAss(segments, start, end, stylePlan) {
  const duration = end - start;
  const dialogues = [];
  const style = resolveCaptionStyle(stylePlan);
  const intro = buildIntro(style.animation);
  for (const seg of segments || []) {
    const segStart = Number(seg.start);
    const segEnd = Number(seg.end);
    if (!(segEnd > start && segStart < end)) continue;

    // Quanto do segmento cai DENTRO do recorte. Se a fala aconteceu (na maior parte)
    // fora do corte, queimar o texto inteiro dela legenda "parte que nao esta" —
    // entao so incluimos segmentos majoritariamente dentro do corte (ou um segmento
    // gigante que cobre quase todo o recorte).
    const segDur = segEnd - segStart;
    const inClip = Math.min(segEnd, end) - Math.max(segStart, start);
    const mostlyInside = inClip >= 0.5 * segDur;
    const coversClip = inClip >= 0.8 * duration;
    if (inClip < 0.3 || !(mostlyInside || coversClip)) continue;

    const s = Math.max(0, segStart - start);
    const e = Math.min(duration, segEnd - start);
    if (e - s < 0.3) continue;

    // Modo palavra por palavra: as palavras aparecem/acumulam numa unica linha.
    if (style.mode === 'word') {
      const wordLines = emitWordDialogues(seg, s, e, start, duration, style);
      for (const line of wordLines) dialogues.push(line);
      continue;
    }

    const chunks = chunkCaption(toCaption(seg.text));
    if (!chunks.length) continue;
    // Reparte o tempo do segmento entre os blocos, proporcional ao tamanho de cada um.
    const weights = chunks.map((c) => Math.max(1, c.replace(/\\N/g, ' ').length));
    const totalW = weights.reduce((a, b) => a + b, 0);
    let cs = s;
    chunks.forEach((chunk, idx) => {
      const ce = idx === chunks.length - 1 ? e : Math.min(e, cs + (e - s) * (weights[idx] / totalW));
      if (ce - cs >= 0.05) {
        // Aplica o deslocamento global e mantem dentro dos limites do recorte.
        const a = Math.max(0, Math.min(duration, cs + CAPTION_OFFSET_SEC));
        const b = Math.max(0, Math.min(duration, ce + CAPTION_OFFSET_SEC));
        if (b - a >= 0.05) {
          dialogues.push(`Dialogue: 0,${assTime(a)},${assTime(b)},Legenda,,0,0,0,,${intro}${highlightChunk(chunk, style)}`);
        }
      }
      cs = ce;
    });
  }
  if (!dialogues.length) return null;

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${TARGET_W}
PlayResY: ${TARGET_H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda, ${style.font}, ${CAPTION_FONT_SIZE}, ${style.primary}, &H00000000, &H00000000, 1, 0, 0, 0, 100, 100, 0, 0, 3, 6, 0, 2, ${CAPTION_MARGIN_H}, ${CAPTION_MARGIN_H}, ${CAPTION_MARGIN_V}, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogues.join('\n')}
`;
}

function buildSendcmd(keyframes) {
  return `${keyframes.map((k) => `${k.t.toFixed(3)} crop x ${k.x};`).join('\n')}\n`;
}

// ───────────────────────── Render ─────────────────────────

async function renderClip(clipId, { onProgress } = {}) {
  const clip = await VideoClip.findByPk(clipId, {
    include: [{ model: YoutubeVideo, as: 'video' }],
  });
  if (!clip) throw new Error('Recorte nao encontrado');
  if (clip.status === 'rendering') throw new Error('Recorte ja esta renderizando');

  const { video } = clip;
  if (!video?.videoPath) throw new Error('Video completo nao esta em disco (baixe o video antes)');

  const start = Number(clip.startSeconds);
  const end = Number(clip.endSeconds);
  const duration = end - start;
  if (!(duration > 0)) throw new Error('Intervalo do recorte invalido');

  await clip.update({ status: 'rendering', errorMessage: null, renderProgress: 0 });

  const workDir = path.join(os.tmpdir(), `cliprender-${crypto.randomBytes(5).toString('hex')}`);
  try {
    await fs.mkdir(workDir, { recursive: true });
    await fs.mkdir(getClipRoot(), { recursive: true });

    const meta = await ffmpeg.probe(video.videoPath);

    // 1) Rastreamento de rosto (com fallback para crop central).
    const faceData = await runFaceTrack(video.videoPath, start, end);
    const plan = buildCropPlan(meta, faceData?.samples, duration);

    // 2) Legendas a partir dos segments.
    const transcript = await VideoTranscript.findOne({ where: { youtubeVideoId: video.id } });
    const ass = buildAss(transcript?.segments, start, end, clip.stylePlan);

    // 3) Monta o filtergraph (arquivos por nome-base; ffmpeg roda com cwd=workDir).
    const parts = [];
    if (plan.mode === 'dynamic') {
      await fs.writeFile(path.join(workDir, 'cmds.txt'), buildSendcmd(plan.keyframes));
      parts.push('sendcmd=f=cmds.txt');
      parts.push(`crop=${plan.cropW}:${plan.cropH}:${plan.initialX}:${plan.y}`);
    } else {
      parts.push(`crop=${plan.cropW}:${plan.cropH}:${plan.x}:${plan.y}`);
    }
    parts.push(`scale=${TARGET_W}:${TARGET_H}`);
    if (ass) {
      await fs.writeFile(path.join(workDir, 'sub.ass'), ass);
      parts.push('subtitles=sub.ass');
    }
    const filter = parts.join(',');

    const outName = `${video.videoId}-${clip.id}.mp4`;
    const outPath = path.join(getClipRoot(), outName);

    const args = [
      '-y',
      '-ss', String(start),
      '-i', video.videoPath,
      '-t', String(duration),
      '-filter_complex', filter,
      '-c:v', 'libx264',
      '-preset', process.env.CLIP_FFMPEG_PRESET || 'veryfast',
      '-crf', process.env.CLIP_FFMPEG_CRF || '20',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outPath,
    ];

    console.log(`[clipRender] ${clip.id} | ${duration.toFixed(1)}s | crop ${plan.mode} | legenda=${ass ? 'sim' : 'nao'}`);

    // Progresso do ffmpeg: parseia "time=HH:MM:SS.xx" e grava a % (com throttle).
    let lastPct = 0;
    let lastAt = 0;
    const onFfmpegStderr = (chunk) => {
      if (onProgress) onProgress(chunk);
      const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(chunk);
      if (!m || !(duration > 0)) return;
      const secs = Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]);
      const pct = Math.max(0, Math.min(99, Math.round((secs / duration) * 100)));
      const now = Date.now();
      if (pct > lastPct && (pct - lastPct >= 3 || now - lastAt >= 1500)) {
        lastPct = pct;
        lastAt = now;
        VideoClip.update({ renderProgress: pct }, { where: { id: clip.id } }).catch(() => {});
      }
    };

    await ffmpeg.run(ffmpeg.getFfmpeg(), args, {
      cwd: workDir,
      timeoutMs: Number(process.env.CLIP_RENDER_TIMEOUT_MS || 600000),
      onStderr: onFfmpegStderr,
    });

    const stat = await fs.stat(outPath);
    await clip.update({
      status: 'rendered',
      filePath: outPath,
      fileSizeBytes: stat.size,
      errorMessage: null,
      renderProgress: 100,
    });
    console.log(`[clipRender] concluido ${outName} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    return clip;
  } catch (err) {
    await clip.update({ status: 'failed', errorMessage: err.message }).catch(() => {});
    console.error(`[clipRender] erro no recorte ${clip.id}:`, err.message);
    throw err;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Posicao horizontal do crop num instante (relativo ao inicio do recorte).
function cropXAt(plan, relSeconds) {
  if (plan.mode !== 'dynamic') return plan.x;
  let best = plan.keyframes[0];
  for (const k of plan.keyframes) {
    if (k.t <= relSeconds) best = k;
    else break;
  }
  return best.x;
}

/**
 * Gera frames de amostra do enquadramento 9:16 (com rastreamento aplicado), SEM renderizar
 * o clipe inteiro. Serve para o admin ver como o corte vai ficar antes de renderizar.
 * Retorna { mode, tracking, frames: [{ t, dataUrl }] } (imagens JPEG em base64).
 */
async function generatePreviewFrames(clipId, { count = 3 } = {}) {
  const clip = await VideoClip.findByPk(clipId, {
    include: [{ model: YoutubeVideo, as: 'video' }],
  });
  if (!clip) throw new Error('Recorte nao encontrado');
  const { video } = clip;
  if (!video?.videoPath) throw new Error('Video completo nao esta em disco (baixe o video antes)');

  const start = Number(clip.startSeconds);
  const end = Number(clip.endSeconds);
  const duration = end - start;
  if (!(duration > 0)) throw new Error('Intervalo do recorte invalido');

  const meta = await ffmpeg.probe(video.videoPath);
  const faceData = await runFaceTrack(video.videoPath, start, end);
  const plan = buildCropPlan(meta, faceData?.samples, duration);

  // Preview em tamanho reduzido (mantendo 9:16) para o payload ficar leve.
  const pw = Math.round(TARGET_W / 3);
  const ph = Math.round(TARGET_H / 3);

  const workDir = path.join(os.tmpdir(), `clippreview-${crypto.randomBytes(4).toString('hex')}`);
  await fs.mkdir(workDir, { recursive: true });
  try {
    const frames = [];
    for (let i = 0; i < count; i += 1) {
      const frac = count === 1 ? 0.5 : i / (count - 1);
      const relT = frac * duration;
      const absT = start + relT;
      const x = cropXAt(plan, relT);
      const outJpg = path.join(workDir, `f${i}.jpg`);
      const filter = `crop=${plan.cropW}:${plan.cropH}:${x}:${plan.y},scale=${pw}:${ph}`;
      // eslint-disable-next-line no-await-in-loop
      await ffmpeg.run(ffmpeg.getFfmpeg(), [
        '-y', '-ss', String(absT), '-i', video.videoPath,
        '-frames:v', '1', '-filter_complex', filter, '-q:v', '4', outJpg,
      ], { timeoutMs: 60000 });
      // eslint-disable-next-line no-await-in-loop
      const buf = await fs.readFile(outJpg);
      frames.push({ t: Number(absT.toFixed(1)), dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}` });
    }
    return { mode: plan.mode, tracking: !!(faceData && faceData.samples && faceData.samples.length), frames };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Remove os arquivos de clips publicados ha mais de N dias (libera disco).
 * Mantem o registro no banco (status published, youtubeShortId), so limpa o filePath.
 */
async function cleanupPublishedClips({ days } = {}) {
  const d = Number(days ?? process.env.CLIP_CLEANUP_DAYS ?? 7);
  if (!Number.isFinite(d) || d <= 0) return { removed: 0, disabled: true };

  const { Op } = require('sequelize');
  const cutoff = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const clips = await VideoClip.findAll({
    where: {
      status: 'published',
      publishedAt: { [Op.lt]: cutoff },
      filePath: { [Op.ne]: null },
    },
  });

  let removed = 0;
  for (const clip of clips) {
    try {
      if (clip.filePath) {
        // eslint-disable-next-line no-await-in-loop
        await fs.unlink(clip.filePath).catch(() => {});
      }
      // eslint-disable-next-line no-await-in-loop
      await clip.update({ filePath: null, fileSizeBytes: null });
      removed += 1;
    } catch (err) {
      console.warn(`[clipCleanup] falha ao limpar clip ${clip.id}: ${err.message}`);
    }
  }
  return { removed, total: clips.length, days: d };
}

module.exports = {
  renderClip,
  generatePreviewFrames,
  cleanupPublishedClips,
  getClipRoot,
};
