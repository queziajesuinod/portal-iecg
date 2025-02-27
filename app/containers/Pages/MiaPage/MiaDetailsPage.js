import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
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
  Divider
} from "@mui/material";
import { Phone, LocationOn, Work, School, Facebook, Healing, LocalHospital, Person, FamilyRestroom, MedicalServices, CalendarToday } from "@mui/icons-material";

const MiaDetailsPage = () => {
  const [aposentado, setAposentado] = useState(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get("id");
  const formatDate = (dateString) => {
    if (!dateString) return "Não informado";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };
  useEffect(() => {
    let isMounted = true;

    console.log("ID recebido:", id); // 🔹 Verifica se o ID está correto
    const fetchAposentado = async () => {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://0.0.0.0:3001/';
        
      try {
          const response = await fetch(`${API_URL}mia/${id}`, {
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
          console.log("Dados carregados:", data); // 🔹 Verifica os dados retornados
          setAposentado(data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Erro ao buscar aposentado:", error);
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
        <title>Detalhes de {aposentado.nome}</title>
      </Helmet>

      <PapperBlock title="Detalhes do Aposentado" desc="Informações completas">
        <Paper style={{ padding: 20, marginTop: 20 }}>
          {/* Nome + Avatar */}
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar
              src={aposentado.foto || "https://via.placeholder.com/150"}
              alt={aposentado.nome}
              sx={{ width: 80, height: 80 }}
            />
            <Box>
              <Typography variant="h5" fontWeight="bold">{aposentado.nome}</Typography>
              <Typography variant="body2" color="textSecondary">{aposentado.profissao || "Sem profissão"}</Typography>
            </Box>
          </Box>

          <List>
            <ListItem>
              <ListItemIcon><CalendarToday /></ListItemIcon>
              <ListItemText primary="Data de Nascimento" secondary={formatDate(aposentado.data_nascimento)} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Phone /></ListItemIcon>
              <ListItemText primary="Telefone" secondary={aposentado.telefones || "Não informado"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><LocationOn /></ListItemIcon>
              <ListItemText primary="Endereço" secondary={aposentado.endereco || "Não informado"} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Person /></ListItemIcon>
              <ListItemText primary="Estado Civil" secondary={aposentado.estado_civil} />
            </ListItem>
            {aposentado.estado_civil === "Casado" && (
              <ListItem>
                <ListItemIcon><FamilyRestroom /></ListItemIcon>
                <ListItemText primary="Nome do Esposo(a)" secondary={aposentado.nome_esposo} />
              </ListItem>
            )}
            <ListItem>
              <ListItemIcon><Facebook /></ListItemIcon>
              <ListItemText primary="Rede Social" secondary={aposentado.rede_social} />
            </ListItem>
            <ListItem>
              <ListItemIcon><School /></ListItemIcon>
              <ListItemText primary="Escolas" secondary={aposentado.escolas} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Healing /></ListItemIcon>
              <ListItemText primary="Patologia" secondary={aposentado.patologia} />
            </ListItem>
            <ListItem>
              <ListItemIcon><LocalHospital /></ListItemIcon>
              <ListItemText primary="Hospital de Referência" secondary={aposentado.hospital} />
            </ListItem>
            <ListItem>
              <ListItemIcon><MedicalServices /></ListItemIcon>
              <ListItemText primary="Plano de Saúde" secondary={aposentado.plano_saude} />
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
