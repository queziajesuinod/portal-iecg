import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Box, Button, Container, Paper, TextField, Typography,
} from '@mui/material';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { entrarSala } from '../../../api/liveQaPublicClient';

const HEADER_BG = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #9333ea 100%)';

const QaJoinPage = () => {
  const history = useHistory();
  const [code, setCode] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setErro('');
    try {
      await entrarSala(clean);
      history.push(`/qa/${clean}`);
    } catch (err) {
      setErro(err?.response?.data?.erro || 'Sala não encontrada. Confira o código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: HEADER_BG,
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        // brilhos decorativos
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -100,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -120,
          right: -60,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        },
      }}
    >
      <Container maxWidth="xs" sx={{ position: 'relative' }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 5,
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(49,27,146,0.35)',
          }}
        >
          {/* Ícone em círculo com gradiente */}
          <Box
            sx={{
              width: 76,
              height: 76,
              mx: 'auto',
              mb: 2,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: HEADER_BG,
              boxShadow: '0 8px 20px rgba(124,58,237,0.4)',
            }}
          >
            <QuestionAnswerIcon sx={{ fontSize: 38, color: '#fff' }} />
          </Box>

          <Typography variant="h5" fontWeight={800} gutterBottom>
            Perguntas ao Vivo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Digite o código da sala para enviar e curtir perguntas.
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              autoFocus
              placeholder="Ex: ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              inputProps={{
                maxLength: 12,
                style: {
                  textAlign: 'center', fontSize: 30, letterSpacing: 8, fontWeight: 800,
                },
              }}
              error={!!erro}
              helperText={erro || ' '}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              size="large"
              disabled={loading || !code.trim()}
              sx={{
                mt: 1,
                py: 1.6,
                borderRadius: 3,
                fontWeight: 800,
                fontSize: 16,
                color: '#fff',
                background: HEADER_BG,
                boxShadow: '0 8px 20px rgba(124,58,237,0.4)',
                '&:hover': { background: HEADER_BG, filter: 'brightness(1.05)' },
                '&.Mui-disabled': { background: '#c9c9d4', color: '#fff' },
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Paper>

        <Typography
          variant="caption"
          sx={{
            display: 'block', textAlign: 'center', mt: 2, color: 'rgba(255,255,255,0.8)',
          }}
        >
          Igreja Evangélica Comunidade Global -IECG
        </Typography>
      </Container>
    </Box>
  );
};

export default QaJoinPage;
