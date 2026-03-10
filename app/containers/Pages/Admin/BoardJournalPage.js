import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import brand from 'dan-api/dummy/brand';
import {
  createBoardSubmission,
  getBoardJournal,
  getBoardRanking,
  getMyBoardStats,
  listBoardChallenges,
  listBoardJournals,
  listMyBoardBadges,
  listMyBoardSubmissions,
  requestBoardJournalAccess
} from '../../../api/boardJournalApi';

const COLORS = {
  cream: '#F6F0E3',
  paper: '#FFFDF8',
  gold: '#C6A15B',
  amber: '#9F6F18',
  navy: '#15304A',
  ink: '#314253',
  mist: '#E8E0D0',
  success: '#2F7A59',
  pending: '#B8860B',
  danger: '#AA4B4B'
};

const HERO_GRADIENT = 'linear-gradient(135deg, #F8FBFF 0%, #EEF4FB 100%)';

function formatDate(dateValue) {
  if (!dateValue) return 'Sem prazo';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Sem prazo';
  return parsed.toLocaleDateString('pt-BR');
}

function getStatusMeta(status) {
  if (status === 'approved') {
    return {
      label: 'Aprovado', color: 'success', tone: COLORS.success, icon: 'ion-checkmark-circled'
    };
  }
  if (status === 'rejected') {
    return {
      label: 'Rejeitado', color: 'error', tone: COLORS.danger, icon: 'ion-close-circled'
    };
  }
  return {
    label: 'Pendente', color: 'warning', tone: COLORS.pending, icon: 'ion-clock'
  };
}

function getChallengeTypeLabel(challengeType) {
  if (challengeType === 'question') return 'Pergunta';
  if (challengeType === 'file') return 'Arquivo';
  if (challengeType === 'form') return 'Formulario';
  if (challengeType === 'lesson') return 'Licao guiada';
  return 'Texto';
}

function sanitizeRichHtml(value) {
  const html = String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

  return { __html: html };
}

function BoardJournalPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [journals, setJournals] = useState([]);
  const [selectedJournalId, setSelectedJournalId] = useState('');
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [submissionTarget, setSubmissionTarget] = useState(null);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    responseText: '',
    responseFileUrl: '',
    responsePayload: {}
  });

  const title = `${brand.name} - Meu Diario de Bordo`;

  const myByChallenge = useMemo(() => mySubmissions.reduce((acc, item) => {
    if (!acc[item.challengeId]) {
      acc[item.challengeId] = item;
    }
    return acc;
  }, {}), [mySubmissions]);
  const visibleJournals = useMemo(
    () => journals.filter((item) => item.isActive !== false),
    [journals]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const journalRows = await listBoardJournals();
      setJournals(journalRows || []);

      const activeJournalRows = (journalRows || []).filter((item) => item.isActive !== false);
      const currentSelectionIsVisible = activeJournalRows.some((item) => item.id === selectedJournalId);
      const nextSelectedJournalId = (currentSelectionIsVisible ? selectedJournalId : '')
        || activeJournalRows.find((item) => item.membership?.status === 'approved')?.id
        || '';

      if (selectedJournalId !== nextSelectedJournalId) {
        setSelectedJournalId(nextSelectedJournalId);
      }

      if (!nextSelectedJournalId) {
        setSelectedJournal(null);
        setChallenges([]);
        setMySubmissions([]);
        setMyBadges([]);
        setRanking([]);
        setMyStats(null);
        return;
      }

      const [journal, challengeRows, submissionRows, badgeRows, rankingRows, stats] = await Promise.all([
        getBoardJournal(nextSelectedJournalId),
        listBoardChallenges({ journalId: nextSelectedJournalId }),
        listMyBoardSubmissions(nextSelectedJournalId),
        listMyBoardBadges(nextSelectedJournalId),
        getBoardRanking({ journalId: nextSelectedJournalId, limit: 20 }),
        getMyBoardStats(nextSelectedJournalId)
      ]);
      setSelectedJournal(journal || null);
      setChallenges(challengeRows || []);
      setMySubmissions(submissionRows || []);
      setMyBadges(badgeRows || []);
      setRanking(rankingRows || []);
      setMyStats(stats || null);
    } catch (error) {
      setNotification(error.message || 'Erro ao carregar Meu Diario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedJournalId]);

  const canRespondToChallenge = (challenge) => {
    const submission = myByChallenge[challenge.id];
    if (!challenge?.isActive) return false;
    if (challenge?.dueDate && new Date(challenge.dueDate).getTime() < Date.now()) return false;
    if (!submission) return true;
    if (submission.status === 'approved' || submission.status === 'pending') return false;
    if (submission.status === 'rejected') {
      return challenge.allowSecondChance === true && Number(submission.attemptNumber || 1) < 2;
    }
    return true;
  };

  const getChallengeActionLabel = (challenge) => {
    const submission = myByChallenge[challenge.id];
    if (submission?.status === 'rejected' && canRespondToChallenge(challenge)) {
      return challenge.challengeType === 'lesson' ? 'Refazer licao' : 'Responder novamente';
    }
    if (challenge.challengeType === 'lesson') return 'Iniciar licao';
    return 'Responder';
  };

  const openSubmission = (challenge) => {
    const payload = {};
    (challenge.formSchema || []).forEach((field) => {
      payload[field.name] = field.type === 'checkbox' ? false : '';
    });

    setSubmissionTarget(challenge);
    setSubmissionForm({
      responseText: myByChallenge[challenge.id]?.responseText || '',
      responseFileUrl: myByChallenge[challenge.id]?.responseFileUrl || '',
      responsePayload: myByChallenge[challenge.id]?.responsePayload || payload
    });
    setSubmissionOpen(true);
  };

  const sendSubmission = async () => {
    try {
      await createBoardSubmission({
        journalId: selectedJournalId,
        challengeId: submissionTarget.id,
        responseType: submissionTarget.challengeType,
        responseText: submissionForm.responseText,
        responseFileUrl: submissionForm.responseFileUrl,
        responsePayload: submissionForm.responsePayload
      });
      setNotification('Resposta enviada');
      setSubmissionOpen(false);
      loadData();
    } catch (error) {
      setNotification(error.message || 'Erro ao enviar resposta');
    }
  };

  const statusChip = (status) => {
    const meta = getStatusMeta(status);
    return (
      <Chip
        size="small"
        color={meta.color}
        label={meta.label}
        icon={<Box component="i" className={meta.icon} sx={{ fontSize: 14 }} />}
        sx={{
          fontWeight: 600,
          '& .MuiChip-icon': {
            color: 'inherit'
          }
        }}
      />
    );
  };

  const renderFormField = (field) => {
    const fieldValue = submissionForm.responsePayload?.[field.name] || '';
    if (field.type === 'checkbox') {
      return (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: '1px solid rgba(21,48,74,0.08)',
            backgroundColor: '#FFFDF8'
          }}
        >
          <FormControlLabel
            control={(
              <Checkbox
                checked={Boolean(submissionForm.responsePayload?.[field.name])}
                onChange={(e) => setSubmissionForm((prev) => ({
                  ...prev,
                  responsePayload: {
                    ...(prev.responsePayload || {}),
                    [field.name]: e.target.checked
                  }
                }))}
              />
            )}
            label={field.label}
          />
          <Typography variant="caption" color="textSecondary">
            {field.required ? 'Obrigatorio' : 'Opcional'}
          </Typography>
        </Box>
      );
    }

    if (field.type === 'select') {
      return (
        <FormControl fullWidth>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={fieldValue}
            label={field.label}
            onChange={(e) => setSubmissionForm((prev) => ({
              ...prev,
              responsePayload: {
                ...(prev.responsePayload || {}),
                [field.name]: e.target.value
              }
            }))}
          >
            {(field.options || []).map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        fullWidth
        label={field.label}
        multiline={field.type === 'textarea'}
        minRows={field.type === 'textarea' ? 4 : 1}
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
        value={fieldValue}
        onChange={(e) => setSubmissionForm((prev) => ({
          ...prev,
          responsePayload: {
            ...(prev.responsePayload || {}),
            [field.name]: e.target.value
          }
        }))}
        helperText={field.required ? 'Campo obrigatorio' : 'Opcional'}
      />
    );
  };

  const renderSubmissionFields = () => {
    if (!submissionTarget) return null;

    if (submissionTarget.challengeType === 'file') {
      return (
        <TextField
          fullWidth
          label="Link do arquivo"
          helperText="Cole aqui o link do arquivo ou documento enviado."
          value={submissionForm.responseFileUrl}
          onChange={(e) => setSubmissionForm((prev) => ({ ...prev, responseFileUrl: e.target.value }))}
        />
      );
    }

    if (submissionTarget.challengeType === 'question') {
      return (
        <FormControl fullWidth>
          <InputLabel>Resposta</InputLabel>
          <Select
            value={submissionForm.responseText}
            label="Resposta"
            onChange={(e) => setSubmissionForm((prev) => ({ ...prev, responseText: e.target.value }))}
          >
            {(submissionTarget.questionOptions || []).map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (submissionTarget.challengeType === 'form') {
      return (
        <Grid container spacing={2}>
          {(submissionTarget.formSchema || []).map((field) => (
            <Grid item xs={12} sm={field.type === 'textarea' ? 12 : 6} key={field.name}>
              {renderFormField(field)}
            </Grid>
          ))}
        </Grid>
      );
    }

    if (submissionTarget.challengeType === 'lesson') {
      return (
        <Stack spacing={2.5}>
          <Box
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              background: 'linear-gradient(180deg, #FFF8EA 0%, #FFFDF8 100%)',
              border: '1px solid rgba(198,161,91,0.22)',
              '& a': {
                color: COLORS.navy,
                fontWeight: 700
              }
            }}
            dangerouslySetInnerHTML={sanitizeRichHtml(submissionTarget.contentHtml)}
          />
          <Box>
            <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800, mb: 0.5 }}>
              Etapas finais
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Complete todas as etapas para concluir a licao.
            </Typography>
            <Grid container spacing={2}>
              {(submissionTarget.formSchema || []).map((field) => (
                <Grid item xs={12} sm={field.type === 'textarea' ? 12 : 6} key={field.name}>
                  {renderFormField(field)}
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      );
    }

    return (
      <TextField
        fullWidth
        multiline
        minRows={6}
        label="Resposta"
        helperText="Descreva sua resposta com clareza."
        value={submissionForm.responseText}
        onChange={(e) => setSubmissionForm((prev) => ({ ...prev, responseText: e.target.value }))}
      />
    );
  };

  const totalSubmissions = Number(myStats?.totalSubmissions || 0);
  const approvedSubmissions = Number(myStats?.approvedSubmissions || 0);
  const rejectedSubmissions = Number(myStats?.rejectedSubmissions || 0);
  const pendingSubmissions = Number(myStats?.pendingSubmissions || 0);
  const approvalRate = totalSubmissions > 0
    ? Math.round((approvedSubmissions / totalSubmissions) * 100)
    : 0;
  const actionableChallenges = challenges.filter((challenge) => canRespondToChallenge(challenge));
  const completedChallenges = challenges.filter((challenge) => {
    const submission = myByChallenge[challenge.id];
    if (!submission) return false;
    if (submission.status === 'rejected' && canRespondToChallenge(challenge)) {
      return false;
    }
    return true;
  });
  const availableChallenges = actionableChallenges.length;
  const activeChallenges = challenges.filter((challenge) => challenge?.isActive).length;
  const completedChallengesCount = completedChallenges.length;
  const recentSubmissions = mySubmissions.slice(0, 5);
  const topRanking = ranking.slice(0, 3);
  const myRankPosition = ranking.find((row) => row.id === myStats?.user?.id)?.position || null;
  const journalHeroBackground = selectedJournal?.coverImageUrl
    ? `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(244,248,252,0.94) 100%), center / cover no-repeat url(${selectedJournal.coverImageUrl})`
    : HERO_GRADIENT;
  const journalInstructions = selectedJournal?.instructions
    || 'Siga as instrucoes deste diario, envie respostas completas e acompanhe sua evolucao nas abas abaixo.';
  const journalDescription = selectedJournal?.description
    || 'Este diario organiza seus desafios, badges, posicao no ranking e indicadores pessoais.';

  const summaryCards = [
    {
      label: 'Pontuacao acumulada',
      value: myStats?.user?.points || 0,
      caption: `${approvedSubmissions} Aprovações confirmadas`,
      icon: 'ion-cash',
      accent: '#E7D2A4'
    },
    {
      label: 'Desafios em aberto',
      value: availableChallenges,
      caption: `${activeChallenges} desafios ativos no diario`,
      icon: 'ion-ios-flame-outline',
      accent: '#B4D8CC'
    },
    {
      label: 'Badges conquistados',
      value: myStats?.badges || 0,
      caption: `${myBadges.length} exibidos no diario`,
      icon: 'ion-ribbon-a',
      accent: '#D8C0DD'
    },
    {
      label: 'Taxa de aprovacao',
      value: `${approvalRate}%`,
      caption: `${pendingSubmissions} pendencias em analise`,
      icon: 'ion-ios-pulse',
      accent: '#C9D8E8'
    }
  ];

  return (
    <div>
      <Helmet><title>{title}</title></Helmet>

      <Card
        sx={{
          mb: 3,
          borderRadius: 4,
          background: 'linear-gradient(180deg, rgba(255,253,248,0.98) 0%, rgba(248,244,236,0.98) 100%)',
          border: '1px solid rgba(21,48,74,0.08)',
          boxShadow: '0 18px 36px rgba(21,48,74,0.06)'
        }}
      >
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
            <Box>
              <Typography variant="overline" sx={{ color: COLORS.amber, letterSpacing: '0.12em', fontWeight: 700 }}>
                SELEÇÃO DE DIÁRIO
              </Typography>
              <Typography variant="h5" sx={{ color: COLORS.navy, fontWeight: 800, mt: 0.25 }}>
                Diários disponiveis
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.ink, maxWidth: 620 }}>
                Escolha um diário aprovado para entrar ou solicite acesso. O layout abaixo ficou mais direto para trocar de diário sem quebrar o fluxo..
              </Typography>
            </Box>
            {selectedJournal && (
              <Chip
                label={`Diario atual: ${selectedJournal.name}`}
                sx={{
                  alignSelf: 'flex-start',
                  fontWeight: 700,
                  backgroundColor: '#EDF2F7',
                  color: COLORS.navy
                }}
              />
            )}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 2
            }}
          >
            {visibleJournals.map((journal) => {
              const membershipStatus = journal.membership?.status || 'none';
              const isApproved = membershipStatus === 'approved';
              const isPending = membershipStatus === 'pending';
              const isRejected = membershipStatus === 'rejected';
              const isSelected = selectedJournalId === journal.id;

              return (
                <Card
                  key={journal.id}
                  sx={{
                    minHeight: 176,
                    borderRadius: 3.5,
                    overflow: 'hidden',
                    border: isSelected ? `1px solid ${COLORS.navy}` : '1px solid rgba(21,48,74,0.08)',
                    boxShadow: isSelected ? '0 20px 36px rgba(21,48,74,0.14)' : '0 10px 24px rgba(21,48,74,0.06)',
                    backgroundColor: '#fff',
                    position: 'relative'
                  }}
                >
                  <Box
                    sx={{
                      height: 72,
                      background: journal.coverImageUrl
                        ? `linear-gradient(90deg, rgba(12,25,37,0.52) 0%, rgba(12,25,37,0.18) 100%), center / cover no-repeat url(${journal.coverImageUrl})`
                        : HERO_GRADIENT
                    }}
                  />
                  <CardContent sx={{ pt: 1.75 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                            {journal.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {journal.description || 'Sem descricao.'}
                          </Typography>
                        </Box>
                        {isSelected && (
                          <Chip
                            size="small"
                            label="Ativo"
                            sx={{ backgroundColor: COLORS.navy, color: '#fff', fontWeight: 700 }}
                          />
                        )}
                      </Stack>

                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Chip
                          size="small"
                          icon={<Box component="i" className="ion-person-stalker" sx={{ fontSize: 14 }} />}
                          label={`${journal.metrics?.approvedMembers || 0} membros`}
                          sx={{ fontWeight: 600 }}
                        />
                        {isApproved && <Chip size="small" color="success" label="Aprovado" />}
                        {isPending && <Chip size="small" color="warning" label="Pendente" />}
                        {isRejected && <Chip size="small" color="error" label="Rejeitado" />}
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                        <Typography variant="caption" sx={{ color: COLORS.ink }}>
                          {journal.metrics?.pendingRequests
                            ? `${journal.metrics.pendingRequests} solicitacao(oes) em analise`
                            : 'Entrada controlada pela gestão'}
                        </Typography>
                        {isApproved ? (
                          <Button
                            size="small"
                            variant={isSelected ? 'contained' : 'outlined'}
                            onClick={() => setSelectedJournalId(journal.id)}
                            sx={{
                              minWidth: 104,
                              borderRadius: 999,
                              fontWeight: 700
                            }}
                          >
                            {isSelected ? 'Em uso' : 'Abrir'}
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={isPending}
                            onClick={async () => {
                              try {
                                await requestBoardJournalAccess(journal.id);
                                setNotification('Solicitacao enviada');
                                loadData();
                              } catch (error) {
                                setNotification(error.message || 'Erro ao solicitar acesso');
                              }
                            }}
                            sx={{
                              minWidth: 132,
                              borderRadius: 999,
                              fontWeight: 700
                            }}
                          >
                            {isPending ? 'Solicitado' : 'Solicitar'}
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
            {!visibleJournals.length && (
              <Typography variant="body2">Nenhum diario ativo cadastrado.</Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {selectedJournalId && (
        <>

          <Box
            sx={{
              mb: 3,
              p: { xs: 2.5, md: 4 },
              borderRadius: 4,
              background: journalHeroBackground,
              color: COLORS.navy,
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(21,48,74,0.08)',
              boxShadow: '0 18px 36px rgba(21,48,74,0.06)'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: 240,
                height: 240,
                borderRadius: '50%',
                background: 'rgba(21,48,74,0.04)',
                top: -80,
                right: -60
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: 'rgba(21,48,74,0.05)',
                bottom: -60,
                left: -40
              }}
            />
            <Grid container spacing={3} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
              <Grid item xs={12} md={7}>
                <Stack spacing={1.5}>
                  <Chip
                    label="Diario selecionado"
                    sx={{
                      alignSelf: 'flex-start',
                      backgroundColor: '#EFF4F8',
                      color: COLORS.navy,
                      fontWeight: 700
                    }}
                  />
                  <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
                    {selectedJournal?.name || 'Meu Diario de Bordo'}
                  </Typography>
                  <Typography variant="body1" sx={{ maxWidth: 620, color: COLORS.ink }}>
                    {journalDescription}
                  </Typography>
      
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap flexWrap="wrap">
                    <Chip label={`${availableChallenges} desafios pendentes`} sx={{ backgroundColor: '#EFF4F8', color: COLORS.navy }} />
                    <Chip label={myRankPosition ? `Posicao atual #${myRankPosition}` : 'Ranking em andamento'} sx={{ backgroundColor: '#EFF4F8', color: COLORS.navy }} />
                    <Chip label={`${approvalRate}% de aprovacao`} sx={{ backgroundColor: '#EFF4F8', color: COLORS.navy }} />
                  </Stack>
                </Stack>
              </Grid>
              <Grid item xs={12} md={5}>
                <Card
                  sx={{
                    backgroundColor: COLORS.paper,
                    border: '1px solid rgba(21,48,74,0.08)',
                    color: COLORS.navy,
                    borderRadius: 3
                  }}
                >
                  <CardContent>
                    <Typography variant="overline" sx={{ color: COLORS.amber, letterSpacing: '0.12em' }}>
                      VISAO GERAL DO DIÁRIO
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#F5F8FC' }}>
                        <Typography variant="caption" color="textSecondary">Membros aprovados</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                          {selectedJournal?.metrics?.approvedMembers || 0}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {selectedJournal?.membership?.status === 'approved'
                            ? 'Seu acesso esta liberado neste diario.'
                            : 'Acesso depende de aprovacao da gestao.'}
                        </Typography>
                      </Box>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                          <Typography variant="body2">Aprovações</Typography>
                          <Typography variant="body2">{approvedSubmissions}/{totalSubmissions || 0}</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={approvalRate}
                          sx={{
                            height: 10,
                            borderRadius: 999,
                            backgroundColor: '#E5EDF5',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 999,
                              background: COLORS.navy
                            }
                          }}
                        />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#F5F8FC' }}>
                            <Typography variant="caption" color="textSecondary">Pendentes</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>{pendingSubmissions}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#F5F8FC' }}>
                            <Typography variant="caption" color="textSecondary">Pendentes</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>{availableChallenges}</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={8}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: COLORS.paper,
                  border: '1px solid rgba(21,48,74,0.08)',
                  boxShadow: '0 18px 35px rgba(21, 48, 74, 0.08)'
                }}
              >
                <CardContent>
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2.5,
                          display: 'grid',
                          placeItems: 'center',
                          backgroundColor: '#EFF4F8',
                          color: COLORS.navy
                        }}
                      >
                        <Box component="i" className="ion-ios-book-outline" sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                          Guia rápido do diário
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          O visual, as regras e o contexto abaixo pertencem ao diario selecionado.
                        </Typography>
                      </Box>
                    </Stack>
                    <Box
                      sx={{
                        color: COLORS.ink,
                        lineHeight: 1.8,
                        '& p': { my: 0 },
                        '& ul, & ol': { pl: 3, my: 0.75 },
                        '& a': { color: COLORS.navy, fontWeight: 700 }
                      }}
                      dangerouslySetInnerHTML={sanitizeRichHtml(journalInstructions)}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: COLORS.paper,
                  border: '1px solid rgba(21,48,74,0.08)',
                  boxShadow: '0 18px 35px rgba(21, 48, 74, 0.08)'
                }}
              >
                <CardContent>
                  <Typography variant="overline" sx={{ color: COLORS.amber, letterSpacing: '0.12em' }}>
                    CONTEXTO DO DIARIO
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ color: COLORS.ink }}>
                      {selectedJournal?.createdAt
                        ? `Criado em ${formatDate(selectedJournal.createdAt)}`
                        : 'Diario ativo para acompanhar seus desafios.'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: COLORS.ink }}>
                      {selectedJournal?.metrics?.pendingRequests
                        ? `${selectedJournal.metrics.pendingRequests} solicitacao(oes) aguardando aprovacao da gestao.`
                        : 'Sem solicitacoes pendentes no momento.'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: COLORS.ink }}>
                      {selectedJournal?.membership?.status === 'approved'
                        ? 'Seu perfil faz parte deste diario e pode responder desafios.'
                        : 'Seu acesso ainda nao esta aprovado para este diario.'}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {summaryCards.map((item) => (
              <Grid item xs={12} sm={6} lg={3} key={item.label}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    backgroundColor: COLORS.paper,
                    border: `1px solid ${COLORS.mist}`,
                    boxShadow: '0 18px 35px rgba(21, 48, 74, 0.08)'
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="body2" color="textSecondary">{item.label}</Typography>
                        <Typography variant="h4" sx={{ mt: 1, color: COLORS.navy, fontWeight: 800 }}>
                          {item.value}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.75, display: 'block' }}>
                          {item.caption}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          backgroundColor: item.accent,
                          color: COLORS.navy
                        }}
                      >
                        <Box component="i" className={item.icon} sx={{ fontSize: 22 }} />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <PapperBlock
            title={selectedJournal?.name || 'Meu Diario de Bordo'}
            icon="ion-ios-bookmarks-outline"
            desc={journalDescription}
            overflowX
          >
            <Box
              sx={{
                mb: 3,
                p: 0.75,
                borderRadius: 3,
                background: '#F4F7FB',
                border: '1px solid rgba(21,48,74,0.06)'
              }}
            >
              <Tabs
                value={tab}
                onChange={(_e, value) => setTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 52,
                  '& .MuiTabs-indicator': {
                    display: 'none'
                  },
                  '& .MuiTab-root': {
                    minHeight: 44,
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 700,
                    color: COLORS.ink
                  },
                  '& .Mui-selected': {
                    backgroundColor: COLORS.navy,
                    color: '#fff !important'
                  }
                }}
              >
                <Tab label="Meu Diario" />
                <Tab label="Meus Desafios" />
                <Tab label="Ranking" />
                <Tab label="Analytics" />
              </Tabs>
            </Box>

            {loading && (
              <Card sx={{ borderRadius: 3, backgroundColor: COLORS.paper }}>
                <CardContent>
                  <Typography>Carregando modulo...</Typography>
                </CardContent>
              </Card>
            )}

            {!loading && tab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                  <Stack spacing={2}>
                    {actionableChallenges.map((challenge) => {
                      const submission = myByChallenge[challenge.id];
                      const canRespond = canRespondToChallenge(challenge);
                      const statusMeta = submission ? getStatusMeta(submission.status) : null;

                      return (
                        <Card
                          key={challenge.id}
                          sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            backgroundColor: COLORS.paper,
                            border: '1px solid rgba(21, 48, 74, 0.08)',
                            boxShadow: '0 20px 40px rgba(21, 48, 74, 0.08)'
                          }}
                        >
                          <Box
                            sx={{
                              height: 10,
                              background: `linear-gradient(90deg, ${challenge.category?.color || COLORS.gold} 0%, ${COLORS.navy} 100%)`
                            }}
                          />
                          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                            <Stack spacing={2}>
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                justifyContent="space-between"
                                spacing={2}
                                alignItems={{ xs: 'flex-start', md: 'center' }}
                              >
                                <Box>
                                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                                    <Chip size="small" label={`${challenge.points} pts`} sx={{ fontWeight: 700 }} />
                                    <Chip
                                      size="small"
                                      label={challenge.category?.name || 'Sem categoria'}
                                      sx={{
                                        backgroundColor: `${challenge.category?.color || COLORS.gold}22`,
                                        color: challenge.category?.color || COLORS.amber,
                                        fontWeight: 700
                                      }}
                                    />
                                    <Chip size="small" variant="outlined" label={getChallengeTypeLabel(challenge.challengeType)} />
                                    {challenge.allowSecondChance && (
                                      <Chip
                                        size="small"
                                        label={`2a chance: ${challenge.secondChancePoints ?? 0} pts`}
                                        sx={{ backgroundColor: '#EFE5CE', color: COLORS.amber, fontWeight: 700 }}
                                      />
                                    )}
                                  </Stack>
                                  <Typography variant="h5" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                                    {challenge.title}
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1, maxWidth: 620 }}>
                                    {challenge.description || 'Sem descricao'}
                                  </Typography>
                                </Box>
                                <Button
                                  variant="contained"
                                  disabled={!canRespond}
                                  onClick={() => openSubmission(challenge)}
                                  sx={{
                                    minWidth: 180,
                                    borderRadius: 999,
                                    px: 3,
                                    py: 1.25,
                                    backgroundColor: canRespond ? COLORS.navy : undefined,
                                    boxShadow: canRespond ? '0 12px 24px rgba(21, 48, 74, 0.22)' : undefined
                                  }}
                                >
                                  {getChallengeActionLabel(challenge)}
                                </Button>
                              </Stack>

                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 3,
                                  background: 'linear-gradient(135deg, rgba(246,240,227,0.95) 0%, rgba(255,255,255,1) 100%)',
                                  border: '1px solid rgba(21,48,74,0.06)'
                                }}
                              >
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="textSecondary">Prazo</Typography>
                                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 700, color: COLORS.ink }}>
                                      {formatDate(challenge.dueDate)}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="textSecondary">Status atual</Typography>
                                    <Box sx={{ mt: 0.75 }}>
                                      {submission ? statusChip(submission.status) : (
                                        <Chip size="small" variant="outlined" label="Ainda nao respondido" />
                                      )}
                                    </Box>
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <Typography variant="caption" color="textSecondary">Tentativa</Typography>
                                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 700, color: COLORS.ink }}>
                                      {submission?.attemptNumber || 1}
                                    </Typography>
                                  </Grid>
                                </Grid>
                                {submission && (
                                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                                    {statusMeta && (
                                      <Typography variant="caption" sx={{ color: statusMeta.tone }}>
                                        {statusMeta.label}
                                      </Typography>
                                    )}
                                    {submission.pointsAwarded !== null && submission.pointsAwarded !== undefined && (
                                      <Typography variant="caption" color="textSecondary">
                                        {submission.pointsAwarded} pts concedidos
                                      </Typography>
                                    )}
                                    {submission.status === 'rejected' && !canRespond && (
                                      <Typography variant="caption" sx={{ color: COLORS.danger }}>
                                    Nova resposta bloqueada para este desafio.
                                      </Typography>
                                    )}
                                    {submission.status === 'rejected' && canRespond && (
                                      <Typography variant="caption" color="textSecondary">
                                    Segunda chance disponivel.
                                      </Typography>
                                    )}
                                  </Stack>
                                )}
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {actionableChallenges.length === 0 && (
                      <Card sx={{ borderRadius: 4, backgroundColor: COLORS.paper }}>
                        <CardContent>
                          <Typography>Nenhum desafio pendente e ativo no momento.</Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Stack spacing={2}>
                    <Card
                      sx={{
                        borderRadius: 4,
                        backgroundColor: COLORS.paper,
                        border: '1px solid rgba(21,48,74,0.08)'
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                          <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                        Meus badges
                          </Typography>
                          <Chip size="small" label={`${myBadges.length}`} sx={{ fontWeight: 700 }} />
                        </Stack>
                        <Stack spacing={1.5}>
                          {myBadges.map((item) => (
                            <Box
                              key={item.id}
                              sx={{
                                p: 1.5,
                                borderRadius: 2.5,
                                backgroundColor: '#fff',
                                border: '1px solid rgba(198,161,91,0.18)'
                              }}
                            >
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                <Box
                                  sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '50%',
                                    display: 'grid',
                                    placeItems: 'center',
                                    backgroundColor: '#EFF4F8',
                                    color: COLORS.navy
                                  }}
                                >
                                  <Box
                                    component="i"
                                    className={item.badge?.icon || 'ion-ribbon-a'}
                                    sx={{ fontSize: 20 }}
                                  />
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ color: COLORS.navy, fontWeight: 700 }}>
                                    {item.badge?.name}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {item.badge?.description || '-'}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          ))}
                          {myBadges.length === 0 && (
                            <Typography variant="body2" color="textSecondary">
                          Nenhum badge ainda.
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card
                      sx={{
                        borderRadius: 4,
                        backgroundColor: COLORS.paper,
                        border: '1px solid rgba(21,48,74,0.08)'
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800, mb: 2 }}>
                      Últimas respostas
                        </Typography>
                        <Stack spacing={1.5}>
                          {recentSubmissions.map((item, index) => (
                            <Box key={item.id}>
                              <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                                <Box>
                                  <Typography variant="subtitle2" sx={{ color: COLORS.ink, fontWeight: 700 }}>
                                    {item.challenge?.title}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {formatDate(item.submittedAt)}{item.pointsAwarded !== null && item.pointsAwarded !== undefined ? ` | ${item.pointsAwarded} pts` : ''}
                                  </Typography>
                                </Box>
                                {statusChip(item.status)}
                              </Stack>
                              {index < recentSubmissions.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                            </Box>
                          ))}
                          {recentSubmissions.length === 0 && (
                            <Typography variant="body2" color="textSecondary">
                          Nenhuma resposta enviada.
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card
                      sx={{
                        borderRadius: 4,
                        backgroundColor: COLORS.paper,
                        border: '1px solid rgba(21,48,74,0.08)'
                      }}
                    >
                      <CardContent>
                        <Typography variant="overline" sx={{ color: COLORS.amber, letterSpacing: '0.12em' }}>
                          INSTRUÇÕES
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1, fontWeight: 800, color: COLORS.navy }}>
                          Como participar deste diario
                        </Typography>
                        <Box
                          sx={{
                            mt: 1,
                            color: COLORS.ink,
                            lineHeight: 1.7,
                            '& p': { my: 0 },
                            '& ul, & ol': { pl: 3, my: 0.75 },
                            '& a': { color: COLORS.navy, fontWeight: 700 }
                          }}
                          dangerouslySetInnerHTML={sanitizeRichHtml(journalInstructions)}
                        />
                      </CardContent>
                    </Card>

                    <Card
                      sx={{
                        borderRadius: 4,
                        backgroundColor: COLORS.paper,
                        border: '1px solid rgba(21,48,74,0.08)'
                      }}
                    >
                      <CardContent>
                        <Typography variant="overline" sx={{ color: COLORS.amber, letterSpacing: '0.12em' }}>
                      LEITURA RÁPIDA
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1, fontWeight: 800, color: COLORS.navy }}>
                      Seu momento agora
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, color: COLORS.ink }}>
                          {pendingSubmissions > 0
                            ? `Voce tem ${pendingSubmissions} resposta(s) aguardando analise.`
                            : 'Não há pendências aguardando análise no momento'}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, color: COLORS.ink }}>
                          {availableChallenges > 0
                            ? `${availableChallenges} desafio(s) ainda podem ser respondidos.`
                            : 'Todos os desafios visíveis já foram respondidos ou estão bloqueados.'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                </Grid>
              </Grid>
            )}

            {!loading && tab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                  <Stack spacing={2}>
                    {completedChallenges.map((challenge) => {
                      const submission = myByChallenge[challenge.id];
                      const statusMeta = submission ? getStatusMeta(submission.status) : null;

                      return (
                        <Card
                          key={challenge.id}
                          sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            backgroundColor: COLORS.paper,
                            border: '1px solid rgba(21, 48, 74, 0.08)',
                            boxShadow: '0 14px 28px rgba(21, 48, 74, 0.06)'
                          }}
                        >
                          <Box
                            sx={{
                              height: 10,
                              background: `linear-gradient(90deg, ${challenge.category?.color || COLORS.gold} 0%, ${COLORS.navy} 100%)`
                            }}
                          />
                          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                            <Stack spacing={2}>
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                justifyContent="space-between"
                                spacing={2}
                                alignItems={{ xs: 'flex-start', md: 'center' }}
                              >
                                <Box>
                                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                                    <Chip size="small" label={`${challenge.points} pts`} sx={{ fontWeight: 700 }} />
                                    <Chip
                                      size="small"
                                      label={challenge.category?.name || 'Sem categoria'}
                                      sx={{
                                        backgroundColor: `${challenge.category?.color || COLORS.gold}22`,
                                        color: challenge.category?.color || COLORS.amber,
                                        fontWeight: 700
                                      }}
                                    />
                                    <Chip size="small" variant="outlined" label={getChallengeTypeLabel(challenge.challengeType)} />
                                    {statusMeta && statusChip(submission.status)}
                                  </Stack>
                                  <Typography variant="h5" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                                    {challenge.title}
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1, maxWidth: 620 }}>
                                    {challenge.description || 'Sem descricao'}
                                  </Typography>
                                </Box>
                              </Stack>

                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 3,
                                  background: 'linear-gradient(135deg, rgba(246,240,227,0.95) 0%, rgba(255,255,255,1) 100%)',
                                  border: '1px solid rgba(21,48,74,0.06)'
                                }}
                              >
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Prazo</Typography>
                                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 700, color: COLORS.ink }}>
                                      {formatDate(challenge.dueDate)}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Enviado em</Typography>
                                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 700, color: COLORS.ink }}>
                                      {formatDate(submission?.submittedAt)}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Tentativa</Typography>
                                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 700, color: COLORS.ink }}>
                                      {submission?.attemptNumber || 1}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={3}>
                                    <Typography variant="caption" color="textSecondary">Pontos concedidos</Typography>
                                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 700, color: COLORS.ink }}>
                                      {submission?.pointsAwarded ?? 0}
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {completedChallenges.length === 0 && (
                      <Card sx={{ borderRadius: 4, backgroundColor: COLORS.paper }}>
                        <CardContent>
                          <Typography>Voce ainda nao possui desafios concluidos ou enviados.</Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Stack spacing={2}>
                    <Card
                      sx={{
                        borderRadius: 4,
                        backgroundColor: COLORS.paper,
                        border: '1px solid rgba(21,48,74,0.08)'
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800, mb: 2 }}>
                          Resumo dos envios
                        </Typography>
                        <Stack spacing={1.5}>
                          <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: '#F5F8FC' }}>
                            <Typography variant="caption" color="textSecondary">Desafios ja feitos</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.navy }}>
                              {completedChallengesCount}
                            </Typography>
                          </Box>
                          <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: '#EEF7F1' }}>
                            <Typography variant="caption" color="textSecondary">Aprovados</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.success }}>
                              {approvedSubmissions}
                            </Typography>
                          </Box>
                          <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: '#FFF7E7' }}>
                            <Typography variant="caption" color="textSecondary">Pendentes</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.pending }}>
                              {pendingSubmissions}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card
                      sx={{
                        borderRadius: 4,
                        backgroundColor: COLORS.paper,
                        border: '1px solid rgba(21,48,74,0.08)'
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800, mb: 2 }}>
                          Últimas respostas
                        </Typography>
                        <Stack spacing={1.5}>
                          {recentSubmissions.map((item, index) => (
                            <Box key={item.id}>
                              <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                                <Box>
                                  <Typography variant="subtitle2" sx={{ color: COLORS.ink, fontWeight: 700 }}>
                                    {item.challenge?.title}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {formatDate(item.submittedAt)}{item.pointsAwarded !== null && item.pointsAwarded !== undefined ? ` | ${item.pointsAwarded} pts` : ''}
                                  </Typography>
                                </Box>
                                {statusChip(item.status)}
                              </Stack>
                              {index < recentSubmissions.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                            </Box>
                          ))}
                          {recentSubmissions.length === 0 && (
                            <Typography variant="body2" color="textSecondary">
                              Nenhuma resposta enviada.
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>
                </Grid>
              </Grid>
            )}

            {!loading && tab === 2 && (
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  {topRanking.map((row, index) => {
                    const podiumColors = ['#D4AF37', '#B7C1CC', '#C68B59'];
                    return (
                      <Grid item xs={12} md={4} key={row.id}>
                        <Card
                          sx={{
                            height: '100%',
                            borderRadius: 4,
                            background: `linear-gradient(180deg, ${podiumColors[index]}22 0%, #FFFDF8 100%)`,
                            border: `1px solid ${podiumColors[index]}55`,
                            boxShadow: '0 18px 36px rgba(21, 48, 74, 0.08)'
                          }}
                        >
                          <CardContent>
                            <Stack spacing={2} alignItems="flex-start">
                              <Chip
                                label={`${row.position}o lugar`}
                                sx={{
                                  backgroundColor: podiumColors[index],
                                  color: '#fff',
                                  fontWeight: 800
                                }}
                              />
                              <Box
                                sx={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: '50%',
                                  display: 'grid',
                                  placeItems: 'center',
                                  backgroundColor: podiumColors[index],
                                  color: '#fff',
                                  fontSize: 22,
                                  fontWeight: 800
                                }}
                              >
                                {row.name?.slice(0, 1)?.toUpperCase() || '?'}
                              </Box>
                              <Box>
                                <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                                  {row.name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  {row.points} pts | {row.badgeCount} badges
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                  {!topRanking.length && (
                    <Grid item xs={12}>
                      <Card sx={{ borderRadius: 4, backgroundColor: COLORS.paper }}>
                        <CardContent>
                          <Typography>Sem ranking.</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>

                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    <Card
                      sx={{
                        borderRadius: 4,
                        backgroundColor: COLORS.paper,
                        border: '1px solid rgba(21,48,74,0.08)'
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800, mb: 2 }}>
                      Ranking completo
                        </Typography>
                        <Stack spacing={1.25}>
                          {ranking.map((row) => {
                            const isCurrentUser = row.id === myStats?.user?.id;
                            return (
                              <Box
                                key={row.id}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2.5,
                                  backgroundColor: isCurrentUser ? '#EFF4F8' : '#fff',
                                  border: isCurrentUser ? `1px solid ${COLORS.navy}33` : '1px solid rgba(21,48,74,0.06)'
                                }}
                              >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box
                                      sx={{
                                        minWidth: 38,
                                        height: 38,
                                        borderRadius: '50%',
                                        display: 'grid',
                                        placeItems: 'center',
                                        backgroundColor: isCurrentUser ? COLORS.navy : COLORS.cream,
                                        color: isCurrentUser ? '#fff' : COLORS.navy,
                                        fontWeight: 800
                                      }}
                                    >
                                      {row.position}
                                    </Box>
                                    <Box>
                                      <Typography variant="subtitle2" sx={{ color: COLORS.ink, fontWeight: 700 }}>
                                        {row.name}
                                      </Typography>
                                      <Typography variant="caption" color="textSecondary">
                                        {row.badgeCount} badges | {row.approvedCount} aprovações
                                      </Typography>
                                    </Box>
                                  </Stack>
                                  <Typography variant="subtitle1" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                                    {row.points} pts
                                  </Typography>
                                </Stack>
                              </Box>
                            );
                          })}
                          {!ranking.length && <Typography variant="body2">Sem ranking.</Typography>}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} lg={4}>
                    <Card
                      sx={{
                        borderRadius: 4,
                        backgroundColor: '#F4F7FB',
                        border: '1px solid rgba(21,48,74,0.08)',
                        mb: 2
                      }}
                    >
                      <CardContent>
                        <Typography variant="overline" sx={{ color: COLORS.amber, letterSpacing: '0.12em' }}>
                      SUA POSICAO
                        </Typography>
                        <Typography variant="h2" sx={{ fontWeight: 800, mt: 1, color: COLORS.navy }}>
                          {myRankPosition || '--'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: COLORS.ink }}>
                          {myRankPosition ? 'Voce aparece na listagem atual.' : 'Voce ainda nao entrou na faixa listada.'}
                        </Typography>
                      </CardContent>
                    </Card>

                    <Card
                      sx={{
                        borderRadius: 4,
                        backgroundColor: COLORS.paper,
                        border: '1px solid rgba(21,48,74,0.08)'
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800, mb: 2 }}>
                      Destaques rapidos
                        </Typography>
                        <Stack spacing={1.5}>
                          <Box>
                            <Typography variant="caption" color="textSecondary">Pontuacao atual</Typography>
                            <Typography variant="h5" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                              {myStats?.user?.points || 0} pts
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="textSecondary">Melhor indicador no ranking</Typography>
                            <Typography variant="body2">
                              {ranking[0] ? `${ranking[0].name} lidera com ${ranking[0].points} pts.` : 'Ainda sem lider definido.'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="textSecondary">Volume de badges</Typography>
                            <Typography variant="body2">
                              {myStats?.badges || 0} badges ja conquistados no modulo.
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Stack>
            )}

            {!loading && tab === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12} lg={4}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      backgroundColor: COLORS.paper,
                      border: '1px solid rgba(21,48,74,0.08)'
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800, mb: 2 }}>
                    Meu desempenho
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                            <Typography variant="body2">Taxa de aprovacao</Typography>
                            <Typography variant="body2">{approvalRate}%</Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={approvalRate}
                            sx={{
                              height: 10,
                              borderRadius: 999,
                              backgroundColor: '#E5DED0',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 999,
                                backgroundColor: COLORS.success
                              }
                            }}
                          />
                        </Box>
                        <Grid container spacing={1.5}>
                          <Grid item xs={6}>
                            <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: '#F5EFE3' }}>
                              <Typography variant="caption" color="textSecondary">Total de respostas</Typography>
                              <Typography variant="h5" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                                {totalSubmissions}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: '#EFF4F8' }}>
                              <Typography variant="caption" color="textSecondary">Pontos</Typography>
                              <Typography variant="h5" sx={{ color: COLORS.navy, fontWeight: 800 }}>
                                {myStats?.user?.points || 0}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        <Divider />
                        <Typography variant="body2" color="textSecondary">
                          {approvedSubmissions} aprovadas, {rejectedSubmissions} rejeitadas e {pendingSubmissions} pendentes.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      backgroundColor: COLORS.paper,
                      border: '1px solid rgba(21,48,74,0.08)'
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800, mb: 2 }}>
                    Distribuicao de status
                      </Typography>
                      <Stack spacing={2}>
                        {[
                          { label: 'Aprovadas', value: approvedSubmissions, color: COLORS.success },
                          { label: 'Pendentes', value: pendingSubmissions, color: COLORS.pending },
                          { label: 'Rejeitadas', value: rejectedSubmissions, color: COLORS.danger }
                        ].map((item) => (
                          <Box key={item.label}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                              <Typography variant="body2">{item.label}</Typography>
                              <Typography variant="body2">{item.value}</Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={totalSubmissions > 0 ? (item.value / totalSubmissions) * 100 : 0}
                              sx={{
                                height: 10,
                                borderRadius: 999,
                                backgroundColor: '#EFE8DA',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 999,
                                  backgroundColor: item.color
                                }
                              }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      backgroundColor: COLORS.paper,
                      border: '1px solid rgba(21,48,74,0.08)'
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: COLORS.navy, fontWeight: 800, mb: 2 }}>
                    Ultimos desafios aprovados
                      </Typography>
                      <Stack spacing={1.5}>
                        {(myStats?.latestApprovedChallenges || []).map((item) => (
                          <Box
                            key={item.id}
                            sx={{
                              p: 1.5,
                              borderRadius: 2.5,
                              backgroundColor: '#fff',
                              border: '1px solid rgba(21,48,74,0.06)'
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ color: COLORS.ink, fontWeight: 700 }}>
                              {item.challenge?.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {(item.pointsAwarded ?? item.challenge?.points ?? 0)} pts
                            </Typography>
                          </Box>
                        ))}
                        {!(myStats?.latestApprovedChallenges || []).length && (
                          <Typography variant="body2">Nenhuma aprovacao ainda.</Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </PapperBlock>

          <Dialog open={submissionOpen} onClose={() => setSubmissionOpen(false)} fullWidth maxWidth="md">
            <DialogTitle sx={{ pb: 1 }}>
              {submissionTarget ? `Responder: ${submissionTarget.title}` : 'Responder'}
            </DialogTitle>
            <DialogContent>
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(246,240,227,0.95) 0%, rgba(255,255,255,1) 100%)',
                  border: '1px solid rgba(21,48,74,0.06)'
                }}
              >
                {selectedJournal?.instructions && (
                  <Box
                    sx={{
                      color: 'text.secondary',
                      mb: 2,
                      '& p': { my: 0 },
                      '& ul, & ol': { pl: 3, my: 0.75 },
                      '& a': { color: COLORS.navy, fontWeight: 700 }
                    }}
                    dangerouslySetInnerHTML={sanitizeRichHtml(selectedJournal.instructions)}
                  />
                )}
                {submissionTarget?.description && (
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {submissionTarget.description}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                  <Chip size="small" label={`${submissionTarget?.points || 0} pts`} />
                  {submissionTarget?.category?.name && <Chip size="small" label={submissionTarget.category.name} />}
                  <Chip size="small" variant="outlined" label={getChallengeTypeLabel(submissionTarget?.challengeType)} />
                </Stack>
                {renderSubmissionFields()}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSubmissionOpen(false)}>Cancelar</Button>
              <Button variant="contained" onClick={sendSubmission} sx={{ borderRadius: 999, px: 3 }}>
            Enviar
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

export default BoardJournalPage;
