import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SubtitlesIcon from '@mui/icons-material/Subtitles';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import ReplayIcon from '@mui/icons-material/Replay';
import { Helmet } from 'react-helmet';
import { useHistory, useParams } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import {
  fetchChannelVideos,
  syncChannelVideos,
  refreshVideoCaptions,
  enqueueTranscripts,
  transcribeVideoNow,
  cancelTranscript,
} from '../../../utils/youtubeClient';

function formatDuration(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function StageLabel({ stage }) {
  const map = {
    audio_download: 'Baixando áudio',
    whisper: 'Transcrevendo',
    caption: 'Lendo legenda',
    summary: 'Gerando resumo',
  };
  return map[stage] || 'Processando';
}

StageLabel.propTypes = {
  stage: PropTypes.string,
};

function TranscriptBadge({ transcript }) {
  if (!transcript) return <Chip size="small" variant="outlined" label="Não transcrito" />;
  const map = {
    pending: { color: 'default', label: 'Pendente' },
    processing: { color: 'info', label: 'Processando' },
    needs_audio_transcription: { color: 'warning', label: 'Aguarda Whisper' },
    done: { color: 'success', label: 'Pronto' },
    failed: { color: 'error', label: 'Falhou' },
  };
  const cfg = map[transcript.status] || { color: 'default', label: transcript.status };

  if (transcript.status === 'processing') {
    const pct = Number(transcript.progressPercent || 0);
    const isWhisper = transcript.progressStage === 'whisper';
    return (
      <Box sx={{ minWidth: 140 }}>
        <Typography variant="caption" color="info.main" sx={{ display: 'block', fontWeight: 500 }}>
          <StageLabel stage={transcript.progressStage} />
          {isWhisper && ` ${pct.toFixed(1)}%`}
        </Typography>
        <LinearProgress
          variant={isWhisper ? 'determinate' : 'indeterminate'}
          value={isWhisper ? pct : undefined}
          sx={{ height: 6, borderRadius: 1, mt: 0.5 }}
        />
      </Box>
    );
  }

  return <Chip size="small" color={cfg.color} label={cfg.label} />;
}

TranscriptBadge.propTypes = {
  transcript: PropTypes.shape({
    status: PropTypes.string,
    progressPercent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    progressStage: PropTypes.string,
  }),
};

function CaptionBadge({ video }) {
  if (video.hasManualCaption) {
    return <Chip size="small" color="success" icon={<SubtitlesIcon />} label="Manual" />;
  }
  if (video.hasAutoCaption) {
    return <Chip size="small" color="warning" icon={<SubtitlesIcon />} label="Auto" />;
  }
  if (video.hasManualCaption === false && video.hasAutoCaption === false) {
    return <Chip size="small" color="error" label="Sem legenda" />;
  }
  if (video.hasCaption) {
    return <Chip size="small" label="A verificar" variant="outlined" />;
  }
  return <Chip size="small" label="Sem legenda" variant="outlined" />;
}

CaptionBadge.propTypes = {
  video: PropTypes.shape({
    hasManualCaption: PropTypes.bool,
    hasAutoCaption: PropTypes.bool,
    hasCaption: PropTypes.bool,
  }).isRequired,
};

const VideosPage = () => {
  const { channelId } = useParams();
  const history = useHistory();
  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [refreshingId, setRefreshingId] = useState(null);
  const [transcribingId, setTranscribingId] = useState(null);
  const [enqueueing, setEnqueueing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChannelVideos(channelId, {
        search: searchDebounced || undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setVideos(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [channelId, page, rowsPerPage, searchDebounced]);

  useEffect(() => {
    const hasProcessing = videos.some((v) => v.transcript?.status === 'processing');
    if (!hasProcessing) return undefined;
    const interval = setInterval(() => { loadVideos(); }, 10000);
    return () => clearInterval(interval);
  }, [videos]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await syncChannelVideos(channelId, 5);
      setFeedback({
        severity: 'success',
        message: `Sincronizacao concluida: ${result.created} novos, ${result.updated} atualizados (${result.total} total).`,
      });
      setPage(0);
      loadVideos();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleTranscribeNow = async (video) => {
    try {
      setTranscribingId(video.id);
      const transcript = await transcribeVideoNow(video.id);
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, transcript } : v)));
      const msg = transcript.status === 'done'
        ? `Transcrito via legenda manual (${transcript.language || 'idioma desconhecido'}).`
        : transcript.status === 'needs_audio_transcription'
          ? 'Sem legenda manual disponivel. Sera processado pelo Whisper (Fase 4).'
          : `Status: ${transcript.status}`;
      setFeedback({ severity: 'success', message: msg });
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setTranscribingId(null);
    }
  };

  const handleCancel = async (video) => {
    if (!video.transcript?.id) return;
    if (!window.confirm('Cancelar a transcricao em andamento? Sera marcada como falhou e voce podera reprocessar.')) return;
    try {
      await cancelTranscript(video.transcript.id);
      setFeedback({ severity: 'success', message: 'Transcricao cancelada.' });
      loadVideos();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const handleReprocess = async (video) => {
    try {
      const transcript = await transcribeVideoNow(video.id);
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, transcript } : v)));
      setFeedback({ severity: 'success', message: 'Reenfileirado/reprocessado.' });
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const handleEnqueueSelected = async () => {
    if (selected.size === 0) return;
    try {
      setEnqueueing(true);
      const result = await enqueueTranscripts(Array.from(selected));
      const ok = result.enqueued.filter((e) => !e.error).length;
      const fail = result.enqueued.filter((e) => e.error).length;
      setFeedback({
        severity: fail === 0 ? 'success' : 'warning',
        message: `${ok} video(s) enfileirado(s)${fail ? `, ${fail} com erro` : ''}.`,
      });
      setSelected(new Set());
      loadVideos();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setEnqueueing(false);
    }
  };

  const handleRefreshCaptions = async (video) => {
    try {
      setRefreshingId(video.id);
      const updated = await refreshVideoCaptions(video.id);
      setVideos((prev) => prev.map((v) => (v.id === video.id ? updated : v)));
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setRefreshingId(null);
    }
  };

  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = videos.length > 0 && videos.every((v) => selected.has(v.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        videos.forEach((v) => next.delete(v.id));
      } else {
        videos.forEach((v) => next.add(v.id));
      }
      return next;
    });
  };

  return (
    <div>
      <Helmet>
        <title>Videos do canal | Portal IECG</title>
      </Helmet>
      <PapperBlock
        title="Videos do canal"
        desc="Sincronize e selecione videos para transcrever e resumir."
        icon="ion-logo-youtube"
        whiteBg
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => history.push('/app/admin/videos/canais')}>
            Voltar
          </Button>
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar com o YouTube'}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            size="small"
            placeholder="Buscar por titulo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <IconButton onClick={loadVideos}>
            <RefreshIcon />
          </IconButton>
        </Stack>

        {feedback && (
          <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        {selected.size > 0 && (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ flexGrow: 1 }}>
              {selected.size} video(s) selecionado(s).
            </Alert>
            <Button
              variant="contained"
              color="primary"
              startIcon={enqueueing ? <CircularProgress size={18} color="inherit" /> : <TextSnippetIcon />}
              onClick={handleEnqueueSelected}
              disabled={enqueueing}
            >
              {enqueueing ? 'Enfileirando...' : 'Enfileirar para transcrever'}
            </Button>
          </Stack>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox checked={allSelected} indeterminate={!allSelected && selected.size > 0} onChange={toggleAll} />
                </TableCell>
                <TableCell>Video</TableCell>
                <TableCell>Publicado</TableCell>
                <TableCell>Duracao</TableCell>
                <TableCell>Legenda</TableCell>
                <TableCell>Transcricao</TableCell>
                <TableCell align="right">Acoes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!loading && videos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Nenhum video. Clique em &quot;Sincronizar com o YouTube&quot;.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading && videos.map((video) => (
                <TableRow key={video.id} hover selected={selected.has(video.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(video.id)} onChange={() => toggleSelected(video.id)} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {video.thumbnailUrl && (
                        <Box
                          component="img"
                          src={video.thumbnailUrl}
                          alt=""
                          sx={{
                            width: 96, height: 54, objectFit: 'cover', borderRadius: 1
                          }}
                        />
                      )}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap title={video.title}>
                          {video.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {video.videoId}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell>{formatDuration(video.durationSeconds)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CaptionBadge video={video} />
                      <Tooltip title="Verificar tipo de legenda (manual/auto)">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleRefreshCaptions(video)}
                            disabled={refreshingId === video.id}
                          >
                            {refreshingId === video.id ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <TranscriptBadge transcript={video.transcript} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Transcrever agora (tenta legenda manual)">
                      <span>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleTranscribeNow(video)}
                          disabled={transcribingId === video.id}
                        >
                          {transcribingId === video.id ? <CircularProgress size={16} /> : <PlayCircleIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    {video.transcript?.status === 'processing' && (
                      <Tooltip title="Cancelar transcricao em andamento">
                        <IconButton size="small" color="error" onClick={() => handleCancel(video)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {video.transcript?.status === 'failed' && (
                      <Tooltip title="Reprocessar (tentar de novo)">
                        <IconButton size="small" color="warning" onClick={() => handleReprocess(video)}>
                          <ReplayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {video.transcript?.id && (
                      <Tooltip title="Revisar/editar transcricao">
                        <IconButton
                          size="small"
                          onClick={() => history.push(`/app/admin/videos/transcricoes/${video.transcript.id}`)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Abrir no YouTube">
                      <IconButton
                        size="small"
                        onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank', 'noopener')}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Itens por pagina"
        />
      </PapperBlock>
    </div>
  );
};

export default VideosPage;
