import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Chip } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import { perguntaAoVivo } from '../../../api/liveQaPublicClient';
import { resolveLiveTheme, buildLiveBackground, logoCornerStyle } from '../../../utils/liveQaTheme';

// Tela de projeção: mostra em destaque a pergunta marcada como "ao vivo".
const QaLivePage = () => {
  const { code } = useParams();
  const { data } = useQuery({
    queryKey: ['qa-live', code],
    queryFn: () => perguntaAoVivo(code),
    refetchInterval: 2000,
  });

  const session = data?.session;
  const question = data?.question;
  const upNext = data?.upNext || [];
  const theme = resolveLiveTheme(session?.liveTheme);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        ...buildLiveBackground(theme),
        color: theme.textColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: { xs: 4, md: 10 },
        textAlign: 'center',
      }}
    >
      {session && (
        <Typography variant="h6" sx={{ opacity: 0.7, position: 'absolute', top: 32 }}>
          {session.title} · Sala {session.code}
        </Typography>
      )}

      {theme.logoUrl && (
        <Box
          component="img"
          src={theme.logoUrl}
          alt="logo"
          sx={{
            position: 'absolute',
            maxHeight: { xs: 56, md: 90 },
            maxWidth: { xs: 140, md: 220 },
            objectFit: 'contain',
            ...logoCornerStyle(theme.logoPosition),
          }}
        />
      )}

      {question ? (
        <Box
          sx={{
            width: '100%',
            maxWidth: 1300,
            borderRadius: 6,
            px: { xs: 4, md: 10 },
            py: { xs: 5, md: 9 },
            bgcolor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Chip
            icon={<LiveTvIcon sx={{ color: '#fff !important' }} />}
            label="Respondendo agora"
            sx={{
              mb: { xs: 4, md: 6 },
              fontSize: { xs: 18, md: 22 },
              height: 'auto',
              py: 1.2,
              px: 1.5,
              color: '#fff',
              bgcolor: theme.accentColor,
            }}
          />
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2.4rem', md: '5rem' },
              lineHeight: 1.15,
            }}
          >
            {question.text}
          </Typography>
          <Box sx={{
            mt: { xs: 5, md: 7 }, display: 'flex', alignItems: 'center', gap: 1, opacity: 0.85,
          }}
          >
            <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.8rem' } }}>
              {question.authorName ? question.authorName : 'Anônimo'}
            </Typography>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5, ml: 3, color: theme.accentColor,
            }}
            >
              <ThumbUpIcon sx={{ fontSize: { xs: 28, md: 38 } }} />
              <Typography fontWeight={700} sx={{ fontSize: { xs: '1.3rem', md: '1.8rem' } }}>{question.likesCount}</Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            borderRadius: 6,
            px: { xs: 5, md: 10 },
            py: { xs: 5, md: 8 },
            bgcolor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}
        >
          <Typography sx={{ fontSize: { xs: '1.5rem', md: '2.5rem' }, opacity: 0.85 }}>
            Aguardando a próxima pergunta...
          </Typography>
        </Box>
      )}

      {/* Fila "A seguir" no canto inferior */}
      {upNext.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 28,
            left: 28,
            right: 28,
            maxWidth: 720,
            mx: 'auto',
            textAlign: 'left',
            opacity: 0.92,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color: theme.accentColor, fontWeight: 700,
            }}
          >
            <ThumbUpIcon sx={{ fontSize: 16 }} /> A seguir
          </Typography>
          <Box sx={{
            display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center'
          }}>
            {upNext.map((q) => (
              <Box
                key={q.id}
                sx={{
                  flex: '1 1 200px',
                  maxWidth: 320,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Chip
                  label={q.likesCount}
                  size="small"
                  icon={<ThumbUpIcon sx={{ fontSize: '14px !important', color: '#fff !important' }} />}
                  sx={{ bgcolor: theme.accentColor, color: '#fff', fontWeight: 700 }}
                />
                <Typography
                  sx={{
                    fontSize: { xs: '0.9rem', md: '1.1rem' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {q.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default QaLivePage;
