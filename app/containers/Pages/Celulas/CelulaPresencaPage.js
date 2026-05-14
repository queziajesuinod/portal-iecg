import React, {
  useCallback, useEffect, useRef, useState
} from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Avatar, Box, Button, Checkbox, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Tab,
  Tabs, TextField, Tooltip, Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { TableSkeleton } from '../../../components/Skeleton';
import { useConfirm } from '../../../utils/useConfirm';
import { formatDateInAppTimezone } from '../../../utils/dateTime';
import {
  listarReunioes,
  criarReuniaoManual,
  obterPresencaReuniao,
  registrarPresenca,
  adicionarPresencaAvulsa,
  cancelarReuniao,
  sugerirReunioes,
  confirmarReunioes,
  excluirReunioesAgendadas,
  excluirReuniao,
  listarMembrosVinculados,
  vincularMembro,
  desvincularMembro,
  buscarMembrosCandidatos,
  cadastrarEVincularMembro
} from '../../../api/celulaPresencaApi';

const STATUS_COLOR = {
  agendada: 'default', aberta: 'primary', encerrada: 'success', cancelada: 'error'
};
const STATUS_LABEL = {
  agendada: 'Agendada', aberta: 'Aberta', encerrada: 'Encerrada', cancelada: 'Cancelada'
};
const PAPEL_LABEL = {
  lider: 'Líder', auxiliar: 'Auxiliar', anfitria: 'Anfitriã', membro: 'Membro'
};
const PAPEL_OPTIONS = [
  { value: 'membro', label: 'Membro' },
  { value: 'auxiliar', label: 'Auxiliar' },
  { value: 'anfitria', label: 'Anfitriã' }
];

function inicialNome(nome) {
  return (nome || '?').charAt(0).toUpperCase();
}

function formatDataSugestao(data) {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

export default function CelulaPresencaPage() {
  const { celulaId } = useParams();
  const history = useHistory();
  const { confirm, ConfirmDialog } = useConfirm();
  const [tab, setTab] = useState(0);
  const [notification, setNotification] = useState('');

  // Reuniões
  const [reunioes, setReunioes] = useState([]);
  const [loadingReunioes, setLoadingReunioes] = useState(true);
  const [reuniaoAtiva, setReuniaoAtiva] = useState(null);

  // Presença da reunião ativa
  const [presencaData, setPresencaData] = useState(null);
  const [loadingPresenca, setLoadingPresenca] = useState(false);
  const [marcacoes, setMarcacoes] = useState({});
  const [salvando, setSalvando] = useState(false);

  // Membros
  const [membros, setMembros] = useState([]);
  const [loadingMembros, setLoadingMembros] = useState(true);

  // Dialog: sugestão de reuniões
  const [dialogReunioes, setDialogReunioes] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [selecionadas, setSelecionadas] = useState({});
  const [confirmandoReunioes, setConfirmandoReunioes] = useState(false);
  const [excluindoAgendadas, setExcluindoAgendadas] = useState(false);
  const [dataAvulsa, setDataAvulsa] = useState('');
  const [criandoAvulsa, setCriandoAvulsa] = useState(false);

  // Dialog: adicionar pessoa avulsa
  const [dialogAvulso, setDialogAvulso] = useState(false);
  const [formAvulso, setFormAvulso] = useState({
    nome: '', telefone: '', whatsapp: '', tipo: 'visitante'
  });

  // Dialog: cancelar reunião
  const [dialogCancelar, setDialogCancelar] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Dialog: adicionar membro
  const [dialogMembro, setDialogMembro] = useState(false);
  const [buscaMembro, setBuscaMembro] = useState('');
  const [candidatos, setCandidatos] = useState([]);
  const [loadingCandidatos, setLoadingCandidatos] = useState(false);
  const [membroSelecionado, setMembroSelecionado] = useState(null);
  const [papelNovo, setPapelNovo] = useState('membro');
  const [vinculando, setVinculando] = useState(false);
  const [modoCadastro, setModoCadastro] = useState(false);
  const [formNovo, setFormNovo] = useState({
    fullName: '', preferredName: '', phone: '', whatsapp: '', email: '', gender: '', birthDate: ''
  });
  const buscaTimer = useRef(null);

  const carregarReunioes = useCallback(async () => {
    setLoadingReunioes(true);
    try {
      const res = await listarReunioes(celulaId, { limit: 40 });
      setReunioes(res.reunioes || []);
    } catch (err) {
      setNotification(err.message);
    } finally {
      setLoadingReunioes(false);
    }
  }, [celulaId]);

  const carregarMembros = useCallback(async () => {
    setLoadingMembros(true);
    try {
      const res = await listarMembrosVinculados(celulaId);
      setMembros(res || []);
    } catch (err) {
      setNotification(err.message);
    } finally {
      setLoadingMembros(false);
    }
  }, [celulaId]);

  useEffect(() => {
    carregarReunioes();
    carregarMembros();
  }, [carregarReunioes, carregarMembros]);

  // ── Presença ────────────────────────────────────────────────────────────────

  const abrirPresenca = async (reuniao) => {
    setReuniaoAtiva(reuniao);
    setTab(1);
    setLoadingPresenca(true);
    try {
      const data = await obterPresencaReuniao(reuniao.id);
      setPresencaData(data);
      const init = {};
      (data.membros || []).forEach(m => { init[`m_${m.membroId}`] = m.presente; });
      (data.avulsos || []).forEach(a => { init[`a_${a.preCadastroId}`] = a.presente; });
      setMarcacoes(init);
    } catch (err) {
      setNotification(err.message);
    } finally {
      setLoadingPresenca(false);
    }
  };

  const handleSalvar = async () => {
    if (!reuniaoAtiva) return;
    const ok = await confirm({
      title: 'Encerrar reunião',
      message: 'Deseja registrar as presenças e encerrar esta reunião?',
      confirmText: 'Encerrar',
      confirmColor: 'primary'
    });
    if (!ok) return;

    setSalvando(true);
    try {
      const presencas = [];
      (presencaData?.membros || []).forEach(m => {
        presencas.push({ membroId: m.membroId, presente: marcacoes[`m_${m.membroId}`] ?? false });
      });
      (presencaData?.avulsos || []).forEach(a => {
        presencas.push({ preCadastroId: a.preCadastroId, presente: marcacoes[`a_${a.preCadastroId}`] ?? true });
      });

      await registrarPresenca(reuniaoAtiva.id, presencas);
      setNotification('Presença registrada com sucesso!');
      setTab(0);
      setReuniaoAtiva(null);
      carregarReunioes();
    } catch (err) {
      setNotification(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleAdicionarAvulso = async () => {
    if (!formAvulso.nome.trim()) { setNotification('Nome é obrigatório'); return; }
    try {
      await adicionarPresencaAvulsa(reuniaoAtiva.id, formAvulso);
      setNotification('Pessoa adicionada!');
      setDialogAvulso(false);
      setFormAvulso({
        nome: '', telefone: '', whatsapp: '', tipo: 'visitante'
      });
      const data = await obterPresencaReuniao(reuniaoAtiva.id);
      setPresencaData(data);
      data.avulsos.forEach(a => {
        setMarcacoes(prev => ({ ...prev, [`a_${a.preCadastroId}`]: true }));
      });
    } catch (err) {
      setNotification(err.message);
    }
  };

  const handleCancelarReuniao = async () => {
    if (!reuniaoAtiva) return;
    try {
      await cancelarReuniao(reuniaoAtiva.id, { motivo: motivoCancelamento });
      setNotification('Reunião cancelada');
      setDialogCancelar(false);
      setMotivoCancelamento('');
      setTab(0);
      setReuniaoAtiva(null);
      carregarReunioes();
    } catch (err) {
      setNotification(err.message);
    }
  };

  // ── Excluir reunião individual ─────────────────────────────────────────────

  const handleExcluirReuniao = async (r) => {
    const ok = await confirm({
      title: 'Excluir reunião',
      message: `Deseja excluir a reunião de ${formatDateInAppTimezone(r.data, '-')}? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      confirmColor: 'error'
    });
    if (!ok) return;
    try {
      await excluirReuniao(r.id);
      setNotification('Reunião excluída');
      carregarReunioes();
    } catch (err) {
      setNotification(err.message);
    }
  };

  // ── Sugestão de reuniões ────────────────────────────────────────────────────

  const handleAbrirDialogReunioes = async () => {
    setDialogReunioes(true);
    setLoadingSugestoes(true);
    setSugestoes([]);
    setSelecionadas({});
    try {
      const lista = await sugerirReunioes(celulaId, 8);
      setSugestoes(lista);
      // Pré-seleciona as que ainda não existem
      const init = {};
      lista.forEach((s, i) => { if (!s.existente) init[i] = true; });
      setSelecionadas(init);
    } catch (err) {
      setNotification(err.message);
      setDialogReunioes(false);
    } finally {
      setLoadingSugestoes(false);
    }
  };

  const handleConfirmarReunioes = async () => {
    const datasConfirmadas = sugestoes
      .filter((s, i) => selecionadas[i] && !s.existente)
      .map(s => new Date(s.data).toISOString());

    if (!datasConfirmadas.length) {
      setNotification('Nenhuma data nova selecionada');
      return;
    }

    setConfirmandoReunioes(true);
    try {
      const res = await confirmarReunioes(celulaId, datasConfirmadas);
      setNotification(res.mensagem);
      setDialogReunioes(false);
      carregarReunioes();
    } catch (err) {
      setNotification(err.message);
    } finally {
      setConfirmandoReunioes(false);
    }
  };

  const handleExcluirAgendadas = async () => {
    const ok = await confirm({
      title: 'Excluir reuniões agendadas',
      message: 'Isso irá remover todas as reuniões com status "Agendada" desta célula. Reuniões abertas ou encerradas não serão afetadas. Confirmar?',
      confirmText: 'Excluir',
      confirmColor: 'error'
    });
    if (!ok) return;

    setExcluindoAgendadas(true);
    try {
      const res = await excluirReunioesAgendadas(celulaId);
      setNotification(res.mensagem);
      setDialogReunioes(false);
      carregarReunioes();
    } catch (err) {
      setNotification(err.message);
    } finally {
      setExcluindoAgendadas(false);
    }
  };

  const handleCriarAvulsa = async () => {
    if (!dataAvulsa) { setNotification('Selecione uma data'); return; }
    setCriandoAvulsa(true);
    try {
      await criarReuniaoManual(celulaId, { data: dataAvulsa });
      setNotification('Reunião criada com sucesso!');
      setDataAvulsa('');
      setDialogReunioes(false);
      carregarReunioes();
    } catch (err) {
      setNotification(err.message);
    } finally {
      setCriandoAvulsa(false);
    }
  };

  // ── Adicionar / remover membros ────────────────────────────────────────────

  const handleBuscaMembro = (valor) => {
    setBuscaMembro(valor);
    clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(async () => {
      if (!valor.trim() && candidatos.length) return;
      setLoadingCandidatos(true);
      try {
        const res = await buscarMembrosCandidatos(celulaId, valor);
        setCandidatos(res);
      } catch (err) {
        setNotification(err.message);
      } finally {
        setLoadingCandidatos(false);
      }
    }, 350);
  };

  const handleAbrirDialogMembro = () => {
    setDialogMembro(true);
    setBuscaMembro('');
    setCandidatos([]);
    setMembroSelecionado(null);
    setPapelNovo('membro');
    setModoCadastro(false);
    setFormNovo({
      fullName: '', preferredName: '', phone: '', whatsapp: '', gender: ''
    });
    setLoadingCandidatos(true);
    buscarMembrosCandidatos(celulaId, '').then(res => setCandidatos(res)).catch(() => {}).finally(() => setLoadingCandidatos(false));
  };

  const handleCadastrarNovo = async () => {
    if (!formNovo.fullName.trim()) { setNotification('Nome completo é obrigatório'); return; }
    setVinculando(true);
    try {
      await cadastrarEVincularMembro(celulaId, { ...formNovo, papel: papelNovo });
      setNotification('Membro cadastrado e vinculado com sucesso!');
      setDialogMembro(false);
      carregarMembros();
    } catch (err) {
      setNotification(err.message);
    } finally {
      setVinculando(false);
    }
  };

  const handleVincularMembro = async () => {
    if (!membroSelecionado) { setNotification('Selecione um membro'); return; }
    setVinculando(true);
    try {
      await vincularMembro(celulaId, { membroId: membroSelecionado.id, papel: papelNovo });
      setNotification('Membro vinculado com sucesso!');
      setDialogMembro(false);
      carregarMembros();
    } catch (err) {
      setNotification(err.message);
    } finally {
      setVinculando(false);
    }
  };

  const handleDesvincular = async (vinculo) => {
    const nome = vinculo.membro?.preferredName || vinculo.membro?.fullName || 'este membro';
    const ok = await confirm({
      title: 'Desvincular membro',
      message: `Deseja desvincular ${nome} da célula?`,
      confirmText: 'Desvincular',
      confirmColor: 'error'
    });
    if (!ok) return;
    try {
      await desvincularMembro(celulaId, vinculo.membroId);
      setNotification('Membro desvinculado');
      carregarMembros();
    } catch (err) {
      setNotification(err.message);
    }
  };

  const totalPresentes = presencaData
    ? (presencaData.membros || []).filter(m => marcacoes[`m_${m.membroId}`]).length
      + (presencaData.avulsos || []).filter(a => marcacoes[`a_${a.preCadastroId}`] !== false).length
    : 0;
  const totalReuniao = presencaData
    ? (presencaData.membros || []).length + (presencaData.avulsos || []).length
    : 0;

  const novasSelecionadas = sugestoes.filter((s, i) => selecionadas[i] && !s.existente).length;

  return (
    <div>
      <Helmet><title>Presença de Célula - Portal IECG</title></Helmet>

      <PapperBlock
        title="Controle de Presença"
        icon="ion-ios-people-outline"
        desc="Registro de presença nas reuniões da célula"
        overflowX
      >
        <Stack direction="row" spacing={1} mb={2}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => history.goBack()} size="small">
            Voltar
          </Button>
          <Button
            variant="outlined"
            startIcon={<EventNoteIcon />}
            onClick={handleAbrirDialogReunioes}
            size="small"
          >
            Configurar reuniões
          </Button>
        </Stack>

        <Paper elevation={2} sx={{ mb: 2, bgcolor: 'grey.100' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontWeight: 700 } }}>
            <Tab label="Reuniões" />
            <Tab label={reuniaoAtiva ? `Presença — ${formatDateInAppTimezone(reuniaoAtiva.data, '-')}` : 'Presença'} disabled={!reuniaoAtiva} />
            <Tab label={`Membros (${membros.length})`} />
          </Tabs>
        </Paper>

        <Box p={1}>
          {/* ── Tab Reuniões ─────────────────────────────────────────────── */}
          {tab === 0 && (
            loadingReunioes ? <TableSkeleton cols={4} rows={6} showToolbar={false} /> : (
              <Stack spacing={1}>
                {reunioes.length === 0 && (
                  <Box py={4} textAlign="center">
                    <Typography variant="body2" color="textSecondary" mb={1}>
                      Nenhuma reunião cadastrada. Use &quot;Configurar reuniões&quot; para sugerir e criar as próximas.
                    </Typography>
                    <Button variant="contained" startIcon={<EventNoteIcon />} onClick={handleAbrirDialogReunioes} size="small">
                      Configurar reuniões
                    </Button>
                  </Box>
                )}
                {reunioes.map(r => (
                  <Paper key={r.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {formatDateInAppTimezone(r.data, '-')}
                        </Typography>
                        <Stack direction="row" spacing={1} mt={0.5}>
                          <Chip size="small" label={STATUS_LABEL[r.status]} color={STATUS_COLOR[r.status]} />
                          <Chip size="small" label={r.origem === 'automatica' ? 'Auto' : 'Manual'} variant="outlined" />
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {(r.status === 'aberta' || r.status === 'encerrada') && (
                          <Button
                            size="small"
                            variant={r.status === 'aberta' ? 'contained' : 'outlined'}
                            onClick={() => abrirPresenca(r)}
                          >
                            {r.status === 'aberta' ? 'Registrar presença' : 'Ver presença'}
                          </Button>
                        )}
                        {r.status === 'aberta' && (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => { setReuniaoAtiva(r); setDialogCancelar(true); }}
                          >
                            Cancelar
                          </Button>
                        )}
                        {r.status !== 'encerrada' && (
                          <Tooltip title="Excluir reunião">
                            <IconButton size="small" color="error" onClick={() => handleExcluirReuniao(r)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )
          )}

          {/* ── Tab Presença ──────────────────────────────────────────────── */}
          {tab === 1 && reuniaoAtiva && (
            <Box>
              {loadingPresenca ? <TableSkeleton cols={3} rows={6} showToolbar={false} /> : (
                <>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {totalPresentes} / {totalReuniao} presentes
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {reuniaoAtiva.status !== 'encerrada' && (
                        <Button
                          size="small"
                          startIcon={<PersonAddIcon />}
                          variant="outlined"
                          onClick={() => setDialogAvulso(true)}
                        >
                          Adicionar pessoa
                        </Button>
                      )}
                      {reuniaoAtiva.status !== 'encerrada' && (
                        <Button size="small" variant="contained" onClick={handleSalvar} disabled={salvando}>
                          {salvando ? 'Salvando...' : 'Encerrar reunião'}
                        </Button>
                      )}
                    </Stack>
                  </Stack>

                  <Stack spacing={1}>
                    {(presencaData?.membros || []).map(m => {
                      const presente = marcacoes[`m_${m.membroId}`];
                      const podeEditar = reuniaoAtiva.status !== 'encerrada';
                      return (
                        <Paper
                          key={m.membroId}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            borderColor: presente === true ? 'success.main' : presente === false ? 'error.light' : 'divider',
                            bgcolor: presente === true ? 'success.50' : 'transparent'
                          }}
                        >
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{
                                width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14
                              }}>
                                {m.fotoUrl ? <img src={m.fotoUrl} alt={m.nome} style={{ width: '100%' }} /> : inicialNome(m.nome)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">{m.nome}</Typography>
                                <Chip size="small" label={PAPEL_LABEL[m.papel] || m.papel} variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                              </Box>
                            </Stack>
                            {podeEditar ? (
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Presente">
                                  <IconButton
                                    size="small"
                                    color={presente === true ? 'success' : 'default'}
                                    onClick={() => setMarcacoes(prev => ({ ...prev, [`m_${m.membroId}`]: true }))}
                                  >
                                    <CheckCircleIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Faltou">
                                  <IconButton
                                    size="small"
                                    color={presente === false ? 'error' : 'default'}
                                    onClick={() => setMarcacoes(prev => ({ ...prev, [`m_${m.membroId}`]: false }))}
                                  >
                                    <CancelIcon />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Chip
                                size="small"
                                label={presente === true ? 'Presente' : presente === false ? 'Faltou' : '—'}
                                color={presente === true ? 'success' : presente === false ? 'error' : 'default'}
                              />
                            )}
                          </Stack>
                        </Paper>
                      );
                    })}

                    {(presencaData?.avulsos || []).length > 0 && (
                      <>
                        <Divider sx={{ my: 1 }}><Typography variant="caption">Visitantes / Novos</Typography></Divider>
                        {(presencaData?.avulsos || []).map(a => (
                          <Paper key={a.preCadastroId} variant="outlined" sx={{ p: 1.5, borderColor: 'warning.main' }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{
                                  width: 36, height: 36, bgcolor: 'warning.main', fontSize: 14
                                }}>
                                  {inicialNome(a.nome)}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2">{a.nome}</Typography>
                                  <Chip size="small" label={a.tipoPessoa === 'novo_integrante' ? 'Novo integrante' : 'Visitante'} color="warning" sx={{ fontSize: 10, height: 18 }} />
                                </Box>
                              </Stack>
                              <Chip size="small" label="Presente" color="success" />
                            </Stack>
                          </Paper>
                        ))}
                      </>
                    )}
                  </Stack>
                </>
              )}
            </Box>
          )}

          {/* ── Tab Membros ───────────────────────────────────────────────── */}
          {tab === 2 && (
            loadingMembros ? <TableSkeleton cols={3} rows={5} showToolbar={false} /> : (
              <Box>
                <Box mb={2} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    size="small"
                    onClick={handleAbrirDialogMembro}
                  >
                    Adicionar membro
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  {membros.map(v => (
                    <Grid item xs={12} sm={6} md={4} key={v.id}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Avatar sx={{
                            width: 40, height: 40, bgcolor: 'primary.main', mt: 0.5
                          }}>
                            {inicialNome(v.membro?.preferredName || v.membro?.fullName)}
                          </Avatar>
                          <Box flex={1} minWidth={0}>
                            <Typography variant="subtitle2" noWrap>
                              {v.membro?.preferredName || v.membro?.fullName}
                            </Typography>
                            <Stack direction="row" spacing={0.5} mt={0.25} flexWrap="wrap">
                              <Chip size="small" label={PAPEL_LABEL[v.papel] || v.papel} variant="outlined" sx={{ fontSize: 10 }} />
                              <Chip size="small" label={v.origem} variant="outlined" sx={{ fontSize: 10 }} />
                            </Stack>
                            <Typography variant="caption" color="textSecondary">
                              Desde: {formatDateInAppTimezone(v.dataEntrada, '-')}
                            </Typography>
                          </Box>
                          {v.papel !== 'lider' && (
                            <Tooltip title="Desvincular">
                              <IconButton size="small" color="error" onClick={() => handleDesvincular(v)}>
                                <PersonRemoveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                  {membros.length === 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">
                        Nenhum membro vinculado. Use &quot;Adicionar membro&quot; para vincular.
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )
          )}
        </Box>
      </PapperBlock>

      {/* ── Dialog: configurar reuniões ────────────────────────────────────── */}
      <Dialog open={dialogReunioes} onClose={() => setDialogReunioes(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configurar reuniões semanais</DialogTitle>
        <DialogContent>
          {loadingSugestoes ? (
            <Box py={4} display="flex" justifyContent="center"><CircularProgress /></Box>
          ) : sugestoes.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              A célula não possui dia e horário configurados. Configure primeiro no cadastro da célula.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2, mt: 0.5 }}>
                Selecione as semanas que deseja criar. Datas já existentes estão indicadas e não podem ser duplicadas.
              </Typography>
              <Stack spacing={0.5}>
                {sugestoes.map((s, i) => (
                  <Box
                    key={i}
                    display="flex"
                    alignItems="center"
                    gap={1}
                    px={1}
                    py={0.5}
                    sx={{
                      borderRadius: 1,
                      bgcolor: s.existente ? 'action.hover' : 'transparent',
                      opacity: s.existente ? 0.7 : 1
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={!!selecionadas[i]}
                      disabled={s.existente}
                      onChange={e => setSelecionadas(prev => ({ ...prev, [i]: e.target.checked }))}
                    />
                    <Typography variant="body2" flex={1} sx={{ textTransform: 'capitalize' }}>
                      {formatDataSugestao(s.data)}
                    </Typography>
                    {s.existente && (
                      <Chip
                        size="small"
                        label={STATUS_LABEL[s.statusExistente] || 'Existente'}
                        color={STATUS_COLOR[s.statusExistente] || 'default'}
                        variant="outlined"
                        sx={{ fontSize: 10 }}
                      />
                    )}
                  </Box>
                ))}
              </Stack>
            </>
          )}

          {!loadingSugestoes && (
            <>
              <Divider sx={{ mt: 2, mb: 1.5 }} />
              <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                Criar reunião em outro dia
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  type="date"
                  size="small"
                  value={dataAvulsa}
                  onChange={e => setDataAvulsa(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleCriarAvulsa}
                  disabled={!dataAvulsa || criandoAvulsa}
                >
                  {criandoAvulsa ? 'Criando...' : 'Criar'}
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            color="error"
            startIcon={excluindoAgendadas ? <CircularProgress size={14} /> : <DeleteOutlineIcon />}
            onClick={handleExcluirAgendadas}
            disabled={excluindoAgendadas}
            size="small"
          >
            Excluir agendadas
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setDialogReunioes(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleConfirmarReunioes}
              disabled={confirmandoReunioes || novasSelecionadas === 0 || loadingSugestoes}
            >
              {confirmandoReunioes ? 'Criando...' : `Criar ${novasSelecionadas > 0 ? `(${novasSelecionadas})` : ''}`}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: adicionar pessoa avulsa ──────────────────────────────────── */}
      <Dialog open={dialogAvulso} onClose={() => setDialogAvulso(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Adicionar visitante / novo integrante</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth required label="Nome" value={formAvulso.nome} onChange={e => setFormAvulso(p => ({ ...p, nome: e.target.value }))} />
            <TextField fullWidth label="Telefone" value={formAvulso.telefone} onChange={e => setFormAvulso(p => ({ ...p, telefone: e.target.value }))} />
            <TextField fullWidth label="WhatsApp" value={formAvulso.whatsapp} onChange={e => setFormAvulso(p => ({ ...p, whatsapp: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select value={formAvulso.tipo} label="Tipo" onChange={e => setFormAvulso(p => ({ ...p, tipo: e.target.value }))}>
                <MenuItem value="visitante">Visitante</MenuItem>
                <MenuItem value="novo_integrante">Novo integrante</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAvulso(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAdicionarAvulso}>Adicionar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: cancelar reunião ─────────────────────────────────────────── */}
      <Dialog open={dialogCancelar} onClose={() => setDialogCancelar(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancelar reunião</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo (opcional)"
            value={motivoCancelamento}
            onChange={e => setMotivoCancelamento(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogCancelar(false)}>Voltar</Button>
          <Button variant="contained" color="error" onClick={handleCancelarReuniao}>Confirmar cancelamento</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: adicionar membro ─────────────────────────────────────────── */}
      <Dialog open={dialogMembro} onClose={() => setDialogMembro(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {modoCadastro ? 'Cadastrar novo membro' : 'Adicionar membro à célula'}
        </DialogTitle>
        <DialogContent>
          {!modoCadastro ? (
            <Stack spacing={2} mt={1}>
              <TextField
                fullWidth
                label="Buscar por nome"
                value={buscaMembro}
                onChange={e => handleBuscaMembro(e.target.value)}
                InputProps={{
                  endAdornment: loadingCandidatos ? <CircularProgress size={18} /> : null
                }}
              />
              <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
                {candidatos.length === 0 && !loadingCandidatos && (
                  <Box textAlign="center" py={2}>
                    <Typography variant="body2" color="textSecondary" mb={1}>
                      {buscaMembro ? 'Nenhum membro encontrado' : 'Digite o nome para buscar'}
                    </Typography>
                    {buscaMembro && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PersonAddIcon />}
                        onClick={() => {
                          setModoCadastro(true);
                          setFormNovo(p => ({
                            ...p, fullName: buscaMembro, preferredName: '', phone: '', whatsapp: '', email: '', gender: '', birthDate: ''
                          }));
                        }}
                      >
                        Cadastrar &quot;{buscaMembro}&quot; como novo membro
                      </Button>
                    )}
                  </Box>
                )}
                <Stack spacing={0.5}>
                  {candidatos.map(c => (
                    <Box
                      key={c.id}
                      onClick={() => setMembroSelecionado(c)}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: membroSelecionado?.id === c.id ? 'primary.main' : 'divider',
                        bgcolor: membroSelecionado?.id === c.id ? 'primary.50' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{
                          width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 13
                        }}>
                          {inicialNome(c.preferredName || c.fullName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {c.preferredName || c.fullName}
                          </Typography>
                          {c.phone && (
                            <Typography variant="caption" color="textSecondary">{c.phone}</Typography>
                          )}
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {membroSelecionado && (
                <FormControl fullWidth size="small">
                  <InputLabel>Papel na célula</InputLabel>
                  <Select value={papelNovo} label="Papel na célula" onChange={e => setPapelNovo(e.target.value)}>
                    {PAPEL_OPTIONS.map(p => (
                      <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {candidatos.length > 0 && (
                <Box textAlign="center">
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<PersonAddIcon />}
                    onClick={() => setModoCadastro(true)}
                  >
                    Não encontrou? Cadastrar novo membro
                  </Button>
                </Box>
              )}
            </Stack>
          ) : (
            <Stack spacing={2} mt={1}>
              <Typography variant="body2" color="textSecondary">
                Preencha os dados mínimos. O membro poderá completar o cadastro depois.
              </Typography>
              <TextField
                fullWidth
                required
                label="Nome completo"
                value={formNovo.fullName}
                onChange={e => setFormNovo(p => ({ ...p, fullName: e.target.value }))}
              />
              <TextField
                fullWidth
                label="Como prefere ser chamado(a)"
                value={formNovo.preferredName}
                onChange={e => setFormNovo(p => ({ ...p, preferredName: e.target.value }))}
              />
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    value={formNovo.phone}
                    onChange={e => setFormNovo(p => ({ ...p, phone: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="WhatsApp"
                    value={formNovo.whatsapp}
                    onChange={e => setFormNovo(p => ({ ...p, whatsapp: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="email"
                    label="E-mail"
                    value={formNovo.email}
                    onChange={e => setFormNovo(p => ({ ...p, email: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Data de nascimento"
                    value={formNovo.birthDate}
                    onChange={e => setFormNovo(p => ({ ...p, birthDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              <FormControl fullWidth size="small">
                <InputLabel>Gênero</InputLabel>
                <Select value={formNovo.gender} label="Gênero" onChange={e => setFormNovo(p => ({ ...p, gender: e.target.value }))}>
                  <MenuItem value="">Não informado</MenuItem>
                  <MenuItem value="MASCULINO">Masculino</MenuItem>
                  <MenuItem value="FEMININO">Feminino</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Papel na célula</InputLabel>
                <Select value={papelNovo} label="Papel na célula" onChange={e => setPapelNovo(e.target.value)}>
                  {PAPEL_OPTIONS.map(p => (
                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {modoCadastro ? (
            <>
              <Button onClick={() => setModoCadastro(false)}>Voltar</Button>
              <Button
                variant="contained"
                onClick={handleCadastrarNovo}
                disabled={!formNovo.fullName.trim() || vinculando}
              >
                {vinculando ? 'Cadastrando...' : 'Cadastrar e vincular'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setDialogMembro(false)}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleVincularMembro}
                disabled={!membroSelecionado || vinculando}
              >
                {vinculando ? 'Vinculando...' : 'Vincular'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Notification message={notification} close={() => setNotification('')} />
      {ConfirmDialog}
    </div>
  );
}
