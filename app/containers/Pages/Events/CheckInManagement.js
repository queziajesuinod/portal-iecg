import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Box
} from '@material-ui/core';
import {
  CheckCircle as CheckInIcon,
  Schedule as ScheduleIcon,
  LocationOn as StationIcon,
  Assessment as StatsIcon
} from '@material-ui/icons';
import { useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import CheckInSchedules from './CheckIn/CheckInSchedules';
import CheckInStations from './CheckIn/CheckInStations';
import CheckInManual from './CheckIn/CheckInManual';
import CheckInList from './CheckIn/CheckInList';
import CheckInStats from './CheckIn/CheckInStats';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`checkin-tabpanel-${index}`}
      aria-labelledby={`checkin-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

function CheckInManagement() {
  const { id } = useParams();
  const eventId = id;
  const [tabAtual, setTabAtual] = useState(0);
  const [notification, setNotification] = useState('');
  const [evento, setEvento] = useState(null);

  const title = brand.name + ' - Gerenciamento de Check-in';
  const description = brand.desc;

  useEffect(() => {
    // Carregar informações do evento
    carregarEvento();
  }, [eventId]);

  const carregarEvento = async () => {
    try {
      // TODO: Implementar busca do evento
      // const eventoData = await buscarEvento(eventId);
      // setEvento(eventoData);
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      setNotification('Erro ao carregar evento');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabAtual(newValue);
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
      </Helmet>

      <Notification message={notification} close={() => setNotification('')} />

      <PapperBlock
        title="Gerenciamento de Check-in"
        desc="Gerencie agendamentos, estações e realize check-ins"
        icon="ios-checkmark-circle-outline"
      >
        <Grid container spacing={3}>
          {/* Estatísticas Rápidas */}
          <Grid item xs={12}>
            <CheckInStats eventId={eventId} compact />
          </Grid>

          {/* Tabs de Navegação */}
          <Grid item xs={12}>
            <Card>
              <Tabs
                value={tabAtual}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab icon={<CheckInIcon />} label="Check-in Manual" />
                <Tab icon={<ScheduleIcon />} label="Agendamentos" />
                <Tab icon={<StationIcon />} label="Estações" />
                <Tab label="Lista de Check-ins" />
                <Tab icon={<StatsIcon />} label="Estatísticas" />
              </Tabs>

              <TabPanel value={tabAtual} index={0}>
                <CheckInManual eventId={eventId} />
              </TabPanel>

              <TabPanel value={tabAtual} index={1}>
                <CheckInSchedules eventId={eventId} />
              </TabPanel>

              <TabPanel value={tabAtual} index={2}>
                <CheckInStations eventId={eventId} />
              </TabPanel>

              <TabPanel value={tabAtual} index={3}>
                <CheckInList eventId={eventId} />
              </TabPanel>

              <TabPanel value={tabAtual} index={4}>
                <CheckInStats eventId={eventId} />
              </TabPanel>
            </Card>
          </Grid>
        </Grid>
      </PapperBlock>
    </div>
  );
}

export default CheckInManagement;
