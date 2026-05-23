import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Pagination,
  useMediaQuery,
  useTheme
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import { Helmet } from 'react-helmet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon from '@mui/icons-material/History';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { PapperBlock, Notification } from 'dan-components';
import { useHistory } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import JornadaTimeline from '../../../components/Jornada/JornadaTimeline';
import { formatDateInAppTimezone, formatDateTimeInAppTimezone } from '../../../utils/dateTime';
import { sendWebhookEvent } from '../../../utils/webhookClient';
import { fetchGeocode } from '../../../utils/googleGeocode';
import { queryKeys } from '../../../utils/queryKeys';

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
  const queryClient = useQueryClient();
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [nomeFilter, setNomeFilter] = useState('');
  const [decisaoFilter, setDecisaoFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(YEAR_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [notification, setNotification] = useState('');

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [apeloSelecionado, setApeloSelecionado] = useState(null);
  const [celulaDestinoId, setCelulaDestinoId] = useState('');
  const [filtroCelula, setFiltroCelula] = useState('');
  const [motivo, setMotivo] = useState('');
  const [celulaDialogOpen, setCelulaDialogOpen] = useState(false);
  const [celulaDetalhe, setCelulaDetalhe] = useState(null);
  const [celulaPhoneForm, setCelulaPhoneForm] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [novoStatus, setNovoStatus] = useState('');
  const [motivoStatus, setMotivoStatus] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [limiteSugestoes, setLimiteSugestoes] = useState(5);
  const [notificandoLider, setNotificandoLider] = useState({});
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailApelo, setDetailApelo] = useState(null);
  const [detailForm, setDetailForm] = useState({
    bairro_apelo: '',
    cep_apelo: '',
    cidade_apelo: '',
    estado_apelo: '',
    lat_apelo: '',
    lon_apelo: '',
    bairro_proximo: [],
    rede: ''
  });
  const [detailBairroTemp, setDetailBairroTemp] = useState('');
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailGeoLoading, setDetailGeoLoading] = useState(false);
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
  const [apeloCoords, setApeloCoords] = useState(null);
  const detailGeoTimerRef = useRef(null);
  const detailGeoRequestRef = useRef(0);

  const API_URL = resolveApiUrl();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const apelosFilters = useMemo(
    () => ({
      monthFilter, statusFilter, nomeFilter, decisaoFilter, yearFilter, page
    }),
    [monthFilter, statusFilter, nomeFilter, decisaoFilter, yearFilter, page]
  );

  const apelosQuery = useQuery({
    queryKey: queryKeys.apelos.list(apelosFilters),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (apelosFilters.monthFilter) params.append('month', apelosFilters.monthFilter);
      if (apelosFilters.statusFilter) params.append('status', apelosFilters.statusFilter);
      if (apelosFilters.nomeFilter) params.append('nome', apelosFilters.nomeFilter);
      if (apelosFilters.decisaoFilter) params.append('decisao', apelosFilters.decisaoFilter);
      if (apelosFilters.yearFilter) params.append('year', apelosFilters.yearFilter);
      params.append('page', apelosFilters.page);
      params.append('limit', 10);
      const res = await fetch(`${API_URL}/start/direcionamentos/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar apelos direcionados.');
      const data = await res.json();
      if (Array.isArray(data)) {
        return { registros: data, totalPaginas: 1, totalRegistros: data.length };
      }
      return {
        registros: Array.isArray(data.registros) ? data.registros : [],
        totalPaginas: data.totalPaginas || 1,
        totalRegistros: data.totalRegistros || 0,
      };
    },
    placeholderData: (prev) => prev, // mantem dados antigos durante refetch (paginacao suave)
  });

  const apelos = apelosQuery.data?.registros || [];
  const totalPages = apelosQuery.data?.totalPaginas || 1;
  const totalRecords = apelosQuery.data?.totalRegistros || 0;
  const loading = apelosQuery.isFetching;

  if (apelosQuery.error && apelosQuery.error._reported !== true) {
    apelosQuery.error._reported = true;
    setTimeout(() => setNotification(apelosQuery.error.message || 'Erro ao buscar apelos direcionados.'), 0);
  }

  const celulasQuery = useQuery({
    queryKey: queryKeys.apelos.direcionamentos('celulas'),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/start/celula/listagemgeral`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      return lista.filter((c) => c.ativo !== false);
    },
  });
  const celulas = celulasQuery.data || [];

  const activeFilterCount = [monthFilter, statusFilter, nomeFilter, decisaoFilter, yearFilter].filter(Boolean).length;

  const clearFilters = () => {
    setNomeFilter('');
    setMonthFilter('');
    setYearFilter(YEAR_OPTIONS[0]);
    setDecisaoFilter('');
    setStatusFilter('');
    setPage(1);
  };

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

  const invalidateApelos = () => queryClient.invalidateQueries({ queryKey: queryKeys.apelos.all });

  // Atualiza um campo do apelo no cache (ex: telefone do lider, dados pos-edicao).
  const patchApeloInCache = (predicate, patcher) => {
    queryClient.setQueriesData({ queryKey: queryKeys.apelos.all }, (prev) => {
      if (!prev || !Array.isArray(prev.registros)) return prev;
      return {
        ...prev,
        registros: prev.registros.map((apelo) => (predicate(apelo) ? patcher(apelo) : apelo)),
      };
    });
  };
  const patchCelulaInCache = (celulaId, patcher) => {
    queryClient.setQueryData(queryKeys.apelos.direcionamentos('celulas'), (prev = []) => (
      prev.map((celula) => (celula?.id === celulaId ? patcher(celula) : celula))
    ));
  };

  const normalizeRede = (value) => (value || '').toString().trim().toLowerCase();
  const normalizeSearchValue = (value) => {
    const base = (value || '').toString().normalize('NFD');
    return base.replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
    const lat = Number(apelo?.lat_apelo);
    const lon = Number(apelo?.lon_apelo);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon };
    }

    const cep = String(apelo?.cep_apelo || '').replace(/\D/g, '');
    const bairro = apelo?.bairro_apelo || '';
    const cidade = apelo?.cidade_apelo || 'Campo Grande';
    const estado = apelo?.estado_apelo || 'Mato Grosso do Sul';

    const tries = [];
    if (cep.length === 8) {
      tries.push(cep);
      tries.push(`${cep} ${cidade} ${estado} Brasil`);
    }
    const queryParts = [bairro, cidade, estado, 'Brasil'].filter(Boolean);
    if (queryParts.length) {
      tries.push(queryParts.join(' '));
    }

    const found = await tries.reduce(async (accPromise, query) => {
      const acc = await accPromise;
      if (acc) return acc;
      try {
        const geocodeResult = await fetchGeocode(query);
        if (!geocodeResult) return null;
        return { lat: geocodeResult.lat, lon: geocodeResult.lon };
      } catch (err) {
        console.error('Erro ao buscar coordenadas do apelo:', err);
        return null;
      }
    }, Promise.resolve(null));

    return found;
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
    setSugestoes(calculadas);
    setLoadingSugestoes(false);
  };

  const abrirMover = (apelo) => {
    setApeloSelecionado(apelo);
    setCelulaDestinoId('');
    setMotivo('');
    setFiltroCelula('');
    setLimiteSugestoes(5);
    setMoveDialogOpen(true);
    sugerirCelulasProximas(apelo);
  };

  const moverApeloMutation = useMutation({
    mutationFn: async ({ apeloId, destinoId, motivoTexto }) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/start/direcionamentos/${apeloId}/mover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ celulaDestinoId: destinoId, motivo: motivoTexto })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.erro || 'Falha ao mover apelo.');
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: (_data, vars) => {
      setNotification('Apelo movido com sucesso.');
      sendWebhookEvent('apelo.moved', { apeloId: vars.apeloId, destinoCelulaId: vars.destinoId });
      setMoveDialogOpen(false);
      invalidateApelos();
    },
    onError: (err) => setNotification(err.message || 'Erro ao mover apelo.'),
  });

  const moverApelo = () => {
    if (!apeloSelecionado || !celulaDestinoId) {
      setNotification('Selecione a célula de destino.');
      return;
    }
    if (apeloSelecionado.celulaAtual?.id && celulaDestinoId && apeloSelecionado.celulaAtual.id === celulaDestinoId) {
      setNotification('Não é possível direcionar para a mesma célula.');
      return;
    }
    moverApeloMutation.mutate({ apeloId: apeloSelecionado.id, destinoId: celulaDestinoId, motivoTexto: motivo });
  };

  // Historico do apelo selecionado — so busca quando o dialog esta aberto.
  // Cache por apeloId; reabrir o mesmo apelo nao refetcha (staleTime).
  const historicoQuery = useQuery({
    queryKey: queryKeys.apelos.historico(apeloSelecionado?.id),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/start/direcionamentos/${apeloSelecionado.id}/historico`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar histórico.');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(historicoDialogOpen && apeloSelecionado?.id),
    staleTime: 30_000,
  });
  const historicoList = historicoQuery.data || [];
  const loadingHistorico = historicoQuery.isLoading;
  if (historicoQuery.error && historicoQuery.error._reported !== true) {
    historicoQuery.error._reported = true;
    setTimeout(() => setNotification(historicoQuery.error.message || 'Erro ao carregar histórico.'), 0);
  }

  const abrirHistorico = (apelo) => {
    setApeloSelecionado(apelo);
    setHistoricoDialogOpen(true);
  };

  const notificarLiderMutation = useMutation({
    mutationFn: async (apeloId) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/start/direcionamentos/${apeloId}/notificar-lider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.erro || 'Falha ao enviar mensagem');
      return data;
    },
    onSuccess: () => setNotification('Mensagem enviada ao líder com sucesso.'),
    onError: (err) => setNotification(err.message || 'Erro ao enviar mensagem ao líder.'),
    onSettled: (_data, _err, apeloId) => setNotificandoLider((prev) => ({ ...prev, [apeloId]: false })),
  });

  const notificarLider = (apelo) => {
    setNotificandoLider((prev) => ({ ...prev, [apelo.id]: true }));
    notificarLiderMutation.mutate(apelo.id);
  };

  const celulaAtualTexto = (apelo) => apelo?.celulaAtual?.celula || 'Sem célula';
  const abrirDetalheCelula = (celula) => {
    setCelulaDetalhe(celula || null);
    setCelulaPhoneForm(celula?.cel_lider || '');
    setCelulaDialogOpen(true);
  };

  const fecharDetalheCelula = () => {
    if (celulaSaving) return;
    setCelulaDialogOpen(false);
    setCelulaDetalhe(null);
    setCelulaPhoneForm('');
  };

  const salvarTelefoneMutation = useMutation({
    mutationFn: async ({ celulaId, telefone }) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/start/celula/${celulaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cel_lider: telefone })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.erro || 'Falha ao atualizar telefone do lider.');
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: (celulaAtualizada, { celulaId, telefone }) => {
      const novoTelefone = celulaAtualizada?.cel_lider ?? telefone ?? '';
      setCelulaDetalhe((prev) => (prev ? {
        ...prev,
        ...celulaAtualizada,
        cel_lider: novoTelefone
      } : prev));
      setCelulaPhoneForm(novoTelefone);
      patchApeloInCache(
        (apelo) => apelo?.celulaAtual?.id === celulaId,
        (apelo) => ({
          ...apelo,
          celulaAtual: {
            ...apelo.celulaAtual,
            cel_lider: novoTelefone,
            lider: celulaAtualizada?.lider || apelo.celulaAtual?.lider || null
          }
        })
      );
      patchCelulaInCache(celulaId, (celula) => ({
        ...celula,
        ...celulaAtualizada,
        cel_lider: novoTelefone
      }));
      setNotification('Telefone do lider atualizado com sucesso.');
    },
    onError: (err) => setNotification(err.message || 'Erro ao atualizar telefone do lider.'),
  });
  const celulaSaving = salvarTelefoneMutation.isPending;

  const salvarTelefoneLiderCelula = () => {
    if (!celulaDetalhe?.id || celulaSaving) return;
    salvarTelefoneMutation.mutate({ celulaId: celulaDetalhe.id, telefone: celulaPhoneForm });
  };

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

  const formatDate = (v) => formatDateInAppTimezone(v, '-');

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
    PRIMEIRO_CONTATO: { label: 'Primeiro Contato', color: 'default', sx: { bgcolor: '#0288d1', color: '#fff' } },
    ENVIO_LIDER_PENDENTE_WHATS_ERRADO: { label: 'Pendência de Envio para Líder', color: 'warning' },
    CONSOLIDADO_CELULA: { label: 'Consolidado na célula', color: 'success' },
    DIRECIONAMENTO_INCORRETO_REENVIO_PENDENTE: { label: 'Direcionamento incorreto', color: 'error' },
    ENVIO_LIDER_PENDENTE: { label: 'Líder ainda não fez contato', color: 'secondary' },
    CONTATO_LIDER_SEM_RETORNO: { label: 'Líder enviou mensagem, sem retorno', color: 'secondary' },
    CONSOLIDACAO_INTERROMPIDA: { label: 'Não Consolidado', color: 'error' },
    MOVIMENTACAO_CELULA: {
      label: 'Em movimentação de célula',
      color: 'default',
      sx: { bgcolor: '#053f81ff', color: '#ffffffff' }
    },
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

  const normalizeCepDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 8);

  const clearDetailGeoTimer = () => {
    if (detailGeoTimerRef.current) {
      clearTimeout(detailGeoTimerRef.current);
      detailGeoTimerRef.current = null;
    }
  };

  const applyDetailGeocodeResult = (geocodeResult) => {
    if (!geocodeResult) return;
    const cepNormalizado = normalizeCepDigits(geocodeResult.cepEncontrado || '');
    const estadoNormalizado = geocodeResult.uf || geocodeResult.estado || '';
    setDetailForm((prev) => ({
      ...prev,
      bairro_apelo: geocodeResult.bairro || prev.bairro_apelo || '',
      cep_apelo: cepNormalizado || prev.cep_apelo || '',
      cidade_apelo: geocodeResult.cidade || prev.cidade_apelo || '',
      estado_apelo: estadoNormalizado || prev.estado_apelo || '',
      lat_apelo: Number.isFinite(Number(geocodeResult.lat)) ? String(geocodeResult.lat) : prev.lat_apelo,
      lon_apelo: Number.isFinite(Number(geocodeResult.lon)) ? String(geocodeResult.lon) : prev.lon_apelo,
    }));
  };

  const geocodeDetailForm = async (mode, nextFormSnapshot) => {
    const requestId = detailGeoRequestRef.current + 1;
    detailGeoRequestRef.current = requestId;
    setDetailGeoLoading(true);

    try {
      let query = '';
      if (mode === 'cep') {
        const cep = normalizeCepDigits(nextFormSnapshot.cep_apelo);
        if (cep.length !== 8) return;
        query = `${cep}, Brasil`;
      } else {
        const bairro = String(nextFormSnapshot.bairro_apelo || '').trim();
        if (bairro.length < 3) return;
        const cidade = String(nextFormSnapshot.cidade_apelo || detailApelo?.cidade_apelo || 'Campo Grande').trim();
        const estado = String(nextFormSnapshot.estado_apelo || detailApelo?.estado_apelo || 'Mato Grosso do Sul').trim();
        query = [bairro, cidade, estado, 'Brasil'].filter(Boolean).join(', ');
      }

      const geocodeResult = await fetchGeocode(query);
      if (detailGeoRequestRef.current !== requestId) return;
      if (geocodeResult) {
        applyDetailGeocodeResult(geocodeResult);
      }
    } catch (err) {
      console.error('Erro ao atualizar geolocalizacao do apelo:', err);
    } finally {
      if (detailGeoRequestRef.current === requestId) {
        setDetailGeoLoading(false);
      }
    }
  };

  const scheduleDetailGeocode = (mode, nextFormSnapshot) => {
    clearDetailGeoTimer();
    const delayMs = mode === 'cep' ? 500 : 900;
    detailGeoTimerRef.current = setTimeout(() => {
      geocodeDetailForm(mode, nextFormSnapshot);
    }, delayMs);
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
      cep_apelo: normalizeCepDigits(apelo.cep_apelo || ''),
      cidade_apelo: apelo.cidade_apelo || '',
      estado_apelo: apelo.estado_apelo || '',
      lat_apelo: apelo.lat_apelo === null || apelo.lat_apelo === undefined ? '' : String(apelo.lat_apelo),
      lon_apelo: apelo.lon_apelo === null || apelo.lon_apelo === undefined ? '' : String(apelo.lon_apelo),
      bairro_proximo: proximos,
      rede: apelo.rede || ''
    });
    setDetailApelo(apelo);
    setDetailBairroTemp('');
    setDetailGeoLoading(false);
    setDetailDialogOpen(true);
  };

  const handleDetailFormChange = (field, value) => {
    const normalizedValue = field === 'cep_apelo' ? normalizeCepDigits(value) : value;
    const nextFormSnapshot = { ...detailForm, [field]: normalizedValue };
    setDetailForm((prev) => ({ ...prev, [field]: normalizedValue }));

    if (field === 'bairro_apelo') {
      const bairro = String(normalizedValue || '').trim();
      if (bairro.length >= 3) {
        scheduleDetailGeocode('bairro', nextFormSnapshot);
      } else {
        clearDetailGeoTimer();
        setDetailGeoLoading(false);
      }
    }

    if (field === 'cep_apelo') {
      const cep = normalizeCepDigits(normalizedValue);
      if (cep.length === 8) {
        scheduleDetailGeocode('cep', { ...nextFormSnapshot, cep_apelo: cep });
      } else {
        clearDetailGeoTimer();
        setDetailGeoLoading(false);
      }
    }
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
    clearDetailGeoTimer();
    setDetailGeoLoading(false);
    setDetailDialogOpen(false);
    setDetailApelo(null);
    setDetailForm({
      bairro_apelo: '',
      cep_apelo: '',
      cidade_apelo: '',
      estado_apelo: '',
      lat_apelo: '',
      lon_apelo: '',
      bairro_proximo: [],
      rede: ''
    });
    setDetailBairroTemp('');
  };

  const salvarDetalheApelo = async () => {
    if (!detailApelo) return;
    setDetailSaving(true);
    try {
      const token = localStorage.getItem('token');
      const latApelo = Number(detailForm.lat_apelo);
      const lonApelo = Number(detailForm.lon_apelo);
      const payload = {
        bairro_apelo: detailForm.bairro_apelo || null,
        cep_apelo: normalizeCepDigits(detailForm.cep_apelo) || null,
        cidade_apelo: detailForm.cidade_apelo || null,
        estado_apelo: detailForm.estado_apelo || null,
        lat_apelo: Number.isFinite(latApelo) ? latApelo : null,
        lon_apelo: Number.isFinite(lonApelo) ? lonApelo : null,
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
        throw new Error(data?.erro || 'Falha ao atualizar os detalhes do apelo.');
      }
      setNotification('Detalhes do apelo atualizados com sucesso.');
      invalidateApelos();
      fecharDetalheDialog();
    } catch (err) {
      console.error(err);
      setNotification(err.message || 'Erro ao salvar detalhes do apelo.');
    } finally {
      setDetailSaving(false);
    }
  };

  useEffect(() => () => {
    if (detailGeoTimerRef.current) {
      clearTimeout(detailGeoTimerRef.current);
      detailGeoTimerRef.current = null;
    }
  }, []);

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
    const filtradas = filtroCelula
      ? sugestoes.filter((c) => normalizeSearchValue(c.celula).includes(normalizeSearchValue(filtroCelula)))
      : sugestoes;
    return filtradas.slice(0, limiteSugestoes);
  }, [sugestoes, filtroCelula, limiteSugestoes]);

  const totalSugestoesFiltradas = useMemo(() => {
    if (!filtroCelula) return sugestoes.length;
    const termo = normalizeSearchValue(filtroCelula);
    return sugestoes.filter((c) => normalizeSearchValue(c.celula).includes(termo)).length;
  }, [sugestoes, filtroCelula]);
  const mostrarFallbackCelulas = !loadingSugestoes && sugestoes.length === 0 && celulasRedeOrdenadas.length > 0;

  return (
    <div>
      <Helmet>
        <title>Apelos Direcionados</title>
      </Helmet>
      <PapperBlock title="Apelos Direcionados" desc="Gerencie apelos direcionados e movimentações">
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="flex-start" mb={2}>
          <Accordion defaultExpanded disableGutters sx={{
            flex: 1, minWidth: 280, boxShadow: 'none', border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' }
          }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.75 } }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography variant="subtitle2">Filtros</Typography>
                {activeFilterCount > 0 && (
                  <Badge badgeContent={activeFilterCount} color="primary" sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none' } }} />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <TextField
                  label="Nome do apelo"
                  size="small"
                  value={nomeFilter}
                  onChange={(e) => {
                    setNomeFilter(e.target.value);
                    setPage(1);
                  }}
                  sx={{ minWidth: 200 }}
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
                  sx={{ width: 120 }}
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
                  sx={{ minWidth: 200 }}
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
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Object.keys(statusConfig).map((key) => (
                    <MenuItem key={key} value={key}>{statusConfig[key].label}</MenuItem>
                  ))}
                </TextField>
                {activeFilterCount > 0 && (
                  <Button size="small" onClick={clearFilters}>Limpar filtros</Button>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
          <Box display="flex" gap={1} flexShrink={0} flexWrap="wrap" alignItems="center" mt={0.5}>
            <Button variant="contained" color="secondary" onClick={() => history.push('/app/start/fila-apelos')}>
              Fila de apelos
            </Button>
            <Button variant="outlined" onClick={() => apelosQuery.refetch()} disabled={loading}>
              Atualizar
            </Button>
          </Box>
        </Box>
        {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Decisão</TableCell>
                <TableCell>Data direcionamento</TableCell>
                <TableCell>Célula atual</TableCell>
                <TableCell>Líder</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && apelos.length === 0 && (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              )}
              {!loading && apelos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <FilterListOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Nenhum apelo encontrado com esse filtro.
                    </Typography>
                    {activeFilterCount > 0 && (
                      <Button size="small" onClick={clearFilters} sx={{ mt: 1 }}>
                        Limpar filtros
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {apelos.map((apelo) => {
                const actionsDisabled = apeloSemDirecionamento(apelo);
                return (
                  <TableRow key={apelo.id} hover>
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
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <span>{celulaAtualTexto(apelo)}</span>
                        <Tooltip title="Detalhes da célula">
                          <IconButton size="small" sx={{ p: 0.3 }} onClick={() => abrirDetalheCelula(apelo.celulaAtual)}>
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>{apelo?.celulaAtual?.lider || '-'}</TableCell>
                    <TableCell>{renderStatusChip(apelo.status)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ações">
                        <span>
                          <IconButton
                            size="small"
                            disabled={actionsDisabled}
                            onClick={(e) => setRowMenuAnchor({ anchorEl: e.currentTarget, apeloId: apelo.id })}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="body2" color="text.secondary">
            {totalRecords === 0
              ? 'Nenhum registro'
              : `Mostrando ${(page - 1) * 10 + 1}–${Math.min(page * 10, totalRecords)} de ${totalRecords} registros`}
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
          />
        </Box>
      </PapperBlock>

      <Menu
        anchorEl={rowMenuAnchor?.anchorEl}
        open={Boolean(rowMenuAnchor)}
        onClose={() => setRowMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {(() => {
          const apelo = apelos.find((a) => a.id === rowMenuAnchor?.apeloId);
          return [
            <MenuItem key="historico" onClick={() => { setRowMenuAnchor(null); if (apelo) abrirHistorico(apelo); }}>
              <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Histórico</ListItemText>
            </MenuItem>,
            <MenuItem key="status" onClick={() => { setRowMenuAnchor(null); if (apelo) { setApeloSelecionado(apelo); setNovoStatus(apelo.status || ''); setMotivoStatus(''); setStatusDialogOpen(true); } }}>
              <ListItemIcon><AutorenewIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Alterar status</ListItemText>
            </MenuItem>,
            <MenuItem key="mover" onClick={() => { setRowMenuAnchor(null); if (apelo) abrirMover(apelo); }}>
              <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Mover para outra célula</ListItemText>
            </MenuItem>,
            <Divider key="div" />,
            <MenuItem
              key="whatsapp"
              disabled={!apelo?.celulaAtual?.id || !!notificandoLider[apelo?.id]}
              onClick={() => { setRowMenuAnchor(null); if (apelo && apelo.celulaAtual?.id) notificarLider(apelo); }}
            >
              <ListItemIcon><WhatsAppIcon fontSize="small" sx={{ color: 'success.main' }} /></ListItemIcon>
              <ListItemText>Notificar líder via WhatsApp</ListItemText>
            </MenuItem>,
          ];
        })()}
      </Menu>

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
            Rede: {apeloSelecionado?.rede || '-'} | CEP: {apeloSelecionado?.cep_apelo || '-'} | Cidade: {apeloSelecionado?.cidade_apelo || '-'} | Estado: {apeloSelecionado?.estado_apelo || '-'}
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
              {sugestoesFiltradas.map((c) => {
                const isSelected = celulaDestinoId === c.id;
                return (
                  <Grid item xs={12} sm={6} key={c.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        borderWidth: isSelected ? 2 : 1,
                        bgcolor: isSelected ? 'action.selected' : 'transparent',
                        transition: 'border-color 0.15s, background-color 0.15s',
                      }}
                      onClick={() => setCelulaDestinoId(c.id)}
                    >
                      <CardContent sx={{ pb: '12px !important' }}>
                        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                          {isSelected && <CheckCircleIcon fontSize="small" color="primary" />}
                          <Typography variant="subtitle2">{c.celula}</Typography>
                        </Box>
                        <Typography variant="caption" display="block">Rede: {c.rede}</Typography>
                        <Typography variant="caption" display="block">Bairro: {c.bairro || '-'}</Typography>
                        <Typography variant="caption" display="block">Dia: {c.dia || '-'}</Typography>
                        <Typography variant="caption" display="block">Horário: {c.horario || '-'}</Typography>
                        <Typography variant="caption" display="block">Distância: {c.distancia ? `${c.distancia.toFixed(1)} km` : '-'}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
            {!loadingSugestoes && limiteSugestoes < totalSugestoesFiltradas && (
              <Box mt={1} display="flex" justifyContent="center">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setLimiteSugestoes((prev) => prev + 5)}
                >
                  Ver mais 5 sugestões
                </Button>
              </Box>
            )}
            {mostrarFallbackCelulas && (
              <Box mt={2}>
                <Typography variant="body2" gutterBottom>Lista completa da rede</Typography>
                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                  Como não há sugestões próximas, exibimos todas as células da rede (busca não altera esta lista) para que você veja qual está menos longe.
                </Typography>
                <Grid container spacing={1}>
                  {celulasRedeOrdenadas.map((c) => {
                    const isSelected = celulaDestinoId === c.id;
                    return (
                      <Grid item xs={12} sm={6} key={`rede-${c.id}`}>
                        <Card
                          variant="outlined"
                          sx={{
                            cursor: 'pointer',
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            borderWidth: isSelected ? 2 : 1,
                            bgcolor: isSelected ? 'action.selected' : 'transparent',
                            transition: 'border-color 0.15s, background-color 0.15s',
                          }}
                          onClick={() => setCelulaDestinoId(c.id)}
                        >
                          <CardContent sx={{ pb: '12px !important' }}>
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                              {isSelected && <CheckCircleIcon fontSize="small" color="primary" />}
                              <Typography variant="subtitle2">{c.celula}</Typography>
                            </Box>
                            <Typography variant="caption" display="block">Rede: {c.rede}</Typography>
                            <Typography variant="caption" display="block">Bairro: {c.bairro || '-'}</Typography>
                            <Typography variant="caption" display="block">Dia: {c.dia || '-'}</Typography>
                            <Typography variant="caption" display="block">Horário: {c.horario || '-'}</Typography>
                            <Typography variant="caption" display="block">
                              Distância: {c.distancia ? `${c.distancia.toFixed(1)} km` : '-'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
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
                  <TextField
                    fullWidth
                    size="small"
                    label="CEP"
                    value={detailForm.cep_apelo}
                    onChange={(e) => handleDetailFormChange('cep_apelo', e.target.value)}
                    disabled={detailSaving}
                    helperText="Ao informar CEP, cidade/estado/latitude/longitude serão atualizados automaticamente."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cidade"
                    value={detailForm.cidade_apelo || ''}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Estado"
                    value={detailForm.estado_apelo || ''}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Latitude"
                    value={detailForm.lat_apelo || ''}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Longitude"
                    value={detailForm.lon_apelo || ''}
                    InputProps={{ readOnly: true }}
                  />
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
                <Typography variant="subtitle2" gutterBottom>Editar bairro e CEP</Typography>
                <TextField
                  fullWidth
                  label="Bairro do apelo"
                  value={detailForm.bairro_apelo}
                  onChange={(e) => handleDetailFormChange('bairro_apelo', e.target.value)}
                  disabled={detailSaving}
                  helperText="Ao alterar o bairro, CEP/cidade/estado/latitude/longitude serão atualizados automaticamente."
                />
                {detailGeoLoading && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Atualizando localização automaticamente...
                  </Typography>
                )}
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
          <Button onClick={fecharDetalheDialog} disabled={detailSaving || detailGeoLoading}>Cancelar</Button>
          <Button variant="contained" onClick={salvarDetalheApelo} disabled={detailSaving || detailGeoLoading}>
            {detailSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historicoDialogOpen} onClose={() => setHistoricoDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Histórico de movimentações</DialogTitle>
        <DialogContent dividers>
          {loadingHistorico ? (
            <Box>
              {Array.from({ length: 4 }).map((_, i) => (
                <Box key={i} display="flex" gap={2} mb={2}>
                  <Skeleton variant="circular" width={12} height={12} sx={{ mt: 0.75, flexShrink: 0 }} />
                  <Box flex={1}>
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="60%" />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <JornadaTimeline
              emptyText="Nenhuma movimentação encontrada."
              initialCount={20}
              items={historicoList.map((item, idx) => {
                const isStatus = item.tipo_evento === 'STATUS' || item.status_anterior || item.status_novo;
                const dataFmt = formatDateTimeInAppTimezone(item.data_movimento, '-');
                let description;
                if (isStatus) {
                  const partes = [];
                  if (item.status_anterior) partes.push(`De: ${statusLabel(item.status_anterior)}`);
                  if (item.status_novo) partes.push(`Para: ${statusLabel(item.status_novo)}`);
                  if (item.motivo) partes.push(`Motivo: ${item.motivo}`);
                  description = partes.join(' · ');
                } else {
                  const partes = [];
                  partes.push(`Origem: ${item.celulaOrigem?.celula || '-'}`);
                  partes.push(`Destino: ${item.celulaDestino?.celula || '-'}`);
                  if (item.motivo) partes.push(`Motivo: ${item.motivo}`);
                  description = partes.join(' · ');
                }
                return {
                  id: item.id || idx,
                  date: dataFmt,
                  title: isStatus ? 'Alteração de status' : 'Movimentação de célula',
                  description,
                  type: isStatus ? 'milestone' : 'activity',
                };
              })}
            />
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
                invalidateApelos();
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

      <Dialog open={celulaDialogOpen} onClose={fecharDetalheCelula} fullWidth maxWidth="sm">
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
                <TextField
                  fullWidth
                  size="small"
                  label="Tel. do lider"
                  value={celulaPhoneForm}
                  onChange={(e) => setCelulaPhoneForm(e.target.value)}
                  disabled={celulaSaving}
                />
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
          <Button onClick={fecharDetalheCelula} disabled={celulaSaving}>Fechar</Button>
          <Button
            variant="contained"
            onClick={salvarTelefoneLiderCelula}
            disabled={!celulaDetalhe || celulaSaving}
          >
            {celulaSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default ApelosDirecionadosPage;
