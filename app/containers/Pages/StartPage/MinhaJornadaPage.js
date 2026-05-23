import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  EventOutlined,
  FavoriteBorder,
  Groups2Outlined,
  HubOutlined,
  MilitaryTechOutlined,
  PersonOutline
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import dummyContents from 'dan-api/dummy/dummyContents';
import { formatDateInAppTimezone, formatDateTimeInAppTimezone } from '../../../utils/dateTime';
import {
  atualizarMeuPerfilMembro,
  buscarMeuMembro,
  listarPossiveisConjugesMeuMembro
} from '../../../api/membersApi';
import { estatisticasMembro } from '../../../api/celulaPresencaApi';
import { fetchGeocode } from '../../../utils/googleGeocode';
import SectionCard from '../../../components/Jornada/SectionCard';
import FormSection from '../../../components/Jornada/FormSection';
import MetricTile from '../../../components/Jornada/MetricTile';
import JornadaTimeline from '../../../components/Jornada/JornadaTimeline';

const GENDER_OPTIONS = ['MASCULINO', 'FEMININO'];
const MARITAL_STATUS_OPTIONS = [
  { value: 'SOLTEIRO', label: 'Solteiro(a)' },
  { value: 'CASADO', label: 'Casado(a)' },
  { value: 'DIVORCIADO', label: 'Divorciado(a)' },
  { value: 'VIUVO', label: 'Viuvo(a)' }
];

const STAGE_COPY = {
  VISITANTE: 'Visitante',
  FREQUENTADOR: 'Frequentador',
  CONGREGADO: 'Congregado',
  MEMBRO: 'Membro',
  DISCIPULO: 'Discípulo',
  LIDER_EM_FORMACAO: 'Lider em Formação',
  LIDER_ATIVO: 'Lider Ativo',
  MULTIPLICADOR: 'Multiplicador',
  MIA: 'MIA'
};

const initialForm = {
  fullName: '',
  cpf: '',
  email: '',
  phone: '',
  whatsapp: '',
  birthDate: '',
  gender: '',
  maritalStatus: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  country: 'Brasil',
  zipCode: '',
  spouseMemberId: '',
  baptismDate: '',
  baptismPlace: '',
  conversionDate: '',
  photoUrl: ''
};

const formatDate = (v) => formatDateInAppTimezone(v, 'Nao informado');
const formatDateTime = (v) => formatDateTimeInAppTimezone(v, 'Nao informado');

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

const formatCpf = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, (_, a, b, c, d) => (d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`));
};

const buildFormFromMember = (member) => ({
  fullName: member?.fullName || '',
  cpf: formatCpf(member?.cpf || ''),
  email: member?.email || '',
  phone: member?.phone || '',
  whatsapp: member?.whatsapp || '',
  birthDate: member?.birthDate || '',
  gender: member?.gender || '',
  maritalStatus: member?.maritalStatus || '',
  street: member?.street || '',
  number: member?.number || '',
  complement: member?.complement || '',
  neighborhood: member?.neighborhood || '',
  city: member?.city || '',
  state: member?.state || '',
  country: member?.country || 'Brasil',
  zipCode: member?.zipCode || '',
  spouseMemberId: member?.spouseMemberId || member?.spouse?.id || '',
  baptismDate: member?.baptismDate || '',
  baptismPlace: member?.baptismPlace || '',
  conversionDate: member?.conversionDate || '',
  photoUrl: member?.photoUrl || ''
});

const buildPayloadFromForm = (form) => ({
  fullName: form.fullName.trim(),
  cpf: form.cpf || null,
  email: form.email || null,
  phone: form.phone || null,
  whatsapp: form.whatsapp || null,
  birthDate: form.birthDate || null,
  gender: form.gender || null,
  maritalStatus: form.maritalStatus || null,
  street: form.street || null,
  number: form.number || null,
  complement: form.complement || null,
  neighborhood: form.neighborhood || null,
  city: form.city || null,
  state: form.state || null,
  country: form.country || 'Brasil',
  zipCode: form.zipCode || null,
  spouseMemberId: form.maritalStatus === 'CASADO' ? (form.spouseMemberId || null) : null,
  baptismDate: form.baptismDate || null,
  baptismPlace: form.baptismPlace || null,
  conversionDate: form.conversionDate || null,
  photoUrl: form.photoUrl || null
});

const MinhaJornadaPage = () => {
  const history = useHistory();
  const [member, setMember] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [celulaStats, setCelulaStats] = useState(null);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [spouseLoading, setSpouseLoading] = useState(false);
  const [spouseCandidates, setSpouseCandidates] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const milestones = useMemo(() => {
    const list = Array.isArray(member?.milestones) ? member.milestones : [];
    return [...list].sort((a, b) => new Date(a?.achievedDate || 0) - new Date(b?.achievedDate || 0));
  }, [member]);

  const activities = useMemo(() => {
    const list = Array.isArray(member?.activities) ? member.activities : [];
    return [...list].sort((a, b) => new Date(b?.activityDate || 0) - new Date(a?.activityDate || 0));
  }, [member]);
  const leaderCells = useMemo(() => {
    const list = Array.isArray(member?.liderancaCelulas) ? member.liderancaCelulas : [];
    return [...list];
  }, [member]);

  const isMarried = form.maritalStatus === 'CASADO';
  const selectedSpouse = useMemo(() => (
    spouseCandidates.find((candidate) => candidate.id === form.spouseMemberId)
    || (member?.spouse?.id ? {
      id: member.spouse.id,
      fullName: member.spouse.fullName,
      preferredName: member.spouse.preferredName,
      photoUrl: member.spouse.photoUrl,
      status: member.spouse.status,
      userId: member.spouse.userId,
      hasLinkedUser: Boolean(member.spouse.userId)
    } : null)
  ), [form.spouseMemberId, member?.spouse, spouseCandidates]);

  const isDirty = useMemo(() => {
    if (!member) return false;
    return JSON.stringify(form) !== JSON.stringify(buildFormFromMember(member));
  }, [form, member]);

  const milestoneItems = useMemo(() => milestones.map((m) => ({
    id: m.id,
    type: 'milestone',
    date: formatDate(m.achievedDate),
    title: m.displayLabel || m.milestoneType,
    description: m.description || null
  })), [milestones]);

  const activityItems = useMemo(() => activities.map((a) => ({
    id: a.id,
    type: 'activity',
    date: formatDateTime(a.activityDate),
    title: a.displayLabel || a.activityTypeRef?.name || a.activityType,
    description: getActivityObservation(a) || null
  })), [activities]);

  const loadSpouseCandidates = async () => {
    setSpouseLoading(true);
    try {
      const payload = await listarPossiveisConjugesMeuMembro();
      setSpouseCandidates(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setSpouseCandidates([]);
    } finally {
      setSpouseLoading(false);
    }
  };

  const loadMember = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await buscarMeuMembro();
      setMember(payload);
      setForm(buildFormFromMember(payload));
      await loadSpouseCandidates();
      if (payload?.id && payload?.celulaId) {
        estatisticasMembro(payload.celulaId, payload.id)
          .then(setCelulaStats)
          .catch(() => null);
      }
    } catch (err) {
      setError(err.message || 'Nao foi possivel carregar sua jornada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMember();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => {
      if (field === 'maritalStatus' && value !== 'CASADO') {
        return { ...prev, maritalStatus: value, spouseMemberId: '' };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleCompleteAddressFromCep = async () => {
    const cepDigits = String(form.zipCode || '').replace(/\D/g, '');
    if (cepDigits.length < 8) {
      setError('Informe um CEP valido para completar o endereco.');
      return;
    }

    setGeoLoading(true);
    setError('');
    setMessage('');
    try {
      const geocodeResult = await fetchGeocode(cepDigits);
      if (!geocodeResult) {
        setError('Nenhum endereco encontrado para o CEP informado.');
        return;
      }

      setForm((prev) => ({
        ...prev,
        zipCode: geocodeResult.cepEncontrado || prev.zipCode,
        neighborhood: geocodeResult.bairro || prev.neighborhood,
        city: geocodeResult.cidade || prev.city,
        state: (geocodeResult.uf || prev.state || '').toUpperCase(),
        street: geocodeResult.logradouro || prev.street,
        number: geocodeResult.numeroEncontrado || prev.number
      }));
      setMessage('Endereco preenchido automaticamente pelo CEP.');
    } catch (err) {
      setError(err.message || 'Nao foi possivel consultar o Google Maps para este CEP.');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      setError('Nome completo e obrigatorio.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await atualizarMeuPerfilMembro(buildPayloadFromForm(form));
      setMember(updated);
      setForm(buildFormFromMember(updated));
      setMessage('Seus dados foram atualizados.');

      try {
        const rawUser = localStorage.getItem('user');
        if (rawUser) {
          const user = JSON.parse(rawUser);
          const nextUser = {
            ...user,
            name: updated.fullName || user.name,
            avatar: updated.photoUrl || user.avatar
          };
          localStorage.setItem('user', JSON.stringify(nextUser));
          dummyContents.user = nextUser;
        }
      } catch (storageError) {
        console.warn('Nao foi possivel sincronizar o usuario salvo localmente.', storageError);
      }
    } catch (err) {
      setError(err.message || 'Nao foi possivel salvar seus dados.');
    } finally {
      setSaving(false);
    }
  };

  const renderLoadingSkeleton = () => (
    <Stack spacing={3}>
      <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Skeleton variant="rectangular" height={520} sx={{ borderRadius: 3 }} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );

  const renderHero = () => (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Avatar
            src={member.photoUrl || ''}
            alt={member.fullName}
            sx={{
              width: 72,
              height: 72,
              border: (theme) => `3px solid ${theme.palette.primary.light}`
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{ letterSpacing: '0.18em', opacity: 0.82, fontSize: '0.7rem' }}
            >
              Área do Membro
            </Typography>
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 700, lineHeight: 1.15, mb: 1.25 }}
            >
              {member.preferredName || member.fullName}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={STAGE_COPY[member?.journey?.currentStage] || member?.journey?.currentStage || 'Sem etapa'}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.22)',
                  color: 'inherit',
                  fontWeight: 600
                }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={member.status || 'Sem status'}
                sx={{
                  borderColor: 'rgba(255,255,255,0.6)',
                  color: 'inherit'
                }}
              />
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderFormCard = () => (
    <SectionCard
      icon={<PersonOutline color="primary" />}
      title="Meus Dados"
      action={(
        <Stack direction="row" spacing={1.25} alignItems="center">
          {isDirty && !saving && (
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label="Alterações não salvas"
            />
          )}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Stack>
      )}
    >
      <FormSection title="Identificação">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Nome completo"
              value={form.fullName}
              onChange={(event) => handleChange('fullName', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="CPF"
              value={form.cpf}
              onChange={(event) => handleChange('cpf', formatCpf(event.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Nascimento"
              InputLabelProps={{ shrink: true }}
              value={form.birthDate}
              onChange={(event) => handleChange('birthDate', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Gênero"
              value={form.gender}
              onChange={(event) => handleChange('gender', event.target.value)}
            >
              <MenuItem value="">Não informado</MenuItem>
              {GENDER_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </FormSection>

      <Divider sx={{ my: 3, opacity: 0.4 }} />

      <FormSection title="Contato">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="email"
              label="E-mail"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Telefone"
              value={form.phone}
              onChange={(event) => handleChange('phone', formatPhone(event.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(event) => handleChange('whatsapp', formatPhone(event.target.value))}
            />
          </Grid>
        </Grid>
      </FormSection>

      <Divider sx={{ my: 3, opacity: 0.4 }} />

      <FormSection
        title="Endereço"
        description="Informe o CEP e use o botão para completar automaticamente."
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="CEP"
              value={form.zipCode}
              onChange={(event) => handleChange('zipCode', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleCompleteAddressFromCep}
              disabled={geoLoading}
              sx={{ height: '100%' }}
            >
              {geoLoading ? 'Buscando CEP...' : 'Completar endereço'}
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Bairro"
              value={form.neighborhood}
              onChange={(event) => handleChange('neighborhood', event.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="UF"
              value={form.state}
              inputProps={{ maxLength: 2 }}
              onChange={(event) => handleChange('state', event.target.value.toUpperCase())}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              fullWidth
              label="Cidade"
              value={form.city}
              onChange={(event) => handleChange('city', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Logradouro"
              value={form.street}
              onChange={(event) => handleChange('street', event.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              label="Número"
              value={form.number}
              onChange={(event) => handleChange('number', event.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              fullWidth
              label="Complemento"
              value={form.complement}
              onChange={(event) => handleChange('complement', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="País"
              value={form.country}
              onChange={(event) => handleChange('country', event.target.value)}
            />
          </Grid>
        </Grid>
      </FormSection>

      <Divider sx={{ my: 3, opacity: 0.4 }} />

      <FormSection title="Família & Igreja">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Estado civil"
              value={form.maritalStatus}
              onChange={(event) => handleChange('maritalStatus', event.target.value)}
            >
              <MenuItem value="">Não informado</MenuItem>
              {MARITAL_STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          {isMarried && (
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                loading={spouseLoading}
                options={spouseCandidates}
                value={selectedSpouse}
                onChange={(_, value) => handleChange('spouseMemberId', value?.id || '')}
                getOptionLabel={(option) => option?.preferredName || option?.fullName || ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Vincular cônjuge membro"
                    helperText="Selecione o membro do cônjuge quando já estiver cadastrado."
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ py: 0.5 }}>
                      <Avatar src={option.photoUrl || ''} sx={{ width: 34, height: 34 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {option.preferredName || option.fullName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {option.fullName}
                          {option.hasLinkedUser ? ' • Usuário vinculado' : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}
              />
            </Grid>
          )}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Data de batismo"
              InputLabelProps={{ shrink: true }}
              value={form.baptismDate}
              onChange={(event) => handleChange('baptismDate', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Local de batismo"
              value={form.baptismPlace}
              onChange={(event) => handleChange('baptismPlace', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Data de conversão"
              InputLabelProps={{ shrink: true }}
              value={form.conversionDate}
              onChange={(event) => handleChange('conversionDate', event.target.value)}
            />
          </Grid>
        </Grid>
      </FormSection>
    </SectionCard>
  );

  const renderSpouseCard = () => (
    <SectionCard icon={<FavoriteBorder color="primary" />} title="Vínculo Conjugal">
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar src={member.spouse.photoUrl || ''} alt={member.spouse.fullName} sx={{ width: 52, height: 52 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }} noWrap>
            {member.spouse.preferredName || member.spouse.fullName}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {member.spouse.fullName}
          </Typography>
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" variant="outlined" label={member.spouse.status || 'Sem status'} />
            {member.spouse.userId && (
              <Chip size="small" color="success" label="Usuário vinculado" />
            )}
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  );

  const renderCelulaCard = () => (
    <SectionCard icon={<Groups2Outlined color="success" />} title="Minha Célula">
      {member.celula?.celula && (
        <Box mb={2}>
          <Typography variant="body1" fontWeight={700}>
            {member.celula.celula}
          </Typography>
          {member.celula.lider && (
            <Typography variant="body2" color="text.secondary">
              Líder: {member.celula.lider}
            </Typography>
          )}
        </Box>
      )}

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <MetricTile value={`${celulaStats.percentualPresenca}%`} label="Presença" color="success" />
        </Grid>
        <Grid item xs={4}>
          <MetricTile value={celulaStats.totalReunioes} label="Reuniões" color="success" />
        </Grid>
        <Grid item xs={4}>
          <MetricTile value={`${celulaStats.sequenciaAtual} sem.`} label="Sequência" color="success" />
        </Grid>
      </Grid>

      {(celulaStats.ultimas || []).length > 0 && (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Últimas reuniões
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {(celulaStats.ultimas || []).map((r, i) => (
              <Chip
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                size="small"
                label={formatDateInAppTimezone(r.data, '—').slice(0, 5)}
                color={r.presente === true ? 'success' : r.presente === false ? 'error' : 'default'}
                variant={r.presente === null ? 'outlined' : 'filled'}
              />
            ))}
          </Stack>
        </>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Discípulo desde {formatDateInAppTimezone(celulaStats.dataEntrada, '-')}
      </Typography>
    </SectionCard>
  );

  const renderLeaderCellsCard = () => (
    <SectionCard icon={<HubOutlined color="primary" />} title="Célula que lidero">
      <Stack spacing={1.5}>
        {leaderCells.map((cell) => (
          <Box
            key={cell.id}
            sx={{
              p: 2,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'action.hover'
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              spacing={2}
              mb={1}
              alignItems="center"
            >
              <Typography variant="body1" sx={{ fontWeight: 700 }} noWrap>
                {cell.celula || 'Célula sem nome'}
              </Typography>
              <Chip
                size="small"
                color={cell.ativo ? 'success' : 'default'}
                label={cell.ativo ? 'Ativa' : 'Inativa'}
              />
            </Stack>
            <Grid container spacing={1.25}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Rede</Typography>
                <Typography variant="body2">{cell.rede || 'Não informado'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Campus</Typography>
                <Typography variant="body2">{cell?.campusRef?.nome || 'Não informado'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Bairro</Typography>
                <Typography variant="body2">{cell.bairro || 'Não informado'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Dia e horário</Typography>
                <Typography variant="body2">
                  {[cell.dia, cell.horario].filter(Boolean).join(' - ') || 'Não informado'}
                </Typography>
              </Grid>
            </Grid>
            <Box mt={1.5}>
              <Tooltip title={!cell.ativo ? 'Célula inativa' : ''}>
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    disabled={!cell.ativo}
                    onClick={() => history.push(`/app/celulas/${cell.id}/presenca`)}
                  >
                    Registrar Presença
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );

  return (
    <PapperBlock title="Minha Jornada" desc="Atualize seus dados e acompanhe sua caminhada">
      <Helmet>
        <title>Minha Jornada</title>
      </Helmet>

      {loading && renderLoadingSkeleton()}

      {!loading && error && !member && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Nenhum perfil de membro vinculado
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Seu usuário está autenticado, mas ainda não há um cadastro de membro associado a ele.
          </Typography>
        </Alert>
      )}

      {!loading && member && (
        <Stack spacing={3}>
          {renderHero()}

          {message && (
            <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>
          )}
          {error && (
            <Alert severity="error" role="alert" onClose={() => setError('')}>{error}</Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              {renderFormCard()}
            </Grid>

            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                {member?.maritalStatus === 'CASADO' && member?.spouse && renderSpouseCard()}
                {celulaStats && member?.celulaId && renderCelulaCard()}
                {!!leaderCells.length && renderLeaderCellsCard()}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionCard
                icon={<MilitaryTechOutlined color="primary" />}
                title="Linha do Tempo"
                sx={{ height: '100%' }}
              >
                <JornadaTimeline items={milestoneItems} emptyText="Nenhum marco registrado ainda." />
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <SectionCard
                icon={<EventOutlined color="primary" />}
                title="Atividades Recentes"
                sx={{ height: '100%' }}
              >
                <JornadaTimeline items={activityItems} emptyText="Nenhuma atividade recente registrada." />
              </SectionCard>
            </Grid>
          </Grid>
        </Stack>
      )}
    </PapperBlock>
  );
};

export default MinhaJornadaPage;
