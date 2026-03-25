import React, { useEffect, useState } from 'react';
import {
  Box, Button, Checkbox, CircularProgress, Divider, FormControlLabel,
  FormGroup, Grid, MenuItem, Paper, Select, Switch, Typography,
  FormControl, InputLabel, Chip,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { listarVinculosPorCampus, salvarVinculos } from '../../../../api/cultosApi';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const CampusMinisteriosPage = () => {
  const [campi, setCampi] = useState([]);
  const [campusId, setCampusId] = useState('');
  const [dadosCampus, setDadosCampus] = useState(null);
  const [selecionados, setSelecionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCampus, setLoadingCampus] = useState(false);
  const [notification, setNotification] = useState('');
  const [transmiteOnline, setTransmiteOnline] = useState(false);
  const [savingOnline, setSavingOnline] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/start/campus`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setCampi(Array.isArray(data) ? data : []))
      .catch(() => setNotification('Erro ao carregar campi'));
  }, []);

  const handleCampusChange = async (e) => {
    const id = e.target.value;
    setCampusId(id);
    setDadosCampus(null);
    setSelecionados([]);
    if (!id) return;
    setLoadingCampus(true);
    try {
      const dados = await listarVinculosPorCampus(id);
      setDadosCampus(dados);
      setTransmiteOnline(dados.campus?.transmiteOnline || false);
      setSelecionados(dados.ministerios.filter((m) => m.vinculado).map((m) => m.id));
    } catch (err) {
      setNotification(err.message || 'Erro ao carregar dados do campus');
    } finally {
      setLoadingCampus(false);
    }
  };

  const handleCheck = (ministerioId) => {
    setSelecionados((prev) =>
      prev.includes(ministerioId)
        ? prev.filter((id) => id !== ministerioId)
        : [...prev, ministerioId]
    );
  };

  const handleSalvarVinculos = async () => {
    setLoading(true);
    try {
      await salvarVinculos(campusId, selecionados);
      setNotification('Vínculos salvos com sucesso!');
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar vínculos');
    } finally {
      setLoading(false);
    }
  };

  const handleTransmiteOnline = async (e) => {
    const valor = e.target.checked;
    setTransmiteOnline(valor);
    setSavingOnline(true);
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/start/campus/${campusId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ transmiteOnline: valor }),
      });
      setNotification(`Campus ${valor ? 'habilitado' : 'desabilitado'} para transmissão online`);
    } catch {
      setNotification('Erro ao atualizar transmissão online');
      setTransmiteOnline(!valor);
    } finally {
      setSavingOnline(false);
    }
  };

  return (
    <div>
      <Helmet><title>Vínculos Campus × Ministério</title></Helmet>
      <PapperBlock
        title="Vínculos Campus × Ministério"
        icon="ion-ios-git-network-outline"
        desc="Defina quais ministérios estão disponíveis em cada campus"
      >
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Selecione um campus</InputLabel>
          <Select value={campusId} label="Selecione um campus" onChange={handleCampusChange}>
            <MenuItem value="">— Selecione —</MenuItem>
            {campi.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
          </Select>
        </FormControl>

        {loadingCampus && <Box display="flex" justifyContent="center" my={3}><CircularProgress /></Box>}

        {dadosCampus && !loadingCampus && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Transmissão online */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Configuração do campus
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={transmiteOnline}
                      onChange={handleTransmiteOnline}
                      disabled={savingOnline}
                    />
                  }
                  label="Transmite online (exibe campo de audiência online no formulário)"
                />
                {dadosCampus.campus?.transmiteOnline !== transmiteOnline && (
                  <Chip label="Salvo" size="small" color="success" sx={{ ml: 1 }} />
                )}
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Ministérios */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Ministérios disponíveis neste campus
                </Typography>
                <FormGroup>
                  <Grid container>
                    {dadosCampus.ministerios.map((m) => (
                      <Grid item xs={12} sm={6} md={4} key={m.id}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selecionados.includes(m.id)}
                              onChange={() => handleCheck(m.id)}
                            />
                          }
                          label={m.nome}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </FormGroup>
              </Grid>

              <Grid item xs={12}>
                <Button variant="contained" onClick={handleSalvarVinculos} disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : 'Salvar vínculos'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {notification && <Notification message={notification} onClose={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default CampusMinisteriosPage;
