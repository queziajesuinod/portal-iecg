import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Box, Button, Typography, Paper, List, ListItem, ListItemText, Divider, Chip, LinearProgress
} from '@mui/material';

const FilaApelosPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [autoProcess, setAutoProcess] = useState(false);
  const [loteStatus, setLoteStatus] = useState(null);
  const autoProcessRef = useRef(false);
  const pollRef = useRef(null);

  const API_URL = (
    process.env.REACT_APP_API_URL?.trim() || window.location.origin
  ).replace(/\/$/, '');

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  };

  // ─── Processamento manual (1 apelo por clique) ───────────────────────────────

  const processar = async () => {
    setLoading(true);
    setNotification('');
    try {
      const res = await fetch(`${API_URL}/start/direcionamentos/processar-fila`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.erro || 'Falha ao processar fila.');
      }
      const entry = `[${new Date().toLocaleTimeString('pt-BR')}] ${data.mensagem}${
        data.apeloId ? ` | Apelo: ${data.apeloNome || data.apeloId}` : ''
      }${data.celula ? ` | Célula: ${data.celula.nome || data.celula.id}` : ''}`;
      setLogs((prev) => [entry, ...prev].slice(0, 20));
      return data;
    } catch (err) {
      setNotification(err.message || 'Erro ao processar fila.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const scheduleNext = async () => {
    if (!autoProcessRef.current) return;
    try {
      const data = await processar();
      if (autoProcessRef.current && data && data.mensagem && !/Nenhum apelo aguardando/i.test(data.mensagem)) {
        setTimeout(scheduleNext, 15000);
      } else {
        autoProcessRef.current = false;
        setAutoProcess(false);
      }
    } catch (err) {
      autoProcessRef.current = false;
      setAutoProcess(false);
    }
  };

  const startAuto = () => {
    if (autoProcessRef.current) return;
    autoProcessRef.current = true;
    setAutoProcess(true);
    scheduleNext();
  };

  const stopAuto = () => {
    autoProcessRef.current = false;
    setAutoProcess(false);
  };

  // ─── Processamento em lote (background no servidor) ───────────────────────────

  const buscarStatusLote = async () => {
    try {
      const res = await fetch(`${API_URL}/start/direcionamentos/fila-lote/status`, {
        headers: authHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      setLoteStatus(data);
      return data;
    } catch (err) {
      return null;
    }
  };

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(buscarStatusLote, 10000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Carrega o status inicial e para o polling quando o lote termina.
  useEffect(() => {
    buscarStatusLote();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (loteStatus?.running) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [loteStatus?.running]);

  const iniciarLote = async () => {
    setNotification('');
    try {
      const res = await fetch(`${API_URL}/start/direcionamentos/processar-fila-lote`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.erro || 'Falha ao iniciar o lote.');
      }
      setLoteStatus(data);
      const entry = `[${new Date().toLocaleTimeString('pt-BR')}] ${data.mensagem}`;
      setLogs((prev) => [entry, ...prev].slice(0, 20));
      startPolling();
    } catch (err) {
      setNotification(err.message || 'Erro ao iniciar o lote.');
    }
  };

  const cancelarLote = async () => {
    try {
      const res = await fetch(`${API_URL}/start/direcionamentos/fila-lote/cancelar`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.erro || 'Falha ao cancelar o lote.');
      }
      setLoteStatus(data);
      setNotification(data.mensagem || 'Cancelamento solicitado.');
    } catch (err) {
      setNotification(err.message || 'Erro ao cancelar o lote.');
    }
  };

  const loteRunning = Boolean(loteStatus?.running);
  const minutosEntreFileiras = loteStatus?.config?.delayEntreFileirasMs
    ? Math.round(loteStatus.config.delayEntreFileirasMs / 60000)
    : 15;
  const segundosEntreApelos = loteStatus?.config?.delayEntreApelosMs
    ? Math.round(loteStatus.config.delayEntreApelosMs / 1000)
    : 55;
  const tamanhoFileira = loteStatus?.config?.tamanhoFileira || 10;
  const aguardandoAte = loteStatus?.aguardandoProximaFileiraAte
    ? new Date(loteStatus.aguardandoProximaFileiraAte)
    : null;

  return (
    <div>
      <Helmet>
        <title>Fila de Apelos</title>
      </Helmet>
      <PapperBlock title="Fila de Apelos" desc="Processa a fila de apelos para a célula mais próxima seguindo as regras estabelecidas.">
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>Processamento em lote (recomendado)</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Processa em fileiras de {tamanhoFileira}: {segundosEntreApelos}s entre cada direcionamento
            e uma pausa de {minutosEntreFileiras} min entre as fileiras. Roda em segundo plano no servidor —
            pode fechar esta tela que continua.
          </Typography>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <Button variant="contained" color="primary" onClick={iniciarLote} disabled={loteRunning}>
              {loteRunning ? 'Lote em execução...' : 'Processar em lote'}
            </Button>
            <Button variant="outlined" color="secondary" onClick={cancelarLote} disabled={!loteRunning}>
              Parar lote
            </Button>
            {loteStatus && (
              <Chip
                size="small"
                color={loteRunning ? 'success' : 'default'}
                label={loteRunning ? 'Em execução' : 'Parado'}
              />
            )}
          </Box>
          {loteRunning && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}
          {loteStatus && (loteStatus.processados > 0 || loteRunning) && (
            <Box mt={1} display="flex" gap={1} flexWrap="wrap">
              <Chip size="small" variant="outlined" label={`Fileira: ${loteStatus.fileiraAtual || 0}`} />
              <Chip size="small" variant="outlined" label={`Processados: ${loteStatus.processados || 0}`} />
              <Chip size="small" variant="outlined" color="info" label={`Direcionados: ${loteStatus.direcionados || 0}`} />
              <Chip size="small" variant="outlined" color="warning" label={`Sem célula: ${loteStatus.semCelula || 0}`} />
              {aguardandoAte && (
                <Chip
                  size="small"
                  color="secondary"
                  label={`Próxima fileira ~ ${aguardandoAte.toLocaleTimeString('pt-BR')}`}
                />
              )}
            </Box>
          )}
          {loteStatus?.erro && (
            <Typography variant="caption" color="error" display="block" mt={1}>
              Erro: {loteStatus.erro}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>Processamento manual</Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button variant="outlined" color="primary" onClick={processar} disabled={loading || autoProcess}>
              {loading ? 'Processando...' : 'Processar próximo apelo'}
            </Button>
            <Button
              variant="outlined"
              color={autoProcess ? 'secondary' : 'primary'}
              onClick={autoProcess ? stopAuto : startAuto}
            >
              {autoProcess ? 'Parar auto-processo' : 'Processar em loop (15s)'}
            </Button>
          </Box>
        </Box>

        <Paper variant="outlined">
          <List dense>
            {logs.length === 0 && (
              <ListItem>
                <ListItemText primary="Nenhuma execução ainda." />
              </ListItem>
            )}
            {logs.map((l, idx) => (
              <ListItem key={idx}>
                <ListItemText primary={l} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </PapperBlock>
      <Notification
        open={!!notification}
        close={() => setNotification('')}
        message={notification}
        type="error"
      />
    </div>
  );
};

export default FilaApelosPage;
