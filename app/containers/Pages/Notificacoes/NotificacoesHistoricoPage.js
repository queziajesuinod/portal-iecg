import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Chip, Pagination, Paper, Table, TableBody, TableCell,
  TableContainer, TableFooter, TableHead, TableRow, Toolbar, Typography
} from '@mui/material';
import { Helmet } from 'react-helmet';
import Notification from 'dan-components/Notification/Notification';
import { TableSkeleton } from '../../../components/Skeleton';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const STATUS_CHIP = {
  pending: { label: 'Pendente', color: 'default' },
  sent: { label: 'Enviado', color: 'info' },
  delivered: { label: 'Entregue', color: 'success' },
  read: { label: 'Lido', color: 'success' },
  failed: { label: 'Falhou', color: 'error' }
};

const SOURCE_LABELS = {
  member: 'Membro',
  registration: 'Inscrição',
  apelo: 'Apelo',
  lider_apelo: 'Líder',
  voluntario: 'Voluntário',
  individual: 'Individual'
};

export default function NotificacoesHistoricoPage() {
  const { id: campaignId } = useParams();
  const [campanha, setCampanha] = useState(null);
  const [destinatarios, setDestinatarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('token');

  const fetchCampanha = async () => {
    const res = await fetch(`${API_URL}/api/admin/notificacoes/campanhas/${campaignId}`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    if (res.ok) setCampanha(await res.json());
  };

  const fetchDestinatarios = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, perPage: 20 });
      if (filterStatus) params.append('status', filterStatus);
      const res = await fetch(`${API_URL}/api/admin/notificacoes/campanhas/${campaignId}/destinatarios?${params}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      setDestinatarios(data.recipients || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setNotification('Erro ao carregar destinatários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampanha(); }, [campaignId]);
  useEffect(() => { fetchDestinatarios(); }, [campaignId, page, filterStatus]);

  const contadores = destinatarios.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <Helmet><title>Histórico de Destinatários</title></Helmet>
      <Toolbar>
        <Box flex={1}>
          <Typography variant="h6">{campanha?.name || 'Histórico'}</Typography>
          {campanha && (
            <Typography variant="caption" color="textSecondary">
              Canal: {campanha.channel} | Status: {campanha.status} | Total: {campanha.totalRecipients ?? '-'}
              {campanha.totalSent != null && ` | Enviados: ${campanha.totalSent} | Falhas: ${campanha.totalFailed}`}
            </Typography>
          )}
        </Box>
      </Toolbar>

      <Box mb={2} display="flex" gap={1} flexWrap="wrap" px={2}>
        {Object.entries(STATUS_CHIP).map(([key, cfg]) => (
          <Chip
            key={key}
            label={`${cfg.label}: ${contadores[key] || 0}`}
            color={cfg.color}
            size="small"
            variant={filterStatus === key ? 'filled' : 'outlined'}
            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>

      {loading ? (
        <TableSkeleton cols={6} rows={5} showToolbar={false} />
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Contato</TableCell>
                  <TableCell>Origem</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Enviado em</TableCell>
                  <TableCell>Erro</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {destinatarios.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">Nenhum destinatário encontrado.</TableCell></TableRow>
                )}
                {destinatarios.map((d) => {
                  const cfg = STATUS_CHIP[d.status] || { label: d.status, color: 'default' };
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{d.name || '-'}</TableCell>
                      <TableCell>{d.contact}</TableCell>
                      <TableCell>{SOURCE_LABELS[d.sourceType] || d.sourceType}</TableCell>
                      <TableCell><Chip size="small" label={cfg.label} color={cfg.color} /></TableCell>
                      <TableCell>{d.sentAt ? new Date(d.sentAt).toLocaleString('pt-BR') : '-'}</TableCell>
                      <TableCell>{d.errorMessage || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} align="right">Total: {total}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
          <Box mt={2} display="flex" justifyContent="center">
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
          </Box>
        </>
      )}

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
}
