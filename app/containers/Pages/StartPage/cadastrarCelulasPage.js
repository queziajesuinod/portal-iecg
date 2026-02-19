import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Grid,
  TextField,
  Button,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography,
  Divider,
  Chip,
  LinearProgress,
  useTheme,
  Stack
} from '@mui/material';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import { formatPhoneNumber } from '../../../utils/formatPhone';
import { fetchGeocode } from '../../../utils/googleGeocode';

const formInicial = {
  id: '',
  celula: '',
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
  { value: 'Segunda', disabled: false },
  { value: 'Terça', disabled: false },
  { value: 'Quarta', disabled: true },
  { value: 'Quinta', disabled: false },
  { value: 'Sexta', disabled: false },
  { value: 'Sábado', disabled: false },
  { value: 'Domingo', disabled: true }
];

const SummaryPane = ({ formData, diasSelecionados, loading }) => (
  <Paper
    elevation={3}
    sx={{
      p: 3,
      borderRadius: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minHeight: 320
    }}
  >
    <Typography variant="subtitle1" fontWeight={600}>
      Resumo da Célula
    </Typography>
    <Divider />
    <Typography variant="body2">
      <strong>Líder:</strong> {formData.lider || '---'}
    </Typography>
    <Typography variant="body2">
      <strong>Rede:</strong> {formData.rede || '---'}
    </Typography>
    <Typography variant="body2">
      <strong>Campus:</strong> {formData.campus || '---'}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      <strong>Endereço:</strong> {formData.endereco || '---'} {formData.numero && `, ${formData.numero}`}
    </Typography>
    <Box display="flex" gap={1} flexWrap="wrap">
      {diasSelecionados.length ? diasSelecionados.map((dia) => (
        <Chip key={dia} label={dia} size="small" />
      )) : <Typography variant="caption">Selecione ao menos um dia</Typography>}
    </Box>
    <Box>
      <Typography variant="body2">Lat: {formData.lat || '---'}</Typography>
      <Typography variant="body2">Lon: {formData.lon || '---'}</Typography>
    </Box>
    {loading && <Typography variant="caption" color="textSecondary">Salvando...</Typography>}
  </Paper>
);

SummaryPane.propTypes = {
  formData: PropTypes.object.isRequired,
  diasSelecionados: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired
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
  const [geoLoading] = useState(false);
  const [leaderSearchLoading, setLeaderSearchLoading] = useState(false);
  const [leaderSearchResult, setLeaderSearchResult] = useState(null);
  const location = useLocation();
  const celulaEditando = location.state?.celula;
  const isEdit = Boolean(celulaEditando);
  const theme = useTheme();
  const API_URL = resolveApiUrl();

  const formatHorarioInput = (valor = '') => {
    const digits = valor.replace(/\D/g, '').slice(0, 4);
    const [hh, mm] = [digits.slice(0, 2), digits.slice(2, 4)];
    if (digits.length <= 2) return hh;
    return `${hh}:${mm}`;
  };

  useEffect(() => {
    if (isEdit && celulaEditando) {
      setFormData((prev) => ({
        ...prev,
        ...formInicial,
        ...celulaEditando,
        cel_lider: formatPhoneNumber(celulaEditando.cel_lider || ''),
        horario: formatHorarioInput(celulaEditando.horario || '')
      }));
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

  const handleMemberLeaderChange = (memberId) => {
    const member = membros.find((item) => item.id === memberId);
    setFormData((prev) => ({
      ...prev,
      liderMemberId: memberId || '',
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
      console.error('Erro ao garantir registro do l?der:', error);
    }
  };

  const handleDiaToggle = (dia) => {
    setDiasSelecionados((prev) => {
      if (prev.includes(dia)) {
        return prev.filter((d) => d !== dia);
      }
      return [...prev, dia];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.celula || !formData.lider || !formData.email_lider) {
      setNotification('Preencha os campos obrigatórios: Nome da Célula, Líder e Email do Líder.');
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
      setNotification('Informe endere�o, n�mero, bairro, cidade, estado ou CEP para buscar coordenadas.');
      return;
    }

    try {
      const geocodeResult = await fetchGeocode(queryParts.join(' '));
      if (!geocodeResult) {
        setNotification('Nenhum resultado encontrado para esse endere�o.');
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
    }
  };

  return (
    <div>
      <Helmet>
        <title>{isEdit ? 'Editar Célula' : 'Cadastrar Célula'}</title>
      </Helmet>
      <PapperBlock title={isEdit ? 'Editar Célula' : 'Cadastro de Célula'} desc="Preencha os dados abaixo">
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3, background: theme.palette.background.paper }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Identidade & Liderança
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Nome da Célula" name="celula" value={formData.celula} onChange={handleChange} required />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      label="Rede"
                      name="rede"
                      value={formData.rede}
                      onChange={handleChange}
                    >
                      {REDE_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      label="Membro lider"
                      name="liderMemberId"
                      value={formData.liderMemberId || ''}
                      onChange={(e) => handleMemberLeaderChange(e.target.value)}
                    >
                      <MenuItem value="">Nenhum</MenuItem>
                      {membros.map((member) => (
                        <MenuItem key={member.id} value={member.id}>
                          {member.fullName}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Líder" name="lider" value={formData.lider} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email do Líder"
                      name="email_lider"
                      value={formData.email_lider}
                      onChange={(e) => { handleChange(e); clearLeaderSearch(); }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Celular do Líder"
                      name="cel_lider"
                      value={formData.cel_lider}
                      onChange={(e) => { handleChange(e); clearLeaderSearch(); }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={handleLeaderSearch}
                        disabled={leaderSearchLoading}
                      >
                        {leaderSearchLoading ? 'Buscando líder...' : 'Buscar líder por contato'}
                      </Button>
                      {leaderSearchResult ? (
                        <Typography variant="body2" color="primary">
                          {leaderSearchResult.name} encontrado (#{leaderSearchResult.id})
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          Informe e-mail ou telefone e clique em Buscar.
                        </Typography>
                      )}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Anfitrião" name="anfitriao" value={formData.anfitriao} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      label="Campus"
                      name="campus"
                      value={formData.campus}
                      onChange={handleChange}
                    >
                      {campi.map((campus) => (
                        <MenuItem key={campus.id} value={campus.nome}>
                          {campus.nome}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Localização
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  <Grid item xs={12} container spacing={1}>
                    <Grid item xs={9}>
                      <TextField
                        fullWidth
                        label="Endereço"
                        name="endereco"
                        value={formData.endereco}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <Button
                        variant="outlined"
                        color="primary"
                        fullWidth
                        onClick={buscarCoordenadas}
                        style={{ height: '100%' }}
                      >
                        Buscar coordenadas
                      </Button>
                    </Grid>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Número da casa" name="numero" value={formData.numero} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="CEP" name="cep" value={formData.cep} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Bairro" name="bairro" value={formData.bairro} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Cidade" name="cidade" value={formData.cidade} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Estado" name="estado" value={formData.estado} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Liderança & horários
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Liderança" name="lideranca" value={formData.lideranca} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Pastor de Geração" name="pastor_geracao" value={formData.pastor_geracao} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Pastor do Campus" name="pastor_campus" value={formData.pastor_campus} onChange={handleChange} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={600} mb={1}>
                      Dias da semana
                    </Typography>
                    <FormGroup row>
                      {DIAS_SEMANA.map((dia) => (
                        <FormControlLabel
                          key={dia.value}
                          control={(
                            <Checkbox
                              checked={diasSelecionados.includes(dia.value)}
                              onChange={() => !dia.disabled && handleDiaToggle(dia.value)}
                              disabled={dia.disabled}
                            />
                          )}
                          label={dia.value}
                        />
                      ))}
                    </FormGroup>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Horário"
                      name="horario"
                      type="time"
                      value={formData.horario || ''}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={<Checkbox checked={diasSelecionados.length > 0} disabled />}
                      label="Dias selecionados"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button type="submit" variant="contained" color="primary" fullWidth>
                      {isEdit ? 'Atualizar Célula' : 'Cadastrar Célula'}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <SummaryPane formData={formData} diasSelecionados={diasSelecionados} loading={loading || geoLoading} />
            </Grid>
          </Grid>
        </form>
      </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default CadastrarCelula;
