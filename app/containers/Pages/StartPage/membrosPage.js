import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Box,
  Stack,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PapperBlock } from 'dan-components';

const fallbackHost = `${window.location.protocol}//${window.location.host}`;
const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'https://portal.iecg.com.br';
const MEMBER_PROFILE_ID = '7d47d03a-a7aa-4907-b8b9-8fcf87bd52dc';

const initialFormState = {
  name: '',
  email: '',
  telefone: ''
};

const MembrosPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [message, setMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialFormState);

  const token = localStorage.getItem('token');
  const headersAuth = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: headersAuth
      });
      if (!response.ok) {
        throw new Error('Não foi possível carregar os membros');
      }
      const data = await response.json();
      const filtered = Array.isArray(data)
        ? data.filter((user) => {
            const hasMainPerfil = user.perfilId === MEMBER_PROFILE_ID;
            const hasJoinedPerfil = Array.isArray(user.perfis) && user.perfis.some((perfil) => perfil.id === MEMBER_PROFILE_ID);
            return hasMainPerfil || hasJoinedPerfil;
          })
        : [];
      setMembers(filtered);
    } catch (err) {
      setMessage(err.message || 'Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const name = (member.name || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [members, search]);

  const pagedMembers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredMembers.slice(start, start + rowsPerPage);
  }, [filteredMembers, page, rowsPerPage]);

  const resetForm = () => {
    setForm(initialFormState);
  };

  const handleCreateMember = async () => {
    if (!form.name || !form.email) {
      setMessage('Nome e e-mail são obrigatórios');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        telefone: form.telefone,
        perfilId: MEMBER_PROFILE_ID,
        active: true
      };
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: headersAuth,
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || 'Erro ao cadastrar membro');
      }
      setDialogOpen(false);
      resetForm();
      await loadMembers();
      setMessage('Membro cadastrado com sucesso');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <PapperBlock title="Membros" desc="Lista de membros">
      <Helmet>
        <title>Membros</title>
      </Helmet>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" mb={2} spacing={2}>
        <TextField
          fullWidth
          label="Pesquisar por nome ou e-mail"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Cadastrar membro
        </Button>
      </Stack>
      {message && (
        <Box mb={2}>
          <Typography color="primary">{message}</Typography>
        </Box>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Telefone</TableCell>
            <TableCell>Username</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedMembers.map((member) => (
            <TableRow hover key={member.id}>
              <TableCell>{member.name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>{member.telefone || '-'}</TableCell>
              <TableCell>{member.username || '-'}</TableCell>
              <TableCell>
                <Chip
                  label={member.active ? 'Ativo' : 'Inativo'}
                  color={member.active ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
          {!pagedMembers.length && !loading && (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography color="textSecondary">Nenhum membro encontrado.</Typography>
              </TableCell>
            </TableRow>
          )}
          {loading && (
            <TableRow>
              <TableCell colSpan={5}>
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={filteredMembers.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 20]}
      />

      <Dialog fullWidth maxWidth="sm" open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Cadastrar membro</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nome"
              value={form.name}
              required
              onChange={(event) => handleFormChange('name', event.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              value={form.email}
              required
              onChange={(event) => handleFormChange('email', event.target.value)}
              fullWidth
            />
            <TextField
              label="Telefone"
              value={form.telefone}
              onChange={(event) => handleFormChange('telefone', event.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleCreateMember} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </PapperBlock>
  );
};

export default MembrosPage;
