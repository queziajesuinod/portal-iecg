import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import { fetchPublicVideos, fetchPublicChannels } from '../../../utils/publicVideosClient';

const PAGE_SIZE = 12;

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  return `${m}min`;
}

function truncate(text, max = 180) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

const VideoLibraryPage = () => {
  const history = useHistory();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [channelId, setChannelId] = useState('');
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchPublicChannels().then(setChannels).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPublicVideos({
          channelId: channelId || undefined,
          search: searchDebounced || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });
        setItems(data.items);
        setTotal(data.total);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, searchDebounced, channelId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <Helmet>
        <title>Biblioteca de Vídeos | Portal IECG</title>
      </Helmet>
      <PapperBlock
        title="Biblioteca de Vídeos"
        desc="Pregações e ensinos transcritos e resumidos para leitura."
        icon="ion-logo-youtube"
        whiteBg
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <TextField
            size="small"
            placeholder="Buscar por titulo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Canal</InputLabel>
            <Select
              label="Canal"
              value={channelId}
              onChange={(e) => { setChannelId(e.target.value); setPage(1); }}
            >
              <MenuItem value="">Todos os canais</MenuItem>
              {channels.map((c) => (
                <MenuItem key={c.channelId} value={c.channelId}>{c.channelName || c.ownerName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && items.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">
              Nenhum video publicado ainda.
            </Typography>
          </Box>
        )}

        {!loading && items.length > 0 && (
          <>
            <Grid container spacing={2}>
              {items.map((video) => (
                <Grid item xs={12} sm={6} md={4} key={video.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardActionArea onClick={() => history.push(`/app/videos/${video.videoId}`)} sx={{
                      flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch'
                    }}>
                      {video.thumbnailUrl && (
                        <Box sx={{ position: 'relative' }}>
                          <CardMedia
                            component="img"
                            image={video.thumbnailUrl}
                            alt={video.title}
                            sx={{ aspectRatio: '16/9', objectFit: 'cover' }}
                          />
                          {video.durationSeconds && (
                            <Chip
                              size="small"
                              icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                              label={formatDuration(video.durationSeconds)}
                              sx={{
                                position: 'absolute', bottom: 8, right: 8, bgcolor: 'rgba(0,0,0,0.75)', color: 'white'
                              }}
                            />
                          )}
                        </Box>
                      )}
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Avatar
                            src={video.channel?.channelThumbnailUrl}
                            sx={{ width: 24, height: 24 }}
                          >
                            {video.channel?.channelName?.[0] || '?'}
                          </Avatar>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {video.channel?.channelName}
                          </Typography>
                        </Stack>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3, mb: 1 }}>
                          {video.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                          {truncate(video.summary, 200)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                />
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
              {total} video(s) publicado(s)
            </Typography>
          </>
        )}
      </PapperBlock>
    </div>
  );
};

export default VideoLibraryPage;
