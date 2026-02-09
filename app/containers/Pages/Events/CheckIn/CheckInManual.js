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
  Alert
} from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import { validarCodigo, realizarCheckInManual } from '../../../../api/checkInApi';

function CheckInManual({ eventId }) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [inscricao, setInscricao] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const handleBuscar = async () => {
    if (!codigo.trim()) {
      setErro('Digite um código de inscrição');
      return;
    }

    try {
      setLoading(true);
      setErro('');
      setSucesso('');
      setInscricao(null);

      const resultado = await validarCodigo(codigo.trim());

      if (!resultado.valido) {
        setErro(resultado.mensagem || 'Código inválido');
        return;
      }

      setInscricao(resultado.registration);

      if (resultado.jaFezCheckIn) {
        setErro(`Check-in já realizado em ${new Date(resultado.checkInAt).toLocaleString('pt-BR')}`);
      }
    } catch (error) {
      console.error('Erro ao validar código:', error);
      setErro(error.response?.data?.erro || 'Erro ao validar código');
    } finally {
      setLoading(false);
    }
  };

  const handleRealizarCheckIn = async () => {
    try {
      setLoading(true);
      setErro('');

      await realizarCheckInManual({
        registrationId: inscricao.id,
        eventId: inscricao.eventId
      });

      setSucesso('Check-in realizado com sucesso!');
      
      // Limpar formulário após 2 segundos
      setTimeout(() => {
        setCodigo('');
        setInscricao(null);
        setSucesso('');
      }, 2000);
    } catch (error) {
      console.error('Erro ao realizar check-in:', error);
      setErro(error.response?.data?.erro || 'Erro ao realizar check-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Formulário de Busca */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SearchIcon /> Buscar Inscrição
            </Typography>

            <Box mt={2}>
              <TextField
                fullWidth
                label="Código de Inscrição"
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
          </CardContent>
        </Card>
      </Grid>

      {/* Informações da Inscrição */}
      {inscricao && (
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PersonIcon /> Dados da Inscrição
              </Typography>

              <Box mt={2}>
                <Typography variant="body2" color="textSecondary">
                  Código
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>{inscricao.orderCode}</strong>
                </Typography>

                <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
                  Nome do Comprador
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {inscricao.buyerData?.name || 'N/A'}
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
                        key={index}
                        label={attendee.attendeeData?.name || `Inscrito ${index + 1}`}
                        style={{ margin: 4 }}
                        size="small"
                      />
                    ))}
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
                  disabled={loading}
                  startIcon={<CheckIcon />}
                >
                  Realizar Check-in
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
