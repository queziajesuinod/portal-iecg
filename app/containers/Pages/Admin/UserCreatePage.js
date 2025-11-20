import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';
import { TextField, Button, MenuItem, Box, Typography } from '@mui/material';

const fallbackHost = `${window.location.protocol}//${window.location.host}`;
const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'https://portal.iecg.com.br';

const UserCreatePage = () => {
  const [perfis, setPerfis] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    perfilId: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');
  const headersAuth = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const carregarPerfis = async () => {
    const resp = await fetch(`${API_URL}/perfil`, { headers: headersAuth });
    setPerfis(await resp.json());
  };

  useEffect(() => {
    carregarPerfis();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const resp = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: headersAuth,
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          username: form.username,
          password: form.password,
          perfilId: form.perfilId,
          active: true,
        }),
      });
      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData?.message || 'Erro ao criar usuario');
      }
      setMessage('Usuario criado com sucesso');
      setForm({ name: '', email: '', username: '', password: '', perfilId: '' });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PapperBlock title="Cadastro de Usuario" desc="Somente administradores podem acessar">
      <Helmet>
        <title>Cadastrar Usuario</title>
      </Helmet>
      <Box display="flex" flexDirection="column" gap={2} maxWidth={480}>
        <TextField label="Nome" value={form.name} onChange={(e) => updateField('name', e.target.value)} fullWidth />
        <TextField label="Email" value={form.email} onChange={(e) => updateField('email', e.target.value)} fullWidth />
        <TextField label="Username" value={form.username} onChange={(e) => updateField('username', e.target.value)} fullWidth />
        <TextField label="Senha" type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} fullWidth />
        <TextField
          select
          label="Perfil"
          value={form.perfilId}
          onChange={(e) => updateField('perfilId', e.target.value)}
          fullWidth
        >
          {perfis.map((p) => (
            <MenuItem key={p.id} value={p.id}>{p.descricao}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" color="primary" onClick={submit} disabled={loading}>
          {loading ? 'Salvando...' : 'Cadastrar'}
        </Button>
        {message && <Typography color="primary">{message}</Typography>}
      </Box>
    </PapperBlock>
  );
};

export default UserCreatePage;
