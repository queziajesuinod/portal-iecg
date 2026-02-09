import React, { useState, useEffect } from 'react';
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
import { listarCheckIns } from '../../../../api/checkInApi';

function CheckInList({ eventId }) {
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    checkInMethod: '',
    dataInicio: '',
    dataFim: ''
  });

  useEffect(() => {
    carregarCheckIns();
  }, [eventId]);

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
      checkInMethod: '',
      dataInicio: '',
      dataFim: ''
    });
    setTimeout(() => carregarCheckIns(), 100);
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  return (
    <>
      {/* Filtros */}
      <Card style={{ marginBottom: 16 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
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

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
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
                checkIns.map((checkIn) => (
                  <TableRow key={checkIn.id}>
                    <TableCell>{formatarData(checkIn.checkInAt)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                        {checkIn.registration?.orderCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {checkIn.registration?.buyerData?.name || 'N/A'}
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

export default CheckInList;
