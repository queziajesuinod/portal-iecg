import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  FavoriteBorder,
  MilitaryTechOutlined,
  TimelineOutlined
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import dummyContents from 'dan-api/dummy/dummyContents';
import {
  atualizarMeuPerfilMembro,
  buscarMeuMembro,
  listarPossiveisConjugesMeuMembro
} from '../../../api/membersApi';
import { fetchGeocode } from '../../../utils/googleGeocode';

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

const formatDate = (value) => {
  if (!value) return 'Nao informado';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
};

const formatDateTime = (value) => {
  if (!value) return 'Nao informado';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('pt-BR');
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
  const [member, setMember] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
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
    return [...list].slice(0, 6);
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

  return (
    <PapperBlock title="Minha Jornada" desc="Atualize seus dados e acompanhe sua caminhada">
      <Helmet>
        <title>Minha Jornada</title>
      </Helmet>

      {loading && (
        <Box py={6} display="flex" justifyContent="center">
          <CircularProgress size={30} />
        </Box>
      )}

      {!loading && error && !member && (
        <Paper
          sx={{
            p: 4,
            borderRadius: 4,
            border: '1px solid rgba(12, 71, 88, 0.14)',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(243,246,248,0.94))'
          }}
        >
          <Typography variant="h6" gutterBottom>Nenhum perfil de membro vinculado</Typography>
          <Typography color="textSecondary">
            Seu usuario esta autenticado, mas ainda nao ha um cadastro de membro associado a ele.
          </Typography>
        </Paper>
      )}

      {!loading && member && (
        <Stack spacing={3}>
          <Paper
            sx={{
              overflow: 'hidden',
              borderRadius: 5,
              border: '1px solid rgba(0, 7, 68, 0.14)',
              background: 'linear-gradient(135deg, rgba(48, 229, 235, 0.95), rgba(22, 95, 129, 0.96))',
              color: '#fff'
            }}
          >
            <Box
              sx={{
                p: { xs: 3, md: 4 },
                position: 'relative',
                background: 'radial-gradient(circle at top right, rgba(255,255,255,0.24), transparent 32%), radial-gradient(circle at bottom left, rgba(255,255,255,0.14), transparent 28%)'
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={12}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Avatar
                      src={member.photoUrl || ''}
                      alt={member.fullName}
                      sx={{
                        width: 92,
                        height: 92,
                        border: '3px solid rgba(255,255,255,0.45)',
                        boxShadow: '0 16px 32px rgba(0,0,0,0.18)'
                      }}
                    />
                    <Box>
                      <Typography variant="overline" sx={{ letterSpacing: '0.2em', opacity: 0.82 }}>
                        AREA DO MEMBRO
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.05, mb: 1 }}>
                        {member.preferredName || member.fullName}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={STAGE_COPY[member?.journey?.currentStage] || member?.journey?.currentStage || 'Sem etapa'}
                          sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }}
                        />

                        <Chip
                          label={member.status || 'Sem status'}
                          sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }}
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {(message || error) && (
            <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(12, 71, 88, 0.12)' }}>
              {message && <Typography color="primary">{message}</Typography>}
              {error && <Typography color="error">{error}</Typography>}
            </Paper>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <Paper
                sx={{
                  p: { xs: 2, md: 3 },
                  borderRadius: 4,
                  border: '1px solid rgba(12, 71, 88, 0.12)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,251,0.95))'
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6">Meus Dados</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Atualize apenas suas informacoes pessoais. A jornada abaixo e somente visualizacao.
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Nome completo" value={form.fullName} onChange={(event) => handleChange('fullName', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="CPF" value={form.cpf} onChange={(event) => handleChange('cpf', formatCpf(event.target.value))} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="E-mail" type="email" value={form.email} onChange={(event) => handleChange('email', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Telefone" value={form.phone} onChange={(event) => handleChange('phone', formatPhone(event.target.value))} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="WhatsApp" value={form.whatsapp} onChange={(event) => handleChange('whatsapp', formatPhone(event.target.value))} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth type="date" label="Nascimento" InputLabelProps={{ shrink: true }} value={form.birthDate} onChange={(event) => handleChange('birthDate', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField select fullWidth label="Genero" value={form.gender} onChange={(event) => handleChange('gender', event.target.value)}>
                      <MenuItem value="">Nao informado</MenuItem>
                      {GENDER_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField select fullWidth label="Estado civil" value={form.maritalStatus} onChange={(event) => handleChange('maritalStatus', event.target.value)}>
                      <MenuItem value="">Nao informado</MenuItem>
                      {MARITAL_STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  {isMarried && (
                    <Grid item xs={12}>
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
                            label="Vincular conjuge membro"
                            helperText="Selecione o membro do conjuge quando ele ja tiver cadastro no sistema."
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
                                  {option.hasLinkedUser ? ' • Usuario vinculado' : ''}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        )}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 1 }}>
                      Endereco
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="CEP" value={form.zipCode} onChange={(event) => handleChange('zipCode', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={handleCompleteAddressFromCep}
                      disabled={geoLoading}
                      sx={{ height: '100%' }}
                    >
                      {geoLoading ? 'Buscando CEP...' : 'Completar endereco'}
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Bairro" value={form.neighborhood} onChange={(event) => handleChange('neighborhood', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="UF" value={form.state} inputProps={{ maxLength: 2 }} onChange={(event) => handleChange('state', event.target.value.toUpperCase())} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Cidade" value={form.city} onChange={(event) => handleChange('city', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField fullWidth label="Endereco" value={form.street} onChange={(event) => handleChange('street', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Numero" value={form.number} onChange={(event) => handleChange('number', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Complemento" value={form.complement} onChange={(event) => handleChange('complement', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Pais" value={form.country} onChange={(event) => handleChange('country', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth type="date" label="Data de batismo" InputLabelProps={{ shrink: true }} value={form.baptismDate} onChange={(event) => handleChange('baptismDate', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Local de batismo" value={form.baptismPlace} onChange={(event) => handleChange('baptismPlace', event.target.value)} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth type="date" label="Data de conversao" InputLabelProps={{ shrink: true }} value={form.conversionDate} onChange={(event) => handleChange('conversionDate', event.target.value)} />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Stack spacing={3}>

                {member?.maritalStatus === 'CASADO' && member?.spouse && (
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      border: '1px solid rgba(12, 71, 88, 0.12)',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,248,250,0.94))'
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                      <FavoriteBorder color="primary" />
                      <Typography variant="h6">Vinculo Conjugal</Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar src={member.spouse.photoUrl || ''} alt={member.spouse.fullName} sx={{ width: 52, height: 52 }} />
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          {member.spouse.preferredName || member.spouse.fullName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {member.spouse.fullName}
                        </Typography>
                        <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                          <Chip size="small" variant="outlined" label={member.spouse.status || 'Sem status'} />
                          {member.spouse.userId && (
                            <Chip size="small" color="success" label="Usuario vinculado" />
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </Paper>
                )}

                {!!leaderCells.length && (
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      border: '1px solid rgba(12, 71, 88, 0.12)',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,248,250,0.94))'
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                      <TimelineOutlined color="primary" />
                      <Typography variant="h6">Célula que lidero</Typography>
                    </Stack>
                    <Stack spacing={1.5}>
                      {leaderCells.map((cell) => (
                        <Paper
                          key={cell.id}
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            border: '1px solid rgba(12, 71, 88, 0.1)',
                            bgcolor: 'rgba(249, 250, 251, 0.92)'
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" spacing={2} mb={1} alignItems="center">
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>
                              {cell.celula || 'Celula sem nome'}
                            </Typography>
                            <Chip
                              size="small"
                              color={cell.ativo ? 'success' : 'default'}
                              label={cell.ativo ? 'Ativa' : 'Inativa'}
                            />
                          </Stack>
                          <Grid container spacing={1.25}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" color="textSecondary">Rede</Typography>
                              <Typography variant="body2">{cell.rede || 'Nao informado'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" color="textSecondary">Campus</Typography>
                              <Typography variant="body2">{cell?.campusRef?.nome || 'Nao informado'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" color="textSecondary">Bairro</Typography>
                              <Typography variant="body2">{cell.bairro || 'Nao informado'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" color="textSecondary">Dia e horario</Typography>
                              <Typography variant="body2">
                                {[cell.dia, cell.horario].filter(Boolean).join(' - ') || 'Nao informado'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  border: '1px solid rgba(12, 71, 88, 0.12)',
                  minHeight: '100%'
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                  <MilitaryTechOutlined color="primary" />
                  <Typography variant="h6">Linha do Tempo</Typography>
                </Stack>
                {!milestones.length && (
                  <Typography color="textSecondary">Nenhum marco registrado ainda.</Typography>
                )}
                <Stack spacing={0}>
                  {milestones.map((milestone, index) => {
                    const hasNext = index < milestones.length - 1;
                    return (
                      <Box
                        key={milestone.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '18px 1fr',
                          columnGap: 1.5
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              mt: 0.7
                            }}
                          />
                          {hasNext && (
                            <Box
                              sx={{
                                width: 2,
                                flex: 1,
                                minHeight: 30,
                                bgcolor: 'divider',
                                my: 0.6
                              }}
                            />
                          )}
                        </Box>
                        <Box sx={{ pb: hasNext ? 2.2 : 0 }}>
                          <Typography variant="caption" color="textSecondary">{formatDate(milestone.achievedDate)}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {milestone.displayLabel || milestone.milestoneType}
                          </Typography>
                          {milestone.description && (
                            <Typography variant="body2" color="textSecondary">{milestone.description}</Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  border: '1px solid rgba(12, 71, 88, 0.12)',
                  minHeight: '100%'
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                  <FavoriteBorder color="primary" />
                  <Typography variant="h6">Atividades Recentes</Typography>
                </Stack>
                {!activities.length && (
                  <Typography color="textSecondary">Nenhuma atividade recente registrada.</Typography>
                )}
                <Stack spacing={1.25}>
                  {activities.map((activity) => (
                    <Paper
                      key={activity.id}
                      sx={{
                        p: 1.75,
                        borderRadius: 3,
                        border: '1px solid rgba(12, 71, 88, 0.08)',
                        bgcolor: 'rgba(249, 250, 251, 0.92)'
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {activity.displayLabel || activity.activityTypeRef?.name || activity.activityType}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">{formatDateTime(activity.activityDate)}</Typography>
                          {getActivityObservation(activity) && (
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                              {getActivityObservation(activity)}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      )}
    </PapperBlock>
  );
};

export default MinhaJornadaPage;
