import React, {
  useEffect, useRef, useState, useCallback
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
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
} from '../../../utils/youtubeClient';

const STATUS_MAP = {
  suggested: { color: 'default', label: 'Sugerido' },
  approved: { color: 'info', label: 'Aprovado' },
  rendering: { color: 'warning', label: 'Renderizando...' },
  rendered: { color: 'primary', label: 'Renderizado' },
  publishing: { color: 'warning', label: 'Publicando...' },
  published: { color: 'success', label: 'Publicado' },
  failed: { color: 'error', label: 'Falhou' },
};

function fmt(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

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

function ClipsPanel({ videoId, youtubeVideoId, canGenerate }) {
  const [clips, setClips] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [previews, setPreviews] = useState({});

  const playerRef = useRef(null);
  const playerDivRef = useRef(null);
  const stopAtRef = useRef(null);
  const previewsRef = useRef({});

  const setBusyFor = (key, val) => setBusy((b) => ({ ...b, [key]: val }));

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
    if (t == null) { setFeedback({ severity: 'warning', message: 'Player ainda nao carregou.' }); return; }
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

  const doSave = (clip) => run(`save-${clip.id}`, async () => {
    const d = drafts[clip.id];
    if (Number(d.endSeconds) <= Number(d.startSeconds)) throw new Error('Fim deve ser maior que inicio.');
    await updateClip(clip.id, {
      title: d.title,
      caption: d.caption,
      startSeconds: Number(d.startSeconds),
      endSeconds: Number(d.endSeconds),
    });
  }, 'Recorte salvo.');

  const doApprove = (clip) => run(`approve-${clip.id}`, () => approveClip(clip.id), 'Recorte aprovado.');
  const doDiscard = (clip) => run(`discard-${clip.id}`, () => discardClip(clip.id));
  const doRender = (clip) => run(`render-${clip.id}`, () => renderClip(clip.id), 'Renderizacao iniciada...');
  const doPublish = (clip) => run(`publish-${clip.id}`, () => publishClip(clip.id), 'Publicacao iniciada...');

  const doPreview = (clip) => run(`preview-${clip.id}`, async () => {
    const url = await fetchClipBlobUrl(clip.id);
    previewsRef.current[clip.id] = url;
    setPreviews((p) => ({ ...p, [clip.id]: url }));
  });

  const doDownload = (clip) => run(`download-${clip.id}`, () => downloadClipFile(clip.id, `recorte-${clip.position + 1}.mp4`));

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={28} /></Box>;
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Recortes / Shorts</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Atualizar">
          <IconButton onClick={load} size="small"><RefreshIcon /></IconButton>
        </Tooltip>
        {canGenerate && (
          <Button
            variant="contained"
            startIcon={busy.suggest ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            disabled={busy.suggest}
            onClick={doSuggest}
          >
            {clips.length ? 'Sugerir novamente' : 'Sugerir recortes com IA'}
          </Button>
        )}
      </Stack>

      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!canGenerate && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Este vídeo ainda não tem timestamps/vídeo prontos para recortes. Solicite o preparo e aguarde o helper baixar o vídeo e o Whisper gerar os segments.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'black' }}>
        <Box sx={{ position: 'relative', pt: '56.25%' }}>
          <Box ref={playerDivRef} sx={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'
          }} />
        </Box>
        <Typography variant="caption" sx={{ color: 'grey.400', px: 1 }}>
          Use o player para achar o ponto e clique em &quot;Início = agora&quot; / &quot;Fim = agora&quot; em cada recorte.
        </Typography>
      </Paper>

      {clips.length === 0 && (
        <Typography color="text.secondary">Nenhum recorte ainda. {canGenerate && 'Clique em “Sugerir recortes com IA”.'}</Typography>
      )}

      <Stack spacing={2}>
        {clips.map((clip) => {
          const d = drafts[clip.id] || {};
          const st = STATUS_MAP[clip.status] || { color: 'default', label: clip.status };
          const locked = ['rendering', 'publishing', 'published'].includes(clip.status);
          return (
            <Paper key={clip.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Chip size="small" color={st.color} label={st.label} />
                <Typography variant="body2" color="text.secondary">
                  {fmt(d.startSeconds)} – {fmt(d.endSeconds)} ({Math.round((d.endSeconds - d.startSeconds) || 0)}s)
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => playRange(Number(d.startSeconds), Number(d.endSeconds))}>
                  Ver trecho
                </Button>
              </Stack>

              <TextField
                label="Título" value={d.title} fullWidth size="small" sx={{ mb: 1 }}
                disabled={locked} onChange={(e) => setDraft(clip.id, { title: e.target.value })}
              />
              <TextField
                label="Legenda" value={d.caption} fullWidth size="small" multiline minRows={2} sx={{ mb: 1 }}
                disabled={locked} onChange={(e) => setDraft(clip.id, { caption: e.target.value })}
              />

              <Stack direction="row" spacing={2} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TextField
                    label="Início (s)" type="number" size="small" value={d.startSeconds} disabled={locked}
                    onChange={(e) => setDraft(clip.id, { startSeconds: Number(e.target.value) })}
                    sx={{ width: 110 }}
                  />
                  <Button size="small" disabled={locked} onClick={() => nudge(clip.id, 'startSeconds', -0.5)}>-½s</Button>
                  <Button size="small" disabled={locked} onClick={() => nudge(clip.id, 'startSeconds', 0.5)}>+½s</Button>
                  <Button size="small" disabled={locked} onClick={() => setPoint(clip.id, 'startSeconds')}>Início = agora</Button>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TextField
                    label="Fim (s)" type="number" size="small" value={d.endSeconds} disabled={locked}
                    onChange={(e) => setDraft(clip.id, { endSeconds: Number(e.target.value) })}
                    sx={{ width: 110 }}
                  />
                  <Button size="small" disabled={locked} onClick={() => nudge(clip.id, 'endSeconds', -0.5)}>-½s</Button>
                  <Button size="small" disabled={locked} onClick={() => nudge(clip.id, 'endSeconds', 0.5)}>+½s</Button>
                  <Button size="small" disabled={locked} onClick={() => setPoint(clip.id, 'endSeconds')}>Fim = agora</Button>
                </Stack>
              </Stack>

              {clip.reason && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Por que a IA escolheu: {clip.reason}
                </Typography>
              )}
              {clip.status === 'failed' && clip.errorMessage && (
                <Alert severity="error" sx={{ mb: 1 }}>{clip.errorMessage}</Alert>
              )}

              {previews[clip.id] && (
                <video src={previews[clip.id]} controls style={{
                  width: 220, borderRadius: 8, marginBottom: 8, background: '#000'
                }} />
              )}

              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" disabled={locked || busy[`save-${clip.id}`]} onClick={() => doSave(clip)}>
                  Salvar
                </Button>
                {['suggested', 'rendered', 'failed'].includes(clip.status) && (
                  <Button size="small" startIcon={<CheckIcon />} disabled={busy[`approve-${clip.id}`]} onClick={() => doApprove(clip)}>
                    Aprovar
                  </Button>
                )}
                {['approved', 'rendered', 'failed'].includes(clip.status) && (
                  <Button
                    size="small" startIcon={<MovieIcon />} disabled={busy[`render-${clip.id}`]} onClick={() => doRender(clip)}
                  >
                    {clip.status === 'rendered' ? 'Renderizar de novo' : 'Renderizar'}
                  </Button>
                )}
                {['rendered', 'published'].includes(clip.status) && (
                  <>
                    <Button size="small" startIcon={<PlayArrowIcon />} disabled={busy[`preview-${clip.id}`]} onClick={() => doPreview(clip)}>
                      Pré-visualizar
                    </Button>
                    <Button size="small" startIcon={<DownloadIcon />} disabled={busy[`download-${clip.id}`]} onClick={() => doDownload(clip)}>
                      Baixar
                    </Button>
                  </>
                )}
                {clip.status === 'rendered' && (
                  <Button
                    size="small" variant="contained" color="success" startIcon={<PublishIcon />}
                    disabled={busy[`publish-${clip.id}`]} onClick={() => doPublish(clip)}
                  >
                    Publicar no Shorts
                  </Button>
                )}
                {clip.status === 'published' && clip.youtubeShortId && (
                  <Button size="small" onClick={() => window.open(`https://youtube.com/shorts/${clip.youtubeShortId}`, '_blank', 'noopener')}>
                    Ver no YouTube
                  </Button>
                )}
                <Box sx={{ flexGrow: 1 }} />
                {!locked && (
                  <Tooltip title="Descartar recorte">
                    <span>
                      <IconButton size="small" color="error" disabled={busy[`discard-${clip.id}`]} onClick={() => doDiscard(clip)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

ClipsPanel.propTypes = {
  videoId: PropTypes.string.isRequired,
  youtubeVideoId: PropTypes.string.isRequired,
  canGenerate: PropTypes.bool,
};

ClipsPanel.defaultProps = {
  canGenerate: true,
};

export default ClipsPanel;
