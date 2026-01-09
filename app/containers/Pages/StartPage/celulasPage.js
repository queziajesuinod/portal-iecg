import React, { useEffect, useMemo, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  Paper, Toolbar, Typography, Pagination, IconButton, Tooltip, TextField, Box, MenuItem,
  Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Badge, Divider, TableSortLabel, Chip,
  FormControl, InputLabel, Select, Checkbox, ListItemText, OutlinedInput
} from '@mui/material';
import { Helmet } from 'react-helmet';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloseIcon from '@mui/icons-material/Close';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useHistory } from 'react-router-dom';
import useStyles from 'dan-components/Tables/tableStyle-jss';
import Notification from 'dan-components/Notification/Notification';
import { fetchGeocode } from '../../../utils/googleGeocode';
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';

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

const STATUS_OPTIONS = [
  { value: 'true', label: 'Ativas' },
  { value: 'false', label: 'Inativas' },
  { value: 'all', label: 'Todas' }
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
  campus: 'campusId',
  campusid: 'campusId',
  numero: 'numero',
  numerodacasa: 'numero',
  cep: 'cep',
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

const normalizeDigits = (value = '') => value.replace(/\D/g, '');

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
  const [filterRede, setFilterRede] = useState([]);
  const [filterBairro, setFilterBairro] = useState('');
  const [mapCelulas, setMapCelulas] = useState([]);
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('true');
  const [campi, setCampi] = useState([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [sortBy, setSortBy] = useState('celula');
  const [sortDirection, setSortDirection] = useState('asc');
  const [apeloCounts, setApeloCounts] = useState({});
  const [apelosDialogOpen, setApelosDialogOpen] = useState(false);
  const [apelosLoading, setApelosLoading] = useState(false);
  const [apelosList, setApelosList] = useState([]);
  const [apelosCelula, setApelosCelula] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusSelecionado, setStatusSelecionado] = useState('');
  const [apeloSelecionado, setApeloSelecionado] = useState(null);
  const [motivoStatus, setMotivoStatus] = useState('');

    const API_URL = resolveApiUrl();
    const mapKey = process.env.REACT_APP_GOOGLE_GEOCODE_KEY || '';
    const { isLoaded: mapLoaded } = useLoadScript({
      googleMapsApiKey: mapKey,
      libraries: ['places']
    });
    const buildCelulaQueryParams = ({
      page: overridePage,
      limit: overrideLimit,
      includeRede = true,
      includeStatus = true
    } = {}) => {
      const params = new URLSearchParams({
        celula: searchTerm || '',
        campusId: filterCampus || '',
        bairro: filterBairro || '',
        page: overridePage ?? page,
        limit: overrideLimit ?? rowsPerPage
      });
      if (includeRede && filterRede?.length) {
        filterRede.filter(Boolean).forEach((rede) => params.append('rede', rede));
      }
      if (includeStatus && filterStatus && filterStatus !== 'all') {
        params.append('ativo', filterStatus);
      }
      return params.toString();
    };
    const colorPalette = ['red', 'blue', 'green', 'orange', 'purple', 'yellow', 'pink'];
    const networkColorMap = useMemo(() => {
      const map = new Map();
      let paletteIndex = 0;
      (mapCelulas || [])
        .map((cell) => (cell.rede || 'Sem rede').trim())
        .filter(Boolean)
        .forEach((rede) => {
          const key = rede.toLowerCase();
          if (!map.has(key)) {
            map.set(
              key,
              colorPalette[paletteIndex % colorPalette.length]
            );
            paletteIndex += 1;
          }
        });
      return map;
    }, [mapCelulas]);
    const normalizeValue = (value) => (value || '').trim().toLowerCase();
    const matchesFilterRede = (redeValue) => {
      if (!filterRede || !filterRede.length) return true;
      const normalized = normalizeValue(redeValue);
      const selectedSet = new Set(filterRede.map((rede) => normalizeValue(rede)));
      return selectedSet.has(normalized);
    };

    const mapMarkers = useMemo(
      () => mapCelulas
        .filter((c) => c.lat && c.lon && matchesFilterRede(c.rede))
        .map((c) => {
          const networkKey = (c.rede || 'Sem rede').trim().toLowerCase();
          const color = networkColorMap.get(networkKey) || 'red';
          return {
            id: c.id,
            position: { lat: parseFloat(c.lat), lng: parseFloat(c.lon) },
            celula: c.celula,
            rede: c.rede,
            lider: c.lider,
            dia: c.dia,
            horario: c.horario,
            cel_lider: c.cel_lider,
            color,
            icon: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`
          };
        }),
      [mapCelulas, networkColorMap]
    );
    const hoveredMarker = useMemo(
      () => mapMarkers.find((marker) => marker.id === hoveredMarkerId) || null,
      [hoveredMarkerId, mapMarkers]
    );
    const legendItems = useMemo(() => {
      const entries = Array.from(networkColorMap.entries()).map(([key, color]) => ({
        key,
        label: key === '' ? 'Sem rede' : key,
        color
      }));
      if (!filterRede || !filterRede.length) {
        return entries;
      }
      const selectedSet = new Set(filterRede.map((rede) => normalizeValue(rede)));
      return entries.filter((entry) => selectedSet.has(entry.key));
    }, [networkColorMap, filterRede]);
  const mapCenter = useMemo(() => {
    if (!mapMarkers.length) return { lat: -20.44225, lng: -54.646814 };
    return mapMarkers[0].position;
  }, [mapMarkers]);

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
    const queryParts = [row.endereco, row.numero, row.bairro, row.cidade, row.estado, row.cep].filter(Boolean);
    if (!queryParts.length) return {};
    try {
      const geocodeResult = await fetchGeocode(queryParts.join(' '));
      if (!geocodeResult) return {};
      const bairro = row.bairro || geocodeResult.bairro || '';
      const cidade = row.cidade || geocodeResult.cidade || '';
      const estado = row.estado || geocodeResult.estado || '';
      return {
        lat: geocodeResult.lat,
        lon: geocodeResult.lon,
        bairro,
        cidade,
        estado
      };
    } catch (error) {
      console.error('Erro ao buscar coordenadas durante importa��o:', error);
      return {};
    }
  };

const resolveCampusFromRow = (row) => {
    const campusIdValue = row.campusId || row.campus;
    if (!campusIdValue) {
      return { campusId: '', campusNome: '' };
    }
    const campusMatch = campi.find((c) => String(c.id) === String(campusIdValue));
    return {
      campusId: campusMatch?.id || campusIdValue,
      campusNome: campusMatch?.nome || ''
    };
  };

  const buildPayloadFromRow = (row, coords = {}) => {
    const campusInfo = resolveCampusFromRow(row);
    return {
      celula: row.celula || '',
      rede: row.rede || '',
      lider: row.lider || '',
      email_lider: row.email_lider || '',
      cel_lider: normalizeDigits(row.cel_lider || ''),
      anfitriao: row.anfitriao || '',
      campus: campusInfo.campusNome,
      campusId: campusInfo.campusId || '',
      numero: row.numero || '',
      cep: row.cep || '',
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
    };
  };

  const celulaJaCadastrada = async (row, token) => {
    const searchParams = new URLSearchParams({
      celula: row.celula || '',
      rede: row.rede || '',
      lider: row.lider || '',
      limit: 1
    });

    try {
      const res = await fetch(`${API_URL}/start/celula?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return false;
      const data = await res.json();
      const registros = data.registros || [];
      return registros.some((item) =>
        (item.celula || '').toLowerCase() === (row.celula || '').toLowerCase() &&
        (item.rede || '').toLowerCase() === (row.rede || '').toLowerCase() &&
        (item.lider || '').toLowerCase() === (row.lider || '').toLowerCase()
      );
    } catch (error) {
      console.error('Falha ao verificar duplicidade da cǸlula:', error);
      return false;
    }
  };

  const importarCelulas = async (records) => {
    const token = localStorage.getItem('token');
    const validRecords = records.filter((record) => record.data?.celula);
    let success = 0;
    let failed = 0;
    const errors = [];
    const total = validRecords.length;

    setImportProgress({ total, processed: 0, success: 0, failed: 0 });

    for (const record of validRecords) {
      try {
        const isDuplicate = await celulaJaCadastrada(record.data, token);
        if (isDuplicate) {
          failed += 1;
          errors.push(`Linha ${record.lineNumber}: Célula já cadastrada para esta rede e lider.`);
          continue;
        }

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
        failed += 1;
        errors.push(`Linha ${record.lineNumber}: ${error.message}`);
      } finally {
        setImportProgress((prev) => ({
          total,
          processed: (prev?.processed || 0) + 1,
          success,
          failed
        }));
      }
    }

    return { success, processed: total, failed, errors };
  };

  const handleImportFileChange = (event) => {
    const file = event.target.files?.[0];
    setImportFile(file || null);
    setImportSummary(null);
    setImportProgress(null);
  };

  const handleImportDialogClose = () => {
    if (importing) return;
    setImportDialogOpen(false);
    setImportFile(null);
    setImportSummary(null);
    setImportProgress(null);
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
        setNotification(`Importacao concluida: ${result.success} de ${result.processed} registros inseridos. ${result.failed} nao foram importados.`);
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

  const handleDownloadErrors = () => {
    if (!importSummary?.errors?.length) return;
    const blob = new Blob([importSummary.errors.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'erros-importacao-celulas.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchApeloResumo = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/start/direcionamentos/resumo-por-celula`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao buscar resumo de apelos.');
      const data = await res.json();
      const map = {};
      (data || []).forEach((item) => {
        if (item.celula_id) {
          map[item.celula_id] = item.total || 0;
        }
      });
      setApeloCounts(map);
    } catch (err) {
      console.error('Erro ao carregar resumo de apelos:', err);
      setApeloCounts({});
    }
  };

  const fetchApelosPorCelula = async (celula) => {
    if (!celula?.id) return;
    setApelosCelula(celula);
    setApelosLoading(true);
    setApelosDialogOpen(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/start/direcionamentos/por-celula/${celula.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Erro ao buscar apelos da célula.');
      }
      const data = await res.json();
      setApelosList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setNotification(err.message || 'Erro ao carregar apelos.');
      setApelosList([]);
    } finally {
      setApelosLoading(false);
    }
  };

  const closeApelosDialog = () => {
    if (apelosLoading) return;
    setApelosDialogOpen(false);
    setApelosList([]);
    setApelosCelula(null);
  };

  const statusConfig = {
    DIRECIONADO_COM_SUCESSO: { label: 'Direcionado', color: 'info' },
    ENVIO_LIDER_PENDENTE_WHATS_ERRADO: { label: 'Pendência de Envio para Líder', color: 'warning' },
    CONSOLIDADO_CELULA: { label: 'Consolidado na célula', color: 'success' },
    DIRECIONAMENTO_INCORRETO_REENVIO_PENDENTE: { label: 'Direcionamento incorreto', color: 'error' },
    ENVIO_LIDER_PENDENTE: { label: 'Líder ainda não fez contato', color: 'secondary' },
    CONTATO_LIDER_SEM_RETORNO: { label: 'Líder enviou mensagem, sem retorno', color: 'secondary' },
    CONSOLIDACAO_INTERROMPIDA: { label: 'Não Consolidado', color: 'error' },
    MOVIMENTACAO_CELULA: { label: 'Em movimentação de célula',color: 'default',
      sx: { bgcolor: '#053f81ff', color: '#ffffffff' } },
    EM_CONSOLIDACAO: {
      label: 'Em Consolidação',
      color: 'default',
      sx: { bgcolor: 'purple', color: '#fff' }
    }
  };

  const renderStatusChip = (status) => {
    const cfg = statusConfig[status] || { label: status || '-', color: 'default' };
    return <Chip size="small" label={cfg.label} color={cfg.color} sx={{ fontWeight: 600 }} />;
  };

  const DECISAO_OPTIONS = [
    { value: 'apelo_decisao', label: 'Aceitar Jesus como meu Senhor e Salvador', color: 'success' },
    { value: 'apelo_volta', label: 'Voltar para Jesus (estava afastado e estou me reconciliando)', color: 'info' },
    { value: 'encaminhamento_celula', label: 'Encaminhamento de Célula', color: 'warning' }
  ];

  const renderDecisaoChip = (decisao) => {
    const opt = DECISAO_OPTIONS.find((o) => o.value === decisao);
    if (!opt) return decisao || '-';
    return <Chip size="small" label={opt.label} color={opt.color} sx={{ fontWeight: 600 }} />;
  };

  const renderAtivoChip = (ativo) => {
    const isAtivo = ativo !== false;
    return (
      <Chip
        size="small"
        label={isAtivo ? 'Ativa' : 'Inativa'}
        color={isAtivo ? 'success' : 'default'}
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const abrirStatusDialog = (apelo) => {
    setApeloSelecionado(apelo);
    setStatusSelecionado(apelo.status || '');
    setMotivoStatus('');
    setStatusDialogOpen(true);
  };

  const salvarStatusApelo = async () => {
    if (!apeloSelecionado) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/start/direcionamentos/${apeloSelecionado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: statusSelecionado, motivo_status: motivoStatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.erro || 'Falha ao atualizar status.');
      }
      setNotification('Status atualizado com sucesso.');
      setStatusDialogOpen(false);
      setMotivoStatus('');
      setApelosList((prev) =>
        prev.map((item) => (item.id === apeloSelecionado.id ? { ...item, status: statusSelecionado } : item))
      );
      fetchApeloResumo();
    } catch (err) {
      console.error(err);
      setNotification(err.message || 'Erro ao atualizar status.');
    }
  };

  const handleSort = (column) => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return column;
    });
  };

  const getValorOrdenacao = (celula, column) => {
    const valueMap = {
      celula: celula.celula,
      rede: celula.rede,
      lider: celula.lider,
      bairro: celula.bairro,
      campus: celula.campusRef?.nome || celula.campus
    };
    return valueMap[column] || '';
  };

  const sortedCelulas = [...celulas].sort((a, b) => {
    const aVal = (getValorOrdenacao(a, sortBy) || '').toString().toLowerCase();
    const bVal = (getValorOrdenacao(b, sortBy) || '').toString().toLowerCase();
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

    const fetchCelulas = async () => {
      const token = localStorage.getItem('token');
      try {
        const queryParams = buildCelulaQueryParams();

        const res = await fetch(`${API_URL}/start/celula?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        const registros = data.registros || [];
        setCelulas(registros);
        setTotalPages(data.totalPaginas || 1);
        setTotalRecords(data.totalRegistros || registros.length);
        fetchApeloResumo();
      } catch (err) {
        console.error('Erro ao carregar células:', err);
      }
    };

    const fetchMapCelulas = async () => {
      const token = localStorage.getItem('token');
      try {
        const queryParams = buildCelulaQueryParams({ page: 1, limit: 1000, includeRede: false });
        const res = await fetch(`${API_URL}/start/celula?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error('Falha ao carregar células para o mapa.');
        }
        const data = await res.json();
        setMapCelulas(data.registros || []);
      } catch (err) {
        console.error('Erro ao carregar células para o mapa:', err);
        setMapCelulas([]);
      }
    };

    useEffect(() => {
      fetchCelulas();
    }, [page, searchTerm, filterCampus, filterRede, filterBairro, filterStatus, API_URL]);

    useEffect(() => {
      fetchMapCelulas();
    }, [searchTerm, filterCampus, filterRede, filterBairro, filterStatus, API_URL]);

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

  const pagedCelulas = sortedCelulas;

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

  const alternarStatusCelula = async (celula, ativo) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/start/celula/${celula.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ativo })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.erro || 'Erro ao atualizar status da célula.');
      }
      setNotification(`Célula ${ativo ? 'ativada' : 'inativada'} com sucesso.`);
      fetchCelulas();
    } catch (err) {
      console.error('Erro ao alterar status da célula:', err);
      setNotification(err.message || 'Erro ao alterar status da célula.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>Listagem de Células</title>
      </Helmet>

      <Toolbar className={classes.toolbar} sx={{ flexWrap: "wrap", gap: 1 }}>
        <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
          <Button variant="contained" color="primary" onClick={() => setImportDialogOpen(true)}>
            Importar célula
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => history.push("/app/start/celulas/cadastrar")}
          >
            Cadastrar célula
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
       </Toolbar>
      <Box
        mt={2}
        display="flex"
        flexWrap="wrap"
        gap={1}
        alignItems="center"
        sx={{ width: "100%", justifyContent: "flex-start" }}
      >
        <TextField
          label="Pesquisar por nome da célula"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          sx={{ width: { xs: "100%", sm: 220 }, flex: { xs: "1 1 100%", sm: "0 1 220px" } }}
        />
        <TextField
          select
          label="Campus"
          variant="outlined"
          size="small"
          value={filterCampus}
          onChange={(e) => { setFilterCampus(e.target.value); setPage(1); }}
          sx={{ minWidth: 160, flex: { xs: "1 1 100%", sm: "0 1 180px" } }}
        >
          <MenuItem value="">Todos</MenuItem>
          {campi.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.nome}
            </MenuItem>
          ))}
        </TextField>
        <FormControl
          variant="outlined"
          size="small"
          sx={{ minWidth: 200, flex: { xs: "1 1 100%", sm: "0 1 200px" } }}
        >
          <InputLabel id="filter-rede-label">Rede</InputLabel>
          <Select
            labelId="filter-rede-label"
            multiple
            value={filterRede}
            onChange={(e) => {
              const { value } = e.target;
              setFilterRede(typeof value === "string" ? value.split(",") : value);
              setPage(1);
            }}
            input={<OutlinedInput label="Rede" />}
            renderValue={(selected) => (selected.length ? selected.join(", ") : "Todas")}
          >
            {REDE_OPTIONS.map((rede) => (
              <MenuItem key={rede} value={rede}>
                <Checkbox checked={filterRede.indexOf(rede) > -1} />
                <ListItemText primary={rede} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl
          variant="outlined"
          size="small"
          sx={{ minWidth: 150, flex: { xs: "1 1 100%", sm: "0 1 150px" } }}
        >
          <InputLabel id="filter-status-label">Status</InputLabel>
          <Select
            labelId="filter-status-label"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            label="Status"
          >
            {STATUS_OPTIONS.map((status) => (
              <MenuItem key={status.value} value={status.value}>
                {status.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Bairro"
          variant="outlined"
          size="small"
          value={filterBairro}
          onChange={(e) => { setFilterBairro(e.target.value); setPage(1); }}
          sx={{ minWidth: 160, flex: { xs: "1 1 100%", sm: "0 1 200px" } }}
          placeholder="Digite o bairro"
        />
      </Box>
      <Box mt={2} mb={2} sx={{ borderRadius: 1, overflow: 'hidden' }}>
        {mapLoaded && mapMarkers.length ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: 520 }}
            center={mapCenter}
            zoom={12}
            options={{ streetViewControl: false, fullscreenControl: false }}
          >
            {mapMarkers.map((marker) => (
              <Marker
                key={marker.id}
                position={marker.position}
                title={`${marker.celula || 'célula'} ? ${marker.rede || 'sem rede'}`}
                icon={marker.icon}
                onMouseOver={() => setHoveredMarkerId(marker.id)}
                onMouseOut={() => setHoveredMarkerId((prev) => (prev === marker.id ? null : prev))}
              />
            ))}
            {hoveredMarker && (
              <InfoWindow
                position={hoveredMarker.position}
                onCloseClick={() => setHoveredMarkerId(null)}
                options={{ zIndex: 9999 }}
              >
                <div style={{ minWidth: 180 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {hoveredMarker.celula || 'Célula'}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Líder: {hoveredMarker.lider || '-'}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Cel do líder: {hoveredMarker.cel_lider || '-'}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Rede: {hoveredMarker.rede || '-'}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Dia: {hoveredMarker.dia || '-'} • Horário: {hoveredMarker.horario || '-'}
                  </Typography>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <Typography variant="caption" color="textSecondary">
            Configure `REACT_APP_GOOGLE_GEOCODE_KEY` para visualizar o mapa.
          </Typography>
        )}
        {legendItems.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" mt={1} px={1}>
            {legendItems.map((item) => (
              <Box key={item.label} display="flex" alignItems="center" gap={1}>
                <Box width={16} height={16} borderRadius="50%" bgcolor={item.color} />
                <Typography variant="caption">{item.label}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <TableContainer component={Paper} className={classes.rootTable}>
        <Table className={cx(classes.table, classes.stripped)}>
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortBy === 'celula' ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === 'celula'}
                  direction={sortBy === 'celula' ? sortDirection : 'asc'}
                  onClick={() => handleSort('celula')}
                >
                  Nome da Célula
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'rede' ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === 'rede'}
                  direction={sortBy === 'rede' ? sortDirection : 'asc'}
                  onClick={() => handleSort('rede')}
                >
                  Rede
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'lider' ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === 'lider'}
                  direction={sortBy === 'lider' ? sortDirection : 'asc'}
                  onClick={() => handleSort('lider')}
                >
                  Líder
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'bairro' ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === 'bairro'}
                  direction={sortBy === 'bairro' ? sortDirection : 'asc'}
                  onClick={() => handleSort('bairro')}
                >
                  Bairro
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'campus' ? sortDirection : false}>
                <TableSortLabel
                  active={sortBy === 'campus'}
                  direction={sortBy === 'campus' ? sortDirection : 'asc'}
                  onClick={() => handleSort('campus')}
                >
                  Campus
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
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
                  <TableCell>{renderAtivoChip(c.ativo)}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Apelos direcionados">
                        <IconButton color="secondary" onClick={() => fetchApelosPorCelula(c)}>
                          <Badge badgeContent={apeloCounts[c.id] || 0} color="error">
                            <ListAltIcon />
                          </Badge>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton color="primary" onClick={() => handleEdit(c)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={c.ativo === false ? 'Ativar célula' : 'Inativar célula'}>
                        <IconButton
                          color={c.ativo === false ? 'success' : 'warning'}
                          onClick={() => {
                            const confirma = c.ativo === false || window.confirm('Confirmar inativação desta célula?');
                            if (!confirma) return;
                            alternarStatusCelula(c, c.ativo === false);
                          }}
                        >
                          <PowerSettingsNewIcon />
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
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} align="right">
                Total de registros: {totalRecords}
              </TableCell>
            </TableRow>
          </TableFooter>
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
          {importProgress && importProgress.total > 0 && (
            <Box mt={2}>
              <Typography variant="body2">
                Progresso: {importProgress.processed} / {importProgress.total}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (importProgress.processed / importProgress.total) * 100)}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption">
              Importadas: {importProgress.success} | Nao importadas: {importProgress.failed}
              </Typography>
            </Box>
          )}
          {importing && (
            <Typography variant="body2" color="textSecondary" mt={2}>
              Importando registros... Isso pode levar alguns instantes.
            </Typography>
          )}
          {importSummary && (
            <Box mt={2}>
              <Typography variant="body2">
                Importacao concluida. {importSummary.success} de {importSummary.processed} registros inseridos. {importSummary.failed} nao foram importados.
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
                  <Box mt={1}>
                    <Button variant="outlined" size="small" onClick={handleDownloadErrors}>
                      Baixar lista completa de erros
                    </Button>
                  </Box>
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

      <Dialog open={apelosDialogOpen} onClose={closeApelosDialog} fullWidth maxWidth="lg">
        <DialogTitle>
          Apelos direcionados - {apelosCelula?.celula || 'Célula'}
        </DialogTitle>
        <DialogContent dividers>
          {apelosLoading && (
            <Typography variant="body2">Carregando apelos...</Typography>
          )}
          {!apelosLoading && (
            <>
              <Box mb={1}>
                <Typography variant="body2" gutterBottom>
                  Célula: {apelosCelula?.celula || '-'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Rede: {apelosCelula?.rede || '-'} | Líder: {apelosCelula?.lider || '-'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Dia: {apelosCelula?.dia || '-'} | Horário: {apelosCelula?.horario || '-'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Cel do líder: {apelosCelula?.cel_lider || '-'}
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Box>
              <Typography variant="body2" gutterBottom>
                Total: {apelosList.length}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {apelosList.length === 0 ? (
                <Typography variant="body2" color="textSecondary">Nenhum apelo direcionado para esta célula.</Typography>
              ) : (
                <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Decisão</TableCell>
                  <TableCell>Data direcionamento</TableCell>
                  <TableCell>Campus IECG</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apelosList.map((apelo) => (
                  <TableRow key={apelo.id}>
                    <TableCell>{apelo.nome}</TableCell>
                    <TableCell>{renderDecisaoChip(apelo.decisao)}</TableCell>
                    <TableCell>{apelo.data_direcionamento || '-'}</TableCell>
                    <TableCell>{apelo.campus_iecg}</TableCell>
                    <TableCell>{renderStatusChip(apelo.status)}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => abrirStatusDialog(apelo)}>Alterar status</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeApelosDialog} disabled={apelosLoading}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Alterar status do apelo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Apelo: {apeloSelecionado?.nome}
          </Typography>
          <TextField
            select
            fullWidth
            margin="normal"
            label="Status"
            value={statusSelecionado}
            onChange={(e) => setStatusSelecionado(e.target.value)}
          >
            {Object.keys(statusConfig).map((key) => (
              <MenuItem key={key} value={key}>{statusConfig[key].label}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            margin="normal"
            label="Motivo (opcional)"
            value={motivoStatus}
            onChange={(e) => setMotivoStatus(e.target.value)}
            placeholder="Ex.: líder não respondeu, telefone incorreto..."
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={salvarStatusApelo}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default ListagemCelulasPage;
