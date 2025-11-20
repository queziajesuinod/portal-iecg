import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Pagination
} from '@mui/material';
import { Add, Visibility, Delete as DeleteIcon } from '@mui/icons-material';
import { PapperBlock, Notification } from 'dan-components';

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

const formInicial = {
  titulo: '',
  dataReferencia: new Date().toISOString().slice(0, 10),
  observacoes: ''
};

const formatDateBr = (value) => {
  if (!value) return '-';
  const parts = value.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch (error) {
    return value;
  }
};

const AttendanceListPage = () => {
  const history = useHistory();
  const API_URL = resolveApiUrl();

  const [listas, setListas] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const fetchListas = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: rowsPerPage
      }).toString();
      const response = await fetch(`${API_URL}/mia/attendance?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar listas de presença');
      }
      const data = await response.json();
      setListas(data.registros || []);
      setTotalPages(data.totalPaginas || 1);
    } catch (error) {
      console.error(error);
      setNotification(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListas();
  }, [page]);

  const handleSubmit = async () => {
    if (!form.titulo || !form.dataReferencia) {
      setNotification('Informe título e data para criar a lista.');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const payload = {
        ...form
      };
      const response = await fetch(`${API_URL}/mia/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao criar lista');
      }
      setNotification('Lista criada com sucesso!');
      setOpenDialog(false);
      setForm(formInicial);
      fetchListas();
    } catch (error) {
      console.error(error);
      setNotification(error.message);
    }
  };

  const handleDelete = async (lista) => {
    if (!window.confirm('Excluir esta lista? Essa ação só é permitida enquanto não houver presenças salvas.')) {
      return;
    }
    const token = localStorage.getItem('token');
    setLoadingDelete(true);
    try {
      const response = await fetch(`${API_URL}/mia/attendance/${lista.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.status === 204) {
        setNotification('Lista excluida com sucesso!');
        fetchListas();
        return;
      }
      let errorMessage = 'Nao foi possivel excluir a lista.';
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        errorMessage = data?.erro || errorMessage;
      } else {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      }
      throw new Error(errorMessage);
    } catch (error) {
      console.error(error);
      setNotification(error.message);
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div>
      <Helmet>
        <title>Listas de Presen��a - MIA</title>
      </Helmet>

      <PapperBlock title="Listas de Presença" desc="Controle as Presenças do MIA">
        <Toolbar sx={{ justifyContent: 'space-between', padding: 0, marginBottom: 2 }}>
          <Typography variant="h6">
            {loading ? 'Carregando...' : `${listas.length} listas encontradas`}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Nova lista
          </Button>
        </Toolbar>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Observações</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nenhuma lista criada ainda.
                  </TableCell>
                </TableRow>
              )}
              {listas.map((lista) => (
                <TableRow key={lista.id} hover>
                  <TableCell>{lista.titulo}</TableCell>
                  <TableCell>
                    {formatDateBr(lista.dataReferencia)}
                  </TableCell>
                  <TableCell>
                    {lista.observacoes || '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => history.push(`/app/mia/listas-presenca/${lista.id}`)}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      color="error"
                      disabled={loadingDelete}
                      onClick={() => handleDelete(lista)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={2} display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </PapperBlock>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nova lista de presença</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Título"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              required
            />
            <TextField
              label="Data"
              type="date"
              value={form.dataReferencia}
              onChange={(e) => setForm({ ...form, dataReferencia: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Observações"
              multiline
              minRows={3}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default AttendanceListPage;
