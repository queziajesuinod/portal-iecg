import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Box,
  Stack,
  Grid,
  Typography,
  Paper,
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
  CircularProgress,
  Avatar,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { PapperBlock } from 'dan-components';
import { useHistory } from 'react-router-dom';
import { fetchGeocode } from '../../../utils/googleGeocode';

const fallbackHost = `${window.location.protocol}//${window.location.host}`;
const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'https://portal.iecg.com.br';
const MEMBER_PROFILE_ID = '7d47d03a-a7aa-4907-b8b9-8fcf87bd52dc';

const ESCOLARIDADE_OPTIONS = [
  'ANALFABETO',
  'ENSINO FUNDAMENTAL INCOMPLETO',
  'ENSINO FUNDAMENTAL COMPLETO',
  'ENSINO MÉDIO INCOMPLETO',
  'ENSINO MÉDIO COMPLETO',
  'ENSINO SUPERIOR INCOMPLETO',
  'ENSINO SUPERIOR COMPLETO'
];
const ESTADO_CIVIL_OPTIONS = [
  'Solteiro',
  'Casado',
  'Viúvo',
  'Divorciado'
];


const initialFormState = {
  name: '',
  email: '',
  telefone: '',
  endereco: '',
  numero: '',
  bairro: '',
  cep: '',
  escolaridade: '',
  nome_esposo: '',
  cpf: '',
  data_nascimento: '',
  estado_civil: '',
  profissao: '',
  frequenta_celula: false,
  batizado: false,
  encontro: false,
  escolas: ''
};


const formatPhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 10) {
    return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, d1, d2, d3) => {
      if (!d2) return d1 ? `(${d1}` : '';
      if (!d3) return `(${d1}) ${d2}`;
      return `(${d1}) ${d2}-${d3}`;
    });
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
};

const formatCPF = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, (_, a, b, c, d) => {
    return d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`;
  });
};
const MembrosPage = () => {
  const history = useHistory();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [message, setMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [geoLoading, setGeoLoading] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState('');

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

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const nameA = (a?.name || '').trim();
      const nameB = (b?.name || '').trim();
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    });
  }, [members]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedMembers;
    return sortedMembers.filter((member) => {
      const name = (member.name || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [sortedMembers, search]);

  const pagedMembers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredMembers.slice(start, start + rowsPerPage);
  }, [filteredMembers, page, rowsPerPage]);

  const resetForm = () => {
    setForm(initialFormState);
  };

  const handleCreateMember = async () => {
    const missingFields = [];
    if (!form.name) missingFields.push('Nome');
    if (!form.email) missingFields.push('E-mail');
    if (!form.telefone) missingFields.push('Telefone');
    if (!form.nome_esposo) missingFields.push('Nome do c?njuge');
    if (!form.cpf) missingFields.push('CPF');
    if (!form.data_nascimento) missingFields.push('Data de nascimento');
    if (!form.estado_civil) missingFields.push('Estado civil');
    if (!form.profissao) missingFields.push('Profiss?o');
    if (!form.escolas) missingFields.push('Escolas');
    if (!form.escolaridade) missingFields.push('Escolaridade');
    if (!form.cep) missingFields.push('CEP');
    if (!form.endereco) missingFields.push('Endere?o');
    if (!form.numero) missingFields.push('Número');
    if (!form.bairro) missingFields.push('Bairro');
    if (missingFields.length) {
      setMessage(`Preencha os campos obrigat?rios: ${missingFields.join(', ')}`);
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        telefone: form.telefone,
        endereco: form.endereco,
        numero: form.numero,
        bairro: form.bairro,
        escolaridade: form.escolaridade,
        cep: form.cep,
        nome_esposo: form.nome_esposo,
        cpf: form.cpf,
        data_nascimento: form.data_nascimento,
        estado_civil: form.estado_civil,
        profissao: form.profissao,
        frequenta_celula: form.frequenta_celula,
        batizado: form.batizado,
        encontro: form.encontro,
        escolas: form.escolas,
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

  const handleOpenDetails = (member) => {
    history.push(`/app/start/membros/detalhes?id=${member.id}`);
  };

  const handleToggleMemberStatus = async (member, forcedActive) => {
    const nextActive = typeof forcedActive === 'boolean' ? forcedActive : !member.active;
    setUpdatingMemberId(member.id);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/users/${member.id}`, {
        method: 'PUT',
        headers: headersAuth,
        body: JSON.stringify({ active: nextActive })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || 'Erro ao atualizar status do membro');
      }

      setMembers((prev) => prev.map((item) => (
        item.id === member.id ? { ...item, active: nextActive } : item
      )));
      setMessage(nextActive ? 'Membro ativado com sucesso' : 'Membro inativado com sucesso');
    } catch (error) {
      setMessage(error.message || 'Erro ao atualizar status do membro');
    } finally {
      setUpdatingMemberId('');
    }
  };

  const handleCompleteAddressFromCep = async () => {
    const rawCep = (form.cep || '').replace(/\D/g, '');
    if (rawCep.length < 8) {
      setMessage('Informe um CEP válido para completar o endereço');
      return;
    }
    setGeoLoading(true);
    setMessage('');
    try {
      const geocodeResult = await fetchGeocode(rawCep);
      if (!geocodeResult) {
        setMessage('Nenhum resultado encontrado para o CEP informado');
        return;
      }
      setForm((prev) => ({
        ...prev,
        endereco: geocodeResult.logradouro || prev.endereco,
        numero: geocodeResult.numeroEncontrado || prev.numero,
        bairro: geocodeResult.bairro || prev.bairro,
        cep: geocodeResult.cepEncontrado || prev.cep
      }));
      
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
     
    } finally {
      setGeoLoading(false);
    }
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
          <TableCell></TableCell>
          <TableCell>Nome</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Nome do cônjuge</TableCell>
          <TableCell>Telefone</TableCell>
          <TableCell>Líder</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Ações</TableCell>
        </TableRow>
        </TableHead>
        <TableBody>
          {pagedMembers.map((member) => (
            <TableRow hover key={member.id}>
              <TableCell>
                <Avatar
                  src={member.image || 'https://via.placeholder.com/40'}
                  alt={member.name}
                  sx={{ width: 32, height: 32 }}
                />
              </TableCell>
              <TableCell>{member.name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>{member.nome_esposo || '-'}</TableCell>
              <TableCell>{member.telefone || '-'}</TableCell>
              <TableCell>
                <Chip
                  label={member.is_lider_celula ? 'Líder' : 'Membro'}
                  color={member.is_lider_celula ? 'primary' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <FormControlLabel
                  sx={{ m: 0 }}
                  control={(
                    <Switch
                      size="small"
                      color="primary"
                      checked={Boolean(member.active)}
                      disabled={updatingMemberId === member.id}
                      onChange={(event) => {
                        const nextActive = event.target.checked;
                        handleToggleMemberStatus(member, nextActive);
                      }}
                    />
                  )}
                  label={updatingMemberId === member.id ? 'Salvando...' : member.active ? 'Ativo' : 'Inativo'}
                />
              </TableCell>
              <TableCell>
                <Tooltip title="Detalhes do membro">
                  <IconButton size="small" onClick={() => handleOpenDetails(member)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {!pagedMembers.length && !loading && (
            <TableRow>
              <TableCell colSpan={8}>
                <Typography color="textSecondary">Nenhum membro encontrado.</Typography>
              </TableCell>
            </TableRow>
          )}
          {loading && (
            <TableRow>
              <TableCell colSpan={8}>
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

      <Dialog fullWidth maxWidth="md" open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Cadastrar membro</DialogTitle>
        <DialogContent>
          <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="textSecondary">Dados pessoais</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Nome"
                    value={form.name}
                    required
                    onChange={(event) => handleFormChange('name', event.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Email"
                    type="email"
                    value={form.email}
                    required
                    onChange={(event) => handleFormChange('email', event.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Telefone"
                    value={form.telefone}
                    required
                    onChange={(event) => handleFormChange('telefone', formatPhone(event.target.value))}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="CPF"
                    value={form.cpf}
                    required
                    onChange={(event) => handleFormChange('cpf', formatCPF(event.target.value))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Data de nascimento"
                    type="date"
                    value={form.data_nascimento}
                    required
                    onChange={(event) => handleFormChange('data_nascimento', event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Estado civil"
                    value={form.estado_civil}
                    required
                    onChange={(event) => handleFormChange('estado_civil', event.target.value)}
                    fullWidth
                  >
                    {ESTADO_CIVIL_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Profissão"
                    value={form.profissao}
                    required
                    onChange={(event) => handleFormChange('profissao', event.target.value)}
                    fullWidth
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Escolaridade"
                    value={form.escolaridade}
                    required
                    onChange={(event) => handleFormChange('escolaridade', event.target.value)}
                    helperText="Informe a escolaridade do membro"
                    fullWidth
                  >
                    {ESCOLARIDADE_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Frequenta célula"
                    value={form.frequenta_celula ? 'true' : 'false'}
                    onChange={(event) => handleFormChange('frequenta_celula', event.target.value === 'true')}
                    fullWidth
                  >
                    <MenuItem value='true'>Sim</MenuItem>
                    <MenuItem value='false'>Não</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Batizado"
                    value={form.batizado ? 'true' : 'false'}
                    onChange={(event) => handleFormChange('batizado', event.target.value === 'true')}
                    fullWidth
                  >
                    <MenuItem value='true'>Sim</MenuItem>
                    <MenuItem value='false'>Não</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Encontro"
                    value={form.encontro ? 'true' : 'false'}
                    onChange={(event) => handleFormChange('encontro', event.target.value === 'true')}
                    fullWidth
                  >
                    <MenuItem value='true'>Sim</MenuItem>
                    <MenuItem value='false'>Não</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="textSecondary">Endere?o</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="CEP"
                    value={form.cep}
                    required
                    onChange={(event) => handleFormChange('cep', event.target.value)}
                    helperText="Preencha o CEP antes de completar"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleCompleteAddressFromCep}
                    disabled={geoLoading}
                    fullWidth
                    sx={{ height: '100%' }}
                  >
                    {geoLoading ? 'Buscando CEP...' : 'Completar pelo CEP'}
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Bairro"
                    value={form.bairro}
                    required
                    onChange={(event) => handleFormChange('bairro', event.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Número"
                    value={form.numero}
                    required
                    onChange={(event) => handleFormChange('numero', event.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    label="Endereço"
                    value={form.endereco}
                    required
                    onChange={(event) => handleFormChange('endereco', event.target.value)}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
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
