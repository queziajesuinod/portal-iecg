import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid, Card, CardContent, Typography, Button, Box, Table, TableContainer,
  TableBody, TableCell, TableHead, TableRow, Chip, IconButton, Tooltip,
  Stack, CircularProgress, Alert
} from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import ReplayIcon from '@mui/icons-material/Replay';
import { useHistory, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { useConfirm } from '../../../utils/useConfirm';
import { formatDateTimeInAppTimezone } from '../../../utils/dateTime';
import {
  buscarEvento, listarListaEspera, resumoListaEspera,
  removerEntradaListaEspera, ofertarEntradaListaEspera, reenviarOfertaListaEspera
} from '../../../api/eventsApi';

const STATUS_META = {
  waiting: { label: 'Na fila', color: 'default' },
  offered: { label: 'Oferta enviada', color: 'warning' },
  fulfilled: { label: 'Atendido', color: 'success' },
  expired: { label: 'Expirado', color: 'error' },
  cancelled: { label: 'Cancelado', color: 'default' },
};

function EventWaitlist() {
  const { id } = useParams();
  const history = useHistory();
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [notification, setNotification] = useState('');
  const [busyId, setBusyId] = useState(null);

  const eventoQuery = useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: () => buscarEvento(id),
    enabled: Boolean(id)
  });
  const evento = eventoQuery.data || null;

  const listaQuery = useQuery({
    queryKey: ['events', 'waitlist', id],
    queryFn: () => listarListaEspera(id),
    enabled: Boolean(id)
  });
  const entradas = listaQuery.data || [];

  const resumoQuery = useQuery({
    queryKey: ['events', 'waitlist-summary', id],
    queryFn: () => resumoListaEspera(id),
    enabled: Boolean(id)
  });
  const resumo = resumoQuery.data || {};

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['events', 'waitlist', id] });
    queryClient.invalidateQueries({ queryKey: ['events', 'waitlist-summary', id] });
  };

  const removerMutation = useMutation({
    mutationFn: (entryId) => removerEntradaListaEspera(entryId),
    onSuccess: () => { setNotification('Entrada removida da lista de espera.'); invalidate(); },
    onError: (err) => setNotification(err.message || 'Erro ao remover entrada')
  });

  const handleRemover = async (entry) => {
    const ok = await confirm({
      title: 'Remover da lista de espera',
      message: `Remover ${entry.contactName || entry.contactEmail || 'esta pessoa'} da fila?`,
      confirmText: 'Remover',
      confirmColor: 'error',
      severity: 'error'
    });
    if (!ok) return;
    removerMutation.mutate(entry.id);
  };

  const handleOfertar = async (entry) => {
    setBusyId(entry.id);
    try {
      await ofertarEntradaListaEspera(entry.id);
      setNotification('Oferta enviada — inscrição pendente criada.');
      invalidate();
    } catch (err) {
      setNotification(err.message || 'Erro ao ofertar vaga');
    } finally {
      setBusyId(null);
    }
  };

  const handleReenviar = async (entry) => {
    setBusyId(entry.id);
    try {
      await reenviarOfertaListaEspera(entry.id);
      setNotification('Oferta reenviada.');
    } catch (err) {
      setNotification(err.message || 'Erro ao reenviar oferta');
    } finally {
      setBusyId(null);
    }
  };

  const title = `${brand.name} - Lista de espera${evento?.title ? ` - ${evento.title}` : ''}`;

  return (
    <div>
      <Helmet><title>{title}</title></Helmet>
      <PapperBlock
        title={`Lista de espera${evento?.title ? ` — ${evento.title}` : ''}`}
        icon="ion-ios-people-outline"
        desc="Fila por lote. Quando uma vaga abre, o primeiro da fila recebe a oferta com link de pagamento."
      >
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<BackIcon />} onClick={() => history.push(`/app/events/${id}`)}>Voltar</Button>
        </Stack>

        {evento && evento.waitlistEnabled === false && (
          <Alert severity="info" sx={{ mb: 2 }}>
            A lista de espera está <strong>desabilitada</strong> para este evento. Habilite na edição do evento para que o
            botão apareça no site quando os lotes lotarem.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {['waiting', 'offered', 'fulfilled', 'expired'].map((st) => (
            <Grid item xs={6} sm={3} key={st}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h5">{resumo[st] || 0}</Typography>
                  <Typography variant="caption" color="textSecondary">{STATUS_META[st].label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {listaQuery.isLoading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : entradas.length === 0 ? (
          <Typography color="textSecondary">Ninguém na lista de espera ainda.</Typography>
        ) : (
          <TableContainer sx={{ width: '100%', overflowX: 'auto', '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Pessoa</TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell align="center">Qtd.</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Entrou em</TableCell>
                  <TableCell>Oferta expira</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entradas.map((e) => {
                  const meta = STATUS_META[e.status] || { label: e.status, color: 'default' };
                  const busy = busyId === e.id;
                  return (
                    <TableRow key={e.id}>
                      <TableCell>{e.position || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{e.contactName || '(sem nome)'}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {e.contactEmail || '-'}{e.contactWhatsapp ? ` · ${e.contactWhatsapp}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>{e.batch?.name || '-'}{e.batch?.sector ? ` (${e.batch.sector})` : ''}</TableCell>
                      <TableCell align="center">{e.quantity}</TableCell>
                      <TableCell align="center"><Chip size="small" label={meta.label} color={meta.color} /></TableCell>
                      <TableCell>{formatDateTimeInAppTimezone(e.createdAt)}</TableCell>
                      <TableCell>{e.offerExpiresAt ? formatDateTimeInAppTimezone(e.offerExpiresAt) : '-'}</TableCell>
                      <TableCell align="center">
                        {busy ? <CircularProgress size={20} /> : (
                          <>
                            {e.status === 'waiting' && (
                              <Tooltip title="Ofertar vaga agora">
                                <IconButton size="small" color="primary" onClick={() => handleOfertar(e)}><SendIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                            {e.status === 'offered' && (
                              <Tooltip title="Reenviar oferta">
                                <IconButton size="small" onClick={() => handleReenviar(e)}><ReplayIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                            {['waiting', 'offered'].includes(e.status) && (
                              <Tooltip title="Remover da fila">
                                <IconButton size="small" color="error" onClick={() => handleRemover(e)}><DeleteIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
      {ConfirmDialog}
    </div>
  );
}

export default EventWaitlist;
