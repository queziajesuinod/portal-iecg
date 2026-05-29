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
import {
  fetchPublicVideos,
  fetchPublicChannels,
  fetchPublicCategories,
} from '../../../utils/publicVideosClient';

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  return `${m}min`;
}

const VideoLibraryPage = () => {
  const history = useHistory();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [channelId, setChannelId] = useState('');
  const [category, setCategory] = useState('');
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchPublicChannels().then(setChannels).catch(() => {});
    fetchPublicCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPublicVideos({
          channelId: channelId || undefined,
          category: category || undefined,
          search: searchDebounced || undefined,
          all: true,
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
  }, [searchDebounced, channelId, category]);

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
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
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
              onChange={(e) => { setChannelId(e.target.value); }}
            >
              <MenuItem value="">Todos os canais</MenuItem>
              {channels.map((c) => (
                <MenuItem key={c.channelId} value={c.channelId}>{c.channelName || c.ownerName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Categoria</InputLabel>
            <Select
              label="Categoria"
              value={category}
              onChange={(e) => { setCategory(e.target.value); }}
            >
              <MenuItem value="">Todas as categorias</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
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
              Nenhum vídeo publicado ainda.
            </Typography>
          </Box>
        )}

        {!loading && items.length > 0 && (
          <>
            <Grid container spacing={1.5}>
              {items.map((video) => (
                <Grid item xs={6} sm={4} md={3} lg={2.4} xl={2} key={video.id}>
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
                              icon={<AccessTimeIcon sx={{ fontSize: 12 }} />}
                              label={formatDuration(video.durationSeconds)}
                              sx={{
                                position: 'absolute',
                                bottom: 4,
                                right: 4,
                                height: 20,
                                bgcolor: 'rgba(0,0,0,0.75)',
                                color: 'white',
                                '& .MuiChip-label': { px: 0.75, fontSize: 11 }
                              }}
                            />
                          )}
                        </Box>
                      )}
                      <CardContent sx={{ flexGrow: 1, p: 1.25, '&:last-child': { pb: 1.25 } }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                          <Avatar
                            src={video.channel?.channelThumbnailUrl}
                            sx={{ width: 18, height: 18, fontSize: 11 }}
                          >
                            {video.channel?.channelName?.[0] || '?'}
                          </Avatar>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
                            {video.channel?.channelName}
                          </Typography>
                        </Stack>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            lineHeight: 1.25,
                            fontSize: 13,
                            mb: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {video.title}
                        </Typography>
                        {video.category && (
                          <Chip
                            size="small"
                            label={video.category}
                            sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: 10 } }}
                          />
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
              {total} vídeo(s) publicado(s)
            </Typography>
          </>
        )}
      </PapperBlock>
    </div>
  );
};

export default VideoLibraryPage;
