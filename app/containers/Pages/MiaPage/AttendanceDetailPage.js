import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import JsPDF from 'jspdf';
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { ArrowBack, Download, Save } from '@mui/icons-material';
import { PapperBlock, Notification } from 'dan-components';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  const { protocol, hostname, port } = window.location;
  if (port === '3005') {
    return `${protocol}//${hostname}:3005`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const formatDateBr = (value) => {
  if (!value) return '-';
  const parts = value.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch (error) {
    return value;
  }
};

const AttendanceDetailPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const API_URL = resolveApiUrl();

  const [lista, setLista] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('all');
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDetalhes = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/mia/attendance/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao carregar lista');
      }
      setLista(data.lista);
      setParticipantes(data.participantes || []);
    } catch (error) {
      console.error(error);
      setNotification(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetalhes();
  }, [id]);

  const normalizeTipo = (valor) => (valor && valor.trim() ? valor : 'Sem tipo definido');

  const tipoOptions = useMemo(() => {
    const valores = new Set(participantes.map((item) => normalizeTipo(item.tipo)));
    return Array.from(valores);
  }, [participantes]);

  const handleToggle = (participanteId) => {
    setParticipantes((prev) =>
      prev.map((item) =>
        item.id === participanteId ? { ...item, presente: !item.presente } : item
      )
    );
  };

  const handleSalvar = async () => {
    const token = localStorage.getItem('token');
    try {
      const payload = {
        presencas: participantes.map((item) => ({
          aposentadoId: item.id,
          presente: !!item.presente,
          idade: item.idade
        }))
      };

      const response = await fetch(`${API_URL}/mia/attendance/${id}/presencas`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao salvar Presenças');
      }
      setParticipantes(data.participantes || []);
      setNotification('Presenças atualizadas com sucesso!');
    } catch (error) {
      console.error(error);
      setNotification(error.message);
    }
  };

  const filteredParticipantes = useMemo(() => {
    const termo = searchTerm.toLowerCase();
    return participantes.filter((participante) => {
      const nome = (participante.nome || '').toLowerCase();
      const tipoAtual = normalizeTipo(participante.tipo);
      if (!nome.includes(termo)) {
        return false;
      }
      if (tipoFiltro !== 'all' && tipoAtual !== tipoFiltro) {
        return false;
      }
      return true;
    });
  }, [participantes, searchTerm, tipoFiltro]);

  const handleExportFilledPdf = () => {
    if (!lista) return;
    const doc = new JsPDF();
    doc.setFontSize(14);
    doc.text(`Lista de Presença - ${lista.titulo}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Data: ${formatDateBr(lista.dataReferencia)}`, 14, 22);

    let y = 32;
    filteredParticipantes.forEach((participante, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${index + 1}. ${participante.nome} - ${participante.telefone || ''} - ${participante.presente ? 'Presente' : 'Ausente'}`,
        14,
        y
      );
      y += 8;
    });

    doc.save(`lista-presenca-${lista.id}.pdf`);
  };

  const handleExportBlankPdf = () => {
    if (!lista) return;
    const doc = new JsPDF();
    doc.setFontSize(14);
    doc.text(`Lista de Presença - ${lista.titulo}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Data: ${formatDateBr(lista.dataReferencia)}`, 14, 22);
    doc.text('Folha para preenchimento manual', 14, 28);

    const colNome = 14;
    const colTelefone = 100;
    const colPresenca = 160;
    let y = 36;

    const printHeader = () => {
      doc.text('Nome', colNome, y);
      doc.text('Telefone', colTelefone, y);
      doc.text('Presenca', colPresenca, y);
      y += 6;
    };

    printHeader();

    filteredParticipantes.forEach((participante) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
        printHeader();
      }
      doc.text(participante.nome, colNome, y);
      doc.text(participante.telefone || '-', colTelefone, y);
      doc.text('__________', colPresenca, y);
      y += 8;
    });

    doc.save(`lista-presenca-${lista.id}-folha-manual.pdf`);
  };

  if (!lista) {
    return (
      <div>
        <Helmet>
          <title>Lista de Presença - MIA</title>
        </Helmet>
        <PapperBlock title="Carregando lista" desc="Aguarde...">
          <Typography>Buscando informacoes...</Typography>
        </PapperBlock>
      </div>
    );
  }

  return (
    <div>
      <Helmet>
        <title>Lista de Presença - {lista.titulo}</title>
      </Helmet>

      <PapperBlock title={lista.titulo} desc="Marque as Presenças deste dia">
        <Toolbar sx={{ padding: 0, marginBottom: 2, justifyContent: 'space-between' }}>
          <Box display="flex" gap={1}>
            <IconButton onClick={() => history.push('/app/mia/listas-presenca')}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="subtitle1">
                Data: {formatDateBr(lista.dataReferencia)}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportFilledPdf}
            >
              Exportar preenchido
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportBlankPdf}
            >
              Exportar folha
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSalvar}
              disabled={loading}
            >
              Salvar Presenças
            </Button>
          </Box>
        </Toolbar>

        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <TextField
            label="Buscar por nome"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
          />
          <TextField
            select
            label="Tipo de pessoa"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">Todos os tipos</MenuItem>
            {tipoOptions.map((tipo) => (
              <MenuItem key={tipo} value={tipo}>
                {tipo}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Presente</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Telefone</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredParticipantes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Nenhum participante encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filteredParticipantes.map((participante) => (
                <TableRow key={participante.id} hover>
                  <TableCell>
                    <Checkbox
                      checked={!!participante.presente}
                      onChange={() => handleToggle(participante.id)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>{participante.nome}</TableCell>
                  <TableCell>{participante.telefone || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default AttendanceDetailPage;
