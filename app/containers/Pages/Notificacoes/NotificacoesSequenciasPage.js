import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Alert, Box, Button, Card, CardContent, Checkbox, Chip,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, IconButton, InputLabel, ListItemText, MenuItem, OutlinedInput,
  Select, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Toolbar, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Helmet } from 'react-helmet';
import Notification from 'dan-components/Notification/Notification';
import { useConfirm } from '../../../utils/useConfirm';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

// ── Configurações de audiência (reusadas de campanhas) ─────────────────────────
const SOURCE_TYPES = [
  { value: 'members', label: 'Membros' },
  { value: 'registrations', label: 'Inscrições de Eventos' },
  { value: 'apelos', label: 'Apelos (pessoa)' },
  { value: 'liders_apelos', label: 'Líderes que receberam apelos' },
  { value: 'voluntarios', label: 'Voluntários' }
];
const CONTACT_FIELDS = {
  members: [{ value: 'whatsapp', label: 'WhatsApp/Telefone' }, { value: 'email', label: 'E-mail' }],
  registrations: [{ value: 'buyer_phone', label: 'Telefone do comprador' }, { value: 'email', label: 'E-mail' }],
  apelos: [{ value: 'whatsapp', label: 'WhatsApp do apelo' }],
  liders_apelos: [{ value: 'cel_lider', label: 'Celular do líder' }, { value: 'email', label: 'E-mail do líder' }],
  voluntarios: [{ value: 'whatsapp', label: 'WhatsApp/Telefone' }, { value: 'email', label: 'E-mail' }]
};
const MEMBER_STATUSES = ['VISITANTE', 'CONGREGADO', 'MEMBRO', 'INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'];
const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pendente' }, { value: 'partial', label: 'Parcial' },
  { value: 'confirmed', label: 'Confirmado' }, { value: 'cancelled', label: 'Cancelado' }, { value: 'free', label: 'Gratuito' }
];
const VOLUNTARIO_STATUSES = ['PENDENTE', 'APROVADO', 'ENCERRADO'];
const emptySource = () => ({ type: 'members', filters: {}, contactField: 'whatsapp' });

const AUDIENCE_TYPES = [
  { value: 'group', label: 'Grupo salvo' },
  { value: 'filter', label: 'Filtro rápido' },
  { value: 'individual', label: 'Envio individual' }
];

const STATUS_CFG = {
  draft: { label: 'Rascunho', color: 'default' },
  active: { label: 'Ativa', color: 'success' },
  paused: { label: 'Pausada', color: 'warning' },
  completed: { label: 'Concluída', color: 'info' }
};
const STEP_STATUS_CFG = {
  pending: { label: 'Pendente', color: 'default' },
  sending: { label: 'Enviando…', color: 'warning' },
  sent: { label: 'Enviado', color: 'success' },
  failed: { label: 'Falhou', color: 'error' }
};

// ── Componentes de audiência ────────────────────────────────────────────────────
function MultiSelect({
  label, value = [], options, onChange
}) {
  return (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select multiple value={value} onChange={(e) => onChange(e.target.value)}
        input={<OutlinedInput label={label} />} renderValue={(sel) => sel.join(', ')}>
        {options.map((opt) => {
          const v = typeof opt === 'string' ? opt : opt.value;
          const l = typeof opt === 'string' ? opt : opt.label;
          return (
            <MenuItem key={v} value={v}>
              <Checkbox checked={value.includes(v)} />
              <ListItemText primary={l} />
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
}

MultiSelect.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.arrayOf(PropTypes.string),
  options: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })])).isRequired,
  onChange: PropTypes.func.isRequired
};

function SourceFilters({
  source, index, onChange, campus, eventos, areas
}) {
  const f = source.filters || {};
  const { type } = source;
  const set = (k, v) => onChange(index, k, v);
  const dateFields = (
    <>
      <TextField label="Data inicial" type="date" size="small" InputLabelProps={{ shrink: true }}
        value={f.dateFrom || ''} onChange={(e) => set('dateFrom', e.target.value)} />
      <TextField label="Data final" type="date" size="small" InputLabelProps={{ shrink: true }}
        value={f.dateTo || ''} onChange={(e) => set('dateTo', e.target.value)} />
    </>
  );
  if (type === 'members') {
    return (
      <><MultiSelect label="Status do membro" value={f.status || []} options={MEMBER_STATUSES}
        onChange={(v) => set('status', v)} />
      <TextField select label="Campus" size="small" value={f.campusId || ''} onChange={(e) => set('campusId', e.target.value)}>
        <MenuItem value="">Todos</MenuItem>
        {campus.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome || c.name}</MenuItem>)}
      </TextField>{dateFields}</>
    );
  }
  if (type === 'registrations') {
    return (
      <><TextField select label="Evento" size="small" value={f.eventId || ''} onChange={(e) => set('eventId', e.target.value)}>
        <MenuItem value="">Todos</MenuItem>
        {eventos.map((ev) => <MenuItem key={ev.id} value={ev.id}>{ev.name || ev.title}</MenuItem>)}
      </TextField>
      <MultiSelect label="Status do pagamento" value={f.paymentStatus || []} options={PAYMENT_STATUSES}
        onChange={(v) => set('paymentStatus', v)} />{dateFields}</>
    );
  }
  if (type === 'apelos') {
    return (
      <><TextField label="Status do apelo" size="small" value={f.statusApelo || ''} onChange={(e) => set('statusApelo', e.target.value)} placeholder="ex: Recebido…" />
        <TextField label="Decisão" size="small" value={f.decisao || ''} onChange={(e) => set('decisao', e.target.value)} />
        <TextField label="Rede" size="small" value={f.rede || ''} onChange={(e) => set('rede', e.target.value)} />{dateFields}</>
    );
  }
  if (type === 'liders_apelos') {
    return (
      <><TextField label="Status do apelo" size="small" value={f.statusApelo || ''} onChange={(e) => set('statusApelo', e.target.value)} />
        <TextField label="Decisão" size="small" value={f.decisao || ''} onChange={(e) => set('decisao', e.target.value)} />
        <TextField select label="Campus do líder" size="small" value={f.campusId || ''} onChange={(e) => set('campusId', e.target.value)}>
          <MenuItem value="">Todos</MenuItem>
          {campus.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome || c.name}</MenuItem>)}
        </TextField>{dateFields}</>
    );
  }
  if (type === 'voluntarios') {
    return (
      <><MultiSelect label="Status do voluntário" value={f.status || []} options={VOLUNTARIO_STATUSES}
        onChange={(v) => set('status', v)} />
      <TextField select label="Campus" size="small" value={f.campusId || ''} onChange={(e) => set('campusId', e.target.value)}>
        <MenuItem value="">Todos</MenuItem>
        {campus.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome || c.name}</MenuItem>)}
      </TextField>
      <TextField select label="Área de voluntariado" size="small" value={f.areaVoluntariadoId || ''} onChange={(e) => set('areaVoluntariadoId', e.target.value)}>
        <MenuItem value="">Todas</MenuItem>
        {areas.map((a) => <MenuItem key={a.id} value={a.id}>{a.nome || a.name}</MenuItem>)}
      </TextField>{dateFields}</>
    );
  }
  return dateFields;
}

SourceFilters.propTypes = {
  source: PropTypes.shape({ type: PropTypes.string, filters: PropTypes.object }).isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  campus: PropTypes.arrayOf(PropTypes.object).isRequired,
  eventos: PropTypes.arrayOf(PropTypes.object).isRequired,
  areas: PropTypes.arrayOf(PropTypes.object).isRequired
};

const emptyStep = (order) => ({
  _key: Math.random(), stepOrder: order, name: '', customMessage: '', templateId: '', scheduledAt: ''
});

// ── Página principal ────────────────────────────────────────────────────────────
export default function NotificacoesSequenciasPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [sequencias, setSequencias] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [notification, setNotification] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [disparandoStep, setDisparandoStep] = useState(null);

  // Campos do formulário de sequência
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [sendDelaySeconds, setSendDelaySeconds] = useState('0.5');
  const [audienceType, setAudienceType] = useState('filter');
  const [groupId, setGroupId] = useState('');
  const [individualContact, setIndividualContact] = useState('');
  const [individualName, setIndividualName] = useState('');
  const [filterSources, setFilterSources] = useState([emptySource()]);
  const [filterDeduplicateBy, setFilterDeduplicateBy] = useState('phone');
  const [steps, setSteps] = useState([emptyStep(1)]);

  // Listas de apoio para filtros
  const [campus, setCampus] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [areas, setAreas] = useState([]);

  const token = () => localStorage.getItem('token');

  const fetchAll = async () => {
    const [s, t, g] = await Promise.all([
      fetch(`${API_URL}/api/admin/notificacoes/sequencias`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/admin/notificacoes/templates`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/admin/notificacoes/grupos`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json())
    ]);
    setSequencias(Array.isArray(s) ? s : []);
    setTemplates(Array.isArray(t) ? t : []);
    setGrupos(Array.isArray(g) ? g : []);
  };

  const fetchListas = async () => {
    try {
      const [c, ev, ar] = await Promise.all([
        fetch(`${API_URL}/start/campus`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API_URL}/api/admin/events`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API_URL}/api/admin/voluntariado/areas`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json())
      ]);
      setCampus(Array.isArray(c) ? c : []);
      setEventos(Array.isArray(ev) ? ev : (ev?.events || []));
      setAreas(Array.isArray(ar) ? ar : []);
    } catch { /* opcional */ }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setNome(''); setDescricao(''); setChannel('whatsapp'); setSendDelaySeconds('0.5');
    setAudienceType('filter'); setGroupId(''); setIndividualContact(''); setIndividualName('');
    setFilterSources([emptySource()]); setFilterDeduplicateBy('phone');
    setSteps([emptyStep(1)]);
  };

  const abrirCriar = () => { setEditando(null); resetForm(); fetchListas(); setDialogOpen(true); };

  const abrirEditar = (seq) => {
    setEditando(seq);
    setNome(seq.name); setDescricao(seq.description || ''); setChannel(seq.channel);
    setSendDelaySeconds(String((seq.sendDelayMs ?? 500) / 1000));
    setAudienceType(seq.audienceType);
    setGroupId(seq.audienceType === 'group' ? (seq.audienceConfig?.groupId || '') : '');
    setIndividualContact(seq.audienceType === 'individual' ? (seq.audienceConfig?.contact || '') : '');
    setIndividualName(seq.audienceType === 'individual' ? (seq.audienceConfig?.name || '') : '');
    const savedSources = seq.audienceType === 'filter' && seq.audienceConfig?.sources?.length
      ? seq.audienceConfig.sources : [emptySource()];
    setFilterSources(savedSources); setFilterDeduplicateBy(seq.audienceConfig?.deduplicateBy || 'phone');
    const existingSteps = (seq.steps || []).map((s) => ({ ...s, _key: s.id, scheduledAt: s.scheduledAt ? s.scheduledAt.slice(0, 16) : '' }));
    setSteps(existingSteps.length ? existingSteps : [emptyStep(1)]);
    fetchListas();
    setDialogOpen(true);
  };

  const handleAudienceTypeChange = (e) => {
    const val = e.target.value;
    setAudienceType(val);
    if (val !== 'group') setGroupId('');
    if (val !== 'individual') { setIndividualContact(''); setIndividualName(''); }
    if (val !== 'filter') setFilterSources([emptySource()]);
  };

  // Source builder handlers
  const handleSourceChange = (index, field, value) => {
    setFilterSources((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      if (field === 'type') {
        const defaultContact = (CONTACT_FIELDS[value] || [])[0]?.value || 'whatsapp';
        return {
          ...s, type: value, filters: {}, contactField: defaultContact
        };
      }
      return { ...s, [field]: value };
    }));
  };
  const handleFilterChange = (index, key, value) => {
    setFilterSources((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      const filters = { ...s.filters };
      if (value === '' || (Array.isArray(value) && !value.length)) delete filters[key];
      else filters[key] = value;
      return { ...s, filters };
    }));
  };

  // Steps handlers
  const addStep = () => setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  const removeStep = (idx) => setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepOrder: i + 1 })));
  const updateStep = (idx, field, value) => setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

  const buildAudienceConfig = () => {
    if (audienceType === 'group') return { groupId };
    if (audienceType === 'individual') return { contact: individualContact, name: individualName };
    return { sources: filterSources, deduplicateBy: filterDeduplicateBy };
  };

  const handleSalvar = async () => {
    if (!nome.trim()) { setNotification('Informe o nome da sequência.'); return; }
    if (!steps.length) { setNotification('Adicione ao menos um step.'); return; }
    const hasMsg = steps.every((s) => s.templateId || s.customMessage?.trim());
    if (!hasMsg) { setNotification('Todos os steps precisam ter uma mensagem ou template.'); return; }
    setSaving(true);
    const delayMs = Math.round(parseFloat(sendDelaySeconds || '0') * 1000);
    const payload = {
      name: nome,
      description: descricao,
      channel,
      audienceType,
      audienceConfig: buildAudienceConfig(),
      sendDelayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 500,
      steps: steps.map((s, i) => ({
        stepOrder: i + 1,
        name: s.name || null,
        templateId: s.templateId || null,
        customMessage: s.customMessage || null,
        scheduledAt: s.scheduledAt || null
      }))
    };
    try {
      const url = editando
        ? `${API_URL}/api/admin/notificacoes/sequencias/${editando.id}`
        : `${API_URL}/api/admin/notificacoes/sequencias`;
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao salvar');
      setNotification(editando ? 'Sequência atualizada!' : 'Sequência criada!');
      setDialogOpen(false);
      fetchAll();
    } catch (e) { setNotification(e.message); } finally { setSaving(false); }
  };

  const handleAtivar = async (seq) => {
    const ok = await confirm({
      title: 'Ativar sequência', message: `Ativar "${seq.name}"? O scheduler vai disparar os steps conforme as datas agendadas.`, confirmText: 'Ativar', confirmColor: 'success'
    });
    if (!ok) return;
    const res = await fetch(`${API_URL}/api/admin/notificacoes/sequencias/${seq.id}/ativar`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}` }
    });
    const data = await res.json();
    if (!res.ok) { setNotification(data.erro || 'Erro'); return; }
    setNotification('Sequência ativada!');
    fetchAll();
  };

  const handlePausar = async (seq) => {
    const res = await fetch(`${API_URL}/api/admin/notificacoes/sequencias/${seq.id}/pausar`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}` }
    });
    const data = await res.json();
    if (!res.ok) { setNotification(data.erro || 'Erro'); return; }
    setNotification('Sequência pausada.');
    fetchAll();
  };

  const handleDispararStep = async (seq, step) => {
    const ok = await confirm({
      title: 'Disparar step agora', message: `Disparar "${step.name || `Step ${step.stepOrder}`}" de "${seq.name}" imediatamente?`, confirmText: 'Disparar', confirmColor: 'primary', severity: 'warning'
    });
    if (!ok) return;
    setDisparandoStep(step.id);
    try {
      const res = await fetch(`${API_URL}/api/admin/notificacoes/sequencias/${seq.id}/steps/${step.id}/disparar`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro');
      setNotification(data.mensagem || 'Disparo iniciado!');
      fetchAll();
    } catch (e) { setNotification(e.message); } finally { setDisparandoStep(null); }
  };

  const handleDeletar = async (seq) => {
    const ok = await confirm({
      title: 'Excluir sequência', message: `Excluir "${seq.name}" e todos os seus steps?`, confirmText: 'Excluir', confirmColor: 'error', severity: 'error'
    });
    if (!ok) return;
    const res = await fetch(`${API_URL}/api/admin/notificacoes/sequencias/${seq.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
    });
    if (res.ok) { setNotification('Sequência excluída.'); fetchAll(); } else setNotification('Erro ao excluir.');
  };

  return (
    <div>
      <Helmet><title>Sequências de Campanha</title></Helmet>
      <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Box flex={1}>
          <Typography variant="h6">Sequências de Campanha</Typography>
          <Typography variant="caption" color="textSecondary">
            Séries de mensagens diferentes enviadas em datas específicas para a mesma audiência
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCriar}>Nova Sequência</Button>
      </Toolbar>

      {sequencias.length === 0 && (
        <Box px={2} py={4} textAlign="center">
          <Typography color="textSecondary">Nenhuma sequência criada ainda.</Typography>
        </Box>
      )}

      <Box display="flex" flexDirection="column" gap={2} px={2} pb={3}>
        {sequencias.map((seq) => {
          const statusCfg = STATUS_CFG[seq.status] || { label: seq.status, color: 'default' };
          const sentSteps = (seq.steps || []).filter((s) => s.status === 'sent').length;
          const totalSteps = (seq.steps || []).length;
          return (
            <Card key={seq.id} variant="outlined">
              <CardContent sx={{ pb: '8px !important' }}>
                {/* Cabeçalho */}
                <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                  <Typography variant="subtitle1" fontWeight={600} flex={1}>{seq.name}</Typography>
                  <Chip size="small" label={statusCfg.label} color={statusCfg.color} />
                  <Chip size="small" variant="outlined" label={`${sentSteps}/${totalSteps} steps`} />
                  {seq.description && (
                    <Typography variant="caption" color="textSecondary" display="block" width="100%">{seq.description}</Typography>
                  )}
                </Box>

                {/* Steps */}
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40 }}>#</TableCell>
                      <TableCell>Nome do step</TableCell>
                      <TableCell>Agendado para</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Enviados</TableCell>
                      <TableCell sx={{ width: 56 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(seq.steps || []).map((step) => {
                      const sCfg = STEP_STATUS_CFG[step.status] || { label: step.status, color: 'default' };
                      const isDisparando = disparandoStep === step.id;
                      return (
                        <TableRow key={step.id}>
                          <TableCell>{step.stepOrder}</TableCell>
                          <TableCell>{step.name || <Typography variant="caption" color="textSecondary">—</Typography>}</TableCell>
                          <TableCell>
                            {step.scheduledAt
                              ? <Typography variant="body2">{new Date(step.scheduledAt).toLocaleString('pt-BR')}</Typography>
                              : <Typography variant="caption" color="textSecondary">Manual</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={isDisparando ? 'Iniciando…' : sCfg.label} color={sCfg.color} />
                          </TableCell>
                          <TableCell align="right">
                            {step.totalSent != null
                              ? <Typography variant="body2">{step.totalSent}/{step.totalRecipients}</Typography>
                              : <Typography variant="caption" color="textSecondary">—</Typography>}
                            {step.totalFailed > 0 && (
                              <Typography variant="caption" color="error" display="block">{step.totalFailed} falhas</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {step.status === 'pending' && (
                              <Tooltip title="Disparar agora">
                                <IconButton size="small" color="primary" disabled={isDisparando}
                                  onClick={() => handleDispararStep(seq, step)}>
                                  <SendIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Ações da sequência */}
                <Box display="flex" gap={1} mt={1.5} justifyContent="flex-end">
                  {seq.status === 'draft' && (
                    <Button size="small" startIcon={<PlayArrowIcon />} color="success" variant="outlined" onClick={() => handleAtivar(seq)}>
                      Ativar
                    </Button>
                  )}
                  {seq.status === 'active' && (
                    <Button size="small" startIcon={<PauseIcon />} color="warning" variant="outlined" onClick={() => handlePausar(seq)}>
                      Pausar
                    </Button>
                  )}
                  {seq.status === 'paused' && (
                    <Button size="small" startIcon={<PlayArrowIcon />} color="success" variant="outlined" onClick={() => handleAtivar(seq)}>
                      Retomar
                    </Button>
                  )}
                  {['draft', 'paused'].includes(seq.status) && (
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => abrirEditar(seq)}><EditIcon /></IconButton>
                    </Tooltip>
                  )}
                  {seq.status !== 'completed' && (
                    <Tooltip title="Excluir">
                      <IconButton size="small" color="error" onClick={() => handleDeletar(seq)}><DeleteIcon /></IconButton>
                    </Tooltip>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* ── Dialog criar / editar ── */}
      <Dialog open={dialogOpen} onClose={() => { if (!saving) setDialogOpen(false); }} fullWidth maxWidth="md">
        <DialogTitle>{editando ? 'Editar Sequência' : 'Nova Sequência de Campanha'}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>

            <TextField label="Nome da sequência" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth required />
            <TextField label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} fullWidth multiline minRows={2} />

            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField select label="Canal" value={channel} onChange={(e) => setChannel(e.target.value)} sx={{ minWidth: 160 }}>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="email">E-mail</MenuItem>
              </TextField>
              <TextField label="Intervalo entre envios (s)" type="number" size="small"
                value={sendDelaySeconds} onChange={(e) => setSendDelaySeconds(e.target.value)}
                inputProps={{ min: 0, step: 0.1 }} sx={{ maxWidth: 200 }}
                helperText="Por step" />
            </Box>

            <Divider><Typography variant="caption">Audiência</Typography></Divider>

            <TextField select label="Tipo de audiência" value={audienceType} onChange={handleAudienceTypeChange}>
              {AUDIENCE_TYPES.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
            </TextField>

            {audienceType === 'group' && (
              <TextField select label="Grupo" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <MenuItem value="">Selecione um grupo</MenuItem>
                {grupos.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </TextField>
            )}
            {audienceType === 'individual' && (
              <Box display="flex" gap={2}>
                <TextField label="Contato" value={individualContact} onChange={(e) => setIndividualContact(e.target.value)} fullWidth />
                <TextField label="Nome" value={individualName} onChange={(e) => setIndividualName(e.target.value)} fullWidth />
              </Box>
            )}
            {audienceType === 'filter' && (
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField select label="Deduplicar por" value={filterDeduplicateBy}
                  onChange={(e) => setFilterDeduplicateBy(e.target.value)} sx={{ maxWidth: 220 }}>
                  <MenuItem value="phone">Telefone</MenuItem>
                  <MenuItem value="email">E-mail</MenuItem>
                </TextField>
                {filterSources.map((source, index) => (
                  <Accordion key={index} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" fontWeight={600}>
                        Source {index + 1}: {SOURCE_TYPES.find((t) => t.value === source.type)?.label || source.type}
                      </Typography>
                      {filterSources.length > 1 && (
                        <IconButton size="small" color="error" sx={{ ml: 'auto' }}
                          onClick={(e) => { e.stopPropagation(); setFilterSources((p) => p.filter((_, i) => i !== index)); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box display="flex" flexDirection="column" gap={2}>
                        <TextField select label="Tipo" value={source.type} onChange={(e) => handleSourceChange(index, 'type', e.target.value)}>
                          {SOURCE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </TextField>
                        <TextField select label="Campo de contato" value={source.contactField} onChange={(e) => handleSourceChange(index, 'contactField', e.target.value)}>
                          {(CONTACT_FIELDS[source.type] || []).map((cf) => <MenuItem key={cf.value} value={cf.value}>{cf.label}</MenuItem>)}
                        </TextField>
                        <Divider><Typography variant="caption" color="textSecondary">Filtros</Typography></Divider>
                        <SourceFilters source={source} index={index} onChange={handleFilterChange}
                          campus={campus} eventos={eventos} areas={areas} />
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
                <Button variant="outlined" size="small" startIcon={<AddIcon />}
                  onClick={() => setFilterSources((p) => [...p, emptySource()])} sx={{ alignSelf: 'flex-start' }}>
                  Adicionar source
                </Button>
              </Box>
            )}

            <Divider><Typography variant="caption">Steps (Mensagens da Sequência)</Typography></Divider>

            <Alert severity="info" sx={{ py: 0 }}>
              Cada step tem sua própria mensagem e data de disparo. O scheduler envia automaticamente
              quando a data chega e a sequência está ativa. Você também pode disparar manualmente.
            </Alert>

            {steps.map((step, idx) => (
              <Card key={step._key || idx} variant="outlined">
                <CardContent sx={{ pb: '8px !important' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <DragIndicatorIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    <Typography variant="subtitle2" flex={1}>Step {idx + 1}</Typography>
                    {steps.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => removeStep(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <TextField label="Nome do step (opcional)" size="small" value={step.name || ''}
                        onChange={(e) => updateStep(idx, 'name', e.target.value)} sx={{ flex: 1, minWidth: 200 }}
                        placeholder={`Ex: Semana ${idx + 1} — Lembrete`} />
                      <TextField label="Data de disparo (opcional)" type="datetime-local" size="small"
                        value={step.scheduledAt || ''} onChange={(e) => updateStep(idx, 'scheduledAt', e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={{ minWidth: 220 }}
                        helperText="Vazio = disparo manual" />
                    </Box>
                    <TextField select label="Template" size="small" value={step.templateId || ''}
                      onChange={(e) => { updateStep(idx, 'templateId', e.target.value); if (e.target.value) updateStep(idx, 'customMessage', ''); }}>
                      <MenuItem value="">Nenhum (mensagem personalizada)</MenuItem>
                      {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </TextField>
                    {!step.templateId && (
                      <TextField label="Mensagem" multiline minRows={3} size="small"
                        value={step.customMessage || ''} onChange={(e) => updateStep(idx, 'customMessage', e.target.value)}
                        placeholder="Use {{nome}} para personalizar. Esta mensagem é exclusiva deste step." />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}

            <Button variant="outlined" startIcon={<AddIcon />} onClick={addStep} sx={{ alignSelf: 'flex-start' }}>
              Adicionar step
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSalvar} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
      {ConfirmDialog}
    </div>
  );
}
