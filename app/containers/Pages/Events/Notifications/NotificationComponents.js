// Este arquivo contém os componentes auxiliares de notificações
// Separe em arquivos individuais conforme necessário

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Typography,
  Box,
  Grid,
  CircularProgress
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon
} from '@material-ui/icons';
import {
  listarGrupos,
  listarTemplates,
  listarNotificacoes,
  obterEstatisticasNotificacoes
} from '../../../../api/notificationsApi';

// ========== GRUPOS ==========
export function NotificationGroups({ eventId }) {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarGrupos();
  }, [eventId]);

  const carregarGrupos = async () => {
    try {
      setLoading(true);
      const data = await listarGrupos(eventId);
      setGrupos(data);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
        >
          Novo Grupo
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Membros</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grupos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">
                      {loading ? 'Carregando...' : 'Nenhum grupo cadastrado'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                grupos.map((grupo) => (
                  <TableRow key={grupo.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <GroupIcon style={{ marginRight: 8, opacity: 0.5 }} />
                        {grupo.name}
                      </Box>
                    </TableCell>
                    <TableCell>{grupo.description || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${grupo.members?.length || 0} membros`}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={grupo.isActive ? 'Ativo' : 'Inativo'}
                        size="small"
                        color={grupo.isActive ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ========== TEMPLATES ==========
export function NotificationTemplates({ eventId }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarTemplates();
  }, [eventId]);

  const carregarTemplates = async () => {
    try {
      setLoading(true);
      const data = await listarTemplates(eventId);
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      confirmation: 'Confirmação',
      reminder: 'Lembrete',
      checkin: 'Check-in',
      custom: 'Personalizado'
    };
    return labels[tipo] || tipo;
  };

  return (
    <>
      <Box mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
        >
          Novo Template
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Canal</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">
                      {loading ? 'Carregando...' : 'Nenhum template cadastrado'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={getTipoLabel(template.type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.channel.toUpperCase()}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.isActive ? 'Ativo' : 'Inativo'}
                        size="small"
                        color={template.isActive ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ========== HISTÓRICO ==========
export function NotificationHistory({ eventId }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarNotificacoes();
  }, [eventId]);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const data = await listarNotificacoes(eventId, { limit: 50 });
      setNotificacoes(data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      sent: 'primary',
      delivered: 'secondary',
      read: 'primary',
      failed: 'secondary'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      sent: 'Enviado',
      delivered: 'Entregue',
      read: 'Lido',
      failed: 'Falhou'
    };
    return labels[status] || status;
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Histórico de Notificações ({notificacoes.length})
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Destinatário</TableCell>
              <TableCell>Canal</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Mensagem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notificacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="textSecondary">
                    {loading ? 'Carregando...' : 'Nenhuma notificação enviada'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              notificacoes.map((notificacao) => (
                <TableRow key={notificacao.id}>
                  <TableCell>{formatarData(notificacao.createdAt)}</TableCell>
                  <TableCell>{notificacao.recipient}</TableCell>
                  <TableCell>
                    <Chip
                      label={notificacao.channel.toUpperCase()}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(notificacao.status)}
                      size="small"
                      color={getStatusColor(notificacao.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" style={{ maxWidth: 200, display: 'block' }}>
                      {notificacao.message.substring(0, 50)}...
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ========== ESTATÍSTICAS ==========
export function NotificationStats({ eventId, compact = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEstatisticas();
  }, [eventId]);

  const carregarEstatisticas = async () => {
    try {
      setLoading(true);
      const data = await obterEstatisticasNotificacoes(eventId);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Typography color="textSecondary" align="center">
        Nenhuma estatística disponível
      </Typography>
    );
  }

  const StatCard = ({ title, value, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Typography variant="body2" color="textSecondary">
          {title}
        </Typography>
        <Typography variant="h4" style={{ fontWeight: 'bold', color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  if (compact) {
    return (
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <StatCard title="Total Enviado" value={stats.total} color="#4caf50" />
        </Grid>
        {stats.porCanal?.map((item, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <StatCard
              title={item.channel.toUpperCase()}
              value={item.total}
              color="#2196f3"
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={4}>
        <StatCard title="Total de Notificações" value={stats.total} color="#4caf50" />
      </Grid>

      {stats.porStatus?.map((item, index) => (
        <Grid item xs={12} sm={4} key={index}>
          <StatCard
            title={item.status.toUpperCase()}
            value={item.total}
            color="#2196f3"
          />
        </Grid>
      ))}

      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom style={{ marginTop: 16 }}>
          Por Canal
        </Typography>
      </Grid>

      {stats.porCanal?.map((item, index) => (
        <Grid item xs={12} sm={4} key={index}>
          <StatCard
            title={item.channel.toUpperCase()}
            value={item.total}
            color="#ff9800"
          />
        </Grid>
      ))}
    </Grid>
  );
}
