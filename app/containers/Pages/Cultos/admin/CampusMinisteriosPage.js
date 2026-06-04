import React, { useEffect, useState } from 'react';
import {
  Box, Button, Checkbox, CircularProgress, Divider, FormControlLabel,
  FormGroup, Grid, MenuItem, Paper, Select, Switch, Typography,
  FormControl, InputLabel, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, TextField, ToggleButton, ToggleButtonGroup,
  Tooltip, IconButton,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import SettingsIcon from '@mui/icons-material/Settings';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import PropTypes from 'prop-types';
import {
  listarVinculosPorCampus,
  salvarVinculos,
  atualizarConfiguracaoVinculo,
} from '../../../../api/cultosApi';
import { listarAreas, listarVoluntariados } from '../../../../api/voluntariadoApi';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const DIAS_SEMANA = [
  { valor: 0, label: 'Dom' },
  { valor: 1, label: 'Seg' },
  { valor: 2, label: 'Ter' },
  { valor: 3, label: 'Qua' },
  { valor: 4, label: 'Qui' },
  { valor: 5, label: 'Sex' },
  { valor: 6, label: 'Sáb' },
];

function DialogConfigurarVinculo({
  aberto, ministerio, campusId, onFechar, onSalvo
}) {
  const [diasPadrao, setDiasPadrao] = useState([]);
  const [horariosPadrao, setHorariosPadrao] = useState({});
  const [horariosPadraoHistorico, setHorariosPadraoHistorico] = useState([]);
  const [vigenteDe, setVigenteDe] = useState('');
  const [novaVigencia, setNovaVigencia] = useState(false);
  const [novoHorario, setNovoHorario] = useState({});
  const [responsavelMemberId, setResponsavelMemberId] = useState(null);
  const [validacaoAtiva, setValidacaoAtiva] = useState(false);
  const [membros, setMembros] = useState([]);
  const [buscaMembro, setBuscaMembro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregandoMembros, setCarregandoMembros] = useState(false);

  useEffect(() => {
    if (!aberto || !ministerio) return;
    setDiasPadrao(ministerio.diasPadrao || []);
    setHorariosPadrao(ministerio.horariosPadrao || {});
    setHorariosPadraoHistorico(ministerio.horariosPadraoHistorico || []);
    setVigenteDe(new Date().toISOString().slice(0, 10));
    setNovaVigencia(false);
    setNovoHorario({});
    setResponsavelMemberId(ministerio.responsavelMemberId || null);
    setValidacaoAtiva(ministerio.validacaoAtiva || false);
    setBuscaMembro('');
  }, [aberto, ministerio]);

  useEffect(() => {
    if (!aberto) return;
    setCarregandoMembros(true);
    listarAreas(true)
      .then((areas) => {
        const backstage = areas.find((a) => a.nome.toUpperCase() === 'BACKSTAGE');
        if (!backstage) return [];
        return listarVoluntariados({ areaVoluntariadoId: backstage.id, status: 'APROVADO' });
      })
      .then((voluntariados) => {
        const membrosUnicos = [];
        const ids = new Set();
        (voluntariados || []).forEach((v) => {
          if (v.membro && !ids.has(v.membro.id)) {
            ids.add(v.membro.id);
            membrosUnicos.push(v.membro);
          }
        });
        setMembros(membrosUnicos);
      })
      .catch(() => setMembros([]))
      .finally(() => setCarregandoMembros(false));
  }, [aberto]);

  const handleDiaToggle = (_, novosDias) => {
    setDiasPadrao(novosDias.map(Number));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await atualizarConfiguracaoVinculo(campusId, ministerio.id, {
        diasPadrao,
        horariosPadrao,
        horariosPadraoHistorico,
        vigenteDe: novaVigencia ? vigenteDe : null,
        novaVigencia,
        responsavelMemberId,
        validacaoAtiva,
      });
      onSalvo();
      onFechar();
    } catch (err) {
      // erro tratado pelo caller
    } finally {
      setSalvando(false);
    }
  };

  const membroSelecionado = membros.find((m) => m.id === responsavelMemberId) || null;

  return (
    <Dialog open={aberto} onClose={onFechar} maxWidth="sm" fullWidth>
      <DialogTitle>
        Configurar: {ministerio?.nome}
      </DialogTitle>
      <DialogContent>
        <Box sx={{
          mt: 1, display: 'flex', flexDirection: 'column', gap: 3
        }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Dias padrão de culto
            </Typography>
            <ToggleButtonGroup
              value={diasPadrao}
              onChange={handleDiaToggle}
              size="small"
              sx={{ flexWrap: 'wrap', gap: 0.5 }}
            >
              {DIAS_SEMANA.map((d) => (
                <ToggleButton key={d.valor} value={d.valor} selected={diasPadrao.includes(d.valor)}>
                  {d.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Selecione os dias em que o culto ocorre regularmente neste ministério
            </Typography>
          </Box>

          {/* Horários esperados por dia */}
          {diasPadrao.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Horários esperados por dia
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Configure os horários esperados por dia. Ao salvar, uma nova vigência é criada — registros anteriores à data de início não são cobrados pelos novos horários.
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
                <FormControlLabel
                  control={<Switch checked={novaVigencia} onChange={(e) => setNovaVigencia(e.target.checked)} size="small" />}
                  label={<Typography variant="body2">Nova vigência</Typography>}
                />
                {novaVigencia && (
                  <TextField
                    size="small"
                    type="date"
                    label="Válido a partir de"
                    InputLabelProps={{ shrink: true }}
                    value={vigenteDe}
                    onChange={(e) => setVigenteDe(e.target.value)}
                    sx={{ width: 190 }}
                  />
                )}
                {!novaVigencia && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Edita a vigência atual sem criar histórico
                  </Typography>
                )}
                <Tooltip title="Remove todos os horários e apaga o histórico">
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => {
                      setHorariosPadrao({});
                      setHorariosPadraoHistorico([]);
                      setNovoHorario({});
                      setNovaVigencia(false);
                    }}
                  >
                    Limpar tudo
                  </Button>
                </Tooltip>
              </Box>
              {diasPadrao.slice().sort((a, b) => a - b).map((dia) => {
                const key = String(dia);
                const horariosNoDia = horariosPadrao[key] || [];
                const nomeDia = DIAS_SEMANA.find((d) => d.valor === dia)?.label || dia;
                return (
                  <Box key={dia} sx={{
                    mb: 1.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1
                  }}>
                    <Typography variant="caption" fontWeight={700} color="primary">{nomeDia}</Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5} mb={1}>
                      {horariosNoDia.length === 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Sem horários configurados — só verifica presença do dia
                        </Typography>
                      )}
                      {horariosNoDia.map((h) => (
                        <Chip
                          key={h}
                          label={h}
                          size="small"
                          onDelete={() => {
                            const novos = horariosNoDia.filter((x) => x !== h);
                            setHorariosPadrao((prev) => ({ ...prev, [key]: novos }));
                          }}
                        />
                      ))}
                    </Box>
                    <Box display="flex" gap={1} alignItems="center">
                      <TextField
                        size="small"
                        type="time"
                        value={novoHorario[key] || ''}
                        onChange={(e) => setNovoHorario((prev) => ({ ...prev, [key]: e.target.value }))}
                        inputProps={{ step: 1800 }}
                        sx={{ width: 130 }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!novoHorario[key]}
                        onClick={() => {
                          const h = novoHorario[key];
                          if (!h || horariosNoDia.includes(h)) return;
                          const sorted = [...horariosNoDia, h].sort();
                          setHorariosPadrao((prev) => ({ ...prev, [key]: sorted }));
                          setNovoHorario((prev) => ({ ...prev, [key]: '' }));
                        }}
                      >
                        Adicionar
                      </Button>
                    </Box>
                  </Box>
                );
              })}

              {/* Histórico de vigências */}
              {horariosPadraoHistorico.filter((v) => v.vigenteAte != null).length > 0 && (
                <Box mt={1.5}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Vigências anteriores</Typography>
                  {horariosPadraoHistorico
                    .filter((v) => v.vigenteAte != null)
                    .sort((a, b) => b.vigenteDe.localeCompare(a.vigenteDe))
                    .map((v) => (
                      <Box key={v.vigenteDe} sx={{
                        mt: 0.5, p: 1, bgcolor: 'grey.50', borderRadius: 1
                      }}>
                        <Typography variant="caption" color="text.secondary">
                          {v.vigenteDe} → {v.vigenteAte} — {Object.entries(v.config || {}).map(([dia, hrs]) => `${DIAS_SEMANA.find((d) => String(d.valor) === dia)?.label}: ${hrs.join(', ')}`).join(' | ')}
                        </Typography>
                      </Box>
                    ))}
                </Box>
              )}
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Responsável pelo ministério
            </Typography>
            <Autocomplete
              options={membros}
              loading={carregandoMembros}
              value={membroSelecionado}
              onChange={(_, novo) => setResponsavelMemberId(novo?.id || null)}
              inputValue={buscaMembro}
              onInputChange={(_, v) => setBuscaMembro(v)}
              getOptionLabel={(m) => m.preferredName || m.fullName || ''}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar voluntário Backstage"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {carregandoMembros ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, m) => (
                <li {...props} key={m.id}>
                  <Box>
                    <Typography variant="body2">{m.preferredName || m.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.whatsapp || m.phone || 'Sem WhatsApp cadastrado'}
                    </Typography>
                  </Box>
                </li>
              )}
              noOptionsText="Nenhum voluntário Backstage aprovado encontrado"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Apenas voluntários Backstage aprovados são listados. O responsável receberá notificações via WhatsApp sobre cultos não registrados.
            </Typography>
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={validacaoAtiva}
                  onChange={(e) => setValidacaoAtiva(e.target.checked)}
                />
              }
              label="Validação automática ativa"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              Quando ativo, o sistema notificará automaticamente toda segunda-feira sobre cultos não registrados
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onFechar} disabled={salvando}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSalvar}
          disabled={salvando}
          startIcon={salvando ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Salvar configuração
        </Button>
      </DialogActions>
    </Dialog>
  );
}

DialogConfigurarVinculo.propTypes = {
  aberto: PropTypes.bool.isRequired,
  ministerio: PropTypes.shape({
    id: PropTypes.string,
    nome: PropTypes.string,
    diasPadrao: PropTypes.arrayOf(PropTypes.number),
    horariosPadrao: PropTypes.object,
    horariosPadraoHistorico: PropTypes.arrayOf(PropTypes.object),
    responsavelMemberId: PropTypes.string,
    validacaoAtiva: PropTypes.bool,
  }),
  campusId: PropTypes.string.isRequired,
  onFechar: PropTypes.func.isRequired,
  onSalvo: PropTypes.func.isRequired,
};

DialogConfigurarVinculo.defaultProps = {
  ministerio: null,
};

const CampusMinisteriosPage = () => {
  const [campi, setCampi] = useState([]);
  const [campusId, setCampusId] = useState('');
  const [dadosCampus, setDadosCampus] = useState(null);
  const [selecionados, setSelecionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCampus, setLoadingCampus] = useState(false);
  const [notification, setNotification] = useState('');
  const [transmiteOnline, setTransmiteOnline] = useState(false);
  const [savingOnline, setSavingOnline] = useState(false);
  const [dialogMinisterio, setDialogMinisterio] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/start/campus`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setCampi(Array.isArray(data) ? data : []))
      .catch(() => setNotification('Erro ao carregar campi'));
  }, []);

  const carregarDadosCampus = async (id) => {
    if (!id) return;
    setLoadingCampus(true);
    try {
      const dados = await listarVinculosPorCampus(id);
      setDadosCampus(dados);
      setTransmiteOnline(dados.campus?.transmiteOnline || false);
      setSelecionados(dados.ministerios.filter((m) => m.vinculado).map((m) => m.id));
    } catch (err) {
      setNotification(err.message || 'Erro ao carregar dados do campus');
    } finally {
      setLoadingCampus(false);
    }
  };

  const handleCampusChange = async (e) => {
    const id = e.target.value;
    setCampusId(id);
    setDadosCampus(null);
    setSelecionados([]);
    await carregarDadosCampus(id);
  };

  const handleCheck = (ministerioId) => {
    setSelecionados((prev) => (prev.includes(ministerioId)
      ? prev.filter((id) => id !== ministerioId)
      : [...prev, ministerioId])
    );
  };

  const handleSalvarVinculos = async () => {
    setLoading(true);
    try {
      await salvarVinculos(campusId, selecionados);
      setNotification('Vínculos salvos com sucesso!');
      await carregarDadosCampus(campusId);
    } catch (err) {
      setNotification(err.message || 'Erro ao salvar vínculos');
    } finally {
      setLoading(false);
    }
  };

  const handleTransmiteOnline = async (e) => {
    const valor = e.target.checked;
    setTransmiteOnline(valor);
    setSavingOnline(true);
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/start/campus/${campusId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ transmiteOnline: valor }),
      });
      setNotification(`Campus ${valor ? 'habilitado' : 'desabilitado'} para transmissão online`);
    } catch {
      setNotification('Erro ao atualizar transmissão online');
      setTransmiteOnline(!valor);
    } finally {
      setSavingOnline(false);
    }
  };

  const handleAbrirConfig = (ministerio) => {
    setDialogMinisterio(ministerio);
  };

  const handleSalvoConfig = async () => {
    setNotification('Configuração salva com sucesso!');
    await carregarDadosCampus(campusId);
  };

  return (
    <div>
      <Helmet><title>Vínculos Campus × Ministério</title></Helmet>
      <PapperBlock
        title="Vínculos Campus × Ministério"
        icon="ion-ios-git-network-outline"
        desc="Defina quais ministérios estão disponíveis em cada campus e configure dias padrão de culto"
      >
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Selecione um campus</InputLabel>
          <Select value={campusId} label="Selecione um campus" onChange={handleCampusChange}>
            <MenuItem value="">— Selecione —</MenuItem>
            {campi.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
          </Select>
        </FormControl>

        {loadingCampus && <Box display="flex" justifyContent="center" my={3}><CircularProgress /></Box>}

        {dadosCampus && !loadingCampus && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Transmissão online */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Configuração do campus
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={transmiteOnline}
                      onChange={handleTransmiteOnline}
                      disabled={savingOnline}
                    />
                  }
                  label="Transmite online (exibe campo de audiência online no formulário)"
                />
                {dadosCampus.campus?.transmiteOnline !== transmiteOnline && (
                  <Chip label="Salvo" size="small" color="success" sx={{ ml: 1 }} />
                )}
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Ministérios */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Ministérios disponíveis neste campus
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Marque os ministérios ativos e use o ícone de configuração para definir dias padrão e responsável
                </Typography>
                <FormGroup>
                  <Grid container spacing={1}>
                    {dadosCampus.ministerios.map((m) => {
                      const vinculado = selecionados.includes(m.id);
                      const temConfig = vinculado && (m.diasPadrao?.length > 0 || m.responsavelMemberId);
                      return (
                        <Grid item xs={12} sm={6} md={4} key={m.id}>
                          <Box
                            display="flex"
                            alignItems="center"
                            sx={{
                              border: 1,
                              borderColor: temConfig ? 'primary.light' : 'divider',
                              borderRadius: 1,
                              px: 1,
                              py: 0.5,
                              bgcolor: temConfig ? 'primary.50' : 'transparent',
                            }}
                          >
                            <FormControlLabel
                              sx={{ flex: 1, mr: 0 }}
                              control={
                                <Checkbox
                                  checked={vinculado}
                                  onChange={() => handleCheck(m.id)}
                                  size="small"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2">{m.nome}</Typography>
                                  {vinculado && m.diasPadrao?.length > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                      {m.diasPadrao.map((d) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                            {vinculado && (
                              <Tooltip title="Configurar dias padrão e responsável">
                                <IconButton size="small" onClick={() => handleAbrirConfig(m)}>
                                  <SettingsIcon fontSize="small" color={temConfig ? 'primary' : 'action'} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </FormGroup>
              </Grid>

              <Grid item xs={12}>
                <Button variant="contained" onClick={handleSalvarVinculos} disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : 'Salvar vínculos'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {notification && <Notification message={notification} onClose={() => setNotification('')} />}

        {dialogMinisterio && (
          <DialogConfigurarVinculo
            aberto={!!dialogMinisterio}
            ministerio={dialogMinisterio}
            campusId={campusId}
            onFechar={() => setDialogMinisterio(null)}
            onSalvo={handleSalvoConfig}
          />
        )}
      </PapperBlock>
    </div>
  );
};

export default CampusMinisteriosPage;
