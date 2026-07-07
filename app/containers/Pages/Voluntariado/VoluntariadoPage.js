import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Autocomplete,
  Avatar,
  Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider,
  Grid, IconButton, MenuItem, Paper, Skeleton, TextField, Tooltip, Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import PropTypes from 'prop-types';
import * as XLSX from 'xlsx';
import JsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import FilterListIcon from '@mui/icons-material/FilterList';
import GridOnIcon from '@mui/icons-material/GridOn';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { formatDateInAppTimezone } from '../../../utils/dateTime';
import {
  listarVoluntariados,
  criarVoluntariado,
  atualizarVoluntariado,
  aprovarVoluntariado,
  encerrarVoluntariado,
  removerVoluntariado,
  listarAreas,
  listarCampi,
} from '../../../api/voluntariadoApi';
import { listarMembros } from '../../../api/membersApi';
import { listarMinisteriosPorCampus } from '../../../api/cultosApi';

const ENTRADA_VAZIA = {
  areaVoluntariadoId: '',
  campiSelecionados: [],
  ministeriosSelecionados: [],
  ministeriosDisponiveis: [],
  dataInicio: '',
  observacao: '',
};

const gerarCombos = (e) => {
  const cIds = e.campiSelecionados.map((c) => c.id);
  const mIds = e.ministeriosSelecionados.map((m) => m.id);
  if (cIds.length === 0 && mIds.length === 0) return [{ campusId: null, ministerioId: null }];
  if (cIds.length > 0 && mIds.length === 0) return cIds.map((cId) => ({ campusId: cId, ministerioId: null }));
  if (cIds.length === 0 && mIds.length > 0) return mIds.map((mId) => ({ campusId: null, ministerioId: mId }));
  return cIds.flatMap((cId) => mIds.map((mId) => ({ campusId: cId, ministerioId: mId })));
};

const contarCombos = (e) => gerarCombos(e).length;

const STATUS_CONFIG = {
  PENDENTE: { label: 'Pendente', color: 'warning' },
  APROVADO: { label: 'Aprovado', color: 'success' },
  ENCERRADO: { label: 'Encerrado', color: 'default' },
};

const formatDate = (d) => formatDateInAppTimezone(d, '-');
const STATUS_POR_TAB = ['PENDENTE', 'APROVADO', 'ENCERRADO'];

const getMemberGroupKey = (v) => v.memberId || v.membro?.id || `sem-membro:${v.id}`;

const getMemberDisplayName = (membro, memberId) => {
  if (!membro) return memberId;
  return membro.preferredName || membro.fullName || membro.email || memberId;
};

// ── Helpers de avatar ─────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1565c0', '#2e7d32', '#c62828', '#6a1b9a', '#e65100', '#00695c', '#4527a0', '#283593', '#ad1457', '#00838f'];

const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash); // eslint-disable-line no-bitwise
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name) => {
  const parts = String(name || '').trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ── KPI Card clicável ─────────────────────────────────────────────────────────
const KpiTab = ({
  label, count, bgColor, active, onClick
}) => (
  <Paper
    onClick={onClick}
    elevation={active ? 3 : 0}
    sx={{
      px: 2.5,
      py: 1.5,
      cursor: 'pointer',
      borderRadius: 2,
      border: '2px solid',
      borderColor: active ? bgColor : 'divider',
      minWidth: 110,
      transition: 'all 0.15s ease',
      '&:hover': { borderColor: bgColor, boxShadow: 2 },
    }}
  >
    <Typography variant="h5" fontWeight={800} color={active ? bgColor : 'text.primary'} lineHeight={1.1}>
      {count}
    </Typography>
    <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
  </Paper>
);

KpiTab.propTypes = {
  label: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  bgColor: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

const KPI_TABS = [
  { label: 'Pendentes', status: 'PENDENTE', bgColor: '#ed6c02' },
  { label: 'Aprovados', status: 'APROVADO', bgColor: '#2e7d32' },
  { label: 'Encerrados', status: 'ENCERRADO', bgColor: '#757575' },
];

// ─── Componente principal ─────────────────────────────────────────────────────
const VoluntariadoPage = () => {
  const [voluntariados, setVoluntariados] = useState([]);
  const [areas, setAreas] = useState([]);
  const [campi, setCampi] = useState([]);
  const [membros, setMembros] = useState([]);
  const [loadingMembros, setLoadingMembros] = useState(false);
  const [inputMembro, setInputMembro] = useState('');
  const [notification, setNotification] = useState('');
  const [tabAtiva, setTabAtiva] = useState(0);
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroCampus, setFiltroCampus] = useState('');
  const [filtroMinisterio, setFiltroMinisterio] = useState('');
  const [ministeriosFiltro, setMinisteriosFiltro] = useState([]);
  const [expandidos, setExpandidos] = useState(new Set());
  const toggleExpandido = (key) => setExpandidos((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const [dialog, setDialog] = useState({ open: false, editando: null });
  const [dialogEncerrar, setDialogEncerrar] = useState({ open: false, ids: [], dataFim: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [entradas, setEntradas] = useState([{ ...ENTRADA_VAZIA }]);
  const [membroSelecionado, setMembroSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      listarVoluntariados(),
      listarAreas(),
      listarCampi()
    ])
      .then(([vols, areasData, campiData]) => {
        setVoluntariados(vols);
        setAreas(areasData);
        const lista = Array.isArray(campiData) ? campiData : (campiData?.campuses || campiData?.data || []);
        setCampi(lista);
      })
      .catch(() => setNotification('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  };

  const buscarMembros = useCallback((texto) => {
    setLoadingMembros(true);
    listarMembros({ search: texto || '', limit: 50 })
      .then((data) => {
        const lista = Array.isArray(data) ? data : (data?.members || data?.data || []);
        setMembros(lista);
      })
      .catch(() => {})
      .finally(() => setLoadingMembros(false));
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!dialog.open) return undefined;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarMembros(inputMembro), 400);
    return () => clearTimeout(debounceRef.current);
  }, [inputMembro, dialog.open, buscarMembros]);

  useEffect(() => {
    setFiltroMinisterio('');
    if (!filtroCampus) { setMinisteriosFiltro([]); return; }
    listarMinisteriosPorCampus(filtroCampus)
      .then((data) => setMinisteriosFiltro(Array.isArray(data) ? data : []))
      .catch(() => setMinisteriosFiltro([]));
  }, [filtroCampus]);

  const voluntariadosFiltrados = useMemo(() => {
    const statusAtivo = STATUS_POR_TAB[tabAtiva];
    return voluntariados.filter((v) => {
      if (v.status !== statusAtivo) return false;
      if (filtroArea && v.areaVoluntariadoId !== filtroArea) return false;
      if (filtroCampus && v.campusId !== filtroCampus) return false;
      if (filtroMinisterio && v.ministerioId !== filtroMinisterio) return false;
      return true;
    });
  }, [voluntariados, tabAtiva, filtroArea, filtroCampus, filtroMinisterio]);

  const voluntariadosAgrupados = useMemo(() => {
    const groups = new Map();
    voluntariadosFiltrados.forEach((v) => {
      const key = getMemberGroupKey(v);
      if (!groups.has(key)) {
        groups.set(key, {
          key, memberId: v.memberId, membro: v.membro || null, status: v.status, items: []
        });
      }
      groups.get(key).items.push(v);
    });
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => String(a.area?.nome || '').toLowerCase().localeCompare(String(b.area?.nome || '').toLowerCase()))
      }))
      .sort((a, b) => {
        const nomeA = getMemberDisplayName(a.membro, a.memberId);
        const nomeB = getMemberDisplayName(b.membro, b.memberId);
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      });
  }, [voluntariadosFiltrados]);

  const nomeExibicaoMembro = (group) => getMemberDisplayName(group.membro, group.memberId);

  const handleEntradaChange = (idx, campo, valor) => {
    setEntradas((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [campo]: valor };
      return next;
    });
  };

  const handleEntradaCampiChange = (idx, campiSelecionados) => {
    setEntradas((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx], campiSelecionados, ministeriosSelecionados: [], ministeriosDisponiveis: []
      };
      return next;
    });
    if (!campiSelecionados.length) return;
    Promise.all(campiSelecionados.map((c) => listarMinisteriosPorCampus(c.id)))
      .then((results) => {
        const map = new Map();
        results.forEach((list) => (Array.isArray(list) ? list : []).forEach((m) => map.set(m.id, m)));
        const ministerios = Array.from(map.values());
        setEntradas((prev) => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx], ministeriosDisponiveis: ministerios };
          return next;
        });
      })
      .catch(() => {});
  };

  const adicionarEntrada = () => setEntradas((prev) => [...prev, { ...ENTRADA_VAZIA }]);
  const removerEntrada = (idx) => setEntradas((prev) => prev.filter((_, i) => i !== idx));

  const abrirNovo = () => {
    setEntradas([{ ...ENTRADA_VAZIA }]);
    setMembroSelecionado(null);
    setInputMembro('');
    setMembros([]);
    setDialog({ open: true, editando: null });
  };

  const abrirEditar = (v) => {
    const campiSelecionados = v.campus ? [{ id: v.campusId, nome: v.campus.nome }] : [];
    const ministeriosSelecionados = v.ministerio ? [{ id: v.ministerioId, nome: v.ministerio.nome }] : [];
    const entrada = {
      areaVoluntariadoId: v.areaVoluntariadoId,
      campiSelecionados,
      ministeriosSelecionados,
      ministeriosDisponiveis: ministeriosSelecionados,
      dataInicio: v.dataInicio || '',
      observacao: v.observacao || '',
    };
    setEntradas([entrada]);
    if (campiSelecionados.length) {
      listarMinisteriosPorCampus(campiSelecionados[0].id)
        .then((data) => setEntradas((prev) => {
          const next = [...prev];
          if (next[0]) next[0] = { ...next[0], ministeriosDisponiveis: Array.isArray(data) ? data : [] };
          return next;
        }))
        .catch(() => {});
    }
    const membroAtual = v.membro
      ? {
        id: v.memberId, fullName: v.membro.fullName, preferredName: v.membro.preferredName, email: v.membro.email
      }
      : null;
    setMembroSelecionado(membroAtual);
    setInputMembro(membroAtual ? (membroAtual.preferredName || membroAtual.fullName || '') : '');
    setMembros(membroAtual ? [membroAtual] : []);
    setDialog({ open: true, editando: v });
  };

  const fecharDialog = () => {
    setDialog({ open: false, editando: null });
    setMembroSelecionado(null);
    setInputMembro('');
    setMembros([]);
    setEntradas([{ ...ENTRADA_VAZIA }]);
  };

  const handleSalvar = async () => {
    if (!membroSelecionado?.id) { setNotification('Selecione um membro'); return; }
    const invalida = entradas.find((e) => !e.areaVoluntariadoId || !e.dataInicio);
    if (invalida) { setNotification('Área e data de início são obrigatórios em todas as entradas'); return; }
    const buildRegistros = () => entradas.flatMap((e) => gerarCombos(e).map((combo) => ({
      memberId: membroSelecionado.id,
      areaVoluntariadoId: e.areaVoluntariadoId,
      campusId: combo.campusId,
      ministerioId: combo.ministerioId,
      dataInicio: e.dataInicio,
      observacao: e.observacao || null
    }))
    );
    try {
      if (dialog.editando) {
        const todos = buildRegistros();
        const [primeiro, ...extras] = todos;
        await atualizarVoluntariado(dialog.editando.id, primeiro);
        if (extras.length) await Promise.all(extras.map((r) => criarVoluntariado(r)));
        const total = todos.length;
        setNotification(total > 1
          ? `Registro atualizado + ${extras.length} novo(s) vínculo(s) criado(s)`
          : 'Voluntariado atualizado com sucesso');
      } else {
        const registros = buildRegistros();
        const results = await Promise.allSettled(registros.map((r) => criarVoluntariado(r)));
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        const fail = results.filter((r) => r.status === 'rejected').length;
        if (fail > 0) {
          setNotification(ok > 0
            ? `${ok} vínculo(s) cadastrado(s), ${fail} falhou — verifique os dados`
            : 'Erro ao cadastrar vínculos');
        } else {
          setNotification(ok > 1
            ? `${ok} vínculos cadastrados — aguardando aprovação`
            : 'Voluntariado cadastrado com sucesso — aguardando aprovação');
        }
        setFiltroCampus('');
        setFiltroMinisterio('');
        setTabAtiva(0);
      }
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar');
    } finally {
      fecharDialog();
      loadData();
    }
  };

  const handleAprovar = async (ids = []) => {
    const idsList = Array.isArray(ids) ? ids : [ids];
    if (!idsList.length) return;
    try {
      await Promise.all(idsList.map((id) => aprovarVoluntariado(id)));
      setNotification(idsList.length > 1
        ? `${idsList.length} vínculos aprovados com sucesso`
        : 'Voluntariado aprovado com sucesso');
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao aprovar');
    }
  };

  const abrirEncerrar = (group) => {
    const hoje = new Date().toISOString().slice(0, 10);
    const ids = group.items.map((item) => item.id);
    const dataFimAtual = group.items.map((item) => item.dataFim).find(Boolean);
    setDialogEncerrar({ open: true, ids, dataFim: dataFimAtual || hoje });
  };

  const handleEncerrar = async () => {
    if (!dialogEncerrar.ids.length) return;
    try {
      const total = dialogEncerrar.ids.length;
      await Promise.all(dialogEncerrar.ids.map((id) => encerrarVoluntariado(id, dialogEncerrar.dataFim || null)));
      setNotification(total > 1
        ? `${total} vínculos encerrados com sucesso`
        : 'Voluntariado encerrado com sucesso');
      setDialogEncerrar({ open: false, ids: [], dataFim: '' });
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao encerrar');
    }
  };

  const handleRemover = async () => {
    if (!confirmDelete?.ids?.length) return;
    try {
      const total = confirmDelete.ids.length;
      await Promise.all(confirmDelete.ids.map((id) => removerVoluntariado(id)));
      setConfirmDelete(null);
      setNotification(total > 1 ? `${total} vínculos removidos` : 'Voluntariado removido');
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao remover');
    }
  };

  const contadores = useMemo(() => {
    const membersByStatus = { PENDENTE: new Set(), APROVADO: new Set(), ENCERRADO: new Set() };
    voluntariados.forEach((v) => {
      if (!membersByStatus[v.status]) return;
      if (filtroArea && v.areaVoluntariadoId !== filtroArea) return;
      if (filtroCampus && v.campusId !== filtroCampus) return;
      if (filtroMinisterio && v.ministerioId !== filtroMinisterio) return;
      membersByStatus[v.status].add(getMemberGroupKey(v));
    });
    return { PENDENTE: membersByStatus.PENDENTE.size, APROVADO: membersByStatus.APROVADO.size, ENCERRADO: membersByStatus.ENCERRADO.size };
  }, [voluntariados, filtroArea, filtroCampus, filtroMinisterio]);

  const dadosParaExportar = useMemo(() => voluntariadosFiltrados
    .map((v) => ({
      Membro: getMemberDisplayName(v.membro, v.memberId),
      Área: v.area?.nome || '',
      Campus: v.campus?.nome || '',
      Ministério: v.ministerio?.nome || '',
      Status: STATUS_CONFIG[v.status]?.label || v.status,
      'Data Início': v.dataInicio ? formatDate(v.dataInicio) : '',
      'Data Fim': v.dataFim ? formatDate(v.dataFim) : '',
      Observação: v.observacao || '',
    }))
    .sort((a, b) => a.Membro.localeCompare(b.Membro, 'pt-BR')),
  [voluntariadosFiltrados]);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voluntários');
    XLSX.writeFile(wb, `voluntarios_${KPI_TABS[tabAtiva].label.toLowerCase()}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new JsPDF({ orientation: 'landscape' });
    const statusLabel = KPI_TABS[tabAtiva].label;
    doc.setFontSize(14);
    doc.text(`Voluntários — ${statusLabel}`, 14, 15);

    const descFiltros = [
      filtroArea && `Área: ${areas.find((a) => a.id === filtroArea)?.nome || ''}`,
      filtroCampus && `Campus: ${campi.find((c) => c.id === filtroCampus)?.nome || ''}`,
      filtroMinisterio && `Ministério: ${ministeriosFiltro.find((m) => m.id === filtroMinisterio)?.nome || ''}`,
    ].filter(Boolean).join('  |  ');
    if (descFiltros) {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(descFiltros, 14, 22);
    }

    autoTable(doc, {
      startY: descFiltros ? 27 : 21,
      head: [['Membro', 'Área', 'Campus', 'Ministério', 'Status', 'Data Início', 'Data Fim', 'Observação']],
      body: dadosParaExportar.map((row) => Object.values(row)),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`voluntarios_${statusLabel.toLowerCase()}.pdf`);
  };

  const temFiltro = Boolean(filtroArea || filtroCampus);

  return (
    <div>
      <Helmet><title>Voluntários</title></Helmet>
      <PapperBlock title="Voluntários" icon="ion-ios-heart-outline" desc="Gerencie os vínculos de voluntariado dos membros">

        {/* ── KPIs como seletores de aba ── */}
        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap" mb={2.5}>
          {KPI_TABS.map(({ label, status, bgColor }, idx) => (
            <KpiTab
              key={status}
              label={label}
              count={contadores[status]}
              bgColor={bgColor}
              active={tabAtiva === idx}
              onClick={() => setTabAtiva(idx)}
            />
          ))}
          <Box flex={1} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNovo} sx={{ height: 40 }}>
            Vincular Voluntário
          </Button>
        </Box>

        {/* ── Filtros ── */}
        <Paper
          variant="outlined"
          sx={{
            px: 2, py: 1.5, mb: 2.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderRadius: 2
          }}
        >
          <FilterListIcon fontSize="small" sx={{ color: 'text.disabled' }} />
          <TextField
            select size="small" label="Área" value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todas as áreas</MenuItem>
            {areas.map((a) => <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Campus" value={filtroCampus}
            onChange={(e) => setFiltroCampus(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos os campus</MenuItem>
            {campi.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
          </TextField>
          {filtroCampus && (
            <TextField
              select size="small" label="Ministério" value={filtroMinisterio}
              onChange={(e) => setFiltroMinisterio(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todos os ministérios</MenuItem>
              {ministeriosFiltro.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
            </TextField>
          )}
          {temFiltro && (
            <Button size="small" color="inherit"
              onClick={() => { setFiltroArea(''); setFiltroCampus(''); setFiltroMinisterio(''); }}>
              Limpar filtros
            </Button>
          )}
          <Box flex={1} />
          <Tooltip title="Exportar Excel">
            <span>
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<GridOnIcon fontSize="small" />}
                onClick={exportarExcel}
                disabled={dadosParaExportar.length === 0}
                sx={{ minWidth: 'unset', px: 1.5 }}
              >
                Excel
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Exportar PDF">
            <span>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<PictureAsPdfIcon fontSize="small" />}
                onClick={exportarPDF}
                disabled={dadosParaExportar.length === 0}
                sx={{ minWidth: 'unset', px: 1.5 }}
              >
                PDF
              </Button>
            </span>
          </Tooltip>
        </Paper>

        {/* ── Lista de membros ── */}
        {loading ? (
          <Box display="flex" flexDirection="column" gap={1}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Paper key={i} elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Skeleton variant="circular" width={44} height={44} />
                  <Box flex={1}>
                    <Skeleton width={200} height={18} />
                    <Skeleton width={90} height={14} sx={{ mt: 0.5 }} />
                  </Box>
                  <Skeleton width={220} height={26} sx={{ borderRadius: 4 }} />
                  <Skeleton width={76} height={26} sx={{ borderRadius: 4 }} />
                  <Skeleton variant="circular" width={30} height={30} />
                </Box>
              </Paper>
            ))}
          </Box>
        ) : voluntariadosAgrupados.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={8} gap={1.5}>
            <PeopleOutlineIcon sx={{ fontSize: 52, color: 'text.disabled' }} />
            <Typography variant="body1" color="text.secondary" fontWeight={600}>
              Nenhum voluntário {KPI_TABS[tabAtiva].label.toLowerCase()}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {temFiltro
                ? 'Tente ajustar ou limpar os filtros'
                : tabAtiva === 0 ? 'Clique em "Vincular Voluntário" para começar' : 'Nenhum registro nesta categoria'}
            </Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={1}>
            {voluntariadosAgrupados.map((group) => {
              const cfg = STATUS_CONFIG[group.status] || {};
              const aberto = expandidos.has(group.key);
              const memberName = nomeExibicaoMembro(group);
              const initials = getInitials(memberName);
              const avatarColor = getAvatarColor(memberName);

              return (
                <Paper
                  key={group.key}
                  elevation={0}
                  variant="outlined"
                  sx={{
                    borderRadius: 2, overflow: 'hidden', transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 2 }
                  }}
                >
                  {/* ── Linha principal do membro ── */}
                  <Box
                    onClick={() => toggleExpandido(group.key)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {/* Avatar com iniciais */}
                    <Avatar sx={{
                      bgcolor: avatarColor, width: 42, height: 42, fontSize: 15, fontWeight: 700, flexShrink: 0
                    }}>
                      {initials}
                    </Avatar>

                    {/* Nome + contagem */}
                    <Box sx={{ flexShrink: 0, width: { xs: 140, md: 200 } }}>
                      <Typography variant="body2" fontWeight={600} noWrap title={memberName}>{memberName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.items.length} vínculo{group.items.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>

                    {/* Chips dos vínculos */}
                    <Box flex={1} display="flex" flexWrap="wrap" gap={0.5} sx={{ minWidth: 0, overflow: 'hidden' }}>
                      {group.items.map((item) => (
                        <Chip
                          key={item.id}
                          label={[item.area?.nome, item.campus?.nome, item.ministerio?.nome].filter(Boolean).join(' › ')}
                          size="small"
                          variant="outlined"
                          sx={{ maxWidth: 280, fontSize: 11 }}
                        />
                      ))}
                    </Box>

                    {/* Status */}
                    <Chip label={cfg.label} size="small" color={cfg.color} sx={{ flexShrink: 0 }} />

                    {/* Ações do grupo */}
                    <Box display="flex" gap={0.5} onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
                      {group.status === 'PENDENTE' && (
                        <Tooltip title={group.items.length > 1 ? 'Aprovar todos os vínculos' : 'Aprovar'}>
                          <IconButton size="small" color="success" onClick={() => handleAprovar(group.items.map((i) => i.id))}>
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {group.status === 'APROVADO' && group.items.length > 1 && (
                        <Tooltip title="Encerrar todos os vínculos">
                          <IconButton size="small" color="warning" onClick={() => abrirEncerrar(group)}>
                            <ExitToAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton size="small" onClick={() => toggleExpandido(group.key)}>
                        {aberto ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                      </IconButton>
                    </Box>
                  </Box>

                  {/* ── Detalhe expandido ── */}
                  <Collapse in={aberto} unmountOnExit>
                    <Divider />
                    <Box sx={{ bgcolor: 'grey.50' }}>
                      {group.items.map((item, itemIdx) => (
                        <Box
                          key={item.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 3,
                            py: 1.25,
                            borderBottom: itemIdx < group.items.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                            '&:hover': { bgcolor: 'white' },
                            transition: 'background 0.1s',
                          }}
                        >
                          {/* Área */}
                          <Chip
                            label={item.area?.nome || '—'}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: 11, flexShrink: 0 }}
                          />

                          {/* Campus › Ministério */}
                          <Typography variant="body2" flex={1} color="text.secondary" noWrap>
                            {[item.campus?.nome, item.ministerio?.nome].filter(Boolean).join(' › ') || '—'}
                          </Typography>

                          {/* Data início → fim */}
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {item.dataInicio ? formatDate(item.dataInicio) : '—'}
                            {item.dataFim ? ` → ${formatDate(item.dataFim)}` : ''}
                          </Typography>

                          {/* Observação */}
                          {item.observacao && (
                            <Tooltip title={item.observacao} placement="top">
                              <Typography variant="caption" color="text.disabled" noWrap sx={{ maxWidth: 120, flexShrink: 0 }}>
                                {item.observacao}
                              </Typography>
                            </Tooltip>
                          )}

                          {/* Ações do item */}
                          <Box display="flex" gap={0.5} sx={{ flexShrink: 0 }}>
                            {item.status === 'PENDENTE' && (
                              <Tooltip title="Aprovar">
                                <IconButton size="small" color="success" onClick={() => handleAprovar([item.id])}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {item.status === 'APROVADO' && (
                              <Tooltip title="Encerrar">
                                <IconButton size="small" color="warning" onClick={() => abrirEncerrar({ items: [item] })}>
                                  <ExitToAppIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {item.status !== 'ENCERRADO' && (
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => abrirEditar(item)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Remover">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setConfirmDelete({ ids: [item.id], memberName, areaNome: item.area?.nome })}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </Box>
        )}

        {/* ── Dialog cadastro/edição ── */}
        <Dialog open={dialog.open} onClose={fecharDialog} maxWidth="md" fullWidth>
          <DialogTitle>{dialog.editando ? 'Editar Vínculo' : 'Vincular Voluntário'}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>

              <Autocomplete
                options={membros}
                getOptionLabel={(m) => {
                  const nome = m.preferredName || m.fullName || '';
                  const email = m.email ? ` (${m.email})` : '';
                  return `${nome}${email}` || m.id;
                }}
                filterOptions={(x) => x}
                loading={loadingMembros}
                inputValue={inputMembro}
                onInputChange={(_, val) => setInputMembro(val)}
                value={membroSelecionado}
                onChange={(_, newValue) => setMembroSelecionado(newValue)}
                disabled={Boolean(dialog.editando)}
                noOptionsText={inputMembro.length < 2 ? 'Digite pelo menos 2 caracteres' : 'Nenhum membro encontrado'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Membro *"
                    placeholder="Digite o nome para buscar..."
                    helperText="Busca por nome, e-mail ou CPF"
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
              />

              {entradas.map((entrada, idx) => {
                const totalEntrada = contarCombos(entrada);
                return (
                  <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {`Área ${idx + 1}`}
                        {totalEntrada > 1 && (
                          <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 1 }}>
                            ({totalEntrada} registros)
                          </Typography>
                        )}
                      </Typography>
                      {entradas.length > 1 && (
                        <IconButton size="small" color="error" onClick={() => removerEntrada(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          select fullWidth required size="small"
                          label="Área de Voluntariado"
                          value={entrada.areaVoluntariadoId}
                          onChange={(e) => handleEntradaChange(idx, 'areaVoluntariadoId', e.target.value)}
                        >
                          {areas.filter((a) => a.ativo).map((a) => (
                            <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth required size="small"
                          label="Data de Início"
                          type="date"
                          value={entrada.dataInicio}
                          onChange={(e) => handleEntradaChange(idx, 'dataInicio', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth size="small"
                          label="Observação"
                          value={entrada.observacao}
                          onChange={(e) => handleEntradaChange(idx, 'observacao', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Autocomplete
                          multiple
                          options={campi}
                          value={entrada.campiSelecionados}
                          onChange={(_, val) => handleEntradaCampiChange(idx, val)}
                          getOptionLabel={(o) => o.nome}
                          isOptionEqualToValue={(a, b) => a.id === b.id}
                          renderTags={(val, getTagProps) => val.map((c, i) => <Chip key={c.id} label={c.nome} size="small" {...getTagProps({ index: i })} />)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              label="Campus"
                              placeholder={entrada.campiSelecionados.length ? '' : 'Nenhum (opcional)'}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Autocomplete
                          multiple
                          options={entrada.ministeriosDisponiveis}
                          value={entrada.ministeriosSelecionados}
                          onChange={(_, val) => handleEntradaChange(idx, 'ministeriosSelecionados', val)}
                          disabled={!entrada.campiSelecionados.length}
                          getOptionLabel={(o) => o.nome}
                          isOptionEqualToValue={(a, b) => a.id === b.id}
                          renderTags={(val, getTagProps) => val.map((m, i) => <Chip key={m.id} label={m.nome} size="small" {...getTagProps({ index: i })} />)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              label="Ministérios"
                              placeholder={entrada.campiSelecionados.length ? '' : 'Selecione campus primeiro'}
                              helperText={
                                entrada.campiSelecionados.length && !entrada.ministeriosDisponiveis.length ? 'Carregando...' : ''
                              }
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={adicionarEntrada}
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              >
                Adicionar outra área
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialog}>Cancelar</Button>
            <Button variant="contained" onClick={handleSalvar}>
              {(() => {
                const total = entradas.reduce((acc, e) => acc + contarCombos(e), 0);
                if (dialog.editando) {
                  return total > 1 ? `Salvar + criar (${total - 1} novo${total - 1 !== 1 ? 's' : ''})` : 'Salvar';
                }
                return total > 1 ? `Cadastrar (${total} registros)` : 'Cadastrar';
              })()}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Dialog encerrar ── */}
        <Dialog
          open={dialogEncerrar.open}
          onClose={() => setDialogEncerrar({ open: false, ids: [], dataFim: '' })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Encerrar Voluntariado</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Informe a data de saída do voluntário.
            </Typography>
            <TextField
              fullWidth
              label="Data de Fim"
              type="date"
              value={dialogEncerrar.dataFim}
              onChange={(e) => setDialogEncerrar((prev) => ({ ...prev, dataFim: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogEncerrar({ open: false, ids: [], dataFim: '' })}>Cancelar</Button>
            <Button variant="contained" color="warning" onClick={handleEncerrar}>Encerrar</Button>
          </DialogActions>
        </Dialog>

        {/* ── Confirmação remover ── */}
        <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs">
          <DialogTitle>Confirmar remoção</DialogTitle>
          <DialogContent>
            <Typography>
              {confirmDelete?.areaNome
                ? `Remover o vínculo de ${confirmDelete.areaNome} de ${confirmDelete.memberName}?`
                : `Remover vínculo de voluntariado de ${confirmDelete?.memberName || 'este membro'}?`}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={handleRemover}>Remover</Button>
          </DialogActions>
        </Dialog>

        <Notification message={notification} close={() => setNotification('')} />
      </PapperBlock>
    </div>
  );
};

export default VoluntariadoPage;
