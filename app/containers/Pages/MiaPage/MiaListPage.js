import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useHistory } from "react-router-dom";
import { PapperBlock } from 'dan-components';

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
  IconButton // ✅ aqui!
} from "@mui/material";

import { Visibility, Delete} from "@mui/icons-material";


const MiaListPage = () => {
  const title = "Lista de Aposentados";
  const description = "Listagem de todos os aposentados cadastrados";
  const [aposentados, setAposentados] = useState([]);
  const history = useHistory(); // 🔹 Substitui o uso de navigate()

  const handleDelete = async (id) => {
    const confirm = window.confirm("Tem certeza que deseja excluir este registro?");
    if (!confirm) return;
  
    const token = localStorage.getItem("token");
    const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';
  
    try {
      const response = await fetch(`${API_URL}/mia/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error("Erro ao deletar aposentado");
      }
  
      // Remover da lista local
      setAposentados(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Erro ao deletar aposentado:", error);
      alert("Erro ao deletar aposentado.");
    }
  };
  
  // Buscar dados da API
  const fetchAposentados = async () => {
    const token = localStorage.getItem('token');
    const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

    try {
      const response = await fetch(`${API_URL}/mia`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Erro ao carregar dados");
      }
      const data = await response.json();
      setAposentados(data);
    } catch (error) {
      console.error("Erro ao buscar aposentados:", error);
    }
  };

  useEffect(() => {
    fetchAposentados();
  }, []);

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock title="Listagem de Aposentados" desc="Todos os dados do MIA">
        <Paper style={{ padding: 20, marginTop: 20 }}>
          <List>
            {aposentados.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem
                  style={{
                    transition: "background 0.3s",
                    borderRadius: 8,
                    padding: "10px 25px",
                    "&:hover": { backgroundColor: "#f5f5f5" }
                  }}
                >
                  {/* Avatar da pessoa */}
                  <ListItemAvatar>
                    <Avatar
                      src={item.foto || "https://via.placeholder.com/100"}
                      alt={item.nome}
                      sx={{ width: 60, height: 60 }}
                    />
                  </ListItemAvatar>

                  {/* Nome e profissão */}
                  <ListItemText
                    primary={<Typography variant="h6" fontWeight="bold">{item.nome}</Typography>}
                    secondary={
                      <>
                        {/* Exibição dos remédios */}
                        {item.remedios && item.remedios.length > 0 ? (
                          item.remedios.map((remedio, index) => (
                            <Typography key={index} variant="body2" color="textSecondary">
                              {remedio.nome} - {remedio.indicacao}
                            </Typography>
                          ))
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Sem Remédio cadastrado
                          </Typography>
                        )}
                      </>
                    }
                  />
                  {/* Botão de detalhes */}
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconButton
                      color="primary"
                      onClick={() => history.push(`/app/mia/detalhes?id=${item.id}`)}
                    >
                      <Visibility />
                    </IconButton>

                    <IconButton
                      color="error"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>


                </ListItem>

                {/* Divisor entre itens */}
                {index !== aposentados.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </PapperBlock>
    </div>
  );
};

export default MiaListPage;
