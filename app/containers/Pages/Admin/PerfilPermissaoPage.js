import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock } from 'dan-components';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

const fallbackHost = `${window.location.protocol}//${window.location.host}`;
const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'https://portal.iecg.com.br';
const USERS_PER_PAGE = 12;

const PerfilPermissaoPage = () => {
  const [perfis, setPerfis] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [permissaoNome, setPermissaoNome] = useState('');
  const [permissaoDescricao, setPermissaoDescricao] = useState('');
  const [aba, setAba] = useState(0);
  const [selecionado, setSelecionado] = useState('');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [usuarioPagina, setUsuarioPagina] = useState(1);
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState([]);
  const [permissoesUsuarioSelecionadas, setPermissoesUsuarioSelecionadas] = useState([]);
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
      const [perfisResp, permissoesResp, usersResp] = await Promise.all([
        fetch(`${API_URL}/perfil`, { headers: headersAuth }),
        fetch(`${API_URL}/permissoes`, { headers: headersAuth }),
        fetch(`${API_URL}/users`, { headers: headersAuth }),
      ]);

      if (!perfisResp.ok || !permissoesResp.ok || !usersResp.ok) {
        throw new Error('Falha ao carregar dados');
      }

      const perfisData = await perfisResp.json();
      const permissoesData = await permissoesResp.json();
      const usersData = await usersResp.json();

      setPerfis(perfisData);
      setPermissoes(permissoesData);
      setUsers(usersData);

      if (selecionado) {
        const perfilAtualizado = perfisData.find((perfil) => perfil.id === selecionado);
        setPermissoesSelecionadas(perfilAtualizado?.permissoes?.map((perm) => perm.id) || []);
      }

      if (usuarioSelecionado) {
        const usuarioAtualizado = usersData.find((user) => user.id === usuarioSelecionado);
        setPermissoesUsuarioSelecionadas(usuarioAtualizado?.permissoesDiretas?.map((perm) => perm.id) || []);
      }

      setMessage('');
    } catch (err) {
      setMessage('Nao foi possivel carregar perfis, usuarios e permissoes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const criarPerfil = async () => {
    if (!descricao.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/perfil`, {
        method: 'POST',
        headers: headersAuth,
        body: JSON.stringify({ descricao: descricao.trim() }),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar perfil');
      }

      setDescricao('');
      setMessage('Perfil criado com sucesso.');
      await carregarDados();
    } catch (err) {
      setMessage('Nao foi possivel criar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const criarPermissao = async () => {
    const nome = String(permissaoNome || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

    if (!nome) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/permissoes`, {
        method: 'POST',
        headers: headersAuth,
        body: JSON.stringify({
          nome,
          descricao: String(permissaoDescricao || '').trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar permissao');
      }

      setPermissaoNome('');
      setPermissaoDescricao('');
      setMessage('Permissao criada com sucesso.');
      await carregarDados();
    } catch (err) {
      setMessage('Nao foi possivel criar a permissao.');
    } finally {
      setSaving(false);
    }
  };

  const salvarPermissoesPerfil = async () => {
    if (!selecionado) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/perfil/${selecionado}/permissoes`, {
        method: 'PUT',
        headers: headersAuth,
        body: JSON.stringify({ permissoesIds: permissoesSelecionadas }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar permissoes do perfil');
      }

      setMessage('Permissoes do perfil atualizadas.');
      await carregarDados();
    } catch (err) {
      setMessage('Nao foi possivel salvar as permissoes do perfil.');
    } finally {
      setSaving(false);
    }
  };

  const salvarPermissoesUsuario = async () => {
    if (!usuarioSelecionado) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/users/${usuarioSelecionado}`, {
        method: 'PUT',
        headers: headersAuth,
        body: JSON.stringify({ permissaoIds: permissoesUsuarioSelecionadas }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar permissoes do usuario');
      }

      setMessage('Permissoes diretas do usuario atualizadas.');
      await carregarDados();
    } catch (err) {
      setMessage('Nao foi possivel salvar as permissoes diretas do usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelecionaPerfil = (idPerfil) => {
    setSelecionado(idPerfil);
    const perfil = perfis.find((item) => item.id === idPerfil);
    setPermissoesSelecionadas(perfil?.permissoes?.map((perm) => perm.id) || []);
  };

  const handleSelecionaUsuario = (idUsuario) => {
    setUsuarioSelecionado(idUsuario);
    const usuario = users.find((item) => item.id === idUsuario);
    setPermissoesUsuarioSelecionadas(usuario?.permissoesDiretas?.map((perm) => perm.id) || []);
  };

  const handleFiltroUsuarioChange = (event) => {
    setUsuarioFiltro(event.target.value);
    setUsuarioPagina(1);
  };

  const togglePermissao = (id, setter) => {
    setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const perfilSelecionadoObj = useMemo(
    () => perfis.find((perfil) => perfil.id === selecionado),
    [perfis, selecionado]
  );

  const usuarioSelecionadoObj = useMemo(
    () => users.find((user) => user.id === usuarioSelecionado),
    [users, usuarioSelecionado]
  );

  const usuariosFiltrados = useMemo(() => {
    const filtro = usuarioFiltro.trim().toLowerCase();
    if (!filtro) return users;
    return users.filter((user) => {
      const nome = String(user.name || '').toLowerCase();
      const email = String(user.email || '').toLowerCase();
      const perfil = String(user.Perfil?.descricao || user.perfil?.descricao || '').toLowerCase();
      return nome.includes(filtro) || email.includes(filtro) || perfil.includes(filtro);
    });
  }, [users, usuarioFiltro]);

  const totalPaginasUsuarios = Math.max(1, Math.ceil(usuariosFiltrados.length / USERS_PER_PAGE));
  const usuariosPaginados = useMemo(() => {
    const paginaAtual = Math.min(usuarioPagina, totalPaginasUsuarios);
    const inicio = (paginaAtual - 1) * USERS_PER_PAGE;
    return usuariosFiltrados.slice(inicio, inicio + USERS_PER_PAGE);
  }, [usuarioPagina, usuariosFiltrados, totalPaginasUsuarios]);

  const permissoesHerdadasUsuario = useMemo(
    () => usuarioSelecionadoObj?.Perfil?.permissoes || usuarioSelecionadoObj?.perfil?.permissoes || [],
    [usuarioSelecionadoObj]
  );

  const permissoesDiretasUsuario = useMemo(
    () => usuarioSelecionadoObj?.permissoesDiretas || [],
    [usuarioSelecionadoObj]
  );

  const permissoesEfetivasUsuario = useMemo(() => {
    const permissaoMap = new Map();
    [...permissoesHerdadasUsuario, ...permissoesDiretasUsuario].forEach((perm) => {
      if (perm?.id) {
        permissaoMap.set(perm.id, perm);
      }
    });
    return Array.from(permissaoMap.values());
  }, [permissoesDiretasUsuario, permissoesHerdadasUsuario]);

  return (
    <PapperBlock title="Perfis e Permissoes" desc="Gerencie permissoes por perfil e tambem por usuario">
      <Helmet>
        <title>Perfis e Permissoes</title>
      </Helmet>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        {message && <Typography color="primary">{message}</Typography>}
        {(loading || saving) && <CircularProgress size={20} />}
      </Stack>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={aba} onChange={(_, nextValue) => setAba(nextValue)} variant="fullWidth">
          <Tab label="Permissoes por perfil" />
          <Tab label="Permissoes por usuario" />
        </Tabs>
      </Paper>

      {aba === 0 && (
        <Box display="flex" gap={3} flexWrap="wrap">
          <Paper sx={{ p: 2, minWidth: 280, flex: 1 }}>
            <Typography variant="h6" gutterBottom>Criar novo perfil</Typography>
            <TextField
              fullWidth
              label="Descricao do perfil"
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
              {perfis.map((perfil) => (
                <ListItemButton
                  key={perfil.id}
                  selected={perfil.id === selecionado}
                  onClick={() => handleSelecionaPerfil(perfil.id)}
                >
                  <ListItemText
                    primary={perfil.descricao}
                    secondary={`${perfil.permissoes?.length || 0} permissoes`}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 280, flex: 1 }}>
            <Typography variant="h6" gutterBottom>Criar nova permissao</Typography>
            <TextField
              fullWidth
              label="Nome tecnico"
              helperText="Ex.: RELATORIO_FINANCEIRO ou CHECKIN_MASTER"
              value={permissaoNome}
              onChange={(e) => setPermissaoNome(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Descricao"
              value={permissaoDescricao}
              onChange={(e) => setPermissaoDescricao(e.target.value)}
              margin="normal"
              multiline
              minRows={3}
            />
            <Button variant="contained" color="primary" onClick={criarPermissao} disabled={saving}>
              Criar permissao
            </Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>Permissoes cadastradas</Typography>
            <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
              {permissoes.map((perm) => (
                <ListItemButton key={perm.id} disableRipple>
                  <ListItemText
                    primary={perm.nome}
                    secondary={perm.descricao || 'Sem descricao'}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 320, flex: 2 }}>
            <Typography variant="h6" gutterBottom>Permissoes do perfil</Typography>
            <TextField
              select
              fullWidth
              label="Perfil"
              value={selecionado}
              onChange={(e) => handleSelecionaPerfil(e.target.value)}
              margin="normal"
            >
              {perfis.map((perfil) => (
                <MenuItem key={perfil.id} value={perfil.id}>{perfil.descricao}</MenuItem>
              ))}
            </TextField>

            {perfilSelecionadoObj && (
              <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                {perfilSelecionadoObj.permissoes?.map((perm) => (
                  <Chip key={perm.id} label={perm.nome} size="small" />
                ))}
              </Stack>
            )}

            <Typography variant="subtitle1" gutterBottom>Permissoes disponiveis</Typography>
            <FormGroup>
              {permissoes.map((perm) => (
                <FormControlLabel
                  key={perm.id}
                  control={(
                    <Checkbox
                      checked={permissoesSelecionadas.includes(perm.id)}
                      onChange={() => togglePermissao(perm.id, setPermissoesSelecionadas)}
                      color="primary"
                    />
                  )}
                  label={`${perm.nome} - ${perm.descricao || ''}`}
                />
              ))}
            </FormGroup>
            <Button variant="contained" color="primary" onClick={salvarPermissoesPerfil} disabled={!selecionado || saving}>
              Salvar permissoes
            </Button>
          </Paper>
        </Box>
      )}

      {aba === 1 && (
        <Box display="flex" gap={3} flexWrap="wrap">
          <Paper sx={{ p: 2, minWidth: 320, flex: 1 }}>
            <Typography variant="h6" gutterBottom>Usuarios</Typography>
            <TextField
              fullWidth
              label="Buscar usuario"
              placeholder="Digite nome, email ou perfil"
              value={usuarioFiltro}
              onChange={handleFiltroUsuarioChange}
              margin="normal"
            />

            <TextField
              select
              fullWidth
              label="Usuario selecionado"
              value={usuarioSelecionado}
              onChange={(e) => handleSelecionaUsuario(e.target.value)}
              margin="normal"
              helperText={`${usuariosFiltrados.length} usuario(s) encontrado(s)`}
            >
              {usuariosFiltrados.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </MenuItem>
              ))}
            </TextField>

            <List dense>
              {usuariosPaginados.map((user) => (
                <ListItemButton
                  key={user.id}
                  selected={user.id === usuarioSelecionado}
                  onClick={() => handleSelecionaUsuario(user.id)}
                >
                  <ListItemText
                    primary={user.name || 'Usuario sem nome'}
                    secondary={`${user.email || 'Sem email'}${user.Perfil?.descricao ? ` - Perfil: ${user.Perfil.descricao}` : ''}`}
                  />
                </ListItemButton>
              ))}
              {!usuariosPaginados.length && (
                <ListItemText
                  primary="Nenhum usuario encontrado"
                  secondary="Ajuste o filtro para localizar outro usuario."
                />
              )}
            </List>

            {totalPaginasUsuarios > 1 && (
              <Stack alignItems="center" sx={{ mt: 2 }}>
                <Pagination
                  page={Math.min(usuarioPagina, totalPaginasUsuarios)}
                  count={totalPaginasUsuarios}
                  color="primary"
                  onChange={(_event, page) => setUsuarioPagina(page)}
                />
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2, minWidth: 340, flex: 2 }}>
            <Typography variant="h6" gutterBottom>Permissoes diretas do usuario</Typography>

            {usuarioSelecionadoObj && (
              <Stack spacing={2} mb={3}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Permissoes herdadas do perfil</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {permissoesHerdadasUsuario.length ? permissoesHerdadasUsuario.map((perm) => (
                      <Chip key={`herdada-${perm.id}`} label={perm.nome} size="small" variant="outlined" />
                    )) : (
                      <Typography variant="body2" color="text.secondary">Este usuario nao herda permissoes de perfil.</Typography>
                    )}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Permissoes diretas atuais</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {permissoesDiretasUsuario.length ? permissoesDiretasUsuario.map((perm) => (
                      <Chip key={`direta-${perm.id}`} label={perm.nome} size="small" color="primary" />
                    )) : (
                      <Typography variant="body2" color="text.secondary">Nenhuma permissao direta concedida.</Typography>
                    )}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Permissoes efetivas</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {permissoesEfetivasUsuario.length ? permissoesEfetivasUsuario.map((perm) => (
                      <Chip key={`efetiva-${perm.id}`} label={perm.nome} size="small" />
                    )) : (
                      <Typography variant="body2" color="text.secondary">O usuario ainda nao possui permissoes efetivas.</Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            )}

            <Typography variant="subtitle1" gutterBottom>Selecionar permissoes diretas</Typography>
            <FormGroup>
              {permissoes.map((perm) => (
                <FormControlLabel
                  key={perm.id}
                  control={(
                    <Checkbox
                      checked={permissoesUsuarioSelecionadas.includes(perm.id)}
                      onChange={() => togglePermissao(perm.id, setPermissoesUsuarioSelecionadas)}
                      color="primary"
                    />
                  )}
                  label={`${perm.nome} - ${perm.descricao || ''}`}
                />
              ))}
            </FormGroup>

            <Button variant="contained" color="primary" onClick={salvarPermissoesUsuario} disabled={!usuarioSelecionado || saving}>
              Salvar permissoes do usuario
            </Button>
          </Paper>
        </Box>
      )}
    </PapperBlock>
  );
};

export default PerfilPermissaoPage;
