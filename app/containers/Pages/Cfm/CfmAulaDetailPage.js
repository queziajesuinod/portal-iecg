import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Button, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  IconButton, Tooltip, TextField, Avatar, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import { useParams, useHistory } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';
import { PapperBlock } from 'dan-components';
import * as api from '../../../api/cfmApi';

const normalizar = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const formatarData = (d) => { if (!d) return ''; const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; };

function getStatusAula(dataAula) {
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - diaSemana);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  const d = new Date(`${dataAula}T12:00:00`);
  if (d < inicio) return 'passada';
  if (d > fim) return 'futura';
  return 'vigente';
}

export default function CfmAulaDetailPage() {
  const { aulaId } = useParams();
  const history = useHistory();
  const [aula, setAula] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [presencaLocal, setPresencaLocal] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busca, setBusca] = useState('');
  const [cancelDialog, setCancelDialog] = useState({ open: false, reativar: false });
  const [motivoInput, setMotivoInput] = useState('');
  const [savingCancelamento, setSavingCancelamento] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAulaDetalhes(aulaId);
      setAula(data.aula);
      setAlunos(data.alunos);
      const map = {};
      data.alunos.forEach((a) => { map[a.inscricaoId] = a.presente; });
      setPresencaLocal(map);
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally {
      setLoading(false);
    }
  }, [aulaId]);

  useEffect(() => { load(); }, [load]);

  const toggle = (inscricaoId) => setPresencaLocal((p) => ({ ...p, [inscricaoId]: !p[inscricaoId] }));

  const marcarTodos = (valor) => {
    const map = {};
    alunos.forEach((a) => { map[a.inscricaoId] = valor; });
    setPresencaLocal(map);
  };

  const salvar = async () => {
    setSaving(true);
    setError('');
    try {
      const presencas = alunos.map((a) => ({
        inscricaoId: a.inscricaoId,
        presente: !!presencaLocal[a.inscricaoId],
      }));
      await api.salvarPresencasAula(aulaId, presencas);
      setSuccess('Presenças salvas com sucesso!');
      await load();
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally {
      setSaving(false);
    }
  };

  const abrirCancelar = () => {
    setMotivoInput(aula?.motivoCancelamento || '');
    setCancelDialog({ open: true, reativar: false });
  };

  const abrirReativar = () => {
    setCancelDialog({ open: true, reativar: true });
  };

  const salvarCancelamento = async () => {
    setSavingCancelamento(true);
    setError('');
    try {
      await api.cancelarAula(aulaId, {
        cancelada: !cancelDialog.reativar,
        motivoCancelamento: motivoInput,
      });
      setCancelDialog({ open: false, reativar: false });
      await load();
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally {
      setSavingCancelamento(false);
    }
  };

  const alunosFiltrados = alunos.filter((a) => !busca || normalizar(a.nome).includes(normalizar(busca))
  );

  const totalPresentes = alunos.filter((a) => !!presencaLocal[a.inscricaoId]).length;
  const statusAula = aula ? getStatusAula(aula.dataAula) : null;
  const bloqueada = statusAula === 'futura';

  return (
    <PapperBlock title="Lista de Presença" desc="Registre a presença dos alunos em aula" icon="ion-ios-people-outline">
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconButton onClick={() => history.goBack()}><ArrowBackIcon /></IconButton>
        <Typography variant="caption" color="text.secondary">Voltar</Typography>
        {aula && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mx: 1 }}>·</Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatarData(aula.dataAula)}
            </Typography>
            {aula.turma?.numeracao && (
              <Chip size="small" label={`Turma ${aula.turma.numeracao}`} variant="outlined" sx={{ ml: 1 }} />
            )}
            {aula.turmaMateria?.materia?.nome && (
              <Chip size="small" label={aula.turmaMateria.materia.nome} color="primary" variant="outlined" sx={{ ml: 1 }} />
            )}
          </>
        )}
        <Box flex={1} />
        {!loading && (
          <Chip
            label={`${totalPresentes} / ${alunos.length} presentes`}
            color={totalPresentes > 0 ? 'success' : 'default'}
            variant="outlined"
          />
        )}
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {bloqueada && (
        <Alert severity="info" icon={<LockIcon />} sx={{ mb: 2 }}>
          Esta aula ainda não ocorreu. A lista de presença ficará disponível na semana vigente.
        </Alert>
      )}

      {/* Painel de status da aula (cancelar / reativar) */}
      {aula && !bloqueada && !loading && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            borderColor: aula.cancelada ? 'error.main' : 'success.main',
            bgcolor: aula.cancelada ? 'rgba(211,47,47,0.04)' : 'rgba(46,125,50,0.04)',
          }}
        >
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Chip
              size="small"
              label={aula.cancelada ? 'Cancelada / Não Realizada' : 'Aula Realizada'}
              color={aula.cancelada ? 'error' : 'success'}
              variant="filled"
            />
            {aula.cancelada && aula.motivoCancelamento && (
              <Typography variant="body2" color="error.dark">
                Motivo: {aula.motivoCancelamento}
              </Typography>
            )}
            <Box flex={1} />
            {aula.cancelada ? (
              <Button
                size="small"
                color="success"
                variant="outlined"
                startIcon={<CheckIcon />}
                onClick={abrirReativar}
                disabled={savingCancelamento}
              >
                Marcar como Realizada
              </Button>
            ) : (
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<BlockIcon />}
                onClick={abrirCancelar}
                disabled={savingCancelamento}
              >
                Cancelar / Não Houve
              </Button>
            )}
          </Box>
        </Paper>
      )}

      {aula?.cancelada && !bloqueada && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta aula está marcada como cancelada. As presenças abaixo não são contabilizadas no cálculo de frequência.
        </Alert>
      )}

      {loading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}

      {!loading && alunos.length === 0 && !bloqueada && (
        <Alert severity="info">
          Nenhum aluno ativo inscrito nesta turma. Confirme os pagamentos das inscrições para que os alunos apareçam aqui.
        </Alert>
      )}

      {!loading && alunos.length > 0 && !bloqueada && (
        <>
          <Box display="flex" gap={2} mb={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small" placeholder="Buscar aluno..." value={busca}
              onChange={(e) => setBusca(e.target.value)} sx={{ minWidth: 220 }}
            />
            <Button size="small" variant="outlined" onClick={() => marcarTodos(true)}>
              Marcar Todos Presentes
            </Button>
            <Button size="small" variant="outlined" color="inherit" onClick={() => marcarTodos(false)}>
              Desmarcar Todos
            </Button>
            <Box flex={1} />
            <Button
              variant="contained" startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
              onClick={salvar} disabled={saving}
            >
              Salvar Presenças
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Aluno</TableCell>
                  <TableCell align="center" width={120}>Presente</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alunosFiltrados.map((aluno) => {
                  const presente = !!presencaLocal[aluno.inscricaoId];
                  return (
                    <TableRow
                      key={aluno.inscricaoId}
                      hover
                      onClick={() => toggle(aluno.inscricaoId)}
                      sx={{ cursor: 'pointer', bgcolor: presente ? 'success.50' : undefined }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar src={aluno.photoUrl} sx={{ width: 32, height: 32, fontSize: 13 }}>
                            {aluno.nome?.[0]}
                          </Avatar>
                          <Typography variant="body2">{aluno.nome}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={presente ? 'Presente — clique para desmarcar' : 'Ausente — clique para marcar'}>
                          <IconButton size="small" color={presente ? 'success' : 'default'} onClick={(e) => { e.stopPropagation(); toggle(aluno.inscricaoId); }}>
                            {presente ? <CheckCircleIcon /> : <CancelIcon />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Dialog cancelar / reativar */}
      <Dialog
        open={cancelDialog.open}
        onClose={() => !savingCancelamento && setCancelDialog({ open: false, reativar: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {cancelDialog.reativar ? 'Marcar aula como realizada' : 'Cancelar / Aula não ocorreu'}
        </DialogTitle>
        <DialogContent>
          {cancelDialog.reativar ? (
            <Typography sx={{ pt: 1 }}>
              Esta aula voltará a ser contabilizada normalmente no cálculo de frequência dos alunos.
            </Typography>
          ) : (
            <TextField
              label="Motivo (opcional)"
              placeholder="Ex: Feriado, Pastor ausente, Sem alunos..."
              value={motivoInput}
              onChange={(e) => setMotivoInput(e.target.value)}
              fullWidth
              multiline
              rows={2}
              sx={{ mt: 1 }}
              helperText="Aulas canceladas não são contadas no cálculo de frequência dos alunos"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog({ open: false, reativar: false })} disabled={savingCancelamento}>
            Voltar
          </Button>
          <Button
            onClick={salvarCancelamento}
            variant="contained"
            color={cancelDialog.reativar ? 'success' : 'error'}
            disabled={savingCancelamento}
          >
            {savingCancelamento
              ? <CircularProgress size={20} color="inherit" />
              : cancelDialog.reativar ? 'Confirmar' : 'Cancelar Aula'}
          </Button>
        </DialogActions>
      </Dialog>
    </PapperBlock>
  );
}
