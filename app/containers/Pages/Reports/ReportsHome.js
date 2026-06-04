import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  Grid, Card, CardActionArea, CardContent, Typography, Box, Avatar,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PaidIcon from '@mui/icons-material/Paid';
import InsightsIcon from '@mui/icons-material/Insights';
import { Helmet } from 'react-helmet';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';

const RELATORIOS = [
  {
    key: 'membros',
    title: 'Membros',
    desc: 'Demografia, crescimento, retenção e distribuição por campus, gênero, faixa etária e cargo.',
    link: '/app/relatorios/membros',
    icon: <PeopleIcon />,
    color: '#16548e',
  },
  {
    key: 'eventos',
    title: 'Eventos e Finanças',
    desc: 'Receita por evento, métodos de pagamento, canal, inscrições, conversão, despesas e fluxo de caixa.',
    link: '/app/relatorios/eventos-financeiro',
    icon: <PaidIcon />,
    color: '#1e8449',
  },
  {
    key: 'cultos',
    title: 'Saúde dos Cultos',
    desc: 'Evolução de presença, desempenho por dia da semana, apelos, voluntários e comparativo por ministério.',
    link: '/app/relatorios/cultos',
    icon: <InsightsIcon />,
    color: '#c97a16',
  },
];

const ReportsHome = () => (
  <div>
    <Helmet><title>Relatórios</title></Helmet>
    <PapperBlock
      title="Relatórios"
      icon="ion-ios-stats-outline"
      desc="Central de relatórios analíticos do Portal IECG"
    >
      <Grid container spacing={3}>
        {RELATORIOS.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.key}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea component={Link} to={item.link} sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                    <Avatar sx={{ bgcolor: item.color }}>{item.icon}</Avatar>
                    <Typography variant="h6" fontWeight={700}>{item.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">{item.desc}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </PapperBlock>
  </div>
);

ReportsHome.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  history: PropTypes.object,
};

ReportsHome.defaultProps = {
  history: null,
};

export default ReportsHome;
