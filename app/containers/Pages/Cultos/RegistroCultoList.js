import React, { useEffect, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, FormControl, Grid,
  IconButton, InputLabel, MenuItem, Pagination, Paper, Select, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Notification from 'dan-components/Notification/Notification';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import {
  listarRegistros, deletarRegistro, listarMinisterios,
  listarTiposEvento, listarMinistros,
} from '../../../api/cultosApi';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const formatarData = (data) => {
  if (!data) return '-';
  const [y, m, d] = data.split('-');
  return `${d}/${m}/${y}`;
};

const presencaTotal = (r) =>
  (r.qtdHomens || 0) + (r.qtdMulheres || 0) + (r.qtdCriancas || 0) + (r.qtdBebes || 0);

// Agrupa por data + campus + ministério + tipo de evento + horário
const detectarDuplicatas = (registros) => {
  const grupos = {};
  registros.forEach((r) => {
    const horario = (r.horario || '').substring(0, 5); // HH:MM
    const chave = [r.data, r.campusId, r.ministerioId, r.tipoEventoId || '', horario].join('__');
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(r);
  });
  return Object.values(grupos).filter((g) => g.length > 1);
};

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const RegistroCultoList = () => {
  const history = useHistory();

  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [campi, setCampi] = useState([]);
  const [ministerios, setMinisterios] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [ministros, setMinistros] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState(''); // "YYYY-MM"
  const [filtros, setFiltros] = useState({
    campusId: '', ministerioId: '', tipoEventoId: '', ministroId: '',
    dataInicio: '', dataFim: '',
  });
  const [notification, setNotification] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [detalheDialog, setDetalheDialog] = useState({ open: false, registro: null });

  // Modo duplicidades
  const [modoDuplicidades, setModoDuplicidades] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [loadingDuplicidades, setLoadingDuplicidades] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API_URL}/start/campus`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      listarMinisterios(true),
      listarTiposEvento(true),
      listarMinistros(true),
    ]).then(([c, m, t, min]) => {
      setCampi(Array.isArray(c) ? c : []);
      setMinisterios(m);
      setTiposEvento(t);
      setMinistros(min);
    }).catch(() => setNotification('Erro ao carregar filtros'));
  }, []);

  const loadData = useCallback(() => {
    listarRegistros({ ...filtros, page, limit: 15 })
      .then((res) => {
        setRegistros(res.data);
        setTotal(res.total);
        setPages(res.pages);
      })
      .catch(() => setNotification('Erro ao carregar registros'));
  }, [filtros, page]);

  useEffect(() => {
    if (!modoDuplicidades) loadData();
  }, [loadData, modoDuplicidades]);

  const handleFiltro = (e) => {
    setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  // Seletor de mês: preenche dataInicio e dataFim automaticamente
  const handleMes = (e) => {
    const mes = e.target.value; // "YYYY-MM"
    setMesSelecionado(mes);
    setPage(1);
    if (!mes) {
      setFiltros((prev) => ({ ...prev, dataInicio: '', dataFim: '' }));
      return;
    }
    const [y, m] = mes.split('-');
    const dataInicio = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    const dataFim = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    setFiltros((prev) => ({ ...prev, dataInicio, dataFim }));
  };

  const handleMinistroFiltro = (_, value) => {
    setFiltros((prev) => ({ ...prev, ministroId: value ? value.id : '' }));
    setPage(1);
  };

  // ── Modo duplicidades ──────────────────────────────────────────────────────

  const carregarDuplicidades = async () => {
    setLoadingDuplicidades(true);
    try {
      const res = await listarRegistros({ ...filtros, page: 1, limit: 1000 });
      setGrupos(detectarDuplicatas(res.data));
    } catch {
      setNotification('Erro ao carregar registros para análise');
    } finally {
      setLoadingDuplicidades(false);
    }
  };

  const toggleModoDuplicidades = () => {
    if (!modoDuplicidades) {
      setModoDuplicidades(true);
      carregarDuplicidades();
    } else {
      setModoDuplicidades(false);
      setGrupos([]);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const confirmarDelete = async () => {
    try {
      await deletarRegistro(deleteDialog.id);
      setNotification('Registro excluído com sucesso');
      setDeleteDialog({ open: false, id: null });
      if (modoDuplicidades) {
        carregarDuplicidades();
      } else {
        loadData();
      }
    } catch (err) {
      setNotification(err.message || 'Erro ao excluir');
    }
  };

  // ── Renderização de linha ──────────────────────────────────────────────────

  const renderMinistros = (r) => {
    if (r.ministros && r.ministros.length > 0) {
      return r.ministros.map((m) => (
        <Chip key={m.id} label={m.nome} size="small" sx={{ mr: 0.5, mb: 0.25 }} />
      ));
    }
    return r.quemMinistrou || '-';
  };

  const renderLinha = (r, bgColor) => (
    <TableRow key={r.id} hover sx={bgColor ? { backgroundColor: bgColor } : {}}>
      <TableCell>{formatarData(r.data)}</TableCell>
      <TableCell>{r.horario}</TableCell>
      <TableCell>{r.campus?.nome || '-'}</TableCell>
      <TableCell>{r.ministerio?.nome || '-'}</TableCell>
      <TableCell>{r.tipoEvento?.nome || '-'}</TableCell>
      <TableCell>{renderMinistros(r)}</TableCell>
      <TableCell align="center">
        <Chip label={presencaTotal(r)} size="small" color="primary" variant="outlined" />
      </TableCell>
      <TableCell align="center">
        <Tooltip title="Visualizar">
          <IconButton size="small" onClick={() => setDetalheDialog({ open: true, registro: r })}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Editar">
          <IconButton size="small" onClick={() => history.push(`/app/cultos/registros/${r.id}/editar`)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Excluir">
          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, id: r.id })}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );

  const cores = ['#fff8e1', '#fce4ec', '#e8f5e9', '#e3f2fd', '#f3e5f5', '#e0f7fa'];

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div>
      <Helmet><title>Registros de Culto</title></Helmet>
      <PapperBlock
        title="Registros de Culto"
        icon="ion-ios-list-outline"
        desc={modoDuplicidades ? `${grupos.length} grupo(s) com possíveis duplicidades` : `${total} registro(s) encontrado(s)`}
      >

        {/* Filtros */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Campus</InputLabel>
              <Select name="campusId" value={filtros.campusId} label="Campus" onChange={handleFiltro}>
                <MenuItem value="">Todos</MenuItem>
                {campi.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Ministério</InputLabel>
              <Select name="ministerioId" value={filtros.ministerioId} label="Ministério" onChange={handleFiltro}>
                <MenuItem value="">Todos</MenuItem>
                {ministerios.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Evento</InputLabel>
              <Select name="tipoEventoId" value={filtros.tipoEventoId} label="Tipo de Evento" onChange={handleFiltro}>
                <MenuItem value="">Todos</MenuItem>
                {tiposEvento.map((t) => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          {/* Filtro por Ministro */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              size="small"
              options={ministros}
              getOptionLabel={(o) => o.nome}
              onChange={handleMinistroFiltro}
              renderInput={(params) => <TextField {...params} label="Ministro" />}
            />
          </Grid>

          {/* Seletor de mês */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth size="small" type="month" label="Mês"
              value={mesSelecionado} onChange={handleMes}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: '2020-01',
                max: `${new Date().getFullYear() + 1}-12`,
              }}
              helperText={mesSelecionado
                ? `${MESES[parseInt(mesSelecionado.split('-')[1], 10) - 1]}/${mesSelecionado.split('-')[0]}`
                : 'Selecione para filtrar o mês inteiro'}
            />
          </Grid>
        </Grid>

        {/* Barra de ações */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Button
            variant={modoDuplicidades ? 'contained' : 'outlined'}
            color={modoDuplicidades ? 'warning' : 'inherit'}
            startIcon={<ContentCopyIcon />}
            onClick={toggleModoDuplicidades}
            disabled={loadingDuplicidades}
          >
            {modoDuplicidades ? 'Sair do modo duplicidades' : 'Ver duplicidades'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => history.push('/app/cultos/registros/novo')}
          >
            Novo Registro
          </Button>
        </Box>

        {/* ── Modo Duplicidades ── */}
        {modoDuplicidades && (
          <Box>
            {grupos.length === 0 && !loadingDuplicidades && (
              <Alert severity="success" sx={{ mb: 2 }}>Nenhuma duplicidade encontrada com os filtros atuais.</Alert>
            )}
            {grupos.map((grupo, gi) => (
              <Box key={gi} sx={{ mb: 3 }}>
                <Alert severity="warning" icon={<ContentCopyIcon />} sx={{ mb: 1 }}>
                  <strong>{grupo.length} registros</strong> idênticos:{' '}
                  <strong>{formatarData(grupo[0].data)}</strong>{' '}
                  {(grupo[0].horario || '').substring(0, 5)}h —{' '}
                  {grupo[0].campus?.nome || '?'} /{' '}
                  {grupo[0].ministerio?.nome || '?'} /{' '}
                  {grupo[0].tipoEvento?.nome || '?'}
                </Alert>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Horário</TableCell>
                        <TableCell>Campus</TableCell>
                        <TableCell>Ministério</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Quem ministrou</TableCell>
                        <TableCell align="center">Presença</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grupo.map((r, ri) => renderLinha(r, cores[gi % cores.length]))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Box>
        )}

        {/* ── Lista normal ── */}
        {!modoDuplicidades && (
          <>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Horário</TableCell>
                    <TableCell>Campus</TableCell>
                    <TableCell>Ministério</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Quem ministrou</TableCell>
                    <TableCell align="center">Presença</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registros.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">Nenhum registro encontrado</TableCell>
                    </TableRow>
                  )}
                  {registros.map((r) => renderLinha(r, null))}
                </TableBody>
              </Table>
            </TableContainer>

            {pages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
              </Box>
            )}
          </>
        )}

        {/* Modal de detalhes */}
        <Dialog
          open={detalheDialog.open}
          onClose={() => setDetalheDialog({ open: false, registro: null })}
          maxWidth="sm" fullWidth
        >
          {detalheDialog.registro && (() => {
            const r = detalheDialog.registro;
            return (
              <>
                <DialogTitle>Detalhes do Culto — {formatarData(r.data)}</DialogTitle>
                <DialogContent dividers>
                  <Grid container spacing={1}>
                    {[
                      ['Campus', r.campus?.nome],
                      ['Ministério', r.ministerio?.nome],
                      ['Tipo', r.tipoEvento?.nome],
                      ['Horário', r.horario],
                      ['Quem ministrou', r.ministros && r.ministros.length > 0
                        ? r.ministros.map((m) => m.nome).join(', ')
                        : (r.quemMinistrou || '—')],
                      ['Título', r.tituloMensagem],
                      ['Série', r.eSerie ? r.nomeSerie : 'Não'],
                      ['Homens', r.qtdHomens],
                      ['Mulheres', r.qtdMulheres],
                      ['Crianças', r.qtdCriancas ?? '—'],
                      ['Bebês', r.qtdBebes ?? '—'],
                      ['Voluntários', r.qtdVoluntarios],
                      ['Online', r.qtdOnline ?? '—'],
                      ['Apelo', r.teveApelo ? `Sim (${r.qtdApelo} pessoas)` : 'Não'],
                      ['Comentários', r.comentarios || '—'],
                    ].map(([label, value]) => (
                      <Grid item xs={6} key={label}>
                        <Typography variant="caption" color="textSecondary">{label}</Typography>
                        <Typography variant="body2">{value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDetalheDialog({ open: false, registro: null })}>Fechar</Button>
                  <Button variant="contained" onClick={() => {
                    setDetalheDialog({ open: false, registro: null });
                    history.push(`/app/cultos/registros/${r.id}/editar`);
                  }}>Editar</Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>

        {/* Modal de confirmação de exclusão */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogContent>
            <DialogContentText>Esta ação não pode ser desfeita. Deseja excluir o registro?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={confirmarDelete}>Excluir</Button>
          </DialogActions>
        </Dialog>

        {notification && <Notification message={notification} onClose={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default RegistroCultoList;
