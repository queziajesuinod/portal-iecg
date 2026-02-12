import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { PapperBlock } from 'dan-components';
import {
  Person,
  Email,
  Phone,
  Cake,
  Badge,
  School,
  Work,
  Home,
  LocationOn,
  Favorite
} from '@mui/icons-material';

const fallbackHost = `${window.location.protocol}//${window.location.host}`;
const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'https://portal.iecg.com.br';

const formatDate = (value) => {
  if (!value) return 'Não informado';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const formatCPF = (cpf) => {
  if (!cpf) return 'Não informado';
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatEndereco = (user) => {
  if (!user) return 'Não informado';
  const parts = [
    user.endereco,
    user.numero ? `nº ${user.numero}` : null,
    user.bairro,
    user.cep ? `CEP ${user.cep}` : null
  ].filter(Boolean);
  return parts.length ? parts.join(' - ') : 'Não informado';
};

const MembroDetailsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');

  useEffect(() => {
    let isMounted = true;
    const fetchMember = async () => {
      if (!id) {
        setError('ID do membro não informado.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/users/${id}/spouse`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Erro ao carregar os detalhes do membro.');
        }
        const payload = await response.json();
        if (isMounted) {
          setData(payload);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Erro ao carregar os detalhes do membro.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMember();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const member = data?.user || null;
  const spouse = data?.spouse || null;

  return (
    <PapperBlock title="Detalhes do Membro" desc="Informações completas do membro">
      <Helmet>
        <title>Detalhes do Membro</title>
      </Helmet>

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button variant="outlined" onClick={() => history.push('/app/start/membros')}>
          Voltar
        </Button>
      </Box>

      {error && (
        <Box mb={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {!loading && member && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Avatar
                  src={member.image || 'https://via.placeholder.com/80'}
                  alt={member.name}
                  sx={{ width: 80, height: 80 }}
                />
                <Box>
                  <Typography variant="h6">{member.name}</Typography>
                  <Typography variant="body2" color="textSecondary">{member.email}</Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><Phone /></ListItemIcon>
                      <ListItemText primary="Telefone" secondary={member.telefone || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Badge /></ListItemIcon>
                      <ListItemText primary="CPF" secondary={formatCPF(member.cpf)} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Cake /></ListItemIcon>
                      <ListItemText primary="Data de nascimento" secondary={formatDate(member.data_nascimento)} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Favorite /></ListItemIcon>
                      <ListItemText primary="Estado civil" secondary={member.estado_civil || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText primary="Nome do conjuge" secondary={member.nome_esposo || 'Nao informado'} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><Email /></ListItemIcon>
                      <ListItemText primary="Email" secondary={member.email || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Work /></ListItemIcon>
                      <ListItemText primary="Profissao" secondary={member.profissao || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><School /></ListItemIcon>
                      <ListItemText primary="Escolaridade" secondary={member.escolaridade || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Home /></ListItemIcon>
                      <ListItemText primary="Endereco" secondary={formatEndereco(member)} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LocationOn /></ListItemIcon>
                      <ListItemText primary="Status" secondary={member.active ? 'Ativo' : 'Inativo'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText primary="Lider de celula" secondary={member.is_lider_celula ? 'Sim' : 'Nao'} />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Vinculo conjugal</Typography>
              {spouse ? (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={spouse.image || 'https://via.placeholder.com/60'}
                      alt={spouse.name}
                      sx={{ width: 60, height: 60 }}
                    />
                    <Box>
                      <Typography variant="body1">{spouse.name}</Typography>
                      <Typography variant="body2" color="textSecondary">{spouse.email}</Typography>
                    </Box>
                  </Stack>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><Phone /></ListItemIcon>
                      <ListItemText primary="Telefone" secondary={spouse.telefone || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Badge /></ListItemIcon>
                      <ListItemText primary="CPF" secondary={formatCPF(spouse.cpf)} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Favorite /></ListItemIcon>
                      <ListItemText primary="Estado civil" secondary={spouse.estado_civil || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Work /></ListItemIcon>
                      <ListItemText primary="Profissao" secondary={spouse.profissao || 'Nao informado'} />
                    </ListItem>
                  </List>
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">Nenhum conjuge vinculado.</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </PapperBlock>
  );
};

export default MembroDetailsPage;
