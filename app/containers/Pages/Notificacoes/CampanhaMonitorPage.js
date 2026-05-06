import React, { useEffect, useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress,
  Grid, IconButton, LinearProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Toolbar, Tooltip, Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SendIcon from '@mui/icons-material/Send';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const STATUS_CFG = {
  draft: { label: 'Rascunho', color: 'default', hex: '#9e9e9e' },
  scheduled: { label: 'Agendada', color: 'info', hex: '#0288d1' },
  sending: { label: 'Enviando…', color: 'warning', hex: '#f57c00' },
  sent: { label: 'Concluída', color: 'success', hex: '#388e3c' },
  failed: { label: 'Falhou', color: 'error', hex: '#d32f2f' },
  cancelled: { label: 'Cancelada', color: 'default', hex: '#9e9e9e' }
};

const STAT_DEFS = [
  {
    key: 'total', label: 'Total', icon: <PeopleAltIcon />, hex: '#5c6bc0'
  },
  {
    key: 'pending', label: 'Pendente', icon: <HourglassEmptyIcon />, hex: '#9e9e9e'
  },
  {
    key: 'sent', label: 'Enviado', icon: <SendIcon />, hex: '#0288d1'
  },
  {
    key: 'delivered', label: 'Entregue', icon: <DoneAllIcon />, hex: '#00897b'
  },
  {
    key: 'read', label: 'Lido', icon: <MarkEmailReadIcon />, hex: '#388e3c'
  },
  {
    key: 'failed', label: 'Falhou', icon: <ErrorOutlineIcon />, hex: '#d32f2f'
  }
];

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function recurrenceDesc(campaign) {
  const { recurrenceType, recurrenceDays, recurrenceTime } = campaign;
  if (!recurrenceType || recurrenceType === 'once') return null;
  const time = recurrenceTime || '';
  if (recurrenceType === 'daily') return `Repete diariamente às ${time}`;
  if (recurrenceType === 'weekly') {
    const days = (recurrenceDays || []).map((d) => DAYS_PT[d]).join(', ');
    return `Repete toda semana (${days || '?'}) às ${time}`;
  }
  if (recurrenceType === 'monthly') return `Repete no dia 1º de cada mês às ${time}`;
  return null;
}

function estimateRemaining(statusCounts, sendDelayMs) {
  const pending = statusCounts.pending || 0;
  if (!pending || !sendDelayMs) return null;
  const totalSec = Math.ceil((pending * sendDelayMs) / 1000);
  if (totalSec < 60) return `~${totalSec}s`;
  return `~${Math.ceil(totalSec / 60)}min`;
}

function StatCard({
  icon, label, value, hex, highlight
}) {
  return (
    <Card
      elevation={highlight ? 3 : 1}
      sx={{
        borderTop: `3px solid ${hex}`,
        transition: 'box-shadow 0.2s',
        height: '100%'
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 2, px: 1 }}>
        <Box sx={{
          color: hex, mb: 0.5, display: 'flex', justifyContent: 'center'
        }}>{icon}</Box>
        <Typography variant="h4" fontWeight={700} sx={{ color: hex, lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

StatCard.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  hex: PropTypes.string.isRequired,
  highlight: PropTypes.bool
};

function InfoItem({
  icon, label, value, color = 'textSecondary'
}) {
  return (
    <Box display="flex" alignItems="center" gap={0.75}>
      <Box sx={{ color: 'text.secondary', display: 'flex', fontSize: 16 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="textSecondary" display="block" lineHeight={1.2}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500} color={color}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

InfoItem.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  color: PropTypes.string
};

export default function CampanhaMonitorPage() {
  const { id } = useParams();
  const history = useHistory();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef(null);

  const token = () => localStorage.getItem('token');

  const fetchMonitor = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/notificacoes/campanhas/${id}/monitor`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) setData(await res.json());
    } catch {
      // silencioso — mantém dados anteriores
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  useEffect(() => { fetchMonitor(); }, [id]);

  useEffect(() => {
    if (data) {
      const isSending = data.campaign?.status === 'sending';
      if (isSending) {
        intervalRef.current = setInterval(() => fetchMonitor(), 2000);
      } else {
        clearInterval(intervalRef.current);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [data?.campaign?.status]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={300} gap={2}>
        <CircularProgress />
        <Typography color="textSecondary">Carregando monitor…</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p={3}>
        <Alert severity="error">Campanha não encontrada.</Alert>
      </Box>
    );
  }

  const {
    campaign, statusCounts, total, failures
  } = data;
  const processed = (statusCounts.sent || 0) + (statusCounts.failed || 0) + (statusCounts.delivered || 0) + (statusCounts.read || 0);
  const displayTotal = total || campaign.totalRecipients || 0;
  const progress = displayTotal > 0 ? Math.round((processed / displayTotal) * 100) : 0;
  const statusCfg = STATUS_CFG[campaign.status] || { label: campaign.status, color: 'default', hex: '#9e9e9e' };
  const recDesc = recurrenceDesc(campaign);
  const remaining = estimateRemaining(statusCounts, campaign.sendDelayMs);
  const isSending = campaign.status === 'sending';

  const progressColor = campaign.status === 'failed' ? 'error'
    : campaign.status === 'sent' ? 'success'
      : 'primary';

  return (
    <Box>
      <Helmet><title>Monitor — {campaign.name}</title></Helmet>

      {/* ── Header ── */}
      <Toolbar disableGutters sx={{ px: 2 }}>
        <Tooltip title="Voltar para Campanhas">
          <IconButton onClick={() => history.push('/app/notificacoes/campanhas')} size="small" sx={{ mr: 1.5 }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="h6" noWrap>{campaign.name}</Typography>
            <Chip
              size="small"
              label={statusCfg.label}
              color={statusCfg.color}
              sx={isSending ? {
                animation: 'pulse 1.4s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.55 }
                }
              } : {}}
            />
          </Box>
          {recDesc && (
            <Typography variant="caption" color="textSecondary">{recDesc}</Typography>
          )}
        </Box>
        <Tooltip title="Atualizar agora">
          <span>
            <IconButton onClick={() => fetchMonitor(true)} size="small" disabled={refreshing}>
              <RefreshIcon sx={refreshing ? { animation: 'spin 1s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } } : {}} />
            </IconButton>
          </span>
        </Tooltip>
        {isSending && (
          <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
            Atualizando…
          </Typography>
        )}
      </Toolbar>

      <Box px={2} pb={3} display="flex" flexDirection="column" gap={2.5}>

        {/* ── Progresso ── */}
        <Card elevation={2}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">

              {/* Círculo de progresso */}
              <Box position="relative" display="inline-flex" flexShrink={0}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={96}
                  thickness={4}
                  sx={{ color: 'grey.200' }}
                />
                <CircularProgress
                  variant="determinate"
                  value={progress}
                  size={96}
                  thickness={4}
                  color={progressColor}
                  sx={{ position: 'absolute', top: 0, left: 0 }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h5" fontWeight={700} lineHeight={1}>{progress}%</Typography>
                  <Typography variant="caption" color="textSecondary">progresso</Typography>
                </Box>
              </Box>

              {/* Detalhes */}
              <Box flex={1} minWidth={200}>
                <Box display="flex" justifyContent="space-between" mb={0.75}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>{processed}</strong> de <strong>{displayTotal || '?'}</strong> processados
                  </Typography>
                  {isSending && remaining && (
                    <Typography variant="body2" color="warning.main" fontWeight={500}>
                      Restante: {remaining}
                    </Typography>
                  )}
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  color={progressColor}
                  sx={{ height: 12, borderRadius: 6, bgcolor: 'grey.200' }}
                />
                {isSending && (
                  <Typography variant="caption" color="textSecondary" display="block" mt={0.75}>
                    Atualizando automaticamente a cada 2 segundos
                  </Typography>
                )}
                {campaign.status === 'sent' && (
                  <Alert severity="success" sx={{ mt: 1, py: 0 }}>
                    Campanha concluída com sucesso!
                  </Alert>
                )}
                {campaign.status === 'failed' && (
                  <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                    O disparo encontrou erros críticos.
                  </Alert>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* ── Stat cards ── */}
        <Grid container spacing={1.5}>
          {STAT_DEFS.map(({
            key, label, icon, hex
          }) => {
            const value = key === 'total' ? displayTotal : (statusCounts[key] || 0);
            return (
              <Grid item xs={6} sm={4} md={2} key={key}>
                <StatCard
                  icon={icon} label={label} value={value} hex={hex}
                  highlight={key === 'failed' && value > 0}
                />
              </Grid>
            );
          })}
        </Grid>

        {/* ── Informações extras ── */}
        {(campaign.sentAt || campaign.nextRunAt || campaign.recurrencePeriodEnd) && (
          <Card elevation={1}>
            <CardContent sx={{ py: '12px !important' }}>
              <Box display="flex" gap={4} flexWrap="wrap">
                {campaign.sentAt && (
                  <InfoItem
                    icon={<AccessTimeIcon fontSize="small" />}
                    label="Último envio"
                    value={new Date(campaign.sentAt).toLocaleString('pt-BR')}
                  />
                )}
                {campaign.nextRunAt && (
                  <InfoItem
                    icon={<EventRepeatIcon fontSize="small" />}
                    label="Próximo disparo"
                    value={new Date(campaign.nextRunAt).toLocaleString('pt-BR')}
                    color="primary.main"
                  />
                )}
                {campaign.recurrencePeriodEnd && (
                  <InfoItem
                    icon={<CalendarTodayIcon fontSize="small" />}
                    label="Período até"
                    value={new Date(campaign.recurrencePeriodEnd).toLocaleDateString('pt-BR')}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* ── Tabela de falhas ── */}
        {failures.length > 0 && (
          <Box>
            <Alert severity="error" sx={{ mb: 1.5 }}>
              <strong>{failures.length} envio{failures.length > 1 ? 's' : ''} com falha</strong>
            </Alert>
            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'error.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Contato</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Mensagem de erro</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Quando</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {failures.map((f) => (
                    <TableRow key={f.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>{f.name || <Typography variant="caption" color="textSecondary">—</Typography>}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">{f.contact}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="error.main">
                          {f.errorMessage || 'Erro desconhecido'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="textSecondary">
                          {f.updatedAt ? new Date(f.updatedAt).toLocaleString('pt-BR') : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Sem falhas ── */}
        {failures.length === 0 && campaign.status === 'sent' && (
          <Alert severity="success" icon={<MarkEmailReadIcon />}>
            Nenhuma falha registrada. Todos os envios foram processados com sucesso.
          </Alert>
        )}

        {/* ── Aguardando disparo ── */}
        {displayTotal === 0 && !isSending && (
          <Alert severity="info">
            Nenhum destinatário processado ainda. Dispare a campanha para iniciar o envio.
          </Alert>
        )}
      </Box>
    </Box>
  );
}
