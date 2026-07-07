import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Autocomplete, Avatar, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, FormControlLabel, InputAdornment, InputLabel, IconButton,
  MenuItem, Paper, Radio, Select, Skeleton,
  Switch, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import MergeIcon from '@mui/icons-material/CallMerge';
import MicOffIcon from '@mui/icons-material/MicOff';
import SearchIcon from '@mui/icons-material/Search';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { fetchWithAuth } from 'utils/authSession';
import {
  listarMinistros, criarMinistro, atualizarMinistro, alternarAtivoMinistro,
  listarDuplicatasMinistros, fundirMinistros,
  listarVinculosMinistro, salvarVinculosMinistro,
} from '../../../../api/cultosApi';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

// ─── Dialog de vínculos campus × ministério ────────────────────────────────────

const DialogVinculos = ({ ministro, onClose }) => {
  const [campi, setCampi] = useState([]);
  const [ministeriosPorCampus, setMinisteriosPorCampus] = useState({});
  const [selecionados, setSelecionados] = useState(new Set()); // "campusId|ministerioId"
  const [salvando, setSalvando] = useState(false);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (!ministro) return;
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API_URL}/start/campus`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      listarVinculosMinistro(ministro.id),
    ]).then(([campiRes, vinculos]) => {
      const campiArr = Array.isArray(campiRes) ? campiRes : [];
      setCampi(campiArr);
      // Para cada campus carrega os ministérios vinculados
      Promise.all(
        campiArr.map((c) => fetchWithAuth(`${API_URL}/api/admin/cultos/campus/${c.id}/ministerios`)
          .then((mins) => ({ campusId: c.id, mins }))
          .catch(() => ({ campusId: c.id, mins: [] }))
        )
      ).then((resultados) => {
        const map = {};
        resultados.forEach(({ campusId, mins }) => { map[campusId] = mins; });
        setMinisteriosPorCampus(map);
      });
      const sel = new Set(vinculos.map((v) => `${v.campusId}|${v.ministerioId}`));
      setSelecionados(sel);
    }).catch(() => setNotification('Erro ao carregar dados'));
  }, [ministro]);

  const toggle = (campusId, ministerioId) => {
    const key = `${campusId}|${ministerioId}`;
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const vinculos = [...selecionados].map((k) => {
        const [campusId, ministerioId] = k.split('|');
        return { campusId, ministerioId };
      });
      await salvarVinculosMinistro(ministro.id, vinculos);
      onClose(true);
    } catch {
      setNotification('Erro ao salvar vínculos');
    } finally {
      setSalvando(false);
    }
  };

  const totalVinculos = selecionados.size;

  return (
    <Dialog open={Boolean(ministro)} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        Vínculos de <strong>{ministro?.nome}</strong>
      </DialogTitle>
      <DialogContent dividers>
        {campi.length === 0 && <CircularProgress size={20} />}
        {campi.map((campus) => {
          const mins = ministeriosPorCampus[campus.id] || [];
          if (mins.length === 0) return null;
          return (
            <Box key={campus.id} mb={2}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>{campus.nome}</Typography>
              <Box display="flex" flexWrap="wrap" gap={1} pl={1}>
                {mins.map((min) => {
                  const key = `${campus.id}|${min.id}`;
                  return (
                    <FormControlLabel
                      key={key}
                      control={
                        <Checkbox
                          size="small"
                          checked={selecionados.has(key)}
                          onChange={() => toggle(campus.id, min.id)}
                        />
                      }
                      label={min.nome}
                    />
                  );
                })}
              </Box>
            </Box>
          );
        })}
        {notification && <Alert severity="error" sx={{ mt: 1 }}>{notification}</Alert>}
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, ml: 1 }}>
          {totalVinculos} vínculo(s) selecionado(s)
        </Typography>
        <Button onClick={() => onClose(false)}>Cancelar</Button>
        <Button variant="contained" onClick={handleSalvar} disabled={salvando}>
          {salvando ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

DialogVinculos.propTypes = {
  ministro: PropTypes.shape({ id: PropTypes.string, nome: PropTypes.string }),
  onClose: PropTypes.func.isRequired,
};

DialogVinculos.defaultProps = { ministro: null };

// ─── Dialog de grupo manual ────────────────────────────────────────────────────

const DialogGrupoManual = ({
  open, todosMinistros, gruposExistentes, onConfirmar, onClose
}) => {
  const [escolhidos, setEscolhidos] = useState([]);

  useEffect(() => { if (open) setEscolhidos([]); }, [open]);

  // Ids já em algum grupo para avisar o usuário
  const idsEmGrupo = new Set(gruposExistentes.flat().map((m) => m.id));

  const handleConfirmar = () => {
    if (escolhidos.length < 2) return;
    onConfirmar(escolhidos);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Criar grupo de fusão manual</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Selecione dois ou mais ministros que devem ser fundidos em um único registro.
        </Typography>
        <Autocomplete
          multiple
          options={todosMinistros}
          value={escolhidos}
          getOptionLabel={(o) => o.nome}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterSelectedOptions
          onChange={(_, val) => setEscolhidos(val)}
          renderTags={(value, getTagProps) => value.map((option, index) => (
            <Chip key={option.id} label={option.nome} size="small" {...getTagProps({ index })} />
          ))
          }
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box>
                {option.nome}
                {idsEmGrupo.has(option.id) && (
                  <Typography variant="caption" color="warning.main" ml={1}>(já em outro grupo)</Typography>
                )}
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Ministros" placeholder="Digite para buscar..." autoFocus />
          )}
        />
        {escolhidos.length === 1 && (
          <Alert severity="warning" sx={{ mt: 1 }}>Selecione pelo menos 2 ministros para formar um grupo.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleConfirmar} disabled={escolhidos.length < 2}>
          Adicionar grupo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

DialogGrupoManual.propTypes = {
  open: PropTypes.bool.isRequired,
  todosMinistros: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, nome: PropTypes.string })).isRequired,
  gruposExistentes: PropTypes.arrayOf(PropTypes.array).isRequired,
  onConfirmar: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ─── Painel de duplicidades ────────────────────────────────────────────────────

const PainelDuplicidades = ({ onFundiu, todosMinistros }) => {
  const [grupos, setGrupos] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [selecionados, setSelecionados] = useState({}); // grupoIdx → manterId
  const [excluidos, setExcluidos] = useState({}); // grupoIdx → Set de ids excluídos da fusão
  const [fundindo, setFundindo] = useState(false);
  const [notification, setNotification] = useState('');
  const [dialogManual, setDialogManual] = useState(false);

  const inicializarGrupo = (grupo, idx, selAtual, excAtual) => {
    const sel = { ...selAtual };
    const exc = { ...excAtual };
    const sugerido = grupo.slice().sort((a, b) => b.usos - a.usos)[0];
    sel[idx] = sugerido.id;
    exc[idx] = new Set();
    return { sel, exc };
  };

  const analisar = async () => {
    setCarregando(true);
    try {
      const data = await listarDuplicatasMinistros();
      const sel = {};
      const exc = {};
      data.forEach((grupo, i) => {
        const { sel: s, exc: e } = inicializarGrupo(grupo, i, sel, exc);
        Object.assign(sel, s);
        Object.assign(exc, e);
      });
      setGrupos(data);
      setSelecionados(sel);
      setExcluidos(exc);
    } catch {
      setNotification('Erro ao buscar duplicidades');
    } finally {
      setCarregando(false);
    }
  };

  const adicionarGrupoManual = (membros) => {
    // Enriquece com usos se disponível (todosMinistros já tem essa info via listarMinistros)
    const grupo = membros.map((m) => ({
      id: m.id, nome: m.nome, ativo: m.ativo, usos: m.usos || 0
    }));
    setGrupos((prev) => {
      const lista = prev ?? [];
      const idx = lista.length;
      const { sel, exc } = inicializarGrupo(grupo, idx, selecionados, excluidos);
      setSelecionados(sel);
      setExcluidos(exc);
      return [...lista, grupo];
    });
    setDialogManual(false);
  };

  const removerGrupo = (i) => {
    setGrupos((prev) => prev.filter((_, idx) => idx !== i));
    // Reindexar selecionados e excluídos
    setSelecionados((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => {
        const n = Number(k);
        if (n < i) next[n] = v;
        else if (n > i) next[n - 1] = v;
      });
      return next;
    });
    setExcluidos((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => {
        const n = Number(k);
        if (n < i) next[n] = v;
        else if (n > i) next[n - 1] = v;
      });
      return next;
    });
  };

  const toggleExcluir = (grupoIdx, id) => {
    setExcluidos((prev) => {
      const next = new Set(prev[grupoIdx] || []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...prev, [grupoIdx]: next };
    });
  };

  const handleFundir = async () => {
    if (!grupos?.length) return;
    setFundindo(true);
    let ok = 0; let erros = 0;
    for (let i = 0; i < grupos.length; i += 1) {
      const manterId = selecionados[i];
      if (!manterId) continue;
      const excl = excluidos[i] || new Set();
      const fundirIds = grupos[i]
        .filter((m) => m.id !== manterId && !excl.has(m.id))
        .map((m) => m.id);
      if (!fundirIds.length) continue;
      try {
        await fundirMinistros(manterId, fundirIds);
        ok += 1;
      } catch {
        erros += 1;
      }
    }
    setFundindo(false);
    setNotification(erros > 0 ? `${ok} grupo(s) fundido(s), ${erros} com erro` : `${ok} grupo(s) fundido(s) com sucesso!`);
    setGrupos(null);
    setSelecionados({});
    setExcluidos({});
    onFundiu();
  };

  const gruposAtivos = (grupos ?? []).filter((_, i) => {
    const manterId = selecionados[i];
    const excl = excluidos[i] || new Set();
    return (grupos[i] || []).filter((m) => m.id !== manterId && !excl.has(m.id)).length > 0;
  });

  const temGrupos = grupos !== null && grupos.length > 0;

  return (
    <Box mt={3}>
      <Divider sx={{ mb: 2 }} />
      <Box display="flex" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
        <MergeIcon color="warning" />
        <Typography variant="h6" sx={{ flex: 1 }}>Análise de Duplicidades</Typography>
        <Button variant="outlined" size="small" onClick={analisar} disabled={carregando}>
          {carregando ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
          Detectar automaticamente
        </Button>
        <Button variant="outlined" size="small" color="secondary" onClick={() => setDialogManual(true)}>
          + Grupo manual
        </Button>
      </Box>

      {grupos !== null && grupos.length === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>Nenhuma duplicidade detectada automaticamente. Use &quot;+ Grupo manual&quot; para criar um grupo personalizado.</Alert>
      )}

      {temGrupos && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            {grupos.length} grupo(s) prontos para fusão. Escolha qual nome <strong>manter</strong> em cada grupo.
            Use ✕ para remover um membro do grupo ou 🗑 para descartar o grupo inteiro.
          </Alert>

          {grupos.map((grupo, i) => {
            const manterId = selecionados[i];
            const excl = excluidos[i] || new Set();
            return (
              <Paper key={i} variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ flex: 1 }}>
                    Grupo {i + 1}
                  </Typography>
                  <Tooltip title="Remover grupo">
                    <IconButton size="small" onClick={() => removerGrupo(i)}>🗑</IconButton>
                  </Tooltip>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">Manter</TableCell>
                        <TableCell>Nome</TableCell>
                        <TableCell align="center">Usos</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Ignorar</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grupo.map((m) => {
                        const isManter = m.id === manterId;
                        const isIgnorado = excl.has(m.id) && !isManter;
                        return (
                          <TableRow
                            key={m.id}
                            sx={{
                              opacity: isIgnorado ? 0.4 : 1,
                              bgcolor: isManter ? 'action.selected' : 'inherit',
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Radio
                                size="small"
                                checked={isManter}
                                onChange={() => setSelecionados((prev) => ({ ...prev, [i]: m.id }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={isManter ? 700 : 400}>
                                {m.nome}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={m.usos} size="small" color={m.usos > 0 ? 'primary' : 'default'} />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={m.ativo ? 'Ativo' : 'Inativo'} size="small" color={m.ativo ? 'success' : 'error'} />
                            </TableCell>
                            <TableCell align="center">
                              {!isManter && (
                                <Tooltip title={isIgnorado ? 'Incluir na fusão' : 'Remover deste grupo'}>
                                  <IconButton size="small" onClick={() => toggleExcluir(i, m.id)}>
                                    {isIgnorado ? '↩' : '✕'}
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            );
          })}

          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button onClick={() => { setGrupos(null); setSelecionados({}); setExcluidos({}); }}>Limpar tudo</Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={fundindo ? <CircularProgress size={16} color="inherit" /> : <MergeIcon />}
              disabled={fundindo || !gruposAtivos.length}
              onClick={handleFundir}
            >
              Fundir selecionados ({gruposAtivos.length} grupo(s))
            </Button>
          </Box>
        </>
      )}

      <DialogGrupoManual
        open={dialogManual}
        todosMinistros={todosMinistros}
        gruposExistentes={grupos ?? []}
        onConfirmar={adicionarGrupoManual}
        onClose={() => setDialogManual(false)}
      />

      {notification && <Notification message={notification} onClose={() => setNotification('')} />}
    </Box>
  );
};

PainelDuplicidades.propTypes = {
  onFundiu: PropTypes.func.isRequired,
  todosMinistros: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string, nome: PropTypes.string, usos: PropTypes.number, ativo: PropTypes.bool
  })).isRequired,
};

// ─── Helpers de avatar ────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#1565c0', '#2e7d32', '#c62828', '#6a1b9a', '#e65100', '#00695c', '#4527a0', '#283593', '#ad1457', '#00838f'];
const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash); // eslint-disable-line no-bitwise
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
const getInitials = (name) => {
  const parts = String(name || '').trim().split(' ').filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ─── Página principal ──────────────────────────────────────────────────────────

const MinistrosPage = () => {
  const [ministros, setMinistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [dialog, setDialog] = useState({ open: false, editando: null });
  const [nome, setNome] = useState('');
  const [ministroVinculos, setMinistroVinculos] = useState(null);

  // ── Filtros ──
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroCampusId, setFiltroCampusId] = useState('');
  const [filtroMinisterioId, setFiltroMinisterioId] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(true);

  const loadData = () => {
    setLoading(true);
    listarMinistros()
      .then(setMinistros)
      .catch(() => setNotification('Erro ao carregar ministros'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // Opções de campus extraídas dos vínculos de todos os ministros
  const campiDisponiveis = useMemo(() => {
    const map = new Map();
    ministros.forEach((m) => (m.vinculos || []).forEach((v) => {
      if (v.campusId && v.campus?.nome) map.set(v.campusId, v.campus.nome);
    }));
    return [...map.entries()].map(([id, nomeCampus]) => ({ id, nome: nomeCampus }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [ministros]);

  // Opções de ministério filtradas pelo campus selecionado
  const ministeriosDisponiveis = useMemo(() => {
    const map = new Map();
    ministros.forEach((m) => (m.vinculos || []).forEach((v) => {
      if (v.ministerioId && v.ministerio?.nome) {
        if (!filtroCampusId || v.campusId === filtroCampusId) {
          map.set(v.ministerioId, v.ministerio.nome);
        }
      }
    }));
    return [...map.entries()].map(([id, nomeMin]) => ({ id, nome: nomeMin }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [ministros, filtroCampusId]);

  const ministrosFiltrados = useMemo(() => ministros.filter((m) => {
    if (!mostrarInativos && !m.ativo) return false;
    if (filtroNome && !m.nome.toLowerCase().includes(filtroNome.toLowerCase())) return false;
    if (filtroCampusId && !(m.vinculos || []).some((v) => v.campusId === filtroCampusId)) return false;
    if (filtroMinisterioId && !(m.vinculos || []).some((v) => v.ministerioId === filtroMinisterioId)) return false;
    return true;
  }), [ministros, filtroNome, filtroCampusId, filtroMinisterioId, mostrarInativos]);

  const temFiltro = Boolean(filtroNome || filtroCampusId || filtroMinisterioId);

  const limparFiltros = () => { setFiltroNome(''); setFiltroCampusId(''); setFiltroMinisterioId(''); };

  const abrirNovo = () => { setNome(''); setDialog({ open: true, editando: null }); };
  const abrirEditar = (m) => { setNome(m.nome); setDialog({ open: true, editando: m }); };
  const fecharDialog = () => setDialog({ open: false, editando: null });

  const handleSalvar = async () => {
    if (!nome.trim()) { setNotification('Nome é obrigatório'); return; }
    try {
      if (dialog.editando) {
        await atualizarMinistro(dialog.editando.id, { nome: nome.trim() });
        setNotification('Ministro atualizado');
      } else {
        await criarMinistro({ nome: nome.trim(), ativo: true });
        setNotification('Ministro criado');
      }
      fecharDialog();
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar');
    }
  };

  const handleAlternarAtivo = async (m) => {
    try {
      await alternarAtivoMinistro(m.id);
      loadData();
    } catch (err) {
      setNotification(err.message || 'Erro ao alterar status');
    }
  };

  return (
    <div>
      <Helmet><title>Ministros</title></Helmet>
      <PapperBlock title="Ministros" icon="ion-ios-mic-outline" desc="Cadastre os pastores, pregadores e ministros">

        {/* ── Toolbar de filtros ── */}
        <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center" mb={2}>
          <TextField
            size="small"
            placeholder="Buscar por nome..."
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Campus</InputLabel>
            <Select
              value={filtroCampusId}
              label="Campus"
              onChange={(e) => { setFiltroCampusId(e.target.value); setFiltroMinisterioId(''); }}
            >
              <MenuItem value="">Todos os campus</MenuItem>
              {campiDisponiveis.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Ministério</InputLabel>
            <Select
              value={filtroMinisterioId}
              label="Ministério"
              onChange={(e) => setFiltroMinisterioId(e.target.value)}
            >
              <MenuItem value="">Todos os ministérios</MenuItem>
              {ministeriosDisponiveis.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch size="small" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />}
            label={<Typography variant="caption" color="text.secondary">Inativos</Typography>}
            sx={{ ml: 0 }}
          />
          {temFiltro && (
            <Button size="small" color="inherit" onClick={limparFiltros}>Limpar</Button>
          )}
          <Box flex={1} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNovo}>Novo Ministro</Button>
        </Box>

        {/* Contagem */}
        {!loading && (
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            {temFiltro
              ? `${ministrosFiltrados.length} de ${ministros.length} ministro(s)`
              : `${ministros.length} ministro(s)`}
          </Typography>
        )}

        {/* ── Tabela ── */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ width: 56, pl: 2 }} />
                <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Campus / Ministério</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: 90 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: 120 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ pl: 2 }}><Skeleton variant="circular" width={36} height={36} /></TableCell>
                    <TableCell>
                      <Skeleton width={160} height={18} />
                      <Skeleton width={70} height={14} sx={{ mt: 0.5 }} />
                    </TableCell>
                    <TableCell><Skeleton width={240} /></TableCell>
                    <TableCell align="center"><Skeleton variant="rounded" width={58} height={22} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell>
                      <Box display="flex" justifyContent="center" gap={0.5}>
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="rounded" width={34} height={22} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : ministrosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box display="flex" flexDirection="column" alignItems="center" py={6} gap={1.5}>
                      <MicOffIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        {temFiltro ? 'Nenhum ministro encontrado com esses filtros' : 'Nenhum ministro cadastrado'}
                      </Typography>
                      {temFiltro ? (
                        <Button size="small" onClick={limparFiltros}>Limpar filtros</Button>
                      ) : (
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={abrirNovo}>
                          Cadastrar ministro
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                ministrosFiltrados.map((m) => {
                  const vinculos = m.vinculos || [];
                  const initials = getInitials(m.nome);
                  const avatarColor = m.ativo ? getAvatarColor(m.nome) : '#9e9e9e';
                  const MAX_VISIBLE = 4;
                  const visiveis = vinculos.slice(0, MAX_VISIBLE);
                  const restantes = vinculos.length - MAX_VISIBLE;

                  return (
                    <TableRow key={m.id} hover sx={{ opacity: m.ativo ? 1 : 0.55 }}>
                      <TableCell sx={{ pl: 2, width: 56 }}>
                        <Avatar sx={{
                          bgcolor: avatarColor, width: 36, height: 36, fontSize: 13, fontWeight: 700
                        }}>
                          {initials}
                        </Avatar>
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <Typography variant="body2" fontWeight={600}>{m.nome}</Typography>
                        {m.usos > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {m.usos} culto{m.usos !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {vinculos.length === 0 ? (
                          <Typography variant="caption" color="text.disabled">Sem vínculo</Typography>
                        ) : (
                          <Box display="flex" flexWrap="wrap" gap={0.5} alignItems="center">
                            {visiveis.map((v) => (
                              <Chip
                                key={`${v.campusId}-${v.ministerioId}`}
                                label={[v.campus?.nome, v.ministerio?.nome].filter(Boolean).join(' › ')}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: 11, maxWidth: 280 }}
                              />
                            ))}
                            {restantes > 0 && (
                              <Chip label={`+${restantes}`} size="small" sx={{ fontSize: 11 }} />
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={m.ativo ? 'Ativo' : 'Inativo'}
                          size="small"
                          color={m.ativo ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Vincular a campus/ministério">
                          <IconButton size="small" onClick={() => setMinistroVinculos(m)}>
                            <LinkIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => abrirEditar(m)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={m.ativo ? 'Desativar' : 'Ativar'}>
                          <Switch size="small" checked={m.ativo} onChange={() => handleAlternarAtivo(m)} />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <PainelDuplicidades onFundiu={loadData} todosMinistros={ministros} />

        <Dialog open={dialog.open} onClose={fecharDialog} maxWidth="xs" fullWidth>
          <DialogTitle>{dialog.editando ? 'Editar Ministro' : 'Novo Ministro'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth required label="Nome" value={nome} autoFocus
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSalvar()}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialog}>Cancelar</Button>
            <Button variant="contained" onClick={handleSalvar}>Salvar</Button>
          </DialogActions>
        </Dialog>

        <DialogVinculos
          ministro={ministroVinculos}
          onClose={(salvou) => {
            setMinistroVinculos(null);
            if (salvou) { setNotification('Vínculos salvos com sucesso'); loadData(); }
          }}
        />

        {notification && <Notification message={notification} onClose={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default MinistrosPage;
