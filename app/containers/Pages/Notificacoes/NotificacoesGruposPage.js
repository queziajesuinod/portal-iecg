import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, MenuItem, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Toolbar, Tooltip, Typography,
  Accordion, AccordionSummary, AccordionDetails, FormControl, InputLabel,
  Select, OutlinedInput, Checkbox, ListItemText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PeopleIcon from '@mui/icons-material/People';
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
        label="Data inicial (opcional)"
        type="date"
        size="small"
        InputLabelProps={{ shrink: true }}
        value={f.dateFrom || ''}
        onChange={(e) => handleFilterChange(index, 'dateFrom', e.target.value)}
      />
      <TextField
        label="Data final (opcional)"
        type="date"
        size="small"
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

SourceFilters.propTypes = {
  source: PropTypes.shape({ type: PropTypes.string, filters: PropTypes.object }).isRequired,
  index: PropTypes.number.isRequired,
  handleFilterChange: PropTypes.func.isRequired,
  campus: PropTypes.arrayOf(PropTypes.object).isRequired,
  eventos: PropTypes.arrayOf(PropTypes.object).isRequired,
  areas: PropTypes.arrayOf(PropTypes.object).isRequired,
  ministerios: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default function NotificacoesGruposPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [grupos, setGrupos] = useState([]);
  const [notification, setNotification] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [deduplicateBy, setDeduplicateBy] = useState('phone');
  const [sources, setSources] = useState([emptySource()]);
  const [previewTotal, setPreviewTotal] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // listas de apoio para os filtros
  const [campus, setCampus] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [ministerios, setMinisterios] = useState([]);

  const token = () => localStorage.getItem('token');

  const fetchGrupos = async () => {
    const res = await fetch(`${API_URL}/api/admin/notificacoes/grupos`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    setGrupos(Array.isArray(data) ? data : []);
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
      // listas de apoio são opcionais, não bloqueia a UI
    }
  };

  useEffect(() => {
    fetchGrupos();
    // Atualiza a contagem de audiência automaticamente a cada 30s
    const interval = setInterval(fetchGrupos, 30000);
    return () => clearInterval(interval);
  }, []);

  const abrirCriar = () => {
    setEditando(null);
    setNome('');
    setDescricao('');
    setDeduplicateBy('phone');
    setSources([emptySource()]);
    setPreviewTotal(null);
    fetchListas();
    setDialogOpen(true);
  };

  const abrirEditar = (grupo) => {
    setEditando(grupo);
    setNome(grupo.name);
    setDescricao(grupo.description || '');
    setDeduplicateBy(grupo.deduplicateBy || 'phone');
    setSources(grupo.sources?.length ? grupo.sources : [emptySource()]);
    setPreviewTotal(null);
    fetchListas();
    setDialogOpen(true);
  };

  const fecharDialog = () => { if (!saving) setDialogOpen(false); };

  const handleSourceChange = (index, field, value) => {
    setSources((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      // ao mudar o tipo, resetar filtros e contactField
      if (field === 'type') {
        const defaultContact = (CONTACT_FIELDS[value] || [])[0]?.value || 'whatsapp';
        return {
          ...s, type: value, filters: {}, contactField: defaultContact
        };
      }
      return { ...s, [field]: value };
    }));
    setPreviewTotal(null);
  };

  const handleFilterChange = (index, filterKey, value) => {
    setSources((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      const filters = { ...s.filters };
      if (value === '' || (Array.isArray(value) && !value.length)) {
        delete filters[filterKey];
      } else {
        filters[filterKey] = value;
      }
      return { ...s, filters };
    }));
    setPreviewTotal(null);
  };

  const adicionarSource = () => setSources((prev) => [...prev, emptySource()]);
  const removerSource = (index) => setSources((prev) => prev.filter((_, i) => i !== index));

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/notificacoes/grupos/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ sources, deduplicateBy })
      });
      const data = await res.json();
      setPreviewTotal(data.total ?? 0);
    } catch {
      setNotification('Erro ao calcular prévia.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!nome.trim()) { setNotification('Informe o nome do grupo.'); return; }
    setSaving(true);
    const payload = {
      name: nome, description: descricao, sources, deduplicateBy
    };
    try {
      const url = editando
        ? `${API_URL}/api/admin/notificacoes/grupos/${editando.id}`
        : `${API_URL}/api/admin/notificacoes/grupos`;
      const method = editando ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao salvar');
      setNotification(editando ? 'Grupo atualizado!' : 'Grupo criado!');
      setDialogOpen(false);
      fetchGrupos();
    } catch (e) {
      setNotification(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletar = async (grupo) => {
    const ok = await confirm({
      title: 'Excluir grupo', message: `Excluir "${grupo.name}"?`, confirmText: 'Excluir', confirmColor: 'error', severity: 'error'
    });
    if (!ok) return;
    const res = await fetch(`${API_URL}/api/admin/notificacoes/grupos/${grupo.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
    });
    if (res.ok) { setNotification('Grupo excluído.'); fetchGrupos(); } else setNotification('Erro ao excluir.');
  };

  return (
    <div>
      <Helmet><title>Grupos de Audiência</title></Helmet>
      <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Grupos de Audiência</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCriar}>Novo Grupo</Button>
      </Toolbar>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Sources</TableCell>
              <TableCell>Deduplicar por</TableCell>
              <TableCell align="center">Audiência</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grupos.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">Nenhum grupo cadastrado.</TableCell></TableRow>
            )}
            {grupos.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{g.name}</TableCell>
                <TableCell>{g.description || '-'}</TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {(g.sources || []).map((s, i) => (
                      <Chip key={i} size="small" label={SOURCE_TYPES.find((t) => t.value === s.type)?.label || s.type} />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{g.deduplicateBy === 'email' ? 'E-mail' : 'Telefone'}</TableCell>
                <TableCell align="center">
                  {g.previewCount != null ? (
                    <Tooltip title={g.previewUpdatedAt ? `Atualizado em ${new Date(g.previewUpdatedAt).toLocaleString('pt-BR')}` : 'Contagem disponível'}>
                      <Chip size="small" label={`${g.previewCount} contato${g.previewCount !== 1 ? 's' : ''}`} color="primary" variant="outlined" />
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="textSecondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title="Editar"><IconButton size="small" onClick={() => abrirEditar(g)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Excluir"><IconButton size="small" color="error" onClick={() => handleDeletar(g)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={fecharDialog} fullWidth maxWidth="md">
        <DialogTitle>{editando ? 'Editar Grupo' : 'Novo Grupo de Audiência'}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Nome do grupo" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth required />
            <TextField label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} fullWidth multiline minRows={2} />
            <TextField select label="Deduplicar contatos por" value={deduplicateBy} onChange={(e) => setDeduplicateBy(e.target.value)} sx={{ maxWidth: 220 }}>
              <MenuItem value="phone">Telefone</MenuItem>
              <MenuItem value="email">E-mail</MenuItem>
            </TextField>

            <Divider />
            <Typography variant="subtitle2">Sources (fontes de dados)</Typography>

            {sources.map((source, index) => (
              <Accordion key={index} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight={600}>
                    Source {index + 1}: {SOURCE_TYPES.find((t) => t.value === source.type)?.label || source.type}
                  </Typography>
                  {sources.length > 1 && (
                    <IconButton size="small" color="error" sx={{ ml: 'auto' }}
                      onClick={(e) => { e.stopPropagation(); removerSource(index); }}>
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
                      {(CONTACT_FIELDS[source.type] || []).map((c) => (
                        <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                      ))}
                    </TextField>

                    <Divider><Typography variant="caption" color="textSecondary">Filtros</Typography></Divider>

                    <SourceFilters
                      source={source}
                      index={index}
                      handleFilterChange={handleFilterChange}
                      campus={campus}
                      eventos={eventos}
                      areas={areas}
                      ministerios={ministerios}
                    />

                    <Typography variant="caption" color="textSecondary">
                      Deixe os filtros em branco para incluir todos os registros deste source.
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}

            <Button variant="outlined" startIcon={<AddIcon />} onClick={adicionarSource} sx={{ alignSelf: 'flex-start' }}>
              Adicionar source
            </Button>

            <Box display="flex" alignItems="center" gap={2}>
              <Button variant="outlined" startIcon={<PeopleIcon />} onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? 'Calculando...' : 'Calcular prévia'}
              </Button>
              {previewTotal !== null && (
                <Chip label={`${previewTotal} contato(s) únicos`} color="primary" />
              )}
            </Box>
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
