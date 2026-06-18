import React, { useState, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Collapse, IconButton, Paper, Stack, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PaletteIcon from '@mui/icons-material/Palette';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Helmet } from 'react-helmet';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import {
  listarSalas, atualizarSala, listarPerguntas, moderarPergunta, excluirPergunta,
} from '../../../api/liveQaApi';
import { getStoredPermissions } from '../../../utils/permissions';
import LiveThemeDialog from './LiveThemeDialog';

const canManageSessions = () => {
  const perms = getStoredPermissions();
  return !perms.length || perms.includes('ADMIN_FULL_ACCESS') || perms.includes('PERGUNTAS_AO_VIVO_GERENCIAR');
};

const LiveQaModerationPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const queryClient = useQueryClient();
  const perguntasKey = ['qa-admin-questions', id];
  const [themeOpen, setThemeOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: salas = [] } = useQuery({ queryKey: ['qa-admin-sessions'], queryFn: listarSalas });
  const sala = salas.find((s) => s.id === id);

  const { data, isLoading } = useQuery({
    queryKey: perguntasKey,
    queryFn: () => listarPerguntas(id),
    refetchInterval: 3000,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: perguntasKey });

  const moderar = useMutation({
    mutationFn: ({ questionId, dados }) => moderarPergunta(questionId, dados),
    onSuccess: invalidar,
  });
  const excluir = useMutation({
    mutationFn: (questionId) => excluirPergunta(questionId),
    onSuccess: invalidar,
  });
  const toggleSala = useMutation({
    mutationFn: (status) => atualizarSala(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qa-admin-sessions'] }),
  });
  const toggleBloqueio = useMutation({
    mutationFn: (questionsLocked) => atualizarSala(id, { questionsLocked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qa-admin-sessions'] }),
  });
  const salvarTema = useMutation({
    mutationFn: (liveTheme) => atualizarSala(id, { liveTheme }),
    onSuccess: () => {
      setThemeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['qa-admin-sessions'] });
    },
  });

  const questions = useMemo(() => data?.questions || [], [data]);
  const liveId = data?.liveQuestionId;
  const canManage = canManageSessions();

  const responderAgora = (questionId) => {
    moderar.mutate({ questionId, dados: { isLive: true } });
  };

  // Separa em grupos respeitando o ranking de curtidas (a API já vem ordenada)
  const grupos = useMemo(() => {
    const liveQuestion = questions.find((q) => q.id === liveId && q.status !== 'archived');
    const fila = questions.filter((q) => q.status !== 'archived' && !q.answered && q.id !== liveId);
    const respondidas = questions.filter((q) => q.status !== 'archived' && q.answered && q.id !== liveId);
    const arquivadas = questions.filter((q) => q.status === 'archived');
    return {
      liveQuestion, fila, respondidas, arquivadas,
    };
  }, [questions, liveId]);

  const renderCard = (q, { rank, variant } = {}) => {
    const isLive = variant === 'live';
    const accent = isLive ? 'secondary.main' : (variant === 'answered' ? 'success.main' : 'primary.main');
    const medalColors = { 1: '#FFC107', 2: '#B0BEC5', 3: '#CD7F32' };
    return (
      <Paper
        key={q.id}
        elevation={isLive ? 4 : 1}
        sx={{
          p: 2,
          pl: 2.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '5px solid',
          borderLeftColor: accent,
          bgcolor: isLive ? 'rgba(156,39,176,0.06)' : 'background.paper',
          opacity: variant === 'archived' ? 0.65 : 1,
        }}
      >
        {/* Curtidas + ranking */}
        <Stack alignItems="center" sx={{ minWidth: 56 }}>
          {typeof rank === 'number' && (
            <Box
              sx={{
                width: 26,
                height: 26,
                mb: 0.5,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
                color: medalColors[rank] ? '#fff' : 'text.secondary',
                bgcolor: medalColors[rank] || 'action.hover',
              }}
            >
              {rank}
            </Box>
          )}
          <Stack direction="row" alignItems="center" spacing={0.3}>
            <ThumbUpIcon color="action" sx={{ fontSize: 18 }} />
            <Typography variant="h6" fontWeight={800} lineHeight={1}>{q.likesCount}</Typography>
          </Stack>
        </Stack>

        {/* Texto */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ wordBreak: 'break-word', fontWeight: 500 }}>{q.text}</Typography>
          <Typography variant="caption" color="text.secondary">
            {q.authorName ? q.authorName : 'Anônimo'}
          </Typography>
        </Box>

        {/* Ações */}
        <Stack direction="row" spacing={0.5}>
          {isLive ? (
            <Tooltip title="Tirar do ao vivo">
              <IconButton color="secondary" onClick={() => moderar.mutate({ questionId: q.id, dados: { isLive: false } })}>
                <StopCircleIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Responder agora (marca a anterior como respondida)">
              <IconButton color="primary" onClick={() => responderAgora(q.id)}>
                <LiveTvIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={q.answered ? 'Reabrir (não respondida)' : 'Marcar como respondida'}>
            <IconButton
              color={q.answered ? 'warning' : 'success'}
              onClick={() => moderar.mutate({ questionId: q.id, dados: { answered: !q.answered } })}
            >
              {q.answered ? <ReplayIcon /> : <CheckCircleIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={q.status === 'archived' ? 'Restaurar' : 'Arquivar'}>
            <IconButton
              onClick={() => moderar.mutate({ questionId: q.id, dados: { status: q.status === 'archived' ? 'active' : 'archived' } })}
            >
              {q.status === 'archived' ? <UnarchiveIcon /> : <ArchiveIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              color="error"
              onClick={() => {
                // eslint-disable-next-line no-alert
                if (window.confirm('Excluir esta pergunta?')) excluir.mutate(q.id);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    );
  };

  // Área com rolagem própria: só limita a altura quando passa do limite de itens
  const scrollAreaSx = (count, limite) => (count > limite
    ? {
      maxHeight: { xs: 320, md: 380 },
      overflowY: 'auto',
      pr: 1,
      // espaço pra barra não cobrir a borda colorida dos cards
      pl: 0.5,
      py: 0.5,
      borderRadius: 2,
      // barra de rolagem discreta
      '&::-webkit-scrollbar': { width: 8 },
      '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.18)', borderRadius: 8 },
      '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(0,0,0,0.28)' },
      scrollbarWidth: 'thin',
    }
    : {});

  const sectionHeader = (icon, title, count, color) => (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 3, mb: 1 }}>
      {icon}
      <Typography variant="subtitle1" fontWeight={700} color={color || 'text.primary'}>{title}</Typography>
      <Chip label={count} size="small" />
    </Stack>
  );

  return (
    <div>
      <Helmet><title>{sala?.title || 'Perguntas ao Vivo'}</title></Helmet>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => history.push('/app/perguntas-ao-vivo')}
        sx={{ mb: 1 }}
      >
        Voltar para salas
      </Button>
      <PapperBlock
        title={sala?.title || 'Sala'}
        icon="ion-ios-chatbubbles-outline"
        desc={sala ? `Sala ${sala.code} · ${sala.status === 'open' ? 'Aberta' : 'Fechada'}` : 'Gerencie as perguntas em tempo real'}
      >
        {/* Barra de ações */}
        {sala && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Tooltip title="Copiar link público">
              <IconButton
                onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/qa/${sala.code}`)}
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            {canManage && (
              <Button variant="outlined" startIcon={<PaletteIcon />} onClick={() => setThemeOpen(true)}>
                Aparência
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(`/qa/${sala.code}/ao-vivo`, '_blank')}
            >
              Tela ao vivo
            </Button>
            <Box sx={{ flex: 1 }} />
            {canManage && sala.status === 'open' && (
              <Button
                variant="outlined"
                color={sala.questionsLocked ? 'success' : 'warning'}
                startIcon={sala.questionsLocked ? <LockOpenIcon /> : <LockIcon />}
                onClick={() => toggleBloqueio.mutate(!sala.questionsLocked)}
              >
                {sala.questionsLocked ? 'Permitir perguntas' : 'Bloquear perguntas'}
              </Button>
            )}
            {canManage && (
              <Button
                variant="contained"
                color={sala.status === 'open' ? 'warning' : 'success'}
                onClick={() => toggleSala.mutate(sala.status === 'open' ? 'closed' : 'open')}
                sx={{ boxShadow: 'none' }}
              >
                {sala.status === 'open' ? 'Fechar sala' : 'Reabrir sala'}
              </Button>
            )}
          </Stack>
        )}

        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <>
            {questions.length === 0 && (
              <Paper variant="outlined" sx={{
                p: 4, textAlign: 'center', borderRadius: 2, borderStyle: 'dashed'
              }}>
                <Typography color="text.secondary">
                Nenhuma pergunta ainda. Compartilhe o código <b>{sala?.code}</b> com o público.
                </Typography>
              </Paper>
            )}

            {/* Ao vivo agora */}
            {grupos.liveQuestion && (
              <>
                {sectionHeader(<LiveTvIcon color="secondary" />, 'Respondendo agora', 1, 'secondary.main')}
                {renderCard(grupos.liveQuestion, { variant: 'live' })}
              </>
            )}

            {/* Fila ranqueada por curtidas */}
            {grupos.fila.length > 0 && (
              <>
                {sectionHeader(<ThumbUpIcon color="primary" />, 'Fila de perguntas (mais curtidas no topo)', grupos.fila.length)}
                <Box sx={scrollAreaSx(grupos.fila.length, 4)}>
                  <Stack spacing={1.2}>
                    {grupos.fila.map((q, i) => renderCard(q, { rank: i + 1 }))}
                  </Stack>
                </Box>
              </>
            )}

            {/* Respondidas */}
            {grupos.respondidas.length > 0 && (
              <>
                {sectionHeader(<CheckCircleIcon color="success" />, 'Respondidas', grupos.respondidas.length, 'success.main')}
                <Box sx={scrollAreaSx(grupos.respondidas.length, 3)}>
                  <Stack spacing={1.2}>
                    {grupos.respondidas.map((q) => renderCard(q, { variant: 'answered' }))}
                  </Stack>
                </Box>
              </>
            )}

            {/* Arquivadas (recolhível) */}
            {grupos.arquivadas.length > 0 && (
              <>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setShowArchived((v) => !v)}
                  startIcon={<ArchiveIcon />}
                  endIcon={showArchived ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ mt: 3, color: 'text.secondary' }}
                >
                Arquivadas ({grupos.arquivadas.length})
                </Button>
                <Collapse in={showArchived}>
                  <Stack spacing={1.2} sx={{ mt: 1 }}>
                    {grupos.arquivadas.map((q) => renderCard(q, { variant: 'archived' }))}
                  </Stack>
                </Collapse>
              </>
            )}
          </>
        )}

        <LiveThemeDialog
          open={themeOpen}
          initialTheme={sala?.liveTheme}
          onClose={() => setThemeOpen(false)}
          onSave={(t) => salvarTema.mutate(t)}
          saving={salvarTema.isPending}
        />
      </PapperBlock>
    </div>
  );
};

export default LiveQaModerationPage;
