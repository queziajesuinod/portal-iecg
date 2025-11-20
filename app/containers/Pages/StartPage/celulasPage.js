import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Toolbar, Typography, Pagination, IconButton, Tooltip, TextField, Box, MenuItem,
  Button, Dialog, DialogActions, DialogContent, DialogTitle
} from '@mui/material';
import { Helmet } from 'react-helmet';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloseIcon from '@mui/icons-material/Close';
import { useHistory } from 'react-router-dom';
import useStyles from 'dan-components/Tables/tableStyle-jss';
import Notification from 'dan-components/Notification/Notification';

const REDE_OPTIONS = [
  'RELEVANTE JUNIORS RAPAZES',
  'RELEVANTEEN RAPAZES',
  'RELEVANTEEN MOÇAS',
  'JUVENTUDE RELEVANTE RAPAZES',
  'MULHERES IECG',
  'IECG KIDS',
  'HOMENS IECG',
  'JUVENTUDE RELEVANTE MOÇAS',
  'RELEVANTE JUNIORS MOÇAS'
];

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

const normalizeHeaderKey = (header = '') => header.replace(/[^a-z0-9]/gi, '').toLowerCase();

const CSV_HEADER_MAP = {
  celula: 'celula',
  rede: 'rede',
  lider: 'lider',
  emaillider: 'email_lider',
  cellider: 'cel_lider',
  anfitriao: 'anfitriao',
  campus: 'campus',
  endereco: 'endereco',
  bairro: 'bairro',
  cidade: 'cidade',
  estado: 'estado',
  lideranca: 'lideranca',
  pastorgeracao: 'pastor_geracao',
  pastorcampus: 'pastor_campus',
  dia: 'dia',
  lat: 'lat',
  lon: 'lon'
};

const CSV_TEMPLATE_URL = '/templates/celulas-modelo.csv';

const ListagemCelulasPage = () => {
  const { classes, cx } = useStyles();
  const history = useHistory();

  const [celulas, setCelulas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage] = useState(10);
  const [notification, setNotification] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);
  const [filterCampus, setFilterCampus] = useState('');
  const [filterRede, setFilterRede] = useState('');
  const [filterBairro, setFilterBairro] = useState('');
  const [campi, setCampi] = useState([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  const API_URL = resolveApiUrl();

  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('O arquivo CSV deve conter cabeçalho e pelo menos uma linha de dados.');
    }
    const headers = lines[0].split(',').map((header) => normalizeHeaderKey(header));
    const mappedHeaders = headers.map((header) => CSV_HEADER_MAP[header] || null);
    const records = [];
    lines.slice(1).forEach((line, index) => {
      if (!line.trim()) return;
      const values = line.split(',');
      const row = {};
      mappedHeaders.forEach((field, columnIndex) => {
        if (!field) return;
        row[field] = (values[columnIndex] || '').trim();
      });
      if (Object.values(row).some((value) => value)) {
        records.push({ data: row, lineNumber: index + 2 });
      }
    });
    if (!records.length) {
      throw new Error('Nenhum registro válido foi encontrado no CSV.');
    }
    return records;
  };

  const geocodeAddressFromRow = async (row) => {
    if (!row.endereco) return {};
    const queryParts = [row.endereco, row.bairro, row.cidade, row.estado].filter(Boolean).join(' ');
    if (!queryParts) return {};
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryParts)}&format=json&addressdetails=1`);
      if (!res.ok) return {};
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return {};
      const { lat, lon, address = {} } = data[0];
      const bairro =
        row.bairro ||
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        address.quarter ||
        address.village ||
        '';
      const cidade =
        row.cidade ||
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.state_district ||
        '';
      const estado = row.estado || address.state || address.region || address.state_district || '';
      return { lat, lon, bairro, cidade, estado };
    } catch (error) {
      console.error('Erro ao buscar coordenadas durante importação:', error);
      return {};
    }
  };

  const buildPayloadFromRow = (row, coords = {}) => ({
    celula: row.celula || '',
    rede: row.rede || '',
    lider: row.lider || '',
    email_lider: row.email_lider || '',
    cel_lider: row.cel_lider || '',
    anfitriao: row.anfitriao || '',
    campus: row.campus || '',
    endereco: row.endereco || '',
    bairro: coords.bairro || row.bairro || '',
    cidade: coords.cidade || row.cidade || '',
    estado: coords.estado || row.estado || '',
    lideranca: row.lideranca || '',
    pastor_geracao: row.pastor_geracao || '',
    pastor_campus: row.pastor_campus || '',
    dia: row.dia || '',
    lat: coords.lat || row.lat || '',
    lon: coords.lon || row.lon || ''
  });

  const importarCelulas = async (records) => {
    const token = localStorage.getItem('token');
    const validRecords = records.filter((record) => record.data?.celula);
    let success = 0;
    const errors = [];

    for (const record of validRecords) {
      try {
        const coords = await geocodeAddressFromRow(record.data);
        const payload = buildPayloadFromRow(record.data, coords);
        const response = await fetch(`${API_URL}/start/celula`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          let message = 'Erro ao salvar célula.';
          try {
            const body = await response.json();
            message = body?.erro || body?.message || message;
          } catch (err) {
            // ignore parse errors
          }
          throw new Error(message);
        }
        success += 1;
      } catch (error) {
        errors.push(`Linha ${record.lineNumber}: ${error.message}`);
      }
    }

    return { success, processed: validRecords.length, errors };
  };

  const handleImportFileChange = (event) => {
    const file = event.target.files?.[0];
    setImportFile(file || null);
    setImportSummary(null);
  };

  const handleImportDialogClose = () => {
    if (importing) return;
    setImportDialogOpen(false);
    setImportFile(null);
    setImportSummary(null);
  };

  const handleImportSubmit = () => {
    if (!importFile) {
      setNotification('Selecione um arquivo CSV para importar.');
      return;
    }
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        const records = parseCsvText(typeof text === 'string' ? text : '');
        const result = await importarCelulas(records);
        setImportSummary(result);
        setNotification(`Importação concluída: ${result.success} de ${result.processed} registros inseridos.`);
        fetchCelulas();
      } catch (error) {
        console.error('Erro na importação de células:', error);
        setImportSummary(null);
        setNotification(error.message || 'Erro ao importar células.');
      } finally {
        setImporting(false);
      }
    };
    reader.onerror = () => {
      setImporting(false);
      setNotification('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(importFile);
  };

  const fetchCelulas = async () => {
    const token = localStorage.getItem('token');
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: rowsPerPage,
        celula: searchTerm || '',
        campusId: filterCampus || '',
        rede: filterRede || '',
        bairro: filterBairro || ''
      }).toString();

      const res = await fetch(`${API_URL}/start/celula?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      const registros = data.registros || [];
      setCelulas(registros);
      setTotalPages(data.totalPaginas || 1);
      setTotalRecords(data.totalRegistros || registros.length);
    } catch (err) {
      console.error('Erro ao carregar células:', err);
    }
  };

  useEffect(() => {
    fetchCelulas();
  }, [page, searchTerm, filterCampus, filterRede, filterBairro]);

  useEffect(() => {
    const carregarCampi = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/start/campus`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        const data = await res.json();
        setCampi(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao carregar campus:', err);
        setCampi([]);
      }
    };
    carregarCampi();
  }, [API_URL]);

  const pagedCelulas = celulas;

  const handleEdit = (celula) => {
    history.push('/app/start/celulas/cadastrar', { celula , pageTitle: 'Edição de Célula'});
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Tem certeza que deseja excluir esta célula?');
    if (!confirmDelete) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/start/celula/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.erro || data.message || 'Erro ao excluir célula.';
        setNotification(`Erro: ${errorMessage}`);
        return;
      }

      fetchCelulas(); // Atualiza a lista após exclusão
      setNotification('Célula excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir célula:', error);
      setNotification('Erro ao conectar com o servidor. Por favor, tente novamente mais tarde.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>Listagem de Células</title>
      </Helmet>

            <Toolbar className={classes.toolbar} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
          <Button variant="contained" color="primary" onClick={() => setImportDialogOpen(true)}>
            Importar células
          </Button>
          <Button
            variant="outlined"
            component="a"
            href={CSV_TEMPLATE_URL}
            download
          >
            Baixar modelo CSV
          </Button>
         
        </Box>
        <Box display="flex" flexWrap="wrap" gap={1} marginLeft="auto">
          <TextField
            label="Pesquisar por nome da célula"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            sx={{ width: 220 }}
          />
          <TextField
            select
            label="Campus"
            variant="outlined"
            size="small"
            value={filterCampus}
            onChange={(e) => { setFilterCampus(e.target.value); setPage(1); }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {campi.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.nome}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Rede"
            variant="outlined"
            size="small"
            value={filterRede}
            onChange={(e) => { setFilterRede(e.target.value); setPage(1); }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {REDE_OPTIONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField
            label="Bairro"
            variant="outlined"
            size="small"
            value={filterBairro}
            onChange={(e) => { setFilterBairro(e.target.value); setPage(1); }}
            sx={{ minWidth: 160 }}
            placeholder="Digite o bairro"
          />
        </Box>
      </Toolbar>

      <TableContainer component={Paper} className={classes.rootTable}>
        <Table className={cx(classes.table, classes.stripped)}>
          <TableHead>
            <TableRow>
              <TableCell>Nome da Célula</TableCell>
              <TableCell>Rede</TableCell>
              <TableCell>Líder</TableCell>
              <TableCell>Bairro</TableCell>
              <TableCell>Campus</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedCelulas.length > 0 ? (
              pagedCelulas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.celula}</TableCell>
                  <TableCell>{c.rede}</TableCell>
                  <TableCell>{c.lider}</TableCell>
                  <TableCell>{c.bairro}</TableCell>
                  <TableCell>{c.campusRef?.nome || c.campus}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Editar">
                        <IconButton color="primary" onClick={() => handleEdit(c)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton color="error" onClick={() => handleDelete(c.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhuma célula encontrada com esse filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <tableFooter>
            <TableRow>
              <TableCell colSpan={6} align="right">
                Total de registros: {totalRecords}
              </TableCell>
            </TableRow>
          </tableFooter>
        </Table>
      </TableContainer>

      <Box mt={2} display="flex" justifyContent="center">
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, value) => setPage(value)}
          color="primary"
        />
      </Box>

      <Dialog open={importDialogOpen} onClose={handleImportDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Importar cǸlulas</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Selecione um arquivo CSV seguindo o modelo padrǭo. Cada linha corresponde a uma cǸlula.
          </Typography>
          <Button
            variant="text"
            size="small"
            component="a"
            href={CSV_TEMPLATE_URL}
            download
            sx={{ mt: 1 }}
          >
            Baixar modelo CSV
          </Button>
          <Box mt={2}>
            <input type="file" accept=".csv,text/csv" onChange={handleImportFileChange} />
          </Box>
          {importing && (
            <Typography variant="body2" color="textSecondary" mt={2}>
              Importando registros... Isso pode levar alguns instantes.
            </Typography>
          )}
          {importSummary && (
            <Box mt={2}>
              <Typography variant="body2">
                Importa��ǜo conclu��da. {importSummary.success} de {importSummary.processed} registros inseridos.
              </Typography>
              {importSummary.errors.length > 0 && (
                <Box mt={1}>
                  <Typography variant="body2" color="error">
                    Ocorreram erros:
                  </Typography>
                  <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                    {importSummary.errors.slice(0, 5).map((err) => (
                      <li key={err}>
                        <Typography variant="body2" color="error">{err}</Typography>
                      </li>
                    ))}
                  </Box>
                  {importSummary.errors.length > 5 && (
                    <Typography variant="caption" color="textSecondary">
                      Mostrando os 5 primeiros erros de {importSummary.errors.length}.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleImportDialogClose} disabled={importing}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleImportSubmit} disabled={!importFile || importing}>
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default ListagemCelulasPage;
