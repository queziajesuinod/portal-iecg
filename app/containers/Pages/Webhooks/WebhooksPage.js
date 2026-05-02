import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  createWebhook,
  fetchWebhooks,
  toggleWebhook,
  fetchEventDefinitions,
  createEventDefinition,
  sendWebhookEvent,
  updateWebhook,
  listarInscricoesParaReenvio,
  reenviarWebhookInscricoes
} from '../../../utils/webhookClient';
import { listarEventos } from '../../../api/eventsApi';

const PAYMENT_STATUS_LABELS = {
  pending: 'Pendente',
  authorized: 'Autorizado',
  partial: 'Parcial (sinal)',
  confirmed: 'Confirmado',
  denied: 'Negado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
  refunded: 'Reembolsado'
};

const DEFAULT_EVENT_DEFINITIONS = [
  {
    eventKey: 'apelo.created',
    label: 'Apelo criado',
    tableName: 'apelos_direcionados',
    fieldName: 'id',
    changeType: 'INSERT'
  },
  {
    eventKey: 'apelo.moved',
    label: 'Apelo movido',
    tableName: 'apelos_direcionados',
    fieldName: 'celula_id',
    changeType: 'UPDATE'
  },
  {
    eventKey: 'apelo.status_changed',
    label: 'Status do apelo alterado',
    tableName: 'apelos_direcionados',
    fieldName: 'status',
    changeType: 'UPDATE'
  },
  {
    eventKey: 'celula.created',
    label: 'Célula criada',
    tableName: 'celulas',
    fieldName: 'id',
    changeType: 'INSERT'
  },
  {
    eventKey: 'celula.updated',
    label: 'Célula atualizada',
    tableName: 'celulas',
    fieldName: 'updatedAt',
    changeType: 'UPDATE'
  },
  {
    eventKey: 'celula.deleted',
    label: 'Célula removida',
    tableName: 'celulas',
    fieldName: 'id',
    changeType: 'DELETE'
  },
  {
    eventKey: 'event.created',
    label: 'Evento criado',
    tableName: 'events',
    fieldName: 'id',
    changeType: 'INSERT'
  },
  {
    eventKey: 'event.updated',
    label: 'Evento atualizado',
    tableName: 'events',
    fieldName: 'updatedAt',
    changeType: 'UPDATE'
  },
  {
    eventKey: 'event.deleted',
    label: 'Evento removido',
    tableName: 'events',
    fieldName: 'id',
    changeType: 'DELETE'
  },
  {
    eventKey: 'registration.created',
    label: 'Inscrição criada',
    tableName: 'registrations',
    fieldName: 'id',
    changeType: 'INSERT'
  },
  {
    eventKey: 'registration.updated',
    label: 'Inscri??o atualizada',
    tableName: 'registrations',
    fieldName: 'updatedAt',
    changeType: 'UPDATE'
  },
];

const EVENT_CHANGE_TYPES = ['INSERT', 'UPDATE', 'DELETE'];

const INITIAL_DEFINITION_FORM = {
  label: '',
  eventKey: '',
  tableName: '',
  fieldName: '',
  changeType: 'UPDATE',
  description: ''
};

const WEBHOOK_BASE = 'https://portal.iecg.com.br/webhook/';

const WebhooksPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [webhooks, setWebhooks] = useState([]);
  const [eventDefinitions, setEventDefinitions] = useState(DEFAULT_EVENT_DEFINITIONS);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // --- Reenvio ---
  const [eventos, setEventos] = useState([]);
  const [reenvioEventoId, setReenvioEventoId] = useState('');
  const [reenvioStatus, setReenvioStatus] = useState('');
  const [reenvioInscricoes, setReenvioInscricoes] = useState([]);
  const [reenvioSelecionados, setReenvioSelecionados] = useState([]);
  const [reenvioLoading, setReenvioLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenvioResultado, setReenvioResultado] = useState(null);
  const [form, setForm] = useState({
    name: '',
    url: '',
    events: [DEFAULT_EVENT_DEFINITIONS[0].eventKey],
    secret: ''
  });
  const [definitionDialogOpen, setDefinitionDialogOpen] = useState(false);
  const [definitionForm, setDefinitionForm] = useState(INITIAL_DEFINITION_FORM);
  const [definitionLoading, setDefinitionLoading] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState(null);
  const [urlEditorOpen, setUrlEditorOpen] = useState(false);
  const [urlEditorTarget, setUrlEditorTarget] = useState(null);
  const [urlEditorValue, setUrlEditorValue] = useState('');
  const [urlEditorLoading, setUrlEditorLoading] = useState(false);

  const syncFormEventsWithDefinitions = (definitions) => {
    if (!Array.isArray(definitions) || definitions.length === 0) {
      return;
    }
    const availableKeys = new Set(definitions.map((def) => def.eventKey));
    setForm((prev) => {
      const filtered = prev.events.filter((key) => availableKeys.has(key));
      if (filtered.length) {
        return { ...prev, events: filtered };
      }
      return { ...prev, events: [definitions[0].eventKey] };
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchWebhooks();
      setWebhooks(data || []);
    } catch (err) {
      setNotification(err.message || 'Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  };

  const loadEventDefinitions = async () => {
    try {
      const definitions = await fetchEventDefinitions();
      if (Array.isArray(definitions) && definitions.length) {
        setEventDefinitions(definitions);
        syncFormEventsWithDefinitions(definitions);
      } else {
        setEventDefinitions(DEFAULT_EVENT_DEFINITIONS);
        syncFormEventsWithDefinitions(DEFAULT_EVENT_DEFINITIONS);
      }
    } catch (err) {
      console.warn('Falha ao carregar eventos dinâmicos', err);
      setEventDefinitions(DEFAULT_EVENT_DEFINITIONS);
      syncFormEventsWithDefinitions(DEFAULT_EVENT_DEFINITIONS);
    }
  };

  useEffect(() => {
    loadData();
    loadEventDefinitions();
    listarEventos({ includeFinished: true }).then((data) => {
      setEventos(Array.isArray(data) ? data : (data?.rows || data?.eventos || []));
    }).catch(() => {});
  }, []);

  const handleBuscarInscricoes = async () => {
    if (!reenvioEventoId) return;
    setReenvioLoading(true);
    setReenvioInscricoes([]);
    setReenvioSelecionados([]);
    setReenvioResultado(null);
    try {
      const data = await listarInscricoesParaReenvio(reenvioEventoId, {
        paymentStatus: reenvioStatus || undefined,
        limit: 200
      });
      setReenvioInscricoes(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotification(err.message || 'Erro ao buscar inscrições');
    } finally {
      setReenvioLoading(false);
    }
  };

  const handleToggleSelecionado = (id) => {
    setReenvioSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    );
  };

  const handleSelecionarTodos = () => {
    if (reenvioSelecionados.length === reenvioInscricoes.length) {
      setReenvioSelecionados([]);
    } else {
      setReenvioSelecionados(reenvioInscricoes.map((r) => r.id));
    }
  };

  const handleReenviar = async () => {
    if (!reenvioSelecionados.length) return;
    setReenviando(true);
    setReenvioResultado(null);
    try {
      const resultado = await reenviarWebhookInscricoes(reenvioSelecionados);
      setReenvioResultado(resultado);
      setNotification(resultado.mensagem || 'Webhooks enviados');
      setReenvioSelecionados([]);
    } catch (err) {
      setNotification(err.message || 'Erro ao reenviar webhooks');
    } finally {
      setReenviando(false);
    }
  };

  const handleToggleEvent = (eventValue) => {
    setForm((prev) => {
      const has = prev.events.includes(eventValue);
      return {
        ...prev,
        events: has ? prev.events.filter(e => e !== eventValue) : [...prev.events, eventValue]
      };
    });
  };

  const handleDefinitionFieldChange = (field, value) => {
    setDefinitionForm(prev => ({ ...prev, [field]: value }));
  };

  const closeDefinitionDialog = () => {
    setDefinitionDialogOpen(false);
    setDefinitionForm(INITIAL_DEFINITION_FORM);
  };

  const handleCreateDefinition = async () => {
    if (!definitionForm.label.trim() || !definitionForm.eventKey.trim() || !definitionForm.tableName.trim() || !definitionForm.fieldName.trim()) {
      setNotification('Informe nome, chave, tabela e campo do evento.');
      return;
    }

    setDefinitionLoading(true);
    let createdEvent;
    try {
      const cleaned = {
        label: definitionForm.label.trim(),
        eventKey: definitionForm.eventKey.trim(),
        tableName: definitionForm.tableName.trim(),
        fieldName: definitionForm.fieldName.trim(),
        changeType: definitionForm.changeType,
        description: (definitionForm.description || '').trim() || undefined
      };
      createdEvent = await createEventDefinition(cleaned);
      setNotification('Evento dinâmico cadastrado com sucesso.');
      setForm(prev => ({
        ...prev,
        events: prev.events.includes(createdEvent.eventKey)
          ? prev.events
          : [...prev.events, createdEvent.eventKey]
      }));
      await loadEventDefinitions();
    } catch (err) {
      console.error('Erro ao criar definição de evento:', err);
      setNotification(err.message || 'Erro ao criar evento dinâmico.');
    } finally {
      setDefinitionLoading(false);
      if (createdEvent) {
        closeDefinitionDialog();
      }
    }
  };

  const getPrimaryEventKey = (hook) => {
    if (hook?.events?.length) {
      return hook.events[0];
    }
    if (eventDefinitions?.length) {
      return eventDefinitions[0].eventKey;
    }
    return 'webhook.test';
  };

  const handleTestWebhook = async (hook) => {
    if (!hook) return;
    const eventKey = getPrimaryEventKey(hook);
    const payload = {
      webhookId: hook.id,
      name: hook.name,
      timestamp: new Date().toISOString(),
      test: true
    };
    setTestingWebhookId(hook.id);
    try {
      await sendWebhookEvent(eventKey, payload, { throwOnError: true });
      setNotification(`Teste enviado para ${hook.name} (${eventKey}).`);
    } catch (err) {
      console.error('Erro ao testar webhook:', err);
      setNotification(err.message || 'Erro ao testar webhook.');
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleOpenUrlEditor = (hook) => {
    setUrlEditorTarget(hook);
    setUrlEditorValue(hook?.url || '');
    setUrlEditorOpen(true);
  };

  const closeUrlEditor = () => {
    if (urlEditorLoading) return;
    setUrlEditorOpen(false);
    setUrlEditorTarget(null);
    setUrlEditorValue('');
  };

  const handleSaveUrl = async () => {
    if (!urlEditorTarget) return;
    setUrlEditorLoading(true);
    try {
      await updateWebhook(urlEditorTarget.id, { url: urlEditorValue.trim() });
      setNotification('URL atualizada com sucesso.');
      loadData();
      closeUrlEditor();
    } catch (err) {
      console.error('Erro ao salvar URL de webhook:', err);
      setNotification(err.message || 'Erro ao atualizar a URL.');
    } finally {
      setUrlEditorLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.url.trim() || !form.events.length) {
      setNotification('Preencha nome, URL e selecione ao menos um evento.');
      return;
    }

    const cleanedUrl = form.url.trim();
    const targetUrl = /^https?:\/\//i.test(cleanedUrl)
      ? cleanedUrl
      : `${WEBHOOK_BASE}${cleanedUrl.replace(/^\/+/, '')}`;
    try {
      await createWebhook({
        name: form.name.trim(),
        url: targetUrl,
        events: form.events,
        secret: form.secret.trim() || undefined
      });
      setNotification('Webhook criado com sucesso.');
      setCreateDialogOpen(false);
      setForm({
        name: '', url: '', events: ['apelo.created'], secret: ''
      });
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao criar webhook.');
    }
  };

  const handleToggleActive = async (webhook) => {
    try {
      await toggleWebhook(webhook.id, !webhook.active);
      setNotification(`Webhook ${!webhook.active ? 'ativado' : 'desativado'} com sucesso.`);
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao atualizar webhook.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>Webhooks</title>
      </Helmet>
      <PapperBlock title="Webhooks" desc="Gerencie URLs que receberão eventos do portal.">
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Webhooks configurados" />
          <Tab label="Reenviar inscrições" />
        </Tabs>

        {activeTab === 1 && (
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Selecione um evento e as inscrições para as quais deseja reenviar o webhook <strong>registration.created</strong>.
            </Typography>
            <Grid container spacing={2} alignItems="flex-end" sx={{ mb: 2 }}>
              <Grid item xs={12} sm={5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Evento</InputLabel>
                  <Select
                    label="Evento"
                    value={reenvioEventoId}
                    onChange={(e) => { setReenvioEventoId(e.target.value); setReenvioInscricoes([]); setReenvioSelecionados([]); }}
                  >
                    <MenuItem value=""><em>Selecione</em></MenuItem>
                    {eventos.map((ev) => (
                      <MenuItem key={ev.id} value={ev.id}>{ev.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={reenvioStatus}
                    onChange={(e) => setReenvioStatus(e.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([val, label]) => (
                      <MenuItem key={val} value={val}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleBuscarInscricoes}
                  disabled={!reenvioEventoId || reenvioLoading}
                >
                  {reenvioLoading ? <CircularProgress size={18} /> : 'Buscar'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleReenviar}
                  disabled={!reenvioSelecionados.length || reenviando}
                >
                  {reenviando ? <CircularProgress size={18} /> : `Reenviar (${reenvioSelecionados.length})`}
                </Button>
              </Grid>
            </Grid>

            {reenvioResultado && (
              <Box mb={2} p={1.5} bgcolor="grey.100" borderRadius={1}>
                <Typography variant="body2"><strong>{reenvioResultado.mensagem}</strong></Typography>
                {reenvioResultado.resultados?.filter((r) => !r.sucesso).map((r) => (
                  <Typography key={r.registrationId} variant="caption" color="error" display="block">
                    {r.registrationId}: {r.erro}
                  </Typography>
                ))}
              </Box>
            )}

            {reenvioInscricoes.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={reenvioSelecionados.length === reenvioInscricoes.length && reenvioInscricoes.length > 0}
                          indeterminate={reenvioSelecionados.length > 0 && reenvioSelecionados.length < reenvioInscricoes.length}
                          onChange={handleSelecionarTodos}
                        />
                      </TableCell>
                      <TableCell>Código</TableCell>
                      <TableCell>Comprador</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Qtd</TableCell>
                      <TableCell>Data</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reenvioInscricoes.map((reg) => {
                      const nome = reg.buyerData?.buyer_name || reg.buyerData?.nome || reg.buyerData?.name || '-';
                      const resultado = reenvioResultado?.resultados?.find((r) => r.registrationId === reg.id);
                      return (
                        <TableRow
                          key={reg.id}
                          selected={reenvioSelecionados.includes(reg.id)}
                          sx={resultado ? { bgcolor: resultado.sucesso ? 'success.light' : 'error.light' } : {}}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={reenvioSelecionados.includes(reg.id)}
                              onChange={() => handleToggleSelecionado(reg.id)}
                            />
                          </TableCell>
                          <TableCell>{reg.orderCode}</TableCell>
                          <TableCell>{nome}</TableCell>
                          <TableCell>
                            <Chip
                              label={PAYMENT_STATUS_LABELS[reg.paymentStatus] || reg.paymentStatus}
                              size="small"
                              color={reg.paymentStatus === 'confirmed' ? 'success' : reg.paymentStatus === 'partial' ? 'warning' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{reg.quantity}</TableCell>
                          <TableCell>{new Date(reg.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {!reenvioLoading && reenvioEventoId && reenvioInscricoes.length === 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Nenhuma inscrição encontrada. Clique em &quot;Buscar&quot; para carregar.
              </Typography>
            )}
          </Box>
        )}

        {activeTab === 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
              <Typography variant="body1">
            Eventos disponíveis: {eventDefinitions.length
                  ? eventDefinitions.map((evt) => evt.label || evt.eventKey).join(', ')
                  : 'Nenhum evento configurado'}
            .
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                <Button variant="outlined" color="secondary" onClick={() => setDefinitionDialogOpen(true)}>
              Eventos dinâmicos
                </Button>
                <Button variant="contained" color="primary" onClick={() => setCreateDialogOpen(true)}>
              Novo webhook
                </Button>
              </Box>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell>Eventos</TableCell>
                    <TableCell align="center">Ativo</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!webhooks || !webhooks.length) && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        {loading ? 'Carregando...' : 'Nenhum webhook cadastrado.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {webhooks.map((hook) => (
                    <TableRow key={hook.id}>
                      <TableCell>{hook.name}</TableCell>
                      <TableCell>{hook.url}</TableCell>
                      <TableCell>
                        {(hook.events || []).map((evt) => (
                          <Chip key={evt} label={evt} size="small" sx={{ mr: 1, mb: 0.5 }} />
                        ))}
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          color="primary"
                          checked={!!hook.active}
                          onChange={() => handleToggleActive(hook)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleTestWebhook(hook)}
                            disabled={testingWebhookId === hook.id || !(hook.events && hook.events.length)}
                          >
                            {testingWebhookId === hook.id ? 'Testando...' : 'Testar'}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="secondary"
                            onClick={() => handleOpenUrlEditor(hook)}
                          >
                        Editar URL
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </PapperBlock>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo webhook</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Nome"
                fullWidth
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="URL"
                fullWidth
                helperText={`Se preencher apenas o caminho, usamos ${WEBHOOK_BASE}<sua-rota>`}
                placeholder={`${WEBHOOK_BASE}meu-endpoint`}
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Secret (opcional, será enviado em header X-Webhook-Secret)"
                fullWidth
                value={form.secret}
                onChange={(e) => setForm((prev) => ({ ...prev, secret: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Eventos</Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
              Os eventos s?o mapeados para tabelas/campos espec?ficos; clique em &quot;Eventos din?micos&quot; para registrar novos gatilhos.
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {eventDefinitions.map((evt) => (
                  <Tooltip
                    key={evt.eventKey}
                    title={`${evt.tableName || 'Tabela não informada'} · ${evt.fieldName || 'Campo não informado'} (${evt.changeType})`}
                  >
                    <Chip
                      label={evt.label || evt.eventKey}
                      color={form.events.includes(evt.eventKey) ? 'primary' : 'default'}
                      onClick={() => handleToggleEvent(evt.eventKey)}
                      variant={form.events.includes(evt.eventKey) ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={urlEditorOpen} onClose={closeUrlEditor} fullWidth maxWidth="sm">
        <DialogTitle>Editar URL do webhook</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Atualize a URL que o webhook utiliza (por exemplo, trocando a rota de teste pela rota de produção).
          </Typography>
          <TextField
            label="URL"
            fullWidth
            value={urlEditorValue}
            onChange={(e) => setUrlEditorValue(e.target.value)}
            helperText={`Atualizando ${urlEditorTarget?.name || 'o webhook'}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUrlEditor} disabled={urlEditorLoading}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveUrl}
            disabled={urlEditorLoading}
          >
            {urlEditorLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={definitionDialogOpen}
        onClose={closeDefinitionDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Eventos dinâmicos</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Defina eventos relacionados a tabelas/campos específicos para que os webhooks possam reagir a essas alterações.
          </Typography>
          {eventDefinitions.length ? (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Evento</TableCell>
                    <TableCell>Chave</TableCell>
                    <TableCell>Tabela</TableCell>
                    <TableCell>Campo</TableCell>
                    <TableCell>Tipo de mudança</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventDefinitions.map((def) => (
                    <TableRow key={def.eventKey}>
                      <TableCell>
                        <Typography variant="subtitle2">{def.label || def.eventKey}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {def.eventKey}
                        </Typography>
                      </TableCell>
                      <TableCell>{def.eventKey}</TableCell>
                      <TableCell>{def.tableName}</TableCell>
                      <TableCell>{def.fieldName}</TableCell>
                      <TableCell>{def.changeType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Nenhum evento dinâmico cadastrado ainda.
            </Typography>
          )}
          <Typography variant="subtitle2" gutterBottom>Registrar novo evento</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome do evento"
                fullWidth
                value={definitionForm.label}
                onChange={(e) => handleDefinitionFieldChange('label', e.target.value)}
                helperText="Rótulo exibido para facilitar a leitura."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Chave do evento"
                fullWidth
                value={definitionForm.eventKey}
                onChange={(e) => handleDefinitionFieldChange('eventKey', e.target.value)}
                helperText="Ex: apelo.novo_campo. Deve ser única."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tabela"
                fullWidth
                value={definitionForm.tableName}
                onChange={(e) => handleDefinitionFieldChange('tableName', e.target.value)}
                helperText="Tabela onde a mudança será observada."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Campo"
                fullWidth
                value={definitionForm.fieldName}
                onChange={(e) => handleDefinitionFieldChange('fieldName', e.target.value)}
                helperText="Campo que aciona o evento."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Tipo de mudança"
                fullWidth
                value={definitionForm.changeType}
                onChange={(e) => handleDefinitionFieldChange('changeType', e.target.value)}
                helperText="Selecione a operação que dispara o evento."
              >
                {EVENT_CHANGE_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Descrição (opcional)"
                fullWidth
                multiline
                minRows={2}
                value={definitionForm.description}
                onChange={(e) => handleDefinitionFieldChange('description', e.target.value)}
                helperText="Explique o contexto do evento."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDefinitionDialog} disabled={definitionLoading}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateDefinition}
            disabled={definitionLoading}
          >
            {definitionLoading ? 'Salvando...' : 'Salvar evento'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification
        open={!!notification}
        close={() => setNotification('')}
        message={notification}
        type="info"
      />
    </div>
  );
};

export default WebhooksPage;
