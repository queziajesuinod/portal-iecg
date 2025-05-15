import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Toolbar, Typography, Pagination, IconButton, Tooltip, TextField, Box
} from '@mui/material';
import { Helmet } from 'react-helmet';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useHistory } from 'react-router-dom';
import useStyles from 'dan-components/Tables/tableStyle-jss';

const ListagemCelulasPage = () => {
  const { classes, cx } = useStyles();
  const history = useHistory();

  const [celulas, setCelulas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage] = useState(10);

  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  const fetchCelulas = async () => {
    const token = localStorage.getItem('token');
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: rowsPerPage,
        celula: searchTerm
      }).toString();

      const res = await fetch(`${API_URL}/start/celula?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      setCelulas(data.registros || []);
      setTotalPages(data.totalPaginas || 1);
    } catch (err) {
      console.error('Erro ao carregar células:', err);
    }
  };

  useEffect(() => {
    fetchCelulas();
  }, [page, searchTerm]);

  const handleEdit = (celula) => {
    history.push('/app/start/celulas/cadastrar', { celula , pageTitle: 'Cadastrar Célula'});
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Tem certeza que deseja excluir esta célula?');
    if (!confirmDelete) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/start/celula/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      fetchCelulas(); // Atualiza a lista após exclusão
    } catch (error) {
      console.error('Erro ao excluir célula:', error);
      alert('Erro ao excluir célula');
    }
  };

  return (
    <div>
      <Helmet>
        <title>Listagem de Células</title>
      </Helmet>

      <Toolbar className={classes.toolbar}>
        <Typography className={classes.title} variant="h6">
          Listagem de Células
        </Typography>
        <TextField
          label="Pesquisar por nome da célula"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1); // resetar para primeira página ao pesquisar
          }}
          style={{ marginLeft: 'auto', width: 300 }}
        />
      </Toolbar>

      <TableContainer component={Paper} className={classes.rootTable}>
        <Table className={cx(classes.table, classes.stripped)}>
          <TableHead>
            <TableRow>
              <TableCell>Nome da Célula</TableCell>
              <TableCell>Rede</TableCell>
              <TableCell>Líder</TableCell>
              <TableCell>Bairro</TableCell>
              <TableCell>Campus</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {celulas.length > 0 ? (
              celulas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.celula}</TableCell>
                  <TableCell>{c.rede}</TableCell>
                  <TableCell>{c.lider}</TableCell>
                  <TableCell>{c.bairro}</TableCell>
                  <TableCell>{c.campus}</TableCell>
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
                <TableCell colSpan={7} align="center">
                  Nenhuma célula encontrada com esse nome.
                </TableCell>
              </TableRow>
            )}
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
    </div>
  );
};

export default ListagemCelulasPage;
