import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import { createWebhook, fetchWebhooks, toggleWebhook } from '../../../utils/webhookClient';

const EVENTS = [
  { value: 'apelo.created', label: 'Apelo criado' },
  { value: 'apelo.moved', label: 'Apelo movido' },
  { value: 'apelo.status_changed', label: 'Status do apelo alterado' },
];

const WEBHOOK_BASE = 'https://portal.iecg.com.br/webhook/';

const WebhooksPage = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    url: '',
    events: ['apelo.created'],
    secret: ''
  });

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

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleEvent = (eventValue) => {
    setForm((prev) => {
      const has = prev.events.includes(eventValue);
      return {
        ...prev,
        events: has ? prev.events.filter(e => e !== eventValue) : [...prev.events, eventValue]
      };
    });
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
      setForm({ name: '', url: '', events: ['apelo.created'], secret: '' });
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
        <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
          <Typography variant="body1">Eventos disponíveis: Apelo criado, movido e alteração de status.</Typography>
          <Button variant="contained" color="primary" onClick={() => setCreateDialogOpen(true)}>
            Novo webhook
          </Button>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Eventos</TableCell>
                <TableCell align="center">Ativo</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
              <Box display="flex" flexWrap="wrap" gap={1}>
                {EVENTS.map((evt) => (
                  <Chip
                    key={evt.value}
                    label={evt.label}
                    color={form.events.includes(evt.value) ? 'primary' : 'default'}
                    onClick={() => handleToggleEvent(evt.value)}
                    variant={form.events.includes(evt.value) ? 'filled' : 'outlined'}
                  />
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
