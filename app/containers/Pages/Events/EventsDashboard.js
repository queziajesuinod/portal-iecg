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
  Select,
  MenuItem
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Event as EventIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingIcon
} from '@material-ui/icons';
import { useHistory } from 'react-router-dom';
import { listarEventos, deletarEvento } from '../../../api/eventsApi';
import brand from 'dan-api/dummy/brand';

function EventsDashboard() {
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

  useEffect(() => {
    carregarEventos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, eventos]);

  const carregarEventos = async () => {
    try {
      setLoading(true);
      const response = await listarEventos();
      // A API pode retornar response.data ou response diretamente
      const eventosData = Array.isArray(response) ? response : (response.data || []);
      
      // Garantir que sempre seja um array
      const eventosArray = Array.isArray(eventosData) ? eventosData : [];
      
      setEventos(eventosArray);
      setEventosFiltrados(eventosArray);

      // Calcular estatísticas
      const stats = {
        totalEventos: eventosArray.length,
        eventosAtivos: eventosArray.filter(e => e.isActive).length,
        totalInscricoes: eventosArray.reduce((sum, e) => sum + (e.currentRegistrations || 0), 0),
        receitaTotal: eventosArray.reduce((sum, e) => sum + (parseFloat(e.totalRevenue) || 0), 0)
      };
      
      setStats(stats);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      setNotification('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...eventos];

    // Filtro de busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(evento =>
        evento.title.toLowerCase().includes(busca) ||
        (evento.description && evento.description.toLowerCase().includes(busca)) ||
        (evento.location && evento.location.toLowerCase().includes(busca))
      );
    }

    // Filtro de status
    if (filtros.status !== 'todos') {
      resultado = resultado.filter(evento =>
        filtros.status === 'ativos' ? evento.isActive : !evento.isActive
      );
    }

    setEventosFiltrados(resultado);
  };

  const handleChangeFiltro = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const handleDeletar = async (id, titulo) => {
    if (window.confirm(`Tem certeza que deseja deletar o evento "${titulo}"?`)) {
      try {
        await deletarEven        setNotification('Evento deletado com sucesso!');
        carregarEventos();
      } catch (error) {
        setNotification(error.response?.data?.message || 'Erro ao deletar evento');alert(error.response?.data?.message || 'Erro ao deletar evento');
      }
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarPreco = (preco) => {
    return `R$ ${parseFloat(preco || 0).toFixed(2).replace('.', ',')}`;
  };

  const title = brand.name + ' - Eventos';

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
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Data Início</TableCell>
                <TableCell>Local</TableCell>
                <TableCell align="center">Inscrições</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventosFiltrados.map((evento) => (
                <TableRow key={evento.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{evento.title}</Typography>
                  </TableCell>
                  <TableCell>{formatarData(evento.startDate)}</TableCell>
                  <TableCell>{evento.location || '-'}</TableCell>
                  <TableCell align="center">
                    {evento.currentRegistrations || 0}
                    {evento.maxRegistrations && ` / ${evento.maxRegistrations}`}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={evento.isActive ? 'Ativo' : 'Inativo'}
                      color={evento.isActive ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalhes">
                      <IconButton
                        size="small"
                        onClick={() => history.push(`/app/events/${evento.id}`)}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
       </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}
export default EventsDashboard;
