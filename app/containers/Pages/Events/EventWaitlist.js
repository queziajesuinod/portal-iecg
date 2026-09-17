import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid, Card, CardContent, Typography, Button, Box, Table, TableContainer,
  TableBody, TableCell, TableHead, TableRow, Chip, IconButton, Tooltip,
  Stack, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Divider
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
  buscarEvento, listarListaEspera, resumoListaEspera, overviewListaEspera,
  removerEntradaListaEspera, ofertarEntradaListaEspera, reenviarOfertaListaEspera
} from '../../../api/eventsApi';

const STATUS_META = {
  waiting: { label: 'Na fila', color: 'default' },
  offered: { label: 'Oferta enviada', color: 'warning' },
  fulfilled: { label: 'Atendido', color: 'success' },
  expired: { label: 'Expirado', color: 'error' },
  cancelled: { label: 'Cancelado', color: 'default' },
};

const loteLabel = (b) => `${b.name}${b.sector ? ` (${b.sector})` : ''}`;

function EventWaitlist() {
  const { id } = useParams();
  const history = useHistory();
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [notification, setNotification] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [loteFilter, setLoteFilter] = useState('');
  // Diálogo de aprovação (permite escolher o lote de destino — cross-lote).
  const [aprovar, setAprovar] = useState(null); // { entry, targetBatchId }
  const [aprovando, setAprovando] = useState(false);

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

  const overviewQuery = useQuery({
    queryKey: ['events', 'waitlist-overview', id],
    queryFn: () => overviewListaEspera(id),
    enabled: Boolean(id)
  });
  const overview = overviewQuery.data || { batches: [], waitlistAutoOffer: true };
  const lotes = overview.batches || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['events', 'waitlist', id] });
    queryClient.invalidateQueries({ queryKey: ['events', 'waitlist-summary', id] });
    queryClient.invalidateQueries({ queryKey: ['events', 'waitlist-overview', id] });
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

  // Abre o diálogo de aprovação já com o lote desejado pré-selecionado.
  const abrirAprovar = (entry) => setAprovar({ entry, targetBatchId: entry.batchId });

  const confirmarAprovar = async () => {
    if (!aprovar) return;
    setAprovando(true);
    try {
      await ofertarEntradaListaEspera(aprovar.entry.id, aprovar.targetBatchId);
      setNotification('Vaga aprovada — inscrição pendente criada e oferta enviada.');
      setAprovar(null);
      invalidate();
    } catch (err) {
      setNotification(err.message || 'Erro ao aprovar vaga');
    } finally {
      setAprovando(false);
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

  const entradasFiltradas = useMemo(
    () => (loteFilter ? entradas.filter((e) => e.batchId === loteFilter) : entradas),
    [entradas, loteFilter]
  );

  const title = `${brand.name} - Lista de espera${evento?.title ? ` - ${evento.title}` : ''}`;
  const modoManual = overview.waitlistAutoOffer === false;

  return (
    <div>
      <Helmet><title>{title}</title></Helmet>
      <PapperBlock
        title={`Lista de espera${evento?.title ? ` — ${evento.title}` : ''}`}
        icon="ion-ios-people-outline"
        desc="Fila por lote. Avalie as vagas por unidade e aprove — inclusive alguém de outro lote para a vaga que sobrou."
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

        {modoManual ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Aprovação manual ativada.</strong> Quando abre vaga, ninguém é ofertado automaticamente — avalie os
            lotes abaixo e clique em <em>Aprovar</em> para dar a vaga a quem quiser (pode aprovar alguém de outro lote
            para a vaga que sobrou).
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            Troca <strong>automática</strong> ligada: a vaga que abre é ofertada ao próximo da fila do mesmo lote. Você ainda
            pode aprovar manualmente (inclusive cross-lote) pelos botões abaixo.
          </Alert>
        )}

        {/* Panorama por lote */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Panorama por lote</Typography>
        {overviewQuery.isLoading ? (
          <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>
        ) : (
          <TableContainer sx={{ mb: 3, '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Lote / Unidade</TableCell>
                  <TableCell align="center">Capacidade</TableCell>
                  <TableCell align="center">Ocupadas</TableCell>
                  <TableCell align="center">Livres</TableCell>
                  <TableCell align="center">Na fila</TableCell>
                  <TableCell align="center">Ofertas ativas</TableCell>
                  <TableCell align="center">Filtrar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lotes.map((b) => {
                  const temVaga = b.maxQuantity == null || (b.livres || 0) > 0;
                  const selected = loteFilter === b.batchId;
                  return (
                    <TableRow key={b.batchId} selected={selected}>
                      <TableCell><Typography variant="body2" fontWeight="bold">{loteLabel(b)}</Typography></TableCell>
                      <TableCell align="center">{b.maxQuantity == null ? '∞' : b.maxQuantity}</TableCell>
                      <TableCell align="center">{b.ocupados}</TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={b.livres == null ? '∞' : b.livres} color={temVaga ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="center">{b.waiting}</TableCell>
                      <TableCell align="center">{b.offered}</TableCell>
                      <TableCell align="center">
                        <Button size="small" variant={selected ? 'contained' : 'text'} onClick={() => setLoteFilter(selected ? '' : b.batchId)}>
                          {selected ? 'Limpar' : 'Ver fila'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lotes.length === 0 && (
                  <TableRow><TableCell colSpan={7}><Typography variant="body2" color="textSecondary">Nenhum lote com limite de vagas.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
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

        {loteFilter && (
          <Chip
            sx={{ mb: 1 }}
            label={`Filtrando por: ${loteLabel(lotes.find((l) => l.batchId === loteFilter) || { name: 'lote' })}`}
            onDelete={() => setLoteFilter('')}
            color="primary"
            variant="outlined"
          />
        )}

        {listaQuery.isLoading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : entradasFiltradas.length === 0 ? (
          <Typography color="textSecondary">Ninguém na lista de espera{loteFilter ? ' deste lote' : ''} ainda.</Typography>
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
                {entradasFiltradas.map((e) => {
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
                              <Button size="small" variant="contained" startIcon={<SendIcon fontSize="small" />} onClick={() => abrirAprovar(e)}>
                                Aprovar
                              </Button>
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

      {/* Diálogo: aprovar vaga (escolher lote de destino) */}
      <Dialog open={Boolean(aprovar)} onClose={() => (aprovando ? null : setAprovar(null))} maxWidth="sm" fullWidth>
        <DialogTitle>Aprovar vaga na lista de espera</DialogTitle>
        <DialogContent>
          {aprovar && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>{aprovar.entry.contactName || aprovar.entry.contactEmail || 'Pessoa'}</strong>
                {' '}está na fila do lote <strong>{aprovar.entry.batch?.name || '-'}</strong>
                {aprovar.entry.batch?.sector ? ` (${aprovar.entry.batch.sector})` : ''}
                {' '}· {aprovar.entry.quantity} vaga(s).
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Escolha o lote em que a vaga será dada. Você pode aprovar para <strong>outro lote</strong> que tenha
                vaga livre (ex.: aproveitar a vaga que sobrou de outra unidade).
              </Typography>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel id="lote-destino-label">Lote de destino</InputLabel>
                <Select
                  labelId="lote-destino-label"
                  label="Lote de destino"
                  value={aprovar.targetBatchId || ''}
                  onChange={(ev) => setAprovar((p) => ({ ...p, targetBatchId: ev.target.value }))}
                >
                  {lotes.map((b) => {
                    const semVaga = b.maxQuantity != null && (b.livres || 0) < aprovar.entry.quantity;
                    return (
                      <MenuItem key={b.batchId} value={b.batchId} disabled={semVaga}>
                        {loteLabel(b)} — {b.livres == null ? 'ilimitado' : `${b.livres} livre(s)`}
                        {b.batchId === aprovar.entry.batch?.id ? ' · lote desejado' : ''}
                        {semVaga ? ' · sem vaga' : ''}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              {aprovar.targetBatchId && aprovar.entry.batch?.id && aprovar.targetBatchId !== aprovar.entry.batch.id && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  Aprovação cross-lote: a inscrição será criada no lote de destino escolhido (o preço é recalculado pelo
                  lote de destino).
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAprovar(null)} disabled={aprovando}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarAprovar} disabled={aprovando || !aprovar?.targetBatchId}>
            {aprovando ? 'Aprovando…' : 'Aprovar e ofertar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
      {ConfirmDialog}
    </div>
  );
}

export default EventWaitlist;
