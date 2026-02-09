import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Box,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import BackIcon from '@mui/icons-material/ArrowBack';
import { useHistory, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { criarEvento, atualizarEvento, buscarEvento } from '../../../api/eventsApi';
import { fetchGeocode } from '../../../utils/googleGeocode';
import { EVENT_TYPE_OPTIONS } from '../../../constants/eventTypes';
import useTheme from '@mui/material/styles/useTheme';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const toDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = (err) => reject(err);
  reader.readAsDataURL(file);
});

function EventForm() {
  const history = useHistory();
  const { id } = useParams();
  const isEdicao = !!id;

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    imageUrl: '',
    maxRegistrations: '',
    maxPerBuyer: '',
    isActive: true,
    addressNumber: '',
    neighborhood: '',
    city: '',
    cep: '',
    latitude: '',
    longitude: '',
    eventType: 'ACAMP',
    registrationPaymentMode: 'SINGLE',
    minDepositAmount: '',
    maxPaymentCount: ''
  });

  useEffect(() => {
    if (formData.imageUrl) {
      setCoverPreview(formData.imageUrl);
    } else {
      setCoverPreview('');
    }
  }, [formData.imageUrl]);

  async function carregarEvento() {
    try {
      setLoading(true);
      const evento = await buscarEvento(id);

      setFormData({
        title: evento.title || '',
        description: evento.description || '',
        startDate: evento.startDate ? evento.startDate.substring(0, 16) : '',
        endDate: evento.endDate ? evento.endDate.substring(0, 16) : '',
        location: evento.location || '',
        imageUrl: evento.imageUrl || '',
        maxRegistrations: evento.maxRegistrations || '',
        maxPerBuyer: evento.maxPerBuyer || '',
        isActive: evento.isActive,
        addressNumber: evento.addressNumber || '',
        neighborhood: evento.neighborhood || '',
        city: evento.city || '',
        cep: evento.cep || '',
        latitude: evento.latitude != null ? evento.latitude.toString() : '',
        longitude: evento.longitude != null ? evento.longitude.toString() : '',
        eventType: evento.eventType || 'ACAMP',
        registrationPaymentMode: evento.registrationPaymentMode || 'SINGLE',
        minDepositAmount: evento.minDepositAmount != null ? evento.minDepositAmount.toString() : '',
        maxPaymentCount: evento.maxPaymentCount != null ? evento.maxPaymentCount.toString() : ''
      });
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      setNotification('Erro ao carregar evento');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isEdicao) {
      carregarEvento();
    }
  }, [id]);

  const handleChange = (e) => {
    const {
      name, value, checked, type
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCoverFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      setNotification('Imagem ultrapassa o limite de 10MB.');
      return;
    }
    try {
      const base64 = await toDataUrl(file);
      setCoverPreview(base64);
      setFormData(prev => ({ ...prev, imageUrl: base64 }));
    } catch (error) {
      console.error('Erro ao ler imagem:', error);
      setNotification('Não foi possível ler a imagem selecionada.');
    }
  };

  const handleBuscarCoordenadas = async () => {
    const queryParts = [
      formData.location,
      formData.addressNumber,
      formData.city,
      formData.cep
    ].filter(Boolean);

    if (!queryParts.length) {
      setNotification('Informe ao menos um campo do endereco para buscar coordenadas');
      return;
    }

    try {
      setGeoLoading(true);
      const resultado = await fetchGeocode(queryParts.join(', '));
      if (!resultado) {
        setNotification('Nao foi possivel localizar o endereco informado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        location: resultado.logradouro
          ? `${resultado.logradouro}${resultado.numeroEncontrado ? `, ${resultado.numeroEncontrado}` : ''}`
          : prev.location,
        addressNumber: resultado.numeroEncontrado || prev.addressNumber,
        neighborhood: resultado.bairro || prev.neighborhood,
        city: resultado.cidade || prev.city,
        cep: resultado.cepEncontrado || prev.cep,
        latitude: resultado.lat != null ? resultado.lat.toString() : prev.latitude,
        longitude: resultado.lon != null ? resultado.lon.toString() : prev.longitude
      }));
      setNotification('Coordenadas atualizadas via Google Maps');
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      setNotification(error.message || 'Erro ao buscar coordenadas');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      setNotification('Título é obrigatório');
      return;
    }

    try {
      setLoading(true);

      const dados = {
        ...formData,
        maxRegistrations: formData.maxRegistrations ? parseInt(formData.maxRegistrations, 10) : null,
        maxPerBuyer: formData.maxPerBuyer ? parseInt(formData.maxPerBuyer, 10) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        registrationPaymentMode: formData.registrationPaymentMode || 'SINGLE',
        minDepositAmount: formData.minDepositAmount ? parseFloat(formData.minDepositAmount) : null,
        maxPaymentCount: formData.maxPaymentCount ? parseInt(formData.maxPaymentCount, 10) : null,
      };

      if (isEdicao) {
        await atualizarEvento(id, dados);
        setNotification('Evento atualizado com sucesso!');
      } else {
        await criarEvento(dados);
        setNotification('Evento criado com sucesso!');
      }

      history.push('/app/events');
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      setNotification(error.message || 'Erro ao salvar evento');
    } finally {
      setLoading(false);
    }
  };

  const theme = useTheme();
  const title = brand.name + ` - ${isEdicao ? 'Editar' : 'Novo'} Evento`;

  return (
    <div>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <PapperBlock
        title={isEdicao ? 'Editar Evento' : 'Novo Evento'}
        icon="ion-ios-calendar-outline"
        desc="Preencha os dados do evento"
      >
        <Box display="flex" flexDirection="column" gap={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Informações principais
                    </Typography>
                    <Box
                      component="div"
                      sx={{
                        background: theme.palette.background.paper,
                        borderRadius: 2,
                        p: 2,
                        boxShadow: theme.shadows[2],
                      }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            required
                            label="Título do Evento"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            disabled={loading}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="Descrição"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={loading}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            type="datetime-local"
                            label="Data e Hora de Início"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            type="datetime-local"
                            label="Data e Hora de Término"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleChange}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth disabled={loading}>
                            <InputLabel id="tipo-evento-label">Tipo de Evento</InputLabel>
                            <Select
                              labelId="tipo-evento-label"
                              label="Tipo de Evento"
                              name="eventType"
                              value={formData.eventType}
                              onChange={handleChange}
                            >
                              {EVENT_TYPE_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth disabled={loading}>
                            <InputLabel id="modo-pagamento-label">Modo de Pagamento</InputLabel>
                            <Select
                              labelId="modo-pagamento-label"
                              label="Modo de Pagamento"
                              name="registrationPaymentMode"
                              value={formData.registrationPaymentMode}
                              onChange={handleChange}
                            >
                              <MenuItem value="SINGLE">Pagamento único</MenuItem>
                              <MenuItem value="BALANCE_DUE">Pagamento parcial (sinal)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                  {formData.registrationPaymentMode === 'BALANCE_DUE' && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Condições de parcela
                      </Typography>
                      <Box
                        component="div"
                        sx={{
                          background: theme.palette.background.paper,
                          borderRadius: 2,
                          p: 2,
                          boxShadow: theme.shadows[1],
                        }}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Valor mínimo de sinal"
                              name="minDepositAmount"
                              value={formData.minDepositAmount}
                              onChange={handleChange}
                              disabled={loading}
                              helperText="Opcional"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Qtd. máxima de pagamentos"
                              name="maxPaymentCount"
                              value={formData.maxPaymentCount}
                              onChange={handleChange}
                              disabled={loading}
                              helperText="Opcional"
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Localização & Coordenadas
                    </Typography>
                    <Box
                      component="div"
                      sx={{
                        background: theme.palette.background.paper,
                        borderRadius: 2,
                        p: 2,
                        boxShadow: theme.shadows[1],
                      }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Endereço (logradouro)"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            disabled={loading}
                            helperText="Use o botão abaixo para preencher automaticamente"
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Número"
                            name="addressNumber"
                            value={formData.addressNumber}
                            onChange={handleChange}
                            disabled={loading}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Cidade"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            disabled={loading}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Bairro"
                            name="neighborhood"
                            value={formData.neighborhood}
                            onChange={handleChange}
                            disabled={loading}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="CEP"
                            name="cep"
                            value={formData.cep}
                            onChange={handleChange}
                            disabled={loading}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={handleBuscarCoordenadas}
                            disabled={loading || geoLoading}
                          >
                            {geoLoading ? 'Buscando coordenadas...' : 'Buscar coordenadas'}
                          </Button>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Latitude"
                            name="latitude"
                            value={formData.latitude}
                            disabled
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Longitude"
                            name="longitude"
                            value={formData.longitude}
                            disabled
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Capacidade & mídia
                    </Typography>
                    <Box
                      component="div"
                      sx={{
                        background: theme.palette.background.paper,
                        borderRadius: 2,
                        p: 2,
                        boxShadow: theme.shadows[1],
                      }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Máximo de Inscrições"
                            name="maxRegistrations"
                            value={formData.maxRegistrations}
                            onChange={handleChange}
                            disabled={loading}
                            helperText="Deixe em branco para ilimitado"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Máximo por Comprador"
                            name="maxPerBuyer"
                            value={formData.maxPerBuyer}
                            onChange={handleChange}
                            disabled={loading}
                            helperText="Deixe em branco para sem limite"
                            inputProps={{ min: 1 }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2">Imagem de capa</Typography>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            Tam. máx. 10MB | Resolução recomendada 1280x720.
                          </Typography>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverFileChange}
                            disabled={loading}
                            style={{ marginTop: 8 }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isActive}
                          onChange={handleChange}
                          name="isActive"
                          color="primary"
                          disabled={loading}
                        />
                      }
                      label="Evento Ativo"
                    />
                    <Typography variant="caption" display="block" color="textSecondary">
                      Eventos inativos não aparecem na listagem pública
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" gap={2}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        disabled={loading}
                      >
                        {loading ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<BackIcon />}
                        onClick={() => history.push('/app/events')}
                        disabled={loading}
                      >
                        Voltar
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  position: { md: 'sticky' },
                  top: theme.spacing(3),
                }}
              >
                <PaperPreview formData={formData} coverPreview={coverPreview} loading={loading} />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

function PaperPreview({ formData, coverPreview, loading }) {
  const theme = useTheme();

  const formattedDate = (value) => {
    if (!value) return '---';
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 3,
        background: theme.palette.background.default,
      }}
    >
      <Typography variant="subtitle1" gutterBottom>
        Pré-visualização
      </Typography>
      <Chip
        label={formData.isActive ? 'Ativo' : 'Inativo'}
        color={formData.isActive ? 'success' : 'default'}
        size="small"
        sx={{ mb: 1 }}
      />
      <Divider sx={{ mb: 2 }} />
      {coverPreview ? (
        <Box
          sx={{
            width: '100%',
            height: 180,
            borderRadius: 2,
            overflow: 'hidden',
            mb: 2,
          }}
        >
          <img
            src={coverPreview}
            alt="Prévia"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            height: 180,
            borderRadius: 2,
            bgcolor: theme.palette.action.hover,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" color="textSecondary">
            Adicione uma imagem de capa
          </Typography>
        </Box>
      )}
      <Box sx={{ mb: 1 }}>
        <Typography variant="h6" component="p">
          {formData.title || 'Título do evento'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {formData.description || 'Descrição aparecerá aqui.'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="caption" color="textSecondary">
          Início: {formattedDate(formData.startDate)}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Término: {formattedDate(formData.endDate)}
        </Typography>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2">
          <strong>Local:</strong> {formData.location || '---'}
        </Typography>
        <Typography variant="body2">
          <strong>Cidade:</strong> {formData.city || '---'}
        </Typography>
        <Typography variant="body2">
          <strong>CEP:</strong> {formData.cep || '---'}
        </Typography>
        <Typography variant="body2">
          <strong>Capacidade:</strong> {formData.maxRegistrations || 'Ilimitado'}
        </Typography>
      </Box>
      {loading && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
          Salvando evento...
        </Typography>
      )}
    </Paper>
  );
}

PaperPreview.propTypes = {
  formData: PropTypes.object.isRequired,
  coverPreview: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default EventForm;
