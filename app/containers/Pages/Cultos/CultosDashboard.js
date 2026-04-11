import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import {
  buscarDashboard,
  listarMinisterios,
  listarTiposEvento,
} from '../../../api/cultosApi';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  const { protocol, hostname, port } = window.location;
  if (port === '3005') return `${protocol}//${hostname}:3005`;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const API_URL = resolveApiUrl();

const CardTotalizador = ({
  titulo,
  valor,
  subtitulo,
  cor,
}) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle2" color="textSecondary">{titulo}</Typography>
      <Typography variant="h4" sx={{ color: cor || 'primary.main', fontWeight: 700 }}>
        {valor ?? 0}
      </Typography>
      {subtitulo && <Typography variant="caption" color="textSecondary">{subtitulo}</Typography>}
    </CardContent>
  </Card>
);

CardTotalizador.propTypes = {
  titulo: PropTypes.string.isRequired,
  valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subtitulo: PropTypes.string,
  cor: PropTypes.string,
};

CardTotalizador.defaultProps = {
  valor: 0,
  subtitulo: '',
  cor: null,
};

const formatarData = (data) => {
  if (!data) return '';
  const [y, m, d] = String(data).split('-');
  return `${d}/${m}/${y}`;
};

const formatarNumero = (valor) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '0';
  return numero.toLocaleString('pt-BR');
};
const formatarPercentual = (valor, casas = 1) => `${Number(valor || 0).toFixed(casas)}%`;
const PALETA_LINHAS = ['#1565c0', '#2e7d32', '#ef6c00', '#8e24aa', '#00838f', '#6d4c41', '#3949ab', '#c62828'];

const CultosDashboard = () => {
  const [dados, setDados] = useState(null);
  const [campi, setCampi] = useState([]);
  const [ministerios, setMinisterios] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [filtros, setFiltros] = useState({
    campusIds: [],
    ministerioIds: [],
    tipoEventoId: '',
    dataInicio: '',
    dataFim: '',
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API_URL}/start/campus`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      listarMinisterios(true),
      listarTiposEvento(true),
    ]).then(([campusData, ministeriosData, tiposEventoData]) => {
      setCampi(Array.isArray(campusData) ? campusData : []);
      setMinisterios(Array.isArray(ministeriosData) ? ministeriosData : []);
      setTiposEvento(Array.isArray(tiposEventoData) ? tiposEventoData : []);
    }).catch(() => setNotification('Erro ao carregar filtros'));
  }, []);

  const loadDados = useCallback(() => {
    setLoading(true);
    buscarDashboard(filtros)
      .then(setDados)
      .catch(() => setNotification('Erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, [filtros]);

  useEffect(() => {
    loadDados();
  }, [loadDados]);

  const handleFiltro = (e) => {
    const { name, value } = e.target;
    const valorNormalizado = (name === 'campusIds' || name === 'ministerioIds') && typeof value === 'string'
      ? value.split(',').filter(Boolean)
      : value;
    setFiltros((prev) => ({ ...prev, [name]: valorNormalizado }));
  };

  const insights = useMemo(() => dados?.insights || {}, [dados]);

  const tendenciaTexto = insights.tendenciaLabel === 'alta'
    ? 'Alta'
    : (insights.tendenciaLabel === 'queda' ? 'Queda' : 'Estável');

  const faixaEstabilidade = useMemo(() => {
    const indice = Number(insights.indiceConsistencia || 0);
    if (indice >= 85) {
      return {
        label: 'Estável',
        cor: 'success.main',
        descricao: 'Presença com baixa oscilação',
      };
    }
    if (indice >= 65) {
      return {
        label: 'Atenção',
        cor: 'warning.main',
        descricao: 'Presença com oscilação moderada',
      };
    }
    return {
      label: 'Crítico',
      cor: 'error.main',
      descricao: 'Presença com alta oscilação',
    };
  }, [insights.indiceConsistencia]);

  const rankingPresenca = useMemo(() => {
    const lista = Array.isArray(dados?.topRegistrosPresenca) ? dados.topRegistrosPresenca : [];
    const maiorPresenca = lista.length > 0 ? Number(lista[0].presenca || 0) : 0;
    return lista.map((item, index) => {
      const posicao = index + 1;
      const presenca = Number(item.presenca || 0);
      const percentualRelativo = maiorPresenca > 0
        ? Math.max(8, Math.round((presenca / maiorPresenca) * 100))
        : 0;
      const cor = posicao === 1
        ? '#1565c0'
        : (posicao === 2 ? '#2e7d32' : (posicao === 3 ? '#ef6c00' : '#607d8b'));
      return {
        ...item,
        posicao,
        presenca,
        percentualRelativo,
        cor,
      };
    });
  }, [dados]);

  const seriesEvolucaoMinisterio = useMemo(() => {
    const lista = Array.isArray(dados?.ministeriosEvolucao) ? dados.ministeriosEvolucao : [];
    return lista.map((item, index) => ({
      ...item,
      cor: PALETA_LINHAS[index % PALETA_LINHAS.length],
    }));
  }, [dados]);

  const dadosEvolucaoPresenca = useMemo(() => {
    const lista = Array.isArray(dados?.evolucaoPresencaPorMinisterio)
      ? dados.evolucaoPresencaPorMinisterio
      : [];
    return lista.map((item) => ({
      ...item,
      dataFormatada: formatarData(item.data),
    }));
  }, [dados]);

  const renderFiltroMultiplo = (selecionados, opcoes, placeholder) => {
    if (!Array.isArray(selecionados) || selecionados.length === 0) return placeholder;
    const nomes = opcoes
      .filter((item) => selecionados.includes(item.id))
      .map((item) => item.nome);
    return nomes.length > 0 ? nomes.join(', ') : placeholder;
  };

  return (
    <div>
      <Helmet><title>Dashboard - Saúde dos Cultos</title></Helmet>
      <PapperBlock title="Saúde dos Cultos" icon="ion-ios-analytics-outline" desc="Insights práticos para acompanhar público, engajamento e operação">

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Campus</InputLabel>
              <Select
                multiple
                displayEmpty
                name="campusIds"
                value={filtros.campusIds}
                label="Campus"
                onChange={handleFiltro}
                renderValue={(selected) => renderFiltroMultiplo(selected, campi, 'Todos')}
              >
                {campi.map((campus) => <MenuItem key={campus.id} value={campus.id}>{campus.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Ministério</InputLabel>
              <Select
                multiple
                displayEmpty
                name="ministerioIds"
                value={filtros.ministerioIds}
                label="Ministério"
                onChange={handleFiltro}
                renderValue={(selected) => renderFiltroMultiplo(selected, ministerios, 'Todos')}
              >
                {ministerios.map((ministerio) => <MenuItem key={ministerio.id} value={ministerio.id}>{ministerio.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Evento</InputLabel>
              <Select name="tipoEventoId" value={filtros.tipoEventoId} label="Tipo de Evento" onChange={handleFiltro}>
                <MenuItem value="">Todos</MenuItem>
                {tiposEvento.map((tipo) => <MenuItem key={tipo.id} value={tipo.id}>{tipo.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="De"
              name="dataInicio"
              value={filtros.dataInicio}
              onChange={handleFiltro}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Até"
              name="dataFim"
              value={filtros.dataFim}
              onChange={handleFiltro}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}

        {!loading && dados && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Cultos" valor={dados.totalCultos} cor="text.primary" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador
                  titulo="Presença total"
                  valor={formatarNumero(dados.totalPresenca)}
                  subtitulo={`H:${dados.totalHomens} M:${dados.totalMulheres} C:${dados.totalCriancas} B:${dados.totalBebes}`}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Online" valor={formatarNumero(dados.totalOnline)} cor="info.main" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Voluntários" valor={formatarNumero(dados.totalVoluntarios)} cor="success.main" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Apelos" valor={formatarNumero(dados.totalApelos)} cor="warning.main" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <CardTotalizador titulo="Pessoas no apelo" valor={formatarNumero(dados.totalPessoasApelo)} cor="error.main" />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <CardTotalizador
                  titulo="Média por culto"
                  valor={insights.mediaPresencaCulto || 0}
                  subtitulo="Público médio por culto no período"
                  cor="primary.main"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <CardTotalizador
                  titulo="Cultos com apelo"
                  valor={formatarPercentual(insights.taxaApeloCultos)}
                  subtitulo={`Média por apelo: ${formatarNumero(insights.mediaPessoasPorApelo)} pessoas`}
                  cor="warning.main"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <CardTotalizador
                  titulo="Estabilidade da presença"
                  valor={formatarPercentual(insights.indiceConsistencia, 0)}
                  subtitulo={`${faixaEstabilidade.label}: ${faixaEstabilidade.descricao} | Tendência: ${tendenciaTexto} (${formatarPercentual(insights.tendenciaPercentual)})`}
                  cor={faixaEstabilidade.cor}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <CardTotalizador
                  titulo="Séries ministradas"
                  valor={formatarNumero(insights.totalSeriesMinistradas)}
                  subtitulo={`Mensagens em série: ${formatarNumero(insights.totalMensagensSerie)}`}
                  cor="secondary.main"
                />
              </Grid>
            </Grid>

            {dadosEvolucaoPresenca.length > 0 && seriesEvolucaoMinisterio.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Evolução de presença por data e ministério
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dadosEvolucaoPresenca}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dataFormatada" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value, nomeSerie) => [formatarNumero(value), nomeSerie]} />
                    <Legend />
                    {seriesEvolucaoMinisterio.map((serie) => (
                      <Line
                        key={serie.id}
                        type="monotone"
                        dataKey={serie.id}
                        name={serie.nome}
                        stroke={serie.cor}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            {Array.isArray(dados.engajamentoPorData) && dados.engajamentoPorData.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Operação por data (público x equipe)
                </Typography>
                <ResponsiveContainer width="100%" height={290}>
                  <ComposedChart data={dados.engajamentoPorData.map((item) => ({ ...item, data: formatarData(item.data) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="presenca" name="Presença" fill="#1976d2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="voluntarios" name="Voluntários" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="online" name="Online" stroke="#f57c00" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            )}

            {rankingPresenca.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Top 5 registros por presença
                </Typography>
                <Card
                  variant="outlined"
                  sx={{
                    background: 'linear-gradient(135deg, #f8fbff 0%, #f3f8ff 100%)',
                  }}
                >
                  <CardContent>
                    {rankingPresenca.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          mb: 2,
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: '#fff',
                          border: `1px solid ${item.cor}22`,
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.8}>
                          <Box display="flex" alignItems="center" minWidth={0}>
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                minWidth: 28,
                                borderRadius: '50%',
                                backgroundColor: item.cor,
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 1,
                              }}
                            >
                              {item.posicao}
                            </Box>
                            <Box minWidth={0}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                {item.tituloMensagem}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" noWrap>
                                {item.ministerio} | {formatarData(item.data)}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: item.cor, ml: 1 }}>
                            {formatarNumero(item.presenca)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={item.percentualRelativo}
                          sx={{
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: '#eaf1f8',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 999,
                              backgroundColor: item.cor,
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Box>
            )}

            {dados.totalCultos === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="textSecondary">Nenhum culto encontrado para os filtros selecionados.</Typography>
              </Box>
            )}
          </>
        )}

        {notification && <Notification message={notification} close={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default CultosDashboard;
