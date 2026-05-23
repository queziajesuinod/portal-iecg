import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import PropTypes from 'prop-types';
import GroupsIcon from '@mui/icons-material/Groups';
import PlaceIcon from '@mui/icons-material/Place';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HomeIcon from '@mui/icons-material/Home';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import SectionCard from '../../../components/Jornada/SectionCard';
import { formatPhoneNumber } from '../../../utils/formatPhone';
import { fetchGeocode } from '../../../utils/googleGeocode';

const formInicial = {
  id: '',
  celula: '',
  rede: '',
  liderMemberId: '',
  lider: '',
  email_lider: '',
  cel_lider: '',
  anfitriao: '',
  campus: '',
  numero: '',
  endereco: '',
  cep: '',
  bairro: '',
  cidade: '',
  estado: '',
  lideranca: '',
  pastor_geracao: '',
  pastor_campus: '',
  dia: '',
  lat: '',
  lon: '',
  horario: ''
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

const DIAS_SEMANA = [
  { value: 'Segunda', short: 'Seg', disabled: false },
  { value: 'Terça', short: 'Ter', disabled: false },
  { value: 'Quarta', short: 'Qua', disabled: true },
  { value: 'Quinta', short: 'Qui', disabled: false },
  { value: 'Sexta', short: 'Sex', disabled: false },
  { value: 'Sábado', short: 'Sáb', disabled: false },
  { value: 'Domingo', short: 'Dom', disabled: true }
];

const stringToInitials = (text = '') => text
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('') || '?';

const stringToColor = (text = '') => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (text.charCodeAt(i) + hash * 31) % 360000;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 45%)`;
};

const SummaryPane = ({
  formData, diasSelecionados, loading, isEdit
}) => {
  const leaderName = formData.lider || '';
  const leaderColor = stringToColor(leaderName || 'celula');
  const hasCoords = Boolean(formData.lat && formData.lon);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        position: { md: 'sticky' },
        top: { md: 24 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: leaderColor,
            fontWeight: 700,
            fontSize: '1.2rem'
          }}
        >
          {stringToInitials(leaderName)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
            {isEdit ? 'Editando' : 'Nova célula'}
          </Typography>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
            {formData.celula || 'Sem nome ainda'}
          </Typography>
        </Box>
      </Stack>

      <Divider />

      <Stack spacing={1.25}>
        <Box>
          <Typography variant="caption" color="text.secondary">Líder</Typography>
          <Typography variant="body2" fontWeight={600}>{leaderName || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Rede</Typography>
          <Typography variant="body2">{formData.rede || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Campus</Typography>
          <Typography variant="body2">{formData.campus || '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Endereço</Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
            {formData.endereco
              ? `${formData.endereco}${formData.numero ? `, ${formData.numero}` : ''}${formData.bairro ? ` — ${formData.bairro}` : ''}`
              : '—'}
          </Typography>
        </Box>
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Dias da semana
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {diasSelecionados.length
            ? diasSelecionados.map((dia) => <Chip key={dia} label={dia} size="small" color="primary" />)
            : <Typography variant="caption" color="text.disabled">Nenhum dia selecionado</Typography>}
        </Stack>
      </Box>

      {formData.horario && (
        <Box>
          <Typography variant="caption" color="text.secondary">Horário</Typography>
          <Typography variant="body2" fontWeight={600}>{formData.horario}</Typography>
        </Box>
      )}

      <Box
        sx={{
          mt: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.25,
          borderRadius: 2,
          bgcolor: hasCoords ? 'success.50' : 'action.hover',
          border: 1,
          borderColor: hasCoords ? 'success.light' : 'divider'
        }}
      >
        <CheckCircleRoundedIcon
          fontSize="small"
          sx={{ color: hasCoords ? 'success.main' : 'text.disabled' }}
        />
        <Typography variant="caption" color={hasCoords ? 'success.main' : 'text.secondary'}>
          {hasCoords
            ? `Geolocalização: ${Number(formData.lat).toFixed(4)}, ${Number(formData.lon).toFixed(4)}`
            : 'Geolocalização pendente'}
        </Typography>
      </Box>

      {loading && <LinearProgress sx={{ borderRadius: 1 }} />}
    </Paper>
  );
};

SummaryPane.propTypes = {
  formData: PropTypes.object.isRequired,
  diasSelecionados: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  isEdit: PropTypes.bool.isRequired
};

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

const CadastrarCelula = () => {
  const [formData, setFormData] = useState(formInicial);
  const [notification, setNotification] = useState('');
  const [campi, setCampi] = useState([]);
  const [membros, setMembros] = useState([]);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [leaderSearchLoading, setLeaderSearchLoading] = useState(false);
  const [leaderSearchResult, setLeaderSearchResult] = useState(null);
  const location = useLocation();
  const history = useHistory();
  const celulaEditando = location.state?.celula;
  const isEdit = Boolean(celulaEditando);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const API_URL = resolveApiUrl();

  const formatHorarioInput = (valor = '') => {
    const digits = valor.replace(/\D/g, '').slice(0, 4);
    const [hh, mm] = [digits.slice(0, 2), digits.slice(2, 4)];
    if (digits.length <= 2) return hh;
    return `${hh}:${mm}`;
  };

  useEffect(() => {
    if (isEdit && celulaEditando) {
      const safeEdit = Object.fromEntries(
        Object.entries(celulaEditando).map(([k, v]) => [k, v == null ? '' : v])
      );
      setFormData({
        ...formInicial,
        ...safeEdit,
        cel_lider: formatPhoneNumber(safeEdit.cel_lider || ''),
        horario: formatHorarioInput(safeEdit.horario || '')
      });
      const dias = (celulaEditando.dia || '')
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      setDiasSelecionados(dias);
    }
  }, [isEdit, celulaEditando]);

  useEffect(() => {
    const carregarDadosBase = async () => {
      const token = localStorage.getItem('token');
      try {
        const [campiRes, membrosRes] = await Promise.all([
          fetch(`${API_URL}/start/campus`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_URL}/api/admin/members?page=1&limit=5000`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!campiRes.ok) {
          throw new Error(`Erro ao carregar campus: ${campiRes.status}`);
        }

        const campiData = await campiRes.json();
        setCampi(Array.isArray(campiData) ? campiData : []);

        if (!membrosRes.ok) {
          throw new Error(`Erro ao carregar membros: ${membrosRes.status}`);
        }

        const membrosPayload = await membrosRes.json();
        const membrosData = Array.isArray(membrosPayload?.members) ? membrosPayload.members : [];
        const membrosOrdenados = [...membrosData].sort((a, b) => (
          (a?.fullName || '').localeCompare(b?.fullName || '', 'pt-BR', { sensitivity: 'base' })
        ));
        setMembros(membrosOrdenados);
      } catch (err) {
        console.error('Erro ao carregar dados base da célula:', err);
        setCampi([]);
        setMembros([]);
      }
    };
    carregarDadosBase();
  }, [API_URL]);

  const selectedMemberLeader = useMemo(
    () => membros.find((m) => m.id === formData.liderMemberId) || null,
    [membros, formData.liderMemberId]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'cel_lider') {
      nextValue = formatPhoneNumber(value);
    }
    if (name === 'horario') {
      nextValue = formatHorarioInput(value);
    }
    setFormData({ ...formData, [name]: nextValue });
  };

  const clearLeaderSearch = () => {
    setLeaderSearchResult(null);
  };

  const handleMemberLeaderChange = (member) => {
    setFormData((prev) => ({
      ...prev,
      liderMemberId: member ? member.id : '',
      lider: member ? (member.fullName || '') : prev.lider,
      email_lider: member ? (member.email || '') : prev.email_lider,
      cel_lider: member
        ? formatPhoneNumber(member.phone || member.whatsapp || '')
        : prev.cel_lider
    }));
    clearLeaderSearch();
  };

  const ensureLeaderRecord = async (celulaId) => {
    if (!celulaId) return;
    if (formData.liderMemberId) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/start/celula/leader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          celulaId,
          lider: formData.lider,
          email_lider: formData.email_lider,
          cel_lider: formData.cel_lider,
          perfilId: process.env.REACT_APP_MEMBER_LEADER_PROFILE || undefined
        })
      });
    } catch (error) {
      console.error('Erro ao garantir registro do líder:', error);
    }
  };

  const handleDiaToggle = (_evt, novosDias) => {
    setDiasSelecionados(novosDias);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.celula || !formData.lider || !formData.email_lider) {
      setNotification('Preencha os campos obrigatórios: Nome da Célula, Líder e E-mail do Líder.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `${API_URL}/start/celula/${formData.id}` : `${API_URL}/start/celula`;

    const payload = {
      ...formData,
      liderMemberId: formData.liderMemberId || null,
      dia: diasSelecionados.join(', '),
      lat: formData.lat ? parseFloat(formData.lat) : null,
      lon: formData.lon ? parseFloat(formData.lon) : null
    };
    if (!isEdit) {
      delete payload.id;
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setNotification(isEdit ? 'Célula atualizada com sucesso!' : 'Célula cadastrada com sucesso!');
        if (!isEdit) {
          setFormData(formInicial);
          setDiasSelecionados([]);
        }
        await ensureLeaderRecord(isEdit ? formData.id : data.id);
      } else {
        setNotification(`Erro: ${data.message || 'Falha no processamento'}`);
      }
    } catch (error) {
      console.error('Erro ao salvar célula:', error);
      setNotification('Erro na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaderSearch = async () => {
    const email = formData.email_lider?.trim();
    const telefone = formatPhoneNumber(formData.cel_lider || '');
    if (!email && telefone.replace(/\D/g, '').length === 0) {
      setNotification('Informe o e-mail ou celular do líder para buscar.');
      return;
    }
    setLeaderSearchLoading(true);
    setLeaderSearchResult(null);
    try {
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (telefone) params.append('telefone', telefone.replace(/\D/g, ''));
      const res = await fetch(`${API_URL}/public/celulas/leader/contact?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 404) {
          setNotification('Líder não encontrado. Continuaremos com cadastro interno.');
        } else {
          setNotification('Não foi possível buscar o líder.');
        }
        return;
      }
      const data = await res.json();
      const leader = data.leader || {};
      setLeaderSearchResult(leader);
      setFormData((prev) => ({
        ...prev,
        lider: leader.name || prev.lider,
        email_lider: leader.email || prev.email_lider,
        cel_lider: leader.telefone ? formatPhoneNumber(leader.telefone) : prev.cel_lider
      }));
    } catch (error) {
      console.error('Erro ao buscar líder:', error);
      setNotification('Erro ao buscar líder pelo contato.');
    } finally {
      setLeaderSearchLoading(false);
    }
  };

  const buscarCoordenadas = async () => {
    const {
      endereco,
      numero,
      bairro,
      cidade,
      estado,
      cep
    } = formData;
    const queryParts = [endereco, numero, bairro, cidade, estado, cep].filter(Boolean);
    if (!queryParts.length) {
      setNotification('Informe endereço, número, bairro, cidade, estado ou CEP para buscar coordenadas.');
      return;
    }

    setGeoLoading(true);
    try {
      const geocodeResult = await fetchGeocode(queryParts.join(' '));
      if (!geocodeResult) {
        setNotification('Nenhum resultado encontrado para esse endereço.');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        lat: geocodeResult.lat,
        lon: geocodeResult.lon,
        endereco: geocodeResult.logradouro || prev.endereco,
        numero: geocodeResult.numeroEncontrado || prev.numero,
        bairro: geocodeResult.bairro || prev.bairro,
        cidade: geocodeResult.cidade || prev.cidade,
        estado: geocodeResult.estado || prev.estado,
        cep: geocodeResult.cepEncontrado || prev.cep
      }));
      setNotification('Coordenadas preenchidas com sucesso!');
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      setNotification('Erro ao buscar coordenadas.');
    } finally {
      setGeoLoading(false);
    }
  };

  return (
    <div>
      <Helmet>
        <title>{isEdit ? 'Editar Célula' : 'Cadastrar Célula'}</title>
      </Helmet>
      <PapperBlock
        title={isEdit ? 'Editar Célula' : 'Cadastro de Célula'}
        desc="Preencha os dados para registrar uma nova célula. Campos com * são obrigatórios."
      >
        {(loading || geoLoading) && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                <SectionCard
                  title="Identidade e Liderança"
                  icon={<GroupsIcon color="primary" fontSize="small" />}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth size="small" label="Nome da Célula *" name="celula" value={formData.celula} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Rede"
                        name="rede"
                        value={formData.rede}
                        onChange={handleChange}
                      >
                        <MenuItem value="">Nenhuma</MenuItem>
                        {REDE_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <Autocomplete
                        options={membros}
                        getOptionLabel={(option) => option?.fullName || ''}
                        isOptionEqualToValue={(option, value) => option?.id === value?.id}
                        value={selectedMemberLeader}
                        onChange={(_evt, value) => handleMemberLeaderChange(value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Membro líder (opcional — preenche os campos automaticamente)"
                            helperText="Selecione um membro cadastrado ou preencha manualmente abaixo."
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth size="small" label="Nome do Líder *" name="lider" value={formData.lider} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="E-mail do Líder *"
                        name="email_lider"
                        value={formData.email_lider}
                        onChange={(e) => { handleChange(e); clearLeaderSearch(); }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Celular do Líder"
                        name="cel_lider"
                        value={formData.cel_lider}
                        onChange={(e) => { handleChange(e); clearLeaderSearch(); }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          startIcon={<SearchIcon />}
                          onClick={handleLeaderSearch}
                          disabled={leaderSearchLoading}
                        >
                          {leaderSearchLoading ? 'Buscando…' : 'Buscar líder por contato'}
                        </Button>
                        {leaderSearchResult ? (
                          <Chip
                            size="small"
                            icon={<CheckCircleRoundedIcon />}
                            color="success"
                            label={`${leaderSearchResult.name} encontrado (#${leaderSearchResult.id})`}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Informe e-mail ou telefone e clique em Buscar para localizar um líder existente.
                          </Typography>
                        )}
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth size="small" label="Anfitrião" name="anfitriao" value={formData.anfitriao} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Campus"
                        name="campus"
                        value={formData.campus}
                        onChange={handleChange}
                      >
                        <MenuItem value="">Selecione…</MenuItem>
                        {campi.map((campus) => (
                          <MenuItem key={campus.id} value={campus.nome}>
                            {campus.nome}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                </SectionCard>

                <SectionCard
                  title="Localização"
                  icon={<PlaceIcon color="primary" fontSize="small" />}
                  action={(
                    <Tooltip title="Preenche cidade, bairro e coordenadas a partir do endereço informado">
                      <span>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<LocationSearchingIcon />}
                          onClick={buscarCoordenadas}
                          disabled={geoLoading}
                        >
                          {geoLoading ? 'Buscando…' : 'Buscar coordenadas'}
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Endereço"
                        name="endereco"
                        value={formData.endereco}
                        onChange={handleChange}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <HomeIcon fontSize="small" color="action" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <TextField fullWidth size="small" label="Número" name="numero" value={formData.numero} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <TextField fullWidth size="small" label="CEP" name="cep" value={formData.cep} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth size="small" label="Bairro" name="bairro" value={formData.bairro} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={8} md={6}>
                      <TextField fullWidth size="small" label="Cidade" name="cidade" value={formData.cidade} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={4} md={2}>
                      <TextField fullWidth size="small" label="Estado" name="estado" value={formData.estado} onChange={handleChange} />
                    </Grid>
                  </Grid>
                </SectionCard>

                <SectionCard
                  title="Cronograma e Hierarquia"
                  icon={<AccessTimeIcon color="primary" fontSize="small" />}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth size="small" label="Liderança" name="lideranca" value={formData.lideranca} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth size="small" label="Pastor de Geração" name="pastor_geracao" value={formData.pastor_geracao} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField fullWidth size="small" label="Pastor do Campus" name="pastor_campus" value={formData.pastor_campus} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                        Dias da semana
                      </Typography>
                      <ToggleButtonGroup
                        value={diasSelecionados}
                        onChange={handleDiaToggle}
                        size="small"
                        color="primary"
                        sx={{ flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButton-root': { borderRadius: 2, px: 1.5 } }}
                      >
                        {DIAS_SEMANA.map((dia) => (
                          <ToggleButton
                            key={dia.value}
                            value={dia.value}
                            disabled={dia.disabled}
                          >
                            {isMobile ? dia.short : dia.value}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Horário"
                        name="horario"
                        type="time"
                        value={formData.horario || ''}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }}
                      />
                    </Grid>
                  </Grid>
                </SectionCard>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column-reverse', sm: 'row' },
                    gap: 1.5,
                    justifyContent: 'flex-end',
                    pt: 1
                  }}
                >
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => history.push('/app/start/celulas')}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<SaveRoundedIcon />}
                    disabled={loading}
                    sx={{ minWidth: 220 }}
                  >
                    {loading ? 'Salvando…' : (isEdit ? 'Atualizar Célula' : 'Cadastrar Célula')}
                  </Button>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <SummaryPane
                formData={formData}
                diasSelecionados={diasSelecionados}
                loading={loading || geoLoading}
                isEdit={isEdit}
              />
            </Grid>
          </Grid>
        </form>
      </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default CadastrarCelula;
