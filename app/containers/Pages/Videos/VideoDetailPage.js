import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Helmet } from 'react-helmet';
import { useHistory, useParams } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import { fetchPublicVideoDetail } from '../../../utils/publicVideosClient';

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  return `${m}min`;
}

function sanitizeRichHtml(value) {
  const html = String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

  return { __html: html };
}

const VideoDetailPage = () => {
  const { videoId } = useParams();
  const history = useHistory();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPublicVideoDetail(videoId);
        setVideo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [videoId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !video) {
    return (
      <PapperBlock title="Vídeo não encontrado" whiteBg>
        <Alert severity="error">{error || 'Vídeo não encontrado ou não publicado.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => history.push('/app/videos')} sx={{ mt: 2 }}>
          Voltar para biblioteca
        </Button>
      </PapperBlock>
    );
  }

  const seo = video.seo || {};
  const metaTitle = seo.metaTitle || video.title;
  const metaDesc = seo.metaDescription || '';
  const keywords = Array.isArray(seo.keywords) ? seo.keywords : [];

  return (
    <div>
      <Helmet>
        <title>{`${metaTitle} | Portal IECG`}</title>
        {metaDesc && <meta name="description" content={metaDesc} />}
        {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
        <meta property="og:title" content={metaTitle} />
        {metaDesc && <meta property="og:description" content={metaDesc} />}
        {video.thumbnailUrl && <meta property="og:image" content={video.thumbnailUrl} />}
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        {metaDesc && <meta name="twitter:description" content={metaDesc} />}
        {video.thumbnailUrl && <meta name="twitter:image" content={video.thumbnailUrl} />}
      </Helmet>
      <PapperBlock title={video.title} desc={video.channel?.channelName} icon="ion-logo-youtube" whiteBg>
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => history.push('/app/videos')}>
            Voltar
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<OpenInNewIcon />}
            onClick={() => window.open(video.youtubeUrl, '_blank', 'noopener')}
          >
            Assistir no YouTube
          </Button>
        </Stack>

        {video.thumbnailUrl && (
          <Box
            component="img"
            src={video.thumbnailUrl}
            alt=""
            sx={{
              width: '100%', maxWidth: 720, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 2, mb: 3, display: 'block'
            }}
          />
        )}

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Avatar src={video.channel?.channelThumbnailUrl} sx={{ width: 32, height: 32 }}>
            {video.channel?.channelName?.[0] || '?'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{video.channel?.channelName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {video.channel?.ownerName}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {video.publishedAt && (
            <Chip size="small" label={new Date(video.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} />
          )}
          {video.durationSeconds && (
            <Chip size="small" icon={<AccessTimeIcon />} label={formatDuration(video.durationSeconds)} />
          )}
        </Stack>

        {Array.isArray(video.bulletPoints) && video.bulletPoints.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Pontos principais
            </Typography>
            <List dense disablePadding>
              {video.bulletPoints.map((point, i) => (
                <ListItem key={i} disableGutters alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                    <CheckCircleIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={point} />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {video.summary && (
          <>
            <Typography variant="h6" sx={{ mb: 1 }}>Resumo</Typography>
            <Box
              sx={{
                mb: 3,
                lineHeight: 1.8,
                fontSize: '1.05rem',
                '& p': { mt: 0, mb: 2 },
                '& h3': {
                  fontSize: '1.2rem', fontWeight: 600, mt: 3, mb: 1.5, color: 'primary.main',
                },
                '& strong': { fontWeight: 600 },
                '& em': { fontStyle: 'italic' },
                '& blockquote': {
                  borderLeft: 3,
                  borderColor: 'primary.main',
                  pl: 2,
                  py: 1,
                  my: 2,
                  bgcolor: 'grey.50',
                  fontStyle: 'italic',
                  color: 'text.secondary',
                  '& p': { mb: 0 },
                },
                '& a': { color: 'primary.main', textDecoration: 'underline' },
                '& ul, & ol': { pl: 3 },
              }}
              dangerouslySetInnerHTML={sanitizeRichHtml(video.summary)}
            />
          </>
        )}

        {keywords.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Tags
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {keywords.map((kw) => (
                <Chip key={kw} label={kw} size="small" variant="outlined" />
              ))}
            </Stack>
          </Box>
        )}

        {video.transcript && (
          <>
            <Divider sx={{ my: 3 }} />
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>Transcrição completa</Typography>
              <IconButton onClick={() => setTranscriptOpen((v) => !v)}>
                {transcriptOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Stack>
            <Collapse in={transcriptOpen}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Box
                  sx={{
                    lineHeight: 1.7,
                    '& p': { mt: 0, mb: 1.5 },
                    '& ul, & ol': { pl: 3 },
                  }}
                  dangerouslySetInnerHTML={sanitizeRichHtml(video.transcript)}
                />
              </Paper>
            </Collapse>
            {!transcriptOpen && (
              <Typography variant="caption" color="text.secondary">
                Clique no botão acima para ver o texto integral.
              </Typography>
            )}
          </>
        )}
      </PapperBlock>
    </div>
  );
};

export default VideoDetailPage;
