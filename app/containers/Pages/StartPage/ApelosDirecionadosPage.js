import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Pagination
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import { Helmet } from 'react-helmet';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon from '@mui/icons-material/History';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { PapperBlock, Notification } from 'dan-components';
import { sendWebhookEvent } from '../../../utils/webhookClient';
import { fetchGeocode } from '../../../utils/googleGeocode';
import { useHistory } from 'react-router-dom';

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

const YEAR_OPTIONS = ['', '2026', '2025'];

const ApelosDirecionadosPage = () => {
  const history = useHistory();
  const [apelos, setApelos] = useState([]);
  const [celulas, setCelulas] = useState([]);
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [nomeFilter, setNomeFilter] = useState('');
  const [decisaoFilter, setDecisaoFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(YEAR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [notification, setNotification] = useState('');

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [historicoList, setHistoricoList] = useState([]);
  const [apeloSelecionado, setApeloSelecionado] = useState(null);
  const [celulaDestinoId, setCelulaDestinoId] = useState('');
  const [filtroCelula, setFiltroCelula] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [celulaDialogOpen, setCelulaDialogOpen] = useState(false);
  const [celulaDetalhe, setCelulaDetalhe] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [novoStatus, setNovoStatus] = useState('');
  const [motivoStatus, setMotivoStatus] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailApelo, setDetailApelo] = useState(null);
  const [detailForm, setDetailForm] = useState({ bairro_apelo: '', bairro_proximo: [], rede: '' });
  const [detailBairroTemp, setDetailBairroTemp] = useState('');
  const [detailSaving, setDetailSaving] = useState(false);
  const [apeloCoords, setApeloCoords] = useState(null);

  const API_URL = resolveApiUrl();
  const redeOptions = useMemo(() => {
    const set = new Set();
    celulas.forEach((celula) => {
      const rede = (celula.rede || '').trim();
      if (rede) set.add(rede);
    });
    if (detailApelo?.rede) {
      set.add(detailApelo.rede);
    }
    return Array.from(set);
  }, [celulas, detailApelo?.rede]);

  const fetchApelos = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams();
      if (monthFilter) params.append('month', monthFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (nomeFilter) params.append('nome', nomeFilter);
      if (decisaoFilter) params.append('decisao', decisaoFilter);
      if (yearFilter) params.append('year', yearFilter);
      params.append('page', page);
      params.append('limit', 10);
      const res = await fetch(`${API_URL}/start/direcionamentos/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar apelos direcionados.');
      const data = await res.json();
      if (Array.isArray(data)) {
        setApelos(data);
        setTotalPages(1);
        setTotalRecords(data.length);
      } else {
        setApelos(Array.isArray(data.registros) ? data.registros : []);
        setTotalPages(data.totalPaginas || 1);
        setTotalRecords(data.totalRegistros || 0);
      }
    } catch (err) {
      console.error(err);
      setNotification(err.message || 'Erro ao buscar apelos direcionados.');
      setApelos([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchCelulas = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/start/celula/listagemgeral`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setCelulas(lista.filter((c) => c.ativo !== false));
    } catch (err) {
      console.error('Erro ao carregar células:', err);
      setCelulas([]);
    }
  };

  useEffect(() => {
    fetchApelos();
    fetchCelulas();
  }, [monthFilter, statusFilter, nomeFilter, decisaoFilter, yearFilter, page]);

  const abrirMover = (apelo) => {
    setApeloSelecionado(apelo);
    setCelulaDestinoId('');
    setMotivo('');
    setFiltroCelula('');
    setMoveDialogOpen(true);
    sugerirCelulasProximas(apelo);
  };

  const moverApelo = async () => {
    if (!apeloSelecionado || !celulaDestinoId) {
      setNotification('Selecione a célula de destino.');
      return;
    }
    if (apeloSelecionado.celulaAtual?.id && celulaDestinoId && apeloSelecionado.celulaAtual.id === celulaDestinoId) {
      setNotification('Não é possível direcionar para a mesma célula.');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/start/direcionamentos/${apeloSelecionado.id}/mover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ celulaDestinoId, motivo })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.erro || 'Falha ao mover apelo.');
      }
      setNotification('Apelo movido com sucesso.');
      sendWebhookEvent('apelo.moved', {
        apeloId: apeloSelecionado.id,
        destinoCelulaId: celulaDestinoId
      });
      setMoveDialogOpen(false);
      fetchApelos();
    } catch (err) {
      console.error(err);
      setNotification(err.message || 'Erro ao mover apelo.');
    }
  };

  const abrirHistorico = async (apelo) => {
    setApeloSelecionado(apelo);
    setHistoricoDialogOpen(true);
    setLoadingHistorico(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/start/direcionamentos/${apelo.id}/historico`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar histórico.');
      const data = await res.json();
      setHistoricoList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setNotification(err.message || 'Erro ao carregar histórico.');
      setHistoricoList([]);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const normalizeRede = (value) => (value || '').toString().trim().toLowerCase();
  const normalizeSearchValue = (value) => {
    const base = (value || '').toString().normalize('NFD');
    return base.replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  const celulaAtualTexto = (apelo) => apelo?.celulaAtual?.celula || 'Sem célula';
  const apeloSemDirecionamento = (apelo) => apelo?.status === 'NAO_HAVERAR_DIRECIONAMENTO';

  const celulasMesmaRede = (apelo, filtro = filtroCelula) => {
    if (!apelo) return [];
    const redeApelo = normalizeRede(apelo?.rede);
    if (!redeApelo) return [];
    const filtradas = celulas.filter((c) => normalizeRede(c.rede) === redeApelo);
    const baseSemAtual = filtradas.filter((c) => c.id !== apelo?.celulaAtual?.id);
    if (!filtro) return baseSemAtual;
    const termo = normalizeSearchValue(filtro);
    return baseSemAtual.filter((c) => normalizeSearchValue(c.celula).includes(termo));
  };

  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('pt-BR');
  };

  const CHIP_COLOR_OPTIONS = [
    'default',
    'primary',
    'secondary',
    'error',
    'info',
    'success',
    'warning'
  ];

  const getChipColor = (value) => (CHIP_COLOR_OPTIONS.includes(value) ? value : 'default');

  const statusConfig = {
    APELO_CADASTRADO: { label: 'Novo', color: 'default' },
    NAO_HAVERAR_DIRECIONAMENTO: { label: 'Não direcionar para uma célula', color: 'error' },
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

  const statusLabel = (status) => statusConfig[status]?.label || status || '-';

  const DECISAO_OPTIONS = [
    { value: 'apelo_decisao', label: 'Aceitar Jesus como meu Senhor e Salvador', color: 'success' },
    { value: 'apelo_volta', label: 'Voltar para Jesus (estava afastado e estou me reconciliando)', color: 'info' },
    { value: 'encaminhamento_celula', label: 'Encaminhamento de Célula', color: 'warning' }
  ];

  const renderDecisaoChip = (decisao) => {
    const opt = DECISAO_OPTIONS.find((o) => o.value === decisao);
    if (!opt) return decisao || '-';
    return <Chip size="small" label={opt.label} color={getChipColor(opt.color)} sx={{ fontWeight: 600 }} />;
  };

  const renderStatusChip = (status) => {
    const cfg = statusConfig[status] || { label: statusLabel(status), color: 'default' };
    return (
      <Chip
        size="small"
        label={cfg.label}
        color={getChipColor(cfg.color)}
        sx={{ fontWeight: 600, ...(cfg.sx || {}) }}
      />
    );
  };

  const abrirDetalheApelo = (apelo) => {
    if (!apelo) return;
    const proximos = Array.isArray(apelo.bairro_proximo)
      ? apelo.bairro_proximo
      : apelo.bairro_proximo
        ? [apelo.bairro_proximo]
        : [];
    setDetailForm({
      bairro_apelo: apelo.bairro_apelo || '',
      bairro_proximo: proximos,
      rede: apelo.rede || ''
    });
    setDetailApelo(apelo);
    setDetailBairroTemp('');
    setDetailDialogOpen(true);
  };

  const handleDetailFormChange = (field, value) => {
    setDetailForm((prev) => ({ ...prev, [field]: value }));
  };

  const addDetailBairroProximo = () => {
    const val = detailBairroTemp.trim();
    if (!val) return;
    setDetailForm((prev) => ({
      ...prev,
      bairro_proximo: prev.bairro_proximo.includes(val)
        ? prev.bairro_proximo
        : [...prev.bairro_proximo, val]
    }));
    setDetailBairroTemp('');
  };

  const removeDetailBairroProximo = (value) => {
    setDetailForm((prev) => ({
      ...prev,
      bairro_proximo: prev.bairro_proximo.filter((b) => b !== value)
    }));
  };

  const fecharDetalheDialog = () => {
    setDetailDialogOpen(false);
    setDetailApelo(null);
    setDetailForm({ bairro_apelo: '', bairro_proximo: [], rede: '' });
    setDetailBairroTemp('');
  };

  const salvarDetalheApelo = async () => {
    if (!detailApelo) return;
    setDetailSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        bairro_apelo: detailForm.bairro_apelo || null,
        rede: detailForm.rede || null,
        bairro_proximo: detailForm.bairro_proximo.length ? detailForm.bairro_proximo : []
      };
      const res = await fetch(`${API_URL}/start/direcionamentos/${detailApelo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.erro || 'Falha ao atualizar os bairros.');
      }
      setNotification('Bairros atualizados com sucesso.');
      fetchApelos();
      fecharDetalheDialog();
    } catch (err) {
      console.error(err);
      setNotification(err.message || 'Erro ao salvar bairros.');
    } finally {
      setDetailSaving(false);
    }
  };

  const haversine = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
      * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const buscarCoordenadasApelo = async (apelo) => {
  const bairro = apelo?.bairro_apelo || '';
  const cidade = apelo?.cidade_apelo || 'Campo Grande';
  const estado = apelo?.estado_apelo || 'Mato Grosso do Sul';
  const queryParts = [bairro, cidade, estado, 'Brasil'].filter(Boolean);
  if (!queryParts.length) return null;
  try {
    const geocodeResult = await fetchGeocode(queryParts.join(' '));
    if (!geocodeResult) return null;
    return { lat: geocodeResult.lat, lon: geocodeResult.lon };
  } catch (err) {
    console.error('Erro ao buscar coordenadas do apelo:', err);
    return null;
  }
};

const sugerirCelulasProximas = async (apelo) => {
    setLoadingSugestoes(true);
    setSugestoes([]);
    setApeloCoords(null);
    const coords = await buscarCoordenadasApelo(apelo);
    setApeloCoords(coords);
    if (!coords) {
      setLoadingSugestoes(false);
      return;
    }
    const celulasFiltradas = celulas.filter((c) => {
      const mesmaRede = normalizeRede(c.rede) === normalizeRede(apelo.rede);
      return mesmaRede && c.lat && c.lon;
    });
    const calculadas = celulasFiltradas.map((c) => ({
      ...c,
      distancia: haversine(parseFloat(coords.lat), parseFloat(coords.lon), parseFloat(c.lat), parseFloat(c.lon))
    }));
    calculadas.sort((a, b) => a.distancia - b.distancia);
    setSugestoes(calculadas.slice(0, 5));
    setLoadingSugestoes(false);
  };

  const celulasDisponiveis = apeloSelecionado ? celulasMesmaRede(apeloSelecionado) : [];
  const celulasRedeSemFiltro = useMemo(
    () => (apeloSelecionado ? celulasMesmaRede(apeloSelecionado, '') : []),
    [apeloSelecionado, celulas]
  );
  const celulasRedeOrdenadas = useMemo(() => {
    if (!apeloSelecionado || celulasRedeSemFiltro.length === 0) return [];
    const coords = apeloCoords;
    const base = celulasRedeSemFiltro.map((c) => ({
      ...c,
      distancia: coords && c.lat && c.lon
        ? haversine(
          parseFloat(coords.lat),
          parseFloat(coords.lon),
          parseFloat(c.lat),
          parseFloat(c.lon)
        )
        : null
    }));
    base.sort((a, b) => {
      const da = a.distancia ?? Number.POSITIVE_INFINITY;
      const db = b.distancia ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
    return base;
  }, [apeloSelecionado, celulasRedeSemFiltro, apeloCoords]);
  const sugestoesFiltradas = useMemo(() => {
    if (!filtroCelula) return sugestoes;
    const termo = normalizeSearchValue(filtroCelula);
    return sugestoes.filter((c) => normalizeSearchValue(c.celula).includes(termo));
  }, [sugestoes, filtroCelula]);
  const mostrarFallbackCelulas = !loadingSugestoes && sugestoes.length === 0 && celulasRedeOrdenadas.length > 0;

  return (
    <div>
      <Helmet>
        <title>Apelos Direcionados</title>
      </Helmet>
      <PapperBlock title="Apelos Direcionados" desc="Gerencie apelos direcionados e movimentações">
      <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            label="Nome do apelo"
            size="small"
            value={nomeFilter}
            onChange={(e) => {
              setNomeFilter(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Mês do direcionamento"
            type="month"
            size="small"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
          <TextField
            select
            label="Ano"
            size="small"
            value={yearFilter}
            sx={{ width: 140 }}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
          >
            {YEAR_OPTIONS.map((year) => (
              <MenuItem key={year} value={year}>
                {year === '' ? 'Todos' : year}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Decisão"
            size="small"
            value={decisaoFilter}
            onChange={(e) => {
              setDecisaoFilter(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {DECISAO_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.keys(statusConfig).map((key) => (
              <MenuItem key={key} value={key}>{statusConfig[key].label}</MenuItem>
            ))}
          </TextField>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="contained" color="secondary" onClick={() => history.push('/app/start/fila-apelos')}>
            Fila de apelos
          </Button>
          <Button variant="outlined" onClick={fetchApelos} disabled={loading}>
            Atualizar
          </Button>
        </Box>
      </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Decisão</TableCell>
                <TableCell>Data direcionamento</TableCell>
                <TableCell>Célula atual</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apelos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {loading ? 'Carregando...' : 'Nenhum apelo encontrado.'}
                  </TableCell>
                </TableRow>
              )}
              {apelos.map((apelo) => {
                const actionsDisabled = apeloSemDirecionamento(apelo);
                return (
                  <TableRow key={apelo.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <span>{apelo.nome}</span>
                        <Tooltip title="Ver informações preenchidas">
                          <IconButton
                            size="small"
                            onClick={() => abrirDetalheApelo(apelo)}
                            sx={{ p: 0.3 }}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {apelo.observacao && apelo.observacao.trim() !== '' && (
                          <Tooltip title={apelo.observacao}>
                            <ArticleOutlinedIcon fontSize="small" color="action" />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{renderDecisaoChip(apelo.decisao)}</TableCell>
                    <TableCell>{formatDate(apelo.data_direcionamento)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{celulaAtualTexto(apelo)}</span>
                        <Tooltip title="Detalhes da célula">
                          <IconButton size="small" onClick={() => {
                            setCelulaDetalhe(apelo.celulaAtual);
                            setCelulaDialogOpen(true);
                          }}>
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>{renderStatusChip(apelo.status)}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" gap={1} justifyContent="flex-end">
                        <Tooltip title="Histórico de movimentações">
                          <IconButton
                            size="small"
                            disabled={actionsDisabled}
                            onClick={() => !actionsDisabled && abrirHistorico(apelo)}
                          >
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Alterar status">
                          <IconButton
                            size="small"
                            disabled={actionsDisabled}
                            onClick={() => {
                              if (actionsDisabled) return;
                              setApeloSelecionado(apelo);
                              setNovoStatus(apelo.status || '');
                              setMotivoStatus('');
                              setStatusDialogOpen(true);
                            }}
                          >
                            <AutorenewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Mover para outra célula">
                          <IconButton
                            size="small"
                            disabled={actionsDisabled}
                            onClick={() => !actionsDisabled && abrirMover(apelo)}
                          >
                            <SwapHorizIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </PapperBlock>

      <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Mover apelo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Apelo: {apeloSelecionado?.nome || '-'}
          </Typography>
          <Typography variant="body2" gutterBottom>
            Bairro: {apeloSelecionado?.bairro_apelo || '-'}
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            Rede: {apeloSelecionado?.rede || '-'} | Cidade: Campo Grande | Estado: Mato Grosso do Sul
          </Typography>
          <TextField
            label="Buscar célula"
            fullWidth
            margin="normal"
            size="small"
            placeholder="Digite parte do nome para reduzir a lista"
            value={filtroCelula}
            onChange={(e) => setFiltroCelula(e.target.value)}
          />
          <TextField
            select
            label="Célula destino"
            fullWidth
            margin="normal"
            value={celulaDestinoId}
            onChange={(e) => setCelulaDestinoId(e.target.value)}
          >
            {celulasDisponiveis.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.celula} {c.rede ? `- ${c.rede}` : ''}
              </MenuItem>
            ))}
          </TextField>
          {celulasDisponiveis.length === 0 && (
            <Typography variant="caption" color="textSecondary">
              Nenhuma célula cadastrada na mesma rede do apelo. Verifique se existe alguma célula ativa para essa rede.
            </Typography>
          )}
          <TextField
            label="Motivo do direcionamento"
            fullWidth
            margin="normal"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            multiline
            minRows={2}
          />
          <Box mt={2}>
            <Typography variant="body2" gutterBottom>
              Sugestões Células próximas:
            </Typography>
            {loadingSugestoes && (
              <Typography variant="caption" color="textSecondary">Buscando sugestões...</Typography>
            )}
            {!loadingSugestoes && sugestoes.length === 0 && !mostrarFallbackCelulas && (
              <Typography variant="caption" color="textSecondary">Nenhuma sugestão disponível.</Typography>
            )}
            {!loadingSugestoes && mostrarFallbackCelulas && (
              <Typography variant="caption" color="textSecondary">
                Nenhuma sugestão automática gerada; a lista completa da rede aparece abaixo para ajudar a identificar a mais próxima.
              </Typography>
            )}
            <Grid container spacing={1}>
              {sugestoesFiltradas.map((c) => (
                <Grid item xs={12} sm={6} key={c.id}>
                  <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => setCelulaDestinoId(c.id)}>
                    <CardContent>
                      <Typography variant="subtitle2">{c.celula}</Typography>
                      <Typography variant="caption" display="block">Rede: {c.rede}</Typography>
                      <Typography variant="caption" display="block">Bairro: {c.bairro || '-'}</Typography>
                      <Typography variant="caption" display="block">Distância: {c.distancia ? `${c.distancia.toFixed(1)} km` : '-'}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {mostrarFallbackCelulas && (
              <Box mt={2}>
                <Typography variant="body2" gutterBottom>Lista completa da rede</Typography>
                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                  Como não há sugestões próximas, exibimos todas as células da rede (busca não altera esta lista) para que você veja qual está menos longe.
                </Typography>
                <Grid container spacing={1}>
                  {celulasRedeOrdenadas.map((c) => (
                    <Grid item xs={12} sm={6} key={`rede-${c.id}`}>
                      <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => setCelulaDestinoId(c.id)}>
                        <CardContent>
                          <Typography variant="subtitle2">{c.celula}</Typography>
                          <Typography variant="caption" display="block">Rede: {c.rede}</Typography>
                          <Typography variant="caption" display="block">Bairro: {c.bairro || '-'}</Typography>
                          <Typography variant="caption" display="block">
                            Distância: {c.distancia ? `${c.distancia.toFixed(1)} km` : '-'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={moverApelo}>Mover</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailDialogOpen} onClose={fecharDetalheDialog} fullWidth maxWidth="md">
        <DialogTitle>Detalhes do apelo</DialogTitle>
        <DialogContent dividers>
          {detailApelo ? (
            <>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Nome</Typography>
                  <Typography variant="body2">{detailApelo.nome}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Decisão</Typography>
                  {renderDecisaoChip(detailApelo.decisao)}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">WhatsApp</Typography>
                  <Typography variant="body2">{detailApelo.whatsapp || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Rede"
                    fullWidth
                    size="small"
                    value={detailForm.rede}
                    onChange={(e) => handleDetailFormChange('rede', e.target.value)}
                    helperText="Selecione a rede desejada"
                    disabled={detailSaving}
                  >
                    <MenuItem value="">Sem rede</MenuItem>
                    {redeOptions.map((rede) => (
                      <MenuItem key={rede} value={rede}>{rede}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Status</Typography>
                  {renderStatusChip(detailApelo.status)}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Data de direcionamento</Typography>
                  <Typography variant="body2">{formatDate(detailApelo.data_direcionamento)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Cidade</Typography>
                  <Typography variant="body2">{detailApelo.cidade_apelo || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Estado</Typography>
                  <Typography variant="body2">{detailApelo.estado_apelo || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Observação</Typography>
                  <Typography variant="body2">{detailApelo.observacao || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Célula atual</Typography>
                  <Typography variant="body2">{detailApelo.celulaAtual?.celula || 'Sem célula'}</Typography>
                </Grid>
              </Grid>
              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>Editar bairro</Typography>
                <TextField
                  fullWidth
                  label="Bairro do apelo"
                  value={detailForm.bairro_apelo}
                  onChange={(e) => handleDetailFormChange('bairro_apelo', e.target.value)}
                />
              </Box>
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>Bairros próximos</Typography>
                <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                  <TextField
                    label="Adicionar bairro"
                    value={detailBairroTemp}
                    onChange={(e) => setDetailBairroTemp(e.target.value)}
                    disabled={detailSaving}
                    size="small"
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    onClick={addDetailBairroProximo}
                    disabled={!detailBairroTemp.trim() || detailSaving}
                  >
                    Adicionar
                  </Button>
                </Box>
                <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
                  {detailForm.bairro_proximo.map((bairro, index) => (
                    <Chip
                      key={`${bairro}-${index}`}
                      label={bairro}
                      onDelete={() => removeDetailBairroProximo(bairro)}
                    />
                  ))}
                  {detailForm.bairro_proximo.length === 0 && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                      Nenhum bairro próximo registrado.
                    </Typography>
                  )}
                </Box>
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="textSecondary">Dados não disponíveis.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDetalheDialog} disabled={detailSaving}>Cancelar</Button>
          <Button variant="contained" onClick={salvarDetalheApelo} disabled={detailSaving}>
            {detailSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historicoDialogOpen} onClose={() => setHistoricoDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Histórico de movimentações</DialogTitle>
        <DialogContent dividers>
          {loadingHistorico ? (
            <Typography variant="body2">Carregando histórico...</Typography>
          ) : historicoList.length === 0 ? (
            <Typography variant="body2" color="textSecondary">Nenhuma movimentação encontrada.</Typography>
          ) : (
            <Box position="relative" pl={3} py={1}>
              <Box
                position="absolute"
                top={0}
                left={10}
                bottom={0}
                sx={{ borderLeft: '2px solid #e0e0e0' }}
              />
              {historicoList.map((item, idx) => {
                const isStatus = item.tipo_evento === 'STATUS' || item.status_anterior || item.status_novo;
                const dataFmt = item.data_movimento ? new Date(item.data_movimento).toLocaleString('pt-BR') : '-';
                return (
                  <Box key={item.id || idx} display="flex" mb={2} position="relative" alignItems="flex-start" gap={2}>
                    <Box minWidth={120} textAlign="right" pr={2}>
                      <Typography variant="caption" color="textSecondary">
                        {dataFmt}
                      </Typography>
                    </Box>
                    <Box
                      width={14}
                      height={14}
                      borderRadius="50%"
                      bgcolor={isStatus ? 'primary.main' : 'success.main'}
                      border="2px solid #fff"
                      boxShadow={2}
                      position="absolute"
                      left={-3}
                      top={6}
                    />
                    <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        {isStatus ? 'Alteração de status' : 'Movimentação de célula'}
                      </Typography>
                      {isStatus ? (
                        <Box mt={0.5}>
                          <Typography variant="body2">De: {statusLabel(item.status_anterior)}</Typography>
                          <Typography variant="body2">Para: {statusLabel(item.status_novo)}</Typography>
                        </Box>
                      ) : (
                        <Box mt={0.5}>
                          <Typography variant="body2">Origem: {item.celulaOrigem?.celula || '-'}</Typography>
                          <Typography variant="body2">Destino: {item.celulaDestino?.celula || '-'}</Typography>
                        </Box>
                      )}
                      <Typography variant="body2" mt={0.5}>
                        Motivo: {item.motivo || '-'}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoricoDialogOpen(false)}>Fechar</Button>
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
            value={novoStatus}
            onChange={(e) => setNovoStatus(e.target.value)}
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
          <Button
            variant="contained"
            onClick={async () => {
              if (!apeloSelecionado) return;
              const token = localStorage.getItem('token');
              try {
                const res = await fetch(`${API_URL}/start/direcionamentos/${apeloSelecionado.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ status: novoStatus, motivo_status: motivoStatus })
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data?.erro || 'Falha ao atualizar status.');
                }
                setNotification('Status atualizado com sucesso.');
                sendWebhookEvent('apelo.status_changed', {
                  apeloId: apeloSelecionado.id,
                  status: novoStatus,
                  motivo: motivoStatus
                });
                setStatusDialogOpen(false);
                setMotivoStatus('');
                fetchApelos();
              } catch (err) {
                console.error(err);
                setNotification(err.message || 'Erro ao atualizar status.');
              }
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2">Total de registros: {totalRecords}</Typography>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, value) => setPage(value)}
          color="primary"
        />
      </Box>

      <Dialog open={celulaDialogOpen} onClose={() => setCelulaDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Detalhes da célula</DialogTitle>
        <DialogContent dividers>
          {celulaDetalhe ? (
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Nome:</strong> {celulaDetalhe.celula}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Rede:</strong> {celulaDetalhe.rede || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Líder:</strong> {celulaDetalhe.lider || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Tel. do líder:</strong> {celulaDetalhe.cel_lider || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Dia:</strong> {celulaDetalhe.dia || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Horário:</strong> {celulaDetalhe.horario || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Bairro:</strong> {celulaDetalhe.bairro || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Campus:</strong> {celulaDetalhe.campus || '-'}</Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography variant="body2" color="textSecondary">Dados não disponíveis.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCelulaDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default ApelosDirecionadosPage;
