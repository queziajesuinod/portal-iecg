import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@material-ui/core';
import { Save as SaveIcon, ArrowBack as BackIcon } from '@material-ui/icons';
import { useHistory, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { criarEvento, atualizarEvento, buscarEvento } from '../../../api/eventsApi';
import { fetchGeocode } from '../../../utils/googleGeocode';
import { EVENT_TYPE_OPTIONS } from '../../../constants/eventTypes';

function EventForm() {
  const history = useHistory();
  const { id } = useParams();
  const isEdicao = !!id;

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
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
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
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
                minRows={4}
                label="Descrição"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
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

            {formData.registrationPaymentMode === 'BALANCE_DUE' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Valor mínimo de sinal"
                    name="minDepositAmount"
                    value={formData.minDepositAmount}
                    onChange={handleChange}
                    disabled={loading}
                    helperText="Deixe em branco para não exigir sinal mínimo"
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
                    helperText="Deixe em branco para não limitar"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereco (logradouro)"
                name="location"
                value={formData.location}
                onChange={handleChange}
                disabled={loading}
                helperText="Utilize o botao abaixo para preencher coordenadas automaticamente"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Numero"
                name="addressNumber"
                value={formData.addressNumber}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cidade"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bairro"
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Latitude"
                name="latitude"
                value={formData.latitude}
                disabled
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Longitude"
                name="longitude"
                value={formData.longitude}
                disabled
                InputProps={{ readOnly: true }}
              />
            </Grid>

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
              <TextField
                fullWidth
                label="URL da Imagem"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                disabled={loading}
                helperText="URL da imagem de capa do evento"
              />
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
              <div style={{ display: 'flex', gap: 16 }}>
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
              </div>
            </Grid>
          </Grid>
        </form>
      </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}

export default EventForm;
