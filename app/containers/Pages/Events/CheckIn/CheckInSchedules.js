import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Typography,
  Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ScheduleIcon from '@mui/icons-material/Schedule';
import {
  listarAgendamentos,
  criarAgendamento,
  atualizarAgendamento,
  deletarAgendamento
} from '../../../../api/checkInApi';

function CheckInSchedules({ eventId }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    isActive: true
  });

  useEffect(() => {
    carregarAgendamentos();
  }, [eventId]);

  const carregarAgendamentos = async () => {
    try {
      setLoading(true);
      const data = await listarAgendamentos(eventId);
      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirDialog = (agendamento = null) => {
    if (agendamento) {
      setAgendamentoEditando(agendamento);
      setFormData({
        name: agendamento.name,
        startTime: new Date(agendamento.startTime).toISOString().slice(0, 16),
        endTime: new Date(agendamento.endTime).toISOString().slice(0, 16),
        isActive: agendamento.isActive
      });
    } else {
      setAgendamentoEditando(null);
      setFormData({
        name: '',
        startTime: '',
        endTime: '',
        isActive: true
      });
    }
    setDialogAberto(true);
  };

  const handleFecharDialog = () => {
    setDialogAberto(false);
    setAgendamentoEditando(null);
  };

  const handleSalvar = async () => {
    try {
      setLoading(true);

      const dados = {
        ...formData,
        eventId
      };

      if (agendamentoEditando) {
        await atualizarAgendamento(agendamentoEditando.id, dados);
      } else {
        await criarAgendamento(dados);
      }

      await carregarAgendamentos();
      handleFecharDialog();
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      alert(error.response?.data?.erro || 'Erro ao salvar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletar = async (id) => {
    if (!confirm('Deseja realmente deletar este agendamento?')) {
      return;
    }

    try {
      setLoading(true);
      await deletarAgendamento(id);
      await carregarAgendamentos();
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
      alert(error.response?.data?.erro || 'Erro ao deletar agendamento');
    } finally {
      setLoading(false);
    }
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
    <>
      <Box mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleAbrirDialog()}
        >
          Novo Agendamento
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Início</TableCell>
                <TableCell>Fim</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agendamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">
                      Nenhum agendamento cadastrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                agendamentos.map((agendamento) => (
                  <TableRow key={agendamento.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <ScheduleIcon style={{ marginRight: 8, opacity: 0.5 }} />
                        {agendamento.name}
                      </Box>
                    </TableCell>
                    <TableCell>{formatarData(agendamento.startTime)}</TableCell>
                    <TableCell>{formatarData(agendamento.endTime)}</TableCell>
                    <TableCell>
                      <Chip
                        label={agendamento.isActive ? 'Ativo' : 'Inativo'}
                        color={agendamento.isActive ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleAbrirDialog(agendamento)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletar(agendamento.id)}
                      >
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

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogAberto} onClose={handleFecharDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {agendamentoEditando ? 'Editar Agendamento' : 'Novo Agendamento'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Agendamento"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Credenciamento Manhã"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data/Hora de Início"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data/Hora de Fim"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialog}>Cancelar</Button>
          <Button
            onClick={handleSalvar}
            color="primary"
            variant="contained"
            disabled={loading || !formData.name || !formData.startTime || !formData.endTime}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CheckInSchedules;
