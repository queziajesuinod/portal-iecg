import React, { useEffect, useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Box, Tooltip, IconButton, CircularProgress
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useHistory } from 'react-router-dom';

const FormListPage = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const history = useHistory();
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/forms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setForms(data);
      } catch (error) {
        console.error('Erro ao carregar formulários:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  const handleEdit = (id) => {
    history.push({
      pathname: `/app/eventos/editar/${id}`,
      state: { pageTitle: 'Editar Evento' }
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Tem certeza que deseja excluir esta Evento?');
    if (!confirmDelete) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/forms/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao excluir');

      fetchForms(); // Atualiza a lista após exclusão
    } catch (error) {
      console.error('Erro ao excluir Evento:', error);
    }
  };

  return (
    <div>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Início</TableCell>
                <TableCell>Fim</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>{form.name}</TableCell>
                  <TableCell>{form.formType && form.formType.name ? form.formType.name : '-'}</TableCell>
                  <TableCell>{form.startDate?.split('T')[0]}</TableCell>
                  <TableCell>{form.endDate?.split('T')[0]}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Inscrição">
                        <IconButton
                          color="primary"
                          onClick={() =>
                            history.push(
                              `/app/eventos/${form.slug}`,
                              { pageTitle:  `Realizar Inscrição - ${form.name}` }
                            )
                          }

                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton color="primary" onClick={() => handleEdit(form.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton color="error" onClick={() => handleDelete(form.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};

export default FormListPage;
