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
  Button,
  Typography,
  Paper,
  Divider,
  Box
} from "@mui/material";
import { ChatBubble, Email, Phone } from "@mui/icons-material";

const MiaListPage = () => {
  const title = "Lista de Aposentados";
  const description = "Listagem de todos os aposentados cadastrados";
  const [aposentados, setAposentados] = useState([]);
  const history = useHistory(); // 🔹 Substitui o uso de navigate()
  // Buscar dados da API
  const fetchAposentados = async () => {
    try {
      const response = await fetch("http://localhost:3001/mia");
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
               <Button
                    variant="contained"
                    color="primary"
                    onClick={() => history.push(`/app/mia/detalhes?id=${item.id}`)} // 🔹 Atualizado para React Router v5
                  >
                    Detalhes
                  </Button>

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
