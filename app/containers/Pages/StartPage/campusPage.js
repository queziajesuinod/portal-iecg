import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Toolbar, Typography, IconButton, Tooltip, TextField, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Helmet } from 'react-helmet';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import useStyles from 'dan-components/Tables/tableStyle-jss';
import Notification from 'dan-components/Notification/Notification';
import { fetchGeocode } from '../../../utils/googleGeocode';

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

const API_URL = resolveApiUrl();

const CampusPage = () => {
  const { classes, cx } = useStyles();

  const [campi, setCampi] = useState([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [notification, setNotification] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', endereco: '', bairro: '', cidade: '', estado: '', pastoresResponsaveis: '', lat: '', lon: '' });
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem('token');

  const fetchCampi = async () => {
    try {
      const res = await fetch(`${API_URL}/start/campus`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setCampi(lista);
      setTotalRegistros(lista.length);
    } catch (err) {
      console.error('Erro ao carregar campus:', err);
    }
  };

  useEffect(() => {
    fetchCampi();
  }, []);

  const handleEdit = (campus) => {
    setEditingId(campus.id);
    setForm({
      nome: campus.nome || '',
      endereco: campus.endereco || '',
      bairro: campus.bairro || '',
      cidade: campus.cidade || '',
      estado: campus.estado || '',
      pastoresResponsaveis: campus.pastoresResponsaveis || '',
      lat: campus.lat || '',
      lon: campus.lon || ''
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este campus?')) return;
    try {
      await fetch(`${API_URL}/start/campus/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotification('Campus excluído com sucesso');
      fetchCampi();
    } catch (err) {
      setNotification('Erro ao excluir campus');
    }
  };

  const handleSubmit = async () => {
    if (!form.nome) {
      setNotification('Nome é obrigatório');
      return;
    }
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/start/campus/${editingId}` : `${API_URL}/start/campus`;
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data?.message || 'Erro ao salvar campus');
      }
      setNotification('Campus salvo com sucesso');
      setOpen(false);
      setEditingId(null);
      setForm({ nome: '', endereco: '', bairro: '', cidade: '', estado: '', pastoresResponsaveis: '', lat: '', lon: '' });
      fetchCampi();
    } catch (err) {
      setNotification(err.message);
    }
  };

  const buscarCoordenadas = async () => {
    if (!form.endereco) {
      setNotification('Preencha o endere�o antes de buscar coordenadas.');
      return;
    }
    try {
      const query = [form.endereco, form.bairro, form.cidade].filter(Boolean).join(' ');
      const geocodeResult = await fetchGeocode(query);
      if (geocodeResult) {
        setForm((prev) => ({ ...prev, lat: geocodeResult.lat, lon: geocodeResult.lon }));
        setNotification('Coordenadas preenchidas com sucesso!');
      } else {
        setNotification('Nenhum resultado encontrado para esse endere�o.');
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      setNotification('Erro ao buscar coordenadas.');
    }
  };

return (
    <div>
      <Helmet>
        <title>Campus</title>
      </Helmet>

      <Toolbar className={classes.toolbar} sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setOpen(true);
            setEditingId(null);
            setForm({ nome: '', endereco: '', bairro: '', cidade: '', estado: '', pastoresResponsaveis: '', lat: '', lon: '' });
          }}
        >
          Novo Campus
        </Button>
        <Typography variant="body2" color="textSecondary">
          Total de registros: {totalRegistros}
        </Typography>
      </Toolbar>

      <TableContainer component={Paper} className={classes.rootTable}>
        <Table className={cx(classes.table, classes.stripped)}>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Endereço</TableCell>
              <TableCell>Pastores Responsáveis</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campi.length > 0 ? (
              campi.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.nome}</TableCell>
                  <TableCell>{c.endereco}</TableCell>
                  <TableCell>{c.pastoresResponsaveis}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Editar">
                        <IconButton color="primary" onClick={() => handleEdit(c)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton color="error" onClick={() => handleDelete(c.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Nenhum campus cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Editar Campus' : 'Novo Campus'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Nome do campus"
              value={form.nome}
              onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Endereço"
              value={form.endereco}
              onChange={(e) => setForm((prev) => ({ ...prev, endereco: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Bairro"
              value={form.bairro}
              onChange={(e) => setForm((prev) => ({ ...prev, bairro: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Cidade"
              value={form.cidade}
              onChange={(e) => setForm((prev) => ({ ...prev, cidade: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Estado"
              value={form.estado}
              onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value }))}
              fullWidth
            />
            <Button variant="outlined" onClick={buscarCoordenadas}>
              Buscar coordenadas
            </Button>
            <TextField
              label="Latitude"
              value={form.lat}
              onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Longitude"
              value={form.lon}
              onChange={(e) => setForm((prev) => ({ ...prev, lon: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Pastores responsáveis"
              value={form.pastoresResponsaveis}
              onChange={(e) => setForm((prev) => ({ ...prev, pastoresResponsaveis: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default CampusPage;
