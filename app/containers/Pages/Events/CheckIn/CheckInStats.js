import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box
} from '@mui/material';
import CheckInIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import TrendingIcon from '@mui/icons-material/TrendingUp';
import QRIcon from '@mui/icons-material/CropFree';
import NFCIcon from '@mui/icons-material/Nfc';
import ManualIcon from '@mui/icons-material/TouchApp';
import { obterEstatisticasCheckIn } from '../../../../api/checkInApi';

function StatCard({ title, value, icon: Icon, color = 'primary', subtitle }) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" style={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box>
            <Icon style={{ fontSize: 48, opacity: 0.3, color }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function CheckInStats({ eventId, compact = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setStats(null);
      return;
    }
    carregarEstatisticas();
  }, [eventId]);

  const carregarEstatisticas = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await obterEstatisticasCheckIn(eventId);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Typography color="textSecondary" align="center">
        Nenhuma estatística disponível
      </Typography>
    );
  }

  const porMetodo = stats.porMetodo || [];
  const manualCount = porMetodo.find(m => m.checkInMethod === 'manual')?.total || 0;
  const qrcodeCount = porMetodo.find(m => m.checkInMethod === 'qrcode')?.total || 0;
  const nfcCount = porMetodo.find(m => m.checkInMethod === 'nfc')?.total || 0;

  if (compact) {
    return (
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Check-ins"
            value={stats.totalCheckIns}
            icon={CheckInIcon}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Inscrições"
            value={stats.totalInscricoes}
            icon={PeopleIcon}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Taxa"
            value={`${stats.taxaComparecimento}%`}
            icon={TrendingIcon}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Pendentes"
            value={stats.totalInscricoes - stats.totalCheckIns}
            icon={PeopleIcon}
            color="#f44336"
          />
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Estatísticas Gerais */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total de Check-ins"
          value={stats.totalCheckIns}
          icon={CheckInIcon}
          color="#4caf50"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total de Inscrições"
          value={stats.totalInscricoes}
          icon={PeopleIcon}
          color="#2196f3"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Taxa de Comparecimento"
          value={`${stats.taxaComparecimento}%`}
          icon={TrendingIcon}
          color="#ff9800"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Pendentes"
          value={stats.totalInscricoes - stats.totalCheckIns}
          icon={PeopleIcon}
          color="#f44336"
          subtitle="Ainda não fizeram check-in"
        />
      </Grid>

      {/* Por Método */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom style={{ marginTop: 16 }}>
          Check-ins por Método
        </Typography>
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="Manual (Staff)"
          value={manualCount}
          icon={ManualIcon}
          color="#9c27b0"
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="QR Code"
          value={qrcodeCount}
          icon={QRIcon}
          color="#00bcd4"
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <StatCard
          title="NFC"
          value={nfcCount}
          icon={NFCIcon}
          color="#ff5722"
        />
      </Grid>

      {/* Por Agendamento */}
      {stats.porAgendamento && stats.porAgendamento.length > 0 && (
        <>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom style={{ marginTop: 16 }}>
              Check-ins por Agendamento
            </Typography>
          </Grid>

          {stats.porAgendamento.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    {item.schedule?.name || 'Sem agendamento'}
                  </Typography>
                  <Typography variant="h5" style={{ fontWeight: 'bold' }}>
                    {item.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </>
      )}
    </Grid>
  );
}

export default CheckInStats;
