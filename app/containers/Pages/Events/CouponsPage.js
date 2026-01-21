import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Button,
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
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@material-ui/icons';
import {
  listarCupons,
  criarCupom,
  atualizarCupom,
  deletarCupom,
  listarEventos
} from '../../../api/eventsApi';
import brand from 'dan-api/dummy/brand';

function CouponsPage() {
  const [cupons, setCupons] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [cupomEdicao, setCupomEdicao] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    eventId: '',
    maxUses: '',
    validUntil: '',
    isActive: true
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [cuponsRes, eventosRes] = await Promise.all([
        listarCupons(),
        listarEventos()
      ]);
      setCupons(cuponsRes.data);
      setEventos(eventosRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setNotification('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirDialog = (cupom = null) => {
    if (cupom) {
      setCupomEdicao(cupom);
      setFormData({
        code: cupom.code,
        discountType: cupom.discountType,
        discountValue: cupom.discountValue,
        eventId: cupom.eventId || '',
        maxUses: cupom.maxUses || '',
        validUntil: cupom.validUntil ? cupom.validUntil.substring(0, 16) : '',
        isActive: cupom.isActive
      });
    } else {
      setCupomEdicao(null);
      setFormData({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        eventId: '',
        maxUses: '',
        validUntil: '',
        isActive: true
      });
    }
    setDialogAberto(true);
  };

  const handleFecharDialog = () => {
    setDialogAberto(false);
    setCupomEdicao(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSalvar = async () => {
    if (!formData.code || !formData.discountValue) {
      setNotification('Código e valor do desconto são obrigatórios');
      return;
    }

    try {
      const dados = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        eventId: formData.eventId || null
      };

      if (cupomEdicao) {
        await atualizarCupom(cupomEdicao.id, dados);
        setNotification('Cupom atualizado com sucesso!');
      } else {
        await criarCupom(dados);
        setNotification('Cupom criado com sucesso!');
      }

      handleFecharDialog();
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar cupom:', error);
      setNotification(error.response?.data?.message || 'Erro ao salvar cupom');
    }
  };

  const handleDeletar = async (id, code) => {
    if (window.confirm(`Tem certeza que deseja deletar o cupom "${code}"?`)) {
      try {
        await deletarCupom(id);
        setNotification('Cupom deletado com sucesso!');
        carregarDados();
      } catch (error) {
        console.error('Erro ao deletar cupom:', error);
        setNotification(error.response?.data?.message || 'Erro ao deletar cupom');
      }
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarDesconto = (tipo, valor) => {
    if (tipo === 'percentage') {
      return `${valor}%`;
    }
    return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
  };

  const getNomeEvento = (eventId) => {
    if (!eventId) return 'Global';
    const evento = eventos.find(e => e.id === eventId);
    return evento ? evento.title : '-';
  };

  const title = brand.name + ' - Cupons de Desconto';

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <PapperBlock
        title="Cupons de Desconto"
        icon="ion-ios-pricetag-outline"
        desc="Gerenciar cupons promocionais"
        overflowX
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleAbrirDialog()}
          >
            Novo Cupom
          </Button>
        </div>

        {loading ? (
          <Typography>Carregando...</Typography>
        ) : cupons.length === 0 ? (
          <Typography>Nenhum cupom cadastrado</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Desconto</TableCell>
                <TableCell>Evento</TableCell>
                <TableCell align="center">Usos</TableCell>
                <TableCell>Validade</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cupons.map((cupom) => (
                <TableRow key={cupom.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{cupom.code}</Typography>
                  </TableCell>
                  <TableCell>{formatarDesconto(cupom.discountType, cupom.discountValue)}</TableCell>
                  <TableCell>{getNomeEvento(cupom.eventId)}</TableCell>
                  <TableCell align="center">
                    {cupom.currentUses || 0}
                    {cupom.maxUses && ` / ${cupom.maxUses}`}
                  </TableCell>
                  <TableCell>{formatarData(cupom.validUntil)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={cupom.isActive ? 'Ativo' : 'Inativo'}
                      color={cupom.isActive ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => handleAbrirDialog(cupom)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Deletar">
                      <IconButton
                        size="small"
                        onClick={() => handleDeletar(cupom.id, cupom.code)}
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

      {/* Dialog de Cupom */}
      <Dialog open={dialogAberto} onClose={handleFecharDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{cupomEdicao ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: 8 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Código do Cupom"
                name="code"
                value={formData.code}
                onChange={handleChange}
                helperText="Código que o usuário digitará (ex: PROMO2026)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Desconto</InputLabel>
                <Select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleChange}
                >
                  <MenuItem value="percentage">Porcentagem (%)</MenuItem>
                  <MenuItem value="fixed">Valor Fixo (R$)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label={formData.discountType === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
                name="discountValue"
                value={formData.discountValue}
                onChange={handleChange}
                inputProps={{
                  step: formData.discountType === 'percentage' ? '1' : '0.01',
                  min: '0',
                  max: formData.discountType === 'percentage' ? '100' : undefined
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Evento Específico</InputLabel>
                <Select
                  name="eventId"
                  value={formData.eventId}
                  onChange={handleChange}
                >
                  <MenuItem value="">Global (todos os eventos)</MenuItem>
                  {eventos.map(evento => (
                    <MenuItem key={evento.id} value={evento.id}>
                      {evento.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Máximo de Usos"
                name="maxUses"
                value={formData.maxUses}
                onChange={handleChange}
                helperText="Deixe vazio para ilimitado"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Válido Até"
                name="validUntil"
                value={formData.validUntil}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialog}>Cancelar</Button>
          <Button onClick={handleSalvar} color="primary" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

export default CouponsPage;
