import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import MovieIcon from '@mui/icons-material/Movie';
import PublishIcon from '@mui/icons-material/Publish';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import TuneIcon from '@mui/icons-material/Tune';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MovieCreationOutlinedIcon from '@mui/icons-material/MovieCreationOutlined';
import {
  fetchClips,
  suggestClips,
  requestClips,
  updateClip,
  approveClip,
  discardClip,
  renderClip,
  publishClip,
  fetchClipBlobUrl,
  downloadClipFile,
  runWorkerOnce,
} from '../../../utils/youtubeClient';

const STATUS_MAP = {
  suggested: { color: 'default', label: 'Sugerido' },
  approved: { color: 'info', label: 'Aprovado' },
  rendering: { color: 'warning', label: 'Renderizando…' },
  rendered: { color: 'primary', label: 'Renderizado' },
  publishing: { color: 'warning', label: 'Publicando…' },
  published: { color: 'success', label: 'Publicado' },
  failed: { color: 'error', label: 'Falhou' },
};

const LOCKED = ['rendering', 'publishing', 'published'];

function fmt(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// Barra que mostra a posição do recorte dentro do vídeo inteiro.
function Timeline({ start, end, total }) {
  const safeTotal = total > 0 ? total : Math.max(end, 1);
  const left = Math.min(100, Math.max(0, (start / safeTotal) * 100));
  const width = Math.min(100 - left, Math.max(1.5, ((end - start) / safeTotal) * 100));
  return (
    <Box
      sx={{
        position: 'relative', height: 6, borderRadius: 3, bgcolor: 'action.hover', my: 0.5,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          height: '100%',
          borderRadius: 3,
          bgcolor: 'primary.main',
          left: `${left}%`,
          width: `${width}%`,
        }}
      />
    </Box>
  );
}

Timeline.propTypes = {
  start: PropTypes.number.isRequired,
  end: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};

// Carrega a IFrame API do YouTube uma unica vez.
let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function ClipsPanel({
  videoId, youtubeVideoId, canGenerate, videoDuration,
}) {
  const [clips, setClips] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [previews, setPreviews] = useState({});
  const [expanded, setExpanded] = useState({});

  const playerRef = useRef(null);
  const playerDivRef = useRef(null);
  const stopAtRef = useRef(null);
  const previewsRef = useRef({});

  const setBusyFor = (key, val) => setBusy((b) => ({ ...b, [key]: val }));
  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const applyClips = useCallback((items) => {
    setClips(items);
    setDrafts((prev) => {
      const next = { ...prev };
      items.forEach((c) => {
        if (!next[c.id]) {
          next[c.id] = {
            title: c.title || '',
            caption: c.caption || '',
            startSeconds: Number(c.startSeconds),
            endSeconds: Number(c.endSeconds),
          };
        }
      });
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchClips(videoId);
      applyClips(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [videoId, applyClips]);

  useEffect(() => { load(); }, [load]);

  // Player do YouTube (video-fonte) para o scrubber "no olho".
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !playerDivRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(playerDivRef.current, {
        videoId: youtubeVideoId,
        playerVars: { rel: 0, modestbranding: 1 },
      });
    });
    return () => { cancelled = true; };
  }, [youtubeVideoId]);

  // Polling enquanto algum recorte esta renderizando/publicando.
  useEffect(() => {
    const active = clips.some((c) => c.status === 'rendering' || c.status === 'publishing');
    if (!active) return undefined;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [clips, load]);

  useEffect(() => () => {
    Object.values(previewsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const player = () => playerRef.current;
  const currentTime = () => {
    const p = player();
    return p && p.getCurrentTime ? p.getCurrentTime() : null;
  };

  const setDraft = (clipId, patch) => setDrafts((d) => ({ ...d, [clipId]: { ...d[clipId], ...patch } }));

  const playRange = (start, end) => {
    const p = player();
    if (!p || !p.seekTo) return;
    stopAtRef.current = end;
    p.seekTo(start, true);
    p.playVideo();
    const check = setInterval(() => {
      const pp = player();
      if (!pp || !pp.getCurrentTime) { clearInterval(check); return; }
      if (pp.getCurrentTime() >= stopAtRef.current) {
        pp.pauseVideo();
        clearInterval(check);
      }
    }, 200);
  };

  const setPoint = (clipId, field) => {
    const t = currentTime();
    if (t == null) { setFeedback({ severity: 'warning', message: 'Player ainda não carregou.' }); return; }
    setDraft(clipId, { [field]: Number(t.toFixed(2)) });
  };

  const nudge = (clipId, field, delta) => {
    setDrafts((d) => {
      const cur = Number(d[clipId][field]) || 0;
      return { ...d, [clipId]: { ...d[clipId], [field]: Number((cur + delta).toFixed(2)) } };
    });
  };

  const run = async (key, fn, okMsg) => {
    setBusyFor(key, true);
    setFeedback(null);
    try {
      await fn();
      if (okMsg) setFeedback({ severity: 'success', message: okMsg });
      await load();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setBusyFor(key, false);
    }
  };

  const doSuggest = () => run('suggest', async () => {
    await requestClips(videoId).catch(() => {});
    await suggestClips(videoId);
  }, 'Recortes sugeridos pela IA.');

  const doPrepare = async () => {
    setBusyFor('prepare', true);
    setFeedback(null);
    try {
      const r = await requestClips(videoId);
      if (r.ready) {
        setFeedback({ severity: 'success', message: 'Tudo pronto! Recarregue a página para gerar os recortes.' });
      } else {
        const parts = [];
        if (r.segmentsNeeded) parts.push('gerar os timestamps (Whisper) a partir da mídia no servidor');
        if (r.videoNeeded) parts.push('baixar o vídeo (helper) para renderizar os recortes');
        setFeedback({
          severity: 'info',
          message: `Preparo solicitado. Vai ${parts.join(' e ')}. Use “Rodar Whisper agora” ou aguarde o worker noturno; depois recarregue a página.`,
        });
      }
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setBusyFor('prepare', false);
    }
  };

  const doRunWorker = () => run('worker', () => runWorkerOnce(), 'Worker acionado. Aguarde alguns minutos e recarregue a página.');

  const doSave = (clip) => run(`save-${clip.id}`, async () => {
    const d = drafts[clip.id];
    if (Number(d.endSeconds) <= Number(d.startSeconds)) throw new Error('Fim deve ser maior que início.');
    await updateClip(clip.id, {
      title: d.title,
      caption: d.caption,
      startSeconds: Number(d.startSeconds),
      endSeconds: Number(d.endSeconds),
    });
  }, 'Recorte salvo.');

  const doApprove = (clip) => run(`approve-${clip.id}`, () => approveClip(clip.id), 'Recorte aprovado.');
  const doDiscard = (clip) => run(`discard-${clip.id}`, () => discardClip(clip.id));
  const doRender = (clip) => run(`render-${clip.id}`, () => renderClip(clip.id), 'Renderização iniciada…');
  const doPublish = (clip) => run(`publish-${clip.id}`, () => publishClip(clip.id), 'Publicação iniciada…');

  const doPreview = (clip) => run(`preview-${clip.id}`, async () => {
    const url = await fetchClipBlobUrl(clip.id);
    previewsRef.current[clip.id] = url;
    setPreviews((p) => ({ ...p, [clip.id]: url }));
  });

  const doDownload = (clip) => run(`download-${clip.id}`, () => downloadClipFile(clip.id, `recorte-${clip.position + 1}.mp4`));

  const total = videoDuration
    || clips.reduce((mx, c) => Math.max(mx, Number(c.endSeconds) || 0), 0)
    || 1;

  // Preview vertical 9:16 (thumbnail do Short) por recorte.
  const renderThumb = (clip) => {
    const previewUrl = previews[clip.id];
    const canPreview = ['rendered', 'published'].includes(clip.status);
    const loadingPreview = busy[`preview-${clip.id}`];
    return (
      <Box
        sx={{
          width: { xs: 84, sm: 104 },
          aspectRatio: '9 / 16',
          flexShrink: 0,
          borderRadius: 1.5,
          overflow: 'hidden',
          bgcolor: 'grey.900',
          color: 'grey.500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: canPreview && !previewUrl ? 'pointer' : 'default',
        }}
        onClick={canPreview && !previewUrl ? () => doPreview(clip) : undefined}
      >
        {previewUrl && (
          <video
            src={previewUrl}
            controls
            style={{
              width: '100%', height: '100%', objectFit: 'cover', background: '#000',
            }}
          />
        )}
        {!previewUrl && loadingPreview && <CircularProgress size={22} sx={{ color: 'grey.400' }} />}
        {!previewUrl && !loadingPreview && canPreview && (
          <Stack alignItems="center" spacing={0.5}>
            <PlayArrowIcon sx={{ fontSize: 30, color: 'grey.300' }} />
            <Typography variant="caption" sx={{ color: 'grey.400' }}>Ver</Typography>
          </Stack>
        )}
        {!previewUrl && !loadingPreview && !canPreview && (
          <Stack alignItems="center" spacing={0.5} sx={{ px: 1, textAlign: 'center' }}>
            <MovieCreationOutlinedIcon sx={{ fontSize: 26 }} />
            <Typography variant="caption">9:16</Typography>
          </Stack>
        )}
      </Box>
    );
  };

  const renderActions = (clip) => {
    const isRendered = clip.status === 'rendered';
    const isPublished = clip.status === 'published';
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        {/* CTA primaria por estado */}
        {isRendered && (
          <Button
            size="small" variant="contained" color="success" startIcon={<PublishIcon />}
            disabled={busy[`publish-${clip.id}`]} onClick={() => doPublish(clip)}
          >
            Publicar no Shorts
          </Button>
        )}
        {['approved', 'failed'].includes(clip.status) && (
          <Button
            size="small" variant="contained" startIcon={<MovieIcon />}
            disabled={busy[`render-${clip.id}`]} onClick={() => doRender(clip)}
          >
            Renderizar
          </Button>
        )}
        {clip.status === 'suggested' && (
          <Button
            size="small" variant="contained" startIcon={<CheckIcon />}
            disabled={busy[`approve-${clip.id}`]} onClick={() => doApprove(clip)}
          >
            Aprovar
          </Button>
        )}

        {/* Acoes secundarias */}
        {(isRendered || isPublished) && (
          <>
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} disabled={busy[`download-${clip.id}`]} onClick={() => doDownload(clip)}>
              Baixar
            </Button>
            {isRendered && (
              <Button size="small" color="inherit" startIcon={<MovieIcon />} disabled={busy[`render-${clip.id}`]} onClick={() => doRender(clip)}>
                Renderizar de novo
              </Button>
            )}
          </>
        )}
        {isPublished && clip.youtubeShortId && (
          <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => window.open(`https://youtube.com/shorts/${clip.youtubeShortId}`, '_blank', 'noopener')}>
            Ver no YouTube
          </Button>
        )}

        <Box sx={{ flexGrow: 1 }} />
        {!LOCKED.includes(clip.status) && (
          <Tooltip title="Descartar recorte">
            <span>
              <IconButton size="small" color="error" aria-label="Descartar recorte" disabled={busy[`discard-${clip.id}`]} onClick={() => doDiscard(clip)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
    );
  };

  const renderCard = (clip) => {
    const d = drafts[clip.id] || {};
    const st = STATUS_MAP[clip.status] || { color: 'default', label: clip.status };
    const locked = LOCKED.includes(clip.status);
    const dur = Math.round((d.endSeconds - d.startSeconds) || 0);
    const dirty = d.title !== (clip.title || '')
      || d.caption !== (clip.caption || '')
      || Number(d.startSeconds) !== Number(clip.startSeconds)
      || Number(d.endSeconds) !== Number(clip.endSeconds);
    return (
      <Paper
        key={clip.id}
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          transition: 'box-shadow 200ms ease',
          '&:hover': { boxShadow: 3 },
          borderColor: dirty ? 'warning.light' : undefined,
        }}
      >
        <Stack direction="row" spacing={2}>
          {renderThumb(clip)}

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" color={st.color} label={st.label} />
              <Chip size="small" variant="outlined" label={`${fmt(d.startSeconds)} – ${fmt(d.endSeconds)} · ${dur}s`} />
              {dirty && !locked && <Chip size="small" color="warning" variant="outlined" label="não salvo" />}
              <Box sx={{ flexGrow: 1 }} />
              <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => playRange(Number(d.startSeconds), Number(d.endSeconds))}>
                Ver trecho
              </Button>
            </Stack>

            <Timeline start={Number(d.startSeconds) || 0} end={Number(d.endSeconds) || 0} total={total} />

            <TextField
              label="Título"
              value={d.title}
              fullWidth
              size="small"
              sx={{ mt: 1.5, mb: 1 }}
              disabled={locked}
              onChange={(e) => setDraft(clip.id, { title: e.target.value })}
            />
            <TextField
              label="Legenda"
              value={d.caption}
              fullWidth
              size="small"
              multiline
              minRows={2}
              disabled={locked}
              onChange={(e) => setDraft(clip.id, { caption: e.target.value })}
            />

            {clip.reason && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                Por que a IA escolheu: {clip.reason}
              </Typography>
            )}
            {clip.status === 'failed' && clip.errorMessage && (
              <Alert severity="error" sx={{ mt: 1 }}>{clip.errorMessage}</Alert>
            )}

            {/* Ajuste fino de tempo (recolhido por padrão para não poluir) */}
            {!locked && (
              <Box sx={{ mt: 1 }}>
                <Button size="small" color="inherit" startIcon={<TuneIcon />} onClick={() => toggleExpand(clip.id)}>
                  {expanded[clip.id] ? 'Ocultar ajuste de tempo' : 'Ajustar tempo no olho'}
                </Button>
                <Collapse in={!!expanded[clip.id]} unmountOnExit>
                  <Box sx={{ pt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Dê play no vídeo acima, pare no ponto e clique em “= agora”. Ou ajuste em passos de ½s.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                      {[['startSeconds', 'Início'], ['endSeconds', 'Fim']].map(([field, label]) => (
                        <Stack key={field} direction="row" spacing={0.5} alignItems="center">
                          <TextField
                            label={`${label} (s)`}
                            type="number"
                            size="small"
                            value={d[field]}
                            onChange={(e) => setDraft(clip.id, { [field]: Number(e.target.value) })}
                            sx={{ width: 96 }}
                          />
                          <Tooltip title="Meio segundo antes"><Button size="small" onClick={() => nudge(clip.id, field, -0.5)}>-½s</Button></Tooltip>
                          <Tooltip title="Meio segundo depois"><Button size="small" onClick={() => nudge(clip.id, field, 0.5)}>+½s</Button></Tooltip>
                          <Button size="small" variant="outlined" onClick={() => setPoint(clip.id, field)}>= agora</Button>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Collapse>
              </Box>
            )}

            <Divider sx={{ my: 1.5 }} />

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {!locked && (
                <Button
                  size="small"
                  variant={dirty ? 'contained' : 'outlined'}
                  color={dirty ? 'warning' : 'inherit'}
                  disabled={busy[`save-${clip.id}`]}
                  onClick={() => doSave(clip)}
                >
                  Salvar
                </Button>
              )}
              <Box sx={{ flexGrow: 1 }}>{renderActions(clip)}</Box>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    );
  };

  // Player compacto e fixo (só aparece quando já dá para trabalhar os recortes).
  const renderPlayer = () => (
    <Paper
      variant="outlined"
      sx={{
        p: 0.5,
        mb: 2,
        bgcolor: 'black',
        position: 'sticky',
        top: 8,
        zIndex: 2,
        borderRadius: 2,
        width: '100%',
        maxWidth: 320,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative', pt: '56.25%' }}>
        <Box
          ref={playerDivRef}
          sx={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          }}
        />
      </Box>
    </Paper>
  );

  return (
    <Box>
      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Barra de ação (só quando já dá para sugerir) */}
      {!loading && canGenerate && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          {clips.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {clips.length} recorte{clips.length > 1 ? 's' : ''}
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Atualizar">
            <IconButton onClick={load} size="small" aria-label="Atualizar recortes"><RefreshIcon /></IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={busy.suggest ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            disabled={busy.suggest}
            onClick={doSuggest}
          >
            {clips.length ? 'Sugerir novamente' : 'Sugerir com IA'}
          </Button>
        </Stack>
      )}

      {loading && (
        <Stack spacing={2}>
          {[0, 1].map((i) => (
            <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={2}>
                <Skeleton variant="rounded" sx={{ width: 104, height: 184, borderRadius: 1.5 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton width="40%" height={28} />
                  <Skeleton width="100%" height={48} sx={{ mt: 1 }} />
                  <Skeleton width="100%" height={40} sx={{ mt: 1 }} />
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Estado 1: ainda não preparado — card único de preparo */}
      {!loading && !canGenerate && (
        <Paper
          variant="outlined"
          sx={{
            p: 4, textAlign: 'center', borderRadius: 2, borderStyle: 'dashed', maxWidth: 560, mx: 'auto',
          }}
        >
          <MovieCreationOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
          <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 600 }}>
            Prepare este vídeo para recortes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Vamos gerar os timestamps com o Whisper a partir da mídia que ainda está no servidor
            (e baixar o vídeo, se necessário). Depois disso a IA sugere os melhores trechos.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center">
            <Button
              variant="contained"
              disabled={busy.prepare}
              startIcon={busy.prepare ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={doPrepare}
            >
              Preparar para recortes
            </Button>
            <Button color="inherit" disabled={busy.worker} onClick={doRunWorker}>
              Rodar Whisper agora
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Estado 2/3: pronto — player + (vazio ou cards) */}
      {!loading && canGenerate && (
        <>
          {renderPlayer()}
          {clips.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4, textAlign: 'center', borderRadius: 2, borderStyle: 'dashed',
              }}
            >
              <MovieCreationOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                Nenhum recorte ainda. Clique em “Sugerir com IA” para gerar os melhores trechos.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {clips.map(renderCard)}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}

ClipsPanel.propTypes = {
  videoId: PropTypes.string.isRequired,
  youtubeVideoId: PropTypes.string.isRequired,
  canGenerate: PropTypes.bool,
  videoDuration: PropTypes.number,
};

ClipsPanel.defaultProps = {
  canGenerate: true,
  videoDuration: 0,
};

export default ClipsPanel;
