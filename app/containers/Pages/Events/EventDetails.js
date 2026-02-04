import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Card,
  Typography,
  Button,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination
} from '@material-ui/core';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@material-ui/icons';
import { useHistory, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import {
  buscarEvento,
  listarLotesPorEvento,
  criarLote,
  atualizarLote,
  listarInscricoesPorEvento,
  listarFormasPagamento,
  criarFormaPagamento,
  atualizarFormaPagamento,
  deletarFormaPagamento,
  cancelarInscricao,
  obterInfoCancelamentoInscricao
} from '../../../api/eventsApi';
import { EVENT_TYPE_LABELS } from '../../../constants/eventTypes';
import CancelRegistrationDialog from '../../../components/CancelRegistrationDialog';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

function EventDetails() {
  const history = useHistory();
  const { id } = useParams();
  const [tabAtiva, setTabAtiva] = useState(0);
  const [evento, setEvento] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [filters, setFilters] = useState({
    orderCode: '',
    buyerName: '',
    buyerDocument: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: ''
  });
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalInscricoes, setTotalInscricoes] = useState(0);
  const [notification, setNotification] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelDialogLoading, setCancelDialogLoading] = useState(false);
  const [cancelDialogInfo, setCancelDialogInfo] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const statusOptions = [
    '',
    'pending',
    'authorized',
    'partial',
    'confirmed',
    'denied',
    'cancelled',
    'refunded'
  ];

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      authorized: 'Autorizado',
      partial: 'Parcial',
      confirmed: 'Confirmado',
      denied: 'Negado',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado'
    };
    return labels[status] || status;
  };

  // Dialog de lote
  const [dialogLoteAberto, setDialogLoteAberto] = useState(false);
  const [loteEdicao, setLoteEdicao] = useState(null);
  const [formLote, setFormLote] = useState({
    name: '',
    price: '',
    maxQuantity: '',
    startDate: '',
    endDate: '',
    order: '',
    isActive: true
  });

  // Dialog de forma de pagamento
  const [dialogPagamentoAberto, setDialogPagamentoAberto] = useState(false);
  const [pagamentoEdicao, setPagamentoEdicao] = useState(null);
  const [formPagamento, setFormPagamento] = useState({
    paymentType: 'credit_card',
    maxInstallments: 1,
    interestRate: 0,
    interestType: 'percentage'
  });

  async function carregarDados() {
    try {
      setLoading(true);
      const [eventoRes, lotesRes, formasPagamentoRes] = await Promise.all([
        buscarEvento(id),
        listarLotesPorEvento(id),
        listarFormasPagamento(id)
      ]);

      setEvento(eventoRes);
      setLotes(lotesRes);
      setFormasPagamento(formasPagamentoRes);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setNotification('Erro ao carregar dados do evento');
    } finally {
      setLoading(false);
    }
  }

  async function carregarInscricoes(page = currentPage, perPage = rowsPerPage, currentFilters = filters) {
    if (!id) return;
    setRegistrationsLoading(true);
    try {
      const params = {
        page: page + 1,
        perPage,
        orderCode: currentFilters.orderCode || undefined,
        buyerName: currentFilters.buyerName || undefined,
        buyerDocument: currentFilters.buyerDocument || undefined,
        paymentStatus: currentFilters.paymentStatus || undefined,
        dateFrom: currentFilters.dateFrom || undefined,
        dateTo: currentFilters.dateTo || undefined
      };
      const response = await listarInscricoesPorEvento(id, params);
      setInscricoes(response.records || []);
      setTotalInscricoes(response.total || 0);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
      setNotification('Erro ao carregar inscrições do evento');
    } finally {
      setRegistrationsLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, [id]);

  useEffect(() => {
    setCurrentPage(0);
  }, [id]);

  useEffect(() => {
    setCurrentPage(0);
  }, [filters]);

  useEffect(() => {
    carregarInscricoes(currentPage, rowsPerPage, filters);
  }, [id, currentPage, rowsPerPage, filters]);

  const handleAbrirDialogLote = (lote = null) => {
    if (lote) {
      setLoteEdicao(lote);
      setFormLote({
        name: lote.name,
        price: lote.price,
        maxQuantity: lote.maxQuantity || '',
        startDate: lote.startDate ? lote.startDate.substring(0, 16) : '',
        endDate: lote.endDate ? lote.endDate.substring(0, 16) : '',
        order: lote.order || '',
        isActive: lote.isActive
      });
    } else {
      setLoteEdicao(null);
      setFormLote({
        name: '',
        price: '',
        maxQuantity: '',
        startDate: '',
        endDate: '',
        order: lotes.length + 1,
        isActive: true
      });
    }
    setDialogLoteAberto(true);
  };

  const handleFecharDialogLote = () => {
    setDialogLoteAberto(false);
    setLoteEdicao(null);
  };

  const handleSalvarLote = async () => {
    try {
      const dados = {
        ...formLote,
        eventId: id,
        price: parseFloat(formLote.price),
        maxQuantity: formLote.maxQuantity ? parseInt(formLote.maxQuantity, 10) : null,
        order: formLote.order ? parseInt(formLote.order, 10) : 0
      };

      if (loteEdicao) {
        await atualizarLote(loteEdicao.id, dados);
        setNotification('Lote atualizado com sucesso!');
      } else {
        await criarLote(dados);
        setNotification('Lote criado com sucesso!');
      }

      handleFecharDialogLote();
      carregarDados();
      carregarInscricoes();
    } catch (error) {
      console.error('Erro ao salvar lote:', error);
      setNotification(error.message || 'Erro ao salvar lote');
    }
  };

  const handleAlternarStatusLote = async (lote) => {
    const acao = lote.isActive ? 'inativar' : 'reativar';
    if (!window.confirm(`Deseja ${acao} o lote "${lote.name}"?`)) {
      return;
    }

    try {
      await atualizarLote(lote.id, { isActive: !lote.isActive });
      setNotification(`Lote ${acao}do com sucesso!`);
      carregarDados();
      carregarInscricoes();
    } catch (error) {
      console.error('Erro ao atualizar status do lote:', error);
      setNotification(error.message || 'Erro ao atualizar o lote');
    }
  };

  // Funções de Forma de Pagamento
  const handleAbrirDialogPagamento = (pagamento = null) => {
    if (pagamento) {
      setPagamentoEdicao(pagamento);
      setFormPagamento({
        paymentType: pagamento.paymentType,
        maxInstallments: pagamento.maxInstallments || 1,
        interestRate: pagamento.interestRate || 0,
        interestType: pagamento.interestType || 'percentage'
      });
    } else {
      setPagamentoEdicao(null);
      setFormPagamento({
        paymentType: 'credit_card',
        maxInstallments: 1,
        interestRate: 0,
        interestType: 'percentage'
      });
    }
    setDialogPagamentoAberto(true);
  };

  const handleFecharDialogPagamento = () => {
    setDialogPagamentoAberto(false);
    setPagamentoEdicao(null);
  };

  const handleSalvarPagamento = async () => {
    try {
      const dados = {
        ...formPagamento,
        maxInstallments: parseInt(formPagamento.maxInstallments, 10),
        interestRate: parseFloat(formPagamento.interestRate)
      };

      if (pagamentoEdicao) {
        await atualizarFormaPagamento(pagamentoEdicao.id, dados);
        setNotification('Forma de pagamento atualizada com sucesso!');
      } else {
        await criarFormaPagamento(id, dados);
        setNotification('Forma de pagamento criada com sucesso!');
      }

      handleFecharDialogPagamento();
      carregarDados();
      carregarInscricoes();
    } catch (error) {
      console.error('Erro ao salvar forma de pagamento:', error);
      setNotification(error.message || 'Erro ao salvar forma de pagamento');
    }
  };

  const handleDeletarPagamento = async (pagamentoId, tipo) => {
    if (window.confirm(`Tem certeza que deseja deletar a forma de pagamento "${tipo}"?`)) {
      try {
        await deletarFormaPagamento(pagamentoId);
        setNotification('Forma de pagamento deletada com sucesso!');
        carregarDados();
        carregarInscricoes();
      } catch (error) {
        console.error('Erro ao deletar forma de pagamento:', error);
        setNotification(error.message || 'Erro ao deletar forma de pagamento');
      }
    }
  };

  const traduzirTipoPagamento = (tipo) => {
    const traducoes = {
      credit_card: 'Cartão de Crédito',
      pix: 'PIX',
      boleto: 'Boleto',
      offline: 'Presencial'
    };
    return traducoes[tipo] || tipo;
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarDataHora = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-BR');
  };

  const formatarPreco = (preco) => {
    const valor = Number(preco) || 0;
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const formatarMoeda = (valor) => {
    const numero = Number(valor) || 0;
    return `R$ ${numero.toFixed(2).replace('.', ',')}`;
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const abrirDialogCancelamento = async (inscricaoId, orderCode) => {
    try {
      const info = await obterInfoCancelamentoInscricao(inscricaoId);
      setCancelDialogInfo({
        ...info,
        orderCode
      });
      setCancelTarget({ id: inscricaoId, orderCode });
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
    setCancelTarget(null);
  };

  const confirmarCancelamento = async () => {
    if (!cancelTarget?.id) {
      return;
    }
    setCancelDialogLoading(true);
    try {
      await cancelarInscricao(cancelTarget.id);
      setNotification('Inscrição cancelada com sucesso.');
      fecharDialogCancelamento();
      carregarDados();
      carregarInscricoes();
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      setNotification(error.message || 'Erro ao cancelar a inscrição.');
    } finally {
      setCancelDialogLoading(false);
    }
  };

  const cancelDialogTargetLabel = cancelDialogInfo?.orderCode
    ? `a inscrição ${cancelDialogInfo.orderCode}`
    : cancelTarget?.orderCode
      ? `a inscrição ${cancelTarget.orderCode}`
      : null;

  const bannableStatuses = new Set(['denied', 'expired', 'refunded', 'cancelled']);

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  if (loading) {
    return <Typography>Carregando...</Typography>;
  }

  if (!evento) {
    return <Typography>Evento não encontrado</Typography>;
  }

  const title = brand.name + ' - ' + evento.title;
  const resumoInscricoes = evento.registrationStats || {};
  const totalInscritos = resumoInscricoes.confirmedCount ?? 0;
  const totalValorConfirmado = resumoInscricoes.confirmedTotalValue ?? 0;
  const negadoCancelado = resumoInscricoes.deniedCancelled ?? 0;
  const expirados = resumoInscricoes.expiredCount ?? 0;
  const pendentes = resumoInscricoes.pendingCount ?? 0;
  const locationSummary = [
    evento.location,
    evento.addressNumber,
    evento.neighborhood,
    evento.city,
    evento.cep
  ].filter(Boolean).join(', ');
  const mapUrl = (evento.latitude != null && evento.longitude != null)
    ? `https://maps.google.com/maps?q=${evento.latitude},${evento.longitude}&z=15&hl=pt-BR&output=embed`
    : null;
  const kpiItems = [
    { label: 'Inscritos confirmados', value: totalInscritos },
    { label: 'Valor Confirmados', value: formatarMoeda(totalValorConfirmado) },
    { label: 'Negado/Cancelado', value: negadoCancelado },
    { label: 'Expirados', value: expirados },
    { label: 'Pendentes', value: pendentes }
  ];

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      {/* Informações do Evento */}
      <PapperBlock
        title={evento.title}
        icon="ion-ios-calendar-outline"
        desc={evento.description}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Data Início:</strong> {formatarDataHora(evento.startDate)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Data Término:</strong> {formatarDataHora(evento.endDate)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Tipo de Evento:</strong> {EVENT_TYPE_LABELS[evento.eventType] || evento.eventType || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Total de Vagas:</strong> {evento.maxRegistrations || 'Não informado'}
                </Typography>
              </Grid>
            </Grid>
            <div style={{ marginTop: 16 }}>
              <Chip
                label={evento.isActive ? 'Ativo' : 'Inativo'}
                color={evento.isActive ? 'primary' : 'default'}
              />
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div
              style={{
                width: '100%',
                height: 220,
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: '#f5f5f5'
              }}
            >
              {mapUrl ? (
                <iframe
                  title="Mapa do Evento"
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  allowFullScreen
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: 16
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    Localização não informada
                  </Typography>
                </div>
              )}
            </div>
            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
              <strong>Endereço:</strong> {locationSummary || 'Dados não informados'}
            </Typography>
          </Grid>
        </Grid>

        <Card style={{ marginTop: 16, padding: 16 }} variant="outlined">
          
          <Grid container spacing={1} alignItems="center" justifyContent="space-between">
            {kpiItems.map((item) => (
              <Grid item key={item.label} style={{ flexGrow: 1 }}>
                <Card
                  variant="outlined"
                  style={{
                    padding: 12,
                    textAlign: 'center',
                    marginRight: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h6">
                    {typeof item.value === 'number'
                      ? item.value.toLocaleString('pt-BR')
                      : item.value}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {item.label}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Card>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => history.push('/app/events')}
          >
            Voltar
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => history.push(`/app/events/${id}/editar`)}
          >
            Editar Evento
          </Button>
        </div>
      </PapperBlock>

      {/* Tabs */}
      <Card style={{ marginTop: 16 }}>
        <Tabs
          value={tabAtiva}
          onChange={(e, newValue) => setTabAtiva(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Lotes" />
          <Tab label="Inscrições" />
          <Tab label="Formulário" />
          <Tab label="Formas de Pagamento" />
        </Tabs>

        {/* Tab Lotes */}
        <TabPanel value={tabAtiva} index={0}>
          <div style={{ marginBottom: 16 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleAbrirDialogLote()}
            >
              Novo Lote
            </Button>
          </div>

          {lotes.length === 0 ? (
            <Typography>Nenhum lote cadastrado</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Preço</TableCell>
                  <TableCell>Vagas</TableCell>
                  <TableCell>Período</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lotes.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell>{lote.name}</TableCell>
                    <TableCell>{formatarPreco(lote.price)}</TableCell>
                    <TableCell>
                      {lote.currentQuantity || 0}
                      {lote.maxQuantity && ` / ${lote.maxQuantity}`}
                    </TableCell>
                    <TableCell>
                      {formatarData(lote.startDate)} - {formatarData(lote.endDate)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={lote.isActive ? 'Ativo' : 'Inativo'}
                        color={lote.isActive ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleAbrirDialogLote(lote)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={lote.isActive ? 'Inativar Lote' : 'Reativar Lote'}>
                        <IconButton
                          size="small"
                          onClick={() => handleAlternarStatusLote(lote)}
                        >
                          <BlockIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabPanel>

        {/* Tab Inscrições */}
        <TabPanel value={tabAtiva} index={1}>
          <Grid container spacing={2} alignItems="flex-end" style={{ marginBottom: 8 }}>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Código do pedido"
                fullWidth
                value={filters.orderCode}
                onChange={(event) => handleFilterChange('orderCode', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Nome do comprador"
                fullWidth
                value={filters.buyerName}
                onChange={(event) => handleFilterChange('buyerName', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Documento"
                fullWidth
                value={filters.buyerDocument}
                onChange={(event) => handleFilterChange('buyerDocument', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={filters.paymentStatus}
                  label="Status"
                  onChange={(event) => handleFilterChange('paymentStatus', event.target.value)}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status ? getStatusLabel(status) : 'Todos'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Data de início"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filters.dateFrom}
                onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Data final"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filters.dateTo}
                onChange={(event) => handleFilterChange('dateTo', event.target.value)}
              />
            </Grid>
          </Grid>
          {registrationsLoading ? (
            <Typography>Carregando inscrições...</Typography>
          ) : inscricoes.length === 0 ? (
            <Typography>Nenhuma inscrição realizada</Typography>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Lote</TableCell>
                    <TableCell>Quantidade</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inscricoes.map((inscricao) => (
                    <TableRow
                      key={inscricao.id}
                      hover
                      style={{ cursor: 'pointer' }}
                      onClick={() => history.push(`/app/events/registrations/${inscricao.id}`)}
                    >
                      <TableCell>{inscricao.orderCode}</TableCell>
                      <TableCell>{inscricao.batchName || inscricao.batch?.name || '-'}</TableCell>
                      <TableCell>{inscricao.quantity}</TableCell>
                      <TableCell>{formatarPreco(inscricao.finalPrice)}</TableCell>
                      <TableCell>{formatarDataHora(inscricao.createdAt)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getStatusLabel(inscricao.paymentStatus)}
                          color={inscricao.paymentStatus === 'confirmed' ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {!bannableStatuses.has(inscricao.paymentStatus) && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            abrirDialogCancelamento(inscricao.id, inscricao.orderCode);
                          }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={totalInscricoes}
                page={currentPage}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </>
          )}
        </TabPanel>

        {/* Tab Formulário */}
        <TabPanel value={tabAtiva} index={2}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Configure os campos personalizados que serão preenchidos durante a inscrição.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            style={{ marginTop: 16 }}
            onClick={() => history.push(`/app/events/${id}/formulario`)}
          >
            Configurar Formulário
          </Button>
        </TabPanel>

        {/* Tab Formas de Pagamento */}
        <TabPanel value={tabAtiva} index={3}>
          <div style={{ marginBottom: 16 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleAbrirDialogPagamento()}
            >
              Adicionar Forma de Pagamento
            </Button>
          </div>

          {formasPagamento.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              Nenhuma forma de pagamento configurada ainda.
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Parcelas</TableCell>
                  <TableCell>Juros</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formasPagamento.map((pagamento) => (
                  <TableRow key={pagamento.id}>
                    <TableCell>{traduzirTipoPagamento(pagamento.paymentType)}</TableCell>
                    <TableCell>
                      {pagamento.paymentType === 'credit_card'
                        ? `Até ${pagamento.maxInstallments}x`
                        : pagamento.paymentType === 'offline'
                          ? 'Presencial'
                          : 'À vista'}
                    </TableCell>
                    <TableCell>
                      {pagamento.paymentType === 'credit_card' && pagamento.interestRate > 0
                        ? `${pagamento.interestRate}% ${pagamento.interestType === 'percentage' ? 'a.m.' : 'fixo'}`
                        : 'Sem juros'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pagamento.isActive ? 'Ativo' : 'Inativo'}
                        color={pagamento.isActive ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleAbrirDialogPagamento(pagamento)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deletar">
                        <IconButton
                          size="small"
                          onClick={() => handleDeletarPagamento(pagamento.id, traduzirTipoPagamento(pagamento.paymentType))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabPanel>
      </Card>

      <CancelRegistrationDialog
        open={cancelDialogOpen && Boolean(cancelDialogInfo)}
        onClose={fecharDialogCancelamento}
        onConfirm={confirmarCancelamento}
        loading={cancelDialogLoading}
        info={cancelDialogInfo}
        targetLabel={cancelDialogTargetLabel}
      />

      {/* Dialog de Lote */}
      <Dialog open={dialogLoteAberto} onClose={handleFecharDialogLote} maxWidth="sm" fullWidth>
        <DialogTitle>{loteEdicao ? 'Editar Lote' : 'Novo Lote'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Nome do Lote"
                value={formLote.name}
                onChange={(e) => setFormLote({ ...formLote, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Preço (R$)"
                value={formLote.price}
                onChange={(e) => setFormLote({ ...formLote, price: e.target.value })}
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Máximo de Vagas"
                value={formLote.maxQuantity}
                onChange={(e) => setFormLote({ ...formLote, maxQuantity: e.target.value })}
                helperText="Deixe vazio para ilimitado"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Data Início"
                value={formLote.startDate}
                onChange={(e) => setFormLote({ ...formLote, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Data Fim"
                value={formLote.endDate}
                onChange={(e) => setFormLote({ ...formLote, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Ordem de Exibição"
                value={formLote.order}
                onChange={(e) => setFormLote({ ...formLote, order: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialogLote}>Cancelar</Button>
          <Button onClick={handleSalvarLote} color="primary" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Forma de Pagamento */}
      <Dialog open={dialogPagamentoAberto} onClose={handleFecharDialogPagamento} maxWidth="sm" fullWidth>
        <DialogTitle>{pagamentoEdicao ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                required
                label="Tipo de Pagamento"
                value={formPagamento.paymentType}
                onChange={(e) => setFormPagamento({ ...formPagamento, paymentType: e.target.value })}
                SelectProps={{ native: true }}
                disabled={!!pagamentoEdicao}
              >
                <option value="credit_card">Cartão de Crédito</option>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="offline">Presencial</option>
              </TextField>
            </Grid>

            {formPagamento.paymentType === 'credit_card' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Máximo de Parcelas"
                    value={formPagamento.maxInstallments}
                    onChange={(e) => setFormPagamento({ ...formPagamento, maxInstallments: e.target.value })}
                    inputProps={{ min: 1, max: 12 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Taxa de Juros (%)"
                    value={formPagamento.interestRate}
                    onChange={(e) => setFormPagamento({ ...formPagamento, interestRate: e.target.value })}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="0 = sem juros"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Tipo de Juros"
                    value={formPagamento.interestType}
                    onChange={(e) => setFormPagamento({ ...formPagamento, interestType: e.target.value })}
                    SelectProps={{ native: true }}
                  >
                    <option value="percentage">Percentual (a.m.)</option>
                    <option value="fixed">Fixo (R$)</option>
                  </TextField>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialogPagamento}>Cancelar</Button>
          <Button
            onClick={handleSalvarPagamento}
            variant="contained"
            color="primary"
          >
            {pagamentoEdicao ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

export default EventDetails;
