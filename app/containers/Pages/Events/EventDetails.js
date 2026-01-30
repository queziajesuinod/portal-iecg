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
  TextField
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
  deletarFormaPagamento
} from '../../../api/eventsApi';
import { EVENT_TYPE_LABELS } from '../../../constants/eventTypes';

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
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

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
      const [eventoRes, lotesRes, inscricoesRes, formasPagamentoRes] = await Promise.all([
        buscarEvento(id),
        listarLotesPorEvento(id),
        listarInscricoesPorEvento(id),
        listarFormasPagamento(id)
      ]);

      setEvento(eventoRes);
      setLotes(lotesRes);
      setInscricoes(inscricoesRes);
      setFormasPagamento(formasPagamentoRes);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setNotification('Erro ao carregar dados do evento');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, [id]);

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
      boleto: 'Boleto'
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
          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary">
              <strong>Endereco:</strong> {evento.location || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Numero:</strong> {evento.addressNumber || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Bairro:</strong> {evento.neighborhood || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Cidade:</strong> {evento.city || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>CEP:</strong> {evento.cep || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Tipo de Evento:</strong> {EVENT_TYPE_LABELS[evento.eventType] || evento.eventType || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Latitude:</strong> {evento.latitude != null ? evento.latitude : '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Longitude:</strong> {evento.longitude != null ? evento.longitude : '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Inscricoes:</strong> {evento.currentRegistrations || 0}
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
