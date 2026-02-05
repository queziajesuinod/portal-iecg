import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Card,
  Tabs,
  Tab,
  Box
} from '@material-ui/core';
import {
  Send as SendIcon,
  Group as GroupIcon,
  Description as TemplateIcon,
  History as HistoryIcon,
  Assessment as StatsIcon
} from '@material-ui/icons';
import { useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import NotificationSender from './Notifications/NotificationSender';
import NotificationGroups from './Notifications/NotificationGroups';
import NotificationTemplates from './Notifications/NotificationTemplates';
import NotificationHistory from './Notifications/NotificationHistory';
import NotificationStats from './Notifications/NotificationStats';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

function NotificationsManagement() {
  const { id } = useParams();
  const eventId = id;
  const [tabAtual, setTabAtual] = useState(0);
  const [notification, setNotification] = useState('');

  const title = brand.name + ' - Gerenciamento de Notificações';
  const description = brand.desc;

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
        title="Gerenciamento de Notificações"
        desc="Envie notificações via WhatsApp para os inscritos do evento"
        icon="ios-notifications-outline"
      >
        <Grid container spacing={3}>
          {/* Estatísticas Rápidas */}
          <Grid item xs={12}>
            <NotificationStats eventId={eventId} compact />
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
                <Tab icon={<SendIcon />} label="Enviar Notificação" />
                <Tab icon={<GroupIcon />} label="Grupos" />
                <Tab icon={<TemplateIcon />} label="Templates" />
                <Tab icon={<HistoryIcon />} label="Histórico" />
                <Tab icon={<StatsIcon />} label="Estatísticas" />
              </Tabs>

              <TabPanel value={tabAtual} index={0}>
                <NotificationSender eventId={eventId} />
              </TabPanel>

              <TabPanel value={tabAtual} index={1}>
                <NotificationGroups eventId={eventId} />
              </TabPanel>

              <TabPanel value={tabAtual} index={2}>
                <NotificationTemplates eventId={eventId} />
              </TabPanel>

              <TabPanel value={tabAtual} index={3}>
                <NotificationHistory eventId={eventId} />
              </TabPanel>

              <TabPanel value={tabAtual} index={4}>
                <NotificationStats eventId={eventId} />
              </TabPanel>
            </Card>
          </Grid>
        </Grid>
      </PapperBlock>
    </div>
  );
}

export default NotificationsManagement;
