import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box, Typography, Paper, TextField, Button, CircularProgress,
  Alert, Divider, Chip, Grid, FormControl, InputLabel, Select,
  MenuItem, Autocomplete, Radio, RadioGroup, FormControlLabel,
  FormLabel, Collapse, IconButton, InputAdornment,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import BadgeIcon from '@mui/icons-material/Badge';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlaceIcon from '@mui/icons-material/Place';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useParams, useHistory } from 'react-router-dom';
import axios from 'axios';

const BASE = typeof window !== 'undefined' ? window.location.origin : '';
const API = `${BASE}/api/public/cfm`;

const fmt = (d) => { if (!d) return ''; const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; };

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function fCPF(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
function fPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function fCEP(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

const EMPTY = {
  cpf: '',
  nome: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  cidade: '',
  rua: '',
  numero: '',
  bairro: '',
  cep: '',
  deficiencia: '',
  geracao: '',
  pastorId: '',
  pastorCargo: '',
  encontroComDeus: '',
  dataEncontroComDeus: '',
  anoConversaoMinisterio: '',
};

// ─── CARD DE TURMA ────────────────────────────────────────────────────────

function TurmaCard({ t, onEnroll }) {
  const aberta = t.status === 'ABERTA';
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        opacity: aberta ? 1 : 0.6,
        border: '1px solid',
        borderColor: aberta ? 'transparent' : 'divider',
        boxShadow: aberta ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
        transition: 'box-shadow 0.2s',
        '&:hover': aberta ? { boxShadow: '0 4px 18px rgba(0,0,0,0.13)' } : {},
      }}
    >
      <Box sx={{ height: 4, bgcolor: aberta ? 'primary.main' : 'grey.300' }} />
      <Box p={{ xs: 2, sm: 2.5 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={0.5}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                {t.escola?.nome || 'Escola CFM'}
              </Typography>
              <Chip
                size="small"
                label={`Turma ${t.numeracao}`}
                variant="outlined"
                sx={{ fontSize: 11, height: 20 }}
              />
            </Box>

            {t.modulo?.nome && (
              <Typography variant="body2" color="primary.main" fontWeight={500} mb={1.5}>
                {t.modulo.nome}
              </Typography>
            )}

            <Box display="flex" flexWrap="wrap" gap={{ xs: 1.5, sm: 2.5 }}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" noWrap>
                  {fmt(t.periodoInicio)} → {fmt(t.periodoFim)}
                </Typography>
              </Box>
              {t.diaSemana !== null && t.diaSemana !== undefined && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">{DIAS[t.diaSemana]}</Typography>
                </Box>
              )}
              {t.campus?.nome && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <PlaceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">{t.campus.nome}</Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box flexShrink={0} display="flex" flexDirection="column" alignItems="flex-end" gap={1} pt={0.5}>
            {aberta ? (
              <Button
                variant={t.esgotada ? 'outlined' : 'contained'}
                onClick={onEnroll}
                sx={{ borderRadius: 2, minWidth: 148, fontWeight: 600 }}
              >
                {t.esgotada ? 'Lista de espera' : 'Fazer Matrícula'}
              </Button>
            ) : (
              <Box display="flex" alignItems="center" gap={0.5} sx={{ color: 'text.disabled' }}>
                <LockOutlinedIcon sx={{ fontSize: 15 }} />
                <Typography variant="caption" fontWeight={500}>Encerradas</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

TurmaCard.propTypes = {
  t: PropTypes.shape({
    status: PropTypes.string,
    escola: PropTypes.object,
    numeracao: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    modulo: PropTypes.object,
    periodoInicio: PropTypes.string,
    periodoFim: PropTypes.string,
    diaSemana: PropTypes.number,
    campus: PropTypes.object,
    esgotada: PropTypes.bool,
  }).isRequired,
  onEnroll: PropTypes.func,
};

TurmaCard.defaultProps = {
  onEnroll: undefined,
};

// ─── LANDING: lista turmas abertas ────────────────────────────────────────

function CfmMatriculaLanding() {
  const history = useHistory();
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEscolaId, setFiltroEscolaId] = useState('');
  const [filtroModuloId, setFiltroModuloId] = useState('');
  const [filtroCampusId, setFiltroCampusId] = useState('');
  const [filtroDia, setFiltroDia] = useState('');
  const [showEmAndamento, setShowEmAndamento] = useState(false);

  const [escolas, setEscolas] = useState([]);
  const [campi, setCampi] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/turmas`),
      axios.get(`${API}/escolas`),
      axios.get(`${API}/campi`),
    ])
      .then(([t, e, c]) => {
        setTurmas(t.data || []);
        setEscolas(e.data || []);
        setCampi(c.data || []);
      })
      .catch(() => setError('Não foi possível carregar as turmas disponíveis.'))
      .finally(() => setLoading(false));
  }, []);

  const escolaSelecionada = escolas.find(e => e.id === filtroEscolaId) || null;
  const modulosDaEscola = escolaSelecionada?.modulos || [];
  const mostrarFiltroModulo = !!(escolaSelecionada?.temModulos && modulosDaEscola.length > 0);

  const aplicarFiltros = (lista) => lista.filter(t => {
    if (filtroEscolaId && t.escola?.id !== filtroEscolaId) return false;
    if (filtroModuloId && t.modulo?.id !== filtroModuloId) return false;
    if (filtroCampusId && t.campus?.id !== filtroCampusId) return false;
    if (filtroDia !== '' && String(t.diaSemana) !== filtroDia) return false;
    return true;
  });

  const abertas = aplicarFiltros(turmas.filter(t => t.status === 'ABERTA'));
  const emAndamento = aplicarFiltros(turmas.filter(t => t.status === 'EM_ANDAMENTO'));
  const temFiltro = !!(filtroEscolaId || filtroModuloId || filtroCampusId || filtroDia !== '');

  const limparFiltros = () => {
    setFiltroEscolaId(''); setFiltroModuloId('');
    setFiltroCampusId(''); setFiltroDia('');
  };

  if (loading) {
    return (
      <Box>
        {/* Banner skeleton */}
        <Box sx={{
          bgcolor: '#111', width: '100%', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CircularProgress sx={{ color: '#f5c800' }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* ── Banner hero ── */}
      <Box
        sx={{
          width: '100%',
          bgcolor: '#0d0d0d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: { xs: 3, sm: 4 },
        }}
      >
        <Box
          component="img"
          src="/images/cfm-logo.png"
          alt="CFM — Centro de Formação Ministerial"
          sx={{
            width: { xs: 260, sm: 340, md: 420 },
            maxWidth: '88%',
            display: 'block',
          }}
        />
      </Box>

      <Box display="flex" justifyContent="center" pt={4} pb={8} px={2}>
        <Box maxWidth={1000} width="100%">

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* Filtros */}
          {turmas.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <FilterListIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ letterSpacing: 0.3 }}>
                  FILTROS
                </Typography>
                {temFiltro && (
                  <Button
                    size="small"
                    onClick={limparFiltros}
                    sx={{ ml: 'auto', textTransform: 'none', fontSize: 12 }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={mostrarFiltroModulo ? 3 : 4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Escola</InputLabel>
                    <Select
                      value={filtroEscolaId}
                      label="Escola"
                      onChange={e => { setFiltroEscolaId(e.target.value); setFiltroModuloId(''); }}
                    >
                      <MenuItem value="">Todas as escolas</MenuItem>
                      {escolas.map(e => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                {mostrarFiltroModulo && (
                  <Grid item xs={12} sm={3}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Módulo</InputLabel>
                      <Select value={filtroModuloId} label="Módulo" onChange={e => setFiltroModuloId(e.target.value)}>
                        <MenuItem value="">Todos os módulos</MenuItem>
                        {modulosDaEscola.map(m => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item xs={12} sm={mostrarFiltroModulo ? 3 : 4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Campus</InputLabel>
                    <Select value={filtroCampusId} label="Campus" onChange={e => setFiltroCampusId(e.target.value)}>
                      <MenuItem value="">Todos os campus</MenuItem>
                      {campi.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={mostrarFiltroModulo ? 3 : 4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Dia da semana</InputLabel>
                    <Select value={filtroDia} label="Dia da semana" onChange={e => setFiltroDia(e.target.value)}>
                      <MenuItem value="">Todos os dias</MenuItem>
                      {DIAS.map((d, i) => <MenuItem key={i} value={String(i)}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Turmas abertas */}
          {abertas.length === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {temFiltro
                ? 'Nenhuma turma aberta encontrada com esses filtros.'
                : 'Nenhuma turma com inscrições abertas no momento. Volte em breve.'}
            </Alert>
          )}

          {abertas.length > 0 && (
            <Box mb={4}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Chip
                  size="small"
                  label="Inscrições abertas"
                  color="success"
                  sx={{ fontWeight: 600, fontSize: 11 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {abertas.length} turma{abertas.length !== 1 ? 's' : ''} disponível{abertas.length !== 1 ? 'is' : ''} para matrícula
                </Typography>
              </Box>
              <Box display="flex" flexDirection="column" gap={2}>
                {abertas.map(t => (
                  <TurmaCard
                    key={t.id}
                    t={t}
                    onEnroll={() => history.push(`/cfm/matricula/${t.id}`)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Em andamento */}
          {emAndamento.length > 0 && (
            <Box>
              <Divider sx={{ mb: 2.5 }} />
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setShowEmAndamento(v => !v)}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    size="small"
                    label="Em andamento"
                    sx={{
                      fontWeight: 600, fontSize: 11, bgcolor: 'grey.200', color: 'text.secondary'
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {emAndamento.length} turma{emAndamento.length !== 1 ? 's' : ''} com inscrições encerradas
                  </Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  {showEmAndamento ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Box>
              <Collapse in={showEmAndamento}>
                <Box display="flex" flexDirection="column" gap={2} mt={2}>
                  {emAndamento.map(t => <TurmaCard key={t.id} t={t} />)}
                </Box>
              </Collapse>
            </Box>
          )}

        </Box>
      </Box>
    </Box>
  );
}

// ─── FORMULÁRIO DE MATRÍCULA ──────────────────────────────────────────────

function CfmMatriculaForm({ turmaId }) {
  const [turma, setTurma] = useState(null);
  const [pastores, setPastores] = useState([]);
  const [ministerios, setMinisterios] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageError, setPageError] = useState('');

  const [form, setForm] = useState(EMPTY);
  const [liderOptions, setLiderOptions] = useState([]);
  const [liderLoading, setLiderLoading] = useState(false);
  const [liderInput, setLiderInput] = useState('');
  const [liderSelecionado, setLiderSelecionado] = useState(null);
  const [liderManual, setLiderManual] = useState(false);
  const [liderNomeManual, setLiderNomeManual] = useState('');
  const [pastorManual, setPastorManual] = useState(false);
  const [pastorNomeManual, setPastorNomeManual] = useState('');

  const [cpfLoading, setCpfLoading] = useState(false);
  const [cpfEncontrado, setCpfEncontrado] = useState(null);
  const [cepBuscando, setCepBuscando] = useState(false);
  const [cepErro, setCepErro] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emListaEspera, setEmListaEspera] = useState(false);

  const buscarCep = async () => {
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) { setCepErro('CEP deve ter 8 dígitos.'); return; }
    setCepBuscando(true);
    setCepErro('');
    try {
      const r = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      if (r.data.erro) { setCepErro('CEP não encontrado.'); return; }
      setForm(f => ({
        ...f,
        rua: r.data.logradouro || f.rua,
        bairro: r.data.bairro || f.bairro,
        cidade: r.data.localidade || f.cidade,
      }));
    } catch {
      setCepErro('Erro ao buscar CEP. Tente novamente.');
    } finally {
      setCepBuscando(false);
    }
  };

  const isEF = !!(turma?.escola?.nome?.toLowerCase().includes('fundamento'));

  // Load turma + pastores + ministérios
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/turmas/${turmaId}`),
      axios.get(`${API}/pastores`),
      axios.get(`${API}/redes`),
    ])
      .then(([t, p, m]) => {
        setTurma(t.data.turma);
        setPastores(p.data || []);
        setMinisterios(m.data || []);
      })
      .catch(e => setPageError(e.response?.data?.erro || 'Turma não encontrada ou inscrições encerradas'))
      .finally(() => setLoadingPage(false));
  }, [turmaId]);

  // Busca líderes com debounce
  useEffect(() => {
    if (!liderInput || liderInput.length < 2) { setLiderOptions([]); return () => {}; }
    const timer = setTimeout(async () => {
      setLiderLoading(true);
      try {
        const r = await axios.get(`${API}/lideres-celula`, { params: { busca: liderInput } });
        setLiderOptions(r.data || []);
      } catch (_ignored) {
        // request failed silently
      } finally { setLiderLoading(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [liderInput]);

  const handleChange = (field) => (e) => {
    let v = e.target.value;
    if (field === 'cpf') { v = fCPF(v); setCpfEncontrado(null); }
    if (field === 'telefone') v = fPhone(v);
    if (field === 'cep') v = fCEP(v);
    setForm(f => ({ ...f, [field]: v }));
  };

  const handleCpfBlur = async () => {
    const limpo = form.cpf.replace(/\D/g, '');
    if (limpo.length !== 11) return;
    setCpfLoading(true);
    try {
      const r = await axios.get(`${API}/membro/cpf/${limpo}`);
      if (r.data) {
        setCpfEncontrado(true);
        setForm(f => ({
          ...f,
          nome: r.data.nome || f.nome,
          email: r.data.email || f.email,
          telefone: r.data.telefone ? fPhone(r.data.telefone) : f.telefone,
          dataNascimento: r.data.dataNascimento || f.dataNascimento,
          cidade: r.data.cidade || f.cidade,
          rua: r.data.rua || f.rua,
          numero: r.data.numero || f.numero,
          bairro: r.data.bairro || f.bairro,
          cep: r.data.cep ? fCEP(r.data.cep) : f.cep,
        }));
      } else {
        setCpfEncontrado(false);
      }
    } catch {
      setCpfEncontrado(false);
    } finally {
      setCpfLoading(false);
    }
  };

  const handleLiderSelect = (lider) => {
    setLiderSelecionado(lider);
    if (!lider) { return; }
    // Tenta pré-preencher o pastor a partir da hierarquia do líder
    if (lider.pastorGeracaoMemberId) {
      const p = pastores.find(x => x.id === lider.pastorGeracaoMemberId);
      if (p) setForm(f => ({ ...f, pastorId: p.id, pastorCargo: 'pastor_geracao' }));
    } else if (lider.pastorCampusMemberId) {
      const p = pastores.find(x => x.id === lider.pastorCampusMemberId);
      if (p) setForm(f => ({ ...f, pastorId: p.id, pastorCargo: 'pastor_campus' }));
    }
  };

  const handlePastorChange = (e) => {
    const id = e.target.value;
    const p = pastores.find(x => x.id === id);
    setForm(f => ({ ...f, pastorId: id, pastorCargo: p?.cargo || '' }));
  };

  const validate = () => {
    if (form.cpf.replace(/\D/g, '').length !== 11) return 'CPF inválido. Informe os 11 dígitos.';
    if (!form.nome.trim()) return 'Nome completo é obrigatório.';
    if (!form.email.trim()) return 'E-mail é obrigatório.';
    if (form.telefone.replace(/\D/g, '').length < 10) return 'Telefone inválido.';
    if (!form.dataNascimento) return 'Data de nascimento é obrigatória.';
    if (!form.cidade.trim()) return 'Cidade é obrigatória.';
    if (!form.deficiencia.trim()) return 'Informe sobre deficiências (pode ser "Não").';
    if (!form.geracao) return 'Selecione sua rede.';
    if (isEF && !form.encontroComDeus) return 'Informe se já passou pelo Encontro com Deus.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const erroValidacao = validate();
    if (erroValidacao) { setError(erroValidacao); return; }
    setError('');
    setSubmitting(true);
    try {
      const submitData = {
        ...form,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone.replace(/\D/g, ''),
        cep: form.cep.replace(/\D/g, ''),
        liderCelulaId: liderManual ? null : (liderSelecionado?.id || null),
        celulaId: liderManual ? null : (liderSelecionado?.celulaId || null),
        liderNomeManual: liderManual ? liderNomeManual : undefined,
      };
      if (pastorManual) {
        submitData.pastorId = null;
        submitData.pastorCargo = null;
        submitData.pastorNomeManual = pastorNomeManual;
      }
      const resp = await axios.post(`${API}/turmas/${turmaId}/matricula`, submitData);
      setEmListaEspera(resp.data?.status === 'LISTA_ESPERA');
      setSuccess(true);
    } catch (submitErr) {
      const axiosErr = /** @type {any} */ (submitErr);
      setError(axiosErr.response?.data?.erro || 'Erro ao realizar matrícula. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPage) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (pageError) {
    return (
      <Box display="flex" justifyContent="center" pt={8} px={2}>
        <Alert severity="error" sx={{ maxWidth: 520, width: '100%' }}>{pageError}</Alert>
      </Box>
    );
  }

  if (success) {
    return (
      <Box display="flex" justifyContent="center" pt={8} pb={8} px={2}>
        <Paper elevation={2} sx={{
          p: 4, maxWidth: 520, width: '100%', textAlign: 'center', borderRadius: 3
        }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: emListaEspera ? 'warning.main' : 'success.main', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} mb={1}>
            {emListaEspera ? 'Você entrou na lista de espera!' : 'Matrícula realizada!'}
          </Typography>
          <Typography color="text.secondary" mb={2}>
            {emListaEspera
              ? `Todas as vagas da turma ${turma?.numeracao} estão preenchidas no momento. Você foi adicionado(a) à lista de espera e será contatado(a) assim que uma vaga for liberada.`
              : `Sua inscrição na turma ${turma?.numeracao} foi recebida com sucesso. Aguarde o contato da administração para confirmar e orientar sobre o pagamento.`}
          </Typography>
          {emListaEspera && (
            <Alert severity="info" sx={{ textAlign: 'left', mb: 2 }}>
              A promoção da lista de espera é feita por ordem de inscrição, automaticamente quando uma vaga é liberada.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            {emListaEspera
              ? 'Guarde este formulário como confirmação da sua posição na lista.'
              : 'Em caso de dúvidas, entre em contato com a administração do CFM.'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" pt={4} pb={8} px={2}>
      <Box maxWidth={680} width="100%">

        {/* Banner da turma */}
        <Paper elevation={0} sx={{
          p: 3, mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200', borderRadius: 2
        }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <SchoolIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                {turma?.escola?.nome}
                {turma?.modulo?.nome ? ` — ${turma.modulo.nome}` : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">Turma {turma?.numeracao}</Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip size="small" label={`${fmt(turma?.periodoInicio)} → ${fmt(turma?.periodoFim)}`} variant="outlined" />
            {turma?.diaSemana !== null && turma?.diaSemana !== undefined && (
              <Chip size="small" label={DIAS[turma.diaSemana]} variant="outlined" />
            )}
            {turma?.campus?.nome && <Chip size="small" label={turma.campus.nome} variant="outlined" />}
          </Box>
        </Paper>

        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={3}>

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {/* ─── Dados pessoais ──────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <BadgeIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600}>Seus dados</Typography>
            </Box>

            {/* CPF com lookup */}
            <Box display="flex" gap={1} alignItems="flex-start" mb={2}>
              <TextField
                label="CPF *"
                value={form.cpf}
                onChange={handleChange('cpf')}
                onBlur={handleCpfBlur}
                inputProps={{ inputMode: 'numeric' }}
                sx={{ flex: 1 }}
                helperText={
                  cpfLoading ? 'Consultando cadastro...'
                    : cpfEncontrado === true ? '✓ Cadastro encontrado — dados preenchidos automaticamente'
                      : cpfEncontrado === false ? 'CPF não encontrado — preencha seus dados abaixo'
                        : 'Digite seu CPF para consultar cadastro existente'
                }
                FormHelperTextProps={{ sx: { color: cpfEncontrado === true ? 'success.main' : undefined } }}
                InputProps={{
                  endAdornment: cpfLoading ? <CircularProgress size={18} /> : undefined,
                }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField label="Nome e sobrenome *" value={form.nome} onChange={handleChange('nome')} fullWidth autoComplete="name" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="E-mail *" type="email" value={form.email} onChange={handleChange('email')} fullWidth autoComplete="email" inputProps={{ inputMode: 'email' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Telefone / WhatsApp *" value={form.telefone} onChange={handleChange('telefone')} fullWidth autoComplete="tel" inputProps={{ inputMode: 'tel' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Data de nascimento *"
                  type="date"
                  value={form.dataNascimento}
                  onChange={handleChange('dataNascimento')}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="CEP"
                  value={form.cep}
                  onChange={handleChange('cep')}
                  onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); buscarCep(); } }}
                  fullWidth
                  inputProps={{ inputMode: 'numeric' }}
                  error={!!cepErro}
                  helperText={cepErro || 'Digite o CEP e clique na lupa'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={buscarCep} disabled={cepBuscando} size="small" title="Buscar endereço pelo CEP">
                          {cepBuscando ? <CircularProgress size={18} /> : <SearchIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField label="Rua" value={form.rua} onChange={handleChange('rua')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="Número" value={form.numero} onChange={handleChange('numero')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField label="Bairro" value={form.bairro} onChange={handleChange('bairro')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={7}>
                <TextField label="Cidade de residência *" value={form.cidade} onChange={handleChange('cidade')} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Possui alguma deficiência que impossibilita subir escadas ou outra deficiência? *"
                  placeholder='Ex: "Não" ou descreva sua condição'
                  value={form.deficiencia}
                  onChange={handleChange('deficiencia')}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* ─── Vínculo na Igreja ───────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <GroupsIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600}>Geração & Rede</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Rede</InputLabel>
                  <Select value={form.geracao} onChange={handleChange('geracao')} label="Rede">
                    {ministerios.map(m => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                {liderManual ? (
                  <Box>
                    <TextField
                      label="Nome do líder de célula"
                      value={liderNomeManual}
                      onChange={e => setLiderNomeManual(e.target.value)}
                      fullWidth
                      placeholder="Digite o nome do seu líder de célula..."
                      helperText="Nome salvo apenas na matrícula, sem vínculo no sistema"
                    />
                    <Box mt={0.5}>
                      <Button size="small" variant="text" color="primary" sx={{ fontSize: 12, p: 0, minWidth: 0 }}
                        onClick={() => { setLiderManual(false); setLiderNomeManual(''); setLiderInput(''); setLiderOptions([]); }}>
                        Buscar pelo sistema
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Autocomplete
                      options={liderOptions}
                      filterOptions={x => x}
                      loading={liderLoading}
                      inputValue={liderInput}
                      value={liderSelecionado}
                      getOptionLabel={o => `${o.nome}${o.celulaNome ? ` — ${o.celulaNome}` : ''}`}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      onInputChange={(_, v) => setLiderInput(v)}
                      onChange={(_, v) => handleLiderSelect(v)}
                      noOptionsText={liderInput.length < 2 ? 'Digite ao menos 2 letras para buscar' : 'Nenhum líder encontrado'}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Nome do líder de célula"
                          placeholder="Digite o nome do seu líder..."
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {liderLoading ? <CircularProgress size={16} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                          helperText={liderSelecionado ? `Célula: ${liderSelecionado.celulaNome || '—'}` : 'Busque pelo nome do seu líder de célula'}
                        />
                      )}
                    />
                    <Box mt={0.5}>
                      <Button size="small" variant="text" color="inherit" sx={{
                        color: 'text.secondary', fontSize: 12, p: 0, minWidth: 0
                      }}
                      onClick={() => { setLiderManual(true); setLiderSelecionado(null); setLiderInput(''); setLiderOptions([]); setForm(f => ({ ...f, pastorId: '', pastorCargo: '' })); }}>
                        Não encontrei meu líder de célula
                      </Button>
                    </Box>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12}>
                {pastorManual ? (
                  <Box>
                    <TextField
                      label="Nome do pastor"
                      value={pastorNomeManual}
                      onChange={e => setPastorNomeManual(e.target.value)}
                      fullWidth
                      placeholder="Digite o nome do seu pastor..."
                      helperText="Nome salvo apenas na matrícula, sem vínculo no sistema"
                    />
                    <Box mt={0.5}>
                      <Button size="small" variant="text" color="primary" sx={{ fontSize: 12, p: 0, minWidth: 0 }}
                        onClick={() => { setPastorManual(false); setPastorNomeManual(''); }}>
                        Buscar pelo sistema
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Autocomplete
                      options={pastores}
                      groupBy={p => (p.cargo === 'pastor_geracao' ? 'Pastores de Geração' : 'Pastores de Campus')}
                      getOptionLabel={p => p.nome || ''}
                      value={pastores.find(p => p.id === form.pastorId) || null}
                      onChange={(_, v) => handlePastorChange({ target: { value: v ? v.id : '' } })}
                      filterOptions={(opts, { inputValue }) => {
                        const norm = s => (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
                        return opts.filter(p => norm(p.nome).includes(norm(inputValue)));
                      }}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      noOptionsText="Nenhum pastor encontrado"
                      renderInput={params => (
                        <TextField {...params} label="Pastor de geração apostólica ou pastor do campus" fullWidth
                          helperText={liderSelecionado && form.pastorId ? '✓ Pastor preenchido automaticamente a partir do líder' : undefined}
                          FormHelperTextProps={{ sx: { color: 'success.main' } }}
                        />
                      )}
                    />
                    <Box mt={0.5}>
                      <Button size="small" variant="text" color="inherit" sx={{
                        color: 'text.secondary', fontSize: 12, p: 0, minWidth: 0
                      }}
                      onClick={() => { setPastorManual(true); setForm(f => ({ ...f, pastorId: '', pastorCargo: '' })); }}>
                        Não encontrei meu pastor
                      </Button>
                    </Box>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* ─── Dados específicos: Escola de Fundamentos ────── */}
          {isEF && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Encontro com Deus</Typography>

              <FormControl required component="fieldset" sx={{ mb: 2 }}>
                <FormLabel component="legend">
                  Já passou pelo Encontro com Deus e concluiu as 4 aulas do pós-encontro? *
                </FormLabel>
                <RadioGroup row value={form.encontroComDeus} onChange={handleChange('encontroComDeus')}>
                  <FormControlLabel value="sim" control={<Radio />} label="Sim" />
                  <FormControlLabel value="nao" control={<Radio />} label="Não" />
                </RadioGroup>
                {form.encontroComDeus === 'nao' && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    É necessário ter concluído o Encontro com Deus e as 4 aulas do pós-encontro para se matricular na Escola de Fundamentos.
                  </Alert>
                )}
              </FormControl>

              {form.encontroComDeus === 'sim' && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Data do Encontro com Deus"
                      type="date"
                      value={form.dataEncontroComDeus}
                      onChange={handleChange('dataEncontroComDeus')}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Ano em que se converteu / Já fez parte de outro ministério? Qual?"
                      value={form.anoConversaoMinisterio}
                      onChange={handleChange('anoConversaoMinisterio')}
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="Ex: Convertido em 2018. Antes era da Igreja Batista."
                    />
                  </Grid>
                </Grid>
              )}
            </Paper>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || (isEF && form.encontroComDeus === 'nao')}
            sx={{ py: 1.5 }}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Realizar Matrícula'}
          </Button>

          <Typography variant="caption" color="text.secondary" textAlign="center">
            Ao realizar a matrícula, seus dados serão vinculados ao cadastro da IECG.
            Aguarde a confirmação e orientações sobre o pagamento da matrícula.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

CfmMatriculaForm.propTypes = { turmaId: PropTypes.string };

// ─── COMPONENTE RAIZ ──────────────────────────────────────────────────────

export default function CfmMatriculaPublicaPage() {
  const { turmaId } = useParams();
  if (turmaId) return <CfmMatriculaForm turmaId={turmaId} />;
  return <CfmMatriculaLanding />;
}
