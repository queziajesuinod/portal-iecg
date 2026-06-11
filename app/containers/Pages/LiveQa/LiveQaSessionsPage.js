import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Grid, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Helmet } from 'react-helmet';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import {
  listarSalas, criarSala, excluirSala,
} from '../../../api/liveQaApi';
import { getStoredPermissions } from '../../../utils/permissions';

const canManageSessions = () => {
  const perms = getStoredPermissions();
  return !perms.length || perms.includes('ADMIN_FULL_ACCESS') || perms.includes('PERGUNTAS_AO_VIVO_GERENCIAR');
};

const LiveQaSessionsPage = () => {
  const history = useHistory();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const { data: salas = [], isLoading } = useQuery({
    queryKey: ['qa-admin-sessions'],
    queryFn: listarSalas,
  });

  const criarMutation = useMutation({
    mutationFn: () => criarSala(form),
    onSuccess: () => {
      setForm({ title: '', description: '' });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['qa-admin-sessions'] });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: (id) => excluirSala(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qa-admin-sessions'] }),
  });

  const publicUrl = (code) => `${window.location.origin}/qa/${code}`;
  const canManage = canManageSessions();

  return (
    <div>
      <Helmet><title>Perguntas ao Vivo</title></Helmet>
      <PapperBlock
        title="Perguntas ao Vivo"
        icon="ion-ios-chatbubbles-outline"
        desc="Crie salas e gerencie as perguntas do público em tempo real"
      >
        {canManage && (
          <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
              Nova sala
            </Button>
          </Stack>
        )}

        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <Grid container spacing={2}>
            {salas.length === 0 && (
              <Grid item xs={12}>
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Nenhuma sala criada ainda. Clique em &quot;Nova sala&quot; para começar.
                </Typography>
              </Grid>
            )}
            {salas.map((sala) => (
              <Grid item xs={12} sm={6} md={4} key={sala.id}>
                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                  <CardActionArea onClick={() => history.push(`/app/perguntas-ao-vivo/${sala.id}`)}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Chip label={sala.code} color="primary" sx={{ fontWeight: 700, letterSpacing: 1 }} />
                        <Chip
                          label={sala.status === 'open' ? 'Aberta' : 'Fechada'}
                          color={sala.status === 'open' ? 'success' : 'default'}
                          size="small"
                        />
                      </Stack>
                      <Typography variant="h6" sx={{ mt: 1.5 }}>{sala.title}</Typography>
                      {sala.description && (
                        <Typography variant="body2" color="text.secondary" noWrap>{sala.description}</Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                  <Stack direction="row" spacing={0.5} sx={{ px: 1.5, pb: 1.5 }}>
                    <IconButton
                      size="small"
                      title="Copiar link público"
                      onClick={() => navigator.clipboard?.writeText(publicUrl(sala.code))}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Abrir tela ao vivo (projeção)"
                      onClick={() => window.open(`/qa/${sala.code}/ao-vivo`, '_blank')}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                    <Box sx={{ flex: 1 }} />
                    {canManage && (
                      <IconButton
                        size="small"
                        color="error"
                        title="Excluir sala"
                        onClick={() => {
                        // eslint-disable-next-line no-alert
                          if (window.confirm('Excluir esta sala e todas as perguntas?')) {
                            excluirMutation.mutate(sala.id);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Nova sala de perguntas</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Título"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              sx={{ mt: 1 }}
            />
            <TextField
              fullWidth
              label="Descrição (opcional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              minRows={2}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={!form.title.trim() || criarMutation.isPending}
              onClick={() => criarMutation.mutate()}
            >
              {criarMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>
      </PapperBlock>
    </div>
  );
};

export default LiveQaSessionsPage;
