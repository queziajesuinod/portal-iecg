import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Chip, CircularProgress, Collapse, Divider,
  FormControl, Grid, IconButton, InputLabel, MenuItem,
  Paper, Select, Tooltip, Typography, Alert,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import PropTypes from 'prop-types';
import BlockIcon from '@mui/icons-material/Block';
import UndoIcon from '@mui/icons-material/Undo';
import {
  verificarValidacao, notificarMinisterio, notificarTodosMinisterios, justificarAusencia, removerJustificativa
} from '../../../api/cultosApi';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatarData(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function CardMinisterio({
  item, onNotificar, notificando, onJustificar, onRemoverJustificativa,
}) {
  const [expandido, setExpandido] = useState(false);
  const temAusentes = item.datasAusentes.length > 0;
  const totalEsperado = item.datasEsperadas.length;
  const totalRegistrado = item.datasRegistradas.length;
  const totalJustificado = Object.keys(item.datasJustificadas || {}).length;

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        borderLeft: 4,
        borderColor: temAusentes ? 'error.main' : 'success.main',
        p: 2,
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {temAusentes
            ? <ErrorIcon color="error" />
            : <CheckCircleIcon color="success" />}
          <Box>
            <Typography fontWeight={600}>{item.ministerio?.nome}</Typography>
            {item.diasPadrao?.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Padrão: {item.diasPadrao.map((d) => DIAS_SEMANA[d]).join(', ')}
              </Typography>
            )}
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          {totalEsperado > 0 ? (
            <>
              <Chip
                size="small"
                label={`${totalRegistrado}/${totalEsperado} registrados`}
                color={temAusentes ? 'error' : 'success'}
                variant="outlined"
              />
              {totalJustificado > 0 && (
                <Chip
                  size="small"
                  icon={<BlockIcon fontSize="small" />}
                  label={`${totalJustificado} sem culto`}
                  color="default"
                  variant="outlined"
                />
              )}
            </>
          ) : (
            <Chip size="small" label="Sem dias padrão configurados" color="default" variant="outlined" />
          )}

          {item.responsavel ? (
            <Chip
              size="small"
              icon={<WhatsAppIcon fontSize="small" />}
              label={item.responsavel.preferredName || item.responsavel.fullName}
              color="default"
              variant="outlined"
            />
          ) : (
            <Chip size="small" label="Sem responsável" color="warning" variant="outlined" />
          )}

          {temAusentes && item.responsavel && (
            <Tooltip title="Notificar responsável via WhatsApp">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={notificando ? <CircularProgress size={14} color="inherit" /> : <WhatsAppIcon />}
                  disabled={notificando}
                  onClick={() => onNotificar(item.ministerio.id)}
                >
                  Notificar
                </Button>
              </span>
            </Tooltip>
          )}

          {totalEsperado > 0 && (
            <IconButton size="small" onClick={() => setExpandido((v) => !v)}>
              {expandido ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>
      </Box>

      <Collapse in={expandido}>
        <Divider sx={{ my: 1.5 }} />
        <Grid container spacing={1}>
          {item.datasEsperadas.map((data) => {
            const registrada = item.datasRegistradas.includes(data);
            const justificada = data in (item.datasJustificadas || {});
            const motivo = item.datasJustificadas?.[data];

            if (registrada) {
              return (
                <Grid item key={data}>
                  <Chip
                    size="small"
                    label={formatarData(data)}
                    color="success"
                    variant="filled"
                    icon={<CheckCircleIcon />}
                  />
                </Grid>
              );
            }

            if (justificada) {
              return (
                <Grid item key={data}>
                  <Tooltip title={motivo ? `Motivo: ${motivo}` : 'Sem culto (justificado)'}>
                    <Chip
                      size="small"
                      label={formatarData(data)}
                      color="default"
                      variant="outlined"
                      icon={<BlockIcon />}
                      onDelete={() => onRemoverJustificativa(item.ministerio.id, data)}
                      deleteIcon={<Tooltip title="Desfazer"><UndoIcon /></Tooltip>}
                    />
                  </Tooltip>
                </Grid>
              );
            }

            return (
              <Grid item key={data}>
                <Tooltip title="Clique para marcar que não teve culto nesta data">
                  <Chip
                    size="small"
                    label={formatarData(data)}
                    color="error"
                    variant="outlined"
                    icon={<ErrorIcon />}
                    onClick={() => onJustificar(item.ministerio.id, data)}
                  />
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
        {item.datasAusentes.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Clique numa data vermelha para marcar como &quot;não teve culto&quot;
          </Typography>
        )}
      </Collapse>
    </Paper>
  );
}

CardMinisterio.propTypes = {
  item: PropTypes.shape({
    ministerio: PropTypes.shape({ id: PropTypes.string, nome: PropTypes.string }),
    diasPadrao: PropTypes.arrayOf(PropTypes.number),
    datasEsperadas: PropTypes.arrayOf(PropTypes.string),
    datasRegistradas: PropTypes.arrayOf(PropTypes.string),
    datasAusentes: PropTypes.arrayOf(PropTypes.string),
    datasJustificadas: PropTypes.objectOf(PropTypes.string),
    responsavel: PropTypes.shape({
      preferredName: PropTypes.string,
      fullName: PropTypes.string,
    }),
  }).isRequired,
  onNotificar: PropTypes.func.isRequired,
  onJustificar: PropTypes.func.isRequired,
  onRemoverJustificativa: PropTypes.func.isRequired,
  notificando: PropTypes.bool,
};

CardMinisterio.defaultProps = {
  notificando: false,
};

const ValidacaoMinisterioPage = () => {
  const agora = new Date();
  const [campi, setCampi] = useState([]);
  const [campusId, setCampusId] = useState('');
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [ano, setAno] = useState(agora.getFullYear());
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notificando, setNotificando] = useState(null);
  const [notificandoTodos, setNotificandoTodos] = useState(false);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/start/campus`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setCampi(Array.isArray(data) ? data : []))
      .catch(() => setNotification('Erro ao carregar campi'));
  }, []);

  const handleVerificar = useCallback(async () => {
    if (!campusId) return;
    setLoading(true);
    try {
      const dados = await verificarValidacao({ campusId, mes, ano });
      setResultados(Array.isArray(dados) ? dados : []);
    } catch (err) {
      setNotification(err.message || 'Erro ao verificar validação');
    } finally {
      setLoading(false);
    }
  }, [campusId, mes, ano]);

  const handleNotificar = async (ministerioId) => {
    setNotificando(ministerioId);
    try {
      const res = await notificarMinisterio({
        campusId, ministerioId, mes, ano
      });
      if (res.enviado) {
        setNotification(`Notificação enviada para ${res.responsavel} (${res.datasAusentes.length} data(s) ausente(s))`);
      } else {
        setNotification(res.motivo || res.erro || 'Não foi possível enviar a notificação');
      }
    } catch (err) {
      setNotification(err.message || 'Erro ao enviar notificação');
    } finally {
      setNotificando(null);
    }
  };

  const handleJustificar = async (ministerioId, data) => {
    try {
      await justificarAusencia({ campusId, ministerioId, data });
      await handleVerificar();
    } catch (err) {
      setNotification(err.message || 'Erro ao justificar ausência');
    }
  };

  const handleRemoverJustificativa = async (ministerioId, data) => {
    try {
      await removerJustificativa({ campusId, ministerioId, data });
      await handleVerificar();
    } catch (err) {
      setNotification(err.message || 'Erro ao remover justificativa');
    }
  };

  const handleNotificarTodos = async () => {
    setNotificandoTodos(true);
    try {
      const res = await notificarTodosMinisterios({ mes, ano });
      const enviados = res.filter((r) => r.enviado).length;
      const falhas = res.filter((r) => !r.enviado).length;
      setNotification(`Notificações enviadas: ${enviados} | Falhas: ${falhas}`);
    } catch (err) {
      setNotification(err.message || 'Erro ao enviar notificações');
    } finally {
      setNotificandoTodos(false);
    }
  };

  const anosDisponiveis = Array.from({ length: 3 }, (_, i) => agora.getFullYear() - 1 + i);

  const comAusentes = resultados.filter((r) => r.datasAusentes.length > 0);
  const semAusentes = resultados.filter((r) => r.datasAusentes.length === 0 && r.datasEsperadas.length > 0);
  const semConfiguracao = resultados.filter((r) => r.diasPadrao?.length === 0);

  return (
    <div>
      <Helmet><title>Validação de Cultos</title></Helmet>
      <PapperBlock
        title="Validação de Cultos"
        icon="ion-ios-checkmark-circle-outline"
        desc="Verifique quais ministérios possuem cultos não registrados e notifique os responsáveis"
      >
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Campus</InputLabel>
                <Select
                  value={campusId}
                  label="Campus"
                  onChange={(e) => { setCampusId(e.target.value); setResultados([]); }}
                >
                  <MenuItem value="">— Selecione —</MenuItem>
                  {campi.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Mês</InputLabel>
                <Select value={mes} label="Mês" onChange={(e) => setMes(e.target.value)}>
                  {MESES.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Ano</InputLabel>
                <Select value={ano} label="Ano" onChange={(e) => setAno(e.target.value)}>
                  {anosDisponiveis.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleVerificar}
                disabled={!campusId || loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                Verificar
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {resultados.length > 0 && (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip icon={<ErrorIcon />} label={`${comAusentes.length} com pendências`} color="error" variant="outlined" />
                <Chip icon={<CheckCircleIcon />} label={`${semAusentes.length} em dia`} color="success" variant="outlined" />
                {semConfiguracao.length > 0 && (
                  <Chip label={`${semConfiguracao.length} sem dias padrão`} color="default" variant="outlined" />
                )}
              </Box>

              {comAusentes.some((r) => r.responsavel && r.validacaoAtiva) && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={notificandoTodos ? <CircularProgress size={16} color="inherit" /> : <NotificationsActiveIcon />}
                  disabled={notificandoTodos}
                  onClick={handleNotificarTodos}
                >
                  Notificar todos (automático)
                </Button>
              )}
            </Box>

            {comAusentes.length > 0 && (
              <>
                <Typography variant="subtitle2" color="error" gutterBottom sx={{ mt: 1 }}>
                  Com cultos ausentes
                </Typography>
                {comAusentes.map((item) => (
                  <CardMinisterio
                    key={item.ministerio?.id}
                    item={item}
                    onNotificar={handleNotificar}
                    onJustificar={handleJustificar}
                    onRemoverJustificativa={handleRemoverJustificativa}
                    notificando={notificando === item.ministerio?.id}
                  />
                ))}
              </>
            )}

            {semAusentes.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  Em dia
                </Typography>
                {semAusentes.map((item) => (
                  <CardMinisterio
                    key={item.ministerio?.id}
                    item={item}
                    onNotificar={handleNotificar}
                    onJustificar={handleJustificar}
                    onRemoverJustificativa={handleRemoverJustificativa}
                    notificando={notificando === item.ministerio?.id}
                  />
                ))}
              </>
            )}

            {semConfiguracao.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Alert severity="info" sx={{ mb: 1 }}>
                  Os ministérios abaixo não possuem dias padrão configurados. Configure-os em Vínculos Campus × Ministério.
                </Alert>
                {semConfiguracao.map((item) => (
                  <CardMinisterio
                    key={item.ministerio?.id}
                    item={item}
                    onNotificar={handleNotificar}
                    onJustificar={handleJustificar}
                    onRemoverJustificativa={handleRemoverJustificativa}
                    notificando={notificando === item.ministerio?.id}
                  />
                ))}
              </>
            )}
          </>
        )}

        {notification && (
          <Notification message={notification} onClose={() => setNotification('')} />
        )}
      </PapperBlock>
    </div>
  );
};

export default ValidacaoMinisterioPage;
