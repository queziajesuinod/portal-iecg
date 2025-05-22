import React, { useEffect, useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Box, Tooltip, IconButton, CircularProgress
} from '@mui/material';
import { Visibility } from "@mui/icons-material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import { useHistory } from 'react-router-dom';
import { Notification } from 'dan-components';

const FormListPage = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
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

      // Atualizar a lista de formulários
      const updatedForms = await fetch(`${API_URL}/forms`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!updatedForms.ok) throw new Error('Erro ao atualizar lista de formulários');

      const formsData = await updatedForms.json();
      setForms(formsData);

      // Exibir notificação de sucesso
      setNotification('Formulário excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir Evento:', error);
    }
  };

  const handleClone = async (id) => {
    try {
      const token = localStorage.getItem('token');

      // Buscar o formulário original
      const res = await fetch(`${API_URL}/forms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erro ao buscar formulário para clonar');

      const form = await res.json();

      // Preparar o formulário clonado
      const clonedForm = {
        ...form,
        name: `${form.name} Copy`,
        slug: `${form.slug}-copy`,
        FormFields: form.FormFields.map(field => ({
          ...field,
          id: undefined, // Remover ID para criar novos campos
          FormId: undefined // Dissociar do formulário original
        })),
        FormPaymentConfig: form.FormPaymentConfig ? {
          ...form.FormPaymentConfig,
          id: undefined, // Remover ID para criar nova configuração de pagamento
          FormId: undefined // Dissociar do formulário original
        } : undefined
      };

      delete clonedForm.id; // Remover ID do formulário original

      // Criar o novo formulário
      const createRes = await fetch(`${API_URL}/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(clonedForm)
      });

      if (!createRes.ok) throw new Error('Erro ao clonar formulário');

      // Atualizar a lista de formulários
      const updatedForms = await fetch(`${API_URL}/forms`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!updatedForms.ok) throw new Error('Erro ao atualizar lista de formulários');

      const formsData = await updatedForms.json();
      setForms(formsData);
    } catch (error) {
      console.error('Erro ao clonar formulário:', error);
    }
  };

  return (
    <div>
      {notification && (
        <Notification message={notification} close={() => setNotification('')} />
      )}

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
                      <Tooltip title="Clonar">
                        <IconButton color="secondary" onClick={() => handleClone(form.id)}>
                          <FileCopyIcon />
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
