/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Tabs, Tab, Chip, Button,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Tooltip, MenuItem, Select, FormControl, InputLabel,
  LinearProgress, Autocomplete,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PaymentIcon from '@mui/icons-material/Payment';
import SaveIcon from '@mui/icons-material/Save';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import EventIcon from '@mui/icons-material/Event';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useParams, useHistory } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import * as api from '../../../api/cfmApi';
import { searchMembers } from '../../../api/cfmApi';

const DIAS_SEMANA_NOMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const normalizar = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const formatarData = (d) => { if (!d) return ''; const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; };

function getSemanaVigente() {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=Dom
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - diaSemana);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

function getStatusAula(dataAula) {
  const { inicio, fim } = getSemanaVigente();
  const d = new Date(`${dataAula}T12:00:00`);
  if (d < inicio) return 'passada';
  if (d > fim) return 'futura';
  return 'vigente';
}

const STATUS_CHIP = {
  PENDENTE: { label: 'Pendente', color: 'warning' },
  LISTA_ESPERA: { label: 'Lista de Espera', color: 'warning' },
  ATIVO: { label: 'Ativo', color: 'success' },
  CONCLUIDO: { label: 'Concluído', color: 'primary' },
  REPROVADO: { label: 'Reprovado', color: 'error' },
  DESISTENTE: { label: 'Desistente', color: 'default' },
  CANCELADO: { label: 'Cancelado', color: 'default' },
};

function TabPanel({ value, index, children }) {
  return value === index ? <Box pt={2}>{children}</Box> : null;
}

export default function CfmTurmaDetailPage() {
  const { id } = useParams();
  const history = useHistory();
  const [turma, setTurma] = useState(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTurma = useCallback(async () => {
    try {
      setTurma(await api.getTurma(id));
    } catch (e) {
      setError(e.response?.data?.erro || e.message);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadTurma(); }, [loadTurma]);

  const escolaNome = turma?.escola?.nome;
  const moduloNome = turma?.modulo?.nome;
  const campusNome = turma?.campus?.nome;

  return (
    <PapperBlock title="Detalhes da Turma" desc="Alunos, matérias, presenças e notas" icon="ion-ios-school-outline">
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconButton onClick={() => history.push('/app/cfm/turmas')}><ArrowBackIcon /></IconButton>
        <Typography variant="caption" color="text.secondary">Voltar às turmas</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {loading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}

      {!loading && !turma && !error && <Alert severity="error">Turma não encontrada.</Alert>}

      {!loading && turma && (
        <>
          <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
            <Box flex={1}>
              <Typography variant="h6" fontWeight={600}>
                {escolaNome}{moduloNome ? ` — ${moduloNome}` : ''} · Turma {turma.numeracao}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatarData(turma.periodoInicio)} → {formatarData(turma.periodoFim)}
                {campusNome ? ` · ${campusNome}` : ''}
                {turma.vagasMax ? ` · ${turma.vagasMax} vagas` : ''}
                {turma.diaSemana !== null && turma.diaSemana !== undefined ? ` · ${DIAS_SEMANA_NOMES[turma.diaSemana]}` : ''}
              </Typography>
            </Box>
            <Chip label={STATUS_CHIP[turma.status]?.label || turma.status} color={STATUS_CHIP[turma.status]?.color || 'default'} />
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
            <Tab label="Alunos" />
            <Tab label="Matérias & Mestres" />
            <Tab label="Aulas / Presença" />
            <Tab label="Notas" />
            <Tab label="Mensalidades" />
            <Tab label="Painel" />
          </Tabs>

          <TabPanel value={tab} index={0}>
            <AlunosTab turmaId={id} turma={turma} onError={setError} />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <MateriasTab turmaId={id} turma={turma} onReload={loadTurma} onError={setError} />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <AulasTab turmaId={id} turma={turma} onError={setError} />
          </TabPanel>
          <TabPanel value={tab} index={3}>
            <NotasTab turmaId={id} turmaMaterias={turma.turmaMaterias || []} onError={setError} />
          </TabPanel>
          <TabPanel value={tab} index={4}>
            <MensalidadesTab turmaId={id} turma={turma} onError={setError} />
          </TabPanel>
          <TabPanel value={tab} index={5}>
            <PainelTab turmaId={id} onError={setError} />
          </TabPanel>
        </>
      )}
    </PapperBlock>
  );
}

// ─── ABA: ALUNOS ───────────────────────────────────────────────────────────

function AlunosTab({ turmaId, turma, onError }) {
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [dialog, setDialog] = useState({
    open: false, memberId: null, nomeNaoMembro: '', observacoes: ''
  });
  const [conclusaoTurmaDialog, setConclusaoTurmaDialog] = useState({ open: false });
  const [previewTurma, setPreviewTurma] = useState(null);
  const [loadingPreviewTurma, setLoadingPreviewTurma] = useState(false);
  const [pagDialog, setPagDialog] = useState({ open: false, inscricaoId: null, dataPagamento: new Date().toISOString().slice(0, 10) });
  const [dadosDialog, setDadosDialog] = useState({ open: false, insc: null });
  const [dadosForm, setDadosForm] = useState({});
  const [dadosMinisterios, setDadosMinisterios] = useState([]);
  const [dadosPastores, setDadosPastores] = useState([]);
  const [dadosLiderOptions, setDadosLiderOptions] = useState([]);
  const [dadosLiderInput, setDadosLiderInput] = useState('');
  const [dadosLiderSelecionado, setDadosLiderSelecionado] = useState(null);
  const [dadosLiderLoading, setDadosLiderLoading] = useState(false);
  const [savingDados, setSavingDados] = useState(false);
  const [memberOptions, setMemberOptions] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setInscricoes(await api.listInscricoes(turmaId)); } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [turmaId]);

  useEffect(() => {
    if (memberSearch.length < 2) { setMemberOptions([]); return; }
    searchMembers(memberSearch, 15)
      .then(setMemberOptions)
      .catch(() => { });
  }, [memberSearch]);

  const criarInscricao = async () => {
    setSaving(true);
    try {
      await api.createInscricao(turmaId, {
        memberId: dialog.memberId || null,
        nomeNaoMembro: !dialog.memberId ? dialog.nomeNaoMembro : null,
        observacoes: dialog.observacoes || null,
      });
      setDialog({
        open: false, memberId: null, nomeNaoMembro: '', observacoes: ''
      });
      await load();
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setSaving(false); }
  };

  const confirmarPag = async () => {
    setSaving(true);
    try {
      await api.confirmarPagamento(pagDialog.inscricaoId, { dataPagamento: pagDialog.dataPagamento });
      setPagDialog({ open: false, inscricaoId: null, dataPagamento: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setSaving(false); }
  };

  const abrirConclusaoTurma = async () => {
    setConclusaoTurmaDialog({ open: true });
    setPreviewTurma(null);
    setLoadingPreviewTurma(true);
    try {
      const p = await api.previewConclusaoTurma(turmaId);
      setPreviewTurma(p);
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setLoadingPreviewTurma(false); }
  };

  const concluirTurmaCompleta = async () => {
    setSaving(true);
    try {
      await api.concluirTurma(turmaId);
      setConclusaoTurmaDialog({ open: false });
      setPreviewTurma(null);
      await load();
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setSaving(false); }
  };

  const desistir = async (id) => {
    if (!window.confirm('Marcar desistência?')) return;
    try { await api.marcarDesistencia(id); await load(); } catch (e) { onError(e.response?.data?.erro || e.message); }
  };

  const reabrir = async (id, nome) => {
    if (!window.confirm(`Reabrir inscrição de ${nome}? O status voltará para Ativo e o marco de conclusão será removido.`)) return;
    try { await api.reabrirInscricao(id); await load(); } catch (e) { onError(e.response?.data?.erro || e.message); }
  };

  const abrirDadosDialog = async (insc) => {
    const df = insc.dadosFormulario || {};
    setDadosForm({
      geracao: df.geracao || '',
      pastorId: df.pastorId || '',
      pastorCargo: '',
      deficiencia: df.deficiencia || '',
      encontroComDeus: df.encontroComDeus || '',
      dataEncontroComDeus: df.dataEncontroComDeus || '',
      anoConversaoMinisterio: df.anoConversaoMinisterio || '',
    });
    setDadosLiderSelecionado(df.liderCelulaId ? {
      id: df.liderCelulaId, nome: df.liderNome || '', celulaId: null, celulaNome: df.liderCelulaNome || ''
    } : null);
    setDadosLiderInput(df.liderNome || '');
    setDadosLiderOptions([]);
    setDadosDialog({ open: true, insc });
    if (!dadosMinisterios.length || !dadosPastores.length) {
      try {
        const [mins, pasts] = await Promise.all([api.listarMinisterios(), api.listarPastoresCfm()]);
        setDadosMinisterios(mins || []);
        setDadosPastores(pasts || []);
        // eslint-disable-next-line no-empty
      } catch { }
    }
  };

  const salvarDados = async () => {
    setSavingDados(true);
    try {
      const payload = {
        geracao: dadosForm.geracao || null,
        liderCelulaId: dadosLiderSelecionado?.id || null,
        pastorId: dadosForm.pastorId || null,
        deficiencia: dadosForm.deficiencia || null,
        encontroComDeus: dadosForm.encontroComDeus || null,
        dataEncontroComDeus: dadosForm.dataEncontroComDeus || null,
        anoConversaoMinisterio: dadosForm.anoConversaoMinisterio || null,
      };
      const novoDf = await api.atualizarDadosFormulario(dadosDialog.insc.id, payload);
      setDadosDialog(d => ({ ...d, insc: { ...d.insc, dadosFormulario: novoDf } }));
      await load();
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setSavingDados(false); }
  };

  useEffect(() => {
    if (!dadosLiderInput || dadosLiderInput.length < 2) { setDadosLiderOptions([]); return () => {}; }
    const t = setTimeout(async () => {
      setDadosLiderLoading(true);
      try { setDadosLiderOptions(await api.buscarLideresCelulaSearch(dadosLiderInput)); } catch (_ignored) { /* silent */ } finally { setDadosLiderLoading(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [dadosLiderInput]);

  const inscricoesFiltradas = inscricoes.filter((i) => {
    if (!busca) return true;
    const nome = i.membro ? (i.membro.preferredName || i.membro.fullName) : i.nomeNaoMembro;
    return normalizar(nome).includes(normalizar(busca));
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2} gap={2} flexWrap="wrap">
        <TextField size="small" placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ minWidth: 220 }} />
        <Box display="flex" gap={1}>
          <Button variant="outlined" size="small" startIcon={<CheckCircleIcon />} onClick={abrirConclusaoTurma} color="primary">
            Concluir Turma
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setDialog(d => ({ ...d, open: true }))}>
            Inscrever Aluno
          </Button>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" mb={1} display="block">
        {inscricoes.length} aluno(s) inscrito(s){busca ? ` — ${inscricoesFiltradas.length} encontrado(s)` : ''}
      </Typography>

      {loading ? <CircularProgress size={24} /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Aluno</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Matrícula</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inscricoesFiltradas.length === 0 && <TableRow><TableCell colSpan={4} align="center"><Typography color="text.secondary" py={1}>{busca ? 'Nenhum aluno encontrado' : 'Nenhum aluno inscrito'}</Typography></TableCell></TableRow>}
              {inscricoesFiltradas.map((insc) => {
                const nome = insc.membro ? (insc.membro.preferredName || insc.membro.fullName) : insc.nomeNaoMembro;
                const st = STATUS_CHIP[insc.status] || { label: insc.status, color: 'default' };
                const ativo = ['PENDENTE', 'LISTA_ESPERA', 'ATIVO'].includes(insc.status);
                return (
                  <TableRow key={insc.id}>
                    <TableCell>
                      {nome}
                      {!insc.memberId && <Chip size="small" label="Não-membro" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell><Chip size="small" label={st.label} color={st.color} /></TableCell>
                    <TableCell>
                      {insc.pagamentoMatricula
                        ? <Chip size="small" icon={<CheckCircleIcon />} label={`Pago ${formatarData(insc.dataPagamento)}`} color="success" />
                        : <Chip size="small" label="Pendente" color="warning" />}
                    </TableCell>
                    <TableCell align="right">
                      {!insc.pagamentoMatricula && ativo && (
                        <Tooltip title="Confirmar pagamento da matrícula">
                          <IconButton size="small" color="success" onClick={() => setPagDialog({ open: true, inscricaoId: insc.id, dataPagamento: new Date().toISOString().slice(0, 10) })}>
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {['CONCLUIDO', 'REPROVADO'].includes(insc.status) && (
                        <Tooltip title="Reabrir inscrição (volta para Ativo para ajustes)">
                          <IconButton size="small" color="warning" onClick={() => reabrir(insc.id, nome)}>
                            <AutorenewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {ativo && (
                        <Tooltip title="Marcar desistência">
                          <IconButton size="small" color="warning" onClick={() => desistir(insc.id)}><PersonRemoveIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                      {insc.memberId && (
                        <Tooltip title="Ver / editar dados de matrícula">
                          <IconButton size="small" color="info" onClick={() => abrirDadosDialog(insc)}><InfoOutlinedIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog inscrição */}
      <Dialog open={dialog.open} onClose={() => setDialog(d => ({ ...d, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Inscrever Aluno</DialogTitle>
        <DialogContent sx={{
          display: 'flex', flexDirection: 'column', gap: 2, pt: 2
        }}>
          <Autocomplete
            options={memberOptions}
            getOptionLabel={(o) => (o ? `${o.fullName}${o.preferredName && o.preferredName !== o.fullName ? ` (${o.preferredName})` : ''}` : '')}
            onInputChange={(_, v) => setMemberSearch(v)}
            onChange={(_, v) => setDialog(d => ({ ...d, memberId: v?.id || null }))}
            renderInput={(params) => <TextField {...params} label="Membro (opcional)" helperText="Deixe vazio se o aluno não for membro" />}
            noOptionsText="Digite pelo menos 2 caracteres..."
          />
          {!dialog.memberId && (
            <TextField label="Nome (não membro)" value={dialog.nomeNaoMembro} onChange={(e) => setDialog(d => ({ ...d, nomeNaoMembro: e.target.value }))} />
          )}
          <TextField label="Observações" multiline rows={2} value={dialog.observacoes} onChange={(e) => setDialog(d => ({ ...d, observacoes: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(d => ({ ...d, open: false }))}>Cancelar</Button>
          <Button variant="contained" onClick={criarInscricao} disabled={saving || (!dialog.memberId && !dialog.nomeNaoMembro)}>
            {saving ? <CircularProgress size={20} /> : 'Inscrever'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pagamento */}
      <Dialog open={pagDialog.open} onClose={() => setPagDialog(d => ({ ...d, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Pagamento</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField label="Data do Pagamento" type="date" value={pagDialog.dataPagamento} onChange={(e) => setPagDialog(d => ({ ...d, dataPagamento: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagDialog(d => ({ ...d, open: false }))}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={confirmarPag} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Confirmar Pagamento'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog conclusão da turma */}
      <Dialog open={conclusaoTurmaDialog.open} onClose={() => { setConclusaoTurmaDialog({ open: false }); setPreviewTurma(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Concluir Turma</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {loadingPreviewTurma && <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>}

          {!loadingPreviewTurma && previewTurma && (
            <Box>
              <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
                <Chip label={`${previewTurma.totalAtivos} ativos`} variant="outlined" />
                <Chip label={`${previewTurma.aprovadosCount} aprovados`} color="success" />
                <Chip label={`${previewTurma.reprovadosCount} reprovados`} color="error" />
                {previewTurma.semNotasCount > 0 && (
                  <Chip label={`${previewTurma.semNotasCount} sem notas (serão pulados)`} color="warning" variant="outlined" />
                )}
              </Box>

              {previewTurma.semNotasCount > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {previewTurma.semNotasCount} aluno(s) sem notas completas não serão concluídos. Registre as notas na aba <strong>Notas</strong> para incluí-los.
                </Alert>
              )}

              {previewTurma.podeConcluirCount === 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Nenhum aluno pode ser concluído agora. Registre as notas primeiro.
                </Alert>
              )}

              <Box display="flex" flexDirection="column" gap={0.5}>
                {previewTurma.alunos.map((a, i) => (
                  <Box key={i} display="flex" alignItems="center" justifyContent="space-between" px={1.5} py={0.75}
                    sx={{
                      borderRadius: 1, bgcolor: !a.podeConcluir ? 'warning.50' : a.resultadoGeral === 'CONCLUIDO' ? 'success.50' : 'error.50', border: '1px solid', borderColor: !a.podeConcluir ? 'warning.200' : a.resultadoGeral === 'CONCLUIDO' ? 'success.200' : 'error.200'
                    }}>
                    <Typography variant="body2" fontWeight={500}>{a.nome}</Typography>
                    {!a.podeConcluir
                      ? <Chip size="small" label={`Sem notas: ${a.naoAvaliadas.join(', ')}`} color="warning" variant="outlined" />
                      : <Chip size="small" label={a.resultadoGeral === 'CONCLUIDO' ? 'Aprovado' : 'Reprovado'} color={a.resultadoGeral === 'CONCLUIDO' ? 'success' : 'error'} />}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConclusaoTurmaDialog({ open: false }); setPreviewTurma(null); }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={concluirTurmaCompleta}
            disabled={saving || loadingPreviewTurma || !previewTurma || previewTurma.podeConcluirCount === 0}
          >
            {saving ? <CircularProgress size={20} /> : `Concluir ${previewTurma?.podeConcluirCount || 0} aluno(s)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog dados de matrícula — visualização + edição */}
      {dadosDialog.insc && (() => {
        const { insc } = dadosDialog;
        const m = insc.membro;
        const nome = m ? (m.preferredName || m.fullName) : insc.nomeNaoMembro;
        const fmtCpf = (v) => { const d = (v || '').replace(/\D/g, ''); if (d.length !== 11) return v || '—'; return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`; };
        const fmtData = (v) => { if (!v) return '—'; const [a, mo, d] = String(v).slice(0, 10).split('-'); return `${d}/${mo}/${a}`; };
        const isEF = !!(turma?.escola?.nome?.toLowerCase().includes('fundamento'));
        const pastorSelecionado = dadosPastores.find(p => p.id === dadosForm.pastorId);
        return (
          <Dialog open={dadosDialog.open} onClose={() => setDadosDialog({ open: false, insc: null })} maxWidth="sm" fullWidth>
            <DialogTitle>Dados de Matrícula — {nome}</DialogTitle>
            <DialogContent sx={{
              pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5
            }}>

              {/* Identificação — somente leitura */}
              <Box>
                <Typography variant="overline" color="text.secondary">Identificação (dados do membro)</Typography>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1} mt={0.5}>
                  <Box><Typography variant="caption" color="text.secondary">CPF</Typography><Typography variant="body2">{fmtCpf(m?.cpf)}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Data de Nascimento</Typography><Typography variant="body2">{fmtData(m?.birthDate)}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">E-mail</Typography><Typography variant="body2">{m?.email || '—'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Telefone</Typography><Typography variant="body2">{m?.phone || '—'}</Typography></Box>
                </Box>
              </Box>

              {/* Campos editáveis */}
              <Box>
                <Typography variant="overline" color="text.secondary">Geração & Rede</Typography>
                <Box display="flex" flexDirection="column" gap={1.5} mt={1}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Rede</InputLabel>
                    <Select
                      value={dadosForm.geracao}
                      onChange={e => setDadosForm(f => ({ ...f, geracao: e.target.value }))}
                      label="Rede"
                    >
                      <MenuItem value=""><em>Não informado</em></MenuItem>
                      {dadosMinisterios.map(m2 => <MenuItem key={m2} value={m2}>{m2}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <Autocomplete
                    size="small"
                    options={dadosLiderOptions}
                    filterOptions={x => x}
                    loading={dadosLiderLoading}
                    inputValue={dadosLiderInput}
                    value={dadosLiderSelecionado}
                    getOptionLabel={o => `${o.nome}${o.celulaNome ? ` — ${o.celulaNome}` : ''}`}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    onInputChange={(_, v, reason) => { setDadosLiderInput(v); if (reason === 'clear') setDadosLiderSelecionado(null); }}
                    onChange={(_, v) => {
                      setDadosLiderSelecionado(v);
                      if (v) {
                        const p = dadosPastores.find(p2 => p2.id === v.pastorGeracaoMemberId)
                          || dadosPastores.find(p2 => p2.id === v.pastorCampusMemberId);
                        if (p) setDadosForm(f => ({ ...f, pastorId: p.id }));
                      }
                    }}
                    noOptionsText={dadosLiderInput.length < 2 ? 'Digite ao menos 2 letras' : 'Nenhum líder encontrado'}
                    renderInput={params => (
                      <TextField
                        {...params}
                        label="Líder de célula"
                        size="small"
                        helperText={dadosLiderSelecionado?.celulaNome ? `Célula: ${dadosLiderSelecionado.celulaNome}` : 'Busque pelo nome do líder'}
                        InputProps={{ ...params.InputProps, endAdornment: <>{dadosLiderLoading ? <CircularProgress size={14} /> : null}{params.InputProps.endAdornment}</> }}
                      />
                    )}
                  />

                  <Autocomplete
                    size="small"
                    options={dadosPastores}
                    groupBy={p => (p.cargo === 'pastor_geracao' ? 'Pastores de Geração' : 'Pastores de Campus')}
                    getOptionLabel={p => p.nome || ''}
                    value={dadosPastores.find(p => p.id === dadosForm.pastorId) || null}
                    onChange={(_, v) => setDadosForm(f => ({ ...f, pastorId: v ? v.id : '' }))}
                    filterOptions={(opts, { inputValue }) => {
                      const norm = s => (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
                      return opts.filter(p => norm(p.nome).includes(norm(inputValue)));
                    }}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    noOptionsText="Nenhum pastor encontrado"
                    renderInput={params => (
                      <TextField {...params} label="Pastor" size="small"
                        helperText={dadosLiderSelecionado && pastorSelecionado ? '✓ Preenchido pela hierarquia do líder' : undefined}
                        FormHelperTextProps={{ sx: { color: 'success.main' } }}
                      />
                    )}
                  />
                </Box>
              </Box>

              <TextField
                label="Deficiências / Acessibilidade"
                size="small"
                multiline
                rows={2}
                fullWidth
                value={dadosForm.deficiencia}
                onChange={e => setDadosForm(f => ({ ...f, deficiencia: e.target.value }))}
                placeholder='Ex: "Não" ou descreva a condição'
              />

              {isEF && (
                <Box>
                  <Typography variant="overline" color="text.secondary">Escola de Fundamentos</Typography>
                  <Box display="flex" flexDirection="column" gap={1.5} mt={1}>
                    <FormControl size="small">
                      <InputLabel>Encontro com Deus</InputLabel>
                      <Select value={dadosForm.encontroComDeus} onChange={e => setDadosForm(f => ({ ...f, encontroComDeus: e.target.value }))} label="Encontro com Deus">
                        <MenuItem value=""><em>Não informado</em></MenuItem>
                        <MenuItem value="sim">Sim</MenuItem>
                        <MenuItem value="nao">Não</MenuItem>
                      </Select>
                    </FormControl>
                    {dadosForm.encontroComDeus === 'sim' && (
                      <TextField label="Data do Encontro com Deus" type="date" size="small" value={dadosForm.dataEncontroComDeus} onChange={e => setDadosForm(f => ({ ...f, dataEncontroComDeus: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
                    )}
                    <TextField label="Ano de conversão / Ministério anterior" size="small" value={dadosForm.anoConversaoMinisterio} onChange={e => setDadosForm(f => ({ ...f, anoConversaoMinisterio: e.target.value }))} fullWidth multiline rows={2} />
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDadosDialog({ open: false, insc: null })}>Cancelar</Button>
              <Button variant="contained" onClick={salvarDados} disabled={savingDados}>
                {savingDados ? <CircularProgress size={20} /> : 'Salvar'}
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}
    </Box>
  );
}

// ─── ABA: MATÉRIAS & MESTRES ────────────────────────────────────────────────

function MateriasTab({
  turmaId, turma, onReload, onError
}) {
  const [turmaMaterias, setTurmaMaterias] = useState(turma.turmaMaterias || []);
  const [allMaterias, setAllMaterias] = useState([]);
  const [memberOptions, setMemberOptions] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listMaterias({ escolaId: turma.escolaId, moduloId: turma.moduloId || undefined })
      .then(setAllMaterias).catch(() => { });
  }, [turma]);

  useEffect(() => {
    if (memberSearch.length < 2) { setMemberOptions([]); return; }
    searchMembers(memberSearch, 15)
      .then(setMemberOptions)
      .catch(() => { });
  }, [memberSearch]);

  const addMateria = (materia) => {
    if (turmaMaterias.find(tm => tm.materiaId === materia.id)) return;
    setTurmaMaterias(prev => [...prev, {
      materiaId: materia.id,
      materia,
      mestreId: null,
      mestre: null,
      periodoInicio: turma.periodoInicio,
      periodoFim: turma.periodoFim,
      ordem: prev.length,
    }]);
  };

  const removeMateria = (materiaId) => setTurmaMaterias(prev => prev.filter(tm => tm.materiaId !== materiaId));

  const updateField = (materiaId, field, value) => {
    setTurmaMaterias(prev => prev.map(tm => (tm.materiaId === materiaId ? { ...tm, [field]: value } : tm)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.syncTurmaMaterias(turmaId, turmaMaterias.map((tm, i) => ({
        materiaId: tm.materiaId,
        mestreId: tm.mestreId || null,
        periodoInicio: tm.periodoInicio || null,
        periodoFim: tm.periodoFim || null,
        ordem: i,
      })));
      await onReload();
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setSaving(false); }
  };

  const materiasNaoCadastradas = allMaterias.filter(m => !turmaMaterias.find(tm => tm.materiaId === m.id));

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={500}>Matérias desta turma</Typography>
        <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Salvar'}
        </Button>
      </Box>

      {materiasNaoCadastradas.length > 0 && (
        <Box mb={2} display="flex" gap={1} flexWrap="wrap">
          {materiasNaoCadastradas.map(m => (
            <Chip key={m.id} label={`+ ${m.nome}`} onClick={() => addMateria(m)} clickable color="primary" variant="outlined" size="small" />
          ))}
        </Box>
      )}

      {turmaMaterias.length === 0 && (
        <Alert severity="info">Nenhuma matéria adicionada. Clique nas matérias acima para adicionar.</Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Matéria</TableCell>
              <TableCell>Mestre / Professor</TableCell>
              <TableCell>Período Início</TableCell>
              <TableCell>Período Fim</TableCell>
              <TableCell align="right">Remover</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {turmaMaterias.map((tm) => (
              <TableRow key={tm.materiaId}>
                <TableCell>{tm.materia?.nome || tm.materiaId}</TableCell>
                <TableCell>
                  <Autocomplete
                    size="small"
                    options={memberOptions}
                    getOptionLabel={(o) => (o ? `${o.fullName}${o.preferredName && o.preferredName !== o.fullName ? ` (${o.preferredName})` : ''}` : '')}
                    onInputChange={(_, v) => setMemberSearch(v)}
                    value={tm.mestre || null}
                    onChange={(_, v) => {
                      updateField(tm.materiaId, 'mestreId', v?.id || null);
                      updateField(tm.materiaId, 'mestre', v || null);
                    }}
                    renderInput={(params) => <TextField {...params} label="Mestre" />}
                    noOptionsText="Digite nome..."
                    sx={{ minWidth: 180 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField type="date" size="small" value={tm.periodoInicio || ''} onChange={(e) => updateField(tm.materiaId, 'periodoInicio', e.target.value)} InputLabelProps={{ shrink: true }} />
                </TableCell>
                <TableCell>
                  <TextField type="date" size="small" value={tm.periodoFim || ''} onChange={(e) => updateField(tm.materiaId, 'periodoFim', e.target.value)} InputLabelProps={{ shrink: true }} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => removeMateria(tm.materiaId)}><CancelIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── ABA: AULAS / PRESENÇA ─────────────────────────────────────────────────

function AulasTab({ turmaId, turma, onError }) {
  const history = useHistory();
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [novaAulaDialog, setNovaAulaDialog] = useState(false);
  const [novaAulaData, setNovaAulaData] = useState({
    dataAula: '', titulo: '', observacoes: '', turmaMateriaId: ''
  });
  const [savingAula, setSavingAula] = useState(false);
  const [info, setInfo] = useState('');
  const [filtroMateriaId, setFiltroMateriaId] = useState('');
  const [filtroDataDe, setFiltroDataDe] = useState('');
  const [filtroDataAte, setFiltroDataAte] = useState('');

  const load = useCallback(async () => {
    try { setAulas(await api.listarAulas(turmaId)); } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setLoading(false); }
  }, [turmaId]);

  useEffect(() => { load(); }, [load]);

  const gerar = async () => {
    if (!window.confirm('Gerar automaticamente aulas por matéria e dia da semana? Apenas datas que ainda não existem serão criadas.')) return;
    setGenerating(true);
    try {
      const result = await api.gerarAulasAutomaticas(turmaId);
      setInfo(`${result.criadas} aulas geradas`);
      await load();
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setGenerating(false); }
  };

  const salvarNovaAula = async () => {
    setSavingAula(true);
    try {
      await api.criarAula(turmaId, novaAulaData);
      setNovaAulaDialog(false);
      setNovaAulaData({
        dataAula: '', titulo: '', observacoes: '', turmaMateriaId: ''
      });
      await load();
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setSavingAula(false); }
  };

  const excluir = async (aulaId) => {
    if (!window.confirm('Excluir esta aula? Só é possível se não houver presenças marcadas.')) return;
    try { await api.deletarAula(aulaId); await load(); } catch (e) { onError(e.response?.data?.erro || e.message); }
  };

  const temDiaSemana = turma.diaSemana !== null && turma.diaSemana !== undefined;

  const aulasFiltradas = aulas.filter(a => {
    if (filtroMateriaId && a.turmaMateriaId !== filtroMateriaId) return false;
    if (filtroDataDe && a.dataAula < filtroDataDe) return false;
    if (filtroDataAte && a.dataAula > filtroDataAte) return false;
    return true;
  });

  const temFiltro = filtroMateriaId || filtroDataDe || filtroDataAte;

  return (
    <Box>
      {info && <Alert severity="success" onClose={() => setInfo('')} sx={{ mb: 2 }}>{info}</Alert>}

      <Box display="flex" gap={2} mb={2} alignItems="center" flexWrap="wrap">
        {temDiaSemana ? (
          <Button
            variant="outlined" startIcon={generating ? <CircularProgress size={16} /> : <AutorenewIcon />}
            onClick={gerar} disabled={generating}
          >
            Gerar Aulas Automático ({DIAS_SEMANA_NOMES[turma.diaSemana]})
          </Button>
        ) : (
          <Alert severity="info" sx={{ flex: 1 }}>Configure o dia da semana na edição da turma para gerar aulas automaticamente.</Alert>
        )}
        <Button variant="contained" startIcon={<EventIcon />} onClick={() => setNovaAulaDialog(true)}>
          Nova Aula Manual
        </Button>
      </Box>

      {/* Filtros */}
      <Box display="flex" gap={2} mb={2} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Matéria</InputLabel>
          <Select
            value={filtroMateriaId}
            label="Matéria"
            onChange={(e) => setFiltroMateriaId(e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {(turma.turmaMaterias || []).map(tm => (
              <MenuItem key={tm.id} value={tm.id}>{tm.materia?.nome || tm.id}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small" label="De" type="date"
          value={filtroDataDe}
          onChange={(e) => setFiltroDataDe(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 150 }}
        />
        <TextField
          size="small" label="Até" type="date"
          value={filtroDataAte}
          onChange={(e) => setFiltroDataAte(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 150 }}
        />
        {temFiltro && (
          <Button size="small" onClick={() => { setFiltroMateriaId(''); setFiltroDataDe(''); setFiltroDataAte(''); }}>
            Limpar filtros
          </Button>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {aulasFiltradas.length} aula(s)
        </Typography>
      </Box>

      {loading ? <CircularProgress size={24} /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Matéria</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Presenças</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {aulasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" py={2}>
                      {temFiltro ? 'Nenhuma aula encontrada para os filtros selecionados.' : 'Nenhuma aula cadastrada. Use os botões acima para criar.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {aulasFiltradas.map((aula) => {
                const totalPresentes = (aula.presencas || []).filter(p => p.presente).length;
                const totalAlunos = (aula.presencas || []).length;
                const statusAula = getStatusAula(aula.dataAula);
                const statusConfig = {
                  vigente: { label: 'Semana atual', color: 'success' },
                  passada: { label: 'Encerrada', color: 'default' },
                  futura: { label: 'Futura', color: 'info' },
                };
                const sc = statusConfig[statusAula];
                const isCancelada = !!aula.cancelada;
                const materiaNome = aula.turmaMateria?.materia?.nome || null;
                return (
                  <TableRow key={aula.id} hover sx={{ opacity: statusAula === 'futura' ? 0.6 : 1 }}>
                    <TableCell>
                      {materiaNome
                        ? <Chip size="small" label={materiaNome} color="primary" variant="outlined" />
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={statusAula === 'vigente' ? 700 : 400}>
                        {formatarData(aula.dataAula)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {isCancelada
                        ? <Typography variant="caption" color="error">—</Typography>
                        : totalAlunos > 0
                          ? (
                            <Box>
                              <Typography variant="body2">{totalPresentes}/{totalAlunos}</Typography>
                              <LinearProgress variant="determinate" value={totalAlunos > 0 ? (totalPresentes / totalAlunos) * 100 : 0} sx={{ height: 4, borderRadius: 2, mt: 0.25 }} color={totalPresentes === totalAlunos ? 'success' : 'primary'} />
                            </Box>
                          )
                          : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell align="center">
                      {isCancelada
                        ? <Chip size="small" label="Cancelada" color="error" variant="outlined" />
                        : <Chip size="small" label={sc.label} color={sc.color} variant={statusAula === 'vigente' ? 'filled' : 'outlined'} />}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={
                        statusAula === 'futura' ? 'Aula ainda não disponível'
                          : isCancelada ? 'Aula cancelada — ver detalhes'
                            : statusAula === 'passada' ? 'Registrar presenças retroativamente'
                              : 'Registrar presenças'
                      }>
                        <span>
                          <IconButton
                            size="small"
                            color={statusAula === 'vigente' && !isCancelada ? 'primary' : 'default'}
                            onClick={() => history.push(`/app/cfm/aulas/${aula.id}`)}
                            disabled={statusAula === 'futura'}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" color="error" onClick={() => excluir(aula.id)}>
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
      )}

      {/* Dialog nova aula manual */}
      <Dialog open={novaAulaDialog} onClose={() => setNovaAulaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Aula Manual</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Matéria *</InputLabel>
              <Select
                value={novaAulaData.turmaMateriaId}
                label="Matéria *"
                onChange={(e) => setNovaAulaData(d => ({ ...d, turmaMateriaId: e.target.value }))}
              >
                {(turma.turmaMaterias || []).map(tm => (
                  <MenuItem key={tm.id} value={tm.id}>{tm.materia?.nome || tm.id}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Data da Aula *" type="date" value={novaAulaData.dataAula}
              onChange={(e) => setNovaAulaData(d => ({ ...d, dataAula: e.target.value }))}
              InputLabelProps={{ shrink: true }} fullWidth
            />
            <TextField
              label="Título (opcional)" value={novaAulaData.titulo}
              onChange={(e) => setNovaAulaData(d => ({ ...d, titulo: e.target.value }))}
              fullWidth helperText="Ex: Aula especial, Revisão..."
            />
            <TextField
              label="Observações" value={novaAulaData.observacoes} multiline rows={2}
              onChange={(e) => setNovaAulaData(d => ({ ...d, observacoes: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNovaAulaDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={salvarNovaAula} disabled={savingAula || !novaAulaData.dataAula || !novaAulaData.turmaMateriaId}>
            {savingAula ? <CircularProgress size={20} /> : 'Criar Aula'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── ABA: NOTAS ─────────────────────────────────────────────────────────────

function NotasTab({ turmaId, turmaMaterias, onError }) {
  const [data, setData] = useState({ inscricoes: [], notas: [] });
  const [loading, setLoading] = useState(true);
  const [localNotas, setLocalNotas] = useState({});
  const [savedKeys, setSavedKeys] = useState({});
  const [dirtyKeys, setDirtyKeys] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [busca, setBusca] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getNotas(turmaId);
      setData(result);
      const map = {};
      result.notas.forEach(n => {
        map[`${n.inscricaoId}:${n.turmaMateriaId}`] = {
          nota: n.nota !== null ? String(n.nota) : '',
          aprovado: n.aprovado,
        };
      });
      setLocalNotas(map);
      setDirtyKeys({});
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setLoading(false); }
  }, [turmaId]);

  useEffect(() => { load(); }, [load]);

  const setCell = (inscricaoId, turmaMateriaId, field, value) => {
    const key = `${inscricaoId}:${turmaMateriaId}`;
    setLocalNotas(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
    setDirtyKeys(prev => ({ ...prev, [key]: true }));
    setSavedKeys(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const toggleAprovado = (inscricaoId, turmaMateriaId) => {
    const key = `${inscricaoId}:${turmaMateriaId}`;
    const cur = localNotas[key]?.aprovado;
    // Ciclo: null → true → false → null
    const next = cur === null || cur === undefined ? true : cur === true ? false : null;
    setCell(inscricaoId, turmaMateriaId, 'aprovado', next);
  };

  const saveAll = async () => {
    setSaving(true);
    setFeedback('');
    try {
      const activeInscricoes = data.inscricoes.filter(i => ['ATIVO', 'CONCLUIDO', 'REPROVADO'].includes(i.status));
      const notas = [];
      activeInscricoes.forEach(insc => {
        turmaMaterias.forEach(tm => {
          const key = `${insc.id}:${tm.id}`;
          const cell = localNotas[key] || {};
          if (cell.nota !== '' || cell.aprovado !== undefined) {
            notas.push({
              inscricaoId: insc.id,
              turmaMateriaId: tm.id,
              nota: cell.nota !== '' && cell.nota !== undefined ? cell.nota : null,
              aprovado: cell.aprovado !== undefined ? cell.aprovado : null,
            });
          }
        });
      });
      if (notas.length === 0) { setFeedback('Nenhuma nota para salvar.'); return; }
      await api.salvarNotasBulk(notas);
      const allKeys = {};
      notas.forEach(n => { allKeys[`${n.inscricaoId}:${n.turmaMateriaId}`] = true; });
      setSavedKeys(allKeys);
      setDirtyKeys({});
      setFeedback(`${notas.length} nota(s) salva(s) com sucesso.`);
    } catch (e) {
      onError(e.response?.data?.erro || e.message);
    } finally { setSaving(false); }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>;

  const activeInscricoes = data.inscricoes
    .filter(i => ['ATIVO', 'CONCLUIDO', 'REPROVADO'].includes(i.status))
    .filter(i => {
      if (!busca) return true;
      const nome = i.membro ? (i.membro.fullName) : i.nomeNaoMembro;
      return normalizar(nome).includes(normalizar(busca));
    });
  const hasDirty = Object.keys(dirtyKeys).length > 0;

  if (!turmaMaterias.length) {
    return <Alert severity="info">Configure as matérias desta turma antes de lançar notas.</Alert>;
  }
  if (!activeInscricoes.length) {
    return <Alert severity="info">Nenhum aluno ativo nesta turma.</Alert>;
  }

  return (
    <Box>
      <TextField size="small" placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ minWidth: 220, mb: 2 }} />

      {/* Barra de ação */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          {hasDirty && (
            <Typography variant="caption" color="warning.main" fontWeight={500}>
              Alterações não salvas
            </Typography>
          )}
          {feedback && !hasDirty && (
            <Typography variant="caption" color="success.main" fontWeight={500}>
              {feedback}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={saveAll} disabled={saving}
          color={hasDirty ? 'warning' : 'primary'}
        >
          Salvar Todas as Notas
        </Button>
      </Box>

      {/* Legenda */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={0.5}>
          <Chip size="small" label="A" color="success" sx={{ minWidth: 28, fontSize: 11 }} />
          <Typography variant="caption" color="text.secondary">Aprovado</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Chip size="small" label="R" color="error" sx={{ minWidth: 28, fontSize: 11 }} />
          <Typography variant="caption" color="text.secondary">Reprovado</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">— = não definido · Clique no chip para alternar</Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 400 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>Aluno</TableCell>
              {turmaMaterias.map(tm => (
                <TableCell key={tm.id} align="center" sx={{ fontWeight: 600, minWidth: 130, whiteSpace: 'nowrap' }}>
                  {tm.materia?.nome || '?'}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {activeInscricoes.map((insc, rowIdx) => {
              const nome = insc.membro ? (insc.membro.fullName) : insc.nomeNaoMembro;
              return (
                <TableRow key={insc.id} sx={{ bgcolor: rowIdx % 2 === 0 ? 'white' : 'grey.50' }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500} noWrap>{nome}</Typography>
                    <Chip size="small" label={STATUS_CHIP[insc.status]?.label || insc.status} color={STATUS_CHIP[insc.status]?.color} sx={{ mt: 0.25, height: 16, fontSize: 10 }} />
                  </TableCell>
                  {turmaMaterias.map(tm => {
                    const key = `${insc.id}:${tm.id}`;
                    const cell = localNotas[key] || {};
                    const isDirty = !!dirtyKeys[key];
                    const isSaved = !!savedKeys[key];
                    const { aprovado } = cell;
                    return (
                      <TableCell key={tm.id} align="center" sx={{
                        outline: isDirty ? '2px solid' : isSaved ? '1px solid' : 'none',
                        outlineColor: isDirty ? 'warning.main' : 'success.main',
                        borderRadius: 1,
                        transition: 'outline 0.2s',
                      }}>
                        <Box display="flex" flexDirection="column" alignItems="center" gap={0.75}>
                          <TextField
                            size="small" type="number"
                            value={cell.nota ?? ''}
                            onChange={(e) => setCell(insc.id, tm.id, 'nota', e.target.value)}
                            inputProps={{ min: 0, max: 10, step: 0.5 }}
                            sx={{ width: 72 }}
                            placeholder="0–10"
                          />
                          <Tooltip title={aprovado === true ? 'Aprovado — clique para Reprovado' : aprovado === false ? 'Reprovado — clique para limpar' : 'Não definido — clique para Aprovado'}>
                            <Chip
                              size="small"
                              label={aprovado === true ? 'A' : aprovado === false ? 'R' : '—'}
                              color={aprovado === true ? 'success' : aprovado === false ? 'error' : 'default'}
                              onClick={() => toggleAprovado(insc.id, tm.id)}
                              sx={{ minWidth: 36, cursor: 'pointer', fontWeight: 600 }}
                            />
                          </Tooltip>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── ABA: MENSALIDADES ──────────────────────────────────────────────────────

const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function formatMes(competencia) {
  const [year, month] = competencia.split('-');
  return `${MESES_NOMES[parseInt(month, 10) - 1]}/${year.slice(2)}`;
}

function MensalidadesTab({ turmaId, turma, onError }) {
  const [dados, setDados] = useState({ meses: [], inscricoes: [] });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pagDialog, setPagDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState('');
  const [busca, setBusca] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setDados(await api.listarMensalidades(turmaId)); } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setLoading(false); }
  }, [turmaId]);

  useEffect(() => { load(); }, [load]);

  const gerar = async () => {
    if (!window.confirm('Gerar mensalidades para todos os alunos ativos baseado no período da turma?')) return;
    setGenerating(true);
    try {
      const r = await api.gerarMensalidades(turmaId);
      setInfo(`${r.criadas} mensalidades geradas para ${r.totalAlunos} alunos (${r.totalMeses} meses)`);
      await load();
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setGenerating(false); }
  };

  const salvarPagamento = async () => {
    setSaving(true);
    try {
      await api.registrarPagamentoMensalidade(pagDialog.mensalidadeId, { pago: pagDialog.pago, dataPagamento: pagDialog.dataPagamento });
      setPagDialog(null);
      await load();
    } catch (e) { onError(e.response?.data?.erro || e.message); } finally { setSaving(false); }
  };

  const temDatas = turma.periodoInicio && turma.periodoFim;
  const inscricoesFiltradas = dados.inscricoes.filter((i) => !busca || i.nome?.toLowerCase().includes(busca.toLowerCase()));

  return (
    <Box>
      {info && <Alert severity="success" onClose={() => setInfo('')} sx={{ mb: 2 }}>{info}</Alert>}

      <Box display="flex" gap={2} mb={2} alignItems="center" flexWrap="wrap">
        <TextField size="small" placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ minWidth: 220 }} />
        {temDatas ? (
          <Button variant="outlined" startIcon={generating ? <CircularProgress size={16} /> : <AutorenewIcon />}
            onClick={gerar} disabled={generating}>
            Completar Mensalidades ({formatarData(turma.periodoInicio)} → {formatarData(turma.periodoFim)})
          </Button>
        ) : (
          <Alert severity="info" sx={{ flex: 1 }}>Configure as datas de início e fim da turma para gerar mensalidades automaticamente.</Alert>
        )}
      </Box>

      {loading ? <CircularProgress size={24} /> : inscricoesFiltradas.length === 0 ? (
        <Alert severity="info">{busca ? 'Nenhum aluno encontrado.' : 'Nenhum aluno inscrito ou mensalidades ainda não geradas. Use o botão acima para gerar.'}</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 400 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{
                  fontWeight: 600, minWidth: 160, position: 'sticky', left: 0, bgcolor: 'grey.50', zIndex: 2
                }}>
                  Aluno
                </TableCell>
                {dados.meses.map((mes) => (
                  <TableCell key={mes} align="center" sx={{ fontWeight: 600, minWidth: 88, whiteSpace: 'nowrap' }}>
                    {formatMes(mes)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {inscricoesFiltradas.map((insc, rowIdx) => (
                <TableRow key={insc.inscricaoId} sx={{ bgcolor: rowIdx % 2 === 0 ? 'white' : 'grey.50' }}>
                  <TableCell sx={{
                    position: 'sticky', left: 0, bgcolor: rowIdx % 2 === 0 ? 'white' : 'grey.50', zIndex: 1
                  }}>
                    <Typography variant="body2" fontWeight={500} noWrap>{insc.nome}</Typography>
                    <Chip size="small" label={STATUS_CHIP[insc.status]?.label || insc.status} color={STATUS_CHIP[insc.status]?.color} sx={{ mt: 0.25, height: 16, fontSize: 10 }} />
                  </TableCell>
                  {dados.meses.map((mes) => {
                    const m = insc.mensalidades[mes];
                    if (!m) return <TableCell key={mes} align="center"><Typography variant="caption" color="text.disabled">—</Typography></TableCell>;
                    return (
                      <TableCell key={mes} align="center">
                        <Tooltip title={m.pago ? `Pago em ${formatarData(m.dataPagamento) || '?'}` : 'Pendente — clique para registrar pagamento'}>
                          <Chip
                            size="small"
                            label={m.pago ? '✓ Pago' : 'Pend.'}
                            color={m.pago ? 'success' : 'warning'}
                            onClick={() => setPagDialog({
                              mensalidadeId: m.id, competencia: mes, nomeAluno: insc.nome, pago: m.pago, dataPagamento: m.dataPagamento || new Date().toISOString().slice(0, 10)
                            })}
                            sx={{ cursor: 'pointer', fontSize: 11 }}
                          />
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {pagDialog && (
        <Dialog open onClose={() => setPagDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Mensalidade — {formatMes(pagDialog.competencia)}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" mb={2}>{pagDialog.nomeAluno}</Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={pagDialog.pago ? 'pago' : 'pendente'} label="Status"
                  onChange={(e) => setPagDialog((d) => ({ ...d, pago: e.target.value === 'pago' }))}>
                  <MenuItem value="pago">Pago</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                </Select>
              </FormControl>
              {pagDialog.pago && (
                <TextField label="Data do Pagamento" type="date" value={pagDialog.dataPagamento}
                  onChange={(e) => setPagDialog((d) => ({ ...d, dataPagamento: e.target.value }))}
                  InputLabelProps={{ shrink: true }} fullWidth />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPagDialog(null)}>Cancelar</Button>
            <Button variant="contained" color={pagDialog.pago ? 'success' : 'warning'} onClick={salvarPagamento} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : pagDialog.pago ? 'Marcar como Pago' : 'Marcar como Pendente'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

// ─── ABA: PAINEL ─────────────────────────────────────────────────────────────

function PainelTab({ turmaId, onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    api.getPainel(turmaId)
      .then(setData)
      .catch(e => onError(e.response?.data?.erro || e.message))
      .finally(() => setLoading(false));
  }, [turmaId]);

  if (loading) return <CircularProgress size={24} />;
  if (!data) return null;

  const { alunos, turma } = data;
  const materias = turma.turmaMaterias || [];

  // Estatísticas resumo
  const totalAtivos = alunos.filter(a => ['ATIVO', 'PENDENTE', 'LISTA_ESPERA'].includes(a.status)).length;
  const totalMatriculados = alunos.filter(a => a.pagamentoMatricula).length;
  const totalAprovados = alunos.filter(a => a.status === 'CONCLUIDO' && a.aprovado === true).length;
  const totalReprovados = alunos.filter(a => a.status === 'REPROVADO' || (a.status === 'CONCLUIDO' && a.aprovado === false)).length;
  const totalConcluidos = alunos.filter(a => ['CONCLUIDO', 'REPROVADO'].includes(a.status)).length;

  const alunosFiltrados = alunos.filter(a => !busca || normalizar(a.nome).includes(normalizar(busca))
  );

  const STAT_CARDS = [
    { label: 'Total de alunos', value: alunos.length, color: 'text.primary' },
    { label: 'Ativos', value: totalAtivos, color: 'primary.main' },
    { label: 'Matriculados', value: totalMatriculados, color: 'success.main' },
    { label: 'Concluídos', value: totalConcluidos, color: 'info.main' },
    { label: 'Aprovados', value: totalAprovados, color: 'success.main' },
    { label: 'Reprovados', value: totalReprovados, color: 'error.main' },
  ];

  return (
    <Box>
      {/* Cards de resumo */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        {STAT_CARDS.map(card => (
          <Paper key={card.label} variant="outlined" sx={{
            p: 1.5, minWidth: 110, flex: '1 1 100px', textAlign: 'center', borderRadius: 2
          }}>
            <Typography variant="h5" fontWeight={700} color={card.color}>{card.value}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">{card.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Busca */}
      <TextField size="small" placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ minWidth: 220, mb: 2 }} />

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: materias.length > 0 ? 500 + materias.length * 160 : 400 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{
                fontWeight: 600, minWidth: 160, position: 'sticky', left: 0, bgcolor: 'grey.50', zIndex: 2
              }}>Aluno</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Matrícula</TableCell>
              {materias.map(tm => (
                <TableCell key={tm.id} align="center" sx={{ fontWeight: 600, minWidth: 150 }}>{tm.materia?.nome || '?'}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {alunosFiltrados.length === 0 && (
              <TableRow><TableCell colSpan={materias.length + 3} align="center">
                <Typography color="text.secondary" py={1}>{busca ? 'Nenhum aluno encontrado' : 'Nenhum aluno'}</Typography>
              </TableCell></TableRow>
            )}
            {alunosFiltrados.map((aluno, rowIdx) => {
              const st = STATUS_CHIP[aluno.status] || { label: aluno.status, color: 'default' };
              return (
                <TableRow key={aluno.inscricaoId} sx={{ bgcolor: rowIdx % 2 === 0 ? 'white' : 'grey.50' }}>
                  <TableCell sx={{
                    position: 'sticky', left: 0, bgcolor: rowIdx % 2 === 0 ? 'white' : 'grey.50', zIndex: 1
                  }}>
                    <Typography variant="body2" fontWeight={600}>{aluno.nome}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={st.label} color={st.color} />
                  </TableCell>
                  <TableCell>
                    {aluno.pagamentoMatricula
                      ? <Chip size="small" icon={<CheckCircleIcon />} label="Matriculado" color="success" />
                      : <Chip size="small" label="Aguardando" color="warning" variant="outlined" />}
                  </TableCell>
                  {(aluno.materias || []).map((m) => {
                    const pct = m.percentualPresenca;
                    const presColor = pct === null ? 'default' : pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'error';
                    const hasData = m.percentualPresenca !== null || m.nota !== null;
                    return (
                      <TableCell key={m.turmaMateriaId} align="center">
                        {!hasData ? (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        ) : (
                          <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                            {pct !== null && (
                              <Box width="100%">
                                <Box display="flex" justifyContent="space-between" mb={0.25}>
                                  <Typography variant="caption" color="text.secondary">{m.presentes}/{m.totalAulas} aulas</Typography>
                                  <Typography variant="caption" fontWeight={700} color={`${presColor}.main`}>{pct}%</Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate" value={pct}
                                  color={presColor}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>
                            )}
                            {m.nota !== null && (
                              <Typography variant="body2" fontWeight={700}>
                                Nota: {m.nota}
                              </Typography>
                            )}
                            {m.aprovadoMateria !== null && (
                              <Chip size="small" label={m.aprovadoMateria ? 'Aprovado' : 'Reprovado'} color={m.aprovadoMateria ? 'success' : 'error'} />
                            )}
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
