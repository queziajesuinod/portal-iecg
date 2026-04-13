import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Backdrop,
  Skeleton,
  Alert,
  AlertTitle,
  Tooltip,
  Divider,
  Box,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BlockIcon from '@mui/icons-material/Block';
import { useHistory, useParams } from 'react-router-dom';
import {
  buscarEvento,
  listarCamposPorEvento,
  listarRegrasPorEvento,
  criarRegraBloquio,
  atualizarRegraBloquio,
  deletarRegraBloquio,
} from '../../../api/eventsApi';
import brand from 'dan-api/dummy/brand';

// ─── Constantes de UI ─────────────────────────────────────────────────────────

const OPERADORES = [
  // Igualdade
  { value: 'eq', label: 'É igual a', grupo: 'Texto / Valor' },
  { value: 'neq', label: 'É diferente de', grupo: 'Texto / Valor' },
  { value: 'contains', label: 'Contém', grupo: 'Texto / Valor' },
  { value: 'in', label: 'Está entre os valores', grupo: 'Texto / Valor' },
  { value: 'not_in', label: 'Não está entre os valores', grupo: 'Texto / Valor' },
  // Numérico
  { value: 'gt', label: 'É maior que', grupo: 'Numérico' },
  { value: 'gte', label: 'É maior ou igual a', grupo: 'Numérico' },
  { value: 'lt', label: 'É menor que', grupo: 'Numérico' },
  { value: 'lte', label: 'É menor ou igual a', grupo: 'Numérico' },
  // Idade (campo = data de nascimento)
  { value: 'age_gte', label: 'Tem pelo menos X anos (≥)', grupo: 'Idade (data de nascimento)' },
  { value: 'age_lte', label: 'Tem no máximo X anos (≤)', grupo: 'Idade (data de nascimento)' },
  { value: 'age_gt', label: 'Tem mais de X anos (>)', grupo: 'Idade (data de nascimento)' },
  { value: 'age_lt', label: 'Tem menos de X anos (<)', grupo: 'Idade (data de nascimento)' },
];

// Operadores que aceitam múltiplos valores (array)
const OPERADORES_MULTIPLOS = ['in', 'not_in'];

// Operadores de idade
const OPERADORES_IDADE = ['age_gte', 'age_lte', 'age_gt', 'age_lt'];

const APLICA_A_LABELS = { buyer: 'Comprador', attendee: 'Inscrito' };

const FORM_VAZIO = {
  formFieldId: '',
  fieldKey: '',
  fieldLabel: '',
  operator: 'eq',
  value: '',
  valueList: '', // campo auxiliar para 'in'/'not_in' (separado por vírgula)
  errorMessage: '',
  appliesTo: 'attendee',
  ruleGroup: 1,
  isActive: true,
};

// ─── Helpers de exibição ──────────────────────────────────────────────────────

function formatarValor(operator, value) {
  if (OPERADORES_MULTIPLOS.includes(operator)) {
    const lista = Array.isArray(value) ? value : [value];
    return lista.join(', ');
  }
  if (OPERADORES_IDADE.includes(operator)) {
    return `${value} anos`;
  }
  return String(value ?? '');
}

function getOperadorLabel(op) {
  return OPERADORES.find(o => o.value === op)?.label || op;
}

function getGroupColor(group) {
  const cores = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828'];
  return cores[(group - 1) % cores.length];
}

// ─── Componente principal ─────────────────────────────────────────────────────

function RegistrationRules() {
  const history = useHistory();
  const { id: eventId } = useParams();

  const [evento, setEvento] = useState(null);
  const [campos, setCampos] = useState([]);
  const [regras, setRegras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [notification, setNotification] = useState('');

  const [dialogAberto, setDialogAberto] = useState(false);
  const [regraAtual, setRegraAtual] = useState(null); // null = nova regra
  const [form, setForm] = useState(FORM_VAZIO);
  const [confirmRemover, setConfirmRemover] = useState(null); // id da regra

  // ── Carregamento inicial ──────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, camposResp, regrasResp] = await Promise.all([
        buscarEvento(eventId),
        listarCamposPorEvento(eventId),
        listarRegrasPorEvento(eventId),
      ]);
      setEvento(ev);
      setCampos(camposResp);
      setRegras(regrasResp);
    } catch (err) {
      setNotification('Erro ao carregar dados do evento');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Abertura do diálogo ───────────────────────────────────────────────────

  function abrirNovaRegra() {
    const proximoGrupo = regras.length > 0
      ? Math.max(...regras.map(r => r.ruleGroup))
      : 1;
    setRegraAtual(null);
    setForm({ ...FORM_VAZIO, ruleGroup: proximoGrupo });
    setDialogAberto(true);
  }

  function abrirEdicao(regra) {
    const isMultiplo = OPERADORES_MULTIPLOS.includes(regra.operator);
    setRegraAtual(regra);
    setForm({
      formFieldId: regra.formFieldId || '',
      fieldKey: regra.fieldKey,
      fieldLabel: regra.formField?.fieldLabel || regra.fieldKey,
      operator: regra.operator,
      value: isMultiplo ? '' : String(regra.value ?? ''),
      valueList: isMultiplo
        ? (Array.isArray(regra.value) ? regra.value.join(', ') : String(regra.value))
        : '',
      errorMessage: regra.errorMessage,
      appliesTo: regra.appliesTo,
      ruleGroup: regra.ruleGroup,
      isActive: regra.isActive,
    });
    setDialogAberto(true);
  }

  function fecharDialog() {
    setDialogAberto(false);
    setRegraAtual(null);
    setForm(FORM_VAZIO);
  }

  // ── Seleção de campo do formulário ───────────────────────────────────────

  function handleSelecionarCampo(campo) {
    if (campo === '__manual__') {
      setForm(prev => ({ ...prev, formFieldId: '', fieldKey: '', fieldLabel: '' }));
      return;
    }
    const encontrado = campos.find(c => c.id === campo);
    if (encontrado) {
      setForm(prev => ({
        ...prev,
        formFieldId: encontrado.id,
        fieldKey: encontrado.fieldName,
        fieldLabel: encontrado.fieldLabel,
      }));
    }
  }

  // ── Salvar regra ──────────────────────────────────────────────────────────

  async function handleSalvar() {
    if (!form.fieldKey.trim()) {
      setNotification('Selecione ou informe o campo alvo da regra');
      return;
    }
    if (!form.errorMessage.trim()) {
      setNotification('Informe a mensagem de bloqueio');
      return;
    }

    const isMultiplo = OPERADORES_MULTIPLOS.includes(form.operator);
    let valorFinal;
    if (isMultiplo) {
      valorFinal = form.valueList
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
      if (!valorFinal.length) {
        setNotification('Informe ao menos um valor para a lista');
        return;
      }
    } else {
      if (form.value === '') {
        setNotification('Informe o valor de comparação');
        return;
      }
      valorFinal = form.value;
    }

    const payload = {
      eventId,
      formFieldId: form.formFieldId || null,
      fieldKey: form.fieldKey,
      operator: form.operator,
      value: valorFinal,
      errorMessage: form.errorMessage,
      appliesTo: form.appliesTo,
      ruleGroup: Number(form.ruleGroup) || 1,
      isActive: form.isActive,
    };

    setSalvando(true);
    try {
      if (regraAtual) {
        await atualizarRegraBloquio(regraAtual.id, payload);
        setNotification('Regra atualizada com sucesso');
      } else {
        await criarRegraBloquio(payload);
        setNotification('Regra criada com sucesso');
      }
      fecharDialog();
      await carregar();
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar regra');
    } finally {
      setSalvando(false);
    }
  }

  // ── Remover regra ─────────────────────────────────────────────────────────

  async function handleRemover(regraId) {
    setSalvando(true);
    try {
      await deletarRegraBloquio(regraId);
      setNotification('Regra removida');
      setConfirmRemover(null);
      await carregar();
    } catch (err) {
      setNotification(err.message || 'Erro ao remover regra');
    } finally {
      setSalvando(false);
    }
  }

  // ── Agrupar regras para exibição ──────────────────────────────────────────

  const grupos = regras.reduce((acc, r) => {
    const g = r.ruleGroup;
    if (!acc[g]) acc[g] = [];
    acc[g].push(r);
    return acc;
  }, {});

  const isMultiploAtual = OPERADORES_MULTIPLOS.includes(form.operator);
  const isIdadeAtual = OPERADORES_IDADE.includes(form.operator);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <Helmet>
        <title>{`${brand.name} - Regras de Bloqueio`}</title>
      </Helmet>

      <Notification
        close={() => setNotification('')}
        message={notification}
      />

      <Backdrop open={salvando} sx={{ zIndex: 9999, color: '#fff' }} />

      <PapperBlock
        title={loading ? 'Carregando...' : `Regras de Bloqueio — ${evento?.title || ''}`}
        icon="block"
        desc="Defina critérios que impedem a inscrição de participantes fora do perfil esperado"
        noMargin
      >
        <Grid container spacing={2} style={{ padding: '0 16px 24px' }}>

          {/* Botões de ação */}
          <Grid item xs={12} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={() => history.push(`/app/events/${eventId}`)}
            >
              Voltar ao evento
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={abrirNovaRegra}
              disabled={loading}
            >
              Nova regra
            </Button>
          </Grid>

          {/* Explicação de grupos */}
          <Grid item xs={12}>
            <Alert severity="info" icon={<InfoOutlinedIcon />} style={{ marginBottom: 8 }}>
              <AlertTitle>Como funciona</AlertTitle>
              Regras dentro do <strong>mesmo grupo</strong> são avaliadas com <strong>E</strong> (todas devem ser atendidas).
              Grupos diferentes são avaliados com <strong>OU</strong> (basta um grupo ser atendido).
              Um inscrito é bloqueado apenas se não passar em nenhum grupo.
            </Alert>
          </Grid>

          {/* Skeleton enquanto carrega */}
          {loading && [1, 2].map(i => (
            <Grid item xs={12} key={i}>
              <Skeleton variant="rounded" height={80} />
            </Grid>
          ))}

          {/* Sem regras */}
          {!loading && regras.length === 0 && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent style={{ textAlign: 'center', padding: 32 }}>
                  <BlockIcon style={{ fontSize: 48, color: '#bdbdbd', marginBottom: 8 }} />
                  <Typography color="textSecondary">
                    Nenhuma regra configurada. Qualquer pessoa pode se inscrever.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Grupos de regras */}
          {!loading && Object.keys(grupos).sort((a, b) => Number(a) - Number(b)).map((grupo, idx) => (
            <Grid item xs={12} key={grupo}>
              {idx > 0 && (
                <Box display="flex" alignItems="center" gap={1} my={1}>
                  <Divider style={{ flex: 1 }} />
                  <Chip label="OU" size="small" color="warning" />
                  <Divider style={{ flex: 1 }} />
                </Box>
              )}
              <Card variant="outlined" style={{ borderLeft: `4px solid ${getGroupColor(Number(grupo))}` }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip
                      label={`Grupo ${grupo}`}
                      size="small"
                      style={{ background: getGroupColor(Number(grupo)), color: '#fff' }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      — todas as condições abaixo devem ser verdadeiras
                    </Typography>
                  </Box>

                  {grupos[grupo].map((regra, regraIdx) => (
                    <Box key={regra.id}>
                      {regraIdx > 0 && (
                        <Box display="flex" alignItems="center" gap={1} my={0.5}>
                          <Divider style={{ flex: 1 }} />
                          <Typography variant="caption" color="textSecondary">E</Typography>
                          <Divider style={{ flex: 1 }} />
                        </Box>
                      )}
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          background: regra.isActive ? '#f5f5f5' : '#fafafa',
                          opacity: regra.isActive ? 1 : 0.5,
                        }}
                      >
                        <Box flex={1}>
                          <Typography variant="body2">
                            <strong>{APLICA_A_LABELS[regra.appliesTo]}: </strong>
                            <Chip
                              label={regra.formField?.fieldLabel || regra.fieldKey}
                              size="small"
                              variant="outlined"
                              style={{ marginRight: 4 }}
                            />
                            {getOperadorLabel(regra.operator)}
                            {' '}
                            <strong>{formatarValor(regra.operator, regra.value)}</strong>
                          </Typography>
                          <Typography variant="caption" color="error">
                            Mensagem: {regra.errorMessage}
                          </Typography>
                          {!regra.isActive && (
                            <Chip label="Inativa" size="small" style={{ marginLeft: 8 }} />
                          )}
                        </Box>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => abrirEdicao(regra)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remover">
                            <IconButton size="small" color="error" onClick={() => setConfirmRemover(regra.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </PapperBlock>

      {/* ── Diálogo: criar / editar regra ─────────────────────────────────── */}
      <Dialog open={dialogAberto} onClose={fecharDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {regraAtual ? 'Editar Regra de Bloqueio' : 'Nova Regra de Bloqueio'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} style={{ paddingTop: 4 }}>

            {/* Campo do formulário */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Campo do formulário</InputLabel>
                <Select
                  label="Campo do formulário"
                  value={form.formFieldId || (campos.length === 0 ? '__manual__' : '')}
                  onChange={e => handleSelecionarCampo(e.target.value)}
                >
                  <MenuItem value="__manual__">
                    <em>Informar chave manualmente</em>
                  </MenuItem>
                  {campos.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.fieldLabel}
                      <Typography variant="caption" color="textSecondary" style={{ marginLeft: 8 }}>
                        ({c.section === 'buyer' ? 'comprador' : 'inscrito'})
                      </Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Chave manual (se não selecionou campo) */}
            {!form.formFieldId && (
              <Grid item xs={12}>
                <TextField
                  label="Chave do campo (fieldName)"
                  size="small"
                  fullWidth
                  value={form.fieldKey}
                  onChange={e => setForm(prev => ({ ...prev, fieldKey: e.target.value }))}
                  placeholder="ex: estadoCivil"
                  helperText="Use o nome exato do campo no formulário"
                />
              </Grid>
            )}

            {/* Aplica a */}
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Aplica-se ao</InputLabel>
                <Select
                  label="Aplica-se ao"
                  value={form.appliesTo}
                  onChange={e => setForm(prev => ({ ...prev, appliesTo: e.target.value }))}
                >
                  <MenuItem value="attendee">Inscrito</MenuItem>
                  <MenuItem value="buyer">Comprador</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Grupo */}
            <Grid item xs={6}>
              <TextField
                label="Grupo"
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 1 }}
                value={form.ruleGroup}
                onChange={e => setForm(prev => ({ ...prev, ruleGroup: e.target.value }))}
                helperText="Mesmo grupo = E; grupos diferentes = OU"
              />
            </Grid>

            {/* Operador */}
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Condição</InputLabel>
                <Select
                  label="Condição"
                  value={form.operator}
                  onChange={e => setForm(prev => ({ ...prev, operator: e.target.value, value: '', valueList: '' }))}
                >
                  {/* Agrupa operadores por categoria */}
                  {['Texto / Valor', 'Numérico', 'Idade (data de nascimento)'].map(grupo => [
                    <MenuItem key={`header-${grupo}`} disabled sx={{ fontWeight: 700, fontSize: 11, color: 'text.secondary', opacity: '1 !important' }}>
                      {grupo.toUpperCase()}
                    </MenuItem>,
                    ...OPERADORES.filter(op => op.grupo === grupo).map(op => (
                      <MenuItem key={op.value} value={op.value} sx={{ pl: 3 }}>
                        {op.label}
                      </MenuItem>
                    ))
                  ])}
                </Select>
              </FormControl>
            </Grid>

            {/* Valor */}
            {isIdadeAtual ? (
              <Grid item xs={12}>
                <TextField
                  label="Idade (anos)"
                  size="small"
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, max: 120 }}
                  value={form.value}
                  onChange={e => setForm(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="ex: 15"
                  helperText="O sistema calculará a idade a partir da data de nascimento informada no formulário"
                />
              </Grid>
            ) : isMultiploAtual ? (
              <Grid item xs={12}>
                <TextField
                  label="Valores (separados por vírgula)"
                  size="small"
                  fullWidth
                  value={form.valueList}
                  onChange={e => setForm(prev => ({ ...prev, valueList: e.target.value }))}
                  placeholder="ex: casado, uniao_estavel"
                  helperText="Informe os valores aceitos, separados por vírgula"
                />
              </Grid>
            ) : (
              <Grid item xs={12}>
                <TextField
                  label="Valor"
                  size="small"
                  fullWidth
                  value={form.value}
                  onChange={e => setForm(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="ex: 18"
                />
              </Grid>
            )}

            {/* Mensagem de bloqueio */}
            <Grid item xs={12}>
              <TextField
                label="Mensagem de bloqueio"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={form.errorMessage}
                onChange={e => setForm(prev => ({ ...prev, errorMessage: e.target.value }))}
                placeholder="ex: Este evento é exclusivo para casais"
                helperText="Exibida ao inscrito quando a regra bloquear sua inscrição"
              />
            </Grid>

            {/* Ativa */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    color="primary"
                  />
                }
                label="Regra ativa"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialog} disabled={salvando}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSalvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: confirmar remoção ────────────────────────────────────── */}
      <Dialog open={!!confirmRemover} onClose={() => setConfirmRemover(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remover regra</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja remover esta regra de bloqueio?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemover(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleRemover(confirmRemover)}
            disabled={salvando}
          >
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default RegistrationRules;
