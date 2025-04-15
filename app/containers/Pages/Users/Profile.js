import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Helmet } from "react-helmet";
import { PapperBlock } from 'dan-components';
import {
  Paper,
  Typography,
  Avatar,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button
} from "@mui/material";
import {
  Email,
  Person,
  AccountCircle,
  VerifiedUser,
  CalendarToday
} from "@mui/icons-material";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const history = useHistory();

  const formatDate = (dateString) => {
    if (!dateString) return "Não informado";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    let isMounted = true;

    const userStorage = JSON.parse(localStorage.getItem("user"));
    const id = userStorage?.id;

    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

      try {
        const response = await fetch(`${API_URL}/users/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error("Erro ao carregar os detalhes do usuário");
        }
        const data = await response.json();
        if (isMounted) {
          setUser(data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erro ao buscar usuário:", error);
        }
      }
    };

    if (id) {
      fetchUser();
    } else {
      console.warn("ID do usuário não encontrado no localStorage!");
    }

    return () => {
      isMounted = false;
    };
  }, []);

  if (!user) return (
    <Typography color="error">Erro ao carregar os dados. Verifique a conexão.</Typography>
  );

  return (
    <div>
      <Helmet>
        <title>Detalhes de {user.name}</title>
      </Helmet>

      <PapperBlock title="Detalhes do Usuário" desc="Informações completas">
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => history.push('/app/users/editar', { user })}
          >
            Editar
          </Button>
        </Box>

        <Paper style={{ padding: 20, marginTop: 20 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar
              src={user.image || "https://via.placeholder.com/100"}
              alt={user.name}
              sx={{ width: 80, height: 80 }}
            />
            <Box>
              <Typography variant="h5" fontWeight="bold">{user.name}</Typography>
              <Typography variant="body2" color="textSecondary">{user.username}</Typography>
            </Box>
          </Box>

          <List>
            <ListItem>
              <ListItemIcon><Email /></ListItemIcon>
              <ListItemText primary="Email" secondary={user.email} />
            </ListItem>
            <ListItem>
              <ListItemIcon><VerifiedUser /></ListItemIcon>
              <ListItemText primary="Ativo" secondary={user.active ? "Sim" : "Não"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><AccountCircle /></ListItemIcon>
              <ListItemText primary="Perfil" secondary={user.Perfil.descricao} />
            </ListItem>
          </List>
        </Paper>
      </PapperBlock>
    </div>
  );
};

export default ProfilePage;
