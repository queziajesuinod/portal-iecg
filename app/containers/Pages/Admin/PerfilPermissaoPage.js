import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';
import {
  TextField, Button, Checkbox, FormControlLabel, FormGroup, MenuItem,
  Typography, Box, Divider, List, ListItem, ListItemText, Chip, Stack, CircularProgress, Paper
} from '@mui/material';

const fallbackHost = `${window.location.protocol}//${window.location.host}`;
const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'http://localhost:3005';

const PerfilPermissaoPage = () => {
  const [perfis, setPerfis] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [selecionado, setSelecionado] = useState('');
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');
  const headersAuth = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [perfisResp, permissoesResp] = await Promise.all([
        fetch(`${API_URL}/perfil`, { headers: headersAuth }),
        fetch(`${API_URL}/permissoes`, { headers: headersAuth }),
      ]);
      if (!perfisResp.ok || !permissoesResp.ok) {
        throw new Error('Falha ao carregar perfis/permissões');
      }
      setPerfis(await perfisResp.json());
      setPermissoes(await permissoesResp.json());
      setMessage('');
    } catch (err) {
      setMessage('Não foi possível carregar perfis/permissões. Verifique a API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const criarPerfil = async () => {
    if (!descricao) return;
    setSaving(true);
    await fetch(`${API_URL}/perfil`, {
      method: 'POST',
      headers: headersAuth,
      body: JSON.stringify({ descricao }),
    });
    setDescricao('');
    await carregarDados();
    setSaving(false);
  };

  const salvarPermissoesPerfil = async () => {
    if (!selecionado) return;
    setSaving(true);
    await fetch(`${API_URL}/perfil/${selecionado}/permissoes`, {
      method: 'PUT',
      headers: headersAuth,
      body: JSON.stringify({ permissoesIds: permissoesSelecionadas }),
    });
    setMessage('Permissões atualizadas');
    await carregarDados();
    setSaving(false);
  };

  const handleSelecionaPerfil = (idPerfil) => {
    setSelecionado(idPerfil);
    const perfil = perfis.find((p) => p.id === idPerfil);
    const jaMarcadas = perfil?.permissoes?.map((p) => p.id) || [];
    setPermissoesSelecionadas(jaMarcadas);
  };

  const togglePermissao = (id) => {
    setPermissoesSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const perfilSelecionadoObj = useMemo(() => perfis.find(p => p.id === selecionado), [perfis, selecionado]);

  return (
    <PapperBlock title="Perfis e Permissões" desc="Crie perfis e atribua permissões">
      <Helmet>
        <title>Perfis e Permissões</title>
      </Helmet>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        {message && <Typography color="primary">{message}</Typography>}
        {(loading || saving) && <CircularProgress size={20} />}
      </Stack>
      <Box display="flex" gap={3} flexWrap="wrap">
        <Paper sx={{ p: 2, minWidth: 280, flex: 1 }}>
          <Typography variant="h6" gutterBottom>Criar novo perfil</Typography>
          <TextField
            fullWidth
            label="Descrição do perfil"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            margin="normal"
          />
          <Button variant="contained" color="primary" onClick={criarPerfil} disabled={saving}>
            Criar perfil
          </Button>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>Perfis existentes</Typography>
          <List dense>
            {perfis.map((p) => (
              <ListItem button key={p.id} selected={p.id === selecionado} onClick={() => handleSelecionaPerfil(p.id)}>
                <ListItemText primary={p.descricao} secondary={`${p.permissoes?.length || 0} permissões`} />
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper sx={{ p: 2, minWidth: 320, flex: 2 }}>
          <Typography variant="h6" gutterBottom>Permissões do perfil</Typography>
          <TextField
            select
            fullWidth
            label="Perfil"
            value={selecionado}
            onChange={(e) => handleSelecionaPerfil(e.target.value)}
            margin="normal"
          >
            {perfis.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.descricao}</MenuItem>
            ))}
          </TextField>

          {perfilSelecionadoObj && (
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
              {perfilSelecionadoObj.permissoes?.map((perm) => (
                <Chip key={perm.id} label={perm.nome} size="small" />
              ))}
            </Stack>
          )}

          <Typography variant="subtitle1" gutterBottom>Permissões disponíveis</Typography>
          <FormGroup>
            {permissoes.map((perm) => (
              <FormControlLabel
                key={perm.id}
                control={
                  <Checkbox
                    checked={permissoesSelecionadas.includes(perm.id)}
                    onChange={() => togglePermissao(perm.id)}
                    color="primary"
                  />
                }
                label={`${perm.nome} - ${perm.descricao || ''}`}
              />
            ))}
          </FormGroup>
          <Button variant="contained" color="primary" onClick={salvarPermissoesPerfil} disabled={!selecionado || saving}>
            Salvar permissões
          </Button>
        </Paper>
      </Box>
    </PapperBlock>
  );
};

export default PerfilPermissaoPage;
