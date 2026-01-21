import React, { useState, useEffect } from 'react';
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
  TextField
} from '@material-ui/core';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  People as PeopleIcon
} from '@material-ui/icons';
import { useHistory, useParams } from 'react-router-dom';
import {
  buscarEvento,
  listarLotesPorEvento,
  criarLote,
  atualizarLote,
  deletarLote,
  listarInscricoesPorEvento
} from '../../../api/eventsApi';
import brand from 'dan-api/dummy/brand';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

function EventDetails() {
  const history = useHistory();
  const { id } = useParams();
  const [tabAtiva, setTabAtiva] = useState(0);
  const [evento, setEvento] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  
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

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [eventoRes, lotesRes, inscricoesRes] = await Promise.all([
        buscarEvento(id),
        listarLotesPorEvento(id),
        listarInscricoesPorEvento(id)
      ]);
      
      setEvento(eventoRes.data);
      setLotes(lotesRes.data);
      setInscricoes(inscricoesRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setNotification('Erro ao carregar dados do evento');
    } finally {
      setLoading(false);
    }
  };

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
        maxQuantity: formLote.maxQuantity ? parseInt(formLote.maxQuantity) : null,
        order: formLote.order ? parseInt(formLote.order) : 0
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
    } catch (error) {
      console.error('Erro ao salvar lote:', error);
      setNotification(error.response?.data?.message || 'Erro ao salvar lote');
    }
  };

  const handleDeletarLote = async (loteId, nome) => {
    if (window.confirm(`Tem certeza que deseja deletar o lote "${nome}"?`)) {
      try {
        await deletarLote(loteId);
        setNotification('Lote deletado com sucesso!');
        carregarDados();
      } catch (error) {
        console.error('Erro ao deletar lote:', error);
        setNotification(error.response?.data?.message || 'Erro ao deletar lote');
      }
    }
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
    return `R$ ${parseFloat(preco).toFixed(2).replace('.', ',')}`;
  };

  if (loading) {
    return <Typography>Carregando...</Typography>;
  }

  if (!evento) {
    return <Typography>Evento não encontrado</Typography>;
  }

  const title = brand.name + ' - ' + evento.title;

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
              <strong>Local:</strong> {evento.location || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Inscrições:</strong> {evento.currentRegistrations || 0}
              {evento.maxRegistrations && ` / ${evento.maxRegistrations}`}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Chip
              label={evento.isActive ? 'Ativo' : 'Inativo'}
              color={evento.isActive ? 'primary' : 'default'}
            />
          </Grid>
        </Grid>

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
                      <Tooltip title="Deletar">
                        <IconButton
                          size="small"
                          onClick={() => handleDeletarLote(lote.id, lote.name)}
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
        </TabPanel>

        {/* Tab Inscrições */}
        <TabPanel value={tabAtiva} index={1}>
          {inscricoes.length === 0 ? (
            <Typography>Nenhuma inscrição realizada</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell>Quantidade</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell align="center">Status</TableCell>
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
                  <TableCell>{inscricao.batch?.name || '-'}</TableCell>
                  <TableCell>{inscricao.quantity}</TableCell>
                  <TableCell>{formatarPreco(inscricao.finalPrice)}</TableCell>
                  <TableCell>{formatarDataHora(inscricao.createdAt)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={inscricao.paymentStatus}
                      color={inscricao.paymentStatus === 'confirmed' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
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
      </Card>

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
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

export default EventDetails;
