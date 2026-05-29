import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Box,
  Table,
  TableContainer,
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
  TablePagination,
  Backdrop,
  Skeleton,
  Stack,
  Alert
} from '@mui/material';
import BackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckInIcon from '@mui/icons-material/CheckCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DescriptionIcon from '@mui/icons-material/Description';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import BedIcon from '@mui/icons-material/KingBed';
import GroupsIcon from '@mui/icons-material/Groups';
import DownloadIcon from '@mui/icons-material/Download';
import { useHistory, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import brand from 'dan-api/dummy/brand';
import { queryKeys } from '../../../utils/queryKeys';
import { useConfirm } from '../../../utils/useConfirm';
import {
  buscarEvento,
  listarLotesPorEvento,
  criarLote,
  atualizarLote,
  listarInscricoesPorEvento,
  listarInscritosConfirmadosPorEvento,
  listarFormasPagamento,
  criarFormaPagamento,
  atualizarFormaPagamento,
  deletarFormaPagamento,
  cancelarInscricao,
  obterInfoCancelamentoInscricao,
  reenviarTicket
} from '../../../api/eventsApi';
import { EVENT_TYPE_LABELS } from '../../../constants/eventTypes';
import { getPaymentStatusChipSx, getPaymentStatusLabel } from '../../../constants/paymentStatus';
import {
  formatDateInAppTimezone,
  formatDateTimeInAppTimezone,
  getTodayDateInputValue
} from '../../../utils/dateTime';
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
  const { confirm, ConfirmDialog } = useConfirm();
  const history = useHistory();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [tabAtiva, setTabAtiva] = useState(0);
  const [filters, setFilters] = useState({
    orderCode: '',
    buyerName: '',
    buyerDocument: '',
    paymentStatus: [],
    dateFrom: '',
    dateTo: ''
  });
  const [exportingSales, setExportingSales] = useState(false);
  const [exportingConfirmed, setExportingConfirmed] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmedFilters, setConfirmedFilters] = useState({
    lote: '',
    orderCode: '',
    nomeCompleto: ''
  });
  const [confirmedPage, setConfirmedPage] = useState(0);
  const [confirmedRowsPerPage, setConfirmedRowsPerPage] = useState(10);
  const [notification, setNotification] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelDialogInfo, setCancelDialogInfo] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  // ===== Queries (cache compartilhado, refetch coordenado pela aba ativa) =====

  const eventoQuery = useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => buscarEvento(id),
    enabled: Boolean(id),
  });
  const evento = eventoQuery.data || null;
  const loading = eventoQuery.isLoading;

  const lotesQuery = useQuery({
    queryKey: queryKeys.events.batches(id),
    queryFn: () => listarLotesPorEvento(id),
    enabled: Boolean(id) && (tabAtiva === 0),
  });
  const lotes = lotesQuery.data || [];
  const lotesLoading = lotesQuery.isLoading;

  const formasQuery = useQuery({
    queryKey: queryKeys.events.paymentOptions(id),
    queryFn: () => listarFormasPagamento(id),
    enabled: Boolean(id) && (tabAtiva === 3),
  });
  const formasPagamento = formasQuery.data || [];
  const formasLoading = formasQuery.isLoading;

  const inscricoesParams = (() => {
    const statusParam = Array.isArray(filters.paymentStatus)
      ? filters.paymentStatus.join(',') || undefined
      : filters.paymentStatus || undefined;
    return {
      page: currentPage + 1,
      perPage: rowsPerPage,
      orderCode: filters.orderCode || undefined,
      buyerName: filters.buyerName || undefined,
      buyerDocument: filters.buyerDocument || undefined,
      paymentStatus: statusParam,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined
    };
  })();

  const inscricoesQuery = useQuery({
    queryKey: queryKeys.events.registrations(id, inscricoesParams),
    queryFn: () => listarInscricoesPorEvento(id, inscricoesParams),
    enabled: Boolean(id) && tabAtiva === 1,
    placeholderData: (prev) => prev,
  });
  const inscricoes = inscricoesQuery.data?.records || [];
  const totalInscricoes = inscricoesQuery.data?.total || 0;
  const registrationsLoading = inscricoesQuery.isFetching;

  const confirmedParams = {
    page: confirmedPage + 1,
    perPage: confirmedRowsPerPage,
    lote: confirmedFilters.lote || undefined,
    orderCode: confirmedFilters.orderCode || undefined,
    nomeCompleto: confirmedFilters.nomeCompleto || undefined
  };
  const confirmedQuery = useQuery({
    queryKey: ['events', 'confirmed-attendees', id, confirmedParams],
    queryFn: () => listarInscritosConfirmadosPorEvento(id, confirmedParams),
    enabled: Boolean(id) && tabAtiva === 2,
    placeholderData: (prev) => prev,
  });
  const inscritosConfirmados = confirmedQuery.data?.records || [];
  const totalInscritosConfirmados = confirmedQuery.data?.total || 0;
  const confirmedAttendeesLoading = confirmedQuery.isFetching;

  // Helpers de invalidacao usados pelas mutations (mantem nomes das funcoes antigas).
  const carregarDados = () => queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) });
  const carregarLotes = () => queryClient.invalidateQueries({ queryKey: queryKeys.events.batches(id) });
  const carregarFormas = () => queryClient.invalidateQueries({ queryKey: queryKeys.events.paymentOptions(id) });
  const carregarInscricoes = () => queryClient.invalidateQueries({ queryKey: ['events', 'registrations', id] });
  const carregarInscritosConfirmados = () => queryClient.invalidateQueries({ queryKey: ['events', 'confirmed-attendees', id] });

  // Reportar erros das queries no Notification.
  if (eventoQuery.error && eventoQuery.error._reported !== true) {
    eventoQuery.error._reported = true;
    setTimeout(() => setNotification('Erro ao carregar dados do evento'), 0);
  }
  if (lotesQuery.error && lotesQuery.error._reported !== true) {
    lotesQuery.error._reported = true;
    setTimeout(() => setNotification('Erro ao carregar lotes do evento'), 0);
  }
  if (formasQuery.error && formasQuery.error._reported !== true) {
    formasQuery.error._reported = true;
    setTimeout(() => setNotification('Erro ao carregar formas de pagamento'), 0);
  }
  if (inscricoesQuery.error && inscricoesQuery.error._reported !== true) {
    inscricoesQuery.error._reported = true;
    setTimeout(() => setNotification('Erro ao carregar inscrições do evento'), 0);
  }
  if (confirmedQuery.error && confirmedQuery.error._reported !== true) {
    confirmedQuery.error._reported = true;
    setTimeout(() => setNotification('Erro ao carregar inscritos confirmados do evento'), 0);
  }

  const statusOptions = [
    '',
    'pending',
    'expired',
    'partial',
    'confirmed',
    'denied',
    'cancelled',
    'refunded'
  ];

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
    installmentInterestRates: {}
  });

  useEffect(() => {
    if (!evento?.title) return;
    const currentPageTitle = history.location?.state?.pageTitle;
    if (currentPageTitle === evento.title) return;

    history.replace({
      pathname: history.location.pathname,
      search: history.location.search,
      hash: history.location.hash,
      state: {
        ...(history.location.state || {}),
        pageTitle: evento.title
      }
    });
  }, [evento?.title, history]);

  useEffect(() => {
    setCurrentPage(0);
  }, [id]);

  useEffect(() => {
    setCurrentPage(0);
  }, [filters]);

  useEffect(() => {
    setConfirmedPage(0);
  }, [id]);

  useEffect(() => {
    setConfirmedPage(0);
  }, [confirmedFilters]);

  // Carregamento das abas e' coordenado pelas opcoes `enabled` em cada useQuery acima.

  const handleAbrirDialogLote = (lote = null) => {
    if (lote) {
      setLoteEdicao(lote);
      setFormLote({
        name: lote.name,
        price: evento?.requiresPayment === false ? '0' : String(lote.price ?? ''),
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
        price: evento?.requiresPayment === false ? '0' : '',
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

  const salvarLoteMutation = useMutation({
    mutationFn: async ({ loteId, dados }) => (
      loteId ? atualizarLote(loteId, dados) : criarLote(dados)
    ),
    onSuccess: (_data, { loteId }) => {
      setNotification(loteId ? 'Lote atualizado com sucesso!' : 'Lote criado com sucesso!');
      handleFecharDialogLote();
      carregarDados();
      carregarLotes();
      carregarInscricoes();
    },
    onError: (error) => setNotification(error.message || 'Erro ao salvar lote'),
  });

  const handleSalvarLote = () => {
    const dados = {
      ...formLote,
      eventId: id,
      price: evento?.requiresPayment === false ? 0 : parseFloat(formLote.price),
      maxQuantity: formLote.maxQuantity ? parseInt(formLote.maxQuantity, 10) : null,
      order: formLote.order ? parseInt(formLote.order, 10) : 0
    };
    salvarLoteMutation.mutate({ loteId: loteEdicao?.id || null, dados });
  };

  const alternarStatusLoteMutation = useMutation({
    mutationFn: ({ loteId, nextActive }) => atualizarLote(loteId, { isActive: nextActive }),
    onSuccess: (_data, { acao }) => {
      setNotification(`Lote ${acao}do com sucesso!`);
      carregarDados();
      carregarLotes();
      carregarInscricoes();
    },
    onError: (error) => setNotification(error.message || 'Erro ao atualizar o lote'),
  });

  const handleAlternarStatusLote = async (lote) => {
    const acao = lote.isActive ? 'inativar' : 'reativar';
    const ok = await confirm({
      title: `${acao.charAt(0).toUpperCase() + acao.slice(1)} lote`, message: `Deseja ${acao} o lote "${lote.name}"?`, confirmText: acao.charAt(0).toUpperCase() + acao.slice(1), confirmColor: 'warning', severity: 'warning'
    });
    if (!ok) return;
    alternarStatusLoteMutation.mutate({ loteId: lote.id, nextActive: !lote.isActive, acao });
  };

  // Funções de Forma de Pagamento
  const normalizeInstallmentRates = (rates, maxInstallments) => {
    const max = Number(maxInstallments) || 1;
    if (!rates || typeof rates !== 'object') {
      return {};
    }

    return Object.entries(rates).reduce((acc, [installments, rate]) => {
      const installmentCount = Number(installments);
      const parsedRate = Number(rate);
      if (!Number.isInteger(installmentCount) || installmentCount < 2 || installmentCount > max) {
        return acc;
      }
      if (!Number.isFinite(parsedRate) || parsedRate < 0) {
        return acc;
      }
      acc[String(installmentCount)] = parsedRate;
      return acc;
    }, {});
  };

  const buildLegacyRates = (maxInstallments, interestRate) => {
    const max = Number(maxInstallments) || 1;
    const rate = Number(interestRate || 0);
    if (!Number.isFinite(rate) || rate <= 0 || max < 2) {
      return {};
    }

    const legacyRates = {};
    for (let i = 2; i <= max; i += 1) {
      legacyRates[String(i)] = rate;
    }
    return legacyRates;
  };

  const formatarJurosParcelados = (pagamento) => {
    const max = Number(pagamento.maxInstallments || 1);
    const rates = normalizeInstallmentRates(pagamento.installmentInterestRates, max);
    const entries = Object.entries(rates)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([installments, rate]) => `${installments}x: ${Number(rate).toFixed(2).replace('.', ',')}%`);

    if (entries.length > 0) {
      return entries.join(' | ');
    }

    if (Number(pagamento.interestRate || 0) > 0) {
      return `${Number(pagamento.interestRate).toFixed(2).replace('.', ',')}% (taxa legada)`;
    }

    return 'Sem juros';
  };

  const handleAbrirDialogPagamento = (pagamento = null) => {
    if (pagamento) {
      const maxInstallments = pagamento.maxInstallments || 1;
      const normalizedRates = normalizeInstallmentRates(
        pagamento.installmentInterestRates,
        maxInstallments
      );
      setPagamentoEdicao(pagamento);
      setFormPagamento({
        paymentType: pagamento.paymentType,
        maxInstallments,
        installmentInterestRates: Object.keys(normalizedRates).length > 0
          ? normalizedRates
          : buildLegacyRates(maxInstallments, pagamento.interestRate)
      });
    } else {
      setPagamentoEdicao(null);
      setFormPagamento({
        paymentType: 'credit_card',
        maxInstallments: 1,
        installmentInterestRates: {}
      });
    }
    setDialogPagamentoAberto(true);
  };

  const handleFecharDialogPagamento = () => {
    setDialogPagamentoAberto(false);
    setPagamentoEdicao(null);
  };

  const salvarPagamentoMutation = useMutation({
    mutationFn: async ({ pagamentoId, dados }) => (
      pagamentoId ? atualizarFormaPagamento(pagamentoId, dados) : criarFormaPagamento(id, dados)
    ),
    onSuccess: (_data, { pagamentoId }) => {
      setNotification(pagamentoId
        ? 'Forma de pagamento atualizada com sucesso!'
        : 'Forma de pagamento criada com sucesso!');
      handleFecharDialogPagamento();
      carregarDados();
      carregarFormas();
      carregarInscricoes();
    },
    onError: (error) => setNotification(error.message || 'Erro ao salvar forma de pagamento'),
  });

  const handleSalvarPagamento = () => {
    const maxInstallments = parseInt(formPagamento.maxInstallments, 10) || 1;
    const installmentInterestRates = normalizeInstallmentRates(
      formPagamento.installmentInterestRates,
      maxInstallments
    );
    const dados = {
      ...formPagamento,
      maxInstallments,
      installmentInterestRates
    };
    salvarPagamentoMutation.mutate({ pagamentoId: pagamentoEdicao?.id || null, dados });
  };

  const deletarPagamentoMutation = useMutation({
    mutationFn: (pagamentoId) => deletarFormaPagamento(pagamentoId),
    onSuccess: () => {
      setNotification('Forma de pagamento deletada com sucesso!');
      carregarDados();
      carregarFormas();
      carregarInscricoes();
    },
    onError: (error) => setNotification(error.message || 'Erro ao deletar forma de pagamento'),
  });

  const handleDeletarPagamento = async (pagamentoId, tipo) => {
    const okDeletar = await confirm({
      title: 'Deletar forma de pagamento', message: `Tem certeza que deseja deletar a forma de pagamento "${tipo}"?`, confirmText: 'Deletar', confirmColor: 'error', severity: 'error'
    });
    if (!okDeletar) return;
    deletarPagamentoMutation.mutate(pagamentoId);
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

  const renderFormaPagamento = (paymentMethod) => {
    const method = paymentMethod || 'credit_card';
    const meta = {
      credit_card: { label: 'Cartão de Crédito', icon: <CreditCardIcon fontSize="small" /> },
      pix: { label: 'PIX', icon: <AttachMoneyIcon fontSize="small" /> },
      boleto: { label: 'Boleto', icon: <ReceiptLongIcon fontSize="small" /> },
      offline: { label: 'Presencial', icon: <StoreIcon fontSize="small" /> },
      free: { label: 'Inscricao gratuita', icon: <AttachMoneyIcon fontSize="small" /> },
      manual: { label: 'Manual', icon: <StoreIcon fontSize="small" /> }
    }[method] || { label: traduzirTipoPagamento(method), icon: <CreditCardIcon fontSize="small" /> };

    return (
      <Box display="flex" alignItems="center" gap={1}>
        {meta.icon}
        <span>{meta.label}</span>
      </Box>
    );
  };

  const getInstallmentsLabel = (inscricao) => {
    if (inscricao?.paymentMethod !== 'credit_card') {
      return '-';
    }

    const payments = Array.isArray(inscricao?.payments)
      ? inscricao.payments
      : Array.isArray(inscricao?.RegistrationPayments)
        ? inscricao.RegistrationPayments
        : [];
    const creditCardPayments = payments.filter((payment) => payment?.method === 'credit_card');
    const preferredPayment = creditCardPayments.find((payment) => (
      Number(payment?.installments) > 0
      && ['confirmed', 'authorized', 'pending'].includes(payment?.status)
    )) || creditCardPayments.find((payment) => Number(payment?.installments) > 0);

    const installments = Number(preferredPayment?.installments);
    return Number.isInteger(installments) && installments > 0 ? `${installments}x` : '1x';
  };

  const getBuyerName = (inscricao) => (
    inscricao?.buyerData?.buyer_name
    || inscricao?.buyerData?.nome
    || inscricao?.buyerData?.name
    || '-'
  );

  const getBuyerDocument = (inscricao) => (
    inscricao?.buyerData?.buyer_document
    || inscricao?.buyerData?.cpf
    || inscricao?.buyerData?.documento
    || inscricao?.buyerData?.document
    || '-'
  );

  const formatarData = (data) => formatDateInAppTimezone(data);

  const formatarDataHora = (data) => formatDateTimeInAppTimezone(data);

  const formatarPreco = (preco) => {
    const valor = Number(preco) || 0;
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const formatarMoeda = (valor) => {
    const numero = Number(valor) || 0;
    return `R$ ${numero.toFixed(2).replace('.', ',')}`;
  };
  const isFreeEvent = evento?.requiresPayment === false;

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmedFilterChange = (field, value) => {
    setConfirmedFilters((prev) => ({ ...prev, [field]: value }));
  };

  const sanitizeFileName = (value) => {
    if (!value) return 'evento';
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  };

  const formatarValorExportacao = (value, fieldName = '') => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
    if (Array.isArray(value)) {
      return value
        .map((item) => formatarValorExportacao(item, fieldName))
        .join(' | ');
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return String(value);
      }
    }

    if (fieldName === 'method' || fieldName.endsWith('.method')) {
      return traduzirTipoPagamento(value);
    }
    if (fieldName === 'status' || fieldName.endsWith('.status') || fieldName === 'paymentStatus') {
      return getPaymentStatusLabel(value);
    }
    if (fieldName === 'amount' || fieldName === 'finalPrice' || fieldName.endsWith('.amount') || fieldName.endsWith('.price')) {
      return formatarPreco(value);
    }
    if (fieldName === 'installments' || fieldName.endsWith('.installments')) {
      return `${Number(value) || 1}x`;
    }
    if (/At$/i.test(fieldName)) {
      return formatarDataHora(value);
    }
    if (/Date$/i.test(fieldName)) {
      return formatarData(value);
    }

    return String(value);
  };

  const exportarVendasExcel = async () => {
    if (!id) return;
    setExportingSales(true);

    try {
      const perPage = 100;
      const fetchAllSalesPages = async (page = 1, acc = []) => {
        const response = await listarInscricoesPorEvento(id, {
          page,
          perPage,
          orderCode: filters.orderCode || undefined,
          buyerName: filters.buyerName || undefined,
          buyerDocument: filters.buyerDocument || undefined,
          paymentStatus: Array.isArray(filters.paymentStatus)
            ? filters.paymentStatus.join(',') || undefined
            : filters.paymentStatus || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined
        });

        const records = Array.isArray(response?.records) ? response.records : [];
        const total = Number(response?.total || 0);
        const nextAcc = [...acc, ...records];

        if (!records.length || nextAcc.length >= total) {
          return nextAcc;
        }
        return fetchAllSalesPages(page + 1, nextAcc);
      };

      const allSales = await fetchAllSalesPages();
      if (!allSales.length) {
        setNotification('Nao ha vendas para exportar com os filtros atuais.');
        return;
      }

      const buyerKeys = new Set();
      const attendeeKeys = new Set();
      const attendeeBatchKeys = new Set();
      const paymentKeys = new Set();

      allSales.forEach((sale) => {
        const buyerData = sale?.buyerData && typeof sale.buyerData === 'object' ? sale.buyerData : {};
        Object.keys(buyerData).forEach((key) => buyerKeys.add(key));

        const attendees = Array.isArray(sale?.attendees) ? sale.attendees : [];
        attendees.forEach((attendee) => {
          const attendeeData = attendee?.attendeeData && typeof attendee.attendeeData === 'object'
            ? attendee.attendeeData
            : {};
          Object.keys(attendeeData).forEach((key) => attendeeKeys.add(key));

          const batch = attendee?.batch && typeof attendee.batch === 'object' ? attendee.batch : {};
          Object.keys(batch).forEach((key) => attendeeBatchKeys.add(key));
        });

        const payments = Array.isArray(sale?.payments) ? sale.payments : [];
        payments.forEach((payment) => {
          Object.keys(payment || {}).forEach((key) => {
            if (key !== 'registrationId') {
              paymentKeys.add(key);
            }
          });
        });
      });

      const sortedBuyerKeys = Array.from(buyerKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const sortedAttendeeKeys = Array.from(attendeeKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const sortedAttendeeBatchKeys = Array.from(attendeeBatchKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const sortedPaymentKeys = Array.from(paymentKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));

      const baseColumns = [
        'orderCode',
        'registrationId',
        'statusInscricao',
        'formaPagamentoInscricao',
        'quantidade',
        'valorFinal',
        'dataInscricao'
      ];
      const buyerColumns = sortedBuyerKeys.map((key) => `comprador.${key}`);
      const attendeeColumns = ['inscrito.id', 'inscrito.numero'].concat(
        sortedAttendeeBatchKeys.map((key) => `inscrito.lote.${key}`),
        sortedAttendeeKeys.map((key) => `inscrito.dados.${key}`)
      );
      const paymentColumns = sortedPaymentKeys.map((key) => `pagamento.${key}`);
      const headers = [...baseColumns, ...buyerColumns, ...attendeeColumns, ...paymentColumns];

      const rows = [];
      allSales.forEach((sale) => {
        const buyerData = sale?.buyerData && typeof sale.buyerData === 'object' ? sale.buyerData : {};
        const attendees = Array.isArray(sale?.attendees) && sale.attendees.length ? sale.attendees : [null];
        const payments = Array.isArray(sale?.payments) && sale.payments.length ? sale.payments : [null];

        attendees.forEach((attendee) => {
          payments.forEach((payment) => {
            const attendeeData = attendee?.attendeeData && typeof attendee.attendeeData === 'object'
              ? attendee.attendeeData
              : {};
            const attendeeBatch = attendee?.batch && typeof attendee.batch === 'object' ? attendee.batch : {};

            const row = {
              orderCode: sale?.orderCode || '',
              registrationId: sale?.id || '',
              statusInscricao: formatarValorExportacao(sale?.paymentStatus, 'paymentStatus'),
              formaPagamentoInscricao: formatarValorExportacao(sale?.paymentMethod, 'method'),
              quantidade: sale?.quantity ?? '',
              valorFinal: formatarValorExportacao(sale?.finalPrice, 'finalPrice'),
              dataInscricao: formatarValorExportacao(sale?.createdAt, 'createdAt'),
              'inscrito.id': attendee?.id || '',
              'inscrito.numero': attendee?.attendeeNumber ?? ''
            };

            sortedBuyerKeys.forEach((key) => {
              row[`comprador.${key}`] = formatarValorExportacao(buyerData[key], key);
            });

            sortedAttendeeBatchKeys.forEach((key) => {
              row[`inscrito.lote.${key}`] = formatarValorExportacao(attendeeBatch[key], `batch.${key}`);
            });
            sortedAttendeeKeys.forEach((key) => {
              row[`inscrito.dados.${key}`] = formatarValorExportacao(attendeeData[key], key);
            });

            sortedPaymentKeys.forEach((key) => {
              row[`pagamento.${key}`] = formatarValorExportacao(payment?.[key], key);
            });

            rows.push(row);
          });
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');
      const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob(
        [workbookBytes],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const dateTag = getTodayDateInputValue();
      const fileName = `vendas_${sanitizeFileName(evento?.title || 'evento')}_${dateTag}.xlsx`;

      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotification(`Exportacao concluida com ${rows.length} linha(s).`);
    } catch (error) {
      console.error('Erro ao exportar vendas:', error);
      setNotification(error.message || 'Erro ao exportar vendas.');
    } finally {
      setExportingSales(false);
    }
  };

  const exportarInscritosConfirmadosExcel = async () => {
    if (!id) return;
    setExportingConfirmed(true);
    try {
      const perPage = 100;
      const fetchAllConfirmedPages = async (page = 1, acc = []) => {
        const response = await listarInscritosConfirmadosPorEvento(id, {
          page,
          perPage,
          lote: confirmedFilters.lote || undefined,
          orderCode: confirmedFilters.orderCode || undefined,
          nomeCompleto: confirmedFilters.nomeCompleto || undefined
        });

        const records = Array.isArray(response?.records) ? response.records : [];
        const total = Number(response?.total || 0);
        const nextAcc = [...acc, ...records];

        if (!records.length || nextAcc.length >= total) {
          return nextAcc;
        }

        return fetchAllConfirmedPages(page + 1, nextAcc);
      };

      const allRecords = await fetchAllConfirmedPages();

      if (!allRecords.length) {
        setNotification('Nao ha inscritos para exportar com os filtros atuais.');
        return;
      }

      const dynamicKeys = new Set();
      allRecords.forEach((record) => {
        const attendeeData = record?.attendeeData && typeof record.attendeeData === 'object'
          ? record.attendeeData
          : {};
        Object.keys(attendeeData).forEach((key) => dynamicKeys.add(key));
      });

      const dynamicColumns = Array.from(dynamicKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const headers = ['nomeCompleto', 'lote', 'orderCode', ...dynamicColumns];
      const sheetRows = allRecords.map((record) => {
        const attendeeData = record?.attendeeData && typeof record.attendeeData === 'object'
          ? record.attendeeData
          : {};
        return {
          nomeCompleto: record?.nomeCompleto || '-',
          lote: record?.lote || '-',
          orderCode: record?.orderCode || '-',
          ...dynamicColumns.reduce((acc, column) => {
            acc[column] = attendeeData[column] ?? '';
            return acc;
          }, {})
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscritos');
      const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob(
        [workbookBytes],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const dateTag = getTodayDateInputValue();
      const fileName = `inscritos_${sanitizeFileName(evento?.title || 'evento')}_${dateTag}.xlsx`;

      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotification(`Exportacao concluida com ${allRecords.length} inscrito(s).`);
    } catch (error) {
      console.error('Erro ao exportar inscritos:', error);
      setNotification(error.message || 'Erro ao exportar inscritos.');
    } finally {
      setExportingConfirmed(false);
    }
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

  const cancelarInscricaoMutation = useMutation({
    mutationFn: (registrationId) => cancelarInscricao(registrationId),
    onSuccess: () => {
      setNotification('Inscrição cancelada com sucesso.');
      fecharDialogCancelamento();
      carregarDados();
      carregarInscricoes();
      carregarInscritosConfirmados();
    },
    onError: (error) => setNotification(error.message || 'Erro ao cancelar a inscrição.'),
  });
  const cancelDialogLoading = cancelarInscricaoMutation.isPending;

  const confirmarCancelamento = () => {
    if (!cancelTarget?.id) return;
    cancelarInscricaoMutation.mutate(cancelTarget.id);
  };

  const WHATSAPP_INSTANCES = ['IECG', 'IECG_2'];
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendTarget, setResendTarget] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendInstance, setResendInstance] = useState(WHATSAPP_INSTANCES[0]);

  const abrirDialogReenvio = (inscricao) => {
    setResendTarget({
      id: inscricao.id,
      orderCode: inscricao.orderCode,
      email: inscricao.buyerData?.buyer_email || '',
      whatsapp: inscricao.buyerData?.buyer_whatsapp || inscricao.buyerData?.buyer_phone || '',
      buyerName: inscricao.buyerData?.buyer_name || '',
    });
    setResendInstance(WHATSAPP_INSTANCES[0]);
    setResendDialogOpen(true);
  };

  const fecharDialogReenvio = () => {
    if (resendLoading) return;
    setResendDialogOpen(false);
    setResendTarget(null);
  };

  const reenviarPorCanal = async (channel) => {
    if (!resendTarget?.id) return;
    try {
      setResendLoading(true);
      const opts = channel === 'whatsapp' ? { instanceName: resendInstance } : undefined;
      await reenviarTicket(resendTarget.id, channel, opts);
      const canalLabel = channel === 'email'
        ? 'email'
        : `WhatsApp (instância ${resendInstance})`;
      setNotification(`Ticket reenviado por ${canalLabel}.`);
      setResendDialogOpen(false);
      setResendTarget(null);
    } catch (err) {
      setNotification(err.message || 'Erro ao reenviar ticket.');
    } finally {
      setResendLoading(false);
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

  const handleChangeConfirmedPage = (event, newPage) => {
    setConfirmedPage(newPage);
  };

  const handleChangeConfirmedRowsPerPage = (event) => {
    setConfirmedRowsPerPage(parseInt(event.target.value, 10));
    setConfirmedPage(0);
  };

  if (!loading && !evento) {
    return <Typography>Evento não encontrado</Typography>;
  }

  const title = brand.name + ' - ' + (evento?.title || 'Evento');
  const headerSkeleton = loading || !evento;
  const resumoInscricoes = evento?.registrationStats || {};
  const totalInscritos = resumoInscricoes.confirmedCount ?? 0;
  const totalValorConfirmado = resumoInscricoes.confirmedTotalValue ?? 0;
  const negadoCancelado = resumoInscricoes.deniedCancelled ?? 0;
  const expirados = resumoInscricoes.expiredCount ?? 0;
  const pendentes = resumoInscricoes.pendingCount ?? 0;
  const totalVagas = Number(evento?.maxRegistrations || 0);
  const porcentagemInscritos = totalVagas > 0
    ? `${((totalInscritos / totalVagas) * 100).toFixed(1).replace('.', ',')}%`
    : 'N/A';
  const locationSummary = [
    evento?.location,
    evento?.addressNumber,
    evento?.neighborhood,
    evento?.city,
    evento?.cep
  ].filter(Boolean).join(', ');
  const mapUrl = (evento?.latitude != null && evento?.longitude != null)
    ? `https://maps.google.com/maps?q=${evento.latitude},${evento.longitude}&z=15&hl=pt-BR&output=embed`
    : null;
  const kpiItems = [
    { label: 'Inscritos confirmados', value: totalInscritos },
    { label: 'Porcentagem de Inscritos', value: porcentagemInscritos },
    { label: 'Valor Confirmados', value: formatarMoeda(totalValorConfirmado) },
    { label: 'Negado/Cancelado', value: negadoCancelado },
    { label: 'Expirados', value: expirados },
    { label: 'Pendentes', value: pendentes }
  ];
  const skeletonKpiCards = Array.from({ length: 4 }).map((_, index) => (
    <Grid item key={`kpi-skeleton-${index}`} xs={12} sm={6} md={3}>
      <Card variant="outlined">
        <CardContent>
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="40%" />
        </CardContent>
      </Card>
    </Grid>
  ));
  const skeletonRows = Array.from({ length: 3 }).map((_, idx) => (
    <TableRow key={`skeleton-row-${idx}`}>
      <TableCell colSpan={7}>
        <Skeleton variant="rectangular" height={40} />
      </TableCell>
    </TableRow>
  ));
  const salesTableContainerSx = {
    width: '100%',
    overflowX: 'auto',
    '& .MuiTable-root': { minWidth: 1100 },
    '& .MuiTableCell-root': { whiteSpace: 'nowrap' }
  };
  const attendeesTableContainerSx = {
    width: '100%',
    overflowX: 'auto',
    '& .MuiTable-root': { minWidth: 680 },
    '& .MuiTableCell-root': { whiteSpace: 'nowrap' }
  };
  const lotsTableContainerSx = {
    width: '100%',
    overflowX: 'auto',
    '& .MuiTable-root': { minWidth: 820 },
    '& .MuiTableCell-root': { whiteSpace: 'nowrap' }
  };
  const paymentMethodsTableContainerSx = {
    width: '100%',
    overflowX: 'auto',
    '& .MuiTable-root': { minWidth: 760 },
    '& .MuiTableCell-root': { whiteSpace: 'nowrap' }
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <Backdrop open={loading} style={{ zIndex: 1300, color: '#fff' }}>
        <img src="/images/spinner.gif" alt="Carregando" style={{ width: 64, height: 64 }} />
      </Backdrop>

      {/* Informações do Evento */}
      <PapperBlock
        title={evento?.title || 'Evento'}
        icon="ion-ios-calendar-outline"
        desc={evento?.description || ''}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                {headerSkeleton ? (
                  <Skeleton width="70%" />
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    <strong>Data Início:</strong> {formatarDataHora(evento.startDate)}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                {headerSkeleton ? (
                  <Skeleton width="70%" />
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    <strong>Data Término:</strong> {formatarDataHora(evento.endDate)}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                {headerSkeleton ? (
                  <Skeleton width="75%" />
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    <strong>Tipo de Evento:</strong> {EVENT_TYPE_LABELS[evento.eventType] || evento.eventType || '-'}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                {headerSkeleton ? (
                  <Skeleton width="60%" />
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    <strong>Total de Vagas:</strong> {evento.maxRegistrations || 'Não informado'}
                  </Typography>
                )}
              </Grid>
            </Grid>
            <div style={{ marginTop: 16 }}>
              {headerSkeleton ? (
                <Skeleton variant="rectangular" width={120} height={32} />
              ) : (
                <Chip
                  label={evento.isActive ? 'Ativo' : 'Inativo'}
                  color={evento.isActive ? 'primary' : 'default'}
                />
              )}
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
              {headerSkeleton ? (
                <Skeleton variant="rectangular" width="100%" height="100%" />
              ) : mapUrl ? (
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
              {headerSkeleton ? (
                <Skeleton width="50%" />
              ) : (
                <>
                  <strong>Endereço:</strong> {locationSummary || 'Dados não informados'}
                </>
              )}
            </Typography>
          </Grid>
        </Grid>

        <Card style={{ marginTop: 16, padding: 16 }} variant="outlined">
          <Grid container spacing={1} alignItems="center" justifyContent="space-between">
            {headerSkeleton ? skeletonKpiCards : kpiItems.map((item) => (
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

        <Grid container spacing={1} style={{ marginTop: 16 }}>
          <Grid item xs={12} sm={6} md="auto">
            <Button
              fullWidth
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={() => history.push('/app/events')}
            >
              Voltar
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md="auto">
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => history.push(`/app/events/${id}/editar`)}
            >
              Editar Evento
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md="auto">
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              startIcon={<CheckInIcon />}
              onClick={() => history.push(`/app/events/${id}/checkin`)}
            >
              Check-in
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md="auto">
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              startIcon={<DescriptionIcon />}
              onClick={() => history.push(`/app/events/${id}/formulario`)}
            >
              {'Configurar Formul\u00E1rio'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md="auto">
            <Button
              fullWidth
              variant="contained"
              color="inherit"
              startIcon={<NotificationsIcon />}
              onClick={() => history.push(`/app/events/${id}/notificacoes`)}
            >
              {'Notifica\u00E7\u00F5es'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md="auto">
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<BlockIcon />}
              onClick={() => history.push(`/app/events/${id}/regras-inscricao`)}
            >
              Regras de Bloqueio
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md="auto">
            <Button
              fullWidth
              variant="outlined"
              startIcon={<BedIcon />}
              onClick={() => history.push(`/app/events/${id}/housing`)}
            >
              Hospedagem
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md="auto">
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GroupsIcon />}
              onClick={() => history.push(`/app/events/${id}/teams`)}
            >
              Times
            </Button>
          </Grid>
        </Grid>
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
          <Tab label="Vendas" />
          <Tab label="Inscrições" />
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

          {lotesLoading ? (
            <TableContainer sx={lotsTableContainerSx}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell> </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {skeletonRows}
                </TableBody>
              </Table>
            </TableContainer>
          ) : lotes.length === 0 ? (
            <Typography>Nenhum lote cadastrado</Typography>
          ) : (
            <TableContainer sx={lotsTableContainerSx}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Preço</TableCell>
                    <TableCell>Confirmados / Vagas</TableCell>
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
                        {Number(lote.inscritosConfirmados ?? lote.currentQuantity ?? 0)}
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
            </TableContainer>
          )}
        </TabPanel>

        {/* Tab Vendas */}
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
                  multiple
                  value={filters.paymentStatus}
                  label="Status"
                  onChange={(event) => handleFilterChange('paymentStatus', event.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((s) => (
                        <Chip key={s} label={getPaymentStatusLabel(s)} size="small" sx={getPaymentStatusChipSx(s)} />
                      ))}
                    </Box>
                  )}
                >
                  {statusOptions.filter(Boolean).map((status) => (
                    <MenuItem key={status} value={status}>
                      {getPaymentStatusLabel(status)}
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
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportarVendasExcel}
                  disabled={registrationsLoading || exportingSales}
                >
                  {exportingSales ? 'Exportando...' : 'Exportar Excel'}
                </Button>
              </Box>
            </Grid>
          </Grid>
          {registrationsLoading ? (
            <TableContainer sx={salesTableContainerSx}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell> </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {skeletonRows}
                </TableBody>
              </Table>
            </TableContainer>
          ) : inscricoes.length === 0 ? (
            <Typography>Nenhuma inscrição realizada</Typography>
          ) : (
            <>
              <TableContainer sx={salesTableContainerSx}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Comprador</TableCell>
                      <TableCell>Documento</TableCell>
                      <TableCell>Quantidade</TableCell>
                      <TableCell>Valor</TableCell>
                      <TableCell>Forma de Pagamento</TableCell>
                      <TableCell>Parcelas</TableCell>
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
                      >
                        <TableCell>{inscricao.orderCode}</TableCell>
                        <TableCell>{getBuyerName(inscricao)}</TableCell>
                        <TableCell>{getBuyerDocument(inscricao)}</TableCell>
                        <TableCell>{inscricao.quantity}</TableCell>
                        <TableCell>{formatarPreco(inscricao.finalPrice)}</TableCell>
                        <TableCell>{renderFormaPagamento(inscricao.paymentMethod)}</TableCell>
                        <TableCell>{getInstallmentsLabel(inscricao)}</TableCell>
                        <TableCell>{formatarDataHora(inscricao.createdAt)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={getPaymentStatusLabel(inscricao.paymentStatus)}
                            sx={getPaymentStatusChipSx(inscricao.paymentStatus)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            <Tooltip title="Ver detalhes">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => history.push(
                                  `/app/events/registrations/${inscricao.id}`,
                                  { pageTitle: inscricao.orderCode || 'Detalhes da Inscrição' }
                                )}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {['confirmed', 'partial'].includes(inscricao.paymentStatus) && (
                              <Tooltip title="Reenviar ticket por email ou WhatsApp">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => abrirDialogReenvio(inscricao)}
                                >
                                  <SendIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {!bannableStatuses.has(inscricao.paymentStatus) && (
                              <Tooltip title="Cancelar inscrição">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => abrirDialogCancelamento(inscricao.id, inscricao.orderCode)}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                Total de registros: {totalInscricoes}
              </Typography>
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

        {/* Tab Inscrições */}
        <TabPanel value={tabAtiva} index={2}>
          <Grid container spacing={2} alignItems="flex-end" style={{ marginBottom: 8 }}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="confirmed-batch-filter-label">Lote</InputLabel>
                <Select
                  labelId="confirmed-batch-filter-label"
                  value={confirmedFilters.lote}
                  label="Lote"
                  onChange={(event) => handleConfirmedFilterChange('lote', event.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {lotes
                    .filter((lote) => lote.isActive)
                    .map((lote) => (
                      <MenuItem key={lote.id} value={lote.name}>
                        {lote.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Código"
                fullWidth
                value={confirmedFilters.orderCode}
                onChange={(event) => handleConfirmedFilterChange('orderCode', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Nome completo"
                fullWidth
                value={confirmedFilters.nomeCompleto}
                onChange={(event) => handleConfirmedFilterChange('nomeCompleto', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={12}>
              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportarInscritosConfirmadosExcel}
                  disabled={confirmedAttendeesLoading || exportingConfirmed}
                >
                  {exportingConfirmed ? 'Exportando...' : 'Exportar Excel'}
                </Button>
              </Box>
            </Grid>
          </Grid>
          {confirmedAttendeesLoading ? (
            <TableContainer sx={attendeesTableContainerSx}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell> </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {skeletonRows}
                </TableBody>
              </Table>
            </TableContainer>
          ) : inscritosConfirmados.length === 0 ? (
            <Typography>Nenhum inscrito confirmado encontrado</Typography>
          ) : (
            <>
              <TableContainer sx={attendeesTableContainerSx}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome Completo</TableCell>
                      <TableCell>Lote</TableCell>
                      <TableCell>Código</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inscritosConfirmados.map((inscrito) => (
                      <TableRow key={inscrito.id}>
                        <TableCell>{inscrito.nomeCompleto || '-'}</TableCell>
                        <TableCell>{inscrito.lote || '-'}</TableCell>
                        <TableCell>{inscrito.orderCode || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                Total de registros: {totalInscritosConfirmados}
              </Typography>
              <TablePagination
                component="div"
                count={totalInscritosConfirmados}
                page={confirmedPage}
                onPageChange={handleChangeConfirmedPage}
                rowsPerPage={confirmedRowsPerPage}
                onRowsPerPageChange={handleChangeConfirmedRowsPerPage}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </>
          )}
        </TabPanel>

        {/* Tab Formas de Pagamento */}
        <TabPanel value={tabAtiva} index={3}>
          {isFreeEvent ? (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="body2" color="textSecondary">
                Evento gratuito: a inscricao e confirmada sem configuracao de formas de pagamento.
              </Typography>
            </Box>
          ) : (
            <>
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

              {formasLoading ? (
                <TableContainer sx={paymentMethodsTableContainerSx}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell> </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {skeletonRows}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : formasPagamento.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
              Nenhuma forma de pagamento configurada ainda.
                </Typography>
              ) : (
                <TableContainer sx={paymentMethodsTableContainerSx}>
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
                            {pagamento.paymentType === 'credit_card'
                              ? formatarJurosParcelados(pagamento)
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
                </TableContainer>
              )}
            </>
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

      <Dialog open={resendDialogOpen} onClose={fecharDialogReenvio} maxWidth="xs" fullWidth>
        <DialogTitle>Reenviar ticket</DialogTitle>
        <DialogContent>
          {resendTarget && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Pedido</Typography>
                <Typography variant="body2" fontWeight={600}>{resendTarget.orderCode || '-'}</Typography>
              </Box>
              {resendTarget.buyerName && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Comprador</Typography>
                  <Typography variant="body2">{resendTarget.buyerName}</Typography>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary">
                Por qual canal deseja enviar o link do ticket?
              </Typography>
              {resendTarget.whatsapp && (
                <FormControl size="small" fullWidth>
                  <InputLabel id="resend-instance-label">Instância WhatsApp</InputLabel>
                  <Select
                    labelId="resend-instance-label"
                    label="Instância WhatsApp"
                    value={resendInstance}
                    onChange={(e) => setResendInstance(e.target.value)}
                    disabled={resendLoading}
                  >
                    {WHATSAPP_INSTANCES.map((inst) => (
                      <MenuItem key={inst} value={inst}>{inst}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<EmailIcon />}
                  onClick={() => reenviarPorCanal('email')}
                  disabled={resendLoading || !resendTarget.email}
                  fullWidth
                >
                  Email
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<WhatsAppIcon />}
                  onClick={() => reenviarPorCanal('whatsapp')}
                  disabled={resendLoading || !resendTarget.whatsapp}
                  fullWidth
                >
                  WhatsApp
                </Button>
              </Stack>
              {resendTarget.email && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Email destino: <strong>{resendTarget.email}</strong>
                </Typography>
              )}
              {resendTarget.whatsapp && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  WhatsApp destino: <strong>{resendTarget.whatsapp}</strong>
                </Typography>
              )}
              {!resendTarget.email && !resendTarget.whatsapp && (
                <Alert severity="warning">
                  Comprador sem email nem WhatsApp em buyerData. Reenvio indisponível.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialogReenvio} disabled={resendLoading}>Fechar</Button>
        </DialogActions>
      </Dialog>

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
                disabled={isFreeEvent}
                inputProps={{ step: '0.01', min: '0' }}
                helperText={isFreeEvent ? 'Evento gratuito: o lote permanece em R$ 0,00' : ''}
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
          <Button onClick={handleFecharDialogLote} disabled={salvarLoteMutation.isPending}>Cancelar</Button>
          <Button
            onClick={handleSalvarLote}
            color="primary"
            variant="contained"
            disabled={salvarLoteMutation.isPending}
          >
            {salvarLoteMutation.isPending ? 'Salvando...' : 'Salvar'}
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
                    onChange={(e) => {
                      const nextMaxInstallments = Math.max(1, Math.min(12, Number(e.target.value) || 1));
                      setFormPagamento((prev) => ({
                        ...prev,
                        maxInstallments: nextMaxInstallments,
                        installmentInterestRates: normalizeInstallmentRates(
                          prev.installmentInterestRates,
                          nextMaxInstallments
                        )
                      }));
                    }}
                    inputProps={{ min: 1, max: 12 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Configure o juros percentual para cada quantidade de parcela (a partir de 2x).
                  </Typography>
                </Grid>

                {Array.from({ length: Math.max(0, Number(formPagamento.maxInstallments || 1) - 1) }).map((_, index) => {
                  const installments = index + 2;
                  return (
                    <Grid item xs={12} sm={6} key={`interest-${installments}`}>
                      <TextField
                        fullWidth
                        type="number"
                        label={`Juros para ${installments}x (%)`}
                        value={formPagamento.installmentInterestRates?.[String(installments)] ?? 0}
                        onChange={(e) => {
                          const nextRate = Number(e.target.value);
                          setFormPagamento((prev) => ({
                            ...prev,
                            installmentInterestRates: {
                              ...(prev.installmentInterestRates || {}),
                              [String(installments)]: Number.isFinite(nextRate) && nextRate >= 0 ? nextRate : 0
                            }
                          }));
                        }}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Grid>
                  );
                })}

                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    Exemplo: 2x = 1,50 e 3x = 2,10. Deixe 0 para parcela sem juros.
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialogPagamento} disabled={salvarPagamentoMutation.isPending}>Cancelar</Button>
          <Button
            onClick={handleSalvarPagamento}
            variant="contained"
            color="primary"
            disabled={salvarPagamentoMutation.isPending}
          >
            {salvarPagamentoMutation.isPending
              ? 'Salvando...'
              : pagamentoEdicao ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
      {ConfirmDialog}
    </div>
  );
}

export default EventDetails;
