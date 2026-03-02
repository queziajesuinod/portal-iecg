import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';
import {
  Grid,
  Card,
  CardContent,
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
  Tooltip
} from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBack';
import CancelIcon from '@mui/icons-material/Cancel';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReplayIcon from '@mui/icons-material/Replay';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useHistory, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import {
  buscarInscricao,
  cancelarInscricao,
  listarFormasPagamento,
  criarPagamentoOfflineInscricao,
  atualizarPagamentoOfflineInscricao,
  deletarPagamentoInscricao,
  recalcularStatusInscricao,
  obterInfoCancelamentoInscricao
} from '../../../api/eventsApi';
import { getPaymentStatusChipSx, getPaymentStatusLabel } from '../../../constants/paymentStatus';
import { getStoredPermissions } from '../../../utils/permissions';
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

function RegistrationDetails() {
  const history = useHistory();
  const { id } = useParams();
  const [inscricao, setInscricao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelDialogInfo, setCancelDialogInfo] = useState(null);
  const [cancelDialogLoading, setCancelDialogLoading] = useState(false);
  const [, setPaymentOptions] = useState([]);
  const [dialogPagamentoOffline, setDialogPagamentoOffline] = useState(false);
  const [pagamentoOfflineEdicao, setPagamentoOfflineEdicao] = useState(null);
  const [recalculatingPayment, setRecalculatingPayment] = useState(false);
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
      setNotification('Erro ao carregar inscrição');
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
      setNotification('Não foi possível verificar o tipo de cancelamento');
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
      setNotification('Inscrição cancelada com sucesso!');
      fecharDialogCancelamento();
      carregarInscricao();
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      setNotification(error.response?.data?.message || 'Erro ao cancelar inscrição');
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
          setNotification('Selecione a bandeira do cartao');
          return;
        }
        const parcelas = Number.parseInt(formPagamentoOffline.installments, 10);
        if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) {
          setNotification('Informe uma quantidade de parcelas valida (1 a 12)');
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
        setNotification('Pagamento offline atualizado com sucesso!');
      } else {
        await criarPagamentoOfflineInscricao(id, payload);
        setNotification('Pagamento presencial registrado com sucesso!');
      }
      handleFecharPagamentoOffline();
      carregarInscricao();
    } catch (error) {
      console.error('Erro ao salvar pagamento presencial:', error);
      setNotification(error.response?.data?.message || error.message || 'Erro ao salvar pagamento presencial');
    }
  };

  const handleExcluirPagamento = async (payment) => {
    if (!payment?.id) return;
    if (payment.status !== 'pending') {
      setNotification('Somente pagamentos pendentes podem ser excluídos.');
      return;
    }
    if (!window.confirm('Deseja excluir este pagamento pendente?')) {
      return;
    }
    try {
      await deletarPagamentoInscricao(id, payment.id);
      setNotification('Pagamento pendente excluído com sucesso!');
      carregarInscricao();
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error);
      setNotification(error.response?.data?.message || error.message || 'Erro ao excluir pagamento');
    }
  };

  const handleRecalcularStatus = async () => {
    setRecalculatingPayment(true);
    try {
      await recalcularStatusInscricao(id);
      setNotification('Status recalculado com sucesso');
      carregarInscricao();
    } catch (error) {
      console.error('Erro ao recalcular status da inscrição:', error);
      setNotification(error.message || 'Erro ao recalcular status da inscrição');
    } finally {
      setRecalculatingPayment(false);
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-BR');
  };

  const formatarPreco = (preco) => `R$ ${parseFloat(preco).toFixed(2).replace('.', ',')}`;

  const getMetodoPagamentoLabel = (metodo) => {
    const labels = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      cash: 'Dinheiro',
      pos: 'Maquininha',
      transfer: 'Transferência',
      manual: 'Manual'
    };
    return labels[metodo] || metodo;
  };

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(255,255,255,0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex: 1400
        }}
      >
        <img
          src="/spinner.gif"
          alt="Carregando inscrição"
          style={{ width: 96, height: 96 }}
        />
        <Typography variant="h6" color="textSecondary">
          Carregando inscrição...
        </Typography>
      </div>
    );
  }

  if (!inscricao) {
    return <Typography>Inscrição não encontrada</Typography>;
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
                <Typography variant="h6" gutterBottom>
                  Informações Gerais
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Código do Pedido:</strong>
                    </Typography>
                    <Typography variant="body1">{inscricao.orderCode}</Typography>
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
                <Typography variant="h6" gutterBottom>
                  Dados do Comprador
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                {renderFieldTable(buyerFields)}
              </CardContent>
            </Card>
          </Grid>

          {/* Informações de Pagamento */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
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
                        <Typography variant="h6" color="primary">
                          {formatarPreco(inscricao.finalPrice)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Total Pago:</strong></TableCell>
                      <TableCell>{formatarPreco(paidTotal)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Saldo Restante:</strong></TableCell>
                      <TableCell>{formatarPreco(remaining)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Modo:</strong></TableCell>
                      <TableCell>
                        {inscricao.event?.registrationPaymentMode === 'BALANCE_DUE' ? 'Pagamento parcial' : 'Pagamento unico'}
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
                    <Typography variant="h6" gutterBottom>
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
                  <Typography variant="body2" color="textSecondary">
                    Nenhum pagamento registrado
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Canal</TableCell>
                        <TableCell>Método</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Valor</TableCell>
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
                          <TableCell align="center">
                            {canRegisterOffline && payment.channel === 'OFFLINE' && (
                              <Tooltip title="Editar pagamento offline">
                                <IconButton size="small" onClick={() => handleAbrirEdicaoPagamentoOffline(payment)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canRegisterOffline && payment.status === 'pending' && (
                              <Tooltip title="Excluir pagamento pendente">
                                <IconButton size="small" onClick={() => handleExcluirPagamento(payment)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {remaining === 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Typography variant="body2" color="primary">
                      Quitado: pagamento total confirmado.
                    </Typography>
                  </div>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Dados dos Inscritos */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dados dos Inscritos ({inscricao.attendees?.length || 0})
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                {inscricao.attendees && inscricao.attendees.length > 0 ? (
                  <Grid container spacing={2}>
                    {inscricao.attendees.map((attendee) => (
                      <Grid item xs={12} md={6} key={attendee.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              Inscrito #{attendee.attendeeNumber}
                            </Typography>
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
                  <Typography variant="h6" gutterBottom>
                    <ReceiptIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Histórico de Transações
                  </Typography>
                  <Divider style={{ marginBottom: 16 }} />
                  <Table>
                    <TableBody>
                      {inscricao.transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Typography variant="body2">
                              <strong>{transaction.transactionType}</strong>
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formatarData(transaction.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={transaction.status}
                              size="small"
                              color={transaction.status === 'success' ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatarPreco(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Botões de Ação */}
          <Grid item xs={12}>
            <div style={{ display: 'flex', gap: 16 }}>
              <Button
                variant="outlined"
                startIcon={<BackIcon />}
                onClick={() => history.goBack()}
              >
                Voltar
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<ReplayIcon />}
                onClick={handleRecalcularStatus}
                disabled={recalculatingPayment}
              >
                Recalcular status de pagamento
              </Button>
              {paymentStatusLabel === 'confirmed' && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<CancelIcon />}
                  onClick={abrirDialogCancelamento}
                >
                    Cancelar Inscrição
                </Button>
              )}
            </div>
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
          <TextField
            fullWidth
            label="Valor do pagamento"
            type="number"
            value={formPagamentoOffline.amount}
            onChange={(event) => setFormPagamentoOffline(prev => ({ ...prev, amount: event.target.value }))}
            inputProps={{ min: '0.01', step: '0.01' }}
            style={{ marginBottom: 16 }}
          />
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
          <Button onClick={handleSalvarPagamentoOffline} color="primary" variant="contained">
            {pagamentoOfflineEdicao ? 'Salvar alterações' : 'Registrar pagamento'}
          </Button>
        </DialogActions>
      </Dialog>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

export default RegistrationDetails;
