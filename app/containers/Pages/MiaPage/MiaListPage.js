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
  IconButton,
  TextField,
  Pagination
} from "@mui/material";
import { Visibility, Delete } from "@mui/icons-material";

const MiaListPage = () => {
  const title = "Listagem Ministério MIA";
  const description = "Listagem de todos os Integrantes do MIA cadastrados";

  const [aposentados, setAposentados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage] = useState(10);

  const history = useHistory();

  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'https://portal.iecg.com.br';

  const fetchAposentados = async () => {
    const token = localStorage.getItem("token");

    try {
      const query = new URLSearchParams({
        nome: searchTerm,
        page,
        limit: rowsPerPage
      }).toString();

      const response = await fetch(`${API_URL}/mia?${query}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar dados");
      }

      const data = await response.json();
      setAposentados(data.registros || []);
      setTotalPages(data.totalPaginas || 1);
    } catch (error) {
      console.error("Erro ao buscar Mia:", error);
    }
  };

  useEffect(() => {
    fetchAposentados();
  }, [page, searchTerm]);

  const handleDelete = async (id) => {
    const confirm = window.confirm("Tem certeza que deseja excluir este registro?");
    if (!confirm) return;

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/mia/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar Mia");
      }

      setAposentados((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Erro ao deletar Mia:", error);
      alert("Erro ao deletar Mia.");
    }
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock title="Listagem Ministério Mia" desc="Todos os dados do MIA">
        <Paper style={{ padding: 20, marginTop: 20 }}>
          {/* Campo de pesquisa */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <TextField
              label="Pesquisar por nome"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // reseta a paginação ao pesquisar
              }}
              style={{ width: 300 }}
            />
          </Box>

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
                  <ListItemAvatar>
                    <Avatar
                      src={item.foto || "https://via.placeholder.com/100"}
                      alt={item.nome}
                      sx={{ width: 60, height: 60 }}
                    />
                  </ListItemAvatar>

                  <ListItemText
                    primary={<Typography variant="h6" fontWeight="bold">{item.nome}</Typography>}
                    secondary={
                      <>
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

                {index !== aposentados.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {/* Paginação */}
          <Box mt={2} display="flex" justifyContent="center">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </Paper>
      </PapperBlock>
    </div>
  );
};

export default MiaListPage;
