import React, { useEffect, useState } from "react";
import { useLocation, useHistory } from "react-router-dom";
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
  Phone,
  LocationOn,
  School,
  Facebook,
  Healing,
  LocalHospital,
  Person,
  FamilyRestroom,
  MedicalServices,
  CalendarToday
} from "@mui/icons-material";

const MiaDetailsPage = () => {
  const [aposentado, setAposentado] = useState(null);
  const location = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get("id");

  const formatDate = (dateString) => {
    if (!dateString) return "Não informado";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatCPF = (cpf) => {
    if (!cpf) return "Não informado";
    const digits = cpf.replace(/\D/g, "");
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };
  

  useEffect(() => {
    let isMounted = true;

    const fetchAposentado = async () => {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

      try {
        const response = await fetch(`${API_URL}/mia/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error("Erro ao carregar os detalhes");
        }
        const data = await response.json();
        if (isMounted) {
          setAposentado(data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erro ao buscar Mia:", error);
        }
      }
    };

    if (id) {
      fetchAposentado();
    } else {
      console.warn("ID não encontrado na URL!");
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (!aposentado) return (
    <Typography color="error">Erro ao carregar os dados. Verifique a conexão.</Typography>
  );

  return (
    <div>
      <Helmet>
        <title>Detalhes de {aposentado.user?.name}</title>
      </Helmet>

      <PapperBlock title="Detalhes do Mia" desc="Informações completas">
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => history.push('/app/mia/cadastrar', { aposentado })}
          >
            Editar
          </Button>
        </Box>

        <Paper style={{ padding: 20, marginTop: 20 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar
              src={aposentado.user?.image ||  "https://via.placeholder.com/100"}
              alt={aposentado.user?.name}
              sx={{ width: 80, height: 80 }}
            />
            <Box>
              <Typography variant="h5" fontWeight="bold">{aposentado.user?.name}</Typography>
              <Typography variant="body2" color="textSecondary" component="span">{aposentado.profissao || "Sem profissão"}</Typography>
            </Box>
          </Box>

          <List>
          <ListItem>
              <ListItemIcon><Person /></ListItemIcon>
              <ListItemText primary="CPF" secondary={formatCPF(aposentado.user?.cpf)} />
            </ListItem>
            <ListItem>
              <ListItemIcon><CalendarToday /></ListItemIcon>
              <ListItemText primary="Data de Nascimento" secondary={formatDate(aposentado.user?.data_nascimento)} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Phone /></ListItemIcon>
              <ListItemText primary="Telefone" secondary={aposentado.user?.telefone || "Não informado"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Person /></ListItemIcon>
              <ListItemText primary="Tipo de Pessoa" secondary={aposentado.tipo_pessoa || "Não informado"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><LocationOn /></ListItemIcon>
              <ListItemText primary="Endereço" secondary={aposentado.user?.endereco || "Não informado"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Person /></ListItemIcon>
              <ListItemText primary="Estado Civil" secondary={aposentado.user?.estado_civil || "Não informado"} />
            </ListItem>
            {aposentado.estado_civil === "Casado" && (
              <ListItem>
                <ListItemIcon><FamilyRestroom /></ListItemIcon>
                <ListItemText primary="Nome do Esposo(a)" secondary={aposentado.user?.nome_esposo || "Não informado"} />
              </ListItem>
            )}
            <ListItem>
              <ListItemIcon><Facebook /></ListItemIcon>
              <ListItemText primary="Rede Social" secondary={aposentado.user?.rede_social || "Não informado"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><School /></ListItemIcon>
              <ListItemText primary="Escolas" secondary={aposentado.escolas || "Não informado"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Healing /></ListItemIcon>
              <ListItemText primary="Patologia" secondary={aposentado.patologia || "Não informado"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><LocalHospital /></ListItemIcon>
              <ListItemText primary="Hospital de Referência" secondary={aposentado.hospital || "Não informado"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><MedicalServices /></ListItemIcon>
              <ListItemText primary="Plano de Saúde" secondary={aposentado.plano_saude || "Não informado"} />
            </ListItem>
            <Divider />
            <Typography variant="h6" sx={{ mt: 2 }}>Filhos</Typography>
            {aposentado.filhos?.map((filho, index) => (
              <ListItem key={index}>
                <ListItemText primary={filho.nome} secondary={`Telefone: ${filho.telefone}`} />
              </ListItem>
            ))}
            <Divider />
            <Typography variant="h6" sx={{ mt: 2 }}>Remédios</Typography>
            {aposentado.remedios?.map((remedio, index) => (
              <ListItem key={index}>
                <ListItemText primary={remedio.nome} secondary={`Indicação: ${remedio.indicacao}`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </PapperBlock>
    </div>
  );
};

export default MiaDetailsPage;