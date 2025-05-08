import React, { useEffect, useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, CircularProgress
} from '@mui/material';
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
    history.push(`/app/forms/edit/${id}`);
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>Formulários Cadastrados</Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Descrição</TableCell>
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
                  <TableCell>{form.description}</TableCell>
                  <TableCell>{form.formType && form.formType.name ? form.formType.name : '-'}</TableCell>
                  <TableCell>{form.startDate?.split('T')[0]}</TableCell>
                  <TableCell>{form.endDate?.split('T')[0]}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleEdit(form.id)} color="primary">
                      Editar
                    </Button>
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
