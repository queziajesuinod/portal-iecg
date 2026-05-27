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
  FormControlLabel, Switch
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
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { Helmet } from 'react-helmet';
import { useHistory, useParams } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import {
  fetchChannelVideos,
  syncChannelVideos,
  refreshVideoCaptions,
  enqueueTranscripts,
  transcribeVideoNow,
  reactivateFailedTranscript,
  deleteVideo,
  cancelTranscript,
  fetchTranscriptProgressBatch,
  toggleVideoIgnored,
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
          sx={{
            height: 6,
            borderRadius: 1,
            mt: 0.5,
            '& .MuiLinearProgress-bar': {
              transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          }}
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
    hasText: PropTypes.bool,
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
  const [showIgnored, setShowIgnored] = useState(false);

  const hasFilledTranscript = (video) => Boolean(video.transcript?.hasText);
  const isLocked = (video) => Boolean(video.ignored) || hasFilledTranscript(video);

  const handleToggleIgnored = async (video) => {
    try {
      const updated = await toggleVideoIgnored(video.id, !video.ignored);
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, ...updated } : v)));
      setFeedback({
        severity: 'success',
        message: updated.ignored ? 'Vídeo marcado como ignorado.' : 'Vídeo reativado.',
      });
      if (updated.ignored && !showIgnored) {
        // some ja some da lista — recarrega
        loadVideos();
      }
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

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
        includeIgnored: showIgnored,
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
  }, [channelId, page, rowsPerPage, searchDebounced, showIgnored]);

  useEffect(() => {
    const processingIds = videos
      .filter((v) => v.transcript?.status === 'processing')
      .map((v) => v.transcript.id);
    if (!processingIds.length) return undefined;

    let cancelled = false;
    const tick = async () => {
      try {
        const updates = await fetchTranscriptProgressBatch(processingIds);
        if (cancelled || !Array.isArray(updates) || !updates.length) return;
        const byId = new Map(updates.map((u) => [u.id, u]));
        let needsFullReload = false;
        setVideos((prev) => prev.map((v) => {
          const upd = v.transcript && byId.get(v.transcript.id);
          if (!upd) return v;
          if (v.transcript.status === 'processing' && upd.status !== 'processing') {
            needsFullReload = true;
          }
          return { ...v, transcript: { ...v.transcript, ...upd } };
        }));
        if (needsFullReload) loadVideos();
      } catch (_) {
        // silencioso
      }
    };
    const interval = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [videos.map((v) => (v.transcript?.status === 'processing' ? v.transcript.id : '')).join(',')]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await syncChannelVideos(channelId, 5);
      const skippedParts = [];
      if (result.skippedByPrivacy) skippedParts.push(`${result.skippedByPrivacy} não público(s)`);
      if (result.skippedByDuration) {
        const minMin = Math.round((result.filters?.minDurationSeconds || 0) / 60);
        skippedParts.push(`${result.skippedByDuration} abaixo de ${minMin}min`);
      }
      const skippedMsg = skippedParts.length ? ` Ignorados: ${skippedParts.join(', ')}.` : '';
      setFeedback({
        severity: 'success',
        message: `Sincronização concluída: ${result.created} novos, ${result.updated} atualizados.${skippedMsg}`,
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
    if (hasFilledTranscript(video)) {
      setFeedback({
        severity: 'info',
        message: 'Este video ja possui transcricao. Use a acao de revisar/editar.',
      });
      return;
    }
    try {
      setTranscribingId(video.id);
      const transcript = await transcribeVideoNow(video.id);
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, transcript } : v)));
      const msg = transcript.status === 'done'
        ? `Transcrito via legenda manual (${transcript.language || 'idioma desconhecido'}).`
        : transcript.status === 'needs_audio_transcription'
          ? 'Sem legenda manual disponível. Será processado pelo Whisper na próxima janela do worker.'
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
    if (!window.confirm('Cancelar a transcrição em andamento? Será marcada como falhou e você poderá reprocessar.')) return;
    try {
      await cancelTranscript(video.transcript.id);
      setFeedback({ severity: 'success', message: 'Transcrição cancelada.' });
      loadVideos();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const handleReactivateFailed = async (video) => {
    if (video.transcript?.status !== 'failed') return;
    try {
      const transcript = await reactivateFailedTranscript(video.id);
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, transcript } : v)));
      setFeedback({ severity: 'success', message: 'Transcrição reativada e marcada como pendente.' });
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const handleDeleteVideo = async (video) => {
    if (!window.confirm('Excluir este vídeo da base? Esta ação também remove a transcrição vinculada.')) return;
    try {
      await deleteVideo(video.id);
      setFeedback({ severity: 'success', message: 'Vídeo excluído com sucesso.' });
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const handleEnqueueSelected = async () => {
    if (selected.size === 0) return;
    try {
      setEnqueueing(true);
      const transcribableIds = videos
        .filter((video) => selected.has(video.id) && !hasFilledTranscript(video))
        .map((video) => video.id);

      if (transcribableIds.length === 0) {
        setFeedback({
          severity: 'info',
          message: 'Os videos selecionados ja possuem transcricao. Use revisar/editar.',
        });
        setEnqueueing(false);
        return;
      }

      const result = await enqueueTranscripts(transcribableIds);
      const ok = result.enqueued.filter((e) => !e.error).length;
      const fail = result.enqueued.filter((e) => e.error).length;
      setFeedback({
        severity: fail === 0 ? 'success' : 'warning',
        message: `${ok} vídeo(s) enfileirado(s)${fail ? `, ${fail} com erro` : ''}.`,
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
    const video = videos.find((item) => item.id === id);
    if (video && hasFilledTranscript(video)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableVideos = videos.filter((video) => !isLocked(video));
  const allSelected = selectableVideos.length > 0 && selectableVideos.every((v) => selected.has(v.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        videos.forEach((v) => next.delete(v.id));
      } else {
        videos.forEach((v) => {
          if (!hasFilledTranscript(v)) next.add(v.id);
        });
      }
      return next;
    });
  };

  return (
    <div>
      <Helmet>
        <title>Vídeos do canal | Portal IECG</title>
      </Helmet>
      <PapperBlock
        title="Vídeos do canal"
        desc="Sincronize e selecione vídeos para transcrever e resumir."
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
            placeholder="Buscar por título"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FormControlLabel
            control={(
              <Switch
                size="small"
                checked={showIgnored}
                onChange={(e) => setShowIgnored(e.target.checked)}
              />
            )}
            label="Mostrar ignorados"
            sx={{ ml: 1 }}
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
              {selected.size} vídeo(s) selecionado(s).
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
                <TableCell>Vídeo</TableCell>
                <TableCell>Publicado</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>Legenda</TableCell>
                <TableCell>Transcrição</TableCell>
                <TableCell align="right">Ações</TableCell>
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
                      Nenhum vídeo. Clique em &quot;Sincronizar com o YouTube&quot;.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading && videos.map((video) => (
                <TableRow
                  key={video.id}
                  hover
                  selected={selected.has(video.id)}
                  sx={video.ignored ? { opacity: 0.55, bgcolor: 'grey.50' } : undefined}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.has(video.id)}
                      onChange={() => toggleSelected(video.id)}
                      disabled={isLocked(video)}
                    />
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
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {video.videoId}
                          </Typography>
                          {video.ignored && (
                            <Chip
                              size="small"
                              color="default"
                              variant="outlined"
                              label={video.ignoreReason === 'too_short' ? 'Ignorado: curto' : video.ignoreReason === 'not_public' ? 'Ignorado: não público' : 'Ignorado'}
                            />
                          )}
                        </Stack>
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
                    {!video.ignored && !hasFilledTranscript(video) && (
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
                    )}
                    {!video.ignored && video.transcript?.status === 'processing' && (
                      <Tooltip title="Cancelar transcrição em andamento">
                        <IconButton size="small" color="error" onClick={() => handleCancel(video)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!video.ignored && video.transcript?.status === 'failed' && (
                      <Tooltip title="Reativar transcrição (volta para pendente)">
                        <IconButton size="small" color="warning" onClick={() => handleReactivateFailed(video)}>
                          <ReplayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!video.ignored && (
                      <Tooltip title="Excluir vídeo da fila/base">
                        <IconButton size="small" color="error" onClick={() => handleDeleteVideo(video)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!video.ignored && video.transcript?.id && (
                      <Tooltip title={hasFilledTranscript(video) ? 'Editar transcrição e resumo' : 'Revisar/editar transcrição'}>
                        <IconButton
                          size="small"
                          color={hasFilledTranscript(video) ? 'primary' : 'default'}
                          onClick={() => history.push(`/app/admin/videos/transcricoes/${video.transcript.id}`)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={video.ignored ? 'Reativar (remover de ignorados)' : 'Marcar como ignorado'}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleIgnored(video)}
                      >
                        {video.ignored ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
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
          labelRowsPerPage="Itens por página"
        />
      </PapperBlock>
    </div>
  );
};

export default VideosPage;
