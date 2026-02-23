import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText
} from '@mui/material';

const fallbackHost = `${window.location.protocol}//${window.location.host}`;
const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'https://portal.iecg.com.br';

const generateRandomPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const UsersListPage = () => {
  const token = localStorage.getItem('token');
  const headersAuth = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const [users, setUsers] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    perfilIds: [],
    changePassword: false,
    passwordMode: 'auto',
    password: ''
  });
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterPerfil, setFilterPerfil] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterNome, setFilterNome] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [uResp, pResp] = await Promise.all([
        fetch(`${API_URL}/users`, { headers: headersAuth }),
        fetch(`${API_URL}/perfil`, { headers: headersAuth })
      ]);
      if (!uResp.ok || !pResp.ok) {
        throw new Error('Falha ao carregar usuarios/perfis');
      }
      setUsers(await uResp.json());
      setPerfis(await pResp.json());
      setMessage('');
    } catch (err) {
      setMessage('Não foi possível carregar usuários. Verifique a API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (user) => {
    setSelectedUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      username: user.username || '',
      perfilIds: user.perfis?.map((p) => p.id) || (user.perfilId ? [user.perfilId] : []),
      active: user.active !== false,
      changePassword: false,
      passwordMode: 'auto',
      password: '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const payload = {
        ...form,
        perfilIds: form.perfilIds || []
      };

      delete payload.changePassword;
      delete payload.passwordMode;

      if (form.changePassword) {
        const nextPassword = String(form.password || '').trim();
        if (!nextPassword) {
          throw new Error('Informe a nova senha');
        }
        payload.password = nextPassword;
      } else {
        delete payload.password;
      }

      const resp = await fetch(`${API_URL}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: headersAuth,
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data?.message || 'Erro ao salvar');
      }

      let successMessage = 'Usuario atualizado';
      if (form.changePassword && form.passwordMode === 'auto') {
        successMessage = `Usuario atualizado. Senha gerada: ${form.password}`;
      } else if (form.changePassword) {
        successMessage = 'Usuario atualizado com nova senha';
      }

      setOpen(false);
      await loadData();
      setMessage(successMessage);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleToggleActive = async (user) => {
    try {
      setLoading(true);
      await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: headersAuth,
        body: JSON.stringify({ active: !user.active }),
      });
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleChangePassword = (enabled) => {
    setForm((prev) => {
      if (!enabled) {
        return {
          ...prev,
          changePassword: false,
          password: ''
        };
      }

      if (prev.passwordMode === 'auto' && !prev.password) {
        return {
          ...prev,
          changePassword: true,
          password: generateRandomPassword()
        };
      }

      return {
        ...prev,
        changePassword: true
      };
    });
  };

  const handlePasswordModeChange = (mode) => {
    setForm((prev) => ({
      ...prev,
      passwordMode: mode,
      password: mode === 'auto' ? generateRandomPassword() : ''
    }));
  };

  const handleGeneratePassword = () => {
    updateField('password', generateRandomPassword());
  };

  const filteredUsers = useMemo(() => users.filter((u) => {
    const matchPerfil = filterPerfil ? (u.perfilId === filterPerfil || u.Perfil?.id === filterPerfil) : true;
    const matchStatus = filterStatus ? (filterStatus === 'ativo' ? u.active : !u.active) : true;
    const matchNome = filterNome ? (u.name || '').toLowerCase().includes(filterNome.toLowerCase()) : true;
    return matchPerfil && matchStatus && matchNome;
  }), [users, filterPerfil, filterStatus, filterNome]);

  const pagedUsers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  return (
    <PapperBlock title="Usuários" desc="Listar, editar e inativar usuários">
      <Helmet><title>Usuarios</title></Helmet>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        {message && <Typography color="primary">{message}</Typography>}
        {loading && <CircularProgress size={20} />}
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
        <TextField
          label="Pesquisar por nome"
          value={filterNome}
          onChange={(e) => { setFilterNome(e.target.value); setPage(0); }}
          fullWidth
        />
        <TextField
          select
          label="Perfil"
          value={filterPerfil}
          onChange={(e) => { setFilterPerfil(e.target.value); setPage(0); }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {perfis.map((p) => (
            <MenuItem key={p.id} value={p.id}>{p.descricao}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="ativo">Ativo</MenuItem>
          <MenuItem value="inativo">Inativo</MenuItem>
        </TextField>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Perfil</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedUsers.map(u => (
            <TableRow key={u.id} hover>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.Perfil?.descricao || u.perfil?.descricao || '-'}</TableCell>
              <TableCell>
                <Chip color={u.active ? 'success' : 'default'} label={u.active ? 'Ativo' : 'Inativo'} size="small" />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" variant="outlined" onClick={() => handleEdit(u)}>Editar</Button>
                  <Button size="small" variant="text" onClick={() => handleToggleActive(u)}>
                    {u.active ? 'Inativar' : 'Reativar'}
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={filteredUsers.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[5, 10, 20]}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Editar usuário</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Nome" value={form.name || ''} onChange={(e) => updateField('name', e.target.value)} fullWidth />
            <TextField label="Email" value={form.email || ''} onChange={(e) => updateField('email', e.target.value)} fullWidth />
            <TextField label="Username" value={form.username || ''} onChange={(e) => updateField('username', e.target.value)} fullWidth />
            <FormControlLabel
              control={(
                <Switch
                  checked={Boolean(form.changePassword)}
                  onChange={(e) => handleToggleChangePassword(e.target.checked)}
                />
              )}
              label="Atualizar senha"
            />
            {form.changePassword && (
              <FormControl fullWidth>
                <InputLabel id="usuarios-password-mode-label">Modo da senha</InputLabel>
                <Select
                  labelId="usuarios-password-mode-label"
                  value={form.passwordMode || 'auto'}
                  label="Modo da senha"
                  onChange={(e) => handlePasswordModeChange(e.target.value)}
                >
                  <MenuItem value="auto">Automatico</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                </Select>
              </FormControl>
            )}
            {form.changePassword && form.passwordMode === 'auto' && (
              <Box display="flex" gap={1}>
                <TextField
                  label="Senha gerada"
                  value={form.password || ''}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
                <Button variant="outlined" onClick={handleGeneratePassword}>
                  Gerar
                </Button>
              </Box>
            )}
            {form.changePassword && form.passwordMode === 'manual' && (
              <TextField
                label="Nova senha"
                type="password"
                value={form.password || ''}
                onChange={(e) => updateField('password', e.target.value)}
                fullWidth
              />
            )}
            <FormControl fullWidth>
              <InputLabel id="usuarios-perfis-label">Perfis</InputLabel>
              <Select
                labelId="usuarios-perfis-label"
                multiple
                value={form.perfilIds || []}
                onChange={(e) => updateField('perfilIds', e.target.value)}
                renderValue={(selected) => {
                  if (!selected || selected.length === 0) {
                    return 'Nenhum';
                  }
                  return perfis
                    .filter((perfil) => selected.includes(perfil.id))
                    .map((perfil) => perfil.descricao)
                    .join(', ');
                }}
              >
                {perfis.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Checkbox checked={(form.perfilIds || []).includes(p.id)} />
                    <ListItemText primary={p.descricao} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={form.active !== false} onChange={(e) => updateField('active', e.target.checked)} />}
              label="Ativo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </PapperBlock>
  );
};

export default UsersListPage;
