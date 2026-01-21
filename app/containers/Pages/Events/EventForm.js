import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';
import {
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Typography
} from '@material-ui/core';
import { Save as SaveIcon, ArrowBack as BackIcon } from '@material-ui/icons';
import { useHistory, useParams } from 'react-router-dom';
import { criarEvento, atualizarEvento, buscarEvento } from '../../../api/eventsApi';
import brand from 'dan-api/dummy/brand';

function EventForm() {
  const history = useHistory();
  const { id } = useParams();
  const isEdicao = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    imageUrl: '',
    maxRegistrations: '',
    isActive: true
  });

  useEffect(() => {
    if (isEdicao) {
      carregarEvento();
    }
  }, [id]);

  const carregarEvento = async () => {
    try {
      setLoading(true);
      const response = await buscarEvento(id);
      const evento = response.data;
      
      setFormData({
        title: evento.title || '',
        description: evento.description || '',
        startDate: evento.startDate ? evento.startDate.substring(0, 16) : '',
        endDate: evento.endDate ? evento.endDate.substring(0, 16) : '',
        location: evento.location || '',
        imageUrl: evento.imageUrl || '',
        maxRegistrations: evento.maxRegistrations || '',
        isActive: evento.isActive
      });
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      alert('Erro ao carregar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      alert('Título é obrigatório');
      return;
    }

    try {
      setLoading(true);
      
      const dados = {
        ...formData,
        maxRegistrations: formData.maxRegistrations ? parseInt(formData.maxRegistrations) : null
      };

      if (isEdicao) {
        await atualizarEvento(id, dados);
        alert('Evento atualizado com sucesso!');
      } else {
        await criarEvento(dados);
        alert('Evento criado com sucesso!');
      }
      
      history.push('/app/events');
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      alert(error.response?.data?.message || 'Erro ao salvar evento');
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
              <TextField
                fullWidth
                label="Local"
                name="location"
                value={formData.location}
                onChange={handleChange}
                disabled={loading}
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
    </div>
  );
}

export default EventForm;
