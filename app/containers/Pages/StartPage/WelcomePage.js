import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Box, Grid, Paper, Typography
} from '@mui/material';
import { PapperBlock } from 'dan-components';

const MEMBER_PROFILE_ID = '7d47d03a-a7aa-4907-b8b9-8fcf87bd52dc';

const fallbackHost = `${window.location.protocol}//${window.location.host}`;
const API_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.replace(/\/$/, '')) || fallbackHost || 'https://portal.iecg.com.br';

const cardStyles = [
  { bg: 'linear-gradient(135deg, #4e73df 0%, #3157c5 100%)', icon: 'ion-ios-people-outline' },
  { bg: 'linear-gradient(135deg, #00a68f 0%, #00806e 100%)', icon: 'ion-ios-git-network-outline' },
  { bg: 'linear-gradient(135deg, #7bbf2f 0%, #5f9b21 100%)', icon: 'ion-ios-heart-outline' },
  { bg: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', icon: 'ion-ios-person-outline' }
];

const fetchJson = async (url, headers) => {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Falha ao consultar ${url}`);
  }
  return response.json();
};

const isMember = (user) => {
  const hasMainPerfil = user?.perfilId === MEMBER_PROFILE_ID;
  const hasJoinedPerfil = Array.isArray(user?.perfis)
    && user.perfis.some((perfil) => perfil?.id === MEMBER_PROFILE_ID);
  return hasMainPerfil || hasJoinedPerfil;
};

const WelcomePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState({
    activeCells: 0,
    encaminhamentosAno: 0,
    decisoesReconAno: 0,
    activeMembers: 0
  });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    const loadKpis = async () => {
      try {
        setLoading(true);
        setError('');

        const [
          celulasResponse,
          encaminhamentoResponse,
          decisaoResponse,
          voltaResponse,
          usersResponse
        ] = await Promise.all([
          fetchJson(`${API_URL}/start/celula?ativo=true&page=1&limit=1`, headers),
          fetchJson(`${API_URL}/start/direcionamentos?year=${currentYear}&decisao=encaminhamento_celula&page=1&limit=1`, headers),
          fetchJson(`${API_URL}/start/direcionamentos?year=${currentYear}&decisao=apelo_decisao&page=1&limit=1`, headers),
          fetchJson(`${API_URL}/start/direcionamentos?year=${currentYear}&decisao=apelo_volta&page=1&limit=1`, headers),
          fetchJson(`${API_URL}/users`, headers)
        ]);

        const activeMembers = Array.isArray(usersResponse)
          ? usersResponse.filter((user) => isMember(user) && user.active).length
          : 0;

        setKpis({
          activeCells: Number(celulasResponse?.totalRegistros || 0),
          encaminhamentosAno: Number(encaminhamentoResponse?.totalRegistros || 0),
          decisoesReconAno: Number(decisaoResponse?.totalRegistros || 0) + Number(voltaResponse?.totalRegistros || 0),
          activeMembers
        });
      } catch (err) {
        setError(err.message || 'Erro ao carregar indicadores.');
      } finally {
        setLoading(false);
      }
    };

    loadKpis();
  }, [currentYear]);

  const cards = useMemo(() => ([
    {
      title: 'Células ativas',
      value: kpis.activeCells,
      subtitle: 'Total atual'
    },
    {
      title: 'Encaminhamento de células',
      value: kpis.encaminhamentosAno,
      subtitle: `Ano vigente (${currentYear})`
    },
    {
      title: 'Pessoas que aceitaram Jesus e se reconciliaram',
      value: kpis.decisoesReconAno,
      subtitle: `Ano vigente (${currentYear})`
    },
    {
      title: 'Membros ativos',
      value: kpis.activeMembers,
      subtitle: 'Total atual'
    }
  ]), [currentYear, kpis]);

  return (
    <div>
      <Helmet>
        <title>Painel inicial - Portal IECG</title>
        <meta name="description" content="KPIs da pagina inicial do sistema" />
      </Helmet>

      <PapperBlock title="Painel inicial" desc="Indicadores gerais do Start">
        {error && (
          <Box mb={2}>
            <Typography color="error" variant="body2">{error}</Typography>
          </Box>
        )}

        <Grid container spacing={2} alignItems="stretch">
          {cards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={card.title}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  color: '#fff',
                  borderRadius: 2,
                  background: cardStyles[index]?.bg || cardStyles[0].bg,
                  height: 168,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                    {loading ? '-' : card.value}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      mt: 1,
                      fontWeight: 600,
                      minHeight: 48
                    }}
                  >
                    {card.title}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {card.subtitle}
                  </Typography>
                </Box>
                <Box sx={{ opacity: 0.85, fontSize: 38, ml: 1 }}>
                  <i className={cardStyles[index]?.icon || 'ion-ios-stats-outline'} />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </PapperBlock>
    </div>
  );
};

export default WelcomePage;
