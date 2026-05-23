import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  ListItemIcon,
  Menu,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
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
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SyncIcon from '@mui/icons-material/Sync';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';

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
  const [syncingUserId, setSyncingUserId] = useState('');
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      perfilIds: Array.from(new Set([
        ...(user.perfis?.map((p) => p.id) || []),
        ...(user.perfilId ? [user.perfilId] : [])
      ])),
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

  const handleSyncUserMember = async (user) => {
    try {
      setLoading(true);
      setSyncingUserId(user.id);
      const response = await fetch(`${API_URL}/users/${user.id}/sync-member`, {
        method: 'POST',
        headers: headersAuth,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Erro ao sincronizar membro do usuario');
      }

      if (payload.status === 'linked') {
        setMessage(`Usuario vinculado ao membro ${payload.member?.fullName || ''} via ${payload.matchedBy}.`.trim());
      } else if (payload.status === 'already_linked') {
        setMessage(`Usuario ja estava vinculado ao membro ${payload.member?.fullName || ''}.`.trim());
      } else {
        setMessage('Nenhum membro correspondente foi encontrado para este usuario.');
      }

      await loadData();
    } catch (err) {
      setMessage(err.message || 'Erro ao sincronizar membro do usuario');
    } finally {
      setSyncingUserId('');
      setLoading(false);
    }
  };

  const handleSyncAllMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/users/sync-members`, {
        method: 'POST',
        headers: headersAuth,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Erro ao sincronizar membros dos usuarios');
      }

      setMessage(`Sincronizacao concluida. Vinculados: ${payload.linked || 0}, ja vinculados: ${payload.alreadyLinked || 0}, sem correspondencia: ${payload.notFound || 0}, falhas: ${payload.failed || 0}.`);
      await loadData();
    } catch (err) {
      setMessage(err.message || 'Erro ao sincronizar membros dos usuarios');
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

  const activeFilterCount = (filterNome ? 1 : 0) + (filterPerfil ? 1 : 0) + (filterStatus ? 1 : 0);

  const clearFilters = () => {
    setFilterNome('');
    setFilterPerfil('');
    setFilterStatus('');
    setPage(0);
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
      <Stack direction="row" justifyContent="flex-end" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Button
          variant="outlined"
          startIcon={<SyncIcon />}
          onClick={handleSyncAllMembers}
          disabled={loading}
        >
          Sincronizar membros
        </Button>
      </Stack>
      <Box display="flex" gap={1} flexWrap="wrap" alignItems="flex-start" mb={2}>
        <Accordion
          defaultExpanded
          disableGutters
          sx={{
            flex: 1,
            minWidth: 280,
            boxShadow: 'none',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.75 } }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Typography variant="subtitle2">Filtros</Typography>
              {activeFilterCount > 0 && (
                <Badge
                  badgeContent={activeFilterCount}
                  color="primary"
                  sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none' } }}
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <TextField
                  label="Pesquisar por nome"
                  size="small"
                  value={filterNome}
                  onChange={(e) => { setFilterNome(e.target.value); setPage(0); }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  label="Perfil"
                  size="small"
                  value={filterPerfil}
                  onChange={(e) => { setFilterPerfil(e.target.value); setPage(0); }}
                  fullWidth
                >
                  <MenuItem value="">Todos</MenuItem>
                  {perfis.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.descricao}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  label="Status"
                  size="small"
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                  fullWidth
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </TextField>
              </Grid>
              {activeFilterCount > 0 && (
                <Grid item xs={12}>
                  <Button size="small" onClick={clearFilters}>Limpar filtros</Button>
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>
      {loading && users.length > 0 && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Perfil</TableCell>
              <TableCell>Membro</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && users.length === 0 && (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton variant="text" /></TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {!loading && pagedUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <FilterListOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Nenhum usuário encontrado.
                  </Typography>
                  {activeFilterCount > 0 && (
                    <Button size="small" onClick={clearFilters} sx={{ mt: 1 }}>
                      Limpar filtros
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
            {pagedUsers.map(u => (
              <TableRow key={u.id} hover>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.Perfil?.descricao || u.perfil?.descricao || '-'}</TableCell>
                <TableCell>
                  {u.linkedMember ? (
                    <Stack spacing={0.5}>
                      <Chip color="primary" label="Vinculado" size="small" />
                      <Typography variant="caption" color="textSecondary">
                        {u.linkedMember.fullName}
                      </Typography>
                    </Stack>
                  ) : (
                    <Chip color="warning" variant="outlined" label="Sem membro" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Chip color={u.active ? 'success' : 'default'} label={u.active ? 'Ativo' : 'Inativo'} size="small" />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Ações">
                    <span>
                      <IconButton
                        size="small"
                        disabled={loading}
                        onClick={(e) => setRowMenuAnchor({ anchorEl: e.currentTarget, userId: u.id })}
                      >
                        {syncingUserId === u.id ? <CircularProgress size={16} /> : <MoreVertIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <TablePagination
        component="div"
        count={filteredUsers.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[5, 10, 20]}
        labelRowsPerPage={isMobile ? 'Linhas:' : 'Linhas por página:'}
      />

      <Menu
        anchorEl={rowMenuAnchor?.anchorEl}
        open={Boolean(rowMenuAnchor)}
        onClose={() => setRowMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {(() => {
          const u = pagedUsers.find((user) => user.id === rowMenuAnchor?.userId);
          if (!u) return null;
          return [
            <MenuItem
              key="editar"
              onClick={() => { setRowMenuAnchor(null); handleEdit(u); }}
            >
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Editar</ListItemText>
            </MenuItem>,
            <MenuItem
              key="sync"
              disabled={syncingUserId === u.id}
              onClick={() => { setRowMenuAnchor(null); handleSyncUserMember(u); }}
            >
              <ListItemIcon><SyncIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Sincronizar membro</ListItemText>
            </MenuItem>,
            <Divider key="div" />,
            <MenuItem
              key="toggle"
              onClick={() => { setRowMenuAnchor(null); handleToggleActive(u); }}
              sx={{ color: u.active ? 'error.main' : 'success.main' }}
            >
              <ListItemIcon>
                {u.active
                  ? <ToggleOffIcon fontSize="small" sx={{ color: 'error.main' }} />
                  : <ToggleOnIcon fontSize="small" sx={{ color: 'success.main' }} />}
              </ListItemIcon>
              <ListItemText>{u.active ? 'Inativar' : 'Reativar'}</ListItemText>
            </MenuItem>,
          ];
        })()}
      </Menu>

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
      <Notification message={message} close={() => setMessage('')} />
    </PapperBlock>
  );
};

export default UsersListPage;
