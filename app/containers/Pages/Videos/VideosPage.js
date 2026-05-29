import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
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
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
  uploadVideoAudio,
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
  const [transcribingId, setTranscribingId] = useState(null);
  const [showIgnored, setShowIgnored] = useState(false);

  const hasFilledTranscript = (video) => Boolean(video.transcript?.hasText);

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
    if (!video.audioPath) {
      setFeedback({
        severity: 'warning',
        message: 'Anexe o audio antes de transcrever (botao de upload).',
      });
      return;
    }
    try {
      setTranscribingId(video.id);
      const transcript = await transcribeVideoNow(video.id);
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, transcript } : v)));
      setFeedback({
        severity: 'success',
        message: `Transcricao iniciada (${transcript.status}). Use a barra de progresso pra acompanhar.`,
      });
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setTranscribingId(null);
    }
  };

  const handlePickAudio = (video) => {
    if (hasFilledTranscript(video)) {
      setFeedback({
        severity: 'info',
        message: 'Este video ja possui transcricao. Use a acao de revisar/editar.',
      });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,.mp3,.m4a,.wav,.ogg,.opus,.flac,.aac';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        setTranscribingId(video.id);
        setFeedback({ severity: 'info', message: `Enviando ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...` });
        const resp = await uploadVideoAudio(video.id, file);
        setVideos((prev) => prev.map((v) => (v.id === video.id ? {
          ...v,
          audioPath: resp.video.audioPath,
          audioSizeBytes: resp.video.audioSizeBytes,
          audioUploadedAt: resp.video.audioUploadedAt,
          transcript: resp.transcript,
        } : v)));
        setFeedback({
          severity: 'success',
          message: 'Audio anexado. Use "Transcrever agora" ou aguarde o job noturno.',
        });
      } catch (err) {
        setFeedback({ severity: 'error', message: `Upload: ${err.message}` });
      } finally {
        setTranscribingId(null);
      }
    };
    input.click();
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
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
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

        {error && <Alert severity="error">{error}</Alert>}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vídeo</TableCell>
                <TableCell>Publicado</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>Transcrição</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!loading && videos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
                  sx={video.ignored ? { opacity: 0.55, bgcolor: 'grey.50' } : undefined}
                >
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
                    <TranscriptBadge transcript={video.transcript} />
                  </TableCell>
                  <TableCell align="right">
                    {!video.ignored && !hasFilledTranscript(video) && !video.audioPath && (
                      <Tooltip title="Anexar arquivo de audio (MP3, M4A, WAV) — Whisper local transcreve em seguida">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handlePickAudio(video)}
                            disabled={transcribingId === video.id}
                          >
                            {transcribingId === video.id ? <CircularProgress size={16} /> : <UploadFileIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {!video.ignored && !hasFilledTranscript(video) && video.audioPath && video.transcript?.status !== 'processing' && (
                      <Tooltip title="Audio ja anexado — re-disparar transcricao com Whisper local">
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
