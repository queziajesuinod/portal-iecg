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
  TrendingUp as TrendingIcon,
  FileCopy as DuplicateIcon
} from '@material-ui/icons';
import { useHistory } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import {
  listarEventos,
  listarEstatisticas,
  deletarEvento,
  duplicarEvento,
  atualizarEvento
} from '../../../api/eventsApi';
import { EVENT_TYPE_LABELS } from '../../../constants/eventTypes';

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
                <TableCell>Tipo</TableCell>
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
                    color={evento.isActive ? 'primary' : 'default'}
                    onClick={() => handleToggleStatus(evento)}
                  >
                    {evento.isActive ? 'Ativo' : 'Inativo'}
                  </Button>
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
