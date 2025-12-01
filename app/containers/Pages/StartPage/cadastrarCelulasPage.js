import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Grid,
  TextField,
  Button,
  MenuItem
} from '@mui/material';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import { formatPhoneNumber } from '../../../utils/formatPhone';

const formInicial = {
  id: '',
  celula: '',
  rede: '',
  lider: '',
  email_lider: '',
  cel_lider: '',
  anfitriao: '',
  campus: '',
  numero: '',
  endereco: '',
  cep: '',
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

const REDE_OPTIONS = [
  'RELEVANTE JUNIORS RAPAZES',
  'RELEVANTEEN RAPAZES',
  'RELEVANTEEN MOÇAS',
  'JUVENTUDE RELEVANTE RAPAZES',
  'MULHERES IECG',
  'IECG KIDS',
  'HOMENS IECG',
  'JUVENTUDE RELEVANTE MOÇAS',
  'RELEVANTE JUNIORS MOÇAS'
];

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  const { protocol, hostname, port } = window.location;
  if (port === '3005') {
    return `${protocol}//${hostname}:3005`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const CadastrarCelula = () => {
  const [formData, setFormData] = useState(formInicial);
  const [notification, setNotification] = useState('');
  const [campi, setCampi] = useState([]);
  const location = useLocation();
  const celulaEditando = location.state?.celula;
  const isEdit = Boolean(celulaEditando);

  const API_URL = resolveApiUrl();

  useEffect(() => {
    if (isEdit && celulaEditando) {
      setFormData({
        ...formInicial,
        ...celulaEditando,
        cel_lider: formatPhoneNumber(celulaEditando.cel_lider || '')
      });
    }
  }, [isEdit, celulaEditando]);

  useEffect(() => {
    const carregarCampi = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/start/campus`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        const data = await res.json();
        setCampi(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao carregar campus:', err);
        setCampi([]);
      }
    };
    carregarCampi();
  }, [API_URL]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'cel_lider' ? formatPhoneNumber(value) : value;
    setFormData({ ...formData, [name]: nextValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação básica para campos obrigatórios
    if (!formData.celula || !formData.lider || !formData.email_lider) {
      setNotification('Preencha os campos obrigatórios: Nome da Célula, Líder e Email do Líder.');
      return;
    }

    const token = localStorage.getItem('token');
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `${API_URL}/start/celula/${formData.id}` : `${API_URL}/start/celula`;

    const payload = {
      ...formData,
      lat: formData.lat ? parseFloat(formData.lat) : null,
      lon: formData.lon ? parseFloat(formData.lon) : null
    };
    if (!isEdit) {
      delete payload.id; // Remove o campo 'id' ao criar uma nova célula
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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

  const buscarCoordenadas = async () => {
    const { endereco, numero, bairro, cidade, estado, cep } = formData;
    const queryParts = [endereco, numero, bairro, cidade, estado, cep].filter(Boolean);
    if (!queryParts.length) {
      setNotification('Informe endereço, número, bairro, cidade, estado ou CEP para buscar coordenadas.');
      return;
    }

    try {
      const query = encodeURIComponent(queryParts.join(' '));
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1`);
      const data = await res.json();

      if (data.length > 0) {
        const { lat, lon, address = {} } = data[0];
        const bairro =
          address.suburb ||
          address.neighbourhood ||
          address.city_district ||
          address.quarter ||
          address.village ||
          '';
        const logradouro = address.road || address.pedestrian || address.cycleway || '';
        const numeroEncontrado = address.house_number || '';
        const cidade =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.state_district ||
          '';
        const estado = address.state || address.region || address.state_district || '';
        const cepEncontrado = address.postcode || '';

        setFormData((prev) => ({
          ...prev,
          lat,
          lon,
          endereco: logradouro || prev.endereco,
          numero: numeroEncontrado || prev.numero,
          bairro: bairro || prev.bairro,
          cidade: cidade || prev.cidade,
          estado: estado || prev.estado,
          cep: cepEncontrado || prev.cep
        }));
        setNotification('Coordenadas preenchidas com sucesso!');
      } else {
        setNotification('Nenhum resultado encontrado para esse endereço.');
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      setNotification('Erro ao buscar coordenadas.');
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
              <TextField
                select
                fullWidth
                label="Rede"
                name="rede"
                value={formData.rede}
                onChange={handleChange}
              >
                {REDE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
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
              <TextField
                select
                fullWidth
                label="Campus"
                name="campus"
                value={formData.campus}
                onChange={handleChange}
              >
                {campi.map((campus) => (
                  <MenuItem key={campus.id} value={campus.nome}>
                    {campus.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Campo de endereço com botão */}
            <Grid item xs={12} container spacing={1}>
              <Grid item xs={9}>
                <TextField
                  fullWidth
                  label="Endereço"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={3}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  onClick={buscarCoordenadas}
                  style={{ height: '100%' }}
                >
                  Buscar coordenadas
                </Button>
              </Grid>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Número da casa" name="numero" value={formData.numero} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="CEP" name="cep" value={formData.cep} onChange={handleChange} />
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
