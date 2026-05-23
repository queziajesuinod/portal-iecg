import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Alert,
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
  Menu,
  MenuItem,
  Paper,
  Skeleton,
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
  Category,
  DeleteOutline,
  Email,
  EmojiEvents,
  EventNote,
  Favorite,
  Home,
  LocationOn,
  MoreVert,
  Phone,
  SwapHoriz
} from '@mui/icons-material';
import SectionCard from '../../../components/Jornada/SectionCard';
import JornadaTimeline from '../../../components/Jornada/JornadaTimeline';
import { formatDateInAppTimezone, formatDateTimeInAppTimezone } from '../../../utils/dateTime';
import { useConfirm } from '../../../utils/useConfirm';
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
import { buscarCelulasParaSelecao, transferirMembro } from '../../../api/celulaPresencaApi';

const ACTIVITY_CODE_LABELS = {
  TRANSFERENCIA_CELULA: 'Transferência de Célula'
};

const REDE_OPTIONS = [
  'RELEVANTE JUNIORS RAPAZES',
  'RELEVANTEEN RAPAZES',
  'RELEVANTEEN MOÇAS',
  'JUVENTUDE RELEVANTE RAPAZES',
  'MULHERES IECG',
  'IECG KIDS',
  'HOMENS IECG',
  'JUVENTUDE RELEVANTE MOÇAS',
  'RELEVANTE JUNIORS MOÇAS'
];

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

const formatDate = (v) => formatDateInAppTimezone(v, 'Nao informado');
const formatDateTime = (v) => formatDateTimeInAppTimezone(v, 'Nao informado');

const formatCpf = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, (_, a, b, c, d) => (d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`));
};

const getActivityObservation = (activity) => {
  const metadata = activity?.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';

  if (metadata.celulaOrigem && metadata.celulaDestino) {
    const liderOrigem = metadata.celulaOrigem.lider ? ` (Líder: ${metadata.celulaOrigem.lider})` : '';
    const liderDestino = metadata.celulaDestino.lider ? ` (Líder: ${metadata.celulaDestino.lider})` : '';
    const linha = `De: ${metadata.celulaOrigem.nome || '?'}${liderOrigem} → Para: ${metadata.celulaDestino.nome || '?'}${liderDestino}`;
    return metadata.motivo ? `${linha} | Motivo: ${metadata.motivo}` : linha;
  }

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
  const { confirm, ConfirmDialog } = useConfirm();
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
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [showAllVinculos, setShowAllVinculos] = useState(false);

  const runAndCloseActionMenu = (action) => () => {
    setActionMenuAnchor(null);
    action();
  };
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

  const [transferDialog, setTransferDialog] = useState({ open: false, vinculo: null });
  const [transferSearch, setTransferSearch] = useState('');
  const [transferRede, setTransferRede] = useState('');
  const [transferCelulas, setTransferCelulas] = useState([]);
  const [transferLoadingCelulas, setTransferLoadingCelulas] = useState(false);
  const [transferDestino, setTransferDestino] = useState(null);
  const [transferMotivo, setTransferMotivo] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

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
  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b?.activityDate || 0) - new Date(a?.activityDate || 0)),
    [activities]
  );
  const sortedMilestones = useMemo(
    () => [...milestones].sort((a, b) => {
      const aDate = new Date(a?.achievedDate || a?.createdAt || 0).getTime();
      const bDate = new Date(b?.achievedDate || b?.createdAt || 0).getTime();
      return aDate - bDate;
    }),
    [milestones]
  );
  const liderancaCelulas = Array.isArray(member?.liderancaCelulas) ? member.liderancaCelulas : [];
  const celulaVinculos = Array.isArray(member?.celulaVinculos) ? member.celulaVinculos : [];

  const PAPEL_LABEL = {
    lider: 'Líder', auxiliar: 'Auxiliar', anfitria: 'Anfitriã', membro: 'Membro'
  };

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

    const activityName = activityTypeNameByCode[activity.activityType] || ACTIVITY_CODE_LABELS[activity.activityType] || activity.activityType;
    const confirmed = await confirm({
      title: 'Excluir atividade', message: `Deseja excluir a atividade "${activityName}"?`, confirmText: 'Excluir', confirmColor: 'error', severity: 'error'
    });
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

  const openTransferDialog = (vinculo) => {
    setTransferDialog({ open: true, vinculo });
    setTransferSearch('');
    setTransferRede('');
    setTransferCelulas([]);
    setTransferDestino(null);
    setTransferMotivo('');
  };

  const closeTransferDialog = () => {
    setTransferDialog({ open: false, vinculo: null });
  };

  const handleBuscarCelulas = async () => {
    setTransferLoadingCelulas(true);
    try {
      const results = await buscarCelulasParaSelecao({ q: transferSearch, rede: transferRede });
      setTransferCelulas(results.filter(c => c.id !== transferDialog.vinculo?.celula?.id));
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setTransferLoadingCelulas(false);
    }
  };

  const handleConfirmarTransferencia = async () => {
    if (!transferDestino || !transferDialog.vinculo) return;
    setTransferSubmitting(true);
    try {
      await transferirMembro(
        transferDialog.vinculo.celula.id,
        member.id,
        { destinoCelulaId: transferDestino.id, motivo: transferMotivo || undefined }
      );
      setFeedback('Membro transferido com sucesso.');
      closeTransferDialog();
      await loadMember();
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setTransferSubmitting(false);
    }
  };

  const journeyDialogTitleByTab = ['Registrar atividade', 'Registrar marco', 'Atualizar jornada'];

  return (
    <>
      <PapperBlock title="Detalhes do Membro" desc="Informacoes completas do membro e jornada">
        <Helmet>
          <title>Detalhes do Membro</title>
        </Helmet>

        <Box display="flex" justifyContent="space-between" mb={2} gap={1} flexWrap="wrap" alignItems="center">
          <Button variant="outlined" onClick={() => history.push('/app/start/membros')}>
            Voltar
          </Button>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              onClick={() => openJourneyDialog(2)}
              disabled={!member}
            >
              Atualizar jornada
            </Button>
            <Tooltip title="Mais ações">
              <span>
                <IconButton
                  id="membro-actions-button"
                  onClick={(event) => setActionMenuAnchor(event.currentTarget)}
                  aria-label="Mais ações do membro"
                  aria-haspopup="menu"
                  aria-controls={actionMenuAnchor ? 'membro-actions-menu' : undefined}
                  aria-expanded={Boolean(actionMenuAnchor)}
                >
                  <MoreVert />
                </IconButton>
              </span>
            </Tooltip>
            <Menu
              id="membro-actions-menu"
              anchorEl={actionMenuAnchor}
              open={Boolean(actionMenuAnchor)}
              onClose={() => setActionMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              MenuListProps={{
                'aria-labelledby': 'membro-actions-button',
                dense: false
              }}
              disableScrollLock
              slotProps={{
                paper: {
                  elevation: 4,
                  sx: {
                    mt: 0.5,
                    minWidth: 260,
                    borderRadius: 2,
                    overflow: 'hidden'
                  }
                }
              }}
            >
              {member && (
                <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Ações para
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {member.fullName}
                  </Typography>
                </Box>
              )}
              {member && <Divider />}
              <MenuItem
                onClick={runAndCloseActionMenu(() => openJourneyDialog(0))}
                disabled={!member}
              >
                <ListItemIcon>
                  <EventNote fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Registrar atividade"
                  secondary="Adicionar nova atividade ao histórico"
                />
              </MenuItem>
              <MenuItem
                onClick={runAndCloseActionMenu(() => openJourneyDialog(1))}
                disabled={!member}
              >
                <ListItemIcon>
                  <EmojiEvents fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Registrar marco"
                  secondary="Conquista ou etapa importante"
                />
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem
                onClick={runAndCloseActionMenu(() => handleOpenActivityTypesDialog())}
              >
                <ListItemIcon>
                  <Category fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Gerenciar tipos"
                  secondary="Cadastros de atividades e marcos"
                />
              </MenuItem>
            </Menu>
          </Stack>
        </Box>

        {feedback && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFeedback('')}>
            {feedback}
          </Alert>
        )}

        {error && (
          <Alert severity="error" role="alert" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            </Grid>
          </Grid>
        )}

        {!loading && member && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <SectionCard
                divider={false}
                title={(
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={member.photoUrl || ''}
                      alt={member.fullName}
                      sx={{ width: 64, height: 64 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" component="span" sx={{ fontWeight: 700 }} noWrap>
                        {member.fullName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {member.email || 'Sem e-mail'}
                      </Typography>
                    </Box>
                  </Stack>
                )}
              >
                <Divider sx={{ mb: 2, opacity: 0.4 }} />
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
                        <ListItemText
                          primary="Endereco"
                          secondary={formatEndereco(member)}
                          secondaryTypographyProps={{ sx: { wordBreak: 'break-word', whiteSpace: 'normal' } }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><LocationOn /></ListItemIcon>
                        <ListItemText primary="Status" secondary={member.status || 'Nao informado'} />
                      </ListItem>
                    </List>
                  </Grid>
                </Grid>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <SectionCard title="Vínculo conjugal" icon={<Favorite color="primary" fontSize="small" />}>
                  {spouse ? (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        src={spouse.photoUrl || ''}
                        alt={spouse.fullName}
                        sx={{ width: 56, height: 56 }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                          {spouse.fullName}
                        </Typography>
                      </Box>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Nenhum cônjuge vinculado.</Typography>
                  )}
                </SectionCard>

                <SectionCard title="Resumo da jornada">
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" color="primary" label={`Estágio: ${member?.journey?.currentStage || 'NA'}`} />
                    <Chip size="small" color="default" label={`Saúde: ${member?.journey?.healthStatus || 'NA'}`} />
                    <Chip size="small" color="secondary" label={`Score: ${member?.journey?.engagementScore ?? 0}`} />
                    <Chip size="small" label={`Inativo: ${member?.journey?.daysInactive ?? 0} dias`} />
                    <Chip size="small" color={journeyIndicators.celula ? 'success' : 'default'} label={`Célula: ${journeyIndicators.celula ? 'Ativo' : 'Sem registro recente'}`} />
                    <Chip size="small" color={journeyIndicators.escola ? 'success' : 'default'} label={`Escolas: ${journeyIndicators.escola ? 'Ativo' : 'Sem registro recente'}`} />
                    <Chip size="small" color={journeyIndicators.eventos ? 'success' : 'default'} label={`Eventos: ${journeyIndicators.eventos ? 'Ativo' : 'Sem registro recente'}`} />
                  </Stack>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1.5 }}>
                    Última atividade: {formatDateTime(member?.journey?.lastActivityDate)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Prazos: Célula 7 dias | Eventos 120 dias | Escolas 120 dias (Fundamentos 270 dias).
                  </Typography>
                </SectionCard>

                {liderancaCelulas.length > 0 && (
                  <SectionCard title="Células que lidera">
                    <Stack spacing={1.5}>
                      {liderancaCelulas.map((celula) => (
                        <Box
                          key={celula.id}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: 1,
                            borderColor: 'divider',
                            bgcolor: 'action.hover'
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                              {celula.celula || 'Sem nome'}
                            </Typography>
                            <Chip size="small" color={celula.ativo ? 'success' : 'default'} label={celula.ativo ? 'Ativa' : 'Inativa'} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {celula.campusRef?.nome || 'Sem campus'} • {celula.bairro || 'Sem bairro'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {celula.dia || 'Dia não informado'} • {celula.horario || 'Horário não informado'}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </SectionCard>
                )}

                <SectionCard title="Células que participa">
                  {celulaVinculos.length ? (
                    <>
                      <Stack spacing={1.5}>
                        {(showAllVinculos ? celulaVinculos : celulaVinculos.slice(0, 3)).map((vinculo) => (
                          <Box
                            key={vinculo.id}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: 1,
                              borderColor: 'divider',
                              bgcolor: 'action.hover'
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                                  {vinculo.celula?.celula || 'Sem nome'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {vinculo.celula?.campusRef?.nome || 'Sem campus'} • {vinculo.celula?.bairro || 'Sem bairro'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {vinculo.celula?.dia || 'Dia não informado'} • {vinculo.celula?.horario || 'Horário não informado'}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Desde: {formatDate(vinculo.dataEntrada)}
                                </Typography>
                              </Box>
                              <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                                <Chip size="small" label={PAPEL_LABEL[vinculo.papel] || vinculo.papel} color="primary" variant="outlined" />
                                {vinculo.celula?.ativo === false && (
                                  <Chip size="small" label="Inativa" color="default" />
                                )}
                              </Stack>
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                              <Button
                                size="small"
                                variant="text"
                                disabled={vinculo.celula?.ativo === false}
                                onClick={() => history.push(`/app/celulas/${vinculo.celula?.id}/presenca`)}
                              >
                                Ver presença
                              </Button>
                              <Tooltip title={vinculo.celula?.ativo === false ? 'Célula inativa' : 'Transferir para outra célula'}>
                                <span>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<SwapHoriz fontSize="small" />}
                                    disabled={vinculo.celula?.ativo === false}
                                    onClick={() => openTransferDialog(vinculo)}
                                  >
                                    Transferir
                                  </Button>
                                </span>
                              </Tooltip>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                      {celulaVinculos.length > 3 && (
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{
                            mt: 1.5, pt: 1, borderTop: 1, borderColor: 'divider'
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {showAllVinculos
                              ? `Exibindo todas as ${celulaVinculos.length}`
                              : `Exibindo 3 de ${celulaVinculos.length}`}
                          </Typography>
                          <Button size="small" onClick={() => setShowAllVinculos((prev) => !prev)}>
                            {showAllVinculos ? 'Ver menos' : `Ver mais (${celulaVinculos.length - 3})`}
                          </Button>
                        </Stack>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Membro não vinculado a nenhuma célula.</Typography>
                  )}
                </SectionCard>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionCard title="Últimas atividades" sx={{ height: '100%' }}>
                <JornadaTimeline
                  emptyText="Nenhuma atividade registrada."
                  initialCount={6}
                  items={sortedActivities.map((activity) => ({
                    id: activity.id,
                    type: 'activity',
                    date: `${formatDateTime(activity.activityDate)} • ${activity.points || 0} pontos`,
                    title: activityTypeNameByCode[activity.activityType] || ACTIVITY_CODE_LABELS[activity.activityType] || activity.activityType,
                    description: getActivityObservation(activity) || null,
                    action: (
                      <Tooltip title="Excluir atividade">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteActivity(activity)}
                            disabled={Boolean(deletingActivityId)}
                            aria-label="Excluir atividade"
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )
                  }))}
                />
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionCard title="Marcos" sx={{ height: '100%' }}>
                <JornadaTimeline
                  emptyText="Nenhum marco registrado."
                  initialCount={6}
                  items={sortedMilestones.map((milestone) => ({
                    id: milestone.id,
                    type: 'milestone',
                    date: formatDate(milestone.achievedDate),
                    title: activityTypeNameByCode[milestone.milestoneType] || milestone.milestoneType,
                    description: milestone.description || null
                  }))}
                />
              </SectionCard>
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
        <Dialog fullWidth maxWidth="sm" open={transferDialog.open} onClose={closeTransferDialog}>
          <DialogTitle>Transferir membro de célula</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2, mt: 0.5 }}>
              <Typography variant="body2" color="textSecondary">
              Origem: <strong>{transferDialog.vinculo?.celula?.celula || '—'}</strong>
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="flex-end" flexWrap="wrap">
                <TextField
                  label="Rede"
                  select
                  size="small"
                  value={transferRede}
                  onChange={(e) => setTransferRede(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">Todas as redes</MenuItem>
                  {REDE_OPTIONS.map((r) => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Nome da célula"
                  value={transferSearch}
                  onChange={(e) => setTransferSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarCelulas()}
                  placeholder="Buscar por nome..."
                  size="small"
                  sx={{ flex: 1, minWidth: 160 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleBuscarCelulas}
                  disabled={transferLoadingCelulas}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {transferLoadingCelulas ? 'Buscando...' : 'Buscar'}
                </Button>
              </Stack>

              {transferCelulas.length > 0 && (
                <Box sx={{
                  maxHeight: 260, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1
                }}>
                  {transferCelulas.map((c) => {
                    const liderNome = c.liderMemberRef?.fullName || c.lider || null;
                    const selected = transferDestino?.id === c.id;
                    return (
                      <Box
                        key={c.id}
                        onClick={() => setTransferDestino(c)}
                        sx={{
                          p: 1.25,
                          cursor: 'pointer',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          bgcolor: selected ? 'action.selected' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' },
                          '&:last-child': { borderBottom: 'none' }
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="body2" fontWeight={selected ? 600 : 400}>
                              {c.celula}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {c.rede ? `${c.rede} · ` : ''}{c.campusRef?.nome || c.campus || ''}{c.bairro ? ` · ${c.bairro}` : ''}
                            </Typography>
                            {liderNome && (
                              <Typography variant="caption" display="block" color="textSecondary">
                              Líder: {liderNome}
                              </Typography>
                            )}
                          </Box>
                          {c.dia && (
                            <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                              {c.dia}{c.horario ? ` ${c.horario}` : ''}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {transferDestino && (
                <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="success.contrastText">
                  Destino selecionado: <strong>{transferDestino.celula}</strong>
                  </Typography>
                  {(transferDestino.liderMemberRef?.fullName || transferDestino.lider) && (
                    <Typography variant="caption" color="success.contrastText">
                    Líder: {transferDestino.liderMemberRef?.fullName || transferDestino.lider}
                    </Typography>
                  )}
                </Box>
              )}

              <TextField
                fullWidth
                label="Motivo da transferência (opcional)"
                value={transferMotivo}
                onChange={(e) => setTransferMotivo(e.target.value)}
                multiline
                minRows={2}
                size="small"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeTransferDialog}>Cancelar</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleConfirmarTransferencia}
              disabled={!transferDestino || transferSubmitting}
              startIcon={<SwapHoriz />}
            >
              {transferSubmitting ? 'Transferindo...' : 'Confirmar transferência'}
            </Button>
          </DialogActions>
        </Dialog>
      </PapperBlock>
      {ConfirmDialog}
    </>
  );
};

export default MembroDetailsPage;
