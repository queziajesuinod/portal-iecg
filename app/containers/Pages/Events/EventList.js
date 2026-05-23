import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  useQuery, useQueries, useMutation, useQueryClient
} from '@tanstack/react-query';
import { PapperBlock, Notification } from 'dan-components';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Table,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  Select,
  MenuItem,
  Collapse,
  LinearProgress,
  useMediaQuery,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewIcon from '@mui/icons-material/Visibility';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import MoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingIcon from '@mui/icons-material/TrendingUp';
import DuplicateIcon from '@mui/icons-material/FileCopy';
import UploadIcon from '@mui/icons-material/Upload';
import ExpandMoreIcon from '@mui/icons-material/KeyboardArrowDown';
import ExpandLessIcon from '@mui/icons-material/KeyboardArrowUp';
import AccordionExpandIcon from '@mui/icons-material/ExpandMore';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useHistory } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { formatDateInAppTimezone } from '../../../utils/dateTime';
import { useConfirm } from '../../../utils/useConfirm';
import { TableSkeleton } from '../../../components/Skeleton';
import {
  listarEventos,
  listarEstatisticas,
  listarResumoIngressosEvento,
  deletarEvento,
  duplicarEvento,
  atualizarEvento
} from '../../../api/eventsApi';
import { EVENT_TYPE_LABELS } from '../../../constants/eventTypes';
import { queryKeys } from '../../../utils/queryKeys';

function EventList() {
  const { confirm, ConfirmDialog } = useConfirm();
  const history = useHistory();
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState('');
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'todos',
    finalizados: false
  });
  const [expandedEvents, setExpandedEvents] = useState({});
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const tableMinWidth = isMobile ? 720 : 980;

  // Lista de eventos — cache 60s; refetch automatico quando 'finalizados' muda.
  const eventosQuery = useQuery({
    queryKey: queryKeys.events.list({ finalizados: filtros.finalizados }),
    queryFn: () => listarEventos(filtros.finalizados ? { includeFinished: 'true' } : {}),
    select: (data) => (Array.isArray(data) ? data : []),
  });
  const eventos = eventosQuery.data || [];
  const loading = eventosQuery.isLoading;

  // Estatisticas em paralelo (consulta independente — pode revalidar sozinha).
  const statsQuery = useQuery({
    queryKey: queryKeys.events.stats,
    queryFn: listarEstatisticas,
  });

  const stats = useMemo(() => ({
    totalEventos: Number(statsQuery.data?.totalEventos ?? eventos.length),
    eventosAtivos: Number(statsQuery.data?.eventosAtivos ?? eventos.filter((e) => e.isActive).length),
    totalInscricoes: Number(
      statsQuery.data?.totalInscricoes
      ?? eventos.reduce((sum, e) => sum + (e.currentRegistrations || 0), 0)
    ),
    receitaTotal: Number(statsQuery.data?.receitaTotal ?? 0),
  }), [statsQuery.data, eventos]);

  // Lista de eventos atualmente expandidos — usada pra disparar queries de resumo.
  const expandedIds = useMemo(
    () => Object.keys(expandedEvents).filter((id) => expandedEvents[id]),
    [expandedEvents]
  );

  // Uma query por evento expandido. enabled garante que so dispara quando expandido.
  // staleTime 60s evita refetch ao reabrir o mesmo card.
  const ticketsSummaryQueries = useQueries({
    queries: expandedIds.map((eventId) => ({
      queryKey: queryKeys.events.ticketsSummary(eventId),
      queryFn: () => listarResumoIngressosEvento(eventId),
      enabled: Boolean(eventId),
      staleTime: 60_000,
    })),
  });

  const ticketsSummaryByEvent = useMemo(() => {
    const map = {};
    expandedIds.forEach((id, idx) => {
      const q = ticketsSummaryQueries[idx];
      if (q?.data) map[id] = q.data;
    });
    return map;
  }, [expandedIds, ticketsSummaryQueries]);

  const ticketsSummaryLoading = useMemo(() => {
    const map = {};
    expandedIds.forEach((id, idx) => {
      map[id] = Boolean(ticketsSummaryQueries[idx]?.isLoading);
    });
    return map;
  }, [expandedIds, ticketsSummaryQueries]);

  // Helper: invalida tudo de eventos apos uma mutation que altera a lista.
  const invalidateAllEvents = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
  };

  const deletarMutation = useMutation({
    mutationFn: (id) => deletarEvento(id),
    onSuccess: () => {
      setNotification('Evento deletado com sucesso!');
      invalidateAllEvents();
    },
    onError: (error) => setNotification(error.message || 'Erro ao deletar evento'),
  });

  const duplicarMutation = useMutation({
    mutationFn: (id) => duplicarEvento(id),
    onSuccess: () => {
      setNotification('Evento duplicado com sucesso!');
      invalidateAllEvents();
    },
    onError: (error) => setNotification(error.message || 'Erro ao duplicar evento'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => atualizarEvento(id, { isActive }),
    onSuccess: (_data, variables) => {
      setNotification(`Evento ${variables.isActive ? 'ativado' : 'desativado'} com sucesso!`);
      invalidateAllEvents();
    },
    onError: (error) => setNotification(error.message || 'Erro ao atualizar status'),
  });

  // Filtragem totalmente derivada dos dados em cache + filtros locais.
  const eventosFiltrados = useMemo(() => {
    let resultado = eventos;

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter((evento) => {
        const valores = [
          evento.title,
          evento.description,
          evento.location,
          evento.city,
          evento.neighborhood,
          evento.cep,
          EVENT_TYPE_LABELS[evento.eventType]
        ];
        return valores.some((valor) => valor && valor.toString().toLowerCase().includes(busca));
      });
    }

    if (filtros.status !== 'todos') {
      resultado = resultado.filter((evento) => (filtros.status === 'ativos' ? evento.isActive : !evento.isActive));
    }

    if (!filtros.finalizados) {
      const now = new Date();
      resultado = resultado.filter((evento) => !evento.endDate || new Date(evento.endDate) >= now);
    }

    return resultado;
  }, [eventos, filtros]);

  const handleChangeFiltro = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const activeFilterCount = (filtros.busca ? 1 : 0)
    + (filtros.status !== 'todos' ? 1 : 0)
    + (filtros.finalizados ? 1 : 0);

  const clearFilters = () => {
    setFiltros({ busca: '', status: 'todos', finalizados: false });
  };

  const handleDeletar = async (id, titulo) => {
    const ok = await confirm({
      title: 'Deletar evento', message: `Tem certeza que deseja deletar o evento "${titulo}"?`, confirmText: 'Deletar', confirmColor: 'error', severity: 'error'
    });
    if (!ok) return;
    deletarMutation.mutate(id);
  };

  const handleDuplicar = async (evento) => {
    const ok = await confirm({
      title: 'Duplicar evento', message: `Deseja duplicar o evento "${evento.title}"?`, confirmText: 'Duplicar', confirmColor: 'primary', severity: 'info'
    });
    if (!ok) return;
    duplicarMutation.mutate(evento.id);
  };

  const handleToggleStatus = (evento) => {
    toggleStatusMutation.mutate({ id: evento.id, isActive: !evento.isActive });
  };

  const formatarData = (data) => formatDateInAppTimezone(data, '-');
  const formatarPreco = (preco) => `R$ ${parseFloat(preco || 0).toFixed(2).replace('.', ',')}`;
  const formatarVendidosTotal = (vendidos, total) => {
    if (total == null) return `${vendidos} / -`;
    return `${vendidos} / ${total}`;
  };
  const calcularPercentualVendidos = (vendidos, total) => {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, (Number(vendidos || 0) / Number(total)) * 100));
  };

  const toggleEventSummary = (eventId) => {
    setExpandedEvents((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const title = brand.name + ' - Eventos';
  const eventsTableContainerSx = {
    width: '100%',
    overflowX: 'auto',
    '& .MuiTable-root': { minWidth: tableMinWidth },
    '& .MuiTableCell-root': { whiteSpace: 'nowrap' }
  };
  const ticketSummaryTableContainerSx = {
    width: '100%',
    overflowX: 'auto',
    '& .MuiTable-root': { minWidth: 820 },
    '& .MuiTableCell-root': { whiteSpace: 'nowrap' }
  };

  const renderResumoIngressos = (eventId) => {
    const loadingResumo = Boolean(ticketsSummaryLoading[eventId]);
    const resumo = ticketsSummaryByEvent[eventId];

    if (loadingResumo) {
      return <Typography variant="body2">Carregando resumo...</Typography>;
    }

    if (!resumo || !Array.isArray(resumo.batches) || resumo.batches.length === 0) {
      return <Typography variant="body2">Sem dados de ingressos para este evento.</Typography>;
    }

    return (
      <TableContainer sx={ticketSummaryTableContainerSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Lote</TableCell>
              <TableCell>Preço</TableCell>
              <TableCell>Vendidos/Total</TableCell>
              <TableCell><CreditCardIcon fontSize="small" /> Cartão</TableCell>
              <TableCell><AccountBalanceWalletIcon fontSize="small" /> Pix</TableCell>
              <TableCell><MoneyIcon fontSize="small" /> Outros</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resumo.batches.map((row) => (
              <TableRow key={row.batchId}>
                <TableCell>{row.batchName}</TableCell>
                <TableCell>{formatarPreco(row.price)}</TableCell>
                <TableCell>
                  <div style={{ minWidth: 150 }}>
                    <LinearProgress
                      variant="determinate"
                      value={calcularPercentualVendidos(row.sold, row.total)}
                      style={{ height: 10, borderRadius: 6, marginBottom: 4 }}
                    />
                    <Typography variant="caption">
                      {formatarVendidosTotal(row.sold, row.total)}
                    </Typography>
                  </div>
                </TableCell>
                <TableCell>{formatarPreco(row.credit)}</TableCell>
                <TableCell>{formatarPreco(row.pix)}</TableCell>
                <TableCell>{formatarPreco(row.others)}</TableCell>
                <TableCell align="right">{formatarPreco(row.totalPaid)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell><strong>TOTAL</strong></TableCell>
              <TableCell>-</TableCell>
              <TableCell>
                <strong>{formatarVendidosTotal(resumo.totals?.sold || 0, resumo.totals?.total || 0)}</strong>
              </TableCell>
              <TableCell><strong>{formatarPreco(resumo.totals?.credit || 0)}</strong></TableCell>
              <TableCell><strong>{formatarPreco(resumo.totals?.pix || 0)}</strong></TableCell>
              <TableCell><strong>{formatarPreco(resumo.totals?.others || 0)}</strong></TableCell>
              <TableCell align="right"><strong>{formatarPreco(resumo.totals?.totalPaid || 0)}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Typography variant="body2" color="textSecondary">
                    Total de Eventos
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalEventos}
                  </Typography>
                </div>
                <EventIcon style={{ fontSize: 48, opacity: 0.3 }} />
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Typography variant="body2" color="textSecondary">
                    Eventos Ativos
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {stats.eventosAtivos}
                  </Typography>
                </div>
                <TrendingIcon style={{ fontSize: 48, opacity: 0.3 }} color="primary" />
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Typography variant="body2" color="textSecondary">
                    Total de Inscrições
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalInscricoes}
                  </Typography>
                </div>
                <PeopleIcon style={{ fontSize: 48, opacity: 0.3 }} />
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Typography variant="body2" color="textSecondary">
                    Receita Total
                  </Typography>
                  <Typography variant="h4" color="secondary">
                    {formatarPreco(stats.receitaTotal)}
                  </Typography>
                </div>
                <MoneyIcon style={{ fontSize: 48, opacity: 0.3 }} color="secondary" />
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Eventos */}
      <PapperBlock
        title="Eventos"
        icon="ion-ios-calendar-outline"
        desc="Gerenciar eventos e inscrições"
        overflowX
      >
        {/* Filtros + ação principal */}
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="flex-start" mb={2}>
          <Accordion
            defaultExpanded
            disableGutters
            sx={{
              flex: 1,
              minWidth: 280,
              boxShadow: 'none',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              '&:before': { display: 'none' }
            }}
          >
            <AccordionSummary
              expandIcon={<AccordionExpandIcon />}
              sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.75 } }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography variant="subtitle2">Filtros</Typography>
                {activeFilterCount > 0 && (
                  <Badge
                    badgeContent={activeFilterCount}
                    color="primary"
                    sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none' } }}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Buscar eventos"
                    value={filtros.busca}
                    onChange={(e) => handleChangeFiltro('busca', e.target.value)}
                    placeholder="Título, descrição ou local"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filtros.status}
                      label="Status"
                      onChange={(e) => handleChangeFiltro('status', e.target.value)}
                    >
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="ativos">Ativos</MenuItem>
                      <MenuItem value="inativos">Inativos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs="auto">
                  <Button
                    variant={filtros.finalizados ? 'contained' : 'outlined'}
                    color="secondary"
                    size="small"
                    onClick={() => handleChangeFiltro('finalizados', !filtros.finalizados)}
                  >
                    {filtros.finalizados ? 'Ocultando futuros' : 'Ver finalizados'}
                  </Button>
                </Grid>
                {activeFilterCount > 0 && (
                  <Grid item xs="auto">
                    <Button size="small" onClick={clearFilters}>Limpar filtros</Button>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
          <Box flexShrink={0} mt={0.5}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => history.push('/app/events/novo')}
            >
              Novo Evento
            </Button>
          </Box>
        </Box>

        {/* Tabela */}
        {!loading && eventosQuery.isFetching && (
          <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />
        )}
        {loading ? (
          <TableSkeleton cols={5} showToolbar={false} />
        ) : eventosFiltrados.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <FilterListOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {eventos.length === 0
                ? 'Nenhum evento cadastrado'
                : 'Nenhum evento encontrado com os filtros aplicados'}
            </Typography>
            {activeFilterCount > 0 && (
              <Button size="small" onClick={clearFilters} sx={{ mt: 1 }}>
                Limpar filtros
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer sx={eventsTableContainerSx}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={40}> </TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell>Data Início</TableCell>
                  <TableCell>Local</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="center">Inscrições</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventosFiltrados.map((evento) => (
                  <React.Fragment key={evento.id}>
                    <TableRow>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleEventSummary(evento.id)}>
                          {expandedEvents[evento.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" style={{ marginBottom: 4 }}>{evento.title}</Typography>
                        <Chip
                          label={evento.requiresPayment === false ? 'Gratuito' : 'Pago'}
                          size="small"
                          color={evento.requiresPayment === false ? 'success' : 'primary'}
                          variant={evento.requiresPayment === false ? 'outlined' : 'filled'}
                        />
                      </TableCell>
                      <TableCell>{formatarData(evento.startDate)}</TableCell>
                      <TableCell>{evento.location || '-'}</TableCell>
                      <TableCell>
                        {EVENT_TYPE_LABELS[evento.eventType] || evento.eventType || '-'}
                      </TableCell>
                      <TableCell align="center">
                        {evento.currentRegistrations || 0}
                        {evento.maxRegistrations && ` / ${evento.maxRegistrations}`}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          color={evento.isActive ? 'primary' : 'inherit'}
                          onClick={() => handleToggleStatus(evento)}
                        >
                          {evento.isActive ? 'Ativo' : 'Inativo'}
                        </Button>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ações">
                          <IconButton
                            size="small"
                            onClick={(e) => setRowMenuAnchor({ anchorEl: e.currentTarget, eventId: evento.id })}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                        <Collapse in={Boolean(expandedEvents[evento.id])} timeout="auto" unmountOnExit>
                          <div style={{
                            margin: '12px 0 16px 0', padding: 12, background: '#fafafa', borderRadius: 8
                          }}>
                            <Typography variant="subtitle2" style={{ marginBottom: 10 }}>
                            Ingressos
                            </Typography>
                            {renderResumoIngressos(evento.id)}
                          </div>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </PapperBlock>

      <Menu
        anchorEl={rowMenuAnchor?.anchorEl}
        open={Boolean(rowMenuAnchor)}
        onClose={() => setRowMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {(() => {
          const evento = eventosFiltrados.find((ev) => ev.id === rowMenuAnchor?.eventId);
          if (!evento) return null;
          return [
            <MenuItem
              key="ver"
              onClick={() => {
                setRowMenuAnchor(null);
                history.push(`/app/events/${evento.id}`, { pageTitle: evento.title });
              }}
            >
              <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Ver detalhes</ListItemText>
            </MenuItem>,
            <MenuItem
              key="editar"
              onClick={() => {
                setRowMenuAnchor(null);
                history.push(`/app/events/${evento.id}/editar`);
              }}
            >
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Editar</ListItemText>
            </MenuItem>,
            <MenuItem
              key="duplicar"
              onClick={() => {
                setRowMenuAnchor(null);
                handleDuplicar(evento);
              }}
            >
              <ListItemIcon><DuplicateIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Duplicar</ListItemText>
            </MenuItem>,
            <MenuItem
              key="importar"
              onClick={() => {
                setRowMenuAnchor(null);
                history.push(`/app/events/importar?eventId=${evento.id}`);
              }}
            >
              <ListItemIcon><UploadIcon fontSize="small" sx={{ color: 'info.main' }} /></ListItemIcon>
              <ListItemText>Importar inscritos como membros</ListItemText>
            </MenuItem>,
            <Divider key="div" />,
            <MenuItem
              key="deletar"
              onClick={() => {
                setRowMenuAnchor(null);
                handleDeletar(evento.id, evento.title);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
              <ListItemText>Deletar</ListItemText>
            </MenuItem>,
          ];
        })()}
      </Menu>

      <Notification message={notification} close={() => setNotification('')} />
      {ConfirmDialog}
    </div>
  );
}
export default EventList;
