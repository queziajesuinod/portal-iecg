import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import LinkIcon from '@mui/icons-material/Link';
import { Helmet } from 'react-helmet';
import { useHistory, useLocation } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import {
  fetchChannels,
  startChannelOAuth,
  updateChannel,
  deleteChannel,
  fetchWorkerStatus,
  runWorkerOnce,
} from '../../../utils/youtubeClient';

const ChannelsPage = () => {
  const history = useHistory();
  const location = useLocation();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [workerStatus, setWorkerStatus] = useState(null);
  const [runningWorker, setRunningWorker] = useState(false);

  const loadChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChannels();
      setChannels(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkerStatus = async () => {
    try {
      const s = await fetchWorkerStatus();
      setWorkerStatus(s);
    } catch (err) {
      // silent: worker pode estar desativado
    }
  };

  useEffect(() => {
    loadChannels();
    loadWorkerStatus();
    const interval = setInterval(loadWorkerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauth = params.get('oauth');
    if (oauth === 'success') {
      setFeedback({ severity: 'success', message: 'Canal conectado com sucesso!' });
      loadChannels();
    } else if (oauth === 'error') {
      setFeedback({ severity: 'error', message: `Falha na autorizacao: ${params.get('reason') || 'erro desconhecido'}` });
    }
    if (oauth) {
      history.replace(location.pathname);
    }
  }, [location.search]);

  const handleAddChannel = async () => {
    if (!ownerName.trim()) return;
    try {
      setSubmitting(true);
      const { url } = await startChannelOAuth(ownerName.trim());
      window.location.href = url;
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
      setSubmitting(false);
    }
  };

  const handleReconnectChannel = async (channel) => {
    try {
      const { url } = await startChannelOAuth(channel.ownerName || '', channel.id);
      window.location.href = url;
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const handleToggleActive = async (channel) => {
    try {
      await updateChannel(channel.id, { active: !channel.active });
      loadChannels();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const handleRunWorker = async () => {
    try {
      setRunningWorker(true);
      const result = await runWorkerOnce();
      const msg = result.skipped
        ? `Worker pulou: ${result.reason}`
        : result.processed
          ? `Processou: status=${result.status}`
          : `Erro: ${result.error || 'desconhecido'}`;
      setFeedback({ severity: result.skipped ? 'info' : result.processed ? 'success' : 'error', message: msg });
      loadWorkerStatus();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setRunningWorker(false);
    }
  };

  const handleDelete = async (channel) => {
    try {
      await deleteChannel(channel.id);
      setConfirmDelete(null);
      loadChannels();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  return (
    <div>
      <Helmet>
        <title>Canais do YouTube | Portal IECG</title>
      </Helmet>
      <PapperBlock
        title="Canais do YouTube"
        desc="Gerencie os canais autorizados para transcrição e resumo de vídeos."
        icon="ion-logo-youtube"
        whiteBg
      >
        {feedback && (
          <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button variant="contained" onClick={() => setAddOpen(true)}>
            + Conectar canal
          </Button>
          <Button startIcon={<RefreshIcon />} onClick={loadChannels}>
            Atualizar lista
          </Button>
        </Stack>

        {workerStatus && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2">Worker de transcrição (Whisper)</Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  Roda no dia {workerStatus.config.day} (0=Dom, 2=Ter) das {workerStatus.config.hourStart}h às {workerStatus.config.hourEnd}h, máx {workerStatus.config.maxHours}h.
                  Fuso: {workerStatus.timezone}.
                </Typography>
              </Box>
              <Chip
                size="small"
                color={workerStatus.isWorking ? 'warning' : workerStatus.inWindow ? 'success' : 'default'}
                label={
                  workerStatus.isWorking ? 'Processando agora' : workerStatus.inWindow ? 'Na janela' : 'Fora da janela'
                }
              />
              <Button
                size="small"
                variant="outlined"
                onClick={handleRunWorker}
                disabled={runningWorker || workerStatus.isWorking}
              >
                {runningWorker ? 'Rodando...' : 'Rodar 1 vídeo agora (teste)'}
              </Button>
            </Stack>
          </Paper>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Canal</TableCell>
                  <TableCell>Dono</TableCell>
                  <TableCell>Último sync</TableCell>
                  <TableCell>Ativo</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {channels.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Nenhum canal conectado ainda. Clique em &quot;Conectar canal&quot; para começar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {channels.map((channel) => (
                  <TableRow key={channel.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={channel.channelThumbnailUrl} alt={channel.channelName}>
                          {channel.channelName?.[0] || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {channel.channelName || '(sem nome)'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {channel.channelId}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{channel.ownerName}</TableCell>
                    <TableCell>
                      {channel.lastSyncedAt
                        ? new Date(channel.lastSyncedAt).toLocaleString('pt-BR')
                        : <Chip size="small" label="Nunca" />}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={channel.active}
                        onChange={() => handleToggleActive(channel)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver vídeos do canal">
                        <IconButton
                          color="primary"
                          onClick={() => history.push(`/app/admin/videos/canais/${channel.id}`)}
                        >
                          <VideoLibraryIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Abrir no YouTube">
                        <IconButton
                          onClick={() => window.open(`https://www.youtube.com/channel/${channel.channelId}`, '_blank', 'noopener')}
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reconectar OAuth">
                        <IconButton
                          color="secondary"
                          onClick={() => handleReconnectChannel(channel)}
                        >
                          <LinkIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remover canal">
                        <IconButton color="error" onClick={() => setConfirmDelete(channel)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </PapperBlock>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Conectar novo canal</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Após confirmar, você será redirecionado para o Google. Faça login com a conta dona do canal e autorize o acesso.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Nome do dono do canal"
            placeholder="Ex.: Pastor João"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAddChannel}
            disabled={!ownerName.trim() || submitting}
          >
            {submitting ? 'Redirecionando...' : 'Continuar para o Google'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Remover canal?</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover o canal <strong>{confirmDelete?.channelName}</strong>?
            Os vídeos sincronizados e transcrições associadas também serão apagados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(confirmDelete)}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
};

export default ChannelsPage;
