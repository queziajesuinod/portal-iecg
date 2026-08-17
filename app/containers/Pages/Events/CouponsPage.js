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
  FormHelperText,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Box,
  Typography,
  Alert,
  Divider,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import brand from 'dan-api/dummy/brand';
import { formatDateInAppTimezone } from '../../../utils/dateTime';
import { useConfirm } from '../../../utils/useConfirm';
import { TableSkeleton } from '../../../components/Skeleton';
import {
  listarCupons,
  criarCupom,
  atualizarCupom,
  deletarCupom,
  listarEventos,
  listarLotesPorEvento
} from '../../../api/eventsApi';

const METODOS_LABEL = { pix: 'PIX', credit_card: 'Cartão de Crédito', boleto: 'Boleto' };
const METODOS_OPTIONS = Object.entries(METODOS_LABEL);

function CouponsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [cupons, setCupons] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [cupomEdicao, setCupomEdicao] = useState(null);
  // Setores detectados nos lotes do evento selecionado (para o tipo fixed_price)
  const [setoresEvento, setSetoresEvento] = useState([]);
  const [loadingSetores, setLoadingSetores] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    eventId: '',
    maxUses: '',
    minimumQuantity: '',
    validUntil: '',
    allowedPaymentTypes: [],
    sectorPrices: {},
    isActive: true
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [cuponsRes, eventosRes] = await Promise.all([
        listarCupons(),
        listarEventos()
      ]);
      setCupons(cuponsRes);
      setEventos(eventosRes);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setNotification('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleAbrirDialog = (cupom = null) => {
    if (cupom) {
      setCupomEdicao(cupom);
      // sectorPrices vem como { SETOR: number }; converte para strings para os inputs
      const precosStr = {};
      if (cupom.sectorPrices && typeof cupom.sectorPrices === 'object') {
        Object.entries(cupom.sectorPrices).forEach(([s, p]) => { precosStr[s] = String(p); });
      }
      setFormData({
        code: cupom.code,
        discountType: cupom.discountType,
        discountValue: cupom.discountValue,
        eventId: cupom.eventId || '',
        maxUses: cupom.maxUses || '',
        minimumQuantity: cupom.minimumQuantity ? cupom.minimumQuantity.toString() : '',
        validUntil: cupom.validUntil ? cupom.validUntil.substring(0, 16) : '',
        allowedPaymentTypes: Array.isArray(cupom.allowedPaymentTypes) ? cupom.allowedPaymentTypes : [],
        sectorPrices: precosStr,
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
        minimumQuantity: '',
        validUntil: '',
        allowedPaymentTypes: [],
        sectorPrices: {},
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

  const handleSectorPriceChange = (setor, value) => {
    setFormData(prev => ({
      ...prev,
      sectorPrices: { ...prev.sectorPrices, [setor]: value }
    }));
  };

  // Carrega os setores dos lotes do evento quando o tipo for fixed_price
  useEffect(() => {
    let ativo = true;
    const carregarSetores = async () => {
      if (!dialogAberto || formData.discountType !== 'fixed_price' || !formData.eventId) {
        setSetoresEvento([]);
        return;
      }
      try {
        setLoadingSetores(true);
        const lotes = await listarLotesPorEvento(formData.eventId);
        if (!ativo) return;
        const distintos = [];
        (Array.isArray(lotes) ? lotes : []).forEach((l) => {
          const s = (l.sector || '').toString().toUpperCase().trim();
          if (s && !distintos.includes(s)) distintos.push(s);
        });
        // Evento sem setores nos lotes: usa a chave DEFAULT (preco unico)
        setSetoresEvento(distintos.length ? distintos : ['DEFAULT']);
      } catch (error) {
        if (ativo) setSetoresEvento(['DEFAULT']);
      } finally {
        if (ativo) setLoadingSetores(false);
      }
    };
    carregarSetores();
    return () => { ativo = false; };
  }, [dialogAberto, formData.discountType, formData.eventId]);

  const handleSalvar = async () => {
    const isFixedPrice = formData.discountType === 'fixed_price';

    if (!formData.code) {
      setNotification('Código do cupom é obrigatório');
      return;
    }

    let sectorPricesPayload = null;
    if (isFixedPrice) {
      if (!formData.eventId) {
        setNotification('Cupom de preço fixo exige um evento específico');
        return;
      }
      sectorPricesPayload = {};
      Object.entries(formData.sectorPrices || {}).forEach(([setor, val]) => {
        const num = parseFloat(val);
        if (setor && Number.isFinite(num) && num > 0) {
          sectorPricesPayload[setor.toUpperCase().trim()] = num;
        }
      });
      if (Object.keys(sectorPricesPayload).length === 0) {
        setNotification('Informe ao menos um preço por setor');
        return;
      }
    } else if (!formData.discountValue) {
      setNotification('Código e valor do desconto são obrigatórios');
      return;
    }

    try {
      const dados = {
        ...formData,
        discountValue: isFixedPrice ? 0 : parseFloat(formData.discountValue),
        sectorPrices: isFixedPrice ? sectorPricesPayload : null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses, 10) : null,
        minimumQuantity: formData.minimumQuantity ? parseInt(formData.minimumQuantity, 10) : null,
        eventId: formData.eventId || null,
        allowedPaymentTypes: formData.allowedPaymentTypes.length > 0 ? formData.allowedPaymentTypes : null,
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
      setNotification(error.message || 'Erro ao salvar cupom');
    }
  };

  const handleDeletar = async (id, code) => {
    const ok = await confirm({
      title: 'Deletar cupom', message: `Tem certeza que deseja deletar o cupom "${code}"?`, confirmText: 'Deletar', confirmColor: 'error', severity: 'error'
    });
    if (!ok) return;
    try {
      await deletarCupom(id);
      setNotification('Cupom deletado com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao deletar cupom:', error);
      setNotification(error.message || 'Erro ao deletar cupom');
    }
  };

  const handleAlternarStatus = async (cupom) => {
    const acao = cupom.isActive ? 'inativar' : 'reativar';
    const ok = await confirm({
      title: `${acao.charAt(0).toUpperCase() + acao.slice(1)} cupom`, message: `Tem certeza que deseja ${acao} o cupom "${cupom.code}"?`, confirmText: acao.charAt(0).toUpperCase() + acao.slice(1), confirmColor: 'warning', severity: 'warning'
    });
    if (!ok) return;

    try {
      await atualizarCupom(cupom.id, { isActive: !cupom.isActive });
      setNotification(`Cupom ${cupom.isActive ? 'inativado' : 'reativado'} com sucesso!`);
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar status do cupom:', error);
      setNotification(error.message || 'Erro ao atualizar status do cupom');
    }
  };

  const formatarData = (data) => formatDateInAppTimezone(data, '-');

  const formatarDesconto = (tipo, valor, sectorPrices) => {
    if (tipo === 'fixed_price') {
      const precos = sectorPrices && typeof sectorPrices === 'object' ? sectorPrices : {};
      const entradas = Object.entries(precos);
      if (!entradas.length) return 'Preço fixo';
      return entradas
        .map(([s, p]) => `${s}: R$ ${Number(p).toFixed(2).replace('.', ',')}`)
        .join(' · ');
    }
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
          <TableSkeleton cols={5} showToolbar={false} />
        ) : cupons.length === 0 ? (
          <Typography>Nenhum cupom cadastrado</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Desconto</TableCell>
                <TableCell align="center">Mínimo ingressos</TableCell>
                <TableCell>Evento</TableCell>
                <TableCell>Pagamento</TableCell>
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
                  <TableCell>{formatarDesconto(cupom.discountType, cupom.discountValue, cupom.sectorPrices)}</TableCell>
                  <TableCell align="center">
                    {cupom.minimumQuantity ? cupom.minimumQuantity : '-'}
                  </TableCell>
                  <TableCell>{getNomeEvento(cupom.eventId)}</TableCell>
                  <TableCell>
                    {Array.isArray(cupom.allowedPaymentTypes) && cupom.allowedPaymentTypes.length > 0
                      ? cupom.allowedPaymentTypes.map(t => (
                        <Chip key={t} size="small" label={METODOS_LABEL[t] || t} sx={{ mr: 0.5 }} />
                      ))
                      : <Typography variant="caption" color="text.secondary">Todas</Typography>}
                  </TableCell>
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
                    <Tooltip title={cupom.isActive ? 'Inativar cupom' : 'Reativar cupom'}>
                      <IconButton
                        size="small"
                        onClick={() => handleAlternarStatus(cupom)}
                      >
                        {cupom.isActive ? <BlockIcon /> : <CheckCircleIcon />}
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
                  <MenuItem value="fixed_price">Preço final por setor</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.discountType !== 'fixed_price' && (
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
            )}

            <Grid item xs={12}>
              <FormControl fullWidth required={formData.discountType === 'fixed_price'}>
                <InputLabel>Evento Específico</InputLabel>
                <Select
                  name="eventId"
                  value={formData.eventId}
                  onChange={handleChange}
                >
                  {formData.discountType !== 'fixed_price' && (
                    <MenuItem value="">Global (todos os eventos)</MenuItem>
                  )}
                  {eventos.map(evento => (
                    <MenuItem key={evento.id} value={evento.id}>
                      {evento.title}
                    </MenuItem>
                  ))}
                </Select>
                {formData.discountType === 'fixed_price' && (
                  <FormHelperText>
                    Preço final por setor só vale para um evento específico (os preços não fazem sentido em outro evento)
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>

            {formData.discountType === 'fixed_price' && (
              <Grid item xs={12}>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Preço final por setor
                </Typography>
                {!formData.eventId ? (
                  <Alert severity="info">Selecione um evento para carregar os setores.</Alert>
                ) : loadingSetores ? (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1, py: 1
                  }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">Carregando setores…</Typography>
                  </Box>
                ) : (
                  <>
                    {setoresEvento.length === 1 && setoresEvento[0] === 'DEFAULT' && (
                      <Alert severity="warning" sx={{ mb: 1.5 }}>
                        Este evento não tem setores nos lotes. Será usado um preço único (DEFAULT).
                        Se quiser preço por setor, defina o campo “Setor” em cada lote do evento.
                      </Alert>
                    )}
                    <Grid container spacing={2}>
                      {Array.from(new Set([...setoresEvento, ...Object.keys(formData.sectorPrices || {})])).map((setor) => (
                        <Grid item xs={12} sm={6} key={setor}>
                          <TextField
                            fullWidth
                            type="number"
                            label={setor === 'DEFAULT' ? 'Preço único' : `Setor: ${setor}`}
                            value={formData.sectorPrices[setor] ?? ''}
                            onChange={(e) => handleSectorPriceChange(setor, e.target.value)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">R$</InputAdornment>
                            }}
                            inputProps={{ step: '0.01', min: '0' }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                    <FormHelperText>
                      O cupom crava esse preço final, ignorando o lote vigente. Setor sem preço não é coberto pelo cupom.
                    </FormHelperText>
                  </>
                )}
              </Grid>
            )}

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
                type="number"
                label="Mínimo de ingressos"
                name="minimumQuantity"
                value={formData.minimumQuantity}
                onChange={handleChange}
                helperText="Deixe vazio para não exigir quantidade mínima"
                inputProps={{ min: 1, step: 1 }}
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

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Formas de pagamento permitidas</InputLabel>
                <Select
                  multiple
                  name="allowedPaymentTypes"
                  value={formData.allowedPaymentTypes}
                  onChange={handleChange}
                  input={<OutlinedInput label="Formas de pagamento permitidas" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map(v => (
                        <Chip key={v} size="small" label={METODOS_LABEL[v] || v} />
                      ))}
                    </Box>
                  )}
                >
                  {METODOS_OPTIONS.map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>Deixe vazio para aceitar todas as formas de pagamento</FormHelperText>
              </FormControl>
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
      {ConfirmDialog}
    </div>
  );
}

export default CouponsPage;
