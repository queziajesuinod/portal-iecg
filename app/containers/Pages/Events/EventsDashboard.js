import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';
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
  Tooltip
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEventos: 0,
    eventosAtivos: 0,
    totalInscricoes: 0,
    receitaTotal: 0
  });

  useEffect(() => {
    carregarEventos();
  }, []);

  const carregarEventos = async () => {
    try {
      setLoading(true);
      const response = await listarEventos();
      const eventosData = response.data;
      setEventos(eventosData);

      // Calcular estatísticas
      const totalEventos = eventosData.length;
      const eventosAtivos = eventosData.filter(e => e.isActive).length;
      const totalInscricoes = eventosData.reduce((sum, e) => sum + (e.currentRegistrations || 0), 0);
      
      setStats({
        totalEventos,
        eventosAtivos,
        totalInscricoes,
        receitaTotal: 0 // Calcular depois com dados reais
      });
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      alert('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletar = async (id, titulo) => {
    if (window.confirm(`Tem certeza que deseja deletar o evento "${titulo}"?`)) {
      try {
        await deletarEvento(id);
        alert('Evento deletado com sucesso!');
        carregarEventos();
      } catch (error) {
        console.error('Erro ao deletar evento:', error);
        alert(error.response?.data?.message || 'Erro ao deletar evento');
      }
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const title = brand.name + ' - Gerenciamento de Eventos';
  const description = 'Dashboard de eventos e inscrições';

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography color="textSecondary" gutterBottom>
                    Total de Eventos
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalEventos}
                  </Typography>
                </div>
                <EventIcon style={{ fontSize: 48, color: '#3f51b5' }} />
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography color="textSecondary" gutterBottom>
                    Eventos Ativos
                  </Typography>
                  <Typography variant="h4">
                    {stats.eventosAtivos}
                  </Typography>
                </div>
                <TrendingIcon style={{ fontSize: 48, color: '#4caf50' }} />
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography color="textSecondary" gutterBottom>
                    Total de Inscrições
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalInscricoes}
                  </Typography>
                </div>
                <PeopleIcon style={{ fontSize: 48, color: '#ff9800' }} />
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography color="textSecondary" gutterBottom>
                    Receita Total
                  </Typography>
                  <Typography variant="h4">
                    R$ {stats.receitaTotal.toLocaleString('pt-BR')}
                  </Typography>
                </div>
                <MoneyIcon style={{ fontSize: 48, color: '#f44336' }} />
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Eventos */}
      <PapperBlock
        title="Eventos"
        icon="ion-ios-calendar-outline"
        desc="Gerenciar eventos, lotes e inscrições"
        overflowX
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => history.push('/app/events/novo')}
          >
            Novo Evento
          </Button>
        </div>

        {loading ? (
          <Typography>Carregando...</Typography>
        ) : eventos.length === 0 ? (
          <Typography>Nenhum evento cadastrado</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Data Início</TableCell>
                <TableCell>Data Fim</TableCell>
                <TableCell>Local</TableCell>
                <TableCell align="center">Inscrições</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventos.map((evento) => (
                <TableRow key={evento.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{evento.title}</Typography>
                  </TableCell>
                  <TableCell>{formatarData(evento.startDate)}</TableCell>
                  <TableCell>{formatarData(evento.endDate)}</TableCell>
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
    </div>
  );
}

export default EventsDashboard;
