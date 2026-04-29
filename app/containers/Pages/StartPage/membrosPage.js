import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Helmet } from 'react-helmet';
import {
  Box,
  Stack,
  Grid,
  Typography,
  Paper,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Avatar,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Autocomplete,
  Divider,
  DialogContentText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MergeIcon from '@mui/icons-material/MergeType';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Webcam from 'react-webcam';
import imageCompression from 'browser-image-compression';
import { PapperBlock, Notification } from 'dan-components';
import { useHistory } from 'react-router-dom';
import { fetchGeocode } from '../../../utils/googleGeocode';
import {
  listarMembros,
  listarMembrosDuplicados,
  criarMembro,
  atualizarMembro,
  deletarMembro,
  fundirMembrosDuplicados,
  desconsiderarMembrosDuplicados,
  buscarMembro
} from '../../../api/membersApi';

const ESCOLARIDADE_OPTIONS = [
  'ANALFABETO',
  'ENSINO FUNDAMENTAL INCOMPLETO',
  'ENSINO FUNDAMENTAL COMPLETO',
  'ENSINO MEDIO INCOMPLETO',
  'ENSINO MEDIO COMPLETO',
  'ENSINO SUPERIOR INCOMPLETO',
  'ENSINO SUPERIOR COMPLETO'
];

const ESCOLAS_CONCLUIDAS_OPTIONS = [
  'Escola de Fundamentos',
  'Lideranca Avancada 1',
  'Lideranca Avancada 2',
  'Lideranca Avancada 3'
];

const ESTADO_CIVIL_OPTIONS = ['Solteiro', 'Casado', 'Viuvo', 'Divorciado', 'Uniao Estavel'];
const GENDER_OPTIONS = ['MASCULINO', 'FEMININO'];
const STATUS_OPTIONS = ['VISITANTE', 'CONGREGADO', 'MEMBRO', 'INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'];

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  const { protocol, hostname, port } = window.location;
  if (port === '3005') {
    return `${protocol}//${hostname}:3005`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const initialFormState = {
  name: '',
  preferredName: '',
  email: '',
  telefone: '',
  whatsapp: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  country: 'Brasil',
  cep: '',
  cpf: '',
  rg: '',
  data_nascimento: '',
  gender: '',
  estado_civil: '',
  status: 'MEMBRO',
  statusReason: '',
  membershipDate: '',
  baptismDate: '',
  baptismPlace: '',
  conversionDate: '',
  campusId: '',
  spouseMemberId: '',
  photoUrl: '',
  escolaridade: '',
  nome_esposo: '',
  profissao: '',
  frequenta_celula: false,
  batizado: false,
  encontro: false,
  escolas: []
};

const maritalStatusToEnum = {
  Solteiro: 'SOLTEIRO',
  Casado: 'CASADO',
  Viuvo: 'VIUVO',
  Divorciado: 'DIVORCIADO',
  'Uniao Estavel': 'UNIAO_ESTAVEL'
};

const maritalEnumToLabel = {
  SOLTEIRO: 'Solteiro',
  CASADO: 'Casado',
  VIUVO: 'Viuvo',
  DIVORCIADO: 'Divorciado',
  UNIAO_ESTAVEL: 'Uniao Estavel'
};

const formatPhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 10) {
    return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, d1, d2, d3) => {
      if (!d2) return d1 ? `(${d1}` : '';
      if (!d3) return `(${d1}) ${d2}`;
      return `(${d1}) ${d2}-${d3}`;
    });
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
};

const formatCPF = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, (_, a, b, c, d) => (d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`));
};

const parseLegacyNotes = (notes) => {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && parsed.legacy && typeof parsed.legacy === 'object') {
      return parsed.legacy;
    }
    return {};
  } catch (error) {
    return {};
  }
};

const normalizeEscolas = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const toFormFromMember = (member) => {
  const legacy = parseLegacyNotes(member.notes);
  return {
    ...initialFormState,
    name: member.fullName || '',
    preferredName: member.preferredName || '',
    email: member.email || '',
    telefone: member.phone || '',
    whatsapp: member.whatsapp || '',
    endereco: member.street || '',
    numero: member.number || '',
    complemento: member.complement || '',
    bairro: member.neighborhood || '',
    cidade: member.city || '',
    estado: member.state || '',
    country: member.country || 'Brasil',
    cep: member.zipCode || '',
    cpf: formatCPF(member.cpf || ''),
    rg: member.rg || '',
    data_nascimento: member.birthDate || '',
    gender: member.gender || '',
    estado_civil: maritalEnumToLabel[member.maritalStatus] || '',
    status: member.status || 'MEMBRO',
    statusReason: member.statusReason || '',
    membershipDate: member.membershipDate || '',
    baptismDate: member.baptismDate || '',
    baptismPlace: member.baptismPlace || '',
    conversionDate: member.conversionDate || '',
    campusId: member.campusId || '',
    spouseMemberId: member.spouseMemberId || member.spouse?.id || '',
    photoUrl: member.photoUrl || '',
    escolaridade: legacy.escolaridade || '',
    nome_esposo: legacy.nome_esposo || '',
    profissao: legacy.profissao || '',
    frequenta_celula: Boolean(legacy.frequenta_celula),
    batizado: Boolean(legacy.batizado),
    encontro: Boolean(legacy.encontro),
    escolas: normalizeEscolas(legacy.escolas)
  };
};

const buildPayloadFromForm = (form) => ({
  fullName: form.name,
  preferredName: form.preferredName || null,
  cpf: form.cpf || null,
  rg: form.rg || null,
  birthDate: form.data_nascimento || null,
  gender: form.gender || null,
  maritalStatus: maritalStatusToEnum[form.estado_civil] || null,
  phone: form.telefone || null,
  whatsapp: form.whatsapp || null,
  email: form.email || null,
  zipCode: form.cep || null,
  street: form.endereco || null,
  number: form.numero || null,
  complement: form.complemento || null,
  neighborhood: form.bairro || null,
  city: form.cidade || null,
  state: form.estado || null,
  country: form.country || 'Brasil',
  membershipDate: form.membershipDate || null,
  baptismDate: form.baptismDate || null,
  baptismPlace: form.baptismPlace || null,
  conversionDate: form.conversionDate || null,
  status: form.status || 'MEMBRO',
  statusReason: form.statusReason || null,
  campusId: form.campusId || null,
  spouseMemberId: form.estado_civil === 'Casado' ? (form.spouseMemberId || null) : null,
  photoUrl: form.photoUrl || null,
  notes: JSON.stringify({
    legacy: {
      escolaridade: form.escolaridade || null,
      nome_esposo: form.estado_civil === 'Casado' ? (form.nome_esposo || null) : null,
      profissao: form.profissao || null,
      frequenta_celula: Boolean(form.frequenta_celula),
      batizado: Boolean(form.batizado),
      encontro: Boolean(form.encontro),
      escolas: form.escolas || []
    }
  })
});

const isValidCpf = (cpf = '') => {
  if (!cpf) return true;
  return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);
};

const isValidEmail = (email = '') => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const MembrosPage = () => {
  const history = useHistory();
  const [members, setMembers] = useState([]);
  const [duplicateSuggestions, setDuplicateSuggestions] = useState([]);
  const [campi, setCampi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const notify = (msg, type = 'success') => { setMessage(msg); setMessageType(type); };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [geoLoading, setGeoLoading] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState('');
  const [memberEdicao, setMemberEdicao] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [mergingPairKey, setMergingPairKey] = useState('');
  const [dismissingPairKey, setDismissingPairKey] = useState('');
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [pendingMergeSuggestion, setPendingMergeSuggestion] = useState(null);
  const webcamRef = useRef(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const limit = 5000;
      const firstResponse = await listarMembros({ page: 1, limit });
      const firstMembers = Array.isArray(firstResponse?.members) ? firstResponse.members : [];
      const totalPages = Math.max(Number(firstResponse?.totalPages) || 1, 1);

      if (totalPages <= 1) {
        setMembers(firstMembers);
        return;
      }

      const remainingResponses = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_item, index) => listarMembros({ page: index + 2, limit }))
      );

      const remainingMembers = remainingResponses.flatMap((response) => (
        Array.isArray(response?.members) ? response.members : []
      ));

      setMembers([...firstMembers, ...remainingMembers]);
    } catch (err) {
      notify(err.message || 'Erro ao carregar membros', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDuplicateSuggestions = async () => {
    setDuplicatesLoading(true);
    try {
      const payload = await listarMembrosDuplicados();
      setDuplicateSuggestions(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setDuplicateSuggestions([]);
      notify(err.message || 'Erro ao carregar duplicados', 'error');
    } finally {
      setDuplicatesLoading(false);
    }
  };

  const loadCampi = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = resolveApiUrl();
      const response = await fetch(`${API_URL}/start/campus`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erro ao carregar campus');
      const data = await response.json();
      setCampi(Array.isArray(data) ? data : []);
    } catch (error) {
      setCampi([]);
    }
  };

  useEffect(() => {
    loadMembers();
    loadDuplicateSuggestions();
    loadCampi();
  }, []);

  const sortedMembers = useMemo(() => (
    [...members].sort((a, b) => (a?.fullName || '').localeCompare((b?.fullName || '').trim(), 'pt-BR', { sensitivity: 'base' }))
  ), [members]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedMembers.filter((member) => {
      if (statusFilter && member.status !== statusFilter) {
        return false;
      }
      if (!query) return true;
      const name = (member.fullName || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [sortedMembers, search, statusFilter]);

  const spouseOptions = useMemo(() => (
    sortedMembers.filter((member) => member.id !== memberEdicao?.id)
  ), [sortedMembers, memberEdicao?.id]);

  const pagedMembers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredMembers.slice(start, start + rowsPerPage);
  }, [filteredMembers, page, rowsPerPage]);

  const resetForm = () => {
    setForm(initialFormState);
    setMemberEdicao(null);
    setShowWebcam(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (member) => {
    setMemberEdicao(member);
    setForm(toFormFromMember(member));
    setShowWebcam(false);
    setDialogOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      if (field === 'estado_civil' && value !== 'Casado') {
        return {
          ...prev,
          estado_civil: value,
          spouseMemberId: '',
          nome_esposo: ''
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const toWebpDataUrl = async (file) => {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.35,
      maxWidthOrHeight: 900,
      fileType: 'image/webp',
      useWebWorker: true
    });
    return imageCompression.getDataUrlFromFile(compressed);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await toWebpDataUrl(file);
      handleFormChange('photoUrl', dataUrl);
      notify('Foto convertida para WEBP');
    } catch (error) {
      notify('Erro ao processar a foto', 'error');
    }
  };

  const capturePhoto = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'webcam.webp', { type: 'image/webp' });
      const dataUrl = await toWebpDataUrl(file);
      handleFormChange('photoUrl', dataUrl);
      setShowWebcam(false);
      notify('Foto capturada em WEBP');
    } catch (error) {
      notify('Erro ao capturar foto', 'error');
    }
  };

  const handleSaveMember = async () => {
    if (!form.name.trim()) {
      notify('Nome e obrigatorio', 'warning');
      return;
    }
    if (!isValidCpf(form.cpf)) {
      notify('CPF invalido. Use 000.000.000-00', 'warning');
      return;
    }
    if (!isValidEmail(form.email)) {
      notify('E-mail invalido', 'warning');
      return;
    }
    if (form.estado && form.estado.length !== 2) {
      notify('UF deve ter 2 caracteres', 'warning');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const payload = buildPayloadFromForm(form);
      delete payload.statusReason;
      if (memberEdicao?.id) {
        await atualizarMembro(memberEdicao.id, payload);
        notify('Membro atualizado com sucesso');
      } else {
        await criarMembro(payload);
        notify('Membro cadastrado com sucesso');
      }
      setDialogOpen(false);
      resetForm();
      await loadMembers();
      await loadDuplicateSuggestions();
    } catch (error) {
      notify(error.message || 'Erro ao salvar membro', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (member) => {
    const ok = await confirm({ title: 'Excluir membro', message: `Tem certeza que deseja excluir o membro "${member.fullName}"?`, confirmText: 'Excluir', confirmColor: 'error', severity: 'error' });
    if (!ok) return;
    try {
      await deletarMembro(member.id);
      notify('Membro excluido com sucesso');
      await loadMembers();
      await loadDuplicateSuggestions();
    } catch (error) {
      notify(error.message || 'Erro ao excluir membro', 'error');
    }
  };

  const handleMergeDuplicates = (suggestion) => {
    setPendingMergeSuggestion(suggestion);
    setMergeConfirmOpen(true);
  };

  const handleMergeConfirm = async () => {
    const suggestion = pendingMergeSuggestion;
    if (!suggestion) return;
    setMergeConfirmOpen(false);
    setPendingMergeSuggestion(null);

    const pairKey = `${suggestion.keepMemberId}:${suggestion.removeMemberId}`;
    setMergingPairKey(pairKey);
    setMessage('');
    try {
      await fundirMembrosDuplicados(suggestion.keepMemberId, suggestion.removeMemberId);
      notify('Membros fundidos com sucesso');

      setDuplicateSuggestions((prev) => prev.filter((s) => `${s.keepMemberId}:${s.removeMemberId}` !== pairKey));

      const updatedKeep = await buscarMembro(suggestion.keepMemberId).catch(() => null);
      setMembers((prev) => {
        const sem = prev.filter((m) => m.id !== suggestion.removeMemberId);
        if (!updatedKeep) return sem;
        return sem.map((m) => (m.id === suggestion.keepMemberId ? updatedKeep : m));
      });
    } catch (error) {
      notify(error.message || 'Erro ao fundir membros duplicados', 'error');
    } finally {
      setMergingPairKey('');
    }
  };

  const handleDismissDuplicate = async (suggestion) => {
    const pairKey = `${suggestion.keepMemberId}:${suggestion.removeMemberId}`;
    setDismissingPairKey(pairKey);
    setMessage('');
    try {
      await desconsiderarMembrosDuplicados(suggestion.keepMemberId, suggestion.removeMemberId);
      setDuplicateSuggestions((prev) => prev.filter((item) => `${item.keepMemberId}:${item.removeMemberId}` !== pairKey));
      notify('Sugestao desconsiderada com sucesso');
    } catch (error) {
      notify(error.message || 'Erro ao desconsiderar sugestao', 'error');
    } finally {
      setDismissingPairKey('');
    }
  };

  const handleSpouseChange = (spouseId) => {
    const spouse = spouseOptions.find((item) => item.id === spouseId);
    setForm((prev) => ({
      ...prev,
      spouseMemberId: spouseId,
      nome_esposo: spouse ? spouse.fullName || '' : prev.nome_esposo
    }));
  };

  const handleOpenDetails = (member) => {
    history.push(`/app/start/membros/detalhes?id=${member.id}`);
  };

  const handleToggleMemberStatus = async (member, forcedActive) => {
    const activeNow = !['INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'].includes(member.status);
    const nextActive = typeof forcedActive === 'boolean' ? forcedActive : !activeNow;
    setUpdatingMemberId(member.id);
    setMessage('');
    try {
      await atualizarMembro(member.id, { status: nextActive ? 'MEMBRO' : 'INATIVO' });
      setMembers((prev) => prev.map((item) => (item.id === member.id ? { ...item, status: nextActive ? 'MEMBRO' : 'INATIVO' } : item)));
      notify(nextActive ? 'Membro ativado com sucesso' : 'Membro inativado com sucesso');
    } catch (error) {
      notify(error.message || 'Erro ao atualizar status do membro', 'error');
    } finally {
      setUpdatingMemberId('');
    }
  };

  const handleCompleteAddressFromCep = async () => {
    const rawCep = (form.cep || '').replace(/\D/g, '');
    if (rawCep.length < 8) {
      notify('Informe um CEP valido para completar o endereco', 'warning');
      return;
    }
    setGeoLoading(true);
    setMessage('');
    try {
      const geocodeResult = await fetchGeocode(rawCep);
      if (!geocodeResult) {
        notify('Nenhum resultado encontrado para o CEP informado', 'info');
        return;
      }
      setForm((prev) => ({
        ...prev,
        endereco: geocodeResult.logradouro || prev.endereco,
        numero: geocodeResult.numeroEncontrado || prev.numero,
        bairro: geocodeResult.bairro || prev.bairro,
        cep: geocodeResult.cepEncontrado || prev.cep,
        cidade: geocodeResult.cidade || prev.cidade,
        estado: (geocodeResult.uf || prev.estado || '').toUpperCase()
      }));
    } finally {
      setGeoLoading(false);
    }
  };

  return (
    <PapperBlock title="Membros" desc="Lista de membros">
      <Helmet>
        <title>Membros</title>
      </Helmet>

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_event, nextTab) => setActiveTab(nextTab)}
          variant="fullWidth"
        >
          <Tab label={`Lista de membros (${filteredMembers.length})`} />
          <Tab label={`Possiveis duplicados (${duplicateSuggestions.length})`} />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" mb={2} spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flex: 1 }}>
            <TextField fullWidth label="Pesquisar por nome ou e-mail" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            >
              <MenuItem value="">Todos</MenuItem>
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Cadastrar membro
          </Button>
        </Stack>
      )}

      {activeTab === 1 && (
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" mb={2} spacing={2}>
          <Box>
            <Typography variant="h6">Possiveis dados duplicados</Typography>
            <Typography variant="body2" color="textSecondary">
              Comparacao por nome parecido, e-mail, documento e telefone. A fusao mantem o cadastro mais antigo.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={loadDuplicateSuggestions} disabled={duplicatesLoading}>
            {duplicatesLoading ? 'Analisando duplicados...' : 'Atualizar duplicados'}
          </Button>
        </Stack>
      )}


      {activeTab === 1 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.5} mb={duplicateSuggestions.length ? 2 : 0}>
            <Typography variant="body2" color="textSecondary">
              Revise cada sugestao antes de fundir. Se desconsiderar, esse par nao volta a aparecer.
            </Typography>
            <Chip color={duplicateSuggestions.length ? 'warning' : 'success'} label={duplicateSuggestions.length ? `${duplicateSuggestions.length} sugestoes` : 'Nenhuma sugestao'} />
          </Stack>

          {duplicatesLoading && (
            <Box py={2} display="flex" justifyContent="center">
              <CircularProgress size={22} />
            </Box>
          )}

          {!duplicatesLoading && !duplicateSuggestions.length && (
            <Typography color="textSecondary">Nenhum possivel duplicado encontrado no momento.</Typography>
          )}

          {!duplicatesLoading && duplicateSuggestions.length > 0 && (
            <Stack spacing={1.5}>
              {duplicateSuggestions.map((suggestion) => {
                const pairKey = `${suggestion.keepMemberId}:${suggestion.removeMemberId}`;
                return (
                  <Paper key={pairKey} variant="outlined" sx={{ p: 1.5 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="textSecondary">Manter cadastro antigo</Typography>
                        <Stack direction="row" spacing={1.25} alignItems="center" mt={0.5}>
                          <Avatar src={suggestion.olderMember.photoUrl || ''} alt={suggestion.olderMember.fullName} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{suggestion.olderMember.fullName}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {suggestion.olderMember.email || suggestion.olderMember.phone || suggestion.olderMember.whatsapp || '-'}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="textSecondary">Excluir cadastro mais recente</Typography>
                        <Stack direction="row" spacing={1.25} alignItems="center" mt={0.5}>
                          <Avatar src={suggestion.newerMember.photoUrl || ''} alt={suggestion.newerMember.fullName} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{suggestion.newerMember.fullName}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {suggestion.newerMember.email || suggestion.newerMember.phone || suggestion.newerMember.whatsapp || '-'}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {suggestion.reasons.map((reason) => (
                            <Chip key={`${pairKey}-${reason.type}`} size="small" variant="outlined" label={reason.label} />
                          ))}
                        </Stack>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Stack spacing={1}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="warning"
                            onClick={() => handleMergeDuplicates(suggestion)}
                            disabled={mergingPairKey === pairKey || dismissingPairKey === pairKey}
                          >
                            {mergingPairKey === pairKey ? 'Fundindo...' : 'Fundir'}
                          </Button>
                          <Button
                            fullWidth
                            variant="text"
                            color="inherit"
                            onClick={() => handleDismissDuplicate(suggestion)}
                            disabled={dismissingPairKey === pairKey || mergingPairKey === pairKey}
                          >
                            {dismissingPairKey === pairKey ? 'Desconsiderando...' : 'Desconsiderar'}
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}

      {activeTab === 0 && <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Nome</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Telefone</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedMembers.map((member) => {
            const isActive = !['INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'].includes(member.status);
            return (
              <TableRow hover key={member.id}>
                <TableCell><Avatar src={member.photoUrl || 'https://via.placeholder.com/40'} alt={member.fullName} sx={{ width: 32, height: 32 }} /></TableCell>
                <TableCell>{member.fullName}</TableCell>
                <TableCell>{member.email || '-'}</TableCell>
                <TableCell>{member.phone || member.whatsapp || '-'}</TableCell>
                <TableCell><Chip label={member.status || '-'} color={isActive ? 'primary' : 'default'} size="small" /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControlLabel
                      sx={{ m: 0 }}
                      control={<Switch size="small" color="primary" checked={isActive} disabled={updatingMemberId === member.id} onChange={(event) => handleToggleMemberStatus(member, event.target.checked)} />}
                      label={updatingMemberId === member.id ? 'Salvando...' : isActive ? 'Ativo' : 'Inativo'}
                    />
                    <Tooltip title="Detalhes do membro"><IconButton size="small" onClick={() => handleOpenDetails(member)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Editar membro"><IconButton size="small" onClick={() => handleOpenEdit(member)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Excluir membro"><IconButton size="small" color="error" onClick={() => handleDeleteMember(member)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
          {!pagedMembers.length && !loading && <TableRow><TableCell colSpan={6}><Typography color="textSecondary">Nenhum membro encontrado.</Typography></TableCell></TableRow>}
          {loading && <TableRow><TableCell colSpan={6}><Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box></TableCell></TableRow>}
        </TableBody>
      </Table>}

      {activeTab === 0 && <TablePagination
        component="div"
        count={filteredMembers.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 20]}
      />}

      <Dialog fullWidth maxWidth="lg" open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{memberEdicao ? 'Editar membro' : 'Cadastrar membro'}</DialogTitle>
        <DialogContent>
          <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="textSecondary">Foto</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper'
                  }}
                >
                  {showWebcam ? (
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/webp"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      videoConstraints={{ facingMode: 'user' }}
                    />
                  ) : (
                    <Avatar src={form.photoUrl || ''} alt={form.name || 'Membro'} sx={{ width: 96, height: 96 }} />
                  )}
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" startIcon={<PhotoCameraIcon />} component="label">
                    Upload
                    <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                  </Button>
                  {!showWebcam && (
                    <Button variant="outlined" startIcon={<CameraAltIcon />} onClick={() => setShowWebcam(true)}>
                      Webcam
                    </Button>
                  )}
                  {showWebcam && (
                    <Button variant="contained" onClick={capturePhoto}>
                      Capturar
                    </Button>
                  )}
                  {showWebcam && (
                    <Button variant="text" onClick={() => setShowWebcam(false)}>
                      Fechar camera
                    </Button>
                  )}
                  {!!form.photoUrl && (
                    <Button variant="text" color="error" onClick={() => handleFormChange('photoUrl', '')}>
                      Remover
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="textSecondary">Dados pessoais</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}><TextField label="Nome" value={form.name} required onChange={(event) => handleFormChange('name', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Nome preferido" value={form.preferredName} onChange={(event) => handleFormChange('preferredName', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Email" type="email" value={form.email} onChange={(event) => handleFormChange('email', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Telefone" value={form.telefone} onChange={(event) => handleFormChange('telefone', formatPhone(event.target.value))} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="WhatsApp" value={form.whatsapp} onChange={(event) => handleFormChange('whatsapp', formatPhone(event.target.value))} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="CPF" value={form.cpf} onChange={(event) => handleFormChange('cpf', formatCPF(event.target.value))} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="RG" value={form.rg} onChange={(event) => handleFormChange('rg', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Data de nascimento" type="date" value={form.data_nascimento} onChange={(event) => handleFormChange('data_nascimento', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth /></Grid>

                <Grid item xs={12} md={4}>
                  <TextField select label="Genero" value={form.gender} onChange={(event) => handleFormChange('gender', event.target.value)} fullWidth>
                    <MenuItem value="">Nao informado</MenuItem>
                    {GENDER_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Estado civil" value={form.estado_civil} onChange={(event) => handleFormChange('estado_civil', event.target.value)} fullWidth>
                    {ESTADO_CIVIL_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Status" value={form.status} onChange={(event) => handleFormChange('status', event.target.value)} fullWidth>
                    {STATUS_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                  </TextField>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Campus"
                    value={form.campusId}
                    onChange={(event) => handleFormChange('campusId', event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Nenhum</MenuItem>
                    {campi.map((campus) => (
                      <MenuItem key={campus.id} value={campus.id}>{campus.nome}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {form.estado_civil === 'Casado' && (
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Conjuge (membro)"
                      value={form.spouseMemberId}
                      onChange={(event) => handleSpouseChange(event.target.value)}
                      fullWidth
                    >
                      <MenuItem value="">Nenhum</MenuItem>
                      {spouseOptions.map((option) => (
                        <MenuItem key={option.id} value={option.id}>{option.fullName}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                {form.estado_civil === 'Casado' && (
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Nome do conjuge"
                      value={form.nome_esposo}
                      onChange={(event) => handleFormChange('nome_esposo', event.target.value)}
                      helperText="Preencha manualmente quando o conjuge nao e membro"
                      fullWidth
                    />
                  </Grid>
                )}
                <Grid item xs={12} md={4}><TextField label="Profissao" value={form.profissao} onChange={(event) => handleFormChange('profissao', event.target.value)} fullWidth /></Grid>

                <Grid item xs={12} md={4}>
                  <TextField select label="Escolaridade" value={form.escolaridade} onChange={(event) => handleFormChange('escolaridade', event.target.value)} fullWidth>
                    <MenuItem value="">Nao informado</MenuItem>
                    {ESCOLARIDADE_OPTIONS.map((option) => (<MenuItem key={option} value={option}>{option}</MenuItem>))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Autocomplete
                    multiple
                    options={ESCOLAS_CONCLUIDAS_OPTIONS}
                    value={form.escolas}
                    onChange={(_, value) => handleFormChange('escolas', value)}
                    renderTags={(value, getTagProps) => value.map((option, index) => (
                      <Chip variant="outlined" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
                    ))}
                    renderInput={(params) => <TextField {...params} label="Escolas concluidas" placeholder="Selecionar" />}
                  />
                </Grid>

                <Grid item xs={12} md={4}><TextField label="Data de membresia" type="date" value={form.membershipDate} onChange={(event) => handleFormChange('membershipDate', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Data de batismo" type="date" value={form.baptismDate} onChange={(event) => handleFormChange('baptismDate', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Local de batismo" value={form.baptismPlace} onChange={(event) => handleFormChange('baptismPlace', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Data de conversao" type="date" value={form.conversionDate} onChange={(event) => handleFormChange('conversionDate', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth /></Grid>

                <Grid item xs={12} md={4}><TextField select label="Frequenta celula" value={form.frequenta_celula ? 'true' : 'false'} onChange={(event) => handleFormChange('frequenta_celula', event.target.value === 'true')} fullWidth><MenuItem value="true">Sim</MenuItem><MenuItem value="false">Nao</MenuItem></TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Batizado" value={form.batizado ? 'true' : 'false'} onChange={(event) => handleFormChange('batizado', event.target.value === 'true')} fullWidth><MenuItem value="true">Sim</MenuItem><MenuItem value="false">Nao</MenuItem></TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Encontro" value={form.encontro ? 'true' : 'false'} onChange={(event) => handleFormChange('encontro', event.target.value === 'true')} fullWidth><MenuItem value="true">Sim</MenuItem><MenuItem value="false">Nao</MenuItem></TextField></Grid>
              </Grid>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="textSecondary">Endereco</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}><TextField label="CEP" value={form.cep} onChange={(event) => handleFormChange('cep', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={3}>
                  <Button variant="outlined" color="primary" onClick={handleCompleteAddressFromCep} disabled={geoLoading} fullWidth sx={{ height: '100%' }}>
                    {geoLoading ? 'Buscando CEP...' : 'Completar pelo CEP'}
                  </Button>
                </Grid>
                <Grid item xs={12} md={3}><TextField label="Bairro" value={form.bairro} onChange={(event) => handleFormChange('bairro', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label="Numero" value={form.numero} onChange={(event) => handleFormChange('numero', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField label="Endereco" value={form.endereco} onChange={(event) => handleFormChange('endereco', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label="Complemento" value={form.complemento} onChange={(event) => handleFormChange('complemento', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label="Cidade" value={form.cidade} onChange={(event) => handleFormChange('cidade', event.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={2}><TextField label="UF" value={form.estado} onChange={(event) => handleFormChange('estado', event.target.value.toUpperCase())} inputProps={{ maxLength: 2 }} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Pais" value={form.country} onChange={(event) => handleFormChange('country', event.target.value)} fullWidth /></Grid>
              </Grid>
            </Stack>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleSaveMember} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification
        open={!!message}
        message={message || ''}
        type={messageType}
        close={() => setMessage('')}
      />

      {/* Dialog de confirmação de fusão */}
      <Dialog
        open={mergeConfirmOpen}
        onClose={() => { setMergeConfirmOpen(false); setPendingMergeSuggestion(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MergeIcon color="warning" />
          Confirmar fusão de cadastros
        </DialogTitle>
        <DialogContent>
          {pendingMergeSuggestion && (
            <Stack spacing={2}>
              <DialogContentText variant="body2">
                O cadastro mais recente será excluído e seus dados serão incorporados ao mais antigo.
              </DialogContentText>

              <Stack direction="row" spacing={1.5} alignItems="center">
                {/* Membro mantido */}
                <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderColor: 'success.main' }}>
                  <Typography variant="caption" color="success.main" fontWeight={600}>MANTER</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                    <Avatar src={pendingMergeSuggestion.olderMember.photoUrl || ''} sx={{ width: 36, height: 36 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{pendingMergeSuggestion.olderMember.fullName}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {pendingMergeSuggestion.olderMember.email || pendingMergeSuggestion.olderMember.phone || '-'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                <ArrowForwardIcon color="action" />

                {/* Membro removido */}
                <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderColor: 'error.main' }}>
                  <Typography variant="caption" color="error.main" fontWeight={600}>EXCLUIR</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                    <Avatar src={pendingMergeSuggestion.newerMember.photoUrl || ''} sx={{ width: 36, height: 36 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{pendingMergeSuggestion.newerMember.fullName}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {pendingMergeSuggestion.newerMember.email || pendingMergeSuggestion.newerMember.phone || '-'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Stack>

              {pendingMergeSuggestion.reasons?.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="textSecondary" mb={0.5} display="block">Motivos da sugestão</Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {pendingMergeSuggestion.reasons.map((r) => (
                        <Chip key={r.type} size="small" label={r.label} variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setMergeConfirmOpen(false); setPendingMergeSuggestion(null); }}>
            Cancelar
          </Button>
          <Button variant="contained" color="warning" startIcon={<MergeIcon />} onClick={handleMergeConfirm}>
            Confirmar fusão
          </Button>
        </DialogActions>
      </Dialog>
    </PapperBlock>
  );
};

export default MembrosPage;
