import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';
import {
  Alert,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Button,
  Chip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  TableContainer,
  Tooltip
} from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBack';
import CancelIcon from '@mui/icons-material/Cancel';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReplayIcon from '@mui/icons-material/Replay';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useHistory, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { DetailSkeleton } from '../../../components/Skeleton';
import { useConfirm } from '../../../utils/useConfirm';
import {
  buscarInscricao,
  cancelarInscricao,
  listarFormasPagamento,
  criarPagamentoOfflineInscricao,
  atualizarPagamentoOfflineInscricao,
  deletarPagamentoInscricao,
  recalcularStatusInscricao,
  obterInfoCancelamentoInscricao,
  atualizarInscricao,
  atualizarParticipante
} from '../../../api/eventsApi';
import { getPaymentStatusChipSx, getPaymentStatusLabel } from '../../../constants/paymentStatus';
import { getStoredPermissions } from '../../../utils/permissions';
import { formatDateTimeInAppTimezone } from '../../../utils/dateTime';
import Notification from '../../../components/Notification/Notification';
import CancelRegistrationDialog from '../../../components/CancelRegistrationDialog';

const OFFLINE_CARD_BRANDS = [
  'Visa',
  'Master',
  'Elo',
  'Amex',
  'Hipercard',
  'Diners',
  'Discover',
  'JCB'
];

const OFFLINE_INSTALLMENT_OPTIONS = Array.from({ length: 12 }, (_value, index) => index + 1);
const PAYMENT_STATUSES_ALLOWED_FOR_CANCELLATION = ['pending', 'expired'];

function RegistrationDetails() {
  const { confirm, ConfirmDialog } = useConfirm();
  const history = useHistory();
  const { id } = useParams();
  const [inscricao, setInscricao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ message: '', type: 'success' });
  const notify = (message, type = 'success') => setNotification({ message, type });
  const fecharNotificacao = () => setNotification((prev) => ({ ...prev, message: '' }));
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelDialogInfo, setCancelDialogInfo] = useState(null);
  const [cancelDialogLoading, setCancelDialogLoading] = useState(false);
  const [, setPaymentOptions] = useState([]);
  const [dialogPagamentoOffline, setDialogPagamentoOffline] = useState(false);
  const [pagamentoOfflineEdicao, setPagamentoOfflineEdicao] = useState(null);
  const [recalculatingPayment, setRecalculatingPayment] = useState(false);

  const [editBuyerDialogOpen, setEditBuyerDialogOpen] = useState(false);
  const [editBuyerForm, setEditBuyerForm] = useState({});
  const [editBuyerSaving, setEditBuyerSaving] = useState(false);

  const [editAttendeeDialogOpen, setEditAttendeeDialogOpen] = useState(false);
  const [editAttendeeTarget, setEditAttendeeTarget] = useState(null);
  const [editAttendeeForm, setEditAttendeeForm] = useState({});
  const [editAttendeeSaving, setEditAttendeeSaving] = useState(false);
  const [formPagamento, setFormPagamento] = useState({
    amount: '',
    paymentOptionId: '',
    paymentData: {
      installments: 1,
      cardNumber: '',
      cardHolder: '',
      expirationDate: '',
      securityCode: '',
      brand: ''
    }
  });
  const [formPagamentoOffline, setFormPagamentoOffline] = useState({
    amount: '',
    method: 'cash',
    notes: '',
    installments: 1,
    cardBrand: ''
  });

  const storedPermissions = getStoredPermissions();
  const canRegisterOffline = storedPermissions.includes('ADMIN_FULL_ACCESS');

  const getFieldRows = (data, labeledFields, fallbackLabels = {}) => {
    if (labeledFields && labeledFields.length) {
      return labeledFields;
    }

    return Object.entries(data || {}).map(([key, value]) => ({
      fieldName: key,
      label: fallbackLabels[key] || key,
      value
    }));
  };

  const renderFieldTable = (fields) => {
    if (!fields || fields.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary">
          Nenhum dado registrado
        </Typography>
      );
    }

    return (
      <Table size="small">
        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.fieldName}>
              <TableCell>
                <strong>{field.label}:</strong>
              </TableCell>
              <TableCell>{field.value ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const abrirEdicaoComprador = () => {
    const fields = getFieldRows(inscricao?.buyerData, inscricao?.buyerLabeledFields);
    const seed = {};
    fields.forEach((f) => { seed[f.fieldName] = f.value ?? ''; });
    if (inscricao?.buyerData) {
      Object.keys(inscricao.buyerData).forEach((k) => {
        if (!(k in seed)) seed[k] = inscricao.buyerData[k] ?? '';
      });
    }
    setEditBuyerForm(seed);
    setEditBuyerDialogOpen(true);
  };

  const salvarEdicaoComprador = async () => {
    try {
      setEditBuyerSaving(true);
      await atualizarInscricao(id, { buyerData: editBuyerForm });
      setNotification({ type: 'success', message: 'Dados do comprador atualizados.' });
      setEditBuyerDialogOpen(false);
      await carregarInscricao();
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Erro ao atualizar comprador.' });
    } finally {
      setEditBuyerSaving(false);
    }
  };

  const abrirEdicaoParticipante = (attendee) => {
    const fields = getFieldRows(attendee.attendeeData, attendee.labeledData);
    const seed = {};
    fields.forEach((f) => { seed[f.fieldName] = f.value ?? ''; });
    if (attendee.attendeeData) {
      Object.keys(attendee.attendeeData).forEach((k) => {
        if (!(k in seed)) seed[k] = attendee.attendeeData[k] ?? '';
      });
    }
    setEditAttendeeTarget(attendee);
    setEditAttendeeForm(seed);
    setEditAttendeeDialogOpen(true);
  };

  const salvarEdicaoParticipante = async () => {
    if (!editAttendeeTarget?.id) return;
    try {
      setEditAttendeeSaving(true);
      await atualizarParticipante(id, editAttendeeTarget.id, { attendeeData: editAttendeeForm });
      setNotification({ type: 'success', message: `Inscrito #${editAttendeeTarget.attendeeNumber} atualizado.` });
      setEditAttendeeDialogOpen(false);
      setEditAttendeeTarget(null);
      await carregarInscricao();
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Erro ao atualizar participante.' });
    } finally {
      setEditAttendeeSaving(false);
    }
  };

  const fieldLabel = (key, labeledFields) => {
    const labelled = (labeledFields || []).find((f) => f.fieldName === key);
    return labelled?.label || key;
  };

  const carregarInscricao = useCallback(async () => {
    try {
      setLoading(true);
      const response = await buscarInscricao(id);
      setInscricao(response);
      if (response?.event?.id) {
        const formas = await listarFormasPagamento(response.event.id);
        setPaymentOptions(Array.isArray(formas) ? formas : []);
        if (formas?.length && !formPagamento.paymentOptionId) {
          setFormPagamento(prev => ({
            ...prev,
            paymentOptionId: formas[0].id
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar inscrição:', error);
      notify('Erro ao carregar inscrição', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, formPagamento.paymentOptionId]);

  useEffect(() => {
    carregarInscricao();
  }, [carregarInscricao]);

  useEffect(() => {
    if (!inscricao?.orderCode) return;
    const currentPageTitle = history.location?.state?.pageTitle;
    if (currentPageTitle === inscricao.orderCode) return;

    history.replace({
      pathname: history.location.pathname,
      search: history.location.search,
      hash: history.location.hash,
      state: {
        ...(history.location.state || {}),
        pageTitle: inscricao.orderCode
      }
    });
  }, [inscricao?.orderCode, history]);

  const abrirDialogCancelamento = async () => {
    try {
      const info = await obterInfoCancelamentoInscricao(id);
      setCancelDialogInfo(info);
      setCancelDialogOpen(true);
    } catch (error) {
      console.error('Erro ao obter info de cancelamento:', error);
      notify('Não foi possível verificar o tipo de cancelamento', 'error');
    }
  };

  const fecharDialogCancelamento = () => {
    if (cancelDialogLoading) {
      return;
    }
    setCancelDialogOpen(false);
    setCancelDialogInfo(null);
  };

  const confirmarCancelamento = async () => {
    setCancelDialogLoading(true);
    try {
      await cancelarInscricao(id);
      notify('Inscrição cancelada com sucesso!', 'success');
      fecharDialogCancelamento();
      carregarInscricao();
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      notify(error.response?.data?.message || 'Erro ao cancelar inscrição', 'error');
    } finally {
      setCancelDialogLoading(false);
    }
  };

  const resetFormPagamentoOffline = () => {
    setFormPagamentoOffline({
      amount: '',
      method: 'cash',
      notes: '',
      installments: 1,
      cardBrand: ''
    });
  };

  const handleAbrirPagamentoOffline = () => {
    setPagamentoOfflineEdicao(null);
    resetFormPagamentoOffline();
    setDialogPagamentoOffline(true);
  };

  const handleAbrirEdicaoPagamentoOffline = (payment) => {
    if (!payment || payment.channel !== 'OFFLINE') {
      return;
    }
    setPagamentoOfflineEdicao(payment);
    setFormPagamentoOffline({
      amount: payment.amount != null ? String(payment.amount) : '',
      method: payment.method || 'cash',
      notes: payment.notes || '',
      installments: Number(payment.installments || 1),
      cardBrand: payment.cardBrand || ''
    });
    setDialogPagamentoOffline(true);
  };

  const handleFecharPagamentoOffline = () => {
    setDialogPagamentoOffline(false);
    setPagamentoOfflineEdicao(null);
    resetFormPagamentoOffline();
  };

  const handleChangeMetodoOffline = (method) => {
    setFormPagamentoOffline((prev) => ({
      ...prev,
      method,
      cardBrand: method === 'credit_card' ? prev.cardBrand : '',
      installments: method === 'credit_card' ? prev.installments : 1
    }));
  };

  const handleSalvarPagamentoOffline = async () => {
    try {
      if (formPagamentoOffline.method === 'credit_card') {
        if (!formPagamentoOffline.cardBrand) {
          notify('Selecione a bandeira do cartao', 'warning');
          return;
        }
        const parcelas = Number.parseInt(formPagamentoOffline.installments, 10);
        if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) {
          notify('Informe uma quantidade de parcelas valida (1 a 12)', 'warning');
          return;
        }
      }

      const payload = {
        amount: parseFloat(formPagamentoOffline.amount),
        method: formPagamentoOffline.method,
        notes: formPagamentoOffline.notes
      };
      if (formPagamentoOffline.method === 'credit_card') {
        payload.cardBrand = formPagamentoOffline.cardBrand;
        payload.installments = Number.parseInt(formPagamentoOffline.installments, 10);
      }
      if (pagamentoOfflineEdicao?.id) {
        await atualizarPagamentoOfflineInscricao(id, pagamentoOfflineEdicao.id, payload);
        notify('Pagamento offline atualizado com sucesso!', 'success');
      } else {
        await criarPagamentoOfflineInscricao(id, payload);
        notify('Pagamento presencial registrado com sucesso!', 'success');
      }
      handleFecharPagamentoOffline();
      carregarInscricao();
    } catch (error) {
      console.error('Erro ao salvar pagamento presencial:', error);
      notify(error.response?.data?.message || error.message || 'Erro ao salvar pagamento presencial', 'error');
    }
  };

  const handleCancelarPagamento = async (payment) => {
    if (!payment?.id) return;
    if (!PAYMENT_STATUSES_ALLOWED_FOR_CANCELLATION.includes(payment.status)) {
      notify('Somente pagamentos pendentes ou expirados podem ser cancelados.', 'warning');
      return;
    }
    const ok = await confirm({
      title: 'Cancelar pagamento', message: 'Deseja cancelar este pagamento?', confirmText: 'Cancelar pagamento', confirmColor: 'error', severity: 'error'
    });
    if (!ok) return;
    try {
      await deletarPagamentoInscricao(id, payment.id);
      notify('Pagamento cancelado com sucesso!', 'success');
      carregarInscricao();
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      notify(error.response?.data?.message || error.message || 'Erro ao cancelar pagamento', 'error');
    }
  };

  const handleRecalcularStatus = async () => {
    setRecalculatingPayment(true);
    try {
      await recalcularStatusInscricao(id);
      notify('Status recalculado com sucesso', 'success');
      carregarInscricao();
    } catch (error) {
      console.error('Erro ao recalcular status da inscrição:', error);
      notify(error.message || 'Erro ao recalcular status da inscrição', 'error');
    } finally {
      setRecalculatingPayment(false);
    }
  };

  const formatarData = (data) => formatDateTimeInAppTimezone(data);

  const formatarPreco = (preco) => `R$ ${parseFloat(preco).toFixed(2).replace('.', ',')}`;

  const getMetodoPagamentoLabel = (metodo) => {
    const labels = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      cash: 'Dinheiro',
      pos: 'Maquininha',
      transfer: 'Transferência',
      free: 'Inscricao gratuita',
      manual: 'Manual'
    };
    return labels[metodo] || metodo;
  };

  const getTransactionTypeLabel = (tipo) => {
    const labels = {
      authorization: 'Autorização',
      capture: 'Captura',
      cancellation: 'Cancelamento',
      refund: 'Reembolso',
      webhook: 'Webhook'
    };
    return labels[tipo] || tipo;
  };

  // Status numéricos da Cielo: 10 = Voided, 11 = Refunded — só estes confirmam estorno/cancelamento.
  const CIELO_VOID_OK_STATUSES = new Set(['10', '11', 10, 11]);

  const getResultadoTransacao = (transaction) => {
    const tipo = transaction.transactionType;
    const { status } = transaction;
    const hasError = Boolean(transaction.errorMessage);
    const cieloStatus = transaction.responseData?.Status;

    if (tipo === 'refund' || tipo === 'cancellation') {
      const semRespostaCielo = cieloStatus === undefined || cieloStatus === null;
      const cieloConfirmou = !semRespostaCielo && CIELO_VOID_OK_STATUSES.has(cieloStatus);
      const cancelamentoLocal = semRespostaCielo && !hasError;

      if (cieloConfirmou || cancelamentoLocal) {
        return {
          label: tipo === 'refund' ? 'Reembolso efetivado' : 'Cancelamento efetivado',
          color: 'success'
        };
      }
      return {
        label: tipo === 'refund' ? 'Reembolso negado' : 'Cancelamento negado',
        color: 'error'
      };
    }

    if (hasError) {
      return { label: 'Falha', color: 'error' };
    }
    return { label: status || '—', color: 'default' };
  };

  const getMensagemCielo = (transaction) => {
    if (transaction.errorMessage) return transaction.errorMessage;
    const data = transaction.responseData || {};
    return data.ReturnMessage || data.ProviderReturnMessage || data.ReasonMessage || null;
  };

  const copiarParaAreaTransferencia = async (texto, rotulo = 'Texto') => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(String(texto));
      notify(`${rotulo} copiado para a área de transferência`, 'success');
    } catch (error) {
      notify(`Não foi possível copiar ${rotulo.toLowerCase()}`, 'error');
    }
  };

  if (loading) {
    return <Box p={3}><DetailSkeleton fields={8} /></Box>;
  }

  if (!inscricao) {
    return (
      <Box p={3}>
        <Alert
          severity="error"
          role="alert"
          action={(
            <Button color="inherit" size="small" startIcon={<BackIcon />} onClick={() => history.goBack()}>
              Voltar
            </Button>
          )}
        >
          Inscrição não encontrada. Verifique se o link está correto ou volte para a lista de inscrições.
        </Alert>
      </Box>
    );
  }

  const title = brand.name + ' - Detalhes da Inscrição';
  const loteNome = inscricao.batchName
    || inscricao.attendees?.[0]?.batch?.name
    || '-';
  const lotePrecoRaw = inscricao.batchPrice ?? inscricao.attendees?.[0]?.batch?.price;
  const lotePreco = lotePrecoRaw != null ? Number(lotePrecoRaw) : null;

  const buyerFields = getFieldRows(inscricao.buyerData, inscricao.buyerLabeledFields);
  const paidTotal = Number(inscricao.paidTotal || 0);
  const remaining = Number(inscricao.remaining || 0);
  const paymentStatusLabel = inscricao.paymentStatusDerived || inscricao.paymentStatus;
  const payments = inscricao.payments || [];
  const metodosPagamentoUnicos = Array.from(
    new Set(
      payments
        .map((payment) => payment?.method)
        .filter(Boolean)
    )
  );
  const metodosPagamentoLabel = metodosPagamentoUnicos.length
    ? metodosPagamentoUnicos.map((metodo) => getMetodoPagamentoLabel(metodo)).join(', ')
    : inscricao.paymentMethod
      ? getMetodoPagamentoLabel(inscricao.paymentMethod)
      : '-';
  const parcelasCartaoUnicas = Array.from(
    new Set(
      payments
        .filter((payment) => payment?.method === 'credit_card')
        .map((payment) => Number.parseInt(payment?.installments, 10))
        .filter((installments) => Number.isInteger(installments) && installments > 0)
    )
  );
  const parcelaLabel = parcelasCartaoUnicas.length
    ? parcelasCartaoUnicas.map((installments) => `${installments}x`).join(', ')
    : '-';

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <PapperBlock
        title={`Inscrição ${inscricao.orderCode}`}
        icon="ion-ios-document-outline"
        desc="Detalhes completos da inscrição"
      >
        <Grid container spacing={3}>
          {/* Informações Gerais */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Informações Gerais
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Código do Pedido:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body1">{inscricao.orderCode}</Typography>
                      <Tooltip title="Copiar código">
                        <IconButton
                          size="small"
                          aria-label="Copiar código do pedido"
                          onClick={() => copiarParaAreaTransferencia(inscricao.orderCode, 'Código do pedido')}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Status:</strong>
                    </Typography>
                    <Chip
                      label={getPaymentStatusLabel(paymentStatusLabel)}
                      sx={getPaymentStatusChipSx(paymentStatusLabel)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Evento:</strong>
                    </Typography>
                    <Typography variant="body1">{inscricao.event?.title || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Lote:</strong>
                    </Typography>
                    <Typography variant="body1">{loteNome}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Quantidade:</strong>
                    </Typography>
                    <Typography variant="body1">{inscricao.quantity} inscrito(s)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Data da Inscrição:</strong>
                    </Typography>
                    <Typography variant="body1">{formatarData(inscricao.createdAt)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Dados do Comprador */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" component="h2" gutterBottom>
                    Dados do Comprador
                  </Typography>
                  <Tooltip title="Editar dados do comprador">
                    <IconButton size="small" color="primary" onClick={abrirEdicaoComprador}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Divider style={{ marginBottom: 16 }} />
                {renderFieldTable(buyerFields)}
              </CardContent>
            </Card>
          </Grid>

          {/* Informações de Pagamento */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Informações de Pagamento
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Valor do Lote:</strong></TableCell>
                      <TableCell>
                        {lotePreco != null ? formatarPreco(lotePreco) : '-'}
                      </TableCell>
                    </TableRow>
                    {inscricao.coupon?.code && (
                      <>
                        <TableRow>
                          <TableCell><strong>Cupom utilizado:</strong></TableCell>
                          <TableCell>{inscricao.coupon.code}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Desconto:</strong></TableCell>
                          <TableCell>- {formatarPreco(inscricao.discountAmount || 0)}</TableCell>
                        </TableRow>
                      </>
                    )}
                    <TableRow>
                      <TableCell><strong>Valor Final:</strong></TableCell>
                      <TableCell>
                        <Typography variant="body1" color="primary" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                          {formatarPreco(inscricao.finalPrice)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Total Pago:</strong></TableCell>
                      <TableCell>{formatarPreco(paidTotal)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <strong>Saldo Restante:</strong>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            color: remaining > 0 ? 'warning.main' : 'text.primary',
                            fontWeight: remaining > 0 ? 600 : 400
                          }}
                        >
                          {remaining > 0 && <ErrorOutlineIcon style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />}
                          {formatarPreco(remaining)}
                          {remaining > 0 && ' — falta pagar'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Modo:</strong></TableCell>
                      <TableCell>
                        {inscricao.event?.requiresPayment === false
                          ? 'Evento gratuito'
                          : inscricao.event?.registrationPaymentMode === 'BALANCE_DUE'
                            ? 'Pagamento parcial'
                            : 'Pagamento unico'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Metodos:</strong></TableCell>
                      <TableCell>{metodosPagamentoLabel}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Parcelas:</strong></TableCell>
                      <TableCell>{parcelaLabel}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Pagamentos realizados */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                  <Grid item>
                    <Typography variant="h6" component="h2" gutterBottom>
                      Pagamentos realizados
                    </Typography>
                  </Grid>
                  <Grid item>

                    {canRegisterOffline && remaining > 0 && (
                      <Button
                        variant="outlined"
                        style={{ marginLeft: 8 }}
                        onClick={handleAbrirPagamentoOffline}
                      >
                        Registrar pagamento presencial
                      </Button>
                    )}
                  </Grid>
                </Grid>
                <Divider style={{ marginBottom: 16 }} />
                {payments.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body1" color="textSecondary" gutterBottom>
                      Nenhum pagamento registrado
                    </Typography>
                    {canRegisterOffline && remaining > 0 && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAbrirPagamentoOffline}
                        sx={{ mt: 1 }}
                      >
                        Registrar pagamento presencial
                      </Button>
                    )}
                  </Box>
                ) : (
                  <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 720 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell>Canal</TableCell>
                          <TableCell>Método</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Valor</TableCell>
                          <TableCell align="right">Taxa</TableCell>
                          <TableCell align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <Typography variant="body2">
                                {formatarData(payment.createdAt)}
                              </Typography>
                              {payment.channel === 'OFFLINE' && payment.notes && (
                                <Typography variant="caption" color="textSecondary" display="block">
                                Obs: {payment.notes}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{payment.channel === 'OFFLINE' ? 'Offline' : 'Online'}</TableCell>
                            <TableCell>{getMetodoPagamentoLabel(payment.method)}</TableCell>
                            <TableCell>
                              <Chip
                                label={getPaymentStatusLabel(payment.status)}
                                size="small"
                                sx={getPaymentStatusChipSx(payment.status)}
                              />
                            </TableCell>
                            <TableCell align="right">{formatarPreco(payment.amount)}</TableCell>
                            <TableCell align="right">{formatarPreco(payment.taxa || 0)}</TableCell>
                            <TableCell align="center">
                              {canRegisterOffline && payment.channel === 'OFFLINE' && (
                                <Tooltip title="Editar pagamento offline">
                                  <IconButton size="small" onClick={() => handleAbrirEdicaoPagamentoOffline(payment)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {canRegisterOffline && PAYMENT_STATUSES_ALLOWED_FOR_CANCELLATION.includes(payment.status) && (
                                <Tooltip title="Cancelar pagamento pendente ou expirado">
                                  <IconButton size="small" onClick={() => handleCancelarPagamento(payment)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {remaining === 0 && payments.length > 0 && (
                  <Alert
                    severity="success"
                    icon={<CheckCircleIcon fontSize="inherit" />}
                    sx={{ mt: 1.5 }}
                  >
                    Pagamento quitado — valor total confirmado.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Dados dos Inscritos */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Dados dos Inscritos ({inscricao.attendees?.length || 0})
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                {inscricao.attendees && inscricao.attendees.length > 0 ? (
                  <Grid container spacing={2}>
                    {inscricao.attendees.map((attendee) => (
                      <Grid item xs={12} md={6} key={attendee.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Typography variant="subtitle1" component="h3" gutterBottom>
                                Inscrito #{attendee.attendeeNumber}
                              </Typography>
                              <Tooltip title="Editar dados deste inscrito">
                                <IconButton size="small" color="primary" onClick={() => abrirEdicaoParticipante(attendee)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            <Divider style={{ marginBottom: 8 }} />
                            {renderFieldTable(getFieldRows(attendee.attendeeData, attendee.labeledData))}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum inscrito registrado
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Histórico de Transações */}
          {inscricao.transactions && inscricao.transactions.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    <ReceiptIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Histórico de Transações
                  </Typography>
                  <Divider style={{ marginBottom: 16 }} />
                  <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 640 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell>Operação</TableCell>
                          <TableCell>Resultado</TableCell>
                          <TableCell align="right">Valor</TableCell>
                          <TableCell>Retorno Cielo</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {inscricao.transactions.map((transaction) => {
                          const resultado = getResultadoTransacao(transaction);
                          const mensagemCielo = getMensagemCielo(transaction);
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <Typography variant="caption" color="textSecondary">
                                  {formatarData(transaction.createdAt)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  <strong>{getTransactionTypeLabel(transaction.transactionType)}</strong>
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={resultado.label}
                                  size="small"
                                  color={resultado.color}
                                  variant={resultado.color === 'default' ? 'outlined' : 'filled'}
                                  icon={
                                    resultado.color === 'success'
                                      ? <CheckCircleIcon style={{ fontSize: 16 }} />
                                      : resultado.color === 'error'
                                        ? <ErrorOutlineIcon style={{ fontSize: 16 }} />
                                        : undefined
                                  }
                                />
                              </TableCell>
                              <TableCell align="right">
                                {formatarPreco(transaction.amount)}
                              </TableCell>
                              <TableCell>
                                {mensagemCielo ? (
                                  <Typography variant="caption" color={resultado.color === 'error' ? 'error' : 'textSecondary'}>
                                    {mensagemCielo}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" color="textSecondary">—</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Botões de Ação */}
          <Grid item xs={12}>
            <Box sx={{
              display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center'
            }}>
              <Button
                variant="outlined"
                startIcon={<BackIcon />}
                onClick={() => history.goBack()}
                sx={{ mr: 'auto' }}
              >
                Voltar
              </Button>
              <Tooltip title="Recalcula o status de pagamento da inscrição com base nos pagamentos confirmados">
                <span>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={recalculatingPayment ? <CircularProgress size={16} color="inherit" /> : <ReplayIcon />}
                    onClick={handleRecalcularStatus}
                    disabled={recalculatingPayment}
                    aria-busy={recalculatingPayment || undefined}
                  >
                    {recalculatingPayment ? 'Recalculando…' : 'Recalcular status'}
                  </Button>
                </span>
              </Tooltip>
              {!['cancelled', 'refunded'].includes(paymentStatusLabel) && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={abrirDialogCancelamento}
                >
                  Cancelar Inscrição
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </PapperBlock>

      <CancelRegistrationDialog
        open={cancelDialogOpen && Boolean(cancelDialogInfo)}
        onClose={fecharDialogCancelamento}
        onConfirm={confirmarCancelamento}
        loading={cancelDialogLoading}
        info={cancelDialogInfo}
        targetLabel={inscricao?.orderCode ? `a inscrição ${inscricao.orderCode}` : null}
      />

      <Dialog open={dialogPagamentoOffline} onClose={handleFecharPagamentoOffline} maxWidth="sm" fullWidth>
        <DialogTitle>{pagamentoOfflineEdicao ? 'Editar pagamento offline' : 'Registrar pagamento presencial'}</DialogTitle>
        <DialogContent>
          {(() => {
            const valorParsed = parseFloat(formPagamentoOffline.amount);
            const valorInvalido = formPagamentoOffline.amount !== ''
              && (Number.isNaN(valorParsed) || valorParsed <= 0);
            return (
              <TextField
                fullWidth
                label="Valor do pagamento"
                type="number"
                value={formPagamentoOffline.amount}
                onChange={(event) => setFormPagamentoOffline(prev => ({ ...prev, amount: event.target.value }))}
                inputProps={{ min: '0.01', step: '0.01', inputMode: 'decimal' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>
                }}
                error={valorInvalido}
                helperText={valorInvalido ? 'Informe um valor maior que zero' : ' '}
                style={{ marginBottom: 16 }}
              />
            );
          })()}
          <FormControl fullWidth style={{ marginBottom: 16 }}>
            <InputLabel id="metodo-offline-label">Método</InputLabel>
            <Select
              labelId="metodo-offline-label"
              value={formPagamentoOffline.method}
              onChange={(event) => handleChangeMetodoOffline(event.target.value)}
            >
              <MenuItem value="cash">Dinheiro</MenuItem>
              <MenuItem value="pix">Pix</MenuItem>
              <MenuItem value="credit_card">Cartão de Crédito</MenuItem>
              <MenuItem value="pos">Maquininha</MenuItem>
              <MenuItem value="transfer">Transferência</MenuItem>
              <MenuItem value="manual">Manual</MenuItem>
            </Select>
          </FormControl>
          {formPagamentoOffline.method === 'credit_card' && (
            <Grid container spacing={2} style={{ marginBottom: 16 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="bandeira-offline-label">Bandeira</InputLabel>
                  <Select
                    labelId="bandeira-offline-label"
                    value={formPagamentoOffline.cardBrand}
                    onChange={(event) => setFormPagamentoOffline((prev) => ({ ...prev, cardBrand: event.target.value }))}
                  >
                    <MenuItem value="">
                      <em>Selecione</em>
                    </MenuItem>
                    {OFFLINE_CARD_BRANDS.map((cardBrand) => (
                      <MenuItem key={cardBrand} value={cardBrand}>
                        {cardBrand}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="parcelas-offline-label">Parcelas</InputLabel>
                  <Select
                    labelId="parcelas-offline-label"
                    value={formPagamentoOffline.installments}
                    onChange={(event) => setFormPagamentoOffline((prev) => ({ ...prev, installments: event.target.value }))}
                  >
                    {OFFLINE_INSTALLMENT_OPTIONS.map((installment) => (
                      <MenuItem key={installment} value={installment}>
                        {installment}x
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
          <TextField
            fullWidth
            label="Observações"
            multiline
            minRows={2}
            value={formPagamentoOffline.notes}
            onChange={(event) => setFormPagamentoOffline(prev => ({ ...prev, notes: event.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharPagamentoOffline}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvarPagamentoOffline}
            color="primary"
            variant="contained"
            disabled={(() => {
              const v = parseFloat(formPagamentoOffline.amount);
              return formPagamentoOffline.amount === '' || Number.isNaN(v) || v <= 0;
            })()}
          >
            {pagamentoOfflineEdicao ? 'Salvar alterações' : 'Registrar pagamento'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editBuyerDialogOpen}
        onClose={() => !editBuyerSaving && setEditBuyerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar dados do comprador</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {Object.keys(editBuyerForm).map((key) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField
                  fullWidth
                  size="small"
                  label={fieldLabel(key, inscricao?.buyerLabeledFields)}
                  value={editBuyerForm[key] ?? ''}
                  onChange={(e) => setEditBuyerForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  disabled={editBuyerSaving}
                />
              </Grid>
            ))}
            {Object.keys(editBuyerForm).length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Sem campos para editar.
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditBuyerDialogOpen(false)} disabled={editBuyerSaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={salvarEdicaoComprador}
            disabled={editBuyerSaving || Object.keys(editBuyerForm).length === 0}
          >
            {editBuyerSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editAttendeeDialogOpen}
        onClose={() => !editAttendeeSaving && setEditAttendeeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Editar inscrito {editAttendeeTarget?.attendeeNumber ? `#${editAttendeeTarget.attendeeNumber}` : ''}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {Object.keys(editAttendeeForm).map((key) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField
                  fullWidth
                  size="small"
                  label={fieldLabel(key, editAttendeeTarget?.labeledData)}
                  value={editAttendeeForm[key] ?? ''}
                  onChange={(e) => setEditAttendeeForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  disabled={editAttendeeSaving}
                />
              </Grid>
            ))}
            {Object.keys(editAttendeeForm).length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Sem campos para editar.
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAttendeeDialogOpen(false)} disabled={editAttendeeSaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={salvarEdicaoParticipante}
            disabled={editAttendeeSaving || Object.keys(editAttendeeForm).length === 0}
          >
            {editAttendeeSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification
        message={notification.message}
        type={notification.type}
        close={fecharNotificacao}
      />
      {ConfirmDialog}
    </div>
  );
}

export default RegistrationDetails;
