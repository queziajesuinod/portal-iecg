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
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon
} from '@material-ui/icons';
import {
  listarEstacoes,
  criarEstacao,
  atualizarEstacao,
  deletarEstacao
} from '../../../../api/checkInApi';

function CheckInStations({ eventId }) {
  const [estacoes, setEstacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [estacaoEditando, setEstacaoEditando] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nfcTagId: '',
    latitude: '',
    longitude: '',
    isActive: true
  });

  useEffect(() => {
    carregarEstacoes();
  }, [eventId]);

  const carregarEstacoes = async () => {
    try {
      setLoading(true);
      const data = await listarEstacoes(eventId);
      setEstacoes(data);
    } catch (error) {
      console.error('Erro ao carregar estações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirDialog = (estacao = null) => {
    if (estacao) {
      setEstacaoEditando(estacao);
      setFormData({
        name: estacao.name,
        nfcTagId: estacao.nfcTagId || '',
        latitude: estacao.latitude || '',
        longitude: estacao.longitude || '',
        isActive: estacao.isActive
      });
    } else {
      setEstacaoEditando(null);
      setFormData({
        name: '',
        nfcTagId: '',
        latitude: '',
        longitude: '',
        isActive: true
      });
    }
    setDialogAberto(true);
  };

  const handleFecharDialog = () => {
    setDialogAberto(false);
    setEstacaoEditando(null);
  };

  const handleSalvar = async () => {
    try {
      setLoading(true);

      const dados = {
        ...formData,
        eventId,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      };

      if (estacaoEditando) {
        await atualizarEstacao(estacaoEditando.id, dados);
      } else {
        await criarEstacao(dados);
      }

      await carregarEstacoes();
      handleFecharDialog();
    } catch (error) {
      console.error('Erro ao salvar estação:', error);
      alert(error.response?.data?.erro || 'Erro ao salvar estação');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletar = async (id) => {
    if (!confirm('Deseja realmente deletar esta estação?')) {
      return;
    }

    try {
      setLoading(true);
      await deletarEstacao(id);
      await carregarEstacoes();
    } catch (error) {
      console.error('Erro ao deletar estação:', error);
      alert(error.response?.data?.erro || 'Erro ao deletar estação');
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
          onClick={() => handleAbrirDialog()}
        >
          Nova Estação
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Tag NFC</TableCell>
                <TableCell>Coordenadas</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {estacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">
                      Nenhuma estação cadastrada
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                estacoes.map((estacao) => (
                  <TableRow key={estacao.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <LocationIcon style={{ marginRight: 8, opacity: 0.5 }} />
                        {estacao.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {estacao.nfcTagId ? (
                        <Chip label={estacao.nfcTagId} size="small" variant="outlined" />
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          Sem NFC
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {estacao.latitude && estacao.longitude ? (
                        <Typography variant="caption">
                          {estacao.latitude}, {estacao.longitude}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          Não definido
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={estacao.isActive ? 'Ativa' : 'Inativa'}
                        color={estacao.isActive ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleAbrirDialog(estacao)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletar(estacao.id)}
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
          {estacaoEditando ? 'Editar Estação' : 'Nova Estação'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Estação"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Entrada Principal"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ID da Tag NFC (opcional)"
                value={formData.nfcTagId}
                onChange={(e) => setFormData({ ...formData, nfcTagId: e.target.value })}
                placeholder="Ex: NFC-001"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Latitude (opcional)"
                type="number"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="-20.4697"
                inputProps={{ step: 'any' }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Longitude (opcional)"
                type="number"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="-54.6201"
                inputProps={{ step: 'any' }}
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
            disabled={loading || !formData.name}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CheckInStations;
