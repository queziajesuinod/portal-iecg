import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, ListItemText, MenuItem, OutlinedInput,
  Paper, Select, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Toolbar, Tooltip, Typography,
  ToggleButton, ToggleButtonGroup
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MonitorIcon from '@mui/icons-material/Assessment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PeopleIcon from '@mui/icons-material/People';
import { useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Notification from 'dan-components/Notification/Notification';
import { TableSkeleton } from '../../../components/Skeleton';
import { useConfirm } from '../../../utils/useConfirm';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const STATUS_CHIP = {
  draft: { label: 'Rascunho', color: 'default' },
  scheduled: { label: 'Agendada', color: 'info' },
  sending: { label: 'Enviando...', color: 'warning' },
  sent: { label: 'Enviada', color: 'success' },
  failed: { label: 'Falhou', color: 'error' },
  cancelled: { label: 'Cancelada', color: 'default' }
};

const AUDIENCE_TYPES = [
  { value: 'group', label: 'Grupo salvo' },
  { value: 'filter', label: 'Filtro rápido' },
  { value: 'individual', label: 'Envio individual' }
];

const RECURRENCE_TYPES = [
  { value: 'once', label: 'Única vez' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal (todo dia 1º)' }
];

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ── Source builder (filtro rápido) ─────────────────────────────────────────────
const SOURCE_TYPES = [
  { value: 'members', label: 'Membros' },
  { value: 'registrations', label: 'Inscrições de Eventos' },
  { value: 'apelos', label: 'Apelos (pessoa)' },
  { value: 'liders_apelos', label: 'Líderes que receberam apelos' },
  { value: 'voluntarios', label: 'Voluntários' }
];

const CONTACT_FIELDS = {
  members: [{ value: 'whatsapp', label: 'WhatsApp/Telefone' }, { value: 'email', label: 'E-mail' }],
  registrations: [{ value: 'buyer_phone', label: 'Telefone do comprador' }, { value: 'email', label: 'E-mail do comprador' }],
  apelos: [{ value: 'whatsapp', label: 'WhatsApp do apelo' }],
  liders_apelos: [{ value: 'cel_lider', label: 'Celular do líder' }, { value: 'email', label: 'E-mail do líder' }],
  voluntarios: [{ value: 'whatsapp', label: 'WhatsApp/Telefone' }, { value: 'email', label: 'E-mail' }]
};

const MEMBER_STATUSES = ['VISITANTE', 'CONGREGADO', 'MEMBRO', 'INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'];
const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pendente' },
  { value: 'partial', label: 'Parcial' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'free', label: 'Gratuito' }
];
const VOLUNTARIO_STATUSES = ['PENDENTE', 'APROVADO', 'ENCERRADO'];

const emptySource = () => ({ type: 'members', filters: {}, contactField: 'whatsapp' });

function MultiSelect({
  label, value = [], options, onChange
}) {
  return (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={(e) => onChange(e.target.value)}
        input={<OutlinedInput label={label} />}
        renderValue={(sel) => sel.join(', ')}
      >
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
  source, index, handleFilterChange, campus, eventos, areas, ministerios
}) {
  const f = source.filters || {};
  const { type } = source;

  const dateFields = (
    <>
      <TextField
        label="Data inicial (opcional)" type="date" size="small"
        InputLabelProps={{ shrink: true }}
        value={f.dateFrom || ''}
        onChange={(e) => handleFilterChange(index, 'dateFrom', e.target.value)}
      />
      <TextField
        label="Data final (opcional)" type="date" size="small"
        InputLabelProps={{ shrink: true }}
        value={f.dateTo || ''}
        onChange={(e) => handleFilterChange(index, 'dateTo', e.target.value)}
      />
    </>
  );

  if (type === 'members') {
    return (
      <>
        <MultiSelect
          label="Status do membro (opcional)"
          value={f.status || []}
          options={MEMBER_STATUSES}
          onChange={(v) => handleFilterChange(index, 'status', v)}
        />
        <TextField
          select label="Campus (opcional)" size="small"
          value={f.campusId || ''}
          onChange={(e) => handleFilterChange(index, 'campusId', e.target.value)}
        >
          <MenuItem value="">Todos os campus</MenuItem>
          {campus.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome || c.name}</MenuItem>)}
        </TextField>
        {dateFields}
      </>
    );
  }

  if (type === 'registrations') {
    return (
      <>
        <TextField
          select label="Evento (opcional)" size="small"
          value={f.eventId || ''}
          onChange={(e) => handleFilterChange(index, 'eventId', e.target.value)}
        >
          <MenuItem value="">Todos os eventos</MenuItem>
          {eventos.map((ev) => <MenuItem key={ev.id} value={ev.id}>{ev.name || ev.title}</MenuItem>)}
        </TextField>
        <MultiSelect
          label="Status do pagamento (opcional)"
          value={f.paymentStatus || []}
          options={PAYMENT_STATUSES}
          onChange={(v) => handleFilterChange(index, 'paymentStatus', v)}
        />
        {dateFields}
      </>
    );
  }

  if (type === 'apelos') {
    return (
      <>
        <TextField
          label="Status do apelo (opcional)" size="small"
          value={f.statusApelo || ''}
          onChange={(e) => handleFilterChange(index, 'statusApelo', e.target.value)}
          placeholder="ex: Recebido, Pendente..."
        />
        <TextField
          label="Decisão (opcional)" size="small"
          value={f.decisao || ''}
          onChange={(e) => handleFilterChange(index, 'decisao', e.target.value)}
          placeholder="ex: Aceito, Rejeitado..."
        />
        <TextField
          label="Rede (opcional)" size="small"
          value={f.rede || ''}
          onChange={(e) => handleFilterChange(index, 'rede', e.target.value)}
        />
        <TextField
          label="Campus IECG (opcional)" size="small"
          value={f.campusIecg || ''}
          onChange={(e) => handleFilterChange(index, 'campusIecg', e.target.value)}
        />
        {dateFields}
      </>
    );
  }

  if (type === 'liders_apelos') {
    return (
      <>
        <TextField
          label="Status do apelo (opcional)" size="small"
          value={f.statusApelo || ''}
          onChange={(e) => handleFilterChange(index, 'statusApelo', e.target.value)}
          placeholder="ex: Recebido, Pendente..."
        />
        <TextField
          label="Decisão (opcional)" size="small"
          value={f.decisao || ''}
          onChange={(e) => handleFilterChange(index, 'decisao', e.target.value)}
        />
        <TextField
          label="Rede (opcional)" size="small"
          value={f.rede || ''}
          onChange={(e) => handleFilterChange(index, 'rede', e.target.value)}
        />
        <TextField
          select label="Campus do líder (opcional)" size="small"
          value={f.campusId || ''}
          onChange={(e) => handleFilterChange(index, 'campusId', e.target.value)}
        >
          <MenuItem value="">Todos os campus</MenuItem>
          {campus.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome || c.name}</MenuItem>)}
        </TextField>
        {dateFields}
      </>
    );
  }

  if (type === 'voluntarios') {
    return (
      <>
        <MultiSelect
          label="Status do voluntário (opcional)"
          value={f.status || []}
          options={VOLUNTARIO_STATUSES}
          onChange={(v) => handleFilterChange(index, 'status', v)}
        />
        <TextField
          select label="Campus (opcional)" size="small"
          value={f.campusId || ''}
          onChange={(e) => handleFilterChange(index, 'campusId', e.target.value)}
        >
          <MenuItem value="">Todos os campus</MenuItem>
          {campus.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome || c.name}</MenuItem>)}
        </TextField>
        <TextField
          select label="Ministério (opcional)" size="small"
          value={f.ministerioId || ''}
          onChange={(e) => handleFilterChange(index, 'ministerioId', e.target.value)}
        >
          <MenuItem value="">Todos os ministérios</MenuItem>
          {ministerios.map((m) => <MenuItem key={m.id} value={m.id}>{m.name || m.nome}</MenuItem>)}
        </TextField>
        <TextField
          select label="Área de voluntariado (opcional)" size="small"
          value={f.areaVoluntariadoId || ''}
          onChange={(e) => handleFilterChange(index, 'areaVoluntariadoId', e.target.value)}
        >
          <MenuItem value="">Todas as áreas</MenuItem>
          {areas.map((a) => <MenuItem key={a.id} value={a.id}>{a.nome || a.name}</MenuItem>)}
        </TextField>
        {dateFields}
      </>
    );
  }

  return dateFields;
}

// ──────────────────────────────────────────────────────────────────────────────

function recurrenceLabel(c) {
  if (!c.recurrenceType || c.recurrenceType === 'once') return null;
  if (c.recurrenceType === 'daily') return `Diário às ${c.recurrenceTime || ''}`;
  if (c.recurrenceType === 'weekly') {
    const days = (c.recurrenceDays || []).map((d) => DAYS_PT[d]).join(', ');
    return `Semanal (${days || '?'}) às ${c.recurrenceTime || ''}`;
  }
  if (c.recurrenceType === 'monthly') return `Mensal às ${c.recurrenceTime || ''}`;
  return c.recurrenceType;
}

SourceFilters.propTypes = {
  source: PropTypes.shape({ type: PropTypes.string, filters: PropTypes.object }).isRequired,
  index: PropTypes.number.isRequired,
  handleFilterChange: PropTypes.func.isRequired,
  campus: PropTypes.arrayOf(PropTypes.object).isRequired,
  eventos: PropTypes.arrayOf(PropTypes.object).isRequired,
  areas: PropTypes.arrayOf(PropTypes.object).isRequired,
  ministerios: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default function NotificacoesCampanhasPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [campanhas, setCampanhas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [notification, setNotification] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [disparando, setDisparando] = useState(null);

  // campos do formulário
  const [nome, setNome] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [evolutionInstance, setEvolutionInstance] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [audienceType, setAudienceType] = useState('filter');
  const [groupId, setGroupId] = useState('');
  const [individualContact, setIndividualContact] = useState('');
  const [individualName, setIndividualName] = useState('');
  // filtro rápido
  const [filterSources, setFilterSources] = useState([emptySource()]);
  const [filterDeduplicateBy, setFilterDeduplicateBy] = useState('phone');
  const [filterPreviewTotal, setFilterPreviewTotal] = useState(null);
  const [filterPreviewLoading, setFilterPreviewLoading] = useState(false);
  // listas de apoio para filtros
  const [campus, setCampus] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [ministerios, setMinisterios] = useState([]);
  // agendamento
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendDelaySeconds, setSendDelaySeconds] = useState('0.5');
  const [recurrenceType, setRecurrenceType] = useState('once');
  const [recurrenceDays, setRecurrenceDays] = useState([]);
  const [recurrenceTime, setRecurrenceTime] = useState('08:00');
  const [recurrencePeriodStart, setRecurrencePeriodStart] = useState('');
  const [recurrencePeriodEnd, setRecurrencePeriodEnd] = useState('');

  const token = () => localStorage.getItem('token');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, t, g] = await Promise.all([
        fetch(`${API_URL}/api/admin/notificacoes/campanhas`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API_URL}/api/admin/notificacoes/templates`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API_URL}/api/admin/notificacoes/grupos`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json())
      ]);
      setCampanhas(Array.isArray(c) ? c : []);
      setTemplates(Array.isArray(t) ? t : []);
      setGrupos(Array.isArray(g) ? g : []);
    } finally {
      setLoading(false);
    }
  };

  const fetchListas = async () => {
    try {
      const [c, ev, ar, min] = await Promise.all([
        fetch(`${API_URL}/start/campus`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API_URL}/api/admin/events`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API_URL}/api/admin/voluntariado/areas`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API_URL}/api/admin/cultos/ministerios`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json())
      ]);
      setCampus(Array.isArray(c) ? c : []);
      setEventos(Array.isArray(ev) ? ev : (ev?.events || ev?.data || []));
      setAreas(Array.isArray(ar) ? ar : []);
      setMinisterios(Array.isArray(min) ? min : []);
    } catch {
      // listas de apoio são opcionais
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setNome(''); setChannel('whatsapp'); setEvolutionInstance(''); setTemplateId(''); setCustomMessage('');
    setAudienceType('filter'); setGroupId(''); setIndividualContact(''); setIndividualName('');
    setFilterSources([emptySource()]); setFilterDeduplicateBy('phone'); setFilterPreviewTotal(null);
    setScheduledAt(''); setSendDelaySeconds('0.5'); setRecurrenceType('once');
    setRecurrenceDays([]); setRecurrenceTime('08:00');
    setRecurrencePeriodStart(''); setRecurrencePeriodEnd('');
  };

  const abrirCriar = () => {
    setEditando(null);
    resetForm();
    fetchListas();
    setDialogOpen(true);
  };

  const abrirEditar = (c) => {
    setEditando(c);
    setNome(c.name); setChannel(c.channel); setEvolutionInstance(c.evolutionInstance || ''); setTemplateId(c.templateId || '');
    setCustomMessage(c.customMessage || ''); setAudienceType(c.audienceType);
    setGroupId(c.audienceType === 'group' ? (c.audienceConfig?.groupId || '') : '');
    setIndividualContact(c.audienceType === 'individual' ? (c.audienceConfig?.contact || '') : '');
    setIndividualName(c.audienceType === 'individual' ? (c.audienceConfig?.name || '') : '');
    const savedSources = c.audienceType === 'filter' && c.audienceConfig?.sources?.length
      ? c.audienceConfig.sources
      : [emptySource()];
    setFilterSources(savedSources);
    setFilterDeduplicateBy(c.audienceConfig?.deduplicateBy || 'phone');
    setFilterPreviewTotal(null);
    setScheduledAt(c.scheduledAt ? c.scheduledAt.slice(0, 16) : '');
    setSendDelaySeconds(String((c.sendDelayMs ?? 500) / 1000));
    setRecurrenceType(c.recurrenceType || 'once');
    setRecurrenceDays(c.recurrenceDays || []);
    setRecurrenceTime(c.recurrenceTime || '08:00');
    setRecurrencePeriodStart(c.recurrencePeriodStart || '');
    setRecurrencePeriodEnd(c.recurrencePeriodEnd || '');
    fetchListas();
    setDialogOpen(true);
  };

  const fecharDialog = () => { if (!saving) setDialogOpen(false); };

  const handleAudienceTypeChange = (e) => {
    const val = e.target.value;
    setAudienceType(val);
    // reset unrelated audience state to avoid stale values
    if (val !== 'group') setGroupId('');
    if (val !== 'individual') { setIndividualContact(''); setIndividualName(''); }
    if (val !== 'filter') { setFilterSources([emptySource()]); setFilterPreviewTotal(null); }
  };

  // source builder handlers (filtro rápido)
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
    setFilterPreviewTotal(null);
  };

  const handleFilterChange = (index, filterKey, value) => {
    setFilterSources((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      const filters = { ...s.filters };
      if (value === '' || (Array.isArray(value) && !value.length)) {
        delete filters[filterKey];
      } else {
        filters[filterKey] = value;
      }
      return { ...s, filters };
    }));
    setFilterPreviewTotal(null);
  };

  const adicionarFilterSource = () => setFilterSources((prev) => [...prev, emptySource()]);
  const removerFilterSource = (index) => setFilterSources((prev) => prev.filter((_, i) => i !== index));

  const handleFilterPreview = async () => {
    setFilterPreviewLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/notificacoes/grupos/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ sources: filterSources, deduplicateBy: filterDeduplicateBy })
      });
      const data = await res.json();
      setFilterPreviewTotal(data.total ?? 0);
    } catch {
      setNotification('Erro ao calcular prévia.');
    } finally {
      setFilterPreviewLoading(false);
    }
  };

  const buildAudienceConfig = () => {
    if (audienceType === 'group') return { groupId };
    if (audienceType === 'individual') return { contact: individualContact, name: individualName };
    if (audienceType === 'filter') return { sources: filterSources, deduplicateBy: filterDeduplicateBy };
    return {};
  };

  const handleSalvar = async () => {
    if (!nome.trim()) { setNotification('Informe o nome da campanha.'); return; }
    if (!templateId && !customMessage.trim()) { setNotification('Selecione um template ou escreva uma mensagem.'); return; }
    setSaving(true);
    const delayMs = Math.round(parseFloat(sendDelaySeconds || '0') * 1000);
    const payload = {
      name: nome,
      channel,
      templateId: templateId || null,
      customMessage: customMessage || null,
      audienceType,
      audienceConfig: buildAudienceConfig(),
      scheduledAt: scheduledAt || null,
      sendDelayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 500,
      recurrenceType,
      recurrenceDays: recurrenceType === 'weekly' ? recurrenceDays : null,
      recurrenceTime: recurrenceType !== 'once' ? recurrenceTime : null,
      recurrencePeriodStart: recurrenceType !== 'once' ? (recurrencePeriodStart || null) : null,
      recurrencePeriodEnd: recurrenceType !== 'once' ? (recurrencePeriodEnd || null) : null,
      evolutionInstance: evolutionInstance.trim() || null
    };
    try {
      const url = editando
        ? `${API_URL}/api/admin/notificacoes/campanhas/${editando.id}`
        : `${API_URL}/api/admin/notificacoes/campanhas`;
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao salvar');
      setNotification(editando ? 'Campanha atualizada!' : 'Campanha criada!');
      setDialogOpen(false);
      fetchAll();
    } catch (e) {
      setNotification(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisparar = async (campanha) => {
    const ok = await confirm({
      title: 'Disparar campanha',
      message: `Disparar "${campanha.name}" agora? Os destinatários receberão a mensagem imediatamente.`,
      confirmText: 'Disparar',
      confirmColor: 'primary',
      severity: 'warning'
    });
    if (!ok) return;
    setDisparando(campanha.id);
    try {
      const res = await fetch(`${API_URL}/api/admin/notificacoes/campanhas/${campanha.id}/disparar`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao disparar');
      setNotification(data.mensagem || 'Disparo iniciado!');
      fetchAll();
      history.push(`/app/notificacoes/monitor/${campanha.id}`);
    } catch (e) {
      setNotification(e.message);
    } finally {
      setDisparando(null);
    }
  };

  const handleDeletar = async (campanha) => {
    const ok = await confirm({
      title: 'Excluir campanha', message: `Excluir "${campanha.name}"?`, confirmText: 'Excluir', confirmColor: 'error', severity: 'error'
    });
    if (!ok) return;
    const res = await fetch(`${API_URL}/api/admin/notificacoes/campanhas/${campanha.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
    });
    if (res.ok) { setNotification('Campanha excluída.'); fetchAll(); } else setNotification('Erro ao excluir.');
  };

  if (loading) return <Box p={2}><TableSkeleton cols={6} /></Box>;

  return (
    <div>
      <Helmet><title>Campanhas de Notificação</title></Helmet>
      <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Campanhas</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCriar}>Nova Campanha</Button>
      </Toolbar>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Canal</TableCell>
              <TableCell>Audiência</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Último envio</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campanhas.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">Nenhuma campanha.</TableCell></TableRow>
            )}
            {campanhas.map((c) => {
              const statusCfg = STATUS_CHIP[c.status] || { label: c.status, color: 'default' };
              const isDisparando = disparando === c.id;
              const recLabel = recurrenceLabel(c);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Typography variant="body2">{c.name}</Typography>
                    {recLabel && <Typography variant="caption" color="textSecondary">{recLabel}</Typography>}
                    {c.nextRunAt && (
                      <Typography variant="caption" color="primary" display="block">
                        Próximo: {new Date(c.nextRunAt).toLocaleString('pt-BR')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell><Chip size="small" label={c.channel} /></TableCell>
                  <TableCell>{AUDIENCE_TYPES.find((a) => a.value === c.audienceType)?.label || c.audienceType}</TableCell>
                  <TableCell>
                    <Chip size="small" label={isDisparando ? 'Iniciando...' : statusCfg.label} color={statusCfg.color} />
                    {c.scheduledAt && c.status === 'scheduled' && !c.nextRunAt && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        {new Date(c.scheduledAt).toLocaleString('pt-BR')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.totalSent != null ? `${c.totalSent}/${c.totalRecipients}` : '-'}
                    {c.totalFailed > 0 && (
                      <Typography variant="caption" color="error" display="block">{c.totalFailed} falhas</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      {['draft', 'scheduled'].includes(c.status) && (
                        <>
                          <Tooltip title="Editar"><IconButton size="small" onClick={() => abrirEditar(c)}><EditIcon /></IconButton></Tooltip>
                          <Tooltip title="Disparar agora"><IconButton size="small" color="primary" disabled={isDisparando} onClick={() => handleDisparar(c)}><SendIcon /></IconButton></Tooltip>
                        </>
                      )}
                      <Tooltip title="Monitorar">
                        <IconButton size="small" onClick={() => history.push(`/app/notificacoes/monitor/${c.id}`)}>
                          <MonitorIcon />
                        </IconButton>
                      </Tooltip>
                      {['draft', 'scheduled'].includes(c.status) && (
                        <Tooltip title="Excluir"><IconButton size="small" color="error" onClick={() => handleDeletar(c)}><DeleteIcon /></IconButton></Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Dialog de criação / edição ── */}
      <Dialog open={dialogOpen} onClose={fecharDialog} fullWidth maxWidth="md">
        <DialogTitle>{editando ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Nome da campanha" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth required />
            <TextField select label="Canal" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
              <MenuItem value="email">E-mail</MenuItem>
            </TextField>

            {channel === 'whatsapp' && (
              <TextField
                select
                label="Instância Evolution"
                value={evolutionInstance}
                onChange={(e) => setEvolutionInstance(e.target.value)}
                fullWidth
                helperText="Instância do Evolution API usada para envio. Se vazio, usa a padrão do servidor."
              >
                <MenuItem value="">Padrão do servidor</MenuItem>
                <MenuItem value="IECG">IECG</MenuItem>
                <MenuItem value="START_IECG">START_IECG</MenuItem>
              </TextField>
            )}

            <Divider><Typography variant="caption">Mensagem</Typography></Divider>
            <TextField select label="Template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <MenuItem value="">Nenhum (usar mensagem personalizada)</MenuItem>
              {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
            {!templateId && (
              <TextField
                label="Mensagem personalizada" value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                fullWidth multiline minRows={4}
                placeholder="Use {{nome}} para o nome do destinatário"
              />
            )}

            <Divider><Typography variant="caption">Audiência</Typography></Divider>
            <TextField select label="Tipo de audiência" value={audienceType} onChange={handleAudienceTypeChange}>
              {AUDIENCE_TYPES.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
            </TextField>

            {/* Grupo salvo */}
            {audienceType === 'group' && (
              <TextField select label="Grupo" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <MenuItem value="">Selecione um grupo</MenuItem>
                {grupos.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </TextField>
            )}

            {/* Envio individual */}
            {audienceType === 'individual' && (
              <>
                <TextField label="Contato (telefone ou e-mail)" value={individualContact} onChange={(e) => setIndividualContact(e.target.value)} fullWidth />
                <TextField label="Nome" value={individualName} onChange={(e) => setIndividualName(e.target.value)} fullWidth />
              </>
            )}

            {/* Filtro rápido — source builder inline */}
            {audienceType === 'filter' && (
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  select label="Deduplicar contatos por" value={filterDeduplicateBy}
                  onChange={(e) => setFilterDeduplicateBy(e.target.value)} sx={{ maxWidth: 220 }}
                >
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
                          onClick={(e) => { e.stopPropagation(); removerFilterSource(index); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box display="flex" flexDirection="column" gap={2}>
                        <TextField select label="Tipo" value={source.type}
                          onChange={(e) => handleSourceChange(index, 'type', e.target.value)}>
                          {SOURCE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </TextField>
                        <TextField select label="Campo de contato" value={source.contactField}
                          onChange={(e) => handleSourceChange(index, 'contactField', e.target.value)}>
                          {(CONTACT_FIELDS[source.type] || []).map((cf) => (
                            <MenuItem key={cf.value} value={cf.value}>{cf.label}</MenuItem>
                          ))}
                        </TextField>
                        <Divider><Typography variant="caption" color="textSecondary">Filtros</Typography></Divider>
                        <SourceFilters
                          source={source} index={index}
                          handleFilterChange={handleFilterChange}
                          campus={campus} eventos={eventos} areas={areas} ministerios={ministerios}
                        />
                        <Typography variant="caption" color="textSecondary">
                          Deixe os filtros em branco para incluir todos os registros deste source.
                        </Typography>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}

                <Button variant="outlined" startIcon={<AddIcon />} onClick={adicionarFilterSource} sx={{ alignSelf: 'flex-start' }}>
                  Adicionar source
                </Button>

                <Box display="flex" alignItems="center" gap={2}>
                  <Button variant="outlined" startIcon={<PeopleIcon />} onClick={handleFilterPreview} disabled={filterPreviewLoading}>
                    {filterPreviewLoading ? 'Calculando...' : 'Calcular prévia'}
                  </Button>
                  {filterPreviewTotal !== null && (
                    <Chip label={`${filterPreviewTotal} contato(s) únicos`} color="primary" />
                  )}
                </Box>
              </Box>
            )}

            <Divider><Typography variant="caption">Agendamento e Disparo</Typography></Divider>

            <TextField
              label="Data e hora do disparo (opcional)"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Deixe em branco para disparar manualmente"
              size="small"
            />

            <TextField
              label="Intervalo entre envios (segundos)"
              type="number"
              value={sendDelaySeconds}
              onChange={(e) => setSendDelaySeconds(e.target.value)}
              size="small"
              inputProps={{ min: 0, step: 0.1 }}
              helperText="Ex: 0.5 = meio segundo. Use 0 para sem delay (cuidado com bloqueios)."
              sx={{ maxWidth: 300 }}
            />

            <TextField
              select label="Recorrência"
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value)}
              sx={{ maxWidth: 260 }}
            >
              {RECURRENCE_TYPES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>

            {recurrenceType !== 'once' && (
              <>
                <TextField
                  label="Horário do disparo"
                  type="time"
                  value={recurrenceTime}
                  onChange={(e) => setRecurrenceTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ maxWidth: 180 }}
                />

                {recurrenceType === 'weekly' && (
                  <Box>
                    <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                      Dias da semana
                    </Typography>
                    <ToggleButtonGroup
                      value={recurrenceDays}
                      onChange={(_, v) => setRecurrenceDays(v)}
                      size="small"
                      sx={{ flexWrap: 'wrap', gap: 0.5 }}
                    >
                      {DAYS_PT.map((day, i) => (
                        <ToggleButton key={i} value={i} sx={{ minWidth: 48 }}>{day}</ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                )}

                <Box display="flex" gap={2} flexWrap="wrap">
                  <TextField
                    label="Período — início (opcional)"
                    type="date"
                    value={recurrencePeriodStart}
                    onChange={(e) => setRecurrencePeriodStart(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                  <TextField
                    label="Período — fim (opcional)"
                    type="date"
                    value={recurrencePeriodEnd}
                    onChange={(e) => setRecurrencePeriodEnd(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    helperText="Sem data = sem fim"
                  />
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialog} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSalvar} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
      {ConfirmDialog}
    </div>
  );
}
