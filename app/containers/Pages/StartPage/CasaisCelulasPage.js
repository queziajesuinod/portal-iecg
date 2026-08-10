import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Box, Paper, Stack, Typography, Button, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  LinearProgress, Checkbox, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import PropTypes from 'prop-types';
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
  if (score >= 1) return 'success';
  if (score >= 0.66) return 'primary';
  return 'default';
};

const MatchBadge = ({ ok, label }) => (
  <Chip
    size="small"
    variant={ok ? 'filled' : 'outlined'}
    color={ok ? 'success' : 'default'}
    icon={ok ? <CheckCircleRoundedIcon /> : <CancelRoundedIcon />}
    label={label}
    sx={{ '& .MuiChip-icon': { fontSize: 16 } }}
  />
);

MatchBadge.propTypes = {
  ok: PropTypes.bool,
  label: PropTypes.string.isRequired
};
MatchBadge.defaultProps = { ok: false };

const CelulaResumo = ({ celula }) => (
  <Box>
    <Typography variant="body2" fontWeight={600}>{celula.celula || '—'}</Typography>
    {celula.rede && (
      <Chip label={celula.rede} size="small" variant="outlined" sx={{ my: 0.25, height: 20 }} />
    )}
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      Líder: {celula.lider || '—'}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {[celula.endereco, celula.numero].filter(Boolean).join(', ') || 'Sem endereço'}
      {celula.bairro ? ` — ${celula.bairro}` : ''}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {[celula.dia, celula.horario].filter(Boolean).join(' • ') || 'Sem dia/horário'}
    </Typography>
  </Box>
);

CelulaResumo.propTypes = {
  celula: PropTypes.object.isRequired
};

const CasaisCelulasPage = () => {
  const history = useHistory();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState('');
  const [notifType, setNotifType] = useState('success');

  // ids das sugestões marcadas
  const [selecionadas, setSelecionadas] = useState([]);

  const notify = (msg, type = 'success') => {
    setNotification(msg);
    setNotifType(type);
  };

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth(`${API_URL}/start/celula/casais/sugestoes`);
      const lista = Array.isArray(data) ? data : [];
      setRows(lista);
      // Pré-seleciona automaticamente os pares perfeitos (endereço + dia + horário).
      setSelecionadas(lista.filter((r) => r.score >= 1).map((r) => r.id));
    } catch (err) {
      notify(err.message || 'Erro ao carregar sugestões', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  // Impede vincular a mesma célula em dois pares diferentes ao mesmo tempo.
  const usados = useMemo(() => {
    const mulheres = new Set();
    const homens = new Set();
    rows.forEach((r) => {
      if (selecionadas.includes(r.id)) {
        mulheres.add(r.mulheres.id);
        homens.add(r.homens.id);
      }
    });
    return { mulheres, homens };
  }, [rows, selecionadas]);

  const toggle = (sugestao, checked) => {
    setSelecionadas((prev) => {
      if (checked) return [...prev, sugestao.id];
      return prev.filter((id) => id !== sugestao.id);
    });
  };

  const itemsParaVincular = useMemo(
    () => rows
      .filter((r) => selecionadas.includes(r.id))
      .map((r) => ({ celulaMulheresId: r.mulheres.id, celulaHomensId: r.homens.id })),
    [rows, selecionadas]
  );

  const vincular = async () => {
    if (itemsParaVincular.length === 0) {
      notify('Selecione pelo menos um par de células', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetchWithAuth(`${API_URL}/start/celula/casais/vincular-lote`, {
        method: 'POST',
        body: JSON.stringify({ items: itemsParaVincular })
      });
      const erros = Array.isArray(resp?.erros) ? resp.erros : [];
      if (erros.length > 0) {
        notify(`${resp.vinculadas} pares vinculados. ${erros.length} falharam.`, 'warning');
      } else {
        notify(`${resp.vinculadas} células de casal vinculadas com sucesso!`);
      }
      await carregar();
    } catch (err) {
      notify(err.message || 'Erro ao vincular casais', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const marcarPerfeitos = () => {
    setSelecionadas(rows.filter((r) => r.score >= 1).map((r) => r.id));
  };
  const limpar = () => setSelecionadas([]);

  return (
    <PapperBlock
      title="Células de Casais"
      desc="Sugestões de vínculo entre redes de casal (Mulheres × Homens e Juventude Relevante Moças × Rapazes) com mesmo endereço. Confirme para marcar como célula de casal."
    >
      <Helmet><title>Células de Casais</title></Helmet>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => history.push('/app/start/celulas')}>
          Voltar
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={carregar} disabled={loading}>
          Recarregar
        </Button>
        <Button variant="text" onClick={marcarPerfeitos} disabled={loading}>
          Marcar pares perfeitos
        </Button>
        <Button variant="text" color="warning" onClick={limpar} disabled={loading}>
          Limpar seleção
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          color="primary"
          startIcon={<FavoriteRoundedIcon />}
          onClick={vincular}
          disabled={submitting || itemsParaVincular.length === 0}
        >
          {submitting ? 'Vinculando…' : `Vincular casais (${itemsParaVincular.length})`}
        </Button>
      </Stack>

      <Paper variant="outlined">
        {(loading || submitting) && <LinearProgress />}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell sx={{ minWidth: 240 }}>Célula (lado feminino)</TableCell>
                <TableCell sx={{ minWidth: 240 }}>Célula (lado masculino)</TableCell>
                <TableCell sx={{ minWidth: 220 }}>Compatibilidade</TableCell>
                <TableCell align="center">Confiança</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Nenhuma sugestão encontrada. Células precisam ter o mesmo endereço e número,
                      em redes de casal (Mulheres × Homens ou Juventude Relevante Moças × Rapazes), e ainda não estarem vinculadas.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const checked = selecionadas.includes(r.id);
                // Desabilita se alguma das células já está sendo usada em outro par marcado.
                const bloqueado = !checked
                  && (usados.mulheres.has(r.mulheres.id) || usados.homens.has(r.homens.id));
                return (
                  <TableRow key={r.id} hover selected={checked}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={checked}
                        disabled={bloqueado}
                        onChange={(e) => toggle(r, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell><CelulaResumo celula={r.mulheres} /></TableCell>
                    <TableCell><CelulaResumo celula={r.homens} /></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        <MatchBadge ok={r.enderecoMatch} label="Endereço" />
                        <MatchBadge ok={r.diaMatch} label="Dia" />
                        <MatchBadge ok={r.horarioMatch} label="Horário" />
                      </Stack>
                      {bloqueado && (
                        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                          Célula já usada em outro par selecionado
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${Math.round(r.score * 100)}%`}
                        size="small"
                        color={scoreColor(r.score)}
                        variant={r.score >= 1 ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <Divider />
        <Box sx={{ p: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            O par é sugerido quando as duas células têm o <strong>mesmo endereço e número</strong>.
            Dia e horário coincidentes elevam a confiança para 100%. Ao vincular, as duas células
            ficam marcadas como célula de casal, uma apontando para a outra.
          </Typography>
        </Box>
      </Paper>

      <Notification open={!!notification} message={notification} type={notifType} close={() => setNotification('')} />
    </PapperBlock>
  );
};

export default CasaisCelulasPage;
