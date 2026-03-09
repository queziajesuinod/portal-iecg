import React, { useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Typography,
  CircularProgress,
  Box,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import { validarCodigo, realizarCheckInManual } from '../../../../api/checkInApi';

function CheckInManual({ eventId }) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [inscricao, setInscricao] = useState(null);
  const [attendeeSelecionadoId, setAttendeeSelecionadoId] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [aviso, setAviso] = useState('');

  const getNomeInscrito = (attendee, index) => (
    attendee?.attendeeName
    || attendee?.attendeeData?.nome_completo
    || attendee?.attendeeData?.name
    || attendee?.attendeeData?.nome
    || `Inscrito ${index + 1}`
  );

  const getProximoAttendeePendente = (attendees = []) => attendees.find(
    (attendee) => !attendee?.jaFezCheckInNoAgendamento
  ) || attendees[0] || null;

  const atualizarAvisoPorPendencia = (attendees = [], totalCheckInsNoAgendamento = 0) => {
    const totalPendentes = attendees.filter((attendee) => !attendee?.jaFezCheckInNoAgendamento).length;
    if (totalPendentes === 0) {
      setAviso('Todos os inscritos desta compra ja fizeram check-in neste agendamento.');
      return;
    }

    if (totalCheckInsNoAgendamento > 0) {
      setAviso('Alguns inscritos ja fizeram check-in. Selecione um inscrito pendente para continuar.');
      return;
    }

    setAviso('');
  };

  const handleBuscar = async () => {
    if (!codigo.trim()) {
      setErro('Digite um codigo de inscricao');
      return;
    }

    try {
      setLoading(true);
      setErro('');
      setSucesso('');
      setAviso('');
      setInscricao(null);
      setAttendeeSelecionadoId('');

      const resultado = await validarCodigo(codigo.trim());

      if (!resultado.valido) {
        setErro(resultado.mensagem || 'Codigo invalido');
        return;
      }

      if (String(resultado.registration?.eventId) !== String(eventId)) {
        setErro('Codigo de inscricao nao pertence a este evento');
        return;
      }

      const registration = resultado.registration;
      const attendees = Array.isArray(registration?.attendees) ? registration.attendees : [];

      if (attendees.length === 0) {
        setErro('Nenhum inscrito encontrado nesta inscricao');
        return;
      }

      const proximoAttendee = getProximoAttendeePendente(attendees);
      setInscricao(registration);
      setAttendeeSelecionadoId(proximoAttendee?.id || '');
      atualizarAvisoPorPendencia(attendees, resultado.totalCheckInsNoAgendamento || 0);
    } catch (error) {
      console.error('Erro ao validar codigo:', error);
      setErro(error.response?.data?.erro || 'Erro ao validar codigo');
    } finally {
      setLoading(false);
    }
  };

  const handleRealizarCheckIn = async () => {
    if (!inscricao) {
      setErro('Busque uma inscricao primeiro');
      return;
    }

    if (!attendeeSelecionadoId) {
      setErro('Selecione o inscrito para realizar o check-in');
      return;
    }

    const attendeeSelecionado = inscricao.attendees?.find(
      (attendee) => String(attendee.id) === String(attendeeSelecionadoId)
    );

    if (!attendeeSelecionado) {
      setErro('Inscrito selecionado e invalido');
      return;
    }

    if (attendeeSelecionado.jaFezCheckInNoAgendamento) {
      setErro('Este inscrito ja fez check-in neste agendamento');
      return;
    }

    try {
      setLoading(true);
      setErro('');
      setSucesso('');
      setAviso('');

      await realizarCheckInManual({
        orderCode: inscricao.orderCode,
        event_id: inscricao.eventId,
        attendeeId: attendeeSelecionadoId
      });

      setSucesso('Check-in realizado com sucesso!');

      const resultadoAtualizado = await validarCodigo(inscricao.orderCode);
      if (resultadoAtualizado?.valido) {
        const registrationAtualizada = resultadoAtualizado.registration;
        const attendeesAtualizados = Array.isArray(registrationAtualizada?.attendees)
          ? registrationAtualizada.attendees
          : [];

        const proximoAttendee = getProximoAttendeePendente(attendeesAtualizados);
        setInscricao(registrationAtualizada);
        setAttendeeSelecionadoId(proximoAttendee?.id || '');
        atualizarAvisoPorPendencia(attendeesAtualizados, resultadoAtualizado.totalCheckInsNoAgendamento || 0);
      }
    } catch (error) {
      console.error('Erro ao realizar check-in:', error);
      setErro(error.response?.data?.erro || 'Erro ao realizar check-in');
    } finally {
      setLoading(false);
    }
  };

  const attendeeSelecionado = inscricao?.attendees?.find(
    (attendee) => String(attendee.id) === String(attendeeSelecionadoId)
  );
  const attendeeJaFezCheckIn = !!attendeeSelecionado?.jaFezCheckInNoAgendamento;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SearchIcon /> Buscar Inscricao
            </Typography>

            <Box mt={2}>
              <TextField
                fullWidth
                label="Codigo de Inscricao"
                placeholder="REG-20260204-XXXXXX"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleBuscar()}
                disabled={loading}
                variant="outlined"
              />
            </Box>

            <Box mt={2}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleBuscar}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </Box>

            {erro && (
              <Box mt={2}>
                <Alert severity="error">{erro}</Alert>
              </Box>
            )}

            {sucesso && (
              <Box mt={2}>
                <Alert severity="success">{sucesso}</Alert>
              </Box>
            )}

            {aviso && (
              <Box mt={2}>
                <Alert severity="warning">{aviso}</Alert>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {inscricao && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PersonIcon /> Dados da Inscricao
              </Typography>

              <Box mt={2}>
                <Typography variant="body2" color="textSecondary">
                  Codigo
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>{inscricao.orderCode}</strong>
                </Typography>

                <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
                  Nome do Comprador
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {inscricao.buyerData?.name || inscricao.buyerData?.buyer_name || 'N/A'}
                </Typography>

                <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
                  Evento
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {inscricao.eventTitle}
                </Typography>

                {inscricao.attendees && inscricao.attendees.length > 0 && (
                  <>
                    <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
                      Inscritos ({inscricao.attendees.length})
                    </Typography>
                    {inscricao.attendees.map((attendee, index) => (
                      <Chip
                        key={attendee.id || index}
                        label={`${getNomeInscrito(attendee, index)}${attendee.jaFezCheckInNoAgendamento ? ' - Check-in realizado' : ''}`}
                        color={attendee.jaFezCheckInNoAgendamento ? 'success' : 'default'}
                        style={{ margin: 4 }}
                        size="small"
                      />
                    ))}

                    <FormControl fullWidth style={{ marginTop: 16 }}>
                      <InputLabel id="attendee-select-label">Inscrito para check-in</InputLabel>
                      <Select
                        labelId="attendee-select-label"
                        value={attendeeSelecionadoId}
                        label="Inscrito para check-in"
                        onChange={(e) => setAttendeeSelecionadoId(e.target.value)}
                      >
                        {inscricao.attendees.map((attendee, index) => (
                          <MenuItem key={attendee.id || index} value={attendee.id}>
                            {getNomeInscrito(attendee, index)}{attendee.jaFezCheckInNoAgendamento ? ' (ja fez check-in)' : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                )}
              </Box>

              <Box mt={3}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleRealizarCheckIn}
                  disabled={loading || !attendeeSelecionadoId || attendeeJaFezCheckIn}
                  startIcon={<CheckIcon />}
                >
                  {attendeeJaFezCheckIn ? 'Inscrito ja fez check-in' : 'Realizar Check-in'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}

export default CheckInManual;
