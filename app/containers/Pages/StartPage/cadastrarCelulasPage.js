import React, { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import {
  Grid,
  TextField,
  Button,
  MenuItem,
  Typography
} from '@mui/material';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';

const formInicial = {
  id: '',
  celula: '',
  rede: '',
  lider: '',
  email_lider: '',
  cel_lider: '',
  anfitriao: '',
  campus: '',
  endereco: '',
  bairro: '',
  cidade: '',
  estado: '',
  lideranca: '',
  pastor_geracao: '',
  pastor_campus: '',
  dia: '',
  lat: '',
  lon: '',
};

const CadastrarCelula = () => {
  const [formData, setFormData] = useState(formInicial);
  const [notification, setNotification] = useState('');
  const location = useLocation();
  const history = useHistory();
  const celulaEditando = location.state?.celula;
  const isEdit = Boolean(celulaEditando);

  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  useEffect(() => {
    if (isEdit) {
      setFormData(celulaEditando);
    }
  }, [isEdit, celulaEditando]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `${API_URL}/start/celula/${formData.id}` : `${API_URL}/celulas`;

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setNotification(isEdit ? 'Célula atualizada com sucesso!' : 'Célula cadastrada com sucesso!');
        if (!isEdit) setFormData(formInicial);
      } else {
        setNotification(`Erro: ${data.message || 'Falha no processamento'}`);
      }
    } catch (error) {
      console.error('Erro ao salvar célula:', error);
      setNotification('Erro na conexão com o servidor.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>{isEdit ? 'Editar Célula' : 'Cadastrar Célula'}</title>
      </Helmet>
      <PapperBlock title={isEdit ? 'Editar Célula' : 'Cadastro de Célula'} desc="Preencha os dados abaixo">
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Nome da Célula" name="celula" value={formData.celula} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Rede" name="rede" value={formData.rede} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Líder" name="lider" value={formData.lider} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Email do Líder" name="email_lider" value={formData.email_lider} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Celular do Líder" name="cel_lider" value={formData.cel_lider} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Anfitrião" name="anfitriao" value={formData.anfitriao} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Campus" name="campus" value={formData.campus} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Endereço" name="endereco" value={formData.endereco} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Bairro" name="bairro" value={formData.bairro} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Cidade" name="cidade" value={formData.cidade} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Estado" name="estado" value={formData.estado} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Liderança" name="lideranca" value={formData.lideranca} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Pastor de Geração" name="pastor_geracao" value={formData.pastor_geracao} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Pastor do Campus" name="pastor_campus" value={formData.pastor_campus} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Dia da Semana" name="dia" value={formData.dia} onChange={handleChange} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth label="Latitude" name="lat" value={formData.lat} onChange={handleChange} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth label="Longitude" name="lon" value={formData.lon} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" color="primary" fullWidth>
                {isEdit ? 'Atualizar Célula' : 'Cadastrar Célula'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </PapperBlock>
      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default CadastrarCelula;
