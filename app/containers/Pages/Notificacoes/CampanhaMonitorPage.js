import React, { useEffect, useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress,
  FormControl, Grid, IconButton, InputLabel, LinearProgress, MenuItem,
  Paper, Select, Tab, TablePagination, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Toolbar, Tooltip, Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SendIcon from '@mui/icons-material/Send';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
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

const RECIPIENT_STATUS_LABELS = {
  pending: 'Pendente',
  sent: 'Enviado',
  delivered: 'Entregue',
  read: 'Lido',
  failed: 'Falhou'
};

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

function WhatsAppStatusIcon({ status }) {
  switch (status) {
    case 'read':
      return (
        <Tooltip title="Lido">
          <DoneAllIcon sx={{ color: '#1976d2', fontSize: 18 }} />
        </Tooltip>
      );
    case 'delivered':
      return (
        <Tooltip title="Entregue">
          <DoneAllIcon sx={{ color: '#757575', fontSize: 18 }} />
        </Tooltip>
      );
    case 'sent':
      return (
        <Tooltip title="Enviado">
          <DoneIcon sx={{ color: '#757575', fontSize: 18 }} />
        </Tooltip>
      );
    case 'failed':
      return (
        <Tooltip title="Falhou">
          <CloseIcon sx={{ color: '#d32f2f', fontSize: 18 }} />
        </Tooltip>
      );
    default:
      return (
        <Tooltip title="Pendente">
          <AccessTimeIcon sx={{ color: '#9e9e9e', fontSize: 18 }} />
        </Tooltip>
      );
  }
}
WhatsAppStatusIcon.propTypes = { status: PropTypes.string };

function StatCard({
  icon, label, value, hex, highlight
}) {
  return (
    <Card
      elevation={highlight ? 3 : 1}
      sx={{ borderTop: `3px solid ${hex}`, transition: 'box-shadow 0.2s', height: '100%' }}
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
  const [activeTab, setActiveTab] = useState(0);

  // destinatários
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsTotal, setRecipientsTotal] = useState(0);
  const [recipientsPage, setRecipientsPage] = useState(0);
  const [recipientsPerPage] = useState(25);
  const [recipientsFilterStatus, setRecipientsFilterStatus] = useState('');

  const intervalRef = useRef(null);
  const recipientsInitialized = useRef(false);
  const token = () => localStorage.getItem('token');

  const fetchMonitor = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/notificacoes/campanhas/${id}/monitor`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) setData(await res.json());
    } catch {
      // silencioso
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  const fetchRecipients = async (page = recipientsPage, status = recipientsFilterStatus) => {
    setRecipientsLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, perPage: recipientsPerPage });
      if (status) params.set('status', status);
      const res = await fetch(`${API_URL}/api/admin/notificacoes/campanhas/${id}/destinatarios?${params}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) {
        const json = await res.json();
        setRecipients(json.recipients || []);
        setRecipientsTotal(json.total || 0);
      }
    } catch {
      // silencioso
    } finally {
      setRecipientsLoading(false);
    }
  };

  useEffect(() => { fetchMonitor(); }, [id]);

  // Auto-poll: 2s enquanto sending, 15s enquanto há "sent" aguardando ack
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!data) return () => clearInterval(intervalRef.current);

    const isSending = data.campaign?.status === 'sending';
    const hasPendingAck = (data.statusCounts?.sent || 0) > 0;

    if (isSending) {
      intervalRef.current = setInterval(() => fetchMonitor(), 2000);
    } else if (hasPendingAck) {
      intervalRef.current = setInterval(() => fetchMonitor(), 15000);
    }

    return () => clearInterval(intervalRef.current);
  }, [data?.campaign?.status, data?.statusCounts?.sent]);

  // Carregar destinatários na primeira carga de dados ou ao trocar para a aba
  useEffect(() => {
    if (data && activeTab === 0 && !recipientsInitialized.current) {
      recipientsInitialized.current = true;
      fetchRecipients(0, recipientsFilterStatus);
    }
  }, [data]);

  useEffect(() => {
    if (data && activeTab === 0) fetchRecipients(0, recipientsFilterStatus);
  }, [activeTab]);

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
  const hasPendingAck = (statusCounts.sent || 0) > 0 && !isSending;
  const progressColor = campaign.status === 'failed' ? 'error' : campaign.status === 'sent' ? 'success' : 'primary';

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
                '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.55 } }
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
        {(isSending || hasPendingAck) && (
          <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
            {isSending ? 'Atualizando a cada 2s…' : 'Aguardando confirmações (15s)…'}
          </Typography>
        )}
      </Toolbar>

      <Box px={2} pb={3} display="flex" flexDirection="column" gap={2.5}>

        {/* ── Progresso ── */}
        <Card elevation={2}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
              <Box position="relative" display="inline-flex" flexShrink={0}>
                <CircularProgress variant="determinate" value={100} size={96} thickness={4} sx={{ color: 'grey.200' }} />
                <CircularProgress variant="determinate" value={progress} size={96} thickness={4} color={progressColor} sx={{ position: 'absolute', top: 0, left: 0 }} />
                <Box sx={{
                  top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Typography variant="h5" fontWeight={700} lineHeight={1}>{progress}%</Typography>
                  <Typography variant="caption" color="textSecondary">progresso</Typography>
                </Box>
              </Box>
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
                <LinearProgress variant="determinate" value={progress} color={progressColor} sx={{ height: 12, borderRadius: 6, bgcolor: 'grey.200' }} />
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
            let value;
            if (key === 'total') {
              value = displayTotal;
            } else if (key === 'sent') {
              value = (statusCounts.sent || 0) + (statusCounts.delivered || 0) + (statusCounts.read || 0);
            } else if (key === 'delivered') {
              value = (statusCounts.delivered || 0) + (statusCounts.read || 0);
            } else {
              value = statusCounts[key] || 0;
            }
            return (
              <Grid item xs={6} sm={4} md={2} key={key}>
                <StatCard icon={icon} label={label} value={value} hex={hex} highlight={key === 'failed' && value > 0} />
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
                  <InfoItem icon={<AccessTimeIcon fontSize="small" />} label="Último envio" value={new Date(campaign.sentAt).toLocaleString('pt-BR')} />
                )}
                {campaign.nextRunAt && (
                  <InfoItem icon={<EventRepeatIcon fontSize="small" />} label="Próximo disparo" value={new Date(campaign.nextRunAt).toLocaleString('pt-BR')} color="primary.main" />
                )}
                {campaign.recurrencePeriodEnd && (
                  <InfoItem icon={<CalendarTodayIcon fontSize="small" />} label="Período até" value={new Date(campaign.recurrencePeriodEnd).toLocaleDateString('pt-BR')} />
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* ── Abas: Destinatários | Falhas ── */}
        {displayTotal > 0 && (
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                bgcolor: 'grey.100',
                borderBottom: 1,
                borderColor: 'divider',
                px: 1,
                '& .MuiTab-root': { fontWeight: 600, fontSize: '0.875rem', minHeight: 48 },
                '& .Mui-selected': { color: 'primary.main' }
              }}
            >
              <Tab label={`Destinatários (${displayTotal})`} />
              <Tab
                label={failures.length > 0 ? `Falhas (${failures.length})` : 'Falhas'}
                sx={failures.length > 0 ? { color: 'error.main', '&.Mui-selected': { color: 'error.main' } } : {}}
              />
            </Tabs>
            <Box p={2}>

              {/* ── Tab: Destinatários ── */}
              {activeTab === 0 && (
                <Box>
                  <Box display="flex" gap={1} alignItems="center" mb={1.5} flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Filtrar status</InputLabel>
                      <Select
                        value={recipientsFilterStatus}
                        label="Filtrar status"
                        onChange={(e) => {
                          setRecipientsFilterStatus(e.target.value);
                          setRecipientsPage(0);
                          fetchRecipients(0, e.target.value);
                        }}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {Object.entries(RECIPIENT_STATUS_LABELS).map(([k, v]) => (
                          <MenuItem key={k} value={k}>{v}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {recipientsLoading && <CircularProgress size={18} />}
                  </Box>

                  <Paper variant="outlined">
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: 36 }} />
                            <TableCell>Nome</TableCell>
                            <TableCell>Contato</TableCell>
                            <TableCell>Enviado</TableCell>
                            <TableCell>Entregue</TableCell>
                            <TableCell>Lido</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {recipients.length === 0 && !recipientsLoading && (
                            <TableRow>
                              <TableCell colSpan={6}>
                                <Typography variant="caption" color="textSecondary">
                                Nenhum destinatário encontrado.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {recipients.map((r) => (
                            <TableRow key={r.id} hover>
                              <TableCell>
                                <WhatsAppStatusIcon status={r.status} />
                              </TableCell>
                              <TableCell>
                                {r.name || <Typography variant="caption" color="textSecondary">—</Typography>}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontFamily="monospace">{r.contact}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="textSecondary">
                                  {r.sentAt ? new Date(r.sentAt).toLocaleString('pt-BR') : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="textSecondary">
                                  {r.deliveredAt ? new Date(r.deliveredAt).toLocaleString('pt-BR') : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color={r.readAt ? 'primary.main' : 'textSecondary'}>
                                  {r.readAt ? new Date(r.readAt).toLocaleString('pt-BR') : '—'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      component="div"
                      count={recipientsTotal}
                      page={recipientsPage}
                      rowsPerPage={recipientsPerPage}
                      rowsPerPageOptions={[recipientsPerPage]}
                      onPageChange={(_, newPage) => {
                        setRecipientsPage(newPage);
                        fetchRecipients(newPage, recipientsFilterStatus);
                      }}
                      labelDisplayedRows={({ from, to, count: c }) => `${from}–${to} de ${c}`}
                    />
                  </Paper>
                </Box>
              )}

              {/* ── Tab: Falhas ── */}
              {activeTab === 1 && (
                <Box>
                  {failures.length === 0 ? (
                    <Alert severity="success" icon={<MarkEmailReadIcon />}>
                    Nenhuma falha registrada. Todos os envios foram processados com sucesso.
                    </Alert>
                  ) : (
                    <>
                      <Alert severity="error" sx={{ mb: 1.5 }}>
                        <strong>{failures.length} envio{failures.length > 1 ? 's' : ''} com falha</strong>
                      </Alert>
                      <TableContainer component={Paper} variant="outlined">
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
                    </>
                  )}
                </Box>
              )}
            </Box>{/* fim Box p={2} */}
          </Paper>
        )}

        {displayTotal === 0 && !isSending && (
          <Alert severity="info">
            Nenhum destinatário processado ainda. Dispare a campanha para iniciar o envio.
          </Alert>
        )}
      </Box>
    </Box>
  );
}
