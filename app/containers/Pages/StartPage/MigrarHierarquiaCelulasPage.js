import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Box, Paper, Stack, Typography, Button, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  Autocomplete, TextField, LinearProgress, Tooltip, Checkbox
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Notification, PapperBlock } from 'dan-components';
import { useHistory } from 'react-router-dom';
import { fetchWithAuth } from 'utils/authSession';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};
const API_URL = resolveApiUrl();

const scoreColor = (score) => {
  if (score >= 0.95) return 'success';
  if (score >= 0.7) return 'primary';
  return 'default';
};

const MigrarHierarquiaCelulasPage = () => {
  const history = useHistory();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState('');
  const [notifType, setNotifType] = useState('success');

  // selecoes do usuario: { [celulaId]: liderancaMemberId }
  const [selecoes, setSelecoes] = useState({});

  const notify = (msg, type = 'success') => {
    setNotification(msg);
    setNotifType(type);
  };

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth(`${API_URL}/start/celula/lideranca-legada`);
      const lista = Array.isArray(data) ? data : [];
      setRows(lista);
      // pre-seleciona automaticamente quando ha um unico match com score 1
      const auto = {};
      lista.forEach((r) => {
        const fortes = (r.matches || []).filter((m) => m.score >= 1);
        if (fortes.length === 1) {
          auto[r.celulaId] = fortes[0].id;
        }
      });
      setSelecoes(auto);
    } catch (err) {
      notify(err.message || 'Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const itemsParaAplicar = useMemo(
    () => Object.entries(selecoes)
      .filter(([, liderancaMemberId]) => Boolean(liderancaMemberId))
      .map(([celulaId, liderancaMemberId]) => ({ celulaId, liderancaMemberId })),
    [selecoes]
  );

  const aplicar = async () => {
    if (itemsParaAplicar.length === 0) {
      notify('Selecione pelo menos uma célula', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetchWithAuth(`${API_URL}/start/celula/lideranca-legada/aplicar-lote`, {
        method: 'POST',
        body: JSON.stringify({ items: itemsParaAplicar })
      });
      const erros = Array.isArray(resp?.erros) ? resp.erros : [];
      if (erros.length > 0) {
        notify(`${resp.atualizadas} células atualizadas. ${erros.length} falharam.`, 'warning');
      } else {
        notify(`${resp.atualizadas} células atualizadas com sucesso!`);
      }
      await carregar();
    } catch (err) {
      notify(err.message || 'Erro ao aplicar lote', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const marcarTodasComMatchForte = () => {
    const next = { ...selecoes };
    rows.forEach((r) => {
      const fortes = (r.matches || []).filter((m) => m.score >= 1);
      if (fortes.length === 1 && !next[r.celulaId]) {
        next[r.celulaId] = fortes[0].id;
      }
    });
    setSelecoes(next);
  };

  const limparSelecao = () => setSelecoes({});

  return (
    <PapperBlock title="Migrar Liderança Apostólica das células" desc="Vincular o texto legado a membros com cargo de Liderança Apostólica">
      <Helmet><title>Migrar hierarquia das células</title></Helmet>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => history.push('/app/start/celulas')}>
          Voltar
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={carregar} disabled={loading}>
          Recarregar
        </Button>
        <Button variant="text" onClick={marcarTodasComMatchForte} disabled={loading}>
          Marcar matches exatos
        </Button>
        <Button variant="text" color="warning" onClick={limparSelecao} disabled={loading}>
          Limpar seleção
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveRoundedIcon />}
          onClick={aplicar}
          disabled={submitting || itemsParaAplicar.length === 0}
        >
          {submitting ? 'Aplicando…' : `Aplicar (${itemsParaAplicar.length})`}
        </Button>
      </Stack>

      <Paper variant="outlined">
        {(loading || submitting) && <LinearProgress />}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Célula</TableCell>
                <TableCell>Líder atual</TableCell>
                <TableCell>Texto legado &quot;Liderança&quot;</TableCell>
                <TableCell sx={{ minWidth: 320 }}>Vincular a (Liderança Apostólica)</TableCell>
                <TableCell>PdG / PdC (texto legado)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Nenhuma célula com Liderança legada para migrar.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const selectedId = selecoes[r.celulaId] || '';
                const selectedOption = (r.matches || []).find((m) => m.id === selectedId) || null;
                return (
                  <TableRow key={r.celulaId} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={Boolean(selectedId)}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            const next = { ...selecoes };
                            delete next[r.celulaId];
                            setSelecoes(next);
                          } else if (r.matches?.[0]) {
                            setSelecoes((prev) => ({ ...prev, [r.celulaId]: r.matches[0].id }));
                          }
                        }}
                        disabled={!r.matches?.length}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{r.celulaNome}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[r.rede, r.bairro, r.campus].filter(Boolean).join(' • ')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{r.lider || '-'}</TableCell>
                    <TableCell>
                      <Chip label={r.textoLideranca} size="small" />
                    </TableCell>
                    <TableCell>
                      {r.matches?.length > 0 ? (
                        <Autocomplete
                          size="small"
                          options={r.matches}
                          value={selectedOption}
                          getOptionLabel={(opt) => opt?.fullName || ''}
                          isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
                          onChange={(_evt, value) => {
                            setSelecoes((prev) => {
                              const next = { ...prev };
                              if (value) next[r.celulaId] = value.id;
                              else delete next[r.celulaId];
                              return next;
                            });
                          }}
                          renderOption={(props, option) => (
                            <li {...props} key={option.id}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                                <Typography variant="body2" sx={{ flex: 1 }}>{option.fullName}</Typography>
                                <Chip
                                  label={`${Math.round(option.score * 100)}%`}
                                  size="small"
                                  color={scoreColor(option.score)}
                                  variant="outlined"
                                />
                              </Stack>
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Selecione" />
                          )}
                        />
                      ) : (
                        <Tooltip title="Nenhum membro com Liderança Apostólica cujo primeiro nome bata">
                          <Typography variant="caption" color="text.disabled">— sem match —</Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="caption">PdG: {r.textoPastorGeracao || '—'}</Typography>
                        <Typography variant="caption">PdC: {r.textoPastorCampus || '—'}</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Notification open={!!notification} message={notification} type={notifType} close={() => setNotification('')} />
    </PapperBlock>
  );
};

export default MigrarHierarquiaCelulasPage;
