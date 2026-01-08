import React, { useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import { Box, Button, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';

const FilaApelosPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [autoProcess, setAutoProcess] = useState(false);
  const autoProcessRef = useRef(false);

  const API_URL = (
    process.env.REACT_APP_API_URL?.trim() || window.location.origin
  ).replace(/\/$/, '');

  const processar = async () => {
    setLoading(true);
    setNotification('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/start/direcionamentos/processar-fila`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.erro || 'Falha ao processar fila.');
      }
      const entry = `[${new Date().toLocaleTimeString()}] ${data.mensagem}${
        data.apeloId ? ` | Apelo: ${data.apeloId}` : ''
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

  return (
    <div>
      <Helmet>
        <title>Fila de Apelos</title>
      </Helmet>
      <PapperBlock title="Fila de Apelos" desc="Processa a fila de apelos automaticamente para a célula mais próxima.">
        <Box display="flex" gap={2} mb={2}>
          <Button variant="contained" color="primary" onClick={processar} disabled={loading || autoProcess}>
            {loading ? 'Processando...' : 'Processar próximo apelo'}
          </Button>
          <Button
            variant="outlined"
            color={autoProcess ? 'secondary' : 'primary'}
            onClick={autoProcess ? stopAuto : startAuto}
          >
            {autoProcess ? 'Parar auto-processo' : 'Processar em loop (15s)'}
          </Button>
          <Typography variant="body2" color="textSecondary">
            Regra: pula células com 2 direcionamentos nos últimos 30 dias, respeita rede e proximidade geográfica.
          </Typography>
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
