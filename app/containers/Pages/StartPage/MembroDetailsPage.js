import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { PapperBlock } from 'dan-components';
import {
  Badge,
  Cake,
  DeleteOutline,
  Email,
  Favorite,
  Home,
  LocationOn,
  Phone
} from '@mui/icons-material';
import {
  atualizarJornadaMembro,
  atualizarStatusTipoAtividadeMembro,
  atualizarTipoAtividadeMembro,
  buscarMembro,
  criarTipoAtividadeMembro,
  excluirAtividadeMembro,
  listarTiposAtividadeMembro,
  registrarAtividadeMembro,
  registrarMarcoMembro
} from '../../../api/membersApi';

const JOURNEY_STAGES = [
  'VISITANTE',
  'FREQUENTADOR',
  'CONGREGADO',
  'MEMBRO',
  'DISCIPULO',
  'LIDER_EM_FORMACAO',
  'LIDER_ATIVO',
  'MULTIPLICADOR',
  'MIA'
];

const LEGACY_MILESTONE_TYPES = [
  'PRIMEIRA_VISITA',
  'DECISAO_FE',
  'BATISMO',
  'MEMBRO_OFICIAL',
  'PRIMEIRA_CELULA',
  'LIDER_CELULA',
  'VOLUNTARIO_MINISTERIO',
  'LIDER_MINISTERIO',
  'CURSO_CONCLUIDO',
  'DIZIMISTA_FIEL',
  'CASAMENTO',
  'DEDICACAO_FILHO',
  'ANIVERSARIO_CONVERSAO'
];

const buildNowDateTimeInput = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const formatDate = (value) => {
  if (!value) return 'Nao informado';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const formatDateTime = (value) => {
  if (!value) return 'Nao informado';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('pt-BR');
};

const formatCpf = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, (_, a, b, c, d) => (d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`));
};

const getActivityObservation = (activity) => {
  const metadata = activity?.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';

  return String(
    metadata.observation
    || metadata.observacao
    || metadata.notes
    || metadata.note
    || metadata.description
    || ''
  ).trim();
};

const toDateInputValue = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }
  parsed.setMinutes(parsed.getMinutes() - parsed.getTimezoneOffset());
  return parsed.toISOString().slice(0, 10);
};

const formatEndereco = (member) => {
  if (!member) return 'Nao informado';
  const parts = [
    member.street,
    member.number ? `n ${member.number}` : null,
    member.neighborhood,
    member.zipCode ? `CEP ${member.zipCode}` : null
  ].filter(Boolean);
  return parts.length ? parts.join(' - ') : 'Nao informado';
};

const buildJourneyFormFromMember = (member) => {
  const journey = member?.journey || {};
  return {
    currentStage: journey.currentStage || member?.status || 'VISITANTE'
  };
};

const emptyActivityTypeForm = {
  code: '',
  name: '',
  category: '',
  defaultPoints: 0,
  sortOrder: 0,
  description: '',
  isActive: true
};

const MembroDetailsPage = () => {
  const [member, setMember] = useState(null);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activityTypesLoading, setActivityTypesLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [journeyDialogOpen, setJourneyDialogOpen] = useState(false);
  const [activityTypeDialogOpen, setActivityTypeDialogOpen] = useState(false);
  const [journeyTab, setJourneyTab] = useState(0);
  const [editingActivityType, setEditingActivityType] = useState(null);
  const [activityTypeForm, setActivityTypeForm] = useState(emptyActivityTypeForm);
  const [activityForm, setActivityForm] = useState({
    activityTypeId: '',
    activityDate: buildNowDateTimeInput(),
    points: '',
    notes: ''
  });
  const [milestoneForm, setMilestoneForm] = useState({
    milestoneType: LEGACY_MILESTONE_TYPES[0] || '',
    milestoneTypeId: '',
    achievedDate: toDateInputValue(new Date()),
    description: '',
    certificateUrl: ''
  });
  const [journeyForm, setJourneyForm] = useState(buildJourneyFormFromMember(null));

  const location = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');

  const activeActivityTypes = useMemo(
    () => activityTypes.filter((item) => item.isActive),
    [activityTypes]
  );

  const activityRegistrationTypes = useMemo(
    () => activeActivityTypes.filter((item) => String(item.category || '').trim().toUpperCase() !== 'MARCOS'),
    [activeActivityTypes]
  );

  const milestoneTypeOptions = useMemo(() => {
    const dynamicMilestones = activeActivityTypes
      .filter((item) => String(item.category || '').trim().toUpperCase() === 'MARCOS')
      .map((item) => ({
        id: item.id,
        code: item.code,
        label: `${item.name} (${item.code})`
      }));

    if (dynamicMilestones.length) {
      return dynamicMilestones;
    }

    return LEGACY_MILESTONE_TYPES.map((code) => ({
      id: '',
      code,
      label: code
    }));
  }, [activeActivityTypes]);

  const activityTypeNameByCode = useMemo(() => {
    const map = {};
    activityTypes.forEach((item) => {
      map[item.code] = item.name || item.code;
    });
    return map;
  }, [activityTypes]);

  const spouse = member?.spouse || null;
  const activities = Array.isArray(member?.activities) ? member.activities : [];
  const milestones = Array.isArray(member?.milestones) ? member.milestones : [];
  const journeyIndicators = member?.journey?.engagementIndicators || {};
  const visibleMilestones = useMemo(
    () => [...milestones]
      .sort((a, b) => {
        const aDate = new Date(a?.achievedDate || a?.createdAt || 0).getTime();
        const bDate = new Date(b?.achievedDate || b?.createdAt || 0).getTime();
        return aDate - bDate;
      })
      .slice(0, 8),
    [milestones]
  );
  const liderancaCelulas = Array.isArray(member?.liderancaCelulas) ? member.liderancaCelulas : [];

  const loadMember = async () => {
    if (!id) {
      setError('ID do membro nao informado.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await buscarMembro(id);
      setMember(payload);
      setJourneyForm(buildJourneyFormFromMember(payload));
    } catch (err) {
      setError(err.message || 'Erro ao carregar os detalhes do membro.');
    } finally {
      setLoading(false);
    }
  };

  const loadActivityTypes = async () => {
    setActivityTypesLoading(true);
    try {
      const payload = await listarTiposAtividadeMembro({ includeInactive: true });
      setActivityTypes(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setFeedback(err.message || 'Erro ao carregar tipos de atividade.');
    } finally {
      setActivityTypesLoading(false);
    }
  };

  useEffect(() => {
    loadMember();
    loadActivityTypes();
  }, [id]);

  useEffect(() => {
    if (!activityForm.activityTypeId && activityRegistrationTypes.length) {
      setActivityForm((prev) => ({ ...prev, activityTypeId: activityRegistrationTypes[0].id }));
    }
  }, [activityForm.activityTypeId, activityRegistrationTypes]);

  useEffect(() => {
    if (!milestoneTypeOptions.length) {
      return;
    }

    const hasCurrentOption = milestoneTypeOptions.some((option) => option.code === milestoneForm.milestoneType);
    if (!milestoneForm.milestoneType || !hasCurrentOption) {
      const firstOption = milestoneTypeOptions[0];
      setMilestoneForm((prev) => ({
        ...prev,
        milestoneType: firstOption.code,
        milestoneTypeId: firstOption.id || ''
      }));
    }
  }, [milestoneForm.milestoneType, milestoneTypeOptions]);

  const openJourneyDialog = (initialTab = 0) => {
    if (!member) return;
    setJourneyForm(buildJourneyFormFromMember(member));
    setActivityForm({
      activityTypeId: activityRegistrationTypes[0]?.id || '',
      activityDate: buildNowDateTimeInput(),
      points: '',
      notes: ''
    });
    const defaultMilestoneOption = milestoneTypeOptions[0];
    setMilestoneForm({
      milestoneType: defaultMilestoneOption?.code || LEGACY_MILESTONE_TYPES[0] || '',
      milestoneTypeId: defaultMilestoneOption?.id || '',
      achievedDate: toDateInputValue(new Date()),
      description: '',
      certificateUrl: ''
    });
    setJourneyTab(initialTab);
    setJourneyDialogOpen(true);
  };

  const handleSubmitActivity = async () => {
    if (!member?.id) return;
    if (!activityForm.activityTypeId) {
      setFeedback('Selecione um tipo de atividade.');
      return;
    }

    setSubmittingAction(true);
    setFeedback('');
    try {
      const payload = {
        activityTypeId: activityForm.activityTypeId,
        activityDate: activityForm.activityDate ? new Date(activityForm.activityDate).toISOString() : undefined,
        metadata: activityForm.notes ? { notes: activityForm.notes } : undefined
      };
      if (activityForm.points !== '' && activityForm.points !== null) {
        payload.points = Number(activityForm.points);
      }

      await registrarAtividadeMembro(member.id, payload);
      await loadMember();
      setActivityForm({
        activityTypeId: activityRegistrationTypes[0]?.id || '',
        activityDate: buildNowDateTimeInput(),
        points: '',
        notes: ''
      });
      setFeedback('Atividade registrada com sucesso.');
    } catch (err) {
      setFeedback(err.message || 'Erro ao registrar atividade.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeleteActivity = async (activity) => {
    if (!member?.id || !activity?.id) return;

    const activityName = activityTypeNameByCode[activity.activityType] || activity.activityType;
    const confirmed = window.confirm(`Deseja excluir a atividade "${activityName}"?`);
    if (!confirmed) return;

    setDeletingActivityId(activity.id);
    setFeedback('');
    try {
      await excluirAtividadeMembro(member.id, activity.id);
      await loadMember();
      setFeedback('Atividade excluida com sucesso.');
    } catch (err) {
      setFeedback(err.message || 'Erro ao excluir atividade.');
    } finally {
      setDeletingActivityId(null);
    }
  };

  const handleSubmitMilestone = async () => {
    if (!member?.id) return;
    if (!milestoneForm.milestoneType && !milestoneForm.milestoneTypeId) {
      setFeedback('Selecione o tipo de marco.');
      return;
    }
    if (!milestoneForm.achievedDate) {
      setFeedback('Informe a data do marco.');
      return;
    }

    setSubmittingAction(true);
    setFeedback('');
    try {
      const payload = {
        achievedDate: milestoneForm.achievedDate,
        description: milestoneForm.description || undefined,
        certificateUrl: milestoneForm.certificateUrl || undefined
      };
      if (milestoneForm.milestoneType) {
        payload.milestoneType = milestoneForm.milestoneType;
      }
      if (milestoneForm.milestoneTypeId) {
        payload.milestoneTypeId = milestoneForm.milestoneTypeId;
      }

      await registrarMarcoMembro(member.id, {
        ...payload
      });
      await loadMember();
      const defaultMilestoneOption = milestoneTypeOptions[0];
      setMilestoneForm({
        milestoneType: defaultMilestoneOption?.code || LEGACY_MILESTONE_TYPES[0] || '',
        milestoneTypeId: defaultMilestoneOption?.id || '',
        achievedDate: toDateInputValue(new Date()),
        description: '',
        certificateUrl: ''
      });
      setFeedback('Marco registrado com sucesso.');
    } catch (err) {
      setFeedback(err.message || 'Erro ao registrar marco.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSubmitJourney = async () => {
    if (!member?.id) return;
    setSubmittingAction(true);
    setFeedback('');
    try {
      const payload = {
        currentStage: journeyForm.currentStage
      };

      await atualizarJornadaMembro(member.id, payload);
      await loadMember();
      setFeedback('Jornada atualizada com sucesso. O score e indicadores sao calculados automaticamente.');
    } catch (err) {
      setFeedback(err.message || 'Erro ao atualizar jornada.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenActivityTypesDialog = () => {
    setEditingActivityType(null);
    setActivityTypeForm(emptyActivityTypeForm);
    setActivityTypeDialogOpen(true);
  };

  const handleEditActivityType = (activityType) => {
    setEditingActivityType(activityType);
    setActivityTypeForm({
      code: activityType.code || '',
      name: activityType.name || '',
      category: activityType.category || '',
      defaultPoints: activityType.defaultPoints ?? 0,
      sortOrder: activityType.sortOrder ?? 0,
      description: activityType.description || '',
      isActive: Boolean(activityType.isActive)
    });
  };

  const handleSaveActivityType = async () => {
    if (!activityTypeForm.code.trim()) {
      setFeedback('Codigo do tipo de atividade e obrigatorio.');
      return;
    }
    if (!activityTypeForm.name.trim()) {
      setFeedback('Nome do tipo de atividade e obrigatorio.');
      return;
    }

    setSubmittingAction(true);
    setFeedback('');
    try {
      const payload = {
        code: activityTypeForm.code.trim(),
        name: activityTypeForm.name.trim(),
        category: activityTypeForm.category ? activityTypeForm.category.trim().toUpperCase() : null,
        defaultPoints: Number(activityTypeForm.defaultPoints || 0),
        sortOrder: Number(activityTypeForm.sortOrder || 0),
        description: activityTypeForm.description || null,
        isActive: Boolean(activityTypeForm.isActive)
      };

      if (editingActivityType?.id) {
        await atualizarTipoAtividadeMembro(editingActivityType.id, payload);
        setFeedback('Tipo de atividade atualizado com sucesso.');
      } else {
        await criarTipoAtividadeMembro(payload);
        setFeedback('Tipo de atividade criado com sucesso.');
      }

      await loadActivityTypes();
      setEditingActivityType(null);
      setActivityTypeForm(emptyActivityTypeForm);
    } catch (err) {
      setFeedback(err.message || 'Erro ao salvar tipo de atividade.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleToggleActivityType = async (activityType) => {
    setSubmittingAction(true);
    setFeedback('');
    try {
      await atualizarStatusTipoAtividadeMembro(activityType.id, !activityType.isActive);
      await loadActivityTypes();
      setFeedback(activityType.isActive ? 'Tipo inativado.' : 'Tipo ativado.');
    } catch (err) {
      setFeedback(err.message || 'Erro ao atualizar status do tipo.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const journeyDialogTitleByTab = ['Registrar atividade', 'Registrar marco', 'Atualizar jornada'];

  return (
    <PapperBlock title="Detalhes do Membro" desc="Informacoes completas do membro e jornada">
      <Helmet>
        <title>Detalhes do Membro</title>
      </Helmet>

      <Box display="flex" justifyContent="space-between" mb={2} gap={1} flexWrap="wrap">
        <Button variant="outlined" onClick={() => history.push('/app/start/membros')}>
          Voltar
        </Button>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={handleOpenActivityTypesDialog}>
            Cadastros atividade/marco
          </Button>
          <Button variant="outlined" onClick={() => openJourneyDialog(0)} disabled={!member}>
            Registrar atividade
          </Button>
          <Button variant="outlined" onClick={() => openJourneyDialog(1)} disabled={!member}>
            Registrar marco
          </Button>
          <Button variant="contained" onClick={() => openJourneyDialog(2)} disabled={!member}>
            Atualizar jornada
          </Button>
        </Stack>
      </Box>

      {feedback && (
        <Box mb={2}>
          <Typography color="primary">{feedback}</Typography>
        </Box>
      )}

      {error && (
        <Box mb={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {loading && (
        <Box py={4} display="flex" justifyContent="center">
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && member && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Avatar
                  src={member.photoUrl || 'https://via.placeholder.com/80'}
                  alt={member.fullName}
                  sx={{ width: 80, height: 80 }}
                />
                <Box>
                  <Typography variant="h6">{member.fullName}</Typography>
                  <Typography variant="body2" color="textSecondary">{member.email || 'Sem e-mail'}</Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><Phone /></ListItemIcon>
                      <ListItemText primary="Telefone" secondary={member.phone || member.whatsapp || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Badge /></ListItemIcon>
                      <ListItemText primary="CPF" secondary={formatCpf(member.cpf) || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Cake /></ListItemIcon>
                      <ListItemText primary="Data de nascimento" secondary={formatDate(member.birthDate)} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Favorite /></ListItemIcon>
                      <ListItemText primary="Estado civil" secondary={member.maritalStatus || 'Nao informado'} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><Email /></ListItemIcon>
                      <ListItemText primary="E-mail" secondary={member.email || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Home /></ListItemIcon>
                      <ListItemText primary="Endereco" secondary={formatEndereco(member)} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LocationOn /></ListItemIcon>
                      <ListItemText primary="Status" secondary={member.status || 'Nao informado'} />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Vinculo conjugal</Typography>
              {spouse ? (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={spouse.photoUrl || 'https://via.placeholder.com/60'}
                      alt={spouse.fullName}
                      sx={{ width: 60, height: 60 }}
                    />
                    <Box>
                      <Typography variant="body1">{spouse.fullName}</Typography>
                    </Box>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">Nenhum conjuge vinculado.</Typography>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Resumo da jornada</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" color="primary" label={`Estagio: ${member?.journey?.currentStage || 'NA'}`} />
                <Chip size="small" color="default" label={`Saude: ${member?.journey?.healthStatus || 'NA'}`} />
                <Chip size="small" color="secondary" label={`Score: ${member?.journey?.engagementScore ?? 0}`} />
                <Chip size="small" label={`Inativo: ${member?.journey?.daysInactive ?? 0} dias`} />
                <Chip size="small" color={journeyIndicators.celula ? 'success' : 'default'} label={`Celula: ${journeyIndicators.celula ? 'Ativo' : 'Sem registro recente'}`} />
                <Chip size="small" color={journeyIndicators.escola ? 'success' : 'default'} label={`Escolas: ${journeyIndicators.escola ? 'Ativo' : 'Sem registro recente'}`} />
                <Chip size="small" color={journeyIndicators.eventos ? 'success' : 'default'} label={`Eventos: ${journeyIndicators.eventos ? 'Ativo' : 'Sem registro recente'}`} />
              </Stack>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Ultima atividade: {formatDateTime(member?.journey?.lastActivityDate)}
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                Prazos: Celula 7 dias | Eventos 120 dias | Escolas 120 dias (Fundamentos 270 dias).
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Celulas que lidera</Typography>
              {liderancaCelulas.length ? (
                <Stack spacing={1.5}>
                  {liderancaCelulas.map((celula) => (
                    <Box
                      key={celula.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.25
                      }}
                    >
                      <Typography variant="body1">{celula.celula || 'Sem nome'}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {celula.campusRef?.nome || 'Sem campus'} - {celula.bairro || 'Sem bairro'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {celula.dia || 'Dia nao informado'} - {celula.horario || 'Horario nao informado'} - {celula.ativo ? 'Ativa' : 'Inativa'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">Este membro nao lidera nenhuma celula.</Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Ultimas atividades</Typography>
              {!activities.length && <Typography color="textSecondary">Nenhuma atividade registrada.</Typography>}
              <Stack spacing={1}>
                {activities.slice(0, 8).map((activity) => (
                  <Box
                    key={activity.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Typography variant="body2">
                        {activityTypeNameByCode[activity.activityType] || activity.activityType}
                      </Typography>
                      <Tooltip title="Excluir atividade">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteActivity(activity)}
                            disabled={Boolean(deletingActivityId)}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                    <Typography variant="caption" color="textSecondary">
                      {formatDateTime(activity.activityDate)} - {activity.points || 0} pontos
                    </Typography>
                    {getActivityObservation(activity) && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        {getActivityObservation(activity)}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Marcos</Typography>
              {!milestones.length && <Typography color="textSecondary">Nenhum marco registrado.</Typography>}
              <Stack spacing={0}>
                {visibleMilestones.map((milestone, index) => {
                  const hasNext = index < visibleMilestones.length - 1;
                  return (
                    <Box
                      key={milestone.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '20px 1fr',
                        columnGap: 1.5
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            mt: 0.5
                          }}
                        />
                        {hasNext && (
                          <Box
                            sx={{
                              width: 2,
                              flex: 1,
                              minHeight: 24,
                              backgroundColor: 'divider',
                              my: 0.5
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ pb: hasNext ? 2 : 0 }}>
                        <Typography variant="caption" color="textSecondary">
                          {formatDate(milestone.achievedDate)}
                        </Typography>
                        <Typography variant="body2">
                          {activityTypeNameByCode[milestone.milestoneType] || milestone.milestoneType}
                        </Typography>
                        {milestone.description && (
                          <Typography variant="caption" display="block" color="textSecondary">
                            {milestone.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Dialog fullWidth maxWidth="md" open={journeyDialogOpen} onClose={() => setJourneyDialogOpen(false)}>
        <DialogTitle>{journeyDialogTitleByTab[journeyTab] || 'Jornada do membro'}</DialogTitle>
        <DialogContent>
          <Tabs value={journeyTab} onChange={(_, value) => setJourneyTab(value)} sx={{ mb: 2 }}>
            <Tab label="Atividade" />
            <Tab label="Marco" />
            <Tab label="Jornada" />
          </Tabs>

          {journeyTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Tipo de atividade"
                  value={activityForm.activityTypeId}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, activityTypeId: event.target.value }))}
                >
                  {!activityRegistrationTypes.length && (
                    <MenuItem value="" disabled>
                      Nenhum tipo de atividade ativo disponivel
                    </MenuItem>
                  )}
                  {activityRegistrationTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Data/hora"
                  InputLabelProps={{ shrink: true }}
                  value={activityForm.activityDate}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, activityDate: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Pontos (opcional)"
                  value={activityForm.points}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, points: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Observacao"
                  value={activityForm.notes}
                  onChange={(event) => setActivityForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </Grid>
            </Grid>
          )}

          {journeyTab === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <TextField
                  select
                  fullWidth
                  label="Tipo de marco"
                  value={milestoneForm.milestoneType}
                  onChange={(event) => {
                    const selected = milestoneTypeOptions.find((option) => option.code === event.target.value);
                    setMilestoneForm((prev) => ({
                      ...prev,
                      milestoneType: event.target.value,
                      milestoneTypeId: selected?.id || ''
                    }));
                  }}
                >
                  {!milestoneTypeOptions.length && (
                    <MenuItem value="" disabled>
                      Nenhum tipo de marco disponivel
                    </MenuItem>
                  )}
                  {milestoneTypeOptions.map((type) => (
                    <MenuItem key={`${type.id || 'legacy'}-${type.code}`} value={type.code}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data"
                  InputLabelProps={{ shrink: true }}
                  value={milestoneForm.achievedDate}
                  onChange={(event) => setMilestoneForm((prev) => ({ ...prev, achievedDate: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="URL do certificado"
                  value={milestoneForm.certificateUrl}
                  onChange={(event) => setMilestoneForm((prev) => ({ ...prev, certificateUrl: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Descricao"
                  value={milestoneForm.description}
                  onChange={(event) => setMilestoneForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </Grid>
            </Grid>
          )}

          {journeyTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Estagio"
                  value={journeyForm.currentStage}
                  onChange={(event) => setJourneyForm((prev) => ({ ...prev, currentStage: event.target.value }))}
                >
                  {JOURNEY_STAGES.map((stage) => (
                    <MenuItem key={stage} value={stage}>{stage}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>Engajamento calculado automaticamente</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" color="default" label={`Saude: ${member?.journey?.healthStatus || 'NA'}`} />
                    <Chip size="small" color="secondary" label={`Score: ${member?.journey?.engagementScore ?? 0}`} />
                    <Chip size="small" label={`Inativo: ${member?.journey?.daysInactive ?? 0} dias`} />
                    <Chip size="small" color={journeyIndicators.celula ? 'success' : 'default'} label={`Celula: ${journeyIndicators.celula ? 'Ativo' : 'Sem registro recente'}`} />
                    <Chip size="small" color={journeyIndicators.escola ? 'success' : 'default'} label={`Escolas: ${journeyIndicators.escola ? 'Ativo' : 'Sem registro recente'}`} />
                    <Chip size="small" color={journeyIndicators.eventos ? 'success' : 'default'} label={`Eventos: ${journeyIndicators.eventos ? 'Ativo' : 'Sem registro recente'}`} />
                  </Stack>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Ultima atividade: {formatDateTime(member?.journey?.lastActivityDate)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                    Prazos: Celula 7 dias | Eventos 120 dias | Escolas 120 dias (Fundamentos 270 dias).
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJourneyDialogOpen(false)}>Fechar</Button>
          {journeyTab === 0 && (
            <Button
              variant="contained"
              onClick={handleSubmitActivity}
              disabled={submittingAction || activityTypesLoading || !activityRegistrationTypes.length}
            >
              Salvar atividade
            </Button>
          )}
          {journeyTab === 1 && (
            <Button
              variant="contained"
              onClick={handleSubmitMilestone}
              disabled={submittingAction || !milestoneTypeOptions.length}
            >
              Salvar marco
            </Button>
          )}
          {journeyTab === 2 && (
            <Button variant="contained" onClick={handleSubmitJourney} disabled={submittingAction}>
              Salvar jornada
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="lg" open={activityTypeDialogOpen} onClose={() => setActivityTypeDialogOpen(false)}>
        <DialogTitle>Tipos de atividade e marco</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {editingActivityType ? 'Editar tipo' : 'Novo tipo'}
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Codigo"
                    value={activityTypeForm.code}
                    onChange={(event) => setActivityTypeForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                    helperText="Use letras, numeros e underscore"
                    disabled={Boolean(editingActivityType?.isSystem)}
                  />
                  <TextField
                    label="Nome"
                    value={activityTypeForm.name}
                    onChange={(event) => setActivityTypeForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <TextField
                    label="Categoria"
                    value={activityTypeForm.category}
                    onChange={(event) => setActivityTypeForm((prev) => ({ ...prev, category: event.target.value }))}
                    helperText="Use MARCOS para tipos de marco"
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Pontos padrao"
                      value={activityTypeForm.defaultPoints}
                      onChange={(event) => setActivityTypeForm((prev) => ({ ...prev, defaultPoints: event.target.value }))}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="Ordem"
                      value={activityTypeForm.sortOrder}
                      onChange={(event) => setActivityTypeForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                    />
                  </Stack>
                  <TextField
                    select
                    label="Status"
                    value={activityTypeForm.isActive ? 'ATIVO' : 'INATIVO'}
                    onChange={(event) => setActivityTypeForm((prev) => ({ ...prev, isActive: event.target.value === 'ATIVO' }))}
                  >
                    <MenuItem value="ATIVO">Ativo</MenuItem>
                    <MenuItem value="INATIVO">Inativo</MenuItem>
                  </TextField>
                  <TextField
                    label="Descricao"
                    multiline
                    minRows={3}
                    value={activityTypeForm.description}
                    onChange={(event) => setActivityTypeForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={handleSaveActivityType} disabled={submittingAction}>
                      Salvar
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditingActivityType(null);
                        setActivityTypeForm(emptyActivityTypeForm);
                      }}
                    >
                      Limpar
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Tipos cadastrados</Typography>
                {activityTypesLoading && (
                  <Box py={2} display="flex" justifyContent="center">
                    <CircularProgress size={24} />
                  </Box>
                )}
                {!activityTypesLoading && !activityTypes.length && (
                  <Typography color="textSecondary">Nenhum tipo de atividade cadastrado.</Typography>
                )}
                <Stack spacing={1}>
                  {activityTypes.map((type) => (
                    <Box
                      key={type.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.25
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Box>
                          <Typography variant="body2">{type.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {type.code} | {type.category || 'SEM_CATEGORIA'} | {type.defaultPoints || 0} pts
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={type.isActive ? 'Ativo' : 'Inativo'}
                            size="small"
                            color={type.isActive ? 'primary' : 'default'}
                          />
                          {type.isSystem && <Chip label="Sistema" size="small" variant="outlined" />}
                          <Button size="small" onClick={() => handleEditActivityType(type)}>
                            Editar
                          </Button>
                          <Button size="small" onClick={() => handleToggleActivityType(type)} disabled={submittingAction}>
                            {type.isActive ? 'Inativar' : 'Ativar'}
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityTypeDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </PapperBlock>
  );
};

export default MembroDetailsPage;
