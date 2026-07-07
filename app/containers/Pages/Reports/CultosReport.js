import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import {
  Grid, Box, Button, FormControl, InputLabel, Select, MenuItem,
  TextField, CircularProgress, Alert, Typography, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  LinearProgress, Tooltip, OutlinedInput,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { Helmet } from 'react-helmet';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { buscarRelatorioCultos } from '../../../api/reportsApi';
import { listarMinisterios, listarCampusPorMinisterio, listarTiposEvento } from '../../../api/cultosApi';
import { listarCampus } from '../../../api/campusApi';
import KpiCard from './components/KpiCard';
import {
  exportarPDF, exportarExcel, fmtNumero, fmtDecimal, fmtPercent, PDF,
} from './utils/exportHelpers';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const COR = {
  homens: '#1565c0',
  mulheres: '#c2185b',
  criancas: '#f57c00',
  bebes: '#7b1fa2',
  online: '#00897b',
  voluntarios: '#2e7d32',
  apelos: '#e53935',
  atual: '#16548e',
  anterior: '#9e9e9e',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtData = (iso) => {
  if (!iso) return '';
  const [, m, d] = String(iso).split('-');
  return `${d}/${m}`;
};

const fmtDataLonga = (iso) => {
  if (!iso) return '';
  const [a, m, d] = String(iso).split('-');
  return `${d}/${m}/${a}`;
};

const primeiroDiaMes = () => {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-01`;
};
const hojeISO = () => new Date().toISOString().slice(0, 10);

/** Calcula o período anterior de mesmo tamanho */
const calcularPeriodoAnterior = (inicio, fim) => {
  if (!inicio || !fim) return { dataInicio: '', dataFim: '' };
  const dInicio = new Date(inicio);
  const dFim = new Date(fim);
  const dias = Math.round((dFim - dInicio) / 86400000) + 1;
  const novoFim = new Date(dInicio);
  novoFim.setDate(novoFim.getDate() - 1);
  const novoInicio = new Date(novoFim);
  novoInicio.setDate(novoInicio.getDate() - dias + 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { dataInicio: fmt(novoInicio), dataFim: fmt(novoFim) };
};

const delta = (atual, anterior) => {
  if (!anterior || anterior === 0) return atual > 0 ? 100 : 0;
  return Number(((atual - anterior) / anterior) * 100);
};

const corConsistencia = (idx) => {
  if (idx >= 80) return '#1e8449';
  if (idx >= 60) return '#c97a16';
  return '#b43030';
};

const tendenciaChip = (label) => {
  const map = {
    alta: { label: 'Tendência de alta', color: 'success' },
    queda: { label: 'Tendência de queda', color: 'error' },
    estavel: { label: 'Estável', color: 'default' },
  };
  const cfg = map[label] || map.estavel;
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

// ─── Seção com título ─────────────────────────────────────────────────────────
const Secao = ({ titulo, children }) => ( // eslint-disable-line react/prop-types
  <Box mb={3}>
    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
      <Divider sx={{ flex: 1, borderColor: 'primary.main', borderWidth: 1.5 }} />
      <Typography variant="subtitle1" fontWeight={700} color="primary.dark" sx={{ whiteSpace: 'nowrap', px: 1 }}>
        {titulo}
      </Typography>
      <Divider sx={{ flex: 1, borderColor: 'primary.main', borderWidth: 1.5 }} />
    </Box>
    {children}
  </Box>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const CultosReport = () => {
  const [ministerios, setMinisterios] = useState([]);
  const [campusOptions, setCampusOptions] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [ministerioId, setMinisterioId] = useState('');
  const [campusId, setCampusId] = useState('');
  const [tipoEventoIds, setTipoEventoIds] = useState([]);
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [data, setData] = useState(null);
  const [dataAnterior, setDataAnterior] = useState(null);
  const [comparar, setComparar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    listarMinisterios(true)
      .then((res) => setMinisterios(Array.isArray(res) ? res : []))
      .catch(() => setNotification('Erro ao carregar ministérios'));
    listarCampus()
      .then((res) => setCampusOptions(Array.isArray(res) ? res : []))
      .catch(() => setNotification('Erro ao carregar campus'));
    listarTiposEvento(true)
      .then((res) => setTiposEvento(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, []);

  // Quando um ministério é selecionado, filtra os campus vinculados a ele
  useEffect(() => {
    if (!ministerioId) {
      // Sem ministério: mostra todos os campus
      listarCampus()
        .then((res) => setCampusOptions(Array.isArray(res) ? res : []))
        .catch(() => {});
      return;
    }
    listarCampusPorMinisterio(ministerioId)
      .then((res) => setCampusOptions(Array.isArray(res) ? res : []))
      .catch(() => setNotification('Erro ao carregar campus do ministério'));
  }, [ministerioId]);

  const gerar = useCallback(async () => {
    setLoading(true);
    try {
      const tipoEventoIdsParam = tipoEventoIds.length > 0 ? tipoEventoIds.join(',') : undefined;
      const [atual, anterior] = await Promise.all([
        buscarRelatorioCultos({
          ministerioId, campusId, tipoEventoIds: tipoEventoIdsParam, dataInicio, dataFim
        }),
        comparar
          ? buscarRelatorioCultos({
            ministerioId,
            campusId,
            tipoEventoIds: tipoEventoIdsParam,
            ...calcularPeriodoAnterior(dataInicio, dataFim),
          })
          : Promise.resolve(null),
      ]);
      setData(atual);
      setDataAnterior(anterior);
    } catch (err) {
      setNotification(err.message || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  }, [ministerioId, campusId, tipoEventoIds, dataInicio, dataFim, comparar]);

  useEffect(() => { gerar(); }, []); // eslint-disable-line

  const ins = data?.insights || {};
  const insAnt = dataAnterior?.insights || {};
  const periodoAnterior = calcularPeriodoAnterior(dataInicio, dataFim);

  // Dados para gráficos
  const evolucao = useMemo(
    () => (data?.evolucaoPresenca || []).map((d) => ({ label: fmtData(d.data), value: d.presenca, titulos: d.titulos })),
    [data]
  );

  const engajamento = useMemo(
    () => (data?.engajamentoPorData || []).map((d) => ({
      label: fmtData(d.data),
      voluntarios: d.voluntarios,
      online: d.online,
      pessoasApelo: d.pessoasApelo,
    })),
    [data]
  );

  const composicaoPublico = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Homens', value: data.totalHomens || 0, fill: COR.homens },
      { label: 'Mulheres', value: data.totalMulheres || 0, fill: COR.mulheres },
      { label: 'Crianças', value: data.totalCriancas || 0, fill: COR.criancas },
      { label: 'Bebês', value: data.totalBebes || 0, fill: COR.bebes },
    ].filter((i) => i.value > 0);
  }, [data]);

  const diaSemana = useMemo(
    () => (data?.performanceDiaSemana || []).map((d) => ({
      label: d.diaSemana,
      mediaPresenca: Number(d.mediaPresenca || 0),
      taxaApelo: Number(d.taxaApelo || 0),
      mediaVoluntarios: Number(d.mediaVoluntarios || 0),
    })),
    [data]
  );

  const radarDias = useMemo(
    () => (data?.performanceDiaSemana || []).map((d) => ({
      subject: d.diaSemana,
      presenca: Number(d.mediaPresenca || 0),
      fullMark: Math.max(...(data?.performanceDiaSemana || []).map((x) => x.mediaPresenca || 0)) * 1.2,
    })),
    [data]
  );

  const evMinisterio = useMemo(() => {
    const ev = data?.evolucaoPresencaPorMinisterio || [];
    const mins = data?.ministeriosEvolucao || [];
    return { ev, mins };
  }, [data]);

  const comparativoKpis = useMemo(() => {
    if (!data || !dataAnterior) return [];
    return [
      {
        label: 'Cultos', atual: data.totalCultos, anterior: dataAnterior.totalCultos, fmt: fmtNumero
      },
      {
        label: 'Presença total', atual: data.totalPresenca, anterior: dataAnterior.totalPresenca, fmt: fmtNumero
      },
      {
        label: 'Média/culto', atual: ins.mediaPresencaCulto, anterior: insAnt.mediaPresencaCulto, fmt: fmtDecimal
      },
      {
        label: 'Voluntários', atual: data.totalVoluntarios, anterior: dataAnterior.totalVoluntarios, fmt: fmtNumero
      },
      {
        label: 'Taxa voluntariado', atual: ins.taxaVoluntariado, anterior: insAnt.taxaVoluntariado, fmt: (v) => fmtPercent(v), reverseColor: false
      },
      {
        label: 'Online', atual: data.totalOnline, anterior: dataAnterior.totalOnline, fmt: fmtNumero
      },
      {
        label: 'Taxa online', atual: ins.taxaOnline, anterior: insAnt.taxaOnline, fmt: (v) => fmtPercent(v)
      },
      {
        label: 'Apelos', atual: data.totalApelos, anterior: dataAnterior.totalApelos, fmt: fmtNumero
      },
      {
        label: 'Pessoas no apelo', atual: data.totalPessoasApelo, anterior: dataAnterior.totalPessoasApelo, fmt: fmtNumero
      },
      {
        label: 'Taxa resposta apelo', atual: ins.taxaRespostaApeloNosCultosComApelo, anterior: insAnt.taxaRespostaApeloNosCultosComApelo, fmt: (v) => fmtPercent(v)
      },
      {
        label: 'Índice consistência', atual: ins.indiceConsistencia, anterior: insAnt.indiceConsistencia, fmt: (v) => `${v}/100`
      },
      {
        label: 'Participação famílias', atual: ins.participacaoFamilias, anterior: insAnt.participacaoFamilias, fmt: (v) => fmtPercent(v)
      },
    ];
  }, [data, dataAnterior, ins, insAnt]);

  const exportarPdf = () => {
    if (!data) return;
    exportarPDF({
      fileName: 'relatorio-saude-cultos',
      title: 'Relatório de Saúde dos Cultos',
      subtitle: `${fmtDataLonga(dataInicio)} a ${fmtDataLonga(dataFim)}`,
      footer: 'Portal IECG | Saúde dos Cultos',
      meta: [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      cards: [
        { title: 'Cultos', value: fmtNumero(data.totalCultos), color: PDF.primary },
        { title: 'Presença total', value: fmtNumero(data.totalPresenca), color: PDF.primaryDark },
        { title: 'Média/culto', value: fmtDecimal(ins.mediaPresencaCulto), color: PDF.accent },
        { title: 'Consistência', value: `${ins.indiceConsistencia}/100`, color: PDF.warning },
      ],
      sections: [
        {
          title: 'Indicadores',
          columns: [{ label: 'Indicador', key: 'k', width: 80 }, {
            label: 'Valor', key: 'v', width: 30, align: 'right'
          }],
          rows: [
            { k: 'Total de cultos', v: fmtNumero(data.totalCultos) },
            { k: 'Presença total', v: fmtNumero(data.totalPresenca) },
            { k: 'Média por culto', v: fmtDecimal(ins.mediaPresencaCulto) },
            { k: 'Voluntários', v: `${fmtNumero(data.totalVoluntarios)} (${fmtPercent(ins.taxaVoluntariado)})` },
            { k: 'Online', v: `${fmtNumero(data.totalOnline)} (${fmtPercent(ins.taxaOnline)})` },
            { k: 'Cultos com apelo', v: `${fmtNumero(data.totalApelos)} (${fmtPercent(ins.taxaApeloCultos)})` },
            { k: 'Pessoas no apelo', v: fmtNumero(data.totalPessoasApelo) },
            { k: 'Taxa resposta (cultos c/ apelo)', v: fmtPercent(ins.taxaRespostaApeloNosCultosComApelo) },
            { k: 'Participação famílias', v: fmtPercent(ins.participacaoFamilias) },
            { k: 'Índice de consistência', v: `${ins.indiceConsistencia}/100` },
            { k: 'Tendência', v: ins.tendenciaLabel },
          ],
        },
        {
          title: 'Evolução de presença',
          columns: [{ label: 'Data', key: 'label', width: 25 }, {
            label: 'Presença', key: 'value', width: 20, align: 'right'
          }],
          rows: evolucao,
        },
        {
          title: 'Performance por dia da semana',
          columns: [
            { label: 'Dia', key: 'label', width: 20 },
            {
              label: 'Média presença', key: 'mediaPresenca', width: 25, align: 'right'
            },
            {
              label: 'Taxa apelo', key: 'taxaApelo', width: 20, align: 'right'
            },
          ],
          rows: diaSemana.map((d) => ({ label: d.label, mediaPresenca: fmtDecimal(d.mediaPresenca), taxaApelo: fmtPercent(d.taxaApelo) })),
        },
      ],
    });
  };

  const exportarExcelArquivo = () => {
    if (!data) return;
    exportarExcel('relatorio-saude-cultos', [
      {
        name: 'Indicadores',
        columns: [{ label: 'Indicador', key: 'k' }, { label: 'Valor', key: 'v' }],
        rows: [
          { k: 'Cultos', v: data.totalCultos },
          { k: 'Presença total', v: data.totalPresenca },
          { k: 'Homens', v: data.totalHomens },
          { k: 'Mulheres', v: data.totalMulheres },
          { k: 'Crianças', v: data.totalCriancas },
          { k: 'Bebês', v: data.totalBebes },
          { k: 'Online', v: data.totalOnline },
          { k: 'Voluntários', v: data.totalVoluntarios },
          { k: 'Apelos', v: data.totalApelos },
          { k: 'Pessoas no apelo', v: data.totalPessoasApelo },
          { k: 'Média por culto', v: ins.mediaPresencaCulto },
          { k: 'Taxa voluntariado (%)', v: ins.taxaVoluntariado },
          { k: 'Taxa online (%)', v: ins.taxaOnline },
          { k: 'Taxa apelo cultos (%)', v: ins.taxaApeloCultos },
          { k: 'Taxa resposta apelo (%)', v: ins.taxaRespostaApeloNosCultosComApelo },
          { k: 'Participação famílias (%)', v: ins.participacaoFamilias },
          { k: 'Índice consistência', v: ins.indiceConsistencia },
          { k: 'Tendência', v: ins.tendenciaLabel },
          { k: 'Séries ministradas', v: ins.totalSeriesMinistradas },
        ],
      },
      {
        name: 'Evolucao',
        columns: [{ label: 'Data', key: 'label' }, { label: 'Presença', key: 'value' }],
        rows: evolucao,
      },
      {
        name: 'Dia da semana',
        columns: [
          { label: 'Dia', key: 'label' },
          { label: 'Média presença', key: 'mediaPresenca' },
          { label: 'Taxa apelo (%)', key: 'taxaApelo' },
          { label: 'Média voluntários', key: 'mediaVoluntarios' },
        ],
        rows: diaSemana,
      },
      {
        name: 'Top cultos',
        columns: [
          { label: 'Pos', key: 'posicao' },
          { label: 'Data', key: 'data' },
          { label: 'Mensagem', key: 'tituloMensagem' },
          { label: 'Presença', key: 'presenca' },
        ],
        rows: (data?.topRegistrosPresenca || []),
      },
    ]);
  };

  return (
    <div>
      <Helmet><title>Saúde dos Cultos</title></Helmet>
      <PapperBlock title="Saúde dos Cultos" icon="ion-ios-analytics-outline" desc="Análise completa de presença, engajamento e tendências">

        {/* Filtros */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Ministério</InputLabel>
              <Select value={ministerioId} label="Ministério" onChange={(e) => setMinisterioId(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {ministerios.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Campus</InputLabel>
              <Select value={campusId} label="Campus" onChange={(e) => setCampusId(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {campusOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Evento</InputLabel>
              <Select
                multiple
                value={tipoEventoIds}
                onChange={(e) => setTipoEventoIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                input={<OutlinedInput label="Tipo de Evento" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => {
                      const te = tiposEvento.find((t) => t.id === id);
                      return <Chip key={id} label={te ? te.nome : id} size="small" />;
                    })}
                  </Box>
                )}
              >
                {tiposEvento.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" type="date" label="Início" InputLabelProps={{ shrink: true }} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" type="date" label="Fim" InputLabelProps={{ shrink: true }} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={gerar} disabled={loading} fullWidth>Gerar</Button>
          </Grid>
        </Grid>

        {/* Ações */}
        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Button
            variant={comparar ? 'contained' : 'outlined'}
            color={comparar ? 'secondary' : 'primary'}
            startIcon={<CompareArrowsIcon />}
            onClick={() => setComparar((v) => !v)}
          >
            {comparar ? 'Comparação ativa' : 'Comparar com período anterior'}
          </Button>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportarPdf} disabled={!data}>PDF</Button>
          <Button variant="outlined" startIcon={<TableViewIcon />} onClick={exportarExcelArquivo} disabled={!data}>Excel</Button>
        </Box>

        {comparar && dataInicio && dataFim && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Comparando <strong>{fmtDataLonga(dataInicio)} – {fmtDataLonga(dataFim)}</strong> com período anterior: <strong>{fmtDataLonga(periodoAnterior.dataInicio)} – {fmtDataLonga(periodoAnterior.dataFim)}</strong>
          </Alert>
        )}

        {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}

        {!loading && data && (
          <>
            {/* Alertas */}
            {(data.alertas || []).length > 0 && (
              <Box mb={2}>
                {data.alertas.map((a) => <Alert key={a} severity="warning" sx={{ mb: 0.5 }}>{a}</Alert>)}
              </Box>
            )}

            {/* ═══ SEÇÃO 1: VISÃO GERAL ══════════════════════════════════════ */}
            <Secao titulo="Visão Geral">
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4} md={2}>
                  <KpiCard
                    label="Cultos"
                    value={fmtNumero(data.totalCultos)}
                    color={COR.atual}
                    delta={comparar && dataAnterior ? delta(data.totalCultos, dataAnterior.totalCultos) : null}
                    deltaLabel={comparar && dataAnterior ? `ant: ${fmtNumero(dataAnterior.totalCultos)}` : ''}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <KpiCard
                    label="Presença total"
                    value={fmtNumero(data.totalPresenca)}
                    color="#14365c"
                    delta={comparar && dataAnterior ? delta(data.totalPresenca, dataAnterior.totalPresenca) : null}
                    deltaLabel={comparar && dataAnterior ? `ant: ${fmtNumero(dataAnterior.totalPresenca)}` : ''}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <KpiCard
                    label="Média/culto"
                    value={fmtDecimal(ins.mediaPresencaCulto)}
                    color={COR.voluntarios}
                    delta={comparar && dataAnterior ? delta(ins.mediaPresencaCulto, insAnt.mediaPresencaCulto) : null}
                    deltaLabel={comparar && dataAnterior ? `ant: ${fmtDecimal(insAnt.mediaPresencaCulto)}` : ''}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <Box>
                    <KpiCard
                      label="Consistência"
                      value={`${ins.indiceConsistencia}/100`}
                      subtitle="estabilidade de presença"
                      color={corConsistencia(ins.indiceConsistencia)}
                      delta={comparar && dataAnterior ? delta(ins.indiceConsistencia, insAnt.indiceConsistencia) : null}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <KpiCard
                    label="Tendência"
                    value={`${ins.tendenciaPercentual > 0 ? '+' : ''}${fmtDecimal(ins.tendenciaPercentual)}%`}
                    subtitle={ins.tendenciaLabel}
                    color={ins.tendenciaLabel === 'alta' ? COR.voluntarios : ins.tendenciaLabel === 'queda' ? COR.apelos : '#888'}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <KpiCard
                    label="Séries ativas"
                    value={fmtNumero(ins.totalSeriesMinistradas)}
                    subtitle={`${fmtNumero(ins.totalMensagensSerie)} msgs em série`}
                    color={COR.bebes}
                  />
                </Grid>
              </Grid>

              {/* Barra de consistência visual */}
              <Box mt={1.5}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="textSecondary">Índice de Consistência: {ins.indiceConsistencia}/100</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {ins.indiceConsistencia >= 80 ? 'Excelente' : ins.indiceConsistencia >= 60 ? 'Regular' : 'Atenção'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={ins.indiceConsistencia || 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': { bgcolor: corConsistencia(ins.indiceConsistencia) },
                  }}
                />
              </Box>
            </Secao>

            {/* ═══ SEÇÃO 2: EVOLUÇÃO DE PRESENÇA ══════════════════════════════ */}
            <Secao titulo="Evolução de Presença">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={evolucao} margin={{
                      top: 8, right: 16, left: 0, bottom: 0
                    }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis fontSize={11} />
                      <RTooltip />
                      <Legend />
                      <Bar dataKey="value" name="Presença" fill={COR.atual} radius={[3, 3, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Grid>

                {/* Evolução por ministério (se houver mais de um) */}
                {evMinisterio.mins.length > 1 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>Presença por ministério ao longo do período</Typography>
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart data={evMinisterio.ev} margin={{
                        top: 4, right: 16, left: 0, bottom: 0
                      }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                        <XAxis dataKey="data" fontSize={10} tickFormatter={fmtData} />
                        <YAxis fontSize={10} />
                        <RTooltip />
                        <Legend />
                        {evMinisterio.mins.map((m, i) => (
                          <Line key={m.id} type="monotone" dataKey={m.id} name={m.nome} stroke={Object.values(COR)[i % 8]} strokeWidth={2} dot={false} />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Grid>
                )}
              </Grid>
            </Secao>

            {/* ═══ SEÇÃO 3: COMPOSIÇÃO DO PÚBLICO ═════════════════════════════ */}
            <Secao titulo="Composição do Público">
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Homens"
                    value={fmtNumero(data.totalHomens)}
                    subtitle={`${fmtPercent(data.totalPresenca ? (data.totalHomens / data.totalPresenca) * 100 : 0)} do total`}
                    color={COR.homens}
                    delta={comparar && dataAnterior ? delta(data.totalHomens, dataAnterior.totalHomens) : null}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Mulheres"
                    value={fmtNumero(data.totalMulheres)}
                    subtitle={`${fmtPercent(data.totalPresenca ? (data.totalMulheres / data.totalPresenca) * 100 : 0)} do total`}
                    color={COR.mulheres}
                    delta={comparar && dataAnterior ? delta(data.totalMulheres, dataAnterior.totalMulheres) : null}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Crianças + Bebês"
                    value={fmtNumero((data.totalCriancas || 0) + (data.totalBebes || 0))}
                    subtitle={`${fmtPercent(ins.participacaoFamilias)} — famílias`}
                    color={COR.criancas}
                    delta={comparar && dataAnterior ? delta(ins.participacaoFamilias, insAnt.participacaoFamilias) : null}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Online"
                    value={fmtNumero(data.totalOnline)}
                    subtitle={`${fmtPercent(ins.taxaOnline)} do presencial`}
                    color={COR.online}
                    delta={comparar && dataAnterior ? delta(data.totalOnline, dataAnterior.totalOnline) : null}
                  />
                </Grid>

                {/* Pizza de composição */}
                <Grid item xs={12} md={5}>
                  <Typography variant="caption" color="textSecondary">Distribuição do público presencial</Typography>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={composicaoPublico} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                        {composicaoPublico.map((entry) => <Cell key={entry.label} fill={entry.fill} />)}
                      </Pie>
                      <RTooltip formatter={(v) => fmtNumero(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>

                {/* Engajamento ao longo do tempo */}
                <Grid item xs={12} md={7}>
                  <Typography variant="caption" color="textSecondary">Voluntários e online por culto</Typography>
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={engajamento} margin={{
                      top: 4, right: 8, left: 0, bottom: 0
                    }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                      <XAxis dataKey="label" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RTooltip />
                      <Legend />
                      <Bar dataKey="voluntarios" name="Voluntários" fill={COR.voluntarios} radius={[2, 2, 0, 0]} />
                      <Line type="monotone" dataKey="online" name="Online" stroke={COR.online} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </Secao>

            {/* ═══ SEÇÃO 4: VOLUNTARIADO ════════════════════════════════════════ */}
            <Secao titulo="Voluntariado">
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Total voluntários"
                    value={fmtNumero(data.totalVoluntarios)}
                    color={COR.voluntarios}
                    delta={comparar && dataAnterior ? delta(data.totalVoluntarios, dataAnterior.totalVoluntarios) : null}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Média/culto"
                    value={fmtDecimal(ins.mediaVoluntariosCulto)}
                    color={COR.voluntarios}
                    delta={comparar && dataAnterior ? delta(ins.mediaVoluntariosCulto, insAnt.mediaVoluntariosCulto) : null}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Taxa de voluntariado"
                    value={fmtPercent(ins.taxaVoluntariado)}
                    subtitle="voluntários / presença"
                    color={ins.taxaVoluntariado >= 8 ? COR.voluntarios : COR.apelos}
                    delta={comparar && dataAnterior ? delta(ins.taxaVoluntariado, insAnt.taxaVoluntariado) : null}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Referência saudável"
                    value="≥ 8%"
                    subtitle={ins.taxaVoluntariado >= 8 ? 'Dentro do esperado' : 'Abaixo do esperado'}
                    color={ins.taxaVoluntariado >= 8 ? COR.voluntarios : COR.apelos}
                  />
                </Grid>
              </Grid>
            </Secao>

            {/* ═══ SEÇÃO 5: ANÁLISE DE APELOS ════════════════════════════════ */}
            <Secao titulo="Análise de Apelos">
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Cultos com apelo"
                    value={fmtNumero(data.totalApelos)}
                    subtitle={`${fmtPercent(ins.taxaApeloCultos)} dos cultos`}
                    color={COR.apelos}
                    delta={comparar && dataAnterior ? delta(data.totalApelos, dataAnterior.totalApelos) : null}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Pessoas no apelo"
                    value={fmtNumero(data.totalPessoasApelo)}
                    color={COR.apelos}
                    delta={comparar && dataAnterior ? delta(data.totalPessoasApelo, dataAnterior.totalPessoasApelo) : null}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Média/apelo"
                    value={fmtDecimal(ins.mediaPessoasPorApelo)}
                    subtitle="pessoas por culto com apelo"
                    color={COR.apelos}
                    delta={comparar && dataAnterior ? delta(ins.mediaPessoasPorApelo, insAnt.mediaPessoasPorApelo) : null}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <KpiCard
                    label="Taxa resposta"
                    value={fmtPercent(ins.taxaRespostaApeloNosCultosComApelo)}
                    subtitle="nos cultos com apelo"
                    color={COR.apelos}
                    delta={comparar && dataAnterior ? delta(ins.taxaRespostaApeloNosCultosComApelo, insAnt.taxaRespostaApeloNosCultosComApelo) : null}
                  />
                </Grid>

                {/* Gráfico apelo por culto */}
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Pessoas no apelo por culto</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={(data.engajamentoPorData || []).map((d) => ({ label: fmtData(d.data), apelo: d.pessoasApelo }))} margin={{
                      top: 4, right: 8, left: 0, bottom: 0
                    }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                      <XAxis dataKey="label" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RTooltip />
                      <Bar dataKey="apelo" name="Pessoas no apelo" fill={COR.apelos} radius={[3, 3, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </Secao>

            {/* ═══ SEÇÃO 6: PERFORMANCE POR DIA DA SEMANA ════════════════════ */}
            <Secao titulo="Performance por Dia da Semana">
              <Grid container spacing={2}>
                <Grid item xs={12} md={7}>
                  <Typography variant="caption" color="textSecondary">Média de presença e voluntários por dia</Typography>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={diaSemana} margin={{
                      top: 4, right: 8, left: 0, bottom: 0
                    }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis yAxisId="left" fontSize={10} />
                      <YAxis yAxisId="right" orientation="right" fontSize={10} unit="%" domain={[0, 100]} />
                      <RTooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="mediaPresenca" name="Média presença" fill={COR.atual} radius={[3, 3, 0, 0]} />
                      <Bar yAxisId="left" dataKey="mediaVoluntarios" name="Média voluntários" fill={COR.voluntarios} radius={[3, 3, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="taxaApelo" name="Taxa apelo %" stroke={COR.apelos} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Typography variant="caption" color="textSecondary">Radar de presença por dia</Typography>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarDias}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" fontSize={11} />
                      <PolarRadiusAxis angle={30} fontSize={9} />
                      <Radar name="Presença" dataKey="presenca" stroke={COR.atual} fill={COR.atual} fillOpacity={0.4} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </Secao>

            {/* ═══ SEÇÃO 7: TOP CULTOS ════════════════════════════════════════ */}
            {(data.topRegistrosPresenca || []).length > 0 && (
              <Secao titulo="Top 5 Cultos por Presença">
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 40, fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Mensagem</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Ministério</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Presença</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.topRegistrosPresenca.map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell>
                            <Chip label={`#${r.posicao}`} size="small" color={r.posicao === 1 ? 'warning' : 'default'} />
                          </TableCell>
                          <TableCell>{fmtDataLonga(r.data)}</TableCell>
                          <TableCell>{r.tituloMensagem}</TableCell>
                          <TableCell>{r.ministerio}</TableCell>
                          <TableCell align="right"><strong>{fmtNumero(r.presenca)}</strong></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Secao>
            )}

            {/* ═══ SEÇÃO 8: COMPARATIVO COM PERÍODO ANTERIOR ══════════════════ */}
            {comparar && dataAnterior && comparativoKpis.length > 0 && (
              <Secao titulo={`Comparativo: Atual vs ${fmtDataLonga(periodoAnterior.dataInicio)} – ${fmtDataLonga(periodoAnterior.dataFim)}`}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.dark' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Indicador</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>Período atual</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>Período anterior</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>Variação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {comparativoKpis.map((k) => {
                        const d = delta(k.atual, k.anterior);
                        const cor = d > 0 ? 'success.main' : d < 0 ? 'error.main' : 'text.secondary';
                        return (
                          <TableRow key={k.label} hover>
                            <TableCell>{k.label}</TableCell>
                            <TableCell align="right"><strong>{k.fmt(k.atual)}</strong></TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>{k.fmt(k.anterior)}</TableCell>
                            <TableCell align="right" sx={{ color: cor, fontWeight: 700 }}>
                              <Tooltip title={`${d > 0 ? '+' : ''}${d.toFixed(1)}%`}>
                                <span>{d > 0 ? '▲' : d < 0 ? '▼' : '─'} {Math.abs(d).toFixed(1)}%</span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box mt={1} display="flex" gap={1} alignItems="center">
                  {tendenciaChip(ins.tendenciaLabel)}
                  <Typography variant="caption" color="textSecondary">
                    baseada na evolução interna do período atual
                  </Typography>
                </Box>
              </Secao>
            )}
          </>
        )}

        {notification && <Notification message={notification} close={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default CultosReport;
