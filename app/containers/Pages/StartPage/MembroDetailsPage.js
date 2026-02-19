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
  Email,
  Phone,
  Cake,
  Badge,
  Home,
  LocationOn,
  Favorite
} from '@mui/icons-material';
import { buscarMembro } from '../../../api/membersApi';

const formatDate = (value) => {
  if (!value) return 'Nao informado';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const formatEndereco = (member) => {
  if (!member) return 'Nao informado';
  const parts = [
    member.street,
    member.number ? `n ${member.number}` : null,
    member.neighborhood,
    member.zipCode ? `CEP ${member.zipCode}` : null
  ].filter(Boolean);
  return parts.length ? parts.join(' - ') : 'Nao informado';
};

const MembroDetailsPage = () => {
  const [member, setMember] = useState(null);
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
        setError('ID do membro nao informado.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const payload = await buscarMembro(id);
        if (isMounted) {
          setMember(payload);
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

  const spouse = member?.spouse || null;
  const liderancaCelulas = Array.isArray(member?.liderancaCelulas) ? member.liderancaCelulas : [];

  return (
    <PapperBlock title="Detalhes do Membro" desc="Informacoes completas do membro">
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
                  src={member.photoUrl || 'https://via.placeholder.com/80'}
                  alt={member.fullName}
                  sx={{ width: 80, height: 80 }}
                />
                <Box>
                  <Typography variant="h6">{member.fullName}</Typography>
                  <Typography variant="body2" color="textSecondary">{member.email || 'Sem e-mail'}</Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><Phone /></ListItemIcon>
                      <ListItemText primary="Telefone" secondary={member.phone || member.whatsapp || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Badge /></ListItemIcon>
                      <ListItemText primary="CPF" secondary={member.cpf || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Cake /></ListItemIcon>
                      <ListItemText primary="Data de nascimento" secondary={formatDate(member.birthDate)} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Favorite /></ListItemIcon>
                      <ListItemText primary="Estado civil" secondary={member.maritalStatus || 'Nao informado'} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><Email /></ListItemIcon>
                      <ListItemText primary="E-mail" secondary={member.email || 'Nao informado'} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Home /></ListItemIcon>
                      <ListItemText primary="Endereco" secondary={formatEndereco(member)} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LocationOn /></ListItemIcon>
                      <ListItemText primary="Status" secondary={member.status || 'Nao informado'} />
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
                      src={spouse.photoUrl || 'https://via.placeholder.com/60'}
                      alt={spouse.fullName}
                      sx={{ width: 60, height: 60 }}
                    />
                    <Box>
                      <Typography variant="body1">{spouse.fullName}</Typography>
                    </Box>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">Nenhum conjuge vinculado.</Typography>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Celulas que lidera</Typography>
              {liderancaCelulas.length ? (
                <Stack spacing={1.5}>
                  {liderancaCelulas.map((celula) => (
                    <Box key={celula.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
                      <Typography variant="body1">{celula.celula || 'Sem nome'}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {celula.campusRef?.nome || 'Sem campus'} - {celula.bairro || 'Sem bairro'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {celula.dia || 'Dia nao informado'} - {celula.horario || 'Horario nao informado'} - {celula.ativo ? 'Ativa' : 'Inativa'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">Este membro nao lidera nenhuma celula.</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </PapperBlock>
  );
};

export default MembroDetailsPage;
