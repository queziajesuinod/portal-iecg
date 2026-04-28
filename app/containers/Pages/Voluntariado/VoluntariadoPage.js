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
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
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
} from '../../../api/voluntariadoApi';
import { listarMembros } from '../../../api/membersApi';

const FORM_VAZIO = {
  memberId: '',
  areaVoluntariadoId: '',
  dataInicio: '',
  dataFim: '',
  observacao: ''
};

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
  const [membros, setMembros] = useState([]);
  const [loadingMembros, setLoadingMembros] = useState(false);
  const [inputMembro, setInputMembro] = useState('');
  const [notification, setNotification] = useState('');
  const [tabAtiva, setTabAtiva] = useState(0);
  const [filtroArea, setFiltroArea] = useState('');
  const [dialog, setDialog] = useState({ open: false, editando: null });
  const [dialogEncerrar, setDialogEncerrar] = useState({ open: false, ids: [], dataFim: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [membroSelecionado, setMembroSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      listarVoluntariados(),
      listarAreas()
    ])
      .then(([vols, areasData]) => {
        setVoluntariados(vols);
        setAreas(areasData);
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
  const voluntariadosFiltrados = useMemo(() => {
    const statusAtivo = STATUS_POR_TAB[tabAtiva];
    return voluntariados.filter((v) => {
      if (v.status !== statusAtivo) return false;
      if (filtroArea && v.areaVoluntariadoId !== filtroArea) return false;
      return true;
    });
  }, [voluntariados, tabAtiva, filtroArea]);

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

  // ── Dialog cadastro/edição ────────────────────────────────
  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setMembroSelecionado(null);
    setInputMembro('');
    setMembros([]);
    setDialog({ open: true, editando: null });
  };

  const abrirEditar = (v) => {
    setForm({
      memberId: v.memberId,
      areaVoluntariadoId: v.areaVoluntariadoId,
      dataInicio: v.dataInicio || '',
      dataFim: v.dataFim || '',
      observacao: v.observacao || ''
    });
    const membroAtual = v.membro
      ? {
        id: v.memberId,
        fullName: v.membro.fullName,
        preferredName: v.membro.preferredName,
        email: v.membro.email
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
  };

  const handleSalvar = async () => {
    if (!form.memberId || !form.areaVoluntariadoId || !form.dataInicio) {
      setNotification('Membro, área e data de início são obrigatórios');
      return;
    }
    try {
      const payload = {
        memberId: form.memberId,
        areaVoluntariadoId: form.areaVoluntariadoId,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim || null,
        observacao: form.observacao || null
      };
      if (dialog.editando) {
        await atualizarVoluntariado(dialog.editando.id, payload);
        setNotification('Voluntariado atualizado com sucesso');
      } else {
        await criarVoluntariado(payload);
        setNotification('Voluntariado cadastrado com sucesso — aguardando aprovação');
        setTabAtiva(0); // volta para aba Pendente
      }
      fecharDialog();
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar');
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

        {/* Cabeçalho com filtro e botão */}
        <Box display="flex" gap={2} alignItems="center" mb={2} flexWrap="wrap">
          <TextField
            select
            label="Filtrar por área"
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todas as áreas</MenuItem>
            {areas.map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>
            ))}
          </TextField>
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
                <TableCell>Membro</TableCell>
                <TableCell>Áreas</TableCell>
                <TableCell>Início</TableCell>
                <TableCell>Fim</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Observação</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voluntariadosAgrupados.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              )}
              {voluntariadosAgrupados.map((group) => {
                const cfg = STATUS_CONFIG[group.status] || {};
                const ids = group.items.map((item) => item.id);
                const canEdit = group.items.length === 1 && group.status !== 'ENCERRADO';
                const observacoes = group.items.map((item) => item.observacao).filter(Boolean);
                return (
                  <TableRow key={group.key} hover>
                    <TableCell>{nomeExibicaoMembro(group)}</TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {group.items.map((item) => (
                          <Chip key={item.id} label={item.area?.nome || '-'} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>{formatDateRange(group.items.map((item) => item.dataInicio))}</TableCell>
                    <TableCell>{formatDateRange(group.items.map((item) => item.dataFim))}</TableCell>
                    <TableCell>
                      <Chip label={cfg.label} size="small" color={cfg.color} />
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {observacoes.length ? observacoes.join(' | ') : '-'}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      {/* Aprovar — apenas PENDENTE */}
                      {group.status === 'PENDENTE' && (
                        <Tooltip title={ids.length > 1 ? `Aprovar ${ids.length} vínculos` : 'Aprovar'}>
                          <IconButton size="small" color="success" onClick={() => handleAprovar(ids)}>
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* Encerrar — apenas APROVADO */}
                      {group.status === 'APROVADO' && (
                        <Tooltip title={ids.length > 1 ? `Encerrar ${ids.length} vínculos` : 'Dar saída / Encerrar'}>
                          <IconButton size="small" color="warning" onClick={() => abrirEncerrar(group)}>
                            <ExitToAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* Editar — PENDENTE e APROVADO */}
                      {canEdit && (
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => abrirEditar(group.items[0])}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* Remover */}
                      <Tooltip title={ids.length > 1 ? `Remover ${ids.length} vínculos` : 'Remover'}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setConfirmDelete({
                            ids,
                            memberName: nomeExibicaoMembro(group)
                          })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Dialog cadastro/edição ── */}
        <Dialog open={dialog.open} onClose={fecharDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{dialog.editando ? 'Editar Voluntariado' : 'Vincular Voluntário'}</DialogTitle>
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
                onChange={(_, newValue) => {
                  setMembroSelecionado(newValue);
                  setForm((prev) => ({ ...prev, memberId: newValue?.id || '' }));
                }}
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

              <TextField
                select
                fullWidth
                required
                label="Área de Voluntariado"
                value={form.areaVoluntariadoId}
                onChange={(e) => setForm((prev) => ({ ...prev, areaVoluntariadoId: e.target.value }))}
              >
                {areas.filter((a) => a.ativo).map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                required
                label="Data de Início"
                type="date"
                value={form.dataInicio}
                onChange={(e) => setForm((prev) => ({ ...prev, dataInicio: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="Observação"
                multiline
                minRows={2}
                value={form.observacao}
                onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialog}>Cancelar</Button>
            <Button variant="contained" onClick={handleSalvar}>Salvar</Button>
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
              {confirmDelete?.ids?.length > 1
                ? `Deseja realmente remover ${confirmDelete.ids.length} vínculos de voluntariado de ${confirmDelete.memberName}?`
                : 'Deseja realmente remover este vínculo de voluntariado?'}
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
