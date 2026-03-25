import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, CircularProgress, FormControl, Grid,
  InputLabel, MenuItem, Select, TextField, Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { buscarDashboard, listarMinisterios } from '../../../api/cultosApi';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const CardTotalizador = ({ titulo, valor, subtitulo, cor }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle2" color="textSecondary">{titulo}</Typography>
      <Typography variant="h4" sx={{ color: cor || 'primary.main', fontWeight: 700 }}>
        {valor ?? 0}
      </Typography>
      {subtitulo && <Typography variant="caption" color="textSecondary">{subtitulo}</Typography>}
    </CardContent>
  </Card>
);

const formatarData = (data) => {
  if (!data) return '';
  const [y, m, d] = data.split('-');
  return `${d}/${m}`;
};

const CultosDashboard = () => {
  const [dados, setDados] = useState(null);
  const [campi, setCampi] = useState([]);
  const [ministerios, setMinisterios] = useState([]);
  const [filtros, setFiltros] = useState({ campusId: '', ministerioId: '', dataInicio: '', dataFim: '' });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API_URL}/start/campus`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      listarMinisterios(true),
    ]).then(([c, m]) => {
      setCampi(Array.isArray(c) ? c : []);
      setMinisterios(m);
    }).catch(() => setNotification('Erro ao carregar filtros'));
  }, []);

  const loadDados = useCallback(() => {
    setLoading(true);
    buscarDashboard(filtros)
      .then(setDados)
      .catch(() => setNotification('Erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, [filtros]);

  useEffect(() => { loadDados(); }, [loadDados]);

  const handleFiltro = (e) => setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div>
      <Helmet><title>Dashboard — Saúde dos Cultos</title></Helmet>
      <PapperBlock title="Saúde dos Cultos" icon="ion-ios-analytics-outline" desc="Indicadores e evolução de presença">

        {/* Filtros */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Campus</InputLabel>
              <Select name="campusId" value={filtros.campusId} label="Campus" onChange={handleFiltro}>
                <MenuItem value="">Todos</MenuItem>
                {campi.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Ministério</InputLabel>
              <Select name="ministerioId" value={filtros.ministerioId} label="Ministério" onChange={handleFiltro}>
                <MenuItem value="">Todos</MenuItem>
                {ministerios.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" type="date" label="De" name="dataInicio"
              value={filtros.dataInicio} onChange={handleFiltro} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" type="date" label="Até" name="dataFim"
              value={filtros.dataFim} onChange={handleFiltro} InputLabelProps={{ shrink: true }} />
          </Grid>
        </Grid>

        {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}

        {!loading && dados && (
          <>
            {/* Cards totalizadores */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Cultos" valor={dados.totalCultos} cor="text.primary" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Presença total" valor={dados.totalPresenca}
                  subtitulo={`H:${dados.totalHomens} M:${dados.totalMulheres} C:${dados.totalCriancas} B:${dados.totalBebes}`} />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Online" valor={dados.totalOnline} cor="info.main" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Voluntários" valor={dados.totalVoluntarios} cor="success.main" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Apelos" valor={dados.totalApelos} cor="warning.main" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Pessoas no apelo" valor={dados.totalPessoasApelo} cor="error.main" />
              </Grid>
            </Grid>

            {/* Gráfico de linha — evolução de presença */}
            {dados.evolucaoPresenca.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Evolução de presença por data
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dados.evolucaoPresenca.map((d) => ({ ...d, data: formatarData(d.data) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="presenca" name="Presença" stroke="#1976d2" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            {/* Gráfico de barras — presença por ministério */}
            {dados.presencaPorMinisterio.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Presença por ministério no período
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dados.presencaPorMinisterio}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="presenca" name="Presença" fill="#1976d2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}

            {dados.totalCultos === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="textSecondary">Nenhum culto encontrado para os filtros selecionados.</Typography>
              </Box>
            )}
          </>
        )}

        {notification && <Notification message={notification} close={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default CultosDashboard;
