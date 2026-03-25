/**
 * Importação de registros de culto exportados do Google Forms.
 *
 * Uso:
 *   node server/scripts/importarCultosJSON.js <caminho-do-arquivo.json> [--campus "Nome"] [--dry-run]
 *
 * Exemplos:
 *   node server/scripts/importarCultosJSON.js dados/cultos.json
 *   node server/scripts/importarCultosJSON.js dados/cultos.json --dry-run
 *   node server/scripts/importarCultosJSON.js dados/cultos.json --campus "CAMPUS IECG CENTRO"
 *
 * Comportamento:
 *   - Se o JSON tiver coluna "CAMPUS", usa ela por linha.
 *   - Se passar --campus, usa esse valor para todas as linhas (override).
 *   - Ministros (QUEM MINISTROU?) são criados automaticamente se não existirem
 *     e vinculados ao registro.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');
const {
  RegistroCulto,
  Campus,
  Ministerio,
  TipoEvento,
  Ministro,
} = require('../models');

// ─── Configurações ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const arquivoPath = args.find((a) => !a.startsWith('--'));
const isDryRun = args.includes('--dry-run');
const campusArgIdx = args.indexOf('--campus');
const campusOverride = campusArgIdx !== -1 ? args[campusArgIdx + 1] : null;

if (!arquivoPath) {
  console.error('Uso: node importarCultosJSON.js <arquivo.json> [--campus "nome"] [--dry-run]');
  process.exit(1);
}

// Mapeamento: "Tipo de Culto" do Forms → nome do Ministério no banco
const TIPO_CULTO_MINISTERIO = {
  'Culto Acústico': 'Geral',
  'Só pra Elas': 'Geral',
  'Treinamento Líderes': 'Geral',
  'Sexta de Julho': 'Geral',
  'Juventude Relevante': 'Juventude Relevante',
  'Confêrencia Relevant': 'Juventude Relevante',
  'Confêrência Relevant': 'Juventude Relevante',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeInt(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === '*' || s === '-' || s === '.' || s === '--') return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : Math.max(0, n);
}

function parseData(str) {
  if (!str) return null;
  const s = String(str).trim();
  const parts = s.split('/');
  if (parts.length !== 3) return null;

  let p0 = parseInt(parts[0], 10);
  let p1 = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  if (year < 100) {
    year += 2000;
  } else if (year > 0 && year < 1900) {
    year += 2000;
  }

  let day;
  let month;
  if (p1 > 12) {
    month = p0;
    day = p1;
  } else if (p0 > 12) {
    day = p0;
    month = p1;
  } else {
    day = p0;
    month = p1;
  }

  if (!day || !month || !year || month > 12 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseHorario(str) {
  if (!str) return null;
  const s = String(str).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})(?::\d+)?\s*(AM|PM)?$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

function parseBool(val) {
  if (!val) return false;
  return String(val).trim().toUpperCase() === 'SIM';
}

function trim(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function normalizarNome(str) {
  return str.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function extrairNomes(texto) {
  if (!texto || !texto.trim()) return [];
  return texto
    .split(/,|\se\s|\s\/\s/i)
    .map(normalizarNome)
    .filter((n) => n.length > 0);
}

// ─── Processamento por registro ───────────────────────────────────────────────

async function resolverMinistros(nomesMinistros, ministroByNome, linha, avisos) {
  const resultado = await nomesMinistros.reduce(async (chain, nome) => {
    const acc = await chain;
    const chave = nome.toLowerCase();
    const existente = ministroByNome[chave];
    if (existente) {
      acc.push(existente);
      return acc;
    }
    if (!isDryRun) {
      const criado = await Ministro.create({ nome, ativo: true });
      // eslint-disable-next-line no-param-reassign
      ministroByNome[chave] = criado;
      acc.push(criado);
    }
    avisos.push(`[linha ${linha}] Ministro "${nome}" criado automaticamente`);
    return acc;
  }, Promise.resolve([]));
  return resultado;
}

async function processarRegistro(r, linha, ctx) {
  const {
    campusCache,
    ministerioByNome,
    tipoEventoByNome,
    ministroByNome,
    avisos,
  } = ctx;

  // ── Campus ──
  const campusNome = campusOverride || trim(r.CAMPUS);
  if (!campusNome) {
    avisos.push(`[linha ${linha}] Coluna CAMPUS vazia e --campus não informado — ignorado`);
    return false;
  }

  const chaveC = campusNome.toLowerCase();
  if (!campusCache[chaveC]) {
    const found = await Campus.findOne({ where: { nome: campusNome } });
    if (!found) {
      avisos.push(`[linha ${linha}] Campus "${campusNome}" não encontrado no banco — ignorado`);
      return false;
    }
    campusCache[chaveC] = found;
  }
  const campus = campusCache[chaveC];

  // ── Data ──
  const data = parseData(r.DATA);
  if (!data) {
    avisos.push(`[linha ${linha}] Data inválida: "${r.DATA}" — ignorado`);
    return false;
  }

  // ── Horário ──
  const horario = parseHorario(r.HORÁRIO);
  if (!horario) {
    avisos.push(`[linha ${linha}] Horário inválido: "${r.HORÁRIO}" — ignorado`);
    return false;
  }

  // ── Ministério ──
  const tipoCulto = trim(r['Tipo de Culto']) || '';
  const nomeMapeado = TIPO_CULTO_MINISTERIO[tipoCulto];
  let ministerio = nomeMapeado
    ? ministerioByNome[nomeMapeado.toLowerCase()]
    : null;
  if (!ministerio) ministerio = ministerioByNome[tipoCulto.toLowerCase()];
  if (!ministerio) {
    ministerio = ministerioByNome.geral;
    if (tipoCulto) {
      avisos.push(`[linha ${linha}] Tipo de Culto "${tipoCulto}" sem mapeamento → usando Geral`);
    }
  }

  // ── Tipo de Evento ──
  const tipoEventoNome = trim(r['TIPO DE EVENTO']) || '';
  if (!tipoEventoByNome[tipoEventoNome.toLowerCase()] && tipoEventoNome) {
    if (!isDryRun) {
      const te = await TipoEvento.create({ nome: tipoEventoNome, ativo: true });
      tipoEventoByNome[tipoEventoNome.toLowerCase()] = te;
    }
    avisos.push(`[linha ${linha}] Tipo de Evento "${tipoEventoNome}" criado automaticamente`);
  }
  const tipoEvento = tipoEventoByNome[tipoEventoNome.toLowerCase()] || null;

  // ── Ministros (pregadores) ──
  const quemMinistrou = trim(r['QUEM MINISTROU?']) || trim(r['QUEM MINISTROU:']);
  const nomesMinistros = extrairNomes(quemMinistrou || '');
  const ministrosDoRegistro = await resolverMinistros(nomesMinistros, ministroByNome, linha, avisos);

  // ── Campos condicionais ──
  const eSerie = parseBool(r['O CULTO FOI DE UMA SÉRIE?']);
  const nomeSerie = eSerie ? trim(r['SE FOR SÉRIE, QUAL NOME?']) : null;
  const teveApelo = parseBool(r['TEVE APELO?']);
  const qtdApelo = teveApelo ? sanitizeInt(r['SE SIM, QUANTIDADE DE PESSOAS NO APELO?']) : null;
  const qtdOnline = campus.transmiteOnline ? (sanitizeInt(r['QUANTIDADE ONLINE']) ?? 0) : null;
  const qtdCriancas = ministerio.exibeCriancas ? (sanitizeInt(r['QUANTIDADE DE CRIANÇAS']) ?? 0) : null;
  const qtdBebes = ministerio.exibeBebes ? (sanitizeInt(r['QUANTIDADE DE BEBÊS']) ?? 0) : null;

  const payload = {
    data,
    horario,
    campusId: campus.id,
    ministerioId: ministerio.id,
    tipoEventoId: tipoEvento ? tipoEvento.id : null,
    quemMinistrou: quemMinistrou || '(não informado)',
    tituloMensagem: trim(r['TÍTULO DA MENSAGEM']) || '(não informado)',
    eSerie,
    nomeSerie,
    qtdHomens: sanitizeInt(r['QUANTIDADE DE HOMENS']) ?? 0,
    qtdMulheres: sanitizeInt(r['QUANTIDADE DE MULHERES']) ?? 0,
    qtdCriancas,
    qtdBebes,
    qtdVoluntarios: sanitizeInt(r['QUANTIDADE DE VOLUNTÁRIOS']) ?? 0,
    qtdOnline,
    teveApelo,
    qtdApelo,
    comentarios: trim(r['COMENTÁRIOS ADICIONAIS']),
  };

  if (isDryRun) {
    const ministrosLog = ministrosDoRegistro.length > 0
      ? ministrosDoRegistro.map((m) => m.nome).join(', ')
      : quemMinistrou || '(sem ministro)';
    console.log(`[DRY RUN] ${data} ${horario} | ${campus.nome} | ${ministerio.nome} | ${ministrosLog} | ${payload.tituloMensagem}`);
  } else {
    const registro = await RegistroCulto.create(payload);
    if (ministrosDoRegistro.length > 0) {
      await registro.setMinistros(ministrosDoRegistro.map((m) => m.id));
    }
  }

  return true;
}

// ─── Função principal ─────────────────────────────────────────────────────────

async function run() {
  await sequelize.authenticate();

  const filePath = path.resolve(arquivoPath);
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const registros = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(`\nArquivo: ${filePath}`);
  console.log(`Registros encontrados: ${registros.length}`);
  console.log(`Campus: ${campusOverride ? `override → "${campusOverride}"` : 'lido da coluna CAMPUS por linha'}`);
  console.log(`Modo: ${isDryRun ? 'DRY RUN (nada será salvo)' : 'IMPORTAÇÃO REAL'}\n`);

  const campusCache = {};
  const ministerioByNome = {};
  const tipoEventoByNome = {};
  const ministroByNome = {};
  const avisos = [];

  (await Ministerio.findAll()).forEach((m) => { ministerioByNome[m.nome.toLowerCase()] = m; });
  (await TipoEvento.findAll()).forEach((t) => { tipoEventoByNome[t.nome.toLowerCase()] = t; });
  (await Ministro.findAll()).forEach((m) => { ministroByNome[m.nome.toLowerCase()] = m; });

  const ctx = {
    campusCache,
    ministerioByNome,
    tipoEventoByNome,
    ministroByNome,
    avisos,
  };

  const { importados, ignorados } = await registros.reduce(async (chain, r, i) => {
    const acc = await chain;
    const ok = await processarRegistro(r, i + 1, ctx);
    return {
      importados: acc.importados + (ok ? 1 : 0),
      ignorados: acc.ignorados + (ok ? 0 : 1),
    };
  }, Promise.resolve({ importados: 0, ignorados: 0 }));

  console.log('\n══════════════════════════════════════');
  console.log(`Importados : ${importados}`);
  console.log(`Ignorados  : ${ignorados}`);
  if (avisos.length > 0) {
    console.log(`\nAvisos (${avisos.length}):`);
    avisos.forEach((a) => console.log(' ', a));
  }
  console.log('══════════════════════════════════════\n');

  await sequelize.close();
}

run().catch((err) => {
  console.error('Erro na importação:', err);
  process.exit(1);
});
