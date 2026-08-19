import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import {
  Grid,
  TextField,
  MenuItem,
  Button,
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Divider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { PapperBlock } from 'dan-components';
import KpiCard from './components/KpiCard';
import ChartCard from './components/ChartCard';
import {
  exportarPDF, exportarExcel, fmtNumero, PDF
} from './utils/exportHelpers';
import { buscarRelatorioDirecionamentos } from '../../../api/reportsApi';
import { listarCampus } from '../../../api/campusApi';

const SerieSeries = [
  {
    key: 'total', label: 'Total', type: 'bar', color: '#16548e'
  },
  {
    key: 'consolidados', label: 'Consolidados', type: 'line', color: '#1e8449'
  }
];

const REDE_OPTIONS = [
  'RELEVANTE JUNIORS RAPAZES',
  'RELEVANTEEN RAPAZES',
  'RELEVANTEEN MOÇAS',
  'JUVENTUDE RELEVANTE RAPAZES',
  'MULHERES IECG',
  'IECG KIDS',
  'HOMENS IECG',
  'JUVENTUDE RELEVANTE MOÇAS',
  'RELEVANTE JUNIORS MOÇAS',
];

// Tipo de direcionamento (campo decisao do apelo).
const DECISAO_OPTIONS = [
  { value: 'apelo_decisao', label: 'Aceitar Jesus' },
  { value: 'apelo_volta', label: 'Voltar para Jesus' },
  { value: 'encaminhamento_celula', label: 'Encaminhamento de Célula' },
];

const DirecionamentosReport = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rede, setRede] = useState('');
  const [decisao, setDecisao] = useState('');
  const [campus, setCampus] = useState('');
  const [campi, setCampi] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gerar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await buscarRelatorioDirecionamentos({
        dateFrom, dateTo, rede, campus, decisao
      });
      setData(res);
    } catch (e) {
      setError(e.message || 'Erro ao gerar relatório de direcionamentos.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, rede, campus, decisao]);

  // Carrega uma vez ao abrir (all-time). Filtros usam o botão Gerar.
  useEffect(() => {
    gerar();
  }, []);

  useEffect(() => {
    listarCampus()
      .then((res) => setCampi(Array.isArray(res) ? res : []))
      .catch(() => setCampi([]));
  }, []);

  const resumo = data?.resumo || {};

  const metaFiltros = () => {
    const parts = [];
    if (dateFrom || dateTo) parts.push(`Periodo: ${dateFrom || '...'} a ${dateTo || '...'}`);
    if (campus) parts.push(`Campus: ${campus}`);
    if (rede) parts.push(`Rede: ${rede}`);
    if (decisao) {
      const dlabel = DECISAO_OPTIONS.find((o) => o.value === decisao)?.label || decisao;
      parts.push(`Tipo: ${dlabel}`);
    }
    return parts.length ? parts.join('  |  ') : 'Todos os periodos e campus';
  };

  const buildCards = (r) => [
    { title: 'Total de apelos', value: fmtNumero(data.total) },
    {
      title: 'Consolidados', value: fmtNumero(r.consolidados), subtitle: `${r.taxaConsolidacaoGeral}% dos com celula`, color: PDF.accent
    },
    { title: 'Em consolidacao', value: fmtNumero(r.emConsolidacao) },
    { title: 'Nao consolidados', value: fmtNumero(r.naoConsolidados), color: PDF.danger },
    { title: 'Buscaram celula', value: fmtNumero(r.buscaramCelula), color: PDF.warning },
    {
      title: 'Buscaram e consolidaram', value: fmtNumero(r.buscaramEConsolidados), subtitle: `${r.taxaConsolidacaoBusca}% conversao`, color: PDF.accent
    },
    { title: 'Aceitaram Jesus', value: fmtNumero(r.aceitaramJesus) },
    { title: 'Voltaram para Cristo', value: fmtNumero(r.voltaram) },
    { title: 'Procuraram + de 1 vez', value: fmtNumero(r.procuraramMaisDeUmaVez), color: PDF.warning },
  ];

  const colQtd = [
    { label: 'Descrição', key: 'label', width: 140 },
    {
      label: 'Qtd', key: 'value', width: 40, align: 'right'
    }
  ];

  const handleExportPDF = () => {
    if (!data) return;
    exportarPDF({
      fileName: 'relatorio-direcionamento',
      title: 'Relatório de Direcionamento',
      subtitle: 'Consolidação, decisões e evolução dos apelos direcionados',
      meta: [metaFiltros()],
      footer: 'Portal IECG | Relatório de Direcionamento',
      cards: buildCards(resumo),
      sections: [
        { title: 'Por status', columns: colQtd, rows: data.porStatus },
        { title: 'Por decisão', columns: colQtd, rows: data.porDecisao },
        { title: 'Por rede', columns: colQtd, rows: data.porRede },
        {
          title: 'Evolução mensal',
          columns: [
            { label: 'Mês', key: 'label', width: 80 },
            {
              label: 'Total', key: 'total', width: 50, align: 'right'
            },
            {
              label: 'Consolidados', key: 'consolidados', width: 50, align: 'right'
            }
          ],
          rows: data.serie
        },
      ],
    });
  };

  const handleExportExcel = () => {
    if (!data) return;
    const r = resumo;
    exportarExcel('relatorio-direcionamento', [
      {
        name: 'Resumo',
        columns: [{ label: 'Métrica', key: 'metrica' }, { label: 'Valor', key: 'valor' }],
        rows: [
          { metrica: 'Total de apelos', valor: data.total },
          { metrica: 'Consolidados', valor: r.consolidados },
          { metrica: 'Em consolidação', valor: r.emConsolidacao },
          { metrica: 'Não consolidados', valor: r.naoConsolidados },
          { metrica: 'Com célula', valor: r.comCelula },
          { metrica: 'Buscaram célula', valor: r.buscaramCelula },
          { metrica: 'Buscaram e consolidaram', valor: r.buscaramEConsolidados },
          { metrica: 'Taxa consolidação (buscaram) %', valor: r.taxaConsolidacaoBusca },
          { metrica: 'Taxa consolidação (geral) %', valor: r.taxaConsolidacaoGeral },
          { metrica: 'Aceitaram Jesus', valor: r.aceitaramJesus },
          { metrica: 'Voltaram para Cristo', valor: r.voltaram },
          { metrica: 'Procuraram o Start + de 1 vez', valor: r.procuraramMaisDeUmaVez },
          { metrica: 'Total de buscas ao Start', valor: r.totalBuscas },
        ]
      },
      { name: 'Por status', columns: [{ label: 'Status', key: 'label' }, { label: 'Qtd', key: 'value' }], rows: data.porStatus },
      { name: 'Por decisão', columns: [{ label: 'Decisão', key: 'label' }, { label: 'Qtd', key: 'value' }], rows: data.porDecisao },
      { name: 'Por rede', columns: [{ label: 'Rede', key: 'label' }, { label: 'Qtd', key: 'value' }], rows: data.porRede },
      {
        name: 'Evolução mensal',
        columns: [{ label: 'Mês', key: 'label' }, { label: 'Total', key: 'total' }, { label: 'Consolidados', key: 'consolidados' }],
        rows: data.serie
      },
    ]);
  };

  return (
    <PapperBlock
      title="Relatório de Direcionamento"
      icon="ion-ios-git-network-outline"
      desc="Consolidação, decisões e evolução dos apelos direcionados"
    >
      <Helmet><title>Relatório de Direcionamento</title></Helmet>

      <Grid container spacing={2} alignItems="flex-end" sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <TextField
            label="De"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            label="Até"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            select
            label="Campus"
            size="small"
            fullWidth
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {campi.map((c) => (
              <MenuItem key={c.id || c.nome} value={c.nome}>{c.nome}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            select
            label="Rede"
            size="small"
            fullWidth
            value={rede}
            onChange={(e) => setRede(e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {REDE_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            select
            label="Tipo de direcionamento"
            size="small"
            fullWidth
            value={decisao}
            onChange={(e) => setDecisao(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {DECISAO_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={gerar}
              disabled={loading}
            >
              {loading ? 'Gerando…' : 'Gerar'}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              color="error"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExportPDF}
              disabled={loading || !data}
            >
              PDF
            </Button>
            <Button
              variant="outlined"
              color="success"
              startIcon={<TableChartIcon />}
              onClick={handleExportExcel}
              disabled={loading || !data}
            >
              Excel
            </Button>
          </Stack>
        </Grid>
      </Grid>

      {loading && (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      )}
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {data && !loading && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>
              <KpiCard label="Total de apelos" value={data.total} color="#16548e" />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="Consolidados"
                value={resumo.consolidados}
                color="#1e8449"
                subtitle={`${resumo.taxaConsolidacaoGeral}% dos que têm célula`}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard label="Em consolidação" value={resumo.emConsolidacao} color="#8e44ad" />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard label="Não consolidados" value={resumo.naoConsolidados} color="#b43030" />
            </Grid>

            <Grid item xs={6} md={3}>
              <KpiCard
                label="Buscaram célula"
                value={resumo.buscaramCelula}
                color="#c97a16"
                subtitle="decisão: encaminhamento"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="Buscaram e consolidaram"
                value={resumo.buscaramEConsolidados}
                color="#1e8449"
                subtitle={`${resumo.taxaConsolidacaoBusca}% de conversão`}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard label="Aceitaram Jesus" value={resumo.aceitaramJesus} color="#0f9bb0" />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard label="Voltaram para Cristo" value={resumo.voltaram} color="#2e86de" />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard label="Procuraram o Start + de 1 vez" value={resumo.procuraramMaisDeUmaVez} color="#c97a16" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Comparativo — quem buscou célula
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    <Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Buscaram célula (encaminhamento)</Typography>
                        <Typography variant="body2" fontWeight={700}>{resumo.buscaramCelula}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={100} sx={{ height: 8, borderRadius: 1, mt: 0.5 }} />
                    </Box>
                    <Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Desses, consolidaram</Typography>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          {resumo.buscaramEConsolidados} ({resumo.taxaConsolidacaoBusca}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        color="success"
                        value={Math.min(100, resumo.taxaConsolidacaoBusca || 0)}
                        sx={{ height: 8, borderRadius: 1, mt: 0.5 }}
                      />
                    </Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Aceitaram Jesus</Typography>
                      <Typography variant="body2" fontWeight={700}>{resumo.aceitaramJesus}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Voltaram para Cristo</Typography>
                      <Typography variant="body2" fontWeight={700}>{resumo.voltaram}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={7}>
              <ChartCard title="Apelos por status" type="bar" data={data.porStatus} />
            </Grid>

            <Grid item xs={12} md={5}>
              <ChartCard title="Por decisão" type="pie" data={data.porDecisao} />
            </Grid>
            <Grid item xs={12} md={7}>
              <ChartCard title="Por rede" type="bar" data={data.porRede} />
            </Grid>

            <Grid item xs={12}>
              <ChartCard
                title="Evolução mensal (total × consolidados)"
                type="composed"
                data={data.serie}
                series={SerieSeries}
                height={320}
              />
            </Grid>
          </Grid>
        </>
      )}
    </PapperBlock>
  );
};

export default DirecionamentosReport;
