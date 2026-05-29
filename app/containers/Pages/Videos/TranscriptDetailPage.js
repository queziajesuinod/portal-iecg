import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ContentState,
  EditorState,
  convertToRaw,
} from 'draft-js';
import htmlToDraft from 'html-to-draftjs';
import draftToHtml from 'draftjs-to-html';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import {
  Alert,
  Autocomplete,
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
  fetchTranscriptProgress,
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function valueToHtml(value) {
  const text = String(value || '');
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function createEditorState(value) {
  const html = valueToHtml(value).trim();
  if (!html) return EditorState.createEmpty();
  try {
    const { contentBlocks, entityMap } = htmlToDraft(html);
    if (!contentBlocks || contentBlocks.length === 0) return EditorState.createEmpty();
    return EditorState.createWithContent(ContentState.createFromBlockArray(contentBlocks, entityMap));
  } catch {
    return EditorState.createEmpty();
  }
}

function getPlainText(editorState) {
  return editorState.getCurrentContent().getPlainText('').trim();
}

function RichTextEditor({ editorState, onChange, minHeight }) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        '& .rdw-editor-toolbar': {
          border: 0,
          borderBottom: 1,
          borderColor: 'divider',
          mb: 0,
        },
        '& .rdw-editor-main': {
          px: 2,
          minHeight,
          lineHeight: 1.7,
        },
      }}
    >
      <Editor
        editorState={editorState}
        onEditorStateChange={onChange}
        toolbar={{
          options: ['inline', 'blockType', 'list', 'link', 'history'],
          inline: { options: ['bold', 'italic', 'underline'] },
        }}
        localization={{ locale: 'pt' }}
      />
    </Box>
  );
}

const CATEGORY_SUGGESTIONS = ['Culto', 'Só pra Elas', 'Conferência', 'Treinamento'];

RichTextEditor.propTypes = {
  editorState: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  minHeight: PropTypes.number.isRequired,
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

  const [transcriptEditorState, setTranscriptEditorState] = useState(() => EditorState.createEmpty());
  const [summaryEditorState, setSummaryEditorState] = useState(() => EditorState.createEmpty());
  const [bullets, setBullets] = useState([]);
  const [published, setPublished] = useState(false);
  const [seoMetaTitle, setSeoMetaTitle] = useState('');
  const [seoMetaDescription, setSeoMetaDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState([]);
  const [seoKeywordInput, setSeoKeywordInput] = useState('');
  const [seoSlug, setSeoSlug] = useState('');
  const [category, setCategory] = useState('');
  const [speaker, setSpeaker] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await fetchTranscriptById(id);
      setData(d);
      setTranscriptEditorState(createEditorState(d.transcript || ''));
      setSummaryEditorState(createEditorState(d.summary || ''));
      setBullets(Array.isArray(d.bulletPoints) ? d.bulletPoints : []);
      setPublished(!!d.published);
      setSeoMetaTitle(d.seoMetaTitle || '');
      setSeoMetaDescription(d.seoMetaDescription || '');
      setSeoKeywords(Array.isArray(d.seoKeywords) ? d.seoKeywords : []);
      setSeoSlug(d.seoSlug || '');
      setCategory(d.category || '');
      setSpeaker(d.speaker || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (data?.status !== 'processing') return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const progress = await fetchTranscriptProgress(id);
        if (cancelled) return;
        const wasProcessing = data?.status === 'processing';
        const stillProcessing = progress.status === 'processing';
        setData((prev) => (prev ? { ...prev, ...progress } : prev));
        if (wasProcessing && !stillProcessing) {
          load();
        }
      } catch (_) {
        // silencioso
      }
    };
    const interval = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [data?.status, id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const transcript = draftToHtml(convertToRaw(transcriptEditorState.getCurrentContent()));
      const summary = draftToHtml(convertToRaw(summaryEditorState.getCurrentContent()));
      const updated = await updateTranscript(id, {
        transcript,
        summary,
        bulletPoints: bullets.filter((b) => b && b.trim()),
        published,
        seoMetaTitle,
        seoMetaDescription,
        seoKeywords,
        seoSlug,
        category: category.trim() || null,
        speaker: speaker.trim() || null,
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
    if (!window.confirm('Cancelar a transcrição em andamento? Será marcada como falhou.')) return;
    try {
      await cancelTranscript(id);
      setFeedback({ severity: 'success', message: 'Transcrição cancelada.' });
      load();
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const updated = await regenerateSummary(id);
      setSummaryEditorState(createEditorState(updated.summary || ''));
      setBullets(Array.isArray(updated.bulletPoints) ? updated.bulletPoints : []);
      setSeoMetaTitle(updated.seoMetaTitle || '');
      setSeoMetaDescription(updated.seoMetaDescription || '');
      setSeoKeywords(Array.isArray(updated.seoKeywords) ? updated.seoKeywords : []);
      setSeoSlug(updated.seoSlug || '');
      if (updated.speaker) setSpeaker(updated.speaker);
      setFeedback({ severity: 'success', message: 'Resumo + SEO regenerados pelo Claude.' });
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

  const handleKeywordAdd = () => {
    const value = seoKeywordInput.trim().toLowerCase();
    if (!value) return;
    if (seoKeywords.includes(value)) {
      setSeoKeywordInput('');
      return;
    }
    setSeoKeywords((prev) => [...prev, value]);
    setSeoKeywordInput('');
  };
  const handleKeywordRemove = (kw) => setSeoKeywords((prev) => prev.filter((k) => k !== kw));
  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleKeywordAdd();
    }
  };

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
        <title>Revisão de transcrição | Portal IECG</title>
      </Helmet>
      <PapperBlock title="Revisão da transcrição" desc="Edite e publique o resumo para a API pública." icon="ion-ios-paper-outline" whiteBg>
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
                {data.progressStage === 'audio_download' && 'Baixando áudio do YouTube...'}
                {data.progressStage === 'whisper' && `Transcrevendo com Whisper... ${Number(data.progressPercent || 0).toFixed(1)}%`}
                {data.progressStage === 'caption' && 'Baixando legenda manual...'}
                {data.progressStage === 'summary' && 'Gerando resumo com Claude...'}
                {!data.progressStage && 'Iniciando...'}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button size="small" color="error" startIcon={<CancelIcon />} onClick={handleCancel}>
                Cancelar
              </Button>
              <Typography variant="caption" color="text.secondary">Atualiza em tempo real</Typography>
            </Stack>
            <LinearProgress
              variant={data.progressStage === 'whisper' ? 'determinate' : 'indeterminate'}
              value={data.progressStage === 'whisper' ? Number(data.progressPercent || 0) : undefined}
              sx={{
                height: 8,
                borderRadius: 1,
                '& .MuiLinearProgress-bar': {
                  transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                },
              }}
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
          <Typography>{published ? 'Publicado na API pública' : 'Não publicado'}</Typography>
          <Autocomplete
            freeSolo
            options={CATEGORY_SUGGESTIONS}
            value={category}
            onChange={(_, value) => setCategory(String(value || '').slice(0, 80))}
            onInputChange={(_, value) => setCategory(String(value || '').slice(0, 80))}
            sx={{ minWidth: 220 }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Categoria"
              />
            )}
          />
          <TextField
            size="small"
            label="Orador"
            placeholder="Pr. Aldo Giovanni"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value.slice(0, 160))}
            sx={{ minWidth: 220 }}
            helperText="Quem está pregando neste vídeo"
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            startIcon={regenerating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleRegenerate}
            disabled={regenerating || !getPlainText(transcriptEditorState)}
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
        <RichTextEditor
          editorState={summaryEditorState}
          onChange={setSummaryEditorState}
          minHeight={160}
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

        <Typography variant="subtitle1" sx={{ mb: 1 }}>SEO</Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="Meta Título (Google) — 50 a 60 caracteres"
              value={seoMetaTitle}
              onChange={(e) => setSeoMetaTitle(e.target.value.slice(0, 160))}
              helperText={`${seoMetaTitle.length}/60 caracteres`}
              error={seoMetaTitle.length > 60}
            />
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              label="Meta Descrição (snippet do Google) — até 160 caracteres"
              value={seoMetaDescription}
              onChange={(e) => setSeoMetaDescription(e.target.value.slice(0, 320))}
              helperText={`${seoMetaDescription.length}/160 caracteres`}
              error={seoMetaDescription.length > 160}
            />
            <TextField
              fullWidth
              size="small"
              label="Slug (URL amigável)"
              value={seoSlug}
              onChange={(e) => setSeoSlug(e.target.value)}
              helperText={`Acessível em /api/public/videos/slug/${seoSlug || '...'}`}
            />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Palavras-chave (Enter ou vírgula para adicionar)
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {seoKeywords.map((kw) => (
                  <Chip key={kw} label={kw} onDelete={() => handleKeywordRemove(kw)} size="small" />
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Ex: pregação, salmo 23, bom pastor"
                  value={seoKeywordInput}
                  onChange={(e) => setSeoKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                />
                <Button size="small" variant="outlined" onClick={handleKeywordAdd} disabled={!seoKeywordInput.trim()}>
                  Adicionar
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>Transcrição completa</Typography>
        <RichTextEditor
          editorState={transcriptEditorState}
          onChange={setTranscriptEditorState}
          minHeight={320}
        />
      </PapperBlock>
    </div>
  );
};

export default TranscriptDetailPage;
