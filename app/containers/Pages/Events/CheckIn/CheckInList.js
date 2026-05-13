import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Box,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExportIcon from '@mui/icons-material/GetApp';
import * as XLSX from 'xlsx';
import { listarCheckIns, listarAgendamentos } from '../../../../api/checkInApi';

function CheckInList({ eventId }) {
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [filtros, setFiltros] = useState({
    scheduleId: '',
    checkInMethod: '',
    dataInicio: '',
    dataFim: ''
  });

  useEffect(() => {
    carregarCheckIns();
    carregarAgendamentos();
  }, [eventId]);

  const carregarAgendamentos = async () => {
    try {
      const data = await listarAgendamentos(eventId);
      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    }
  };

  const carregarCheckIns = async () => {
    try {
      setLoading(true);
      const data = await listarCheckIns(eventId, filtros);
      setCheckIns(data);
    } catch (error) {
      console.error('Erro ao carregar check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAplicarFiltros = () => {
    carregarCheckIns();
  };

  const handleLimparFiltros = () => {
    setFiltros({
      scheduleId: '',
      checkInMethod: '',
      dataInicio: '',
      dataFim: ''
    });
    setTimeout(() => carregarCheckIns(), 100);
  };

  const formatarValor = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
    if (Array.isArray(value)) return value.map(formatarValor).join(' | ');
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch (_e) { return String(value); }
    }
    return String(value);
  };

  const handleExportar = () => {
    if (checkIns.length === 0) {
      alert('Nenhum check-in para exportar com os filtros atuais.');
      return;
    }

    // Coletar todas as chaves dinâmicas de attendeeData e buyerData
    const attendeeKeys = new Set();
    const buyerKeys = new Set();

    checkIns.forEach((checkIn) => {
      const attendeeData = checkIn.attendee?.attendeeData;
      if (attendeeData && typeof attendeeData === 'object') {
        Object.keys(attendeeData).forEach((k) => attendeeKeys.add(k));
      }
      // fallback: attendees da inscrição quando não há attendee específico
      if (!attendeeData) {
        (checkIn.registration?.attendees || []).forEach((a) => {
          if (a?.attendeeData && typeof a.attendeeData === 'object') {
            Object.keys(a.attendeeData).forEach((k) => attendeeKeys.add(k));
          }
        });
      }
      const buyerData = checkIn.registration?.buyerData;
      if (buyerData && typeof buyerData === 'object') {
        Object.keys(buyerData).forEach((k) => buyerKeys.add(k));
      }
    });

    const sortedAttendeeKeys = Array.from(attendeeKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const sortedBuyerKeys = Array.from(buyerKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const baseHeaders = ['Data/Hora', 'Código', 'Método', 'Agendamento', 'Estação', 'Operador'];
    const attendeeHeaders = sortedAttendeeKeys.map((k) => `inscrito.${k}`);
    const buyerHeaders = sortedBuyerKeys.map((k) => `comprador.${k}`);
    const headers = [...baseHeaders, ...attendeeHeaders, ...buyerHeaders];

    const rows = checkIns.map((checkIn) => {
      const attendeeData = checkIn.attendee?.attendeeData
        || checkIn.registration?.attendees?.[0]?.attendeeData
        || {};
      const buyerData = checkIn.registration?.buyerData || {};

      const row = {
        'Data/Hora': formatarData(checkIn.checkInAt),
        Código: checkIn.registration?.orderCode || '',
        Método: getMetodoLabel(checkIn.checkInMethod),
        Agendamento: checkIn.schedule?.name || '',
        Estação: checkIn.station?.name || '',
        Operador: checkIn.staff?.name || ''
      };

      sortedAttendeeKeys.forEach((k) => {
        row[`inscrito.${k}`] = formatarValor(attendeeData[k]);
      });
      sortedBuyerKeys.forEach((k) => {
        row[`comprador.${k}`] = formatarValor(buyerData[k]);
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CheckIns');
    const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([workbookBytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateTag = new Date().toISOString().slice(0, 10);
    link.download = `checkins_${dateTag}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatarData = (data) => new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getMetodoLabel = (metodo) => {
    const labels = {
      manual: 'Manual',
      qrcode: 'QR Code',
      nfc: 'NFC'
    };
    return labels[metodo] || metodo;
  };

  const getMetodoColor = (metodo) => {
    const colors = {
      manual: 'primary',
      qrcode: 'secondary',
      nfc: 'default'
    };
    return colors[metodo] || 'default';
  };

  const getNomesInscritos = (checkIn) => {
    const nomeDoAttendeeCheckIn = checkIn.attendee?.attendeeData?.nome_completo
      || checkIn.attendee?.attendeeData?.name
      || checkIn.attendee?.attendeeData?.nome;

    if (nomeDoAttendeeCheckIn) {
      return [nomeDoAttendeeCheckIn];
    }

    const attendees = Array.isArray(checkIn.registration?.attendees)
      ? checkIn.registration.attendees
      : [];

    const nomes = attendees
      .map((attendee) => attendee?.attendeeData?.nome_completo || attendee?.attendeeData?.name || attendee?.attendeeData?.nome)
      .filter(Boolean);

    const nomesUnicos = [...new Set(nomes)];
    if (nomesUnicos.length > 0) {
      return nomesUnicos;
    }

    const fallbackNome = checkIn.registration?.buyerData?.nome_completo
      || checkIn.registration?.buyerData?.buyer_name
      || checkIn.registration?.buyerData?.name
      || checkIn.registration?.buyerData?.nome;

    return fallbackNome ? [fallbackNome] : [];
  };

  return (
    <>
      {/* Filtros */}
      <Card style={{ marginBottom: 16 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Agendamento</InputLabel>
                <Select
                  value={filtros.scheduleId}
                  onChange={(e) => setFiltros({ ...filtros, scheduleId: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {agendamentos.map((ag) => (
                    <MenuItem key={ag.id} value={ag.id}>{ag.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Método</InputLabel>
                <Select
                  value={filtros.checkInMethod}
                  onChange={(e) => setFiltros({ ...filtros, checkInMethod: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="qrcode">QR Code</MenuItem>
                  <MenuItem value="nfc">NFC</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAplicarFiltros}
                  disabled={loading}
                  startIcon={<RefreshIcon />}
                >
                  Filtrar
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleLimparFiltros}
                  disabled={loading}
                >
                  Limpar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Check-ins Realizados ({checkIns.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              size="small"
              onClick={handleExportar}
            >
              Exportar
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data/Hora</TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Método</TableCell>
                <TableCell>Agendamento</TableCell>
                <TableCell>Estação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checkIns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">
                      {loading ? 'Carregando...' : 'Nenhum check-in realizado'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                checkIns.map((checkIn) => {
                  const nomesInscritos = getNomesInscritos(checkIn);

                  return (
                    <TableRow key={checkIn.id}>
                      <TableCell>{formatarData(checkIn.checkInAt)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                          {checkIn.registration?.orderCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {nomesInscritos.length > 0 ? (
                          <Box display="flex" flexDirection="column" gap={0.5}>
                            {nomesInscritos.map((nome, idx) => (
                              <Typography key={`${checkIn.id}-nome-${idx}`} variant="body2">
                                {nome}
                              </Typography>
                            ))}
                          </Box>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getMetodoLabel(checkIn.checkInMethod)}
                          color={getMetodoColor(checkIn.checkInMethod)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {checkIn.schedule?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {checkIn.station?.name || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

CheckInList.propTypes = {
  eventId: PropTypes.string.isRequired,
};

export default CheckInList;
