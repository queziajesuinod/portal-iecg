import React, { useState, useRef, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent,
  DialogTitle, Fab, Paper, Stack, TextField, Typography,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import AddIcon from '@mui/icons-material/Add';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import {
  listarPerguntas, enviarPergunta, curtirPergunta,
} from '../../../api/liveQaPublicClient';

const HEADER_BG = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #9333ea 100%)';
const MEDALS = { 0: '#FFC107', 1: '#B0BEC5', 2: '#CD7F32' };

// Hook FLIP: anima a mudança de posição dos cards quando o ranking reordena
const useFlip = () => {
  const refs = useRef(new Map());
  const prevRects = useRef(new Map());

  useLayoutEffect(() => {
    const newRects = new Map();
    refs.current.forEach((node, id) => {
      if (node) newRects.set(id, node.getBoundingClientRect());
    });
    newRects.forEach((rect, id) => {
      const prev = prevRects.current.get(id);
      if (prev) {
        const dy = prev.top - rect.top;
        if (Math.abs(dy) > 2 && refs.current.get(id)?.animate) {
          refs.current.get(id).animate(
            [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
            { duration: 450, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
          );
        }
      }
    });
    prevRects.current = newRects;
  });

  return (id) => (node) => {
    if (node) refs.current.set(id, node);
    else refs.current.delete(id);
  };
};

const QaRoomPage = () => {
  const { code } = useParams();
  const queryClient = useQueryClient();
  const queryKey = ['qa-public', code];

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('qaAuthorName') || '');
  const [erro, setErro] = useState('');
  const [burst, setBurst] = useState(null); // { id, ts } para o efeito de curtida
  const setCardRef = useFlip();

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => listarPerguntas(code),
    refetchInterval: 2500,
  });

  const likeMutation = useMutation({
    mutationFn: (questionId) => curtirPergunta(questionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleLike = (q) => {
    if (!q.likedByMe) setBurst({ id: q.id, ts: Date.now() });
    likeMutation.mutate(q.id);
  };

  const sendMutation = useMutation({
    mutationFn: () => enviarPergunta(code, { text: text.trim(), authorName: authorName.trim() }),
    onSuccess: () => {
      if (authorName.trim()) localStorage.setItem('qaAuthorName', authorName.trim());
      setText('');
      setOpen(false);
      setErro('');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => setErro(err?.response?.data?.erro || 'Não foi possível enviar.'),
  });

  if (isLoading) {
    return (
      <Box sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
      }}
      >
        <Typography color="error">Sala não encontrada. Confira o código.</Typography>
      </Box>
    );
  }

  const { session } = data;
  const fechada = session.status !== 'open';
  // Esconde as perguntas já respondidas; a API já vem ordenada por curtidas
  const questions = (data.questions || []).filter((q) => !q.answered);

  const renderLike = (q) => {
    const liked = q.likedByMe;
    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={() => handleLike(q)}
        sx={{
          position: 'relative',
          userSelect: 'none',
          cursor: 'pointer',
          minWidth: 56,
          py: 1,
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.3,
          border: '1.5px solid',
          borderColor: liked ? 'primary.main' : 'divider',
          color: liked ? 'primary.main' : 'text.secondary',
          bgcolor: liked ? 'primary.50' : 'transparent',
          transition: 'all .18s ease',
          '&:hover': { bgcolor: liked ? 'primary.100' : 'action.hover' },
          '&:active': { transform: 'scale(0.92)' },
        }}
      >
        {liked ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOffAltIcon fontSize="small" />}
        <Typography variant="subtitle2" fontWeight={800} lineHeight={1}>{q.likesCount}</Typography>

        {/* Efeito de curtida: polegar subindo */}
        {burst && burst.id === q.id && (
          <Box
            key={burst.ts}
            onAnimationEnd={() => setBurst(null)}
            sx={{
              position: 'absolute',
              top: 2,
              left: '50%',
              pointerEvents: 'none',
              color: 'primary.main',
              animation: 'qaLikeFloat .8s ease-out forwards',
              '@keyframes qaLikeFloat': {
                '0%': { opacity: 1, transform: 'translate(-50%, 0) scale(.6)' },
                '100%': { opacity: 0, transform: 'translate(-50%, -46px) scale(1.5)' },
              },
            }}
          >
            <ThumbUpIcon fontSize="small" />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f2f9', pb: 13 }}>
      {/* Cabeçalho */}
      <Box
        sx={{
          background: HEADER_BG,
          color: '#fff',
          px: 2,
          pt: 3,
          pb: 4,
          position: 'relative',
          overflow: 'hidden',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          boxShadow: '0 8px 24px rgba(79,70,229,0.25)',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -60,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
          },
        }}
      >
        <Container maxWidth="sm" disableGutters sx={{ position: 'relative' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Chip
              label={`# ${session.code}`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, letterSpacing: 1,
              }}
            />
            {fechada
              ? <Chip label="Sala fechada" size="small" color="warning" />
              : (
                <Chip
                  label="● Ao vivo"
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700 }}
                />
              )}
          </Stack>
          <Typography variant="h5" fontWeight={800}>{session.title}</Typography>
          {session.description && (
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>{session.description}</Typography>
          )}
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5, opacity: 0.9 }}>
            <ForumOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography variant="body2" fontWeight={600}>
              {questions.length} {questions.length === 1 ? 'pergunta' : 'perguntas'}
            </Typography>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 3 }}>
        {questions.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 5, textAlign: 'center', borderRadius: 4, border: '1.5px dashed', borderColor: 'divider',
            }}
          >
            <ForumOutlinedIcon sx={{ fontSize: 52, color: 'primary.light', mb: 1 }} />
            <Typography fontWeight={700}>Nenhuma pergunta ainda</Typography>
            <Typography variant="body2" color="text.secondary">
              Seja o primeiro a perguntar! 🙌
            </Typography>
          </Paper>
        )}

        <Stack spacing={1.5}>
          {questions.map((q, idx) => {
            const medal = MEDALS[idx];
            return (
              <Paper
                key={q.id}
                ref={setCardRef(q.id)}
                elevation={q.isLive ? 0 : 1}
                sx={{
                  p: 2,
                  borderRadius: 4,
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: 'qaCardIn .35s ease',
                  '@keyframes qaCardIn': {
                    from: { opacity: 0, transform: 'translateY(8px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                  border: '1.5px solid',
                  borderColor: q.isLive ? 'secondary.main' : (q.mine ? 'primary.light' : 'transparent'),
                  ...(q.isLive && {
                    background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 60%)',
                    boxShadow: '0 6px 20px rgba(124,58,237,0.18)',
                  }),
                }}
              >
                {/* Selo de ranking */}
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                    color: medal ? '#fff' : 'text.secondary',
                    bgcolor: medal || 'action.hover',
                    boxShadow: medal ? `0 2px 8px ${medal}66` : 'none',
                  }}
                >
                  {idx + 1}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {q.isLive && (
                    <Chip
                      icon={<LiveTvIcon />}
                      label="Respondendo agora"
                      color="secondary"
                      size="small"
                      sx={{ mb: 0.5, fontWeight: 700 }}
                    />
                  )}
                  <Typography sx={{ wordBreak: 'break-word', fontWeight: 500 }}>{q.text}</Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.3 }}>
                    <Typography variant="caption" color="text.secondary">
                      {q.authorName ? q.authorName : 'Anônimo'}
                    </Typography>
                    {q.mine && (
                      <Chip label="você" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                    )}
                  </Stack>
                </Box>

                {renderLike(q)}
              </Paper>
            );
          })}
        </Stack>
      </Container>

      {/* Botão flutuante para perguntar */}
      {!fechada && (
        <Fab
          variant="extended"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: 700,
            px: 3,
            color: '#fff',
            background: HEADER_BG,
            boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
            '&:hover': { background: HEADER_BG, filter: 'brightness(1.05)' },
          }}
        >
          <AddIcon sx={{ mr: 1 }} />
          Fazer uma pergunta
        </Fab>
      )}

      {/* Diálogo de envio */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Sua pergunta</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="Digite sua pergunta..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputProps={{ maxLength: 500 }}
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary">{text.length}/500</Typography>
          <TextField
            fullWidth
            placeholder="Seu nome (opcional)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            inputProps={{ maxLength: 120 }}
            sx={{ mt: 2 }}
          />
          {erro && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{erro}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!text.trim() || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {sendMutation.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QaRoomPage;
