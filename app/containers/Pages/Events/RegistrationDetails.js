import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@material-ui/core';
import {
  ArrowBack as BackIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon
} from '@material-ui/icons';
import { useHistory, useParams } from 'react-router-dom';
import { buscarInscricao, cancelarInscricao } from '../../../api/eventsApi';
import brand from 'dan-api/dummy/brand';

function RegistrationDetails() {
  const history = useHistory();
  const { id } = useParams();
  const [inscricao, setInscricao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(\'\');
  const [dialogCancelar, setDialogCancelar] = useState(false);

  useEffect(() => {
    carregarInscricao();
  }, [id]);

  const carregarInscricao = async () => {
    try {
      setLoading(true);
      const response = await buscarInscricao(id);
      setInscricao(response.data);
    } catch (error) {
      console.error('Erro ao carregar inscrição:', error);
      setNotification('Erro ao carregar inscrição');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    try {
      await cancelarInscricao(id);
      setNotification('Inscrição cancelada com sucesso!');
      setDialogCancelar(false);
      carregarInscricao();
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      setNotification(error.response?.data?.message || 'Erro ao cancelar inscrição');
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-BR');
  };

  const formatarPreco = (preco) => {
    return `R$ ${parseFloat(preco).toFixed(2).replace('.', ',')}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      confirmed: 'primary',
      cancelled: 'secondary',
      refunded: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <Typography>Carregando...</Typography>;
  }

  if (!inscricao) {
    return <Typography>Inscrição não encontrada</Typography>;
  }

  const title = brand.name + ' - Detalhes da Inscrição';

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <PapperBlock
        title={`Inscrição ${inscricao.orderCode}`}
        icon="ion-ios-document-outline"
        desc="Detalhes completos da inscrição"
      >
        <Grid container spacing={3}>
          {/* Informações Gerais */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informações Gerais
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Código do Pedido:</strong>
                    </Typography>
                    <Typography variant="body1">{inscricao.orderCode}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Status:</strong>
                    </Typography>
                    <Chip
                      label={getStatusLabel(inscricao.paymentStatus)}
                      color={getStatusColor(inscricao.paymentStatus)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Evento:</strong>
                    </Typography>
                    <Typography variant="body1">{inscricao.event?.title || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Lote:</strong>
                    </Typography>
                    <Typography variant="body1">{inscricao.batch?.name || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Quantidade:</strong>
                    </Typography>
                    <Typography variant="body1">{inscricao.quantity} inscrito(s)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Data da Inscrição:</strong>
                    </Typography>
                    <Typography variant="body1">{formatarData(inscricao.createdAt)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Dados do Comprador */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dados do Comprador
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                {inscricao.buyerData ? (
                  <Table size="small">
                    <TableBody>
                      {Object.entries(inscricao.buyerData).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell>
                            <strong>{key}:</strong>
                          </TableCell>
                          <TableCell>{value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum dado registrado
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Informações de Pagamento */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informações de Pagamento
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Valor do Lote:</strong></TableCell>
                      <TableCell>{formatarPreco(inscricao.batchPrice)}</TableCell>
                    </TableRow>
                    {inscricao.couponCode && (
                      <>
                        <TableRow>
                          <TableCell><strong>Cupom:</strong></TableCell>
                          <TableCell>{inscricao.couponCode}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>Desconto:</strong></TableCell>
                          <TableCell>- {formatarPreco(inscricao.discountAmount || 0)}</TableCell>
                        </TableRow>
                      </>
                    )}
                    <TableRow>
                      <TableCell><strong>Valor Final:</strong></TableCell>
                      <TableCell>
                        <Typography variant="h6" color="primary">
                          {formatarPreco(inscricao.finalPrice)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Método:</strong></TableCell>
                      <TableCell>{inscricao.paymentMethod || 'Cartão de Crédito'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Dados dos Inscritos */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dados dos Inscritos ({inscricao.attendees?.length || 0})
                </Typography>
                <Divider style={{ marginBottom: 16 }} />
                {inscricao.attendees && inscricao.attendees.length > 0 ? (
                  <Grid container spacing={2}>
                    {inscricao.attendees.map((attendee, index) => (
                      <Grid item xs={12} md={6} key={attendee.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              Inscrito #{attendee.attendeeNumber}
                            </Typography>
                            <Divider style={{ marginBottom: 8 }} />
                            <Table size="small">
                              <TableBody>
                                {Object.entries(attendee.attendeeData || {}).map(([key, value]) => (
                                  <TableRow key={key}>
                                    <TableCell>
                                      <strong>{key}:</strong>
                                    </TableCell>
                                    <TableCell>{value}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum inscrito registrado
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Histórico de Transações */}
          {inscricao.transactions && inscricao.transactions.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <ReceiptIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Histórico de Transações
                  </Typography>
                  <Divider style={{ marginBottom: 16 }} />
                  <Table>
                    <TableBody>
                      {inscricao.transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Typography variant="body2">
                              <strong>{transaction.transactionType}</strong>
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formatarData(transaction.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={transaction.status}
                              size="small"
                              color={transaction.status === 'success' ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatarPreco(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Botões de Ação */}
          <Grid item xs={12}>
            <div style={{ display: 'flex', gap: 16 }}>
              <Button
                variant="outlined"
                startIcon={<BackIcon />}
                onClick={() => history.goBack()}
              >
                Voltar
              </Button>
              {inscricao.paymentStatus === 'confirmed' && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<CancelIcon />}
                  onClick={() => setDialogCancelar(true)}
                >
                  Cancelar Inscrição
                </Button>
              )}
            </div>
          </Grid>
        </Grid>
      </PapperBlock>

      {/* Dialog de Confirmação de Cancelamento */}
      <Dialog open={dialogCancelar} onClose={() => setDialogCancelar(false)}>
        <DialogTitle>Cancelar Inscrição</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja cancelar esta inscrição?
            Esta ação irá processar o reembolso do pagamento.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogCancelar(false)}>
            Não, manter inscrição
          </Button>
          <Button onClick={handleCancelar} color="secondary" variant="contained">
            Sim, cancelar
          </Button>
        </DialogActions>
      </Dialog>
      <Notification message={notification} close={() => setNotification(\'\')} />
    </div>
  );
}

export default RegistrationDetails;
