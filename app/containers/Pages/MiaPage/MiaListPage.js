import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import { PapperBlock, Notification } from 'dan-components';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Paper,
  Divider,
  Box,
  IconButton,
  TextField,
  Pagination,
  Button
} from '@mui/material';
import {
  Visibility, Delete, Edit, Add
} from '@mui/icons-material';

const MiaListPage = () => {
  const title = 'Listagem Ministério MIA';
  const description = 'Listagem de todos os Integrantes do MIA cadastrados';

  const [aposentados, setAposentados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage] = useState(10);
  const [notification, setNotification] = useState('');
  const [totalRegistros, setTotalRegistros] = useState(0);

  const history = useHistory();

  // Trim env var to remove accidental spaces and fallback to current origin for local dev
  const API_URL = (
    process.env.REACT_APP_API_URL?.trim() || window.location.origin || 'https://portal.iecg.com.br'
  ).replace(/\/$/, '');

  const fetchAposentados = async () => {
    const token = localStorage.getItem('token');

    try {
      const query = new URLSearchParams({
        name: searchTerm,
        page,
        limit: rowsPerPage
      }).toString();

      const response = await fetch(`${API_URL}/mia?${query}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar dados');
      }

      const data = await response.json();
      const registros = data.registros || [];
      setAposentados(registros);
      setTotalPages(data.totalPaginas || 1);
      setTotalRegistros(data.totalRegistros || registros.length);
    } catch (error) {
      console.error('Erro ao buscar Mia:', error);
    }
  };

  useEffect(() => {
    fetchAposentados();
  }, [page, searchTerm]);

  const handleDelete = async (id) => {
    const confirm = window.confirm('Tem certeza que deseja excluir este registro?');
    if (!confirm) return;

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/mia/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.erro || data.message || 'Erro ao deletar Mia.';
        setNotification(`Erro: ${errorMessage}`);
        return;
      }

      setAposentados((prev) => prev.filter((p) => p.id !== id));
      setNotification('Registro deletado com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar Mia:', error);
      setNotification('Erro ao conectar com o servidor. Por favor, tente novamente mais tarde.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock title="Listagem Ministério Mia" desc="Todos os dados do MIA">
        <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, mt: 2.5 }}>
          {/* Campo de pesquisa */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
              mb: 2
            }}
          >
            <TextField
              label="Pesquisar por nome"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // reseta a paginação ao pesquisar
              }}
              sx={{ width: { xs: '100%', sm: 300 } }}
            />
            <Button
              color="primary"
              startIcon={<Add />}
              onClick={() => history.push('/app/mia/cadastrar')}
              sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
            >
              Cadastro
            </Button>
          </Box>

          <List>
            {aposentados.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem
                  sx={{
                    transition: 'background 0.3s',
                    borderRadius: 1,
                    px: { xs: '4px', sm: 3 },
                    py: 1.25,
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 0 },
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                >
                  <Box sx={{
                    display: 'flex', alignItems: 'center', width: '100%', minWidth: 0
                  }}>
                    <ListItemAvatar sx={{ minWidth: { xs: 56, sm: 72 } }}>
                      <Avatar
                        src={item.user?.image || 'https://via.placeholder.com/100'}
                        alt={item.user?.name}
                        sx={{ width: { xs: 48, sm: 60 }, height: { xs: 48, sm: 60 } }}
                      />
                    </ListItemAvatar>

                    <ListItemText
                      sx={{
                        p: 0,
                        m: 0,
                        minWidth: 0,
                        flex: 1,
                        overflow: 'hidden'
                      }}
                      primary={(
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            whiteSpace: 'normal',
                            pr: 1,
                            fontSize: { xs: '1rem', sm: '1.25rem' },
                            lineHeight: { xs: 1.35, sm: 1.5 }
                          }}
                        >
                          {item.user?.name}
                        </Typography>
                      )}
                      secondary={
                        <>
                          {item.remedios && item.remedios.length > 0 ? (
                            item.remedios.map((remedio, remedioIndex) => (
                              <Typography
                                key={remedioIndex}
                                variant="body2"
                                color="textSecondary"
                                sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}
                              >
                                {remedio.nome} - {remedio.indicacao}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'normal' }}>
                              Sem Remedio cadastrado
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      width: { xs: '100%', sm: 'auto' },
                      justifyContent: { xs: 'flex-end', sm: 'flex-start' },
                      pl: { xs: 0, sm: 1 }
                    }}
                  >
                    <IconButton
                      color="primary"
                      onClick={() => history.push(
                        `/app/mia/detalhes?id=${item.id}`,
                        { pageTitle: 'Detalhes Dados do Mia' }
                      )
                      }
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      onClick={() => history.push('/app/mia/cadastrar', { aposentado: item, pageTitle: 'Editar Mia' })}
                    >
                      <Edit />
                    </IconButton>

                    <IconButton
                      color="error"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </ListItem>

                {index !== aposentados.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          <Typography variant="body2" color="textSecondary">
            Total de registros: {totalRegistros}
          </Typography>

          {/* Paginação */}
          <Box mt={2} display="flex" justifyContent="center" sx={{ overflowX: 'auto' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </Paper>
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default MiaListPage;
