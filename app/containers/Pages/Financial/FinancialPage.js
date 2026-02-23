import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PaidIcon from '@mui/icons-material/Paid';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import brand from 'dan-api/dummy/brand';
import { listarEventos } from '../../../api/eventsApi';
import { getPaymentStatusChipSx, getPaymentStatusLabel } from '../../../constants/paymentStatus';
import {
  atualizarSaidaFinanceira,
  atualizarConfiguracaoTaxasFinanceiras,
  buscarConfiguracaoTaxasFinanceiras,
  criarSaidaFinanceira,
  deletarSaidaFinanceira,
  listarRegistrosFinanceiros
} from '../../../api/financialApi';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartao de Credito' },
  { value: 'debit_card', label: 'Cartao de Debito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pos', label: 'Maquininha' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'manual', label: 'Manual' },
  { value: 'offline', label: 'Presencial' },
  { value: 'other', label: 'Outro' }
];

const CARD_BRANDS = [
  'Visa',
  'Master',
  'Elo',
  'Amex',
  'Hipercard',
  'Diners',
  'Discover',
  'JCB'
];

const INSTALLMENT_OPTIONS = Array.from({ length: 12 }, (_value, index) => index + 1);

const PAYMENT_METHOD_LABELS = PAYMENT_METHOD_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const CARD_BRAND_STYLES = {
  visa: { bg: '#1434cb', color: '#fff' },
  master: { bg: '#eb001b', color: '#fff' },
  elo: { bg: '#0b0b0b', color: '#fff' },
  amex: { bg: '#2e77bb', color: '#fff' },
  hipercard: { bg: '#b3131b', color: '#fff' },
  diners: { bg: '#0079be', color: '#fff' },
  discover: { bg: '#ff6000', color: '#fff' },
  jcb: { bg: '#0f8f3d', color: '#fff' }
};

const defaultForm = () => ({
  eventId: '',
  description: '',
  amount: '',
  paymentMethod: 'pix',
  isSettled: false,
  expenseDate: new Date().toISOString().slice(0, 10),
  notes: ''
});

function FinancialPage() {
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [events, setEvents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [entriesPage, setEntriesPage] = useState(0);
  const [entriesRowsPerPage, setEntriesRowsPerPage] = useState(10);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [expensesPage, setExpensesPage] = useState(0);
  const [expensesRowsPerPage, setExpensesRowsPerPage] = useState(10);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [feeConfig, setFeeConfig] = useState({
    pixPercent: 0,
    pixFixedFee: 0,
    creditCardDefaultPercent: 0,
    creditCardFixedFee: 0,
    creditCardInstallmentPercent: {},
    creditCardBrandRates: {}
  });
  const [savingFeeConfig, setSavingFeeConfig] = useState(false);
  const [feeConfigModalOpen, setFeeConfigModalOpen] = useState(false);
  const [summary, setSummary] = useState({
    ticketGross: 0,
    totalFees: 0,
    ticketNet: 0,
    expensesSettled: 0,
    expensesPending: 0,
    balance: 0
  });
  const [filters, setFilters] = useState(() => ({
    dateFrom: '',
    dateTo: '',
    eventId: '',
    paymentMethod: ''
  }));
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settlingExpenseId, setSettlingExpenseId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [form, setForm] = useState(defaultForm());

  const title = `${brand.name} - Financeiro`;

  const activeEvents = useMemo(
    () => (Array.isArray(events) ? events.filter((event) => event.isActive) : []),
    [events]
  );

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('pt-BR');
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  };

  const getPaymentMethodLabel = (value) => PAYMENT_METHOD_LABELS[value] || value || '-';

  const renderCardBrand = (entry) => {
    if (entry.paymentMethod !== 'credit_card') {
      return '-';
    }

    const brandName = String(entry.cardBrand || '').trim();
    if (!brandName) {
      return '-';
    }

    const style = CARD_BRAND_STYLES[brandName.toLowerCase()] || { bg: '#37474f', color: '#fff' };

    return (
      <Chip
        size="small"
        icon={<CreditCardIcon style={{ color: style.color }} />}
        label={brandName}
        style={{
          backgroundColor: style.bg,
          color: style.color,
          fontWeight: 600
        }}
      />
    );
  };

  const loadEvents = async () => {
    try {
      const response = await listarEventos();
      setEvents(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Erro ao carregar eventos da financeiro:', error);
      setNotification(error.message || 'Erro ao carregar eventos');
    }
  };

  const loadFeeConfig = async () => {
    try {
      const response = await buscarConfiguracaoTaxasFinanceiras();
      setFeeConfig({
        pixPercent: Number(response?.pixPercent || 0),
        pixFixedFee: Number(response?.pixFixedFee || 0),
        creditCardDefaultPercent: Number(response?.creditCardDefaultPercent || 0),
        creditCardFixedFee: Number(response?.creditCardFixedFee || 0),
        creditCardInstallmentPercent: response?.creditCardInstallmentPercent || {},
        creditCardBrandRates: response?.creditCardBrandRates || {}
      });
    } catch (error) {
      console.error('Erro ao carregar configuracao de taxas:', error);
      setNotification(error.message || 'Erro ao carregar configuracao de taxas');
    }
  };

  const loadData = async (
    currentFilters = filters,
    page = entriesPage,
    perPage = entriesRowsPerPage,
    expensePage = expensesPage,
    expensePerPage = expensesRowsPerPage
  ) => {
    try {
      setLoading(true);
      const params = {
        dateFrom: currentFilters.dateFrom || undefined,
        dateTo: currentFilters.dateTo || undefined,
        eventId: currentFilters.eventId || undefined,
        paymentMethod: currentFilters.paymentMethod || undefined,
        page: page + 1,
        perPage,
        expensePage: expensePage + 1,
        expensePerPage
      };
      const response = await listarRegistrosFinanceiros(params);
      setEntries(response?.entries || []);
      setEntriesTotal(Number(response?.entriesPagination?.total || 0));
      setExpenses(response?.expenses || []);
      setExpensesTotal(Number(response?.expensesPagination?.total || 0));
      setSummary(response?.summary || {});
      if (response?.feeConfig) {
        setFeeConfig({
          pixPercent: Number(response.feeConfig.pixPercent || 0),
          pixFixedFee: Number(response.feeConfig.pixFixedFee || 0),
          creditCardDefaultPercent: Number(response.feeConfig.creditCardDefaultPercent || 0),
          creditCardFixedFee: Number(response.feeConfig.creditCardFixedFee || 0),
          creditCardInstallmentPercent: response.feeConfig.creditCardInstallmentPercent || {},
          creditCardBrandRates: response.feeConfig.creditCardBrandRates || {}
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      setNotification(error.message || 'Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    loadFeeConfig();
    loadData();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    setEntriesPage(0);
    setExpensesPage(0);
    loadData(filters, 0, entriesRowsPerPage, 0, expensesRowsPerPage);
  };

  const handleClearFilters = () => {
    const reset = {
      dateFrom: '',
      dateTo: '',
      eventId: '',
      paymentMethod: ''
    };
    setFilters(reset);
    setEntriesPage(0);
    setExpensesPage(0);
    loadData(reset, 0, entriesRowsPerPage, 0, expensesRowsPerPage);
  };

  const handleEntriesPageChange = (_event, newPage) => {
    setEntriesPage(newPage);
    loadData(filters, newPage, entriesRowsPerPage, expensesPage, expensesRowsPerPage);
  };

  const handleEntriesRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setEntriesRowsPerPage(newRowsPerPage);
    setEntriesPage(0);
    loadData(filters, 0, newRowsPerPage, expensesPage, expensesRowsPerPage);
  };

  const handleExpensesPageChange = (_event, newPage) => {
    setExpensesPage(newPage);
    loadData(filters, entriesPage, entriesRowsPerPage, newPage, expensesRowsPerPage);
  };

  const handleExpensesRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setExpensesRowsPerPage(newRowsPerPage);
    setExpensesPage(0);
    loadData(filters, entriesPage, entriesRowsPerPage, 0, newRowsPerPage);
  };

  const handleFeeConfigChange = (field, value) => {
    setFeeConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleBrandRateChange = (cardBrandName, field, value) => {
    const brandKey = String(cardBrandName || '').toLowerCase();
    setFeeConfig((prev) => ({
      ...prev,
      creditCardBrandRates: {
        ...(prev.creditCardBrandRates || {}),
        [brandKey]: {
          ...(prev.creditCardBrandRates?.[brandKey] || {}),
          [field]: Number(value || 0)
        }
      }
    }));
  };

  const handleRrInstallmentRateChange = (installment, value) => {
    const installmentKey = String(installment);
    setFeeConfig((prev) => ({
      ...prev,
      creditCardInstallmentPercent: {
        ...(prev.creditCardInstallmentPercent || {}),
        [installmentKey]: Number(value || 0)
      }
    }));
  };

  const handleBrandInstallmentRateChange = (cardBrandName, installment, value) => {
    const brandKey = String(cardBrandName || '').toLowerCase();
    const installmentKey = String(installment);
    setFeeConfig((prev) => ({
      ...prev,
      creditCardBrandRates: {
        ...(prev.creditCardBrandRates || {}),
        [brandKey]: {
          ...(prev.creditCardBrandRates?.[brandKey] || {}),
          installmentPercent: {
            ...(prev.creditCardBrandRates?.[brandKey]?.installmentPercent || {}),
            [installmentKey]: Number(value || 0)
          }
        }
      }
    }));
  };

  const saveFeeConfig = async () => {
    try {
      setSavingFeeConfig(true);
      const payload = {
        pixPercent: Number(feeConfig.pixPercent || 0),
        pixFixedFee: Number(feeConfig.pixFixedFee || 0),
        creditCardDefaultPercent: Number(feeConfig.creditCardDefaultPercent || 0),
        creditCardFixedFee: Number(feeConfig.creditCardFixedFee || 0),
        creditCardInstallmentPercent: feeConfig.creditCardInstallmentPercent || {},
        creditCardBrandRates: feeConfig.creditCardBrandRates || {}
      };
      await atualizarConfiguracaoTaxasFinanceiras(payload);
      setNotification('Configuracao de taxas salva com sucesso');
      setFeeConfigModalOpen(false);
      loadData(filters, entriesPage, entriesRowsPerPage, expensesPage, expensesRowsPerPage);
    } catch (error) {
      console.error('Erro ao salvar configuracao de taxas:', error);
      setNotification(error.message || 'Erro ao salvar configuracao de taxas');
    } finally {
      setSavingFeeConfig(false);
    }
  };

  const openNewExpenseDialog = () => {
    setEditingExpenseId(null);
    setForm({
      ...defaultForm(),
      eventId: filters.eventId || ''
    });
    setFormOpen(true);
  };

  const openEditExpenseDialog = (expense) => {
    setEditingExpenseId(expense.id);
    setForm({
      eventId: expense.eventId || '',
      description: expense.description || '',
      amount: expense.amount,
      paymentMethod: expense.paymentMethod || 'pix',
      isSettled: Boolean(expense.isSettled),
      expenseDate: expense.expenseDate || new Date().toISOString().slice(0, 10),
      notes: expense.notes || ''
    });
    setFormOpen(true);
  };

  const closeFormDialog = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingExpenseId(null);
  };

  const saveExpense = async () => {
    if (!String(form.eventId || '').trim()) {
      setNotification('Selecione o evento da saida');
      return;
    }

    if (!String(form.description || '').trim()) {
      setNotification('Informe a descricao da saida');
      return;
    }

    if (Number(form.amount) <= 0) {
      setNotification('Informe um valor maior que zero');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        eventId: form.eventId,
        description: form.description,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        isSettled: Boolean(form.isSettled),
        expenseDate: form.expenseDate,
        notes: form.notes
      };

      if (editingExpenseId) {
        await atualizarSaidaFinanceira(editingExpenseId, payload);
        setNotification('Saida atualizada com sucesso');
      } else {
        await criarSaidaFinanceira(payload);
        setNotification('Saida cadastrada com sucesso');
      }

      closeFormDialog();
      loadData(filters, entriesPage, entriesRowsPerPage, expensesPage, expensesRowsPerPage);
    } catch (error) {
      console.error('Erro ao salvar saida:', error);
      setNotification(error.message || 'Erro ao salvar saida');
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (expense) => {
    if (!window.confirm(`Deseja remover a Saida "${expense.description}"?`)) {
      return;
    }

    try {
      await deletarSaidaFinanceira(expense.id);
      setNotification('Saida removida com sucesso');
      loadData(filters, entriesPage, entriesRowsPerPage, expensesPage, expensesRowsPerPage);
    } catch (error) {
      console.error('Erro ao remover Saida:', error);
      setNotification(error.message || 'Erro ao remover Saida');
    }
  };

  const settleExpense = async (expense) => {
    if (!expense || expense.isSettled) return;

    try {
      setSettlingExpenseId(expense.id);
      const payload = {
        eventId: expense.eventId,
        description: expense.description,
        amount: Number(expense.amount),
        paymentMethod: expense.paymentMethod || 'pix',
        isSettled: true,
        expenseDate: expense.expenseDate,
        notes: expense.notes || ''
      };
      await atualizarSaidaFinanceira(expense.id, payload);
      setNotification('Saida marcada como quitada');
      loadData(filters, entriesPage, entriesRowsPerPage, expensesPage, expensesRowsPerPage);
    } catch (error) {
      console.error('Erro ao marcar saida como quitada:', error);
      setNotification(error.message || 'Erro ao marcar saida como quitada');
    } finally {
      setSettlingExpenseId(null);
    }
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <Grid container spacing={2} style={{ marginBottom: 16 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Entradas Brutas</Typography>
              <Typography variant="h6">{formatCurrency(summary.ticketGross)}</Typography>
              <TrendingUpIcon color="primary" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Taxas</Typography>
              <Typography variant="h6">{formatCurrency(summary.totalFees || summary.cieloFees)}</Typography>
              <ReceiptIcon color="warning" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Entradas Liquidas</Typography>
              <Typography variant="h6">{formatCurrency(summary.ticketNet)}</Typography>
              <PaidIcon color="success" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Saidas Pagas</Typography>
              <Typography variant="h6">{formatCurrency(summary.expensesSettled)}</Typography>
              <TrendingDownIcon color="error" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Saidas Pendentes</Typography>
              <Typography variant="h6">{formatCurrency(summary.expensesPending)}</Typography>
              <TrendingDownIcon color="disabled" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary">Saldo</Typography>
              <Typography variant="h6" color={(summary.balance || 0) >= 0 ? 'primary' : 'error'}>
                {formatCurrency(summary.balance)}
              </Typography>
              <AttachMoneyIcon color={(summary.balance || 0) >= 0 ? 'success' : 'error'} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <PapperBlock
        title="Financeiro"
        icon="ion-cash"
        desc="Entradas dos tickets (com Taxa) e Saidas manuais"
        overflowX
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" style={{ marginBottom: 16 }}>
          <Typography variant="h6">Configuracao de Taxas</Typography>
          <Button variant="outlined" color="primary" onClick={() => setFeeConfigModalOpen(true)}>
            Configurar taxas
          </Button>
        </Box>

        <Grid container spacing={2} alignItems="flex-end" style={{ marginBottom: 16 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Data inicial"
              type="date"
              fullWidth
              value={filters.dateFrom}
              InputLabelProps={{ shrink: true }}
              onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Data final"
              type="date"
              fullWidth
              value={filters.dateTo}
              InputLabelProps={{ shrink: true }}
              onChange={(event) => handleFilterChange('dateTo', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel id="financial-event-filter">Evento</InputLabel>
              <Select
                labelId="financial-event-filter"
                value={filters.eventId}
                label="Evento"
                onChange={(event) => handleFilterChange('eventId', event.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {activeEvents.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel id="financial-payment-method-filter">Forma de Pagamento</InputLabel>
              <Select
                labelId="financial-payment-method-filter"
                value={filters.paymentMethod}
                label="Forma de Pagamento"
                onChange={(event) => handleFilterChange('paymentMethod', event.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" gap={1}>
              <Button variant="contained" color="primary" onClick={handleApplyFilters}>
                Filtrar
              </Button>
              <Button variant="outlined" onClick={handleClearFilters}>
                Limpar
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="space-between" alignItems="center" style={{ marginBottom: 8 }}>
          <Typography variant="h6">Entradas de Tickets</Typography>
        </Box>

        {loading ? (
          <Typography>Carregando dados...</Typography>
        ) : entries.length === 0 ? (
          <Typography>Nenhuma entrada encontrada para o periodo.</Typography>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Codigo</TableCell>
                  <TableCell>Evento</TableCell>
                  <TableCell>Forma</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Bandeira</TableCell>
                  <TableCell>Parcelas</TableCell>
                  <TableCell>Bruto</TableCell>
                  <TableCell>Taxa</TableCell>
                  <TableCell>Liquido</TableCell>
                  <TableCell>Data</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.orderCode}</TableCell>
                    <TableCell>{entry.eventTitle}</TableCell>
                    <TableCell>{getPaymentMethodLabel(entry.paymentMethod)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getPaymentStatusLabel(entry.paymentStatus)}
                        sx={getPaymentStatusChipSx(entry.paymentStatus)}
                      />
                    </TableCell>
                    <TableCell>{renderCardBrand(entry)}</TableCell>
                    <TableCell>{entry.installments ? `${entry.installments}x` : '-'}</TableCell>
                    <TableCell>{formatCurrency(entry.grossAmount)}</TableCell>
                    <TableCell>
                      {formatCurrency(entry.feeAmount ?? entry.cieloFee)}
                      {entry.feeDetails?.method === 'credit_card' && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          {`${Number(entry.feeDetails.mdrPercent || 0).toFixed(2)}% + ${Number(entry.feeDetails.rrPercent || 0).toFixed(2)}%`}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(entry.netAmount)}</TableCell>
                    <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={entriesTotal}
              page={entriesPage}
              onPageChange={handleEntriesPageChange}
              rowsPerPage={entriesRowsPerPage}
              onRowsPerPageChange={handleEntriesRowsPerPageChange}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" style={{ marginTop: 24, marginBottom: 8 }}>
          <Typography variant="h6">Saidas</Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={openNewExpenseDialog}
          >
            Nova Saida
          </Button>
        </Box>

        {loading ? (
          <Typography>Carregando Saidas...</Typography>
        ) : expenses.length === 0 ? (
          <Typography>Nenhuma Saida cadastrada.</Typography>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Evento</TableCell>
                  <TableCell>Descricao</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Forma de Pagamento</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Acoes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.eventTitle || '-'}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{getPaymentMethodLabel(expense.paymentMethod)}</TableCell>
                    <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          size="small"
                          label={expense.isSettled ? 'Quitado' : 'Pendente'}
                          color={expense.isSettled ? 'success' : 'warning'}
                        />
                        {!expense.isSettled && (
                          <Tooltip title={settlingExpenseId === expense.id ? 'Atualizando...' : 'Marcar como quitado'}>
                            <span>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => settleExpense(expense)}
                                disabled={settlingExpenseId === expense.id}
                              >
                                <CheckCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar Saida">
                        <IconButton size="small" onClick={() => openEditExpenseDialog(expense)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir Saida">
                        <IconButton size="small" color="error" onClick={() => removeExpense(expense)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={expensesTotal}
              page={expensesPage}
              onPageChange={handleExpensesPageChange}
              rowsPerPage={expensesRowsPerPage}
              onRowsPerPageChange={handleExpensesRowsPerPageChange}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}
      </PapperBlock>
      <Dialog open={feeConfigModalOpen} onClose={() => setFeeConfigModalOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Configurar Taxas do Financeiro</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Taxa PIX (%)"
                inputProps={{ min: 0, step: 0.01 }}
                value={feeConfig.pixPercent}
                onChange={(event) => handleFeeConfigChange('pixPercent', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Taxa fixa PIX (R$)"
                inputProps={{ min: 0, step: 0.01 }}
                value={feeConfig.pixFixedFee}
                onChange={(event) => handleFeeConfigChange('pixFixedFee', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="MDR padrao 1x (%)"
                inputProps={{ min: 0, step: 0.01 }}
                value={feeConfig.creditCardDefaultPercent}
                onChange={(event) => handleFeeConfigChange('creditCardDefaultPercent', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Taxa minima padrao (R$)"
                inputProps={{ min: 0, step: 0.01 }}
                value={feeConfig.creditCardFixedFee}
                onChange={(event) => handleFeeConfigChange('creditCardFixedFee', event.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" style={{ marginTop: 8 }}>
                RR por parcela (%) - aplicado em todas as bandeiras
              </Typography>
            </Grid>
            {INSTALLMENT_OPTIONS.map((installment) => (
              <Grid item xs={12} sm={6} md={2} key={`rr-installment-${installment}`}>
                <TextField
                  fullWidth
                  type="number"
                  label={`${installment}x RR (%)`}
                  inputProps={{ min: 0, step: 0.01 }}
                  value={feeConfig.creditCardInstallmentPercent?.[String(installment)] ?? ''}
                  onChange={(event) => handleRrInstallmentRateChange(installment, event.target.value)}
                />
              </Grid>
            ))}

            {CARD_BRANDS.map((cardBrandName) => {
              const brandKey = cardBrandName.toLowerCase();
              const brandRate = feeConfig.creditCardBrandRates?.[brandKey] || {};
              return (
                <React.Fragment key={`brand-rate-${brandKey}`}>
                  <Grid item xs={12}>
                    <Box
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px solid rgba(0, 0, 0, 0.12)'
                      }}
                    >
                      <Typography variant="subtitle1">{cardBrandName}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`${cardBrandName} MDR 1x (%)`}
                      inputProps={{ min: 0, step: 0.01 }}
                      value={brandRate.defaultPercent ?? ''}
                      onChange={(event) => handleBrandRateChange(cardBrandName, 'defaultPercent', event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label={`${cardBrandName} taxa minima (R$)`}
                      inputProps={{ min: 0, step: 0.01 }}
                      value={brandRate.minimumFee ?? brandRate.fixedFee ?? ''}
                      onChange={(event) => handleBrandRateChange(cardBrandName, 'minimumFee', event.target.value)}
                    />
                  </Grid>
                  {INSTALLMENT_OPTIONS.map((installment) => (
                    <Grid item xs={12} sm={6} md={2} key={`${brandKey}-mdr-installment-${installment}`}>
                      <TextField
                        fullWidth
                        type="number"
                        label={`${installment}x MDR (%)`}
                        inputProps={{ min: 0, step: 0.01 }}
                        value={brandRate.installmentPercent?.[String(installment)] ?? ''}
                        onChange={(event) => handleBrandInstallmentRateChange(cardBrandName, installment, event.target.value)}
                      />
                    </Grid>
                  ))}
                </React.Fragment>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeeConfigModalOpen(false)} disabled={savingFeeConfig}>Cancelar</Button>
          <Button onClick={saveFeeConfig} variant="contained" color="primary" disabled={savingFeeConfig}>
            Salvar Taxas
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={formOpen} onClose={closeFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingExpenseId ? 'Editar Saida' : 'Nova Saida'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 4 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="expense-event-label">Evento</InputLabel>
                <Select
                  labelId="expense-event-label"
                  value={form.eventId}
                  label="Evento"
                  onChange={(event) => setForm((prev) => ({ ...prev, eventId: event.target.value }))}
                >
                  <MenuItem value="" disabled>Selecione o evento</MenuItem>
                  {activeEvents.map((event) => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descricao"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Valor"
                value={form.amount}
                inputProps={{ min: 0, step: 0.01 }}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="expense-payment-method-label">Forma de Pagamento</InputLabel>
                <Select
                  labelId="expense-payment-method-label"
                  value={form.paymentMethod}
                  label="Forma de Pagamento"
                  onChange={(event) => setForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                >
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Data da Saida"
                InputLabelProps={{ shrink: true }}
                value={form.expenseDate}
                onChange={(event) => setForm((prev) => ({ ...prev, expenseDate: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="expense-settled-label">Situacao</InputLabel>
                <Select
                  labelId="expense-settled-label"
                  value={form.isSettled ? 'yes' : 'no'}
                  label="Situacao"
                  onChange={(event) => setForm((prev) => ({ ...prev, isSettled: event.target.value === 'yes' }))}
                >
                  <MenuItem value="yes">Quitado</MenuItem>
                  <MenuItem value="no">Nao Quitado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Observacao"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFormDialog} disabled={saving}>Cancelar</Button>
          <Button onClick={saveExpense} variant="contained" color="primary" disabled={saving}>
            {editingExpenseId ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

export default FinancialPage;
