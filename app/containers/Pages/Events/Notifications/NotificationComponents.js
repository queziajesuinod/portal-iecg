// Este arquivo contém os componentes auxiliares de notificações
// Separe em arquivos individuais conforme necessário

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Chip,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import {
  criarGrupo,
  criarTemplate,
  listarGrupos,
  listarTemplates,
  listarNotificacoes,
  obterEstatisticasNotificacoes
} from '../../../../api/notificationsApi';
import { listarInscricoesPorEvento } from '../../../../api/eventsApi';
import { adicionarMembrosAoGrupo } from '../../../../api/notificationsApi';
import { NOTIFICATION_VARIABLES, NOTIFICATION_VARIABLES_DYNAMIC } from './notificationVariables';

// ========== GRUPOS ==========
export function NotificationGroups({ eventId }) {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [message, setMessage] = useState('');

  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterStatus, setFilterStatus] = useState('confirmed');
  const [filterCheckin, setFilterCheckin] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterLote, setFilterLote] = useState('all');

  useEffect(() => {
    carregarGrupos();
  }, [eventId]);

  const carregarGrupos = async () => {
    try {
      setLoading(true);
      const data = await listarGrupos(eventId);
      setGrupos(data);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      setMessage('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const abrirDialog = () => {
    setForm({ name: '', description: '' });
    setMessage('');
    setDialogOpen(true);
  };

  const fecharDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const salvarGrupo = async () => {
    if (!form.name.trim()) {
      setMessage('Informe o nome do grupo.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await criarGrupo({
        eventId,
        name: form.name.trim(),
        description: form.description?.trim() || ''
      });
      await carregarGrupos();
      setDialogOpen(false);
      setMessage('Grupo criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      setMessage(error.response?.data?.message || 'Erro ao criar grupo');
    } finally {
      setSaving(false);
    }
  };

  const getBuyerDisplayName = (buyerData = {}) => (
    buyerData?.buyer_name ||
    buyerData?.name ||
    buyerData?.nome ||
    buyerData?.nome_completo ||
    'Comprador'
  );

  const carregarInscricoes = async (status = filterStatus, checkin = filterCheckin) => {
    if (!eventId) return;
    setMembersLoading(true);
    setRegistrations([]);
    try {
      const params = {};
      if (status && status !== 'all') params.paymentStatus = status;
      if (checkin && checkin !== 'all') params.checkinStatus = checkin;
      params.page = 1;
      params.perPage = 200;
      const response = await listarInscricoesPorEvento(eventId, params);
      const items = response?.records ?? response ?? [];
      setRegistrations(items);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
      setMessage('Erro ao carregar inscrições');
    } finally {
      setMembersLoading(false);
    }
  };

  const abrirVinculo = async (grupo) => {
    setSelectedGroup(grupo);
    setSelectedIds([]);
    setFilterStatus('confirmed');
    setFilterCheckin('all');
    setFilterSearch('');
    setFilterLote('all');
    setMembersDialogOpen(true);
    await carregarInscricoes('confirmed', 'all');
  };

  const fecharVinculo = () => {
    if (membersLoading) return;
    setMembersDialogOpen(false);
    setSelectedGroup(null);
    setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const salvarMembros = async () => {
    if (!selectedGroup) return;
    if (!selectedIds.length) {
      setMessage('Selecione ao menos uma inscrição para vincular.');
      return;
    }
    setMembersLoading(true);
    try {
      await adicionarMembrosAoGrupo(selectedGroup.id, selectedIds);
      await carregarGrupos();
      setMembersDialogOpen(false);
      setMessage('Membros vinculados ao grupo com sucesso!');
    } catch (error) {
      console.error('Erro ao vincular membros:', error);
      setMessage(error.response?.data?.message || 'Erro ao vincular membros');
    } finally {
      setMembersLoading(false);
    }
  };

  const getLoteName = (reg) => reg.batchName || reg.batch?.name || '';

  const loteOptions = Array.from(new Set(
    registrations.map(getLoteName).filter(Boolean)
  ));

  const filteredRegistrations = registrations.filter((reg) => {
    const lote = getLoteName(reg);
    const matchesLote = !filterLote || filterLote === 'all' || lote === filterLote;
    const search = filterSearch.toLowerCase();
    const name = getBuyerDisplayName(reg.buyerData).toLowerCase();
    const code = (reg.orderCode || '').toLowerCase();
    const matchesSearch = !filterSearch || name.includes(search) || code.includes(search);
    return matchesLote && matchesSearch;
  });
  const filteredIds = filteredRegistrations.map((reg) => reg.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.includes(id));

  const toggleSelectAllFiltered = () => {
    if (!filteredIds.length) return;
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((id) => !filteredIds.includes(id));
      }
      const merged = new Set(prev);
      filteredIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  return (
    <>
      <Box mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={abrirDialog}
        >
          Novo Grupo
        </Button>
      </Box>

      {message && (
        <Box mb={2}>
          <Alert severity={message.includes('sucesso') ? 'success' : 'error'}>{message}</Alert>
        </Box>
      )}

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Membros</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grupos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">
                      {loading ? 'Carregando...' : 'Nenhum grupo cadastrado'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                grupos.map((grupo) => (
                  <TableRow key={grupo.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <GroupIcon style={{ marginRight: 8, opacity: 0.5 }} />
                        {grupo.name}
                      </Box>
                    </TableCell>
                    <TableCell>{grupo.description || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${grupo.members?.length || 0} membros`}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={grupo.isActive ? 'Ativo' : 'Inativo'}
                        size="small"
                        color={grupo.isActive ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => abrirVinculo(grupo)}>
                        <GroupAddIcon />
                      </IconButton>
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={fecharDialog} fullWidth maxWidth="sm">
        <DialogTitle>Novo Grupo</DialogTitle>
        <DialogContent>
          <Box mt={1} display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Nome do grupo"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Descrição (opcional)"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialog} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={salvarGrupo} disabled={saving}>
            {saving ? 'Salvando...' : 'Criar Grupo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={membersDialogOpen} onClose={fecharVinculo} fullWidth maxWidth="md">
        <DialogTitle>Vincular membros ao grupo</DialogTitle>
        <DialogContent>
          <Box mt={1} display="flex" gap={2} flexWrap="wrap">
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Status da inscrição</InputLabel>
              <Select
                value={filterStatus}
                label="Status da inscrição"
                onChange={async (e) => {
                  const value = e.target.value;
                  setFilterStatus(value);
                  await carregarInscricoes(value, filterCheckin);
                }}
              >
                <MenuItem value="confirmed">Confirmadas</MenuItem>
                <MenuItem value="pending">Pendentes</MenuItem>
                <MenuItem value="cancelled">Canceladas</MenuItem>
                <MenuItem value="all">Todas</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel>Check-in</InputLabel>
              <Select
                value={filterCheckin}
                label="Check-in"
                onChange={async (e) => {
                  const value = e.target.value;
                  setFilterCheckin(value);
                  await carregarInscricoes(filterStatus, value);
                }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="checked">Com check-in</MenuItem>
                <MenuItem value="not_checked">Sem check-in</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel>Lote</InputLabel>
              <Select
                value={filterLote}
                label="Lote"
                onChange={(e) => setFilterLote(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                {loteOptions.map((lote) => (
                  <MenuItem key={lote} value={lote}>{lote}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Buscar por nome ou código"
              size="small"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 240 }}
            />
            <FormControlLabel
              control={(
                <Checkbox
                  checked={allFilteredSelected}
                  indeterminate={!allFilteredSelected && someFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                />
              )}
              label={`Selecionar todos (${filteredIds.length})`}
              sx={{ ml: 1 }}
            />
          </Box>

          <Box mt={2}>
            {membersLoading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress />
              </Box>
            ) : filteredRegistrations.length === 0 ? (
              <Typography color="textSecondary">Nenhuma inscrição encontrada.</Typography>
            ) : (
              <List dense>
                {filteredRegistrations.map((reg) => (
                  <ListItem key={reg.id} button onClick={() => toggleSelect(reg.id)}>
                    <Checkbox checked={selectedIds.includes(reg.id)} />
                    <ListItemText
                      primary={`${reg.orderCode || '-'} — ${getBuyerDisplayName(reg.buyerData)}`}
                      secondary={`Status: ${reg.paymentStatus || reg.paymentStatusDerived || '-'} | Check-in: ${reg.hasCheckIn ? 'Sim' : 'Não'}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip size="small" label={reg.batchName || reg.batch?.name || 'Sem lote'} />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharVinculo} disabled={membersLoading}>Cancelar</Button>
          <Button variant="contained" onClick={salvarMembros} disabled={membersLoading || !selectedIds.length}>
            {membersLoading ? 'Vinculando...' : 'Vincular Selecionados'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ========== TEMPLATES ==========
export function NotificationTemplates({ eventId }) {
  const messageRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'custom',
    channel: 'whatsapp',
    subject: '',
    message: '',
    mediaUrl: ''
  });
  const [message, setMessage] = useState('');
  const appendVariableToTemplate = (variable) => {
    setForm((prev) => {
      const current = prev.message || '';
      const el = messageRef.current;
      const start = el?.selectionStart ?? current.length;
      const end = el?.selectionEnd ?? current.length;
      const next = `${current.slice(0, start)}${variable}${current.slice(end)}`;
      const nextCursor = start + variable.length;
      setTimeout(() => {
        if (messageRef.current) {
          messageRef.current.focus();
          messageRef.current.setSelectionRange(nextCursor, nextCursor);
        }
      }, 0);
      return { ...prev, message: next };
    });
  };


  useEffect(() => {
    carregarTemplates();
  }, [eventId]);

  const carregarTemplates = async () => {
    try {
      setLoading(true);
      const data = await listarTemplates(eventId);
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setMessage('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const abrirDialog = () => {
    setForm({
      name: '',
      type: 'custom',
      channel: 'whatsapp',
      subject: '',
      message: '',
      mediaUrl: ''
    });
    setMessage('');
    setDialogOpen(true);
  };

  const fecharDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const salvarTemplate = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      setMessage('Informe nome e mensagem do template.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await criarTemplate({
        eventId,
        name: form.name.trim(),
        type: form.type,
        channel: form.channel,
        subject: form.subject?.trim() || null,
        message: form.message.trim(),
        mediaUrl: form.mediaUrl?.trim() || null
      });
      await carregarTemplates();
      setDialogOpen(false);
      setMessage('Template criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar template:', error);
      setMessage(error.response?.data?.message || 'Erro ao criar template');
    } finally {
      setSaving(false);
    }
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      confirmation: 'Confirmação',
      reminder: 'Lembrete',
      checkin: 'Check-in',
      custom: 'Personalizado'
    };
    return labels[tipo] || tipo;
  };

  return (
    <>
      <Box mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={abrirDialog}
        >
          Novo Template
        </Button>
      </Box>

      {message && (
        <Box mb={2}>
          <Alert severity={message.includes('sucesso') ? 'success' : 'error'}>{message}</Alert>
        </Box>
      )}

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Canal</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">
                      {loading ? 'Carregando...' : 'Nenhum template cadastrado'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={getTipoLabel(template.type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.channel.toUpperCase()}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.isActive ? 'Ativo' : 'Inativo'}
                        size="small"
                        color={template.isActive ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={fecharDialog} maxWidth="md" fullWidth>
        <DialogTitle>Novo Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={form.type}
                  label="Tipo"
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="confirmation">Confirmação</MenuItem>
                  <MenuItem value="reminder">Lembrete</MenuItem>
                  <MenuItem value="checkin">Check-in</MenuItem>
                  <MenuItem value="custom">Personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Canal</InputLabel>
                <Select
                  value={form.channel}
                  label="Canal"
                  onChange={(e) => setForm((prev) => ({ ...prev, channel: e.target.value }))}
                >
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Assunto (opcional)"
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Mensagem"
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                required
                inputRef={messageRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {NOTIFICATION_VARIABLES.map((variable) => (
                  <Chip
                    key={variable}
                    label={variable}
                    size="small"
                    variant="outlined"
                    clickable
                    onClick={() => appendVariableToTemplate(variable)}
                  />
                ))}
                {NOTIFICATION_VARIABLES_DYNAMIC.map((variable) => (
                  <Chip
                    key={variable}
                    label={variable}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    clickable
                    onClick={() => appendVariableToTemplate(variable.split(' ')[0])}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="URL da mídia (opcional)"
                value={form.mediaUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, mediaUrl: e.target.value }))}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialog} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={salvarTemplate} disabled={saving}>
            {saving ? 'Salvando...' : 'Criar Template'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ========== HISTÓRICO ==========
export function NotificationHistory({ eventId }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    carregarNotificacoes();
  }, [eventId]);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const data = await listarNotificacoes(eventId, { limit: 200 });
      setNotificacoes(data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      sent: 'primary',
      delivered: 'secondary',
      read: 'primary',
      failed: 'secondary'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      sent: 'Enviado',
      delivered: 'Entregue',
      read: 'Lido',
      failed: 'Falhou'
    };
    return labels[status] || status;
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Histórico de Notificações ({notificacoes.length})
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Destinatário</TableCell>
              <TableCell>Canal</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Mensagem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notificacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="textSecondary">
                    {loading ? 'Carregando...' : 'Nenhuma notificação enviada'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              notificacoes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((notificacao) => (
                <TableRow key={notificacao.id}>
                  <TableCell>{formatarData(notificacao.createdAt)}</TableCell>
                  <TableCell>{notificacao.recipient}</TableCell>
                  <TableCell>
                    <Chip
                      label={notificacao.channel.toUpperCase()}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(notificacao.status)}
                      size="small"
                      color={getStatusColor(notificacao.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" style={{ maxWidth: 200, display: 'block' }}>
                      {notificacao.message.substring(0, 50)}...
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={notificacoes.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />
      </CardContent>
    </Card>
  );
}

// ========== ESTATÍSTICAS ==========
export function NotificationStats({ eventId, compact = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEstatisticas();
  }, [eventId]);

  const carregarEstatisticas = async () => {
    try {
      setLoading(true);
      const data = await obterEstatisticasNotificacoes(eventId);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Typography color="textSecondary" align="center">
        Nenhuma estatística disponível
      </Typography>
    );
  }

  const StatCard = ({ title, value, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Typography variant="body2" color="textSecondary">
          {title}
        </Typography>
        <Typography variant="h4" style={{ fontWeight: 'bold', color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  if (compact) {
    return (
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <StatCard title="Total Enviado" value={stats.total} color="#4caf50" />
        </Grid>
        {stats.porCanal?.map((item, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <StatCard
              title={item.channel.toUpperCase()}
              value={item.total}
              color="#2196f3"
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={4}>
        <StatCard title="Total de Notificações" value={stats.total} color="#4caf50" />
      </Grid>

      {stats.porStatus?.map((item, index) => (
        <Grid item xs={12} sm={4} key={index}>
          <StatCard
            title={item.status.toUpperCase()}
            value={item.total}
            color="#2196f3"
          />
        </Grid>
      ))}

      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom style={{ marginTop: 16 }}>
          Por Canal
        </Typography>
      </Grid>

      {stats.porCanal?.map((item, index) => (
        <Grid item xs={12} sm={4} key={index}>
          <StatCard
            title={item.channel.toUpperCase()}
            value={item.total}
            color="#ff9800"
          />
        </Grid>
      ))}
    </Grid>
  );
}
  
