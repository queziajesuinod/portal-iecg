import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, CircularProgress, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  IconButton, Tooltip, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useHistory } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import { listarCampus } from '../../../api/campusApi';
import * as api from '../../../api/cfmApi';

const formatarData = (d) => { if (!d) return ''; const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; };

const STATUS_LABELS = {
  ABERTA: { label: 'Aberta', color: 'success' },
  EM_ANDAMENTO: { label: 'Em andamento', color: 'primary' },
  ENCERRADA: { label: 'Encerrada', color: 'default' },
  CANCELADA: { label: 'Cancelada', color: 'error' },
};

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const EMPTY_FORM = {
  escolaId: '',
  moduloId: '',
  numeracao: '',
  campusId: '',
  periodoInicio: '',
  periodoFim: '',
  vagasMax: '',
  diaSemana: '',
  activityTypeCode: '',
  marcoConclussaoCode: '',
  observacoes: '',
};

export default function CfmTurmasPage() {
  const history = useHistory();
  const [turmas, setTurmas] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [campi, setCampi] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroEscola, setFiltroEscola] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroCampus, setFiltroCampus] = useState('');
  const [filtroDia, setFiltroDia] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: { ...EMPTY_FORM }, editing: null });
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false, turmaId: null, turma: null, preview: null, loading: false, deleting: false
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      if (filtroEscola) params.escolaId = filtroEscola;
      if (filtroModulo) params.moduloId = filtroModulo;
      if (filtroCampus) params.campusId = filtroCampus;
      if (filtroDia !== '') params.diaSemana = filtroDia;
      const [t, e] = await Promise.all([api.listTurmas(params), api.listEscolas()]);
      setTurmas(t);
      setEscolas(e);
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    api.listActivityTypes()
      .then(data => setActivityTypes(Array.isArray(data) ? data : (data.records || data.types || [])))
      .catch(() => {});
    listarCampus()
      .then(data => setCampi(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [filtroStatus, filtroEscola, filtroModulo, filtroCampus, filtroDia]);

  const openCreate = () => setDialog({ open: true, data: { ...EMPTY_FORM }, editing: null });
  const openEdit = (t) => setDialog({
    open: true,
    editing: t.id,
    data: {
      escolaId: t.escolaId || '',
      moduloId: t.moduloId || '',
      numeracao: t.numeracao,
      campusId: t.campusId || '',
      periodoInicio: t.periodoInicio,
      periodoFim: t.periodoFim,
      vagasMax: t.vagasMax || '',
      diaSemana: t.diaSemana ?? '',
      activityTypeCode: t.activityTypeCode || '',
      marcoConclussaoCode: t.marcoConclussaoCode || '',
      observacoes: t.observacoes || '',
      status: t.status,
    },
  });
  const closeDialog = () => setDialog({ open: false, data: { ...EMPTY_FORM }, editing: null });

  const setField = (field) => (e) => setDialog(d => ({ ...d, data: { ...d.data, [field]: e.target.value } }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...dialog.data };
      if (!payload.moduloId) delete payload.moduloId;
      if (!payload.campusId) delete payload.campusId;
      if (!payload.vagasMax) payload.vagasMax = null; else payload.vagasMax = Number(payload.vagasMax);
      if (payload.diaSemana === '' || payload.diaSemana === null) payload.diaSemana = null;
      else payload.diaSemana = Number(payload.diaSemana);
      if (dialog.editing) await api.updateTurma(dialog.editing, payload);
      else await api.createTurma(payload);
      closeDialog();
      await load();
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally { setSaving(false); }
  };

  const openDeleteDialog = async (t) => {
    setDeleteDialog({
      open: true, turmaId: t.id, turma: t, preview: null, loading: true, deleting: false
    });
    try {
      const preview = await api.previewDeleteTurma(t.id);
      setDeleteDialog(d => ({ ...d, preview, loading: false }));
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
      setDeleteDialog(d => ({ ...d, open: false }));
    }
  };

  const confirmDelete = async () => {
    setDeleteDialog(d => ({ ...d, deleting: true }));
    try {
      await api.deleteTurma(deleteDialog.turmaId);
      setDeleteDialog({
        open: false, turmaId: null, turma: null, preview: null, loading: false, deleting: false
      });
      await load();
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
      setDeleteDialog(d => ({ ...d, deleting: false }));
    }
  };

  const escolaSelecionada = escolas.find(e => e.id === dialog.data.escolaId);
  const modulosDisp = escolaSelecionada?.modulos || [];

  return (
    <PapperBlock title="Turmas CFM" desc="Gerencie as turmas do Centro de Formação de Ministério" icon="ion-ios-school-outline">
      <Box display="flex" justifyContent="flex-end" mb={3}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nova Turma</Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filtros */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filtroStatus} label="Status" onChange={(e) => setFiltroStatus(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>Escola</InputLabel>
          <Select
            value={filtroEscola}
            label="Escola"
            onChange={(e) => { setFiltroEscola(e.target.value); setFiltroModulo(''); }}
          >
            <MenuItem value="">Todas</MenuItem>
            {escolas.map(e => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
          </Select>
        </FormControl>
        {(() => {
          const esc = escolas.find(e => e.id === filtroEscola);
          const mods = esc?.modulos || [];
          if (!esc?.temModulos || mods.length === 0) return null;
          return (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Módulo</InputLabel>
              <Select value={filtroModulo} label="Módulo" onChange={(e) => setFiltroModulo(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {mods.map(m => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
              </Select>
            </FormControl>
          );
        })()}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Campus</InputLabel>
          <Select value={filtroCampus} label="Campus" onChange={(e) => setFiltroCampus(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {campi.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Dia da semana</InputLabel>
          <Select value={filtroDia} label="Dia da semana" onChange={(e) => setFiltroDia(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {DIAS_SEMANA.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Numeração</TableCell>
                <TableCell>Escola / Módulo</TableCell>
                <TableCell>Período</TableCell>
                <TableCell>Campus</TableCell>
                <TableCell>Vagas</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {turmas.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" py={2}>Nenhuma turma encontrada</Typography></TableCell></TableRow>
              )}
              {turmas.map((t) => {
                const st = STATUS_LABELS[t.status] || { label: t.status, color: 'default' };
                return (
                  <TableRow key={t.id} hover>
                    <TableCell><strong>{t.numeracao}</strong></TableCell>
                    <TableCell>
                      {t.escola?.nome}
                      {t.modulo && <><br /><Typography variant="caption" color="text.secondary">{t.modulo.nome}</Typography></>}
                    </TableCell>
                    <TableCell>
                      {formatarData(t.periodoInicio)} → {formatarData(t.periodoFim)}
                    </TableCell>
                    <TableCell>{t.campus?.nome || '—'}</TableCell>
                    <TableCell>{t.vagasMax || '∞'}</TableCell>
                    <TableCell><Chip size="small" label={st.label} color={st.color} /></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Gerenciar turma">
                        <IconButton size="small" color="primary" onClick={() => history.push(`/app/cfm/turmas/${t.id}`)}><OpenInNewIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir turma">
                        <IconButton size="small" color="error" onClick={() => openDeleteDialog(t)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog exclusão de turma */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => !deleteDialog.deleting && setDeleteDialog(d => ({ ...d, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>Excluir Turma</DialogTitle>
        <DialogContent>
          {deleteDialog.loading && (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
          )}
          {!deleteDialog.loading && deleteDialog.preview && (
            <Box>
              <Typography variant="body2" mb={2}>
                Você está prestes a excluir permanentemente a turma{' '}
                <strong>{deleteDialog.turma?.numeracao}</strong>. Esta ação não pode ser desfeita.
              </Typography>
              <Typography variant="subtitle2" mb={1}>O seguinte será removido:</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {deleteDialog.preview.inscricoes > 0 && (
                  <Typography component="li" variant="body2" color="error.main">
                    <strong>{deleteDialog.preview.inscricoes}</strong> inscrição(ões) de alunos
                  </Typography>
                )}
                {deleteDialog.preview.aulas > 0 && (
                  <Typography component="li" variant="body2" color="error.main">
                    <strong>{deleteDialog.preview.aulas}</strong> aula(s) e respectivas presenças
                  </Typography>
                )}
                {deleteDialog.preview.mensalidades > 0 && (
                  <Typography component="li" variant="body2" color="error.main">
                    <strong>{deleteDialog.preview.mensalidades}</strong> mensalidade(s)
                  </Typography>
                )}
                {deleteDialog.preview.notas > 0 && (
                  <Typography component="li" variant="body2" color="error.main">
                    <strong>{deleteDialog.preview.notas}</strong> nota(s) lançadas
                  </Typography>
                )}
                {deleteDialog.preview.marcosRemovidos > 0 && (
                  <Typography component="li" variant="body2" color="error.main">
                    <strong>{deleteDialog.preview.marcosRemovidos}</strong> marco(s) de conclusão do perfil dos membros
                  </Typography>
                )}
                {deleteDialog.preview.inscricoes === 0 && deleteDialog.preview.aulas === 0 && (
                  <Typography component="li" variant="body2" color="text.secondary">
                    Matérias e configurações da turma (sem inscrições)
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(d => ({ ...d, open: false }))} disabled={deleteDialog.deleting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleteDialog.loading || deleteDialog.deleting}
          >
            {deleteDialog.deleting ? <CircularProgress size={20} color="inherit" /> : 'Excluir tudo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog criar/editar turma */}
      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>{dialog.editing ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Escola *</InputLabel>
              <Select value={dialog.data.escolaId} label="Escola *" onChange={setField('escolaId')}>
                {escolas.map(e => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
              </Select>
            </FormControl>

            {escolaSelecionada?.temModulos ? (
              <FormControl fullWidth>
                <InputLabel>Módulo</InputLabel>
                <Select value={dialog.data.moduloId} label="Módulo" onChange={setField('moduloId')}>
                  <MenuItem value="">Selecione...</MenuItem>
                  {modulosDisp.map(m => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
                </Select>
              </FormControl>
            ) : <Box />}

            <TextField label="Numeração *" value={dialog.data.numeracao} onChange={setField('numeracao')} helperText="Ex: EF-2025-T01" />
            <FormControl fullWidth>
              <InputLabel>Campus</InputLabel>
              <Select value={dialog.data.campusId} label="Campus" onChange={setField('campusId')}>
                <MenuItem value="">Sem campus específico</MenuItem>
                {campi.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Vagas Máximas" type="number" value={dialog.data.vagasMax} onChange={setField('vagasMax')} helperText="Deixe vazio para ilimitado" />
            <FormControl fullWidth>
              <InputLabel>Dia da Semana</InputLabel>
              <Select value={dialog.data.diaSemana} label="Dia da Semana" onChange={setField('diaSemana')}>
                <MenuItem value="">Não definido</MenuItem>
                {DIAS_SEMANA.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Período Início *" type="date" value={dialog.data.periodoInicio} onChange={setField('periodoInicio')} InputLabelProps={{ shrink: true }} />
            <TextField label="Período Fim *" type="date" value={dialog.data.periodoFim} onChange={setField('periodoFim')} InputLabelProps={{ shrink: true }} />

            {dialog.editing && (
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={dialog.data.status || 'ABERTA'} label="Status" onChange={setField('status')}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            <Autocomplete
              options={activityTypes}
              getOptionLabel={(o) => (typeof o === 'string' ? o : `${o.code} — ${o.name}`)}
              value={activityTypes.find(t => t.code === dialog.data.activityTypeCode) || null}
              onChange={(_, v) => setDialog(d => ({ ...d, data: { ...d.data, activityTypeCode: v?.code || '' } }))}
              renderInput={(params) => (
                <TextField {...params} label="Atividade na Matrícula" helperText="MemberActivity criada ao confirmar pagamento" />
              )}
              isOptionEqualToValue={(o, v) => o.code === v.code}
              noOptionsText="Nenhum tipo encontrado"
            />
            <Autocomplete
              options={activityTypes}
              getOptionLabel={(o) => (typeof o === 'string' ? o : `${o.code} — ${o.name}`)}
              value={activityTypes.find(t => t.code === dialog.data.marcoConclussaoCode) || null}
              onChange={(_, v) => setDialog(d => ({ ...d, data: { ...d.data, marcoConclussaoCode: v?.code || '' } }))}
              renderInput={(params) => (
                <TextField {...params} label="Marco na Conclusão" helperText="MemberActivity (marco) criada ao aprovar o aluno" />
              )}
              isOptionEqualToValue={(o, v) => o.code === v.code}
              noOptionsText="Nenhum tipo encontrado"
            />
            <TextField label="Observações" value={dialog.data.observacoes} onChange={setField('observacoes')} multiline rows={2} sx={{ gridColumn: '1 / -1' }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button variant="contained" onClick={save} disabled={saving || !dialog.data.escolaId || !dialog.data.numeracao || !dialog.data.periodoInicio || !dialog.data.periodoFim}>
            {saving ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </PapperBlock>
  );
}
