import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid, Card, CardContent, Typography, Button, Box, Table, TableContainer,
  TableBody, TableCell, TableHead, TableRow, Chip, Stack, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useHistory, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { useConfirm } from '../../../utils/useConfirm';
import { formatDateTimeInAppTimezone } from '../../../utils/dateTime';
import {
  buscarEvento, listarSolicitacoesEntrada, resumoSolicitacoesEntrada,
  aprovarSolicitacaoEntrada, recusarSolicitacaoEntrada
} from '../../../api/eventsApi';

const STATUS_META = {
  requested: { label: 'Aguardando', color: 'warning' },
  approved: { label: 'Aprovada', color: 'info' },
  rejected: { label: 'Recusada', color: 'default' },
  expired: { label: 'Expirada', color: 'error' },
};

const money = (v) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
const buyerNome = (b = {}) => b.buyer_name || b.nome || b.name || '(sem nome)';
const buyerEmail = (b = {}) => b.buyer_email || b.email || '';
const buyerTelefone = (b = {}) => b.buyer_whatsapp || b.buyer_phone || b.whatsapp || b.telefone || b.celular || '';
// Link do WhatsApp (wa.me) a partir do telefone: normaliza dígitos e prefixa 55 (Brasil)
// quando vier sem DDI.
const whatsappLink = (tel) => {
  const digits = String(tel || '').replace(/\D/g, '');
  if (!digits) return null;
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
};

function EventDepositRequests() {
  const { id } = useParams();
  const history = useHistory();
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [notification, setNotification] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [aprovar, setAprovar] = useState(null); // { registro, valor }
  const [aprovando, setAprovando] = useState(false);

  const eventoQuery = useQuery({ queryKey: ['events', 'detail', id], queryFn: () => buscarEvento(id), enabled: Boolean(id) });
  const evento = eventoQuery.data || null;

  const listaQuery = useQuery({
    queryKey: ['events', 'deposit-requests', id],
    queryFn: () => listarSolicitacoesEntrada(id),
    enabled: Boolean(id)
  });
  const registros = listaQuery.data || [];

  const resumoQuery = useQuery({
    queryKey: ['events', 'deposit-requests-summary', id],
    queryFn: () => resumoSolicitacoesEntrada(id),
    enabled: Boolean(id)
  });
  const resumo = resumoQuery.data || {};

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['events', 'deposit-requests', id] });
    queryClient.invalidateQueries({ queryKey: ['events', 'deposit-requests-summary', id] });
  };

  const abrirAprovar = (registro) => setAprovar({ registro, valor: String(registro.requestedDepositAmount ?? '') });

  const confirmarAprovar = async () => {
    if (!aprovar) return;
    const valorNum = Number(String(aprovar.valor).replace(',', '.'));
    if (!valorNum || valorNum <= 0) { setNotification('Informe um valor de entrada válido.'); return; }
    setAprovando(true);
    try {
      await aprovarSolicitacaoEntrada(aprovar.registro.id, valorNum);
      setNotification('Solicitação aprovada — link de pagamento enviado.');
      setAprovar(null);
      invalidate();
    } catch (err) {
      setNotification(err.message || 'Erro ao aprovar');
    } finally {
      setAprovando(false);
    }
  };

  const handleRecusar = async (registro) => {
    const ok = await confirm({
      title: 'Recusar solicitação',
      message: `Recusar a entrada de ${buyerNome(registro.buyerData)}? A inscrição pendente será cancelada.`,
      confirmText: 'Recusar',
      confirmColor: 'error',
      severity: 'error'
    });
    if (!ok) return;
    setBusyId(registro.id);
    try {
      await recusarSolicitacaoEntrada(registro.id);
      setNotification('Solicitação recusada.');
      invalidate();
    } catch (err) {
      setNotification(err.message || 'Erro ao recusar');
    } finally {
      setBusyId(null);
    }
  };

  const title = `${brand.name} - Solicitações de entrada${evento?.title ? ` - ${evento.title}` : ''}`;

  return (
    <div>
      <Helmet><title>{title}</title></Helmet>
      <PapperBlock
        title={`Solicitações de entrada${evento?.title ? ` — ${evento.title}` : ''}`}
        icon="ion-ios-cash-outline"
        desc="Pessoas que pediram para entrar com um valor abaixo do sinal mínimo. Avalie e aprove (com o valor que quiser) ou recuse."
      >
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<BackIcon />} onClick={() => history.push(`/app/events/${id}`)}>Voltar</Button>
        </Stack>

        {evento && evento.allowBelowMinimumDeposit === false && (
          <Alert severity="info" sx={{ mb: 2 }}>
            O recurso de <strong>entrada abaixo do mínimo</strong> está desabilitado neste evento. Habilite na edição do evento
            (seção “Condições de parcela”) para que o botão apareça no site.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {['requested', 'approved', 'rejected', 'expired'].map((st) => (
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
        ) : registros.length === 0 ? (
          <Typography color="textSecondary">Nenhuma solicitação de entrada ainda.</Typography>
        ) : (
          <TableContainer sx={{ width: '100%', overflowX: 'auto', '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pessoa</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Mínimo</TableCell>
                  <TableCell align="right">Pediu</TableCell>
                  <TableCell align="right">Aprovado</TableCell>
                  <TableCell align="right">Pago</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Prazo</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registros.map((r) => {
                  const meta = STATUS_META[r.depositApprovalStatus] || { label: r.depositApprovalStatus, color: 'default' };
                  const busy = busyId === r.id;
                  const email = buyerEmail(r.buyerData);
                  const telefone = buyerTelefone(r.buyerData);
                  const waLink = whatsappLink(telefone);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{buyerNome(r.buyerData)}</Typography>
                        <Typography variant="caption" color="textSecondary" display="block">
                          {email ? `${email} · ` : ''}{r.orderCode}
                        </Typography>
                        {telefone && (
                          <Typography variant="caption" display="block">
                            {waLink ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#128C7E', fontWeight: 600, textDecoration: 'none' }}
                              >
                                <WhatsAppIcon style={{ fontSize: 14, verticalAlign: 'text-bottom', marginRight: 3 }} />
                                {telefone}
                              </a>
                            ) : telefone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{money(r.finalPrice)}</TableCell>
                      <TableCell align="right">{r.event?.minDepositAmount != null ? money(r.event.minDepositAmount) : '-'}</TableCell>
                      <TableCell align="right">{money(r.requestedDepositAmount)}</TableCell>
                      <TableCell align="right">{r.approvedDepositAmount != null ? money(r.approvedDepositAmount) : '-'}</TableCell>
                      <TableCell align="right">{money(r.pago)}</TableCell>
                      <TableCell align="center"><Chip size="small" label={meta.label} color={meta.color} /></TableCell>
                      <TableCell>{r.depositOfferExpiresAt ? formatDateTimeInAppTimezone(r.depositOfferExpiresAt) : '-'}</TableCell>
                      <TableCell align="center">
                        {busy ? <CircularProgress size={20} /> : (r.depositApprovalStatus === 'requested' ? (
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button size="small" variant="contained" startIcon={<CheckIcon fontSize="small" />} onClick={() => abrirAprovar(r)}>Aprovar</Button>
                            <Button size="small" color="error" startIcon={<CloseIcon fontSize="small" />} onClick={() => handleRecusar(r)}>Recusar</Button>
                          </Stack>
                        ) : (r.depositApprovalStatus === 'approved' && !['confirmed', 'partial'].includes(r.paymentStatus) ? (
                          <Button size="small" color="error" onClick={() => handleRecusar(r)}>Cancelar</Button>
                        ) : '—'))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </PapperBlock>

      <Dialog open={Boolean(aprovar)} onClose={() => (aprovando ? null : setAprovar(null))} maxWidth="xs" fullWidth>
        <DialogTitle>Aprovar entrada</DialogTitle>
        <DialogContent>
          {aprovar && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>{buyerNome(aprovar.registro.buyerData)}</strong> pediu entrada de{' '}
                <strong>{money(aprovar.registro.requestedDepositAmount)}</strong>{' '}
                (total {money(aprovar.registro.finalPrice)}
                {aprovar.registro.event?.minDepositAmount != null ? `, mínimo ${money(aprovar.registro.event.minDepositAmount)}` : ''}).
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                label="Valor de entrada aprovado (R$)"
                value={aprovar.valor}
                onChange={(e) => setAprovar((p) => ({ ...p, valor: e.target.value }))}
                helperText="Você pode liberar o valor pedido ou outro. A pessoa paga esse valor para garantir a vaga."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAprovar(null)} disabled={aprovando}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarAprovar} disabled={aprovando}>
            {aprovando ? 'Aprovando…' : 'Aprovar e enviar link'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
      {ConfirmDialog}
    </div>
  );
}

export default EventDepositRequests;
