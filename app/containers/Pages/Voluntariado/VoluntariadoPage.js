import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { formatDateInAppTimezone } from '../../../utils/dateTime';
import {
  Autocomplete,
  Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Paper, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
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
  campiSelecionados: [],       // [{id, nome}]
  ministeriosSelecionados: [], // [{id, nome}]
  ministeriosDisponiveis: [],  // opções carregadas dos campus selecionados
  dataInicio: '',
  observacao: '',
};

// Gera todas as combinações (campus × ministério) de uma entrada
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

const formatDateRange = (values = []) => {
  const validDates = values.filter(Boolean).map((d) => String(d));
  if (!validDates.length) return '-';
  const sorted = [...validDates].sort();
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  if (start === end) return formatDate(start);
  return `${formatDate(start)} - ${formatDate(end)}`;
};

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

  // Debounce na busca de membros — só dispara quando o dialog estiver aberto
  useEffect(() => {
    if (!dialog.open) return undefined;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarMembros(inputMembro), 400);
    return () => clearTimeout(debounceRef.current);
  }, [inputMembro, dialog.open, buscarMembros]);

  // ── Filtros ──────────────────────────────────────────────
  // When campus filter changes, reload ministry list for the filter and reset ministry filter
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
          key,
          memberId: v.memberId,
          membro: v.membro || null,
          status: v.status,
          items: []
        });
      }
      groups.get(key).items.push(v);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => {
          const nomeA = String(a.area?.nome || '').toLowerCase();
          const nomeB = String(b.area?.nome || '').toLowerCase();
          return nomeA.localeCompare(nomeB);
        })
      }))
      .sort((a, b) => {
        const nomeA = getMemberDisplayName(a.membro, a.memberId);
        const nomeB = getMemberDisplayName(b.membro, b.memberId);
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      });
  }, [voluntariadosFiltrados]);

  // ── Helpers ──────────────────────────────────────────────
  const nomeExibicaoMembro = (group) => getMemberDisplayName(group.membro, group.memberId);

  // ── Handlers de entrada (por índice) ─────────────────────
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
      next[idx] = { ...next[idx], campiSelecionados, ministeriosSelecionados: [], ministeriosDisponiveis: [] };
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

  // ── Dialog cadastro/edição ────────────────────────────────
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
      ? { id: v.memberId, fullName: v.membro.fullName, preferredName: v.membro.preferredName, email: v.membro.email }
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
    if (!membroSelecionado?.id) {
      setNotification('Selecione um membro');
      return;
    }
    const invalida = entradas.find((e) => !e.areaVoluntariadoId || !e.dataInicio);
    if (invalida) {
      setNotification('Área e data de início são obrigatórios em todas as entradas');
      return;
    }
    const buildRegistros = () =>
      entradas.flatMap((e) =>
        gerarCombos(e).map((combo) => ({
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
        // Limpa filtros de campus/ministério para que todos os novos registros fiquem visíveis
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

  // ── Aprovar ───────────────────────────────────────────────
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

  // ── Encerrar ──────────────────────────────────────────────
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

  // ── Remover ───────────────────────────────────────────────
  const handleRemover = async () => {
    if (!confirmDelete?.ids?.length) return;
    try {
      const total = confirmDelete.ids.length;
      await Promise.all(confirmDelete.ids.map((id) => removerVoluntariado(id)));
      setConfirmDelete(null);
      setNotification(total > 1
        ? `${total} vínculos removidos`
        : 'Voluntariado removido');
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao remover');
    }
  };

  // ── Contadores por aba ────────────────────────────────────
  const contadores = useMemo(() => {
    const membersByStatus = {
      PENDENTE: new Set(),
      APROVADO: new Set(),
      ENCERRADO: new Set()
    };

    voluntariados.forEach((v) => {
      if (!membersByStatus[v.status]) return;
      membersByStatus[v.status].add(getMemberGroupKey(v));
    });

    return {
      PENDENTE: membersByStatus.PENDENTE.size,
      APROVADO: membersByStatus.APROVADO.size,
      ENCERRADO: membersByStatus.ENCERRADO.size
    };
  }, [voluntariados]);

  return (
    <div>
      <Helmet><title>Voluntários</title></Helmet>
      <PapperBlock title="Voluntários" icon="ion-ios-heart-outline" desc="Gerencie os vínculos de voluntariado dos membros">

        {/* Cabeçalho com filtros e botão */}
        <Box display="flex" gap={2} alignItems="center" mb={2} flexWrap="wrap">
          <TextField
            select
            label="Filtrar por área"
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todas as áreas</MenuItem>
            {areas.map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Filtrar por campus"
            value={filtroCampus}
            onChange={(e) => setFiltroCampus(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos os campus</MenuItem>
            {campi.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>
            ))}
          </TextField>
          {filtroCampus && (
            <TextField
              select
              label="Filtrar por ministério"
              value={filtroMinisterio}
              onChange={(e) => setFiltroMinisterio(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Todos os ministérios</MenuItem>
              {ministeriosFiltro.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>
              ))}
            </TextField>
          )}
          <Box flex={1} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNovo}>
            Vincular Voluntário
          </Button>
        </Box>

        {/* Abas de status */}
        <Paper sx={{ mb: 2 }}>
          <Tabs value={tabAtiva} onChange={(_, v) => setTabAtiva(v)} variant="fullWidth">
            <Tab label={`Pendentes (${contadores.PENDENTE})`} />
            <Tab label={`Aprovados (${contadores.APROVADO})`} />
            <Tab label={`Encerrados (${contadores.ENCERRADO})`} />
          </Tabs>
        </Paper>

        {loading && <Typography variant="body2" color="text.secondary" mb={1}>Carregando...</Typography>}

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Membro</TableCell>
                <TableCell>Vínculos</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Ações do membro</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voluntariadosAgrupados.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">Nenhum registro encontrado</TableCell>
                </TableRow>
              )}
              {voluntariadosAgrupados.map((group) => {
                const cfg = STATUS_CONFIG[group.status] || {};
                const aberto = expandidos.has(group.key);
                const memberName = nomeExibicaoMembro(group);
                return (
                  <React.Fragment key={group.key}>
                    {/* ── Linha âncora do membro ── */}
                    <TableRow
                      hover
                      onClick={() => toggleExpandido(group.key)}
                      sx={{ cursor: 'pointer', bgcolor: aberto ? 'action.selected' : undefined }}
                    >
                      <TableCell padding="checkbox">
                        <IconButton size="small">
                          {aberto ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{memberName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {group.items.length} vínculo{group.items.length !== 1 ? 's' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {group.items.map((item) => (
                            <Chip
                              key={item.id}
                              label={[item.area?.nome, item.campus?.nome, item.ministerio?.nome].filter(Boolean).join(' · ')}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={cfg.label} size="small" color={cfg.color} />
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        {group.status === 'APROVADO' && group.items.length > 1 && (
                          <Tooltip title="Dar saída em todos os vínculos">
                            <IconButton size="small" color="warning" onClick={() => abrirEncerrar(group)}>
                              <ExitToAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* ── Sub-tabela expandida ── */}
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        <Collapse in={aberto} unmountOnExit>
                          <Table size="small" sx={{ mx: 2, my: 1, width: 'calc(100% - 32px)' }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Área</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Campus</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Ministério</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Início</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Fim</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Observação</TableCell>
                                <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>Ações</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {group.items.map((item) => (
                                <TableRow key={item.id} hover>
                                  <TableCell>{item.area?.nome || '-'}</TableCell>
                                  <TableCell>{item.campus?.nome || '-'}</TableCell>
                                  <TableCell>{item.ministerio?.nome || '-'}</TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    {item.dataInicio ? formatDate(item.dataInicio) : '-'}
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    {item.dataFim ? formatDate(item.dataFim) : '-'}
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.observacao || '-'}
                                  </TableCell>
                                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                    {item.status === 'PENDENTE' && (
                                      <Tooltip title="Aprovar">
                                        <IconButton size="small" color="success" onClick={() => handleAprovar([item.id])}>
                                          <CheckCircleIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    {item.status === 'APROVADO' && (
                                      <Tooltip title="Dar saída / Encerrar">
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
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Dialog cadastro/edição ── */}
        <Dialog open={dialog.open} onClose={fecharDialog} maxWidth="md" fullWidth>
          <DialogTitle>{dialog.editando ? 'Editar Vínculo' : 'Vincular Voluntário'}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>

              {/* Membro */}
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

              {/* Lista de entradas */}
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
                      {/* Área */}
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

                      {/* Data início */}
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

                      {/* Observação */}
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth size="small"
                          label="Observação"
                          value={entrada.observacao}
                          onChange={(e) => handleEntradaChange(idx, 'observacao', e.target.value)}
                        />
                      </Grid>

                      {/* Campus — multi-select */}
                      <Grid item xs={12} sm={6}>
                        <Autocomplete
                          multiple
                          options={campi}
                          value={entrada.campiSelecionados}
                          onChange={(_, val) => handleEntradaCampiChange(idx, val)}
                          getOptionLabel={(o) => o.nome}
                          isOptionEqualToValue={(a, b) => a.id === b.id}
                          renderTags={(val, getTagProps) =>
                            val.map((c, i) => (
                              <Chip key={c.id} label={c.nome} size="small" {...getTagProps({ index: i })} />
                            ))
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

                      {/* Ministério — multi-select, dependente do campus */}
                      <Grid item xs={12} sm={6}>
                        <Autocomplete
                          multiple
                          options={entrada.ministeriosDisponiveis}
                          value={entrada.ministeriosSelecionados}
                          onChange={(_, val) => handleEntradaChange(idx, 'ministeriosSelecionados', val)}
                          disabled={!entrada.campiSelecionados.length}
                          getOptionLabel={(o) => o.nome}
                          isOptionEqualToValue={(a, b) => a.id === b.id}
                          renderTags={(val, getTagProps) =>
                            val.map((m, i) => (
                              <Chip key={m.id} label={m.nome} size="small" {...getTagProps({ index: i })} />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              label="Ministérios"
                              placeholder={entrada.campiSelecionados.length ? '' : 'Selecione campus primeiro'}
                              helperText={
                                entrada.campiSelecionados.length && !entrada.ministeriosDisponiveis.length
                                  ? 'Carregando...'
                                  : ''
                              }
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}

              {/* Botão adicionar entrada */}
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
        <Dialog open={dialogEncerrar.open} onClose={() => setDialogEncerrar({ open: false, ids: [], dataFim: '' })} maxWidth="xs" fullWidth>
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
