import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  LinearProgress
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
import ExpandMoreIcon from '@mui/icons-material/KeyboardArrowDown';
import ExpandLessIcon from '@mui/icons-material/KeyboardArrowUp';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useHistory } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import {
  listarEventos,
  listarEstatisticas,
  listarResumoIngressosEvento,
  deletarEvento,
  duplicarEvento,
  atualizarEvento
} from '../../../api/eventsApi';
import { EVENT_TYPE_LABELS } from '../../../constants/eventTypes';

function EventList() {
  const history = useHistory();
  const [eventos, setEventos] = useState([]);
  const [eventosFiltrados, setEventosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [stats, setStats] = useState({
    totalEventos: 0,
    eventosAtivos: 0,
    totalInscricoes: 0,
    receitaTotal: 0
  });
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'todos'
  });
  const [expandedEvents, setExpandedEvents] = useState({});
  const [ticketsSummaryByEvent, setTicketsSummaryByEvent] = useState({});
  const [ticketsSummaryLoading, setTicketsSummaryLoading] = useState({});

  async function carregarEventos() {
    try {
      setLoading(true);
      const [response, statsResponse] = await Promise.all([listarEventos(), listarEstatisticas()]);
      const eventosArray = Array.isArray(response) ? response : [];

      setEventos(eventosArray);
      setEventosFiltrados(eventosArray);

      setStats({
        totalEventos: Number(statsResponse?.totalEventos ?? eventosArray.length),
        eventosAtivos: Number(statsResponse?.eventosAtivos ?? eventosArray.filter(e => e.isActive).length),
        totalInscricoes: Number(statsResponse?.totalInscricoes ?? eventosArray.reduce((sum, e) => sum + (e.currentRegistrations || 0), 0)),
        receitaTotal: Number(statsResponse?.receitaTotal ?? 0)
      });
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      setNotification('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }

  function aplicarFiltros() {
    let resultado = [...eventos];

    // Filtro de busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(evento => {
        const valores = [
          evento.title,
          evento.description,
          evento.location,
          evento.city,
          evento.neighborhood,
          evento.cep,
          EVENT_TYPE_LABELS[evento.eventType]
        ];
        return valores.some((valor) => valor && valor.toString().toLowerCase().includes(busca)
        );
      });
    }

    // Filtro de status
    if (filtros.status !== 'todos') {
      resultado = resultado.filter(evento => (filtros.status === 'ativos' ? evento.isActive : !evento.isActive)
      );
    }

    setEventosFiltrados(resultado);
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, eventos]);

  const handleChangeFiltro = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const handleDeletar = async (id, titulo) => {
    if (window.confirm(`Tem certeza que deseja deletar o evento "${titulo}"?`)) {
      try {
        await deletarEvento(id);
        setNotification('Evento deletado com sucesso!');
        carregarEventos();
      } catch (error) {
        const mensagem = error.message || 'Erro ao deletar evento';
        setNotification(mensagem);
        alert(mensagem);
      }
    }
  };

  const handleDuplicar = async (evento) => {
    if (!window.confirm(`Deseja duplicar o evento "${evento.title}"?`)) {
      return;
    }
    try {
      await duplicarEvento(evento.id);
      setNotification('Evento duplicado com sucesso!');
      carregarEventos();
    } catch (error) {
      console.error('Erro ao duplicar evento:', error);
      setNotification(error.message || 'Erro ao duplicar evento');
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarPreco = (preco) => `R$ ${parseFloat(preco || 0).toFixed(2).replace('.', ',')}`;

  const formatarVendidosTotal = (vendidos, total) => {
    if (total == null) return `${vendidos} / -`;
    return `${vendidos} / ${total}`;
  };

  const calcularPercentualVendidos = (vendidos, total) => {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, (Number(vendidos || 0) / Number(total)) * 100));
  };

  const handleToggleStatus = async (evento) => {
    try {
      await atualizarEvento(evento.id, { isActive: !evento.isActive });
      setNotification(`Evento ${evento.isActive ? 'desativado' : 'ativado'} com sucesso!`);
      carregarEventos();
    } catch (error) {
      console.error('Erro ao atualizar status do evento:', error);
      setNotification(error.message || 'Erro ao atualizar status');
    }
  };

  const carregarResumoIngressos = async (eventId) => {
    if (!eventId) return;
    if (ticketsSummaryByEvent[eventId]) return;
    if (ticketsSummaryLoading[eventId]) return;
    try {
      setTicketsSummaryLoading((prev) => ({ ...prev, [eventId]: true }));
      const summary = await listarResumoIngressosEvento(eventId);
      setTicketsSummaryByEvent((prev) => ({ ...prev, [eventId]: summary }));
    } catch (error) {
      console.error('Erro ao carregar resumo de ingressos:', error);
      setNotification(error.message || 'Erro ao carregar resumo de ingressos');
    } finally {
      setTicketsSummaryLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const toggleEventSummary = (eventId) => {
    setExpandedEvents((prev) => {
      const nextExpanded = !prev[eventId];
      if (nextExpanded) {
        carregarResumoIngressos(eventId);
      }
      return { ...prev, [eventId]: nextExpanded };
    });
  };

  const title = brand.name + ' - Eventos';
  const eventsTableContainerSx = {
    width: '100%',
    overflowX: 'auto',
    '& .MuiTable-root': { minWidth: 980 },
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
        {/* Filtros */}
        <Grid container spacing={2} style={{ marginBottom: 16 }}>
          <Grid item xs={12} sm={6} md={4}>
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
                onChange={(e) => handleChangeFiltro('status', e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="ativos">Ativos</MenuItem>
                <MenuItem value="inativos">Inativos</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={5}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => history.push('/app/events/novo')}
            >
              Novo Evento
            </Button>
          </Grid>
        </Grid>

        {/* Tabela */}
        {loading ? (
          <Typography>Carregando...</Typography>
        ) : eventosFiltrados.length === 0 ? (
          <Typography>
            {eventos.length === 0 ? 'Nenhum evento cadastrado' : 'Nenhum evento encontrado com os filtros aplicados'}
          </Typography>
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
                        <Typography variant="subtitle2">{evento.title}</Typography>
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
                        <Tooltip title="Ver Detalhes">
                          <IconButton
                            size="small"
                            onClick={() => history.push(`/app/events/${evento.id}`, { pageTitle: evento.title })}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => history.push(`/app/events/${evento.id}/editar`)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deletar">
                          <IconButton
                            size="small"
                            onClick={() => handleDeletar(evento.id, evento.title)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Duplicar">
                          <IconButton
                            size="small"
                            onClick={() => handleDuplicar(evento)}
                          >
                            <DuplicateIcon />
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
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}
export default EventList;
