import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CancelIcon from '@mui/icons-material/Cancel';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import {
  fetchTranscripts, fetchChannels, fetchTranscriptSpeakers, cancelTranscript
} from '../../../utils/youtubeClient';

function StatusChip({ status }) {
  const map = {
    pending: { color: 'default', label: 'Pendente' },
    processing: { color: 'info', label: 'Processando' },
    needs_audio_transcription: { color: 'warning', label: 'Aguarda Whisper' },
    done: { color: 'success', label: 'Pronto' },
    failed: { color: 'error', label: 'Falhou' },
  };
  const cfg = map[status] || { color: 'default', label: status };
  return <Chip size="small" color={cfg.color} label={cfg.label} />;
}

StatusChip.propTypes = {
  status: PropTypes.string,
};

const TranscriptsListPage = () => {
  const history = useHistory();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('');
  const [channels, setChannels] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleCancel = async (t) => {
    if (!window.confirm(`Cancelar transcrição de "${t.video?.title}"? Será marcada como "Falhou".`)) return;
    try {
      const updated = await cancelTranscript(t.id);
      setItems((prev) => prev.map((item) => (item.id === t.id ? { ...item, status: updated.transcript.status } : item)));
      setFeedback({ severity: 'success', message: 'Transcrição cancelada.' });
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTranscripts({
        status: statusFilter || undefined,
        channelId: channelFilter || undefined,
        speaker: speakerFilter || undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels().then(setChannels).catch(() => {});
    fetchTranscriptSpeakers().then(setSpeakers).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [page, rowsPerPage, statusFilter, channelFilter, speakerFilter]);

  return (
    <div>
      <Helmet>
        <title>Transcrições | Portal IECG</title>
      </Helmet>
      <PapperBlock title="Transcrições" desc="Todos os vídeos transcritos e resumidos." icon="ion-ios-paper-outline" whiteBg>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pending">Pendente</MenuItem>
              <MenuItem value="processing">Processando</MenuItem>
              <MenuItem value="needs_audio_transcription">Aguarda Whisper</MenuItem>
              <MenuItem value="done">Pronto</MenuItem>
              <MenuItem value="failed">Falhou</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Canal</InputLabel>
            <Select label="Canal" value={channelFilter} onChange={(e) => { setChannelFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">Todos</MenuItem>
              {channels.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.channelName || c.ownerName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Orador</InputLabel>
            <Select label="Orador" value={speakerFilter} onChange={(e) => { setSpeakerFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">Todos</MenuItem>
              {speakers.map((s) => (
                <MenuItem key={s.speaker} value={s.speaker}>
                  {s.speaker}
                  {' '}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    ({s.count})
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Video</TableCell>
                <TableCell>Canal</TableCell>
                <TableCell>Orador</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Fonte</TableCell>
                <TableCell>Publicado</TableCell>
                <TableCell>Processado em</TableCell>
                <TableCell align="right">Acoes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Nenhuma transcrição encontrada.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {t.video?.thumbnailUrl && (
                        <Box component="img" src={t.video.thumbnailUrl} alt="" sx={{
                          width: 80, height: 45, objectFit: 'cover', borderRadius: 0.5
                        }} />
                      )}
                      <Typography variant="body2" noWrap title={t.video?.title} sx={{ maxWidth: 340 }}>
                        {t.video?.title}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{t.video?.channel?.channelName || t.video?.channel?.ownerName || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    {t.speaker ? <Chip size="small" variant="outlined" label={t.speaker} /> : <Typography variant="caption" color="text.disabled">-</Typography>}
                  </TableCell>
                  <TableCell><StatusChip status={t.status} /></TableCell>
                  <TableCell>
                    {t.source ? <Chip size="small" variant="outlined" label={t.source} /> : '-'}
                  </TableCell>
                  <TableCell>
                    {t.published ? <Chip size="small" color="primary" label="Sim" /> : <Chip size="small" variant="outlined" label="Não" />}
                  </TableCell>
                  <TableCell>
                    {t.processedAt ? new Date(t.processedAt).toLocaleString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {['pending', 'processing'].includes(t.status) && (
                      <Tooltip title="Cancelar (voltar para Falhou)">
                        <IconButton size="small" color="warning" onClick={() => handleCancel(t)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Revisar/editar">
                      <IconButton size="small" color="primary" onClick={() => history.push(`/app/admin/videos/transcricoes/${t.id}`)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {t.video?.videoId && (
                      <Tooltip title="Abrir no YouTube">
                        <IconButton
                          size="small"
                          onClick={() => window.open(`https://www.youtube.com/watch?v=${t.video.videoId}`, '_blank', 'noopener')}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Snackbar
          open={Boolean(feedback)}
          autoHideDuration={4000}
          onClose={() => setFeedback(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {feedback && <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
        </Snackbar>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Itens por página"
        />
      </PapperBlock>
    </div>
  );
};

export default TranscriptsListPage;
