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
        <Alert severity="error">{error || 'Video nao encontrado ou nao publicado.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => history.push('/app/videos')} sx={{ mt: 2 }}>
          Voltar para biblioteca
        </Button>
      </PapperBlock>
    );
  }

  return (
    <div>
      <Helmet>
        <title>{video.title} | Portal IECG</title>
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
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3, lineHeight: 1.7 }}>
              {video.summary}
            </Typography>
          </>
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
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit' }}>
                  {video.transcript}
                </Typography>
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
