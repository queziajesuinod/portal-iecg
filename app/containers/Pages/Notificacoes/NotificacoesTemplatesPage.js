import React, { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Toolbar, Tooltip, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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

const CHANNEL_LABELS = { whatsapp: 'WhatsApp', email: 'E-mail', push: 'Push' };

function extractVariables(body) {
  const matches = body.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}

export default function NotificacoesTemplatesPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [notification, setNotification] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nome, setNome] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const token = () => localStorage.getItem('token');

  const fetchTemplates = async () => {
    const res = await fetch(`${API_URL}/api/admin/notificacoes/templates`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const abrirCriar = () => {
    setEditando(null); setNome(''); setChannel('whatsapp'); setBody('');
    setDialogOpen(true);
  };

  const abrirEditar = (t) => {
    setEditando(t); setNome(t.name); setChannel(t.channel); setBody(t.body);
    setDialogOpen(true);
  };

  const fecharDialog = () => { if (!saving) setDialogOpen(false); };

  const handleSalvar = async () => {
    if (!nome.trim()) { setNotification('Informe o nome.'); return; }
    if (!body.trim()) { setNotification('Informe o corpo da mensagem.'); return; }
    setSaving(true);
    try {
      const url = editando
        ? `${API_URL}/api/admin/notificacoes/templates/${editando.id}`
        : `${API_URL}/api/admin/notificacoes/templates`;
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: nome, channel, body })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao salvar');
      setNotification(editando ? 'Template atualizado!' : 'Template criado!');
      setDialogOpen(false);
      fetchTemplates();
    } catch (e) {
      setNotification(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletar = async (t) => {
    const ok = await confirm({
      title: 'Excluir template', message: `Excluir "${t.name}"?`, confirmText: 'Excluir', confirmColor: 'error', severity: 'error'
    });
    if (!ok) return;
    const res = await fetch(`${API_URL}/api/admin/notificacoes/templates/${t.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
    });
    if (res.ok) { setNotification('Template excluído.'); fetchTemplates(); } else setNotification('Erro ao excluir.');
  };

  const variaveis = extractVariables(body);

  return (
    <div>
      <Helmet><title>Templates de Notificação</title></Helmet>
      <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Templates de Notificação</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCriar}>Novo Template</Button>
      </Toolbar>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Canal</TableCell>
              <TableCell>Variáveis</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center">Nenhum template cadastrado.</TableCell></TableRow>
            )}
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell><Chip size="small" label={CHANNEL_LABELS[t.channel] || t.channel} /></TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {(t.variables || []).map((v) => <Chip key={v} size="small" label={`{{${v}}}`} variant="outlined" />)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title="Editar"><IconButton size="small" onClick={() => abrirEditar(t)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Excluir"><IconButton size="small" color="error" onClick={() => handleDeletar(t)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={fecharDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editando ? 'Editar Template' : 'Novo Template'}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth required />
            <TextField select label="Canal" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
              <MenuItem value="email">E-mail</MenuItem>
              <MenuItem value="push">Push</MenuItem>
            </TextField>
            <TextField
              label="Corpo da mensagem"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              fullWidth multiline minRows={5}
              placeholder="Use {{nome}}, {{evento}}, {{celula}} para variáveis dinâmicas"
              helperText="Use {{variavel}} para inserir dados do destinatário"
            />
            {variaveis.length > 0 && (
              <Box>
                <Typography variant="caption">Variáveis detectadas:</Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                  {variaveis.map((v) => <Chip key={v} size="small" label={`{{${v}}}`} color="primary" variant="outlined" />)}
                </Box>
              </Box>
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
