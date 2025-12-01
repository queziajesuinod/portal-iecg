import React, { useState } from 'react';
import { Box, Button, Container, Grid, MenuItem, Paper, TextField, Typography, Chip, FormControlLabel, Checkbox } from '@mui/material';
import Outer from '../../Templates/Outer';

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

const initialForm = {
  nome: '',
  decisao: '',
  whatsapp: '',
  rede: '',
  bairro_apelo: '',
  cidade_apelo: 'Campo Grande',
  estado_apelo: 'Mato Grosso do Sul',
  idade: '',
  bairro_proximo: [],
  headerImageUrl: '',
  direcionar_celula: true,
  campus_iecg: '',
  status: ''
};

const ApeloPublicPage = () => {
  const [form, setForm] = useState(initialForm);
  const [bairroTemp, setBairroTemp] = useState('');
  const [notification, setNotification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const API_URL = resolveApiUrl();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
  };

  const formatWhatsapp = (value = '') => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const part1 = digits.slice(0, 2);
    const part2 = digits.slice(2, 7);
    const part3 = digits.slice(7, 11);
    if (digits.length > 6) return `(${part1}) ${part2}-${part3}`.trim();
    if (digits.length > 2) return `(${part1}) ${part2}`.trim();
    if (digits.length > 0) return `(${part1}`;
    return '';
  };

  const handleWhatsappChange = (e) => {
    const masked = formatWhatsapp(e.target.value);
    setForm((prev) => ({ ...prev, whatsapp: masked }));
  };

  const addBairroProximo = () => {
    const val = bairroTemp.trim();
    if (!val) return;
    setForm((prev) => ({ ...prev, bairro_proximo: [...prev.bairro_proximo, val] }));
    setBairroTemp('');
  };

  const removeBairroProximo = (value) => {
    setForm((prev) => ({ ...prev, bairro_proximo: prev.bairro_proximo.filter((b) => b !== value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotification('');
    setSubmitting(true);
    const payload = {
      nome: form.nome,
      decisao: form.decisao,
      whatsapp: form.whatsapp.replace(/\D/g, ''),
      rede: form.rede,
      bairro_apelo: form.bairro_apelo,
      cidade_apelo: form.cidade_apelo,
      estado_apelo: form.estado_apelo,
      idade: form.idade ? Number(form.idade) : null,
      bairro_proximo: form.bairro_proximo,
      decisao: form.decisao,
      direcionar_celula: !!form.direcionar_celula,
      campus_iecg: form.campus_iecg,
      status: form.status
    };
    try {
      const res = await fetch(`${API_URL}/public/direcionamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.erro || data?.message || 'Erro ao enviar o apelo.');
      }
      setNotification('Apelo enviado com sucesso! Obrigado pelo envio.');
      setForm(initialForm);
    } catch (err) {
      console.error(err);
      setNotification(err.message || 'Erro ao enviar o apelo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {form.headerImageUrl && (
        <Box mb={3} textAlign="center">
          <img src={form.headerImageUrl} alt="Topo" style={{ maxWidth: '100%', borderRadius: 8 }} />
        </Box>
      )}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Cadastro de Novo Apelo</Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Preencha as informações abaixo para registrar um novo apelo direcionado.
        </Typography>
        <Box mt={2}>
          <TextField
            fullWidth
            label="URL da imagem de topo (opcional)"
            name="headerImageUrl"
            value={form.headerImageUrl}
            onChange={handleChange}
            margin="normal"
          />
        </Box>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Nome" name="nome" value={form.nome} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Decisão"
                name="decisao"
                value={form.decisao}
                onChange={handleChange}
              >
                <MenuItem value="">Selecione</MenuItem>
                <MenuItem value="encaminhamento_celula">Encaminhamento de Célula</MenuItem>
                <MenuItem value="apelo_volta">Voltar para Jesus (estava afastado e estou me reconciliando)</MenuItem>
                <MenuItem value="apelo_decisao">Aceitar Jesus como meu Senhor e Salvador</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={handleWhatsappChange} placeholder="(99) 99999-9999" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Rede"
                name="rede"
                value={form.rede}
                onChange={handleChange}
              >
                {REDE_OPTIONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Idade" name="idade" type="number" value={form.idade} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Campus IECG (opcional)" name="campus_iecg" value={form.campus_iecg} onChange={handleChange} />
            </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!form.direcionar_celula}
                      onChange={(e) => handleChange({ target: { name: 'direcionar_celula', value: e.target.checked, type: 'checkbox', checked: e.target.checked } })}
                    />
                  }
                  label="Desejo ser direcionado(a) para uma célula"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bairro"
                  name="bairro_apelo"
                  value={form.bairro_apelo}
                  onChange={handleChange}
                  disabled={!form.direcionar_celula}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cidade"
                  name="cidade_apelo"
                  value={form.cidade_apelo}
                  onChange={handleChange}
                  disabled={!form.direcionar_celula}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Estado"
                  name="estado_apelo"
                  value={form.estado_apelo}
                  onChange={handleChange}
                  disabled={!form.direcionar_celula}
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" gap={1} alignItems="center">
                  <TextField
                    fullWidth
                    label="Adicionar bairro próximo"
                    value={bairroTemp}
                    onChange={(e) => setBairroTemp(e.target.value)}
                    disabled={!form.direcionar_celula}
                  />
                <Button variant="outlined" onClick={addBairroProximo} disabled={!form.direcionar_celula}>Adicionar</Button>
              </Box>
              <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                {form.bairro_proximo.map((b) => (
                  <Chip key={b} label={b} onDelete={() => removeBairroProximo(b)} disabled={!form.direcionar_celula} />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Status (opcional)"
                name="status"
                value={form.status}
                onChange={handleChange}
                placeholder="Ex.: DIRECIONADO_COM_SUCESSO"
              />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" color="primary" fullWidth disabled={submitting}>
                {submitting ? 'Enviando...' : 'Me Inscrever'}
              </Button>
            </Grid>
          </Grid>
        </form>
        {notification && (
          <Typography variant="body2" color="primary" mt={2}>
            {notification}
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default ApeloPublicPage;
