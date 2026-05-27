import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  List,
  ListItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import { Helmet } from 'react-helmet';
import { useHistory, useParams } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import {
  fetchTranscriptById,
  updateTranscript,
  regenerateSummary,
  cancelTranscript,
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

const TranscriptDetailPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [bullets, setBullets] = useState([]);
  const [published, setPublished] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await fetchTranscriptById(id);
      setData(d);
      setTranscript(d.transcript || '');
      setSummary(d.summary || '');
      setBullets(Array.isArray(d.bulletPoints) ? d.bulletPoints : []);
      setPublished(!!d.published);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (data?.status !== 'processing') return undefined;
    const interval = setInterval(() => { load(); }, 10000);
    return () => clearInterval(interval);
  }, [data?.status]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await updateTranscript(id, {
        transcript,
        summary,
        bulletPoints: bullets.filter((b) => b && b.trim()),
        published,
      });
      setData((prev) => ({ ...prev, ...updated }));
      setFeedback({ severity: 'success', message: 'Salvo com sucesso.' });
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancelar a transcricao em andamento? Sera marcada como falhou.')) return;
    try {
      await cancelTranscript(id);
      setFeedback({ severity: 'success', message: 'Transcricao cancelada.' });
      load();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const updated = await regenerateSummary(id);
      setSummary(updated.summary || '');
      setBullets(Array.isArray(updated.bulletPoints) ? updated.bulletPoints : []);
      setFeedback({ severity: 'success', message: 'Resumo regenerado pelo Claude.' });
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setRegenerating(false);
    }
  };

  const handleBulletChange = (index, value) => {
    setBullets((prev) => prev.map((b, i) => (i === index ? value : b)));
  };

  const handleBulletAdd = () => setBullets((prev) => [...prev, '']);
  const handleBulletRemove = (index) => setBullets((prev) => prev.filter((_, i) => i !== index));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const video = data?.video;
  const channel = video?.channel;

  return (
    <div>
      <Helmet>
        <title>Revisao de transcricao | Portal IECG</title>
      </Helmet>
      <PapperBlock title="Revisao da transcricao" desc="Edite e publique o resumo para a API publica." icon="ion-ios-paper-outline" whiteBg>
        {feedback && (
          <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => history.goBack()}>
            Voltar
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <StatusChip status={data.status} />
          {data.source && <Chip size="small" variant="outlined" label={`Fonte: ${data.source}`} />}
          {data.language && <Chip size="small" variant="outlined" label={`Idioma: ${data.language}`} />}
        </Stack>

        {data.status === 'processing' && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'info.50' }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">
                {data.progressStage === 'audio_download' && 'Baixando audio do YouTube...'}
                {data.progressStage === 'whisper' && `Transcrevendo com Whisper... ${Number(data.progressPercent || 0).toFixed(1)}%`}
                {data.progressStage === 'caption' && 'Baixando legenda manual...'}
                {data.progressStage === 'summary' && 'Gerando resumo com Claude...'}
                {!data.progressStage && 'Iniciando...'}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button size="small" color="error" startIcon={<CancelIcon />} onClick={handleCancel}>
                Cancelar
              </Button>
              <Typography variant="caption" color="text.secondary">Atualiza a cada 10s</Typography>
            </Stack>
            <LinearProgress
              variant={data.progressStage === 'whisper' ? 'determinate' : 'indeterminate'}
              value={data.progressStage === 'whisper' ? Number(data.progressPercent || 0) : undefined}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Paper>
        )}

        {video && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              {video.thumbnailUrl && (
                <Box
                  component="img"
                  src={video.thumbnailUrl}
                  alt=""
                  sx={{
                    width: 160, height: 90, objectFit: 'cover', borderRadius: 1
                  }}
                />
              )}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h6" noWrap title={video.title}>{video.title}</Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {channel?.channelName} · publicado em {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString('pt-BR') : '-'}
                </Typography>
              </Box>
              <Tooltip title="Abrir no YouTube">
                <IconButton onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank', 'noopener')}>
                  <OpenInNewIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Paper>
        )}

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Switch checked={published} onChange={(e) => setPublished(e.target.checked)} />
          <Typography>{published ? 'Publicado na API publica' : 'Nao publicado'}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            startIcon={regenerating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleRegenerate}
            disabled={regenerating || !transcript}
            variant="outlined"
          >
            {regenerating ? 'Gerando...' : 'Regenerar resumo (Claude)'}
          </Button>
          <Button
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            variant="contained"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Stack>

        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Resumo</Typography>
        <TextField
          fullWidth
          multiline
          minRows={6}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Sera preenchido automaticamente pelo Claude apos a transcricao."
        />

        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Pontos principais</Typography>
        <List dense disablePadding>
          {bullets.map((b, i) => (
            <ListItem key={i} disableGutters sx={{ gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={b}
                onChange={(e) => handleBulletChange(i, e.target.value)}
                placeholder={`Ponto ${i + 1}`}
              />
              <IconButton size="small" onClick={() => handleBulletRemove(i)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <Button size="small" startIcon={<AddIcon />} onClick={handleBulletAdd} sx={{ mt: 1 }}>
          Adicionar ponto
        </Button>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>Transcricao completa</Typography>
        <TextField
          fullWidth
          multiline
          minRows={12}
          maxRows={30}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Transcricao do video"
        />
      </PapperBlock>
    </div>
  );
};

export default TranscriptDetailPage;
