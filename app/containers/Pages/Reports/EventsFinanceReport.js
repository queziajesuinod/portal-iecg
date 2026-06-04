import React, { useCallback, useEffect, useState } from 'react';
import {
  Grid, Box, Button, FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import { Helmet } from 'react-helmet';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { buscarRelatorioEventosFinanceiro } from '../../../api/reportsApi';
import { listarEventos } from '../../../api/eventsApi';
import KpiCard from './components/KpiCard';
import ChartCard from './components/ChartCard';
import {
  exportarPDF, exportarExcel, fmtMoeda, fmtNumero, PDF,
} from './utils/exportHelpers';

const EventsFinanceReport = () => {
  const [eventos, setEventos] = useState([]);
  const [eventId, setEventId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    listarEventos({ includeFinished: true })
      .then((res) => setEventos(Array.isArray(res) ? res : (res?.data || [])))
      .catch(() => setNotification('Erro ao carregar eventos'));
  }, []);

  const gerar = useCallback(() => {
    setLoading(true);
    buscarRelatorioEventosFinanceiro({ eventId, dateFrom, dateTo })
      .then(setData)
      .catch((err) => setNotification(err.message || 'Erro ao gerar relatório'))
      .finally(() => setLoading(false));
  }, [eventId, dateFrom, dateTo]);

  useEffect(() => { gerar(); }, []);

  const moedaFmt = (v) => fmtMoeda(v);

  const exportarPdf = () => {
    if (!data) return;
    const r = data.resumo;
    exportarPDF({
      fileName: 'relatorio-eventos-financeiro',
      title: 'Relatório de Eventos e Finanças',
      subtitle: 'Receita, taxas, inscrições e despesas',
      footer: 'Portal IECG | Relatórios',
      meta: [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      cards: [
        {
          title: 'Receita bruta', value: fmtMoeda(r.receitaBruta), subtitle: 'total pago pelo comprador', color: PDF.accent
        },
        {
          title: 'Taxa cliente', value: fmtMoeda(r.totalTaxaCliente), subtitle: 'repassada ao comprador', color: PDF.warning
        },
        {
          title: 'Taxa lojista', value: fmtMoeda(r.totalTaxaLojista), subtitle: 'absorvida pela org.', color: PDF.danger
        },
        {
          title: 'Receita líquida', value: fmtMoeda(r.receitaLiquida), subtitle: 'bruta − taxas totais', color: PDF.primary
        },
      ],
      sections: [
        {
          title: 'Por método de pagamento',
          columns: [
            { label: 'Método', key: 'label', width: 36 },
            {
              label: 'Qtd', key: 'quantidade', width: 12, align: 'right'
            },
            {
              label: 'Rec. Bruta', key: 'receita', width: 28, align: 'right'
            },
            {
              label: 'Taxa Cliente', key: 'taxaCliente', width: 24, align: 'right'
            },
            {
              label: 'Taxa Lojista', key: 'taxaLojista', width: 24, align: 'right'
            },
            {
              label: 'Rec. Líquida', key: 'liquido', width: 28, align: 'right'
            },
          ],
          rows: data.receitaPorMetodo.map((i) => ({
            label: i.label,
            quantidade: fmtNumero(i.quantidade),
            receita: fmtMoeda(i.receita),
            taxaCliente: fmtMoeda(i.taxaCliente),
            taxaLojista: fmtMoeda(i.taxaLojista),
            liquido: fmtMoeda(i.liquido),
          })),
        },
        {
          title: 'Por evento',
          columns: [
            { label: 'Evento', key: 'evento', width: 48 },
            {
              label: 'Capacidade', key: 'capacidade', width: 18, align: 'right'
            },
            {
              label: 'Inscritos', key: 'inscritos', width: 16, align: 'right'
            },
            {
              label: 'Ocupação', key: 'ocupacao', width: 16, align: 'right'
            },
            {
              label: 'Rec. Bruta', key: 'receita', width: 24, align: 'right'
            },
            {
              label: 'Saldo', key: 'saldo', width: 24, align: 'right'
            },
          ],
          rows: data.eventos.map((e) => ({
            evento: e.evento,
            capacidade: e.capacidade != null ? fmtNumero(e.capacidade) : 'Ilimitado',
            inscritos: fmtNumero(e.inscritos),
            ocupacao: e.ocupacao != null ? `${e.ocupacao}%` : '—',
            receita: fmtMoeda(e.receita),
            saldo: fmtMoeda(e.saldo),
          })),
        },
        {
          title: 'Fluxo de caixa mensal',
          columns: [
            { label: 'Mês', key: 'label', width: 30 },
            {
              label: 'Receita', key: 'receita', width: 30, align: 'right'
            },
            {
              label: 'Despesa', key: 'despesa', width: 30, align: 'right'
            },
            {
              label: 'Saldo', key: 'saldo', width: 30, align: 'right'
            },
          ],
          rows: data.fluxoCaixa.map((f) => ({
            label: f.label, receita: fmtMoeda(f.receita), despesa: fmtMoeda(f.despesa), saldo: fmtMoeda(f.saldo),
          })),
        },
      ],
    });
  };

  const exportarExcelArquivo = () => {
    if (!data) return;
    exportarExcel('relatorio-eventos-financeiro', [
      {
        name: 'Resumo',
        columns: [{ label: 'Indicador', key: 'k' }, { label: 'Valor', key: 'v' }],
        rows: [
          { k: 'Receita bruta', v: data.resumo.receitaBruta },
          { k: 'Taxa repassada ao cliente', v: data.resumo.totalTaxaCliente },
          { k: 'Taxa absorvida pela org. (lojista)', v: data.resumo.totalTaxaLojista },
          { k: 'Total de taxas', v: data.resumo.totalTaxas },
          { k: 'Receita líquida (bruta − taxas totais)', v: data.resumo.receitaLiquida },
          { k: 'Receita prevista (confirm./parcial)', v: data.resumo.receitaPrevista },
          { k: 'Descontos', v: data.resumo.totalDescontos },
          { k: 'Despesa total', v: data.resumo.despesaTotal },
          { k: 'Despesa liquidada', v: data.resumo.despesaLiquidada },
          { k: 'Despesa pendente', v: data.resumo.despesaPendente },
          { k: 'Saldo (líquido − despesas liq.)', v: data.resumo.saldo },
          { k: 'Pedidos (total)', v: data.resumo.totalInscricoes },
          { k: 'Inscritos confirmados/parciais', v: data.resumo.totalInscritos },
          { k: 'Taxa de conversão (%)', v: data.resumo.taxaConversao },
        ],
      },
      {
        name: 'Por metodo',
        columns: [
          { label: 'Método', key: 'label' },
          { label: 'Quantidade', key: 'quantidade' },
          { label: 'Rec. Bruta', key: 'receita' },
          { label: 'Taxa Cliente', key: 'taxaCliente' },
          { label: 'Taxa Lojista', key: 'taxaLojista' },
          { label: 'Rec. Líquida', key: 'liquido' },
        ],
        rows: data.receitaPorMetodo,
      },
      { name: 'Receita por canal', columns: [{ label: 'Canal', key: 'label' }, { label: 'Valor', key: 'value' }], rows: data.receitaPorCanal },
      { name: 'Despesa por metodo', columns: [{ label: 'Método', key: 'label' }, { label: 'Valor', key: 'value' }], rows: data.despesaPorMetodo },
      {
        name: 'Por evento',
        columns: [
          { label: 'Evento', key: 'evento' },
          { label: 'Capacidade', key: 'capacidade' },
          { label: 'Inscritos', key: 'inscritos' },
          { label: 'Ocupação (%)', key: 'ocupacao' },
          { label: 'Rec. Bruta', key: 'receita' },
          { label: 'Despesa', key: 'despesa' },
          { label: 'Saldo', key: 'saldo' },
        ],
        rows: data.eventos,
      },
      {
        name: 'Fluxo de caixa',
        columns: [
          { label: 'Mês', key: 'label' },
          { label: 'Receita', key: 'receita' },
          { label: 'Despesa', key: 'despesa' },
          { label: 'Saldo', key: 'saldo' },
        ],
        rows: data.fluxoCaixa,
      },
    ]);
  };

  return (
    <div>
      <Helmet><title>Relatório de Eventos e Finanças</title></Helmet>
      <PapperBlock title="Relatório de Eventos e Finanças" icon="ion-ios-cash" desc="Receita, taxas, inscrições, despesas e fluxo de caixa">
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Evento</InputLabel>
              <Select value={eventId} label="Evento" onChange={(e) => setEventId(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {eventos.map((ev) => <MenuItem key={ev.id} value={ev.id}>{ev.title}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" type="date" label="De" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" type="date" label="Até" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={gerar} disabled={loading}>Gerar</Button>
          </Grid>
        </Grid>

        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportarPdf} disabled={!data}>PDF</Button>
          <Button variant="outlined" startIcon={<TableViewIcon />} onClick={exportarExcelArquivo} disabled={!data}>Excel</Button>
        </Box>

        {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}

        {!loading && data && (
          <>
            {/* KPIs principais */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <KpiCard label="Receita bruta" value={fmtMoeda(data.resumo.receitaBruta)} subtitle="total pago pelo comprador" color="#1e8449" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <KpiCard label="Taxa cliente" value={fmtMoeda(data.resumo.totalTaxaCliente)} subtitle="repassada ao comprador" color="#c97a16" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <KpiCard label="Taxa lojista" value={fmtMoeda(data.resumo.totalTaxaLojista)} subtitle="absorvida pela organização" color="#b43030" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <KpiCard label="Receita líquida" value={fmtMoeda(data.resumo.receitaLiquida)} subtitle="bruta − taxas totais" color="#16548e" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <KpiCard label="Despesas liq." value={fmtMoeda(data.resumo.despesaLiquidada)} subtitle={`Pendente: ${fmtMoeda(data.resumo.despesaPendente)}`} color="#6a1a1a" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <KpiCard label="Saldo" value={fmtMoeda(data.resumo.saldo)} subtitle="líquida − despesas liq." color="#14365c" />
              </Grid>
            </Grid>

            {/* Tabela por método */}
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Por método de pagamento</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.dark' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>Método</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>Qtd</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>Rec. Bruta</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>Taxa Cliente</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>Taxa Lojista</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>Rec. Líquida</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.receitaPorMetodo.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center">Sem pagamentos confirmados.</TableCell></TableRow>
                  )}
                  {data.receitaPorMetodo.map((m) => (
                    <TableRow key={m.key} hover>
                      <TableCell>{m.label}</TableCell>
                      <TableCell align="right">{fmtNumero(m.quantidade)}</TableCell>
                      <TableCell align="right">{fmtMoeda(m.receita)}</TableCell>
                      <TableCell align="right" sx={{ color: m.taxaCliente > 0 ? 'warning.main' : 'text.secondary' }}>
                        {fmtMoeda(m.taxaCliente)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: m.taxaLojista > 0 ? 'error.main' : 'text.secondary' }}>
                        {fmtMoeda(m.taxaLojista)}
                      </TableCell>
                      <TableCell align="right">{fmtMoeda(m.liquido)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Gráficos */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <ChartCard
                  title="Fluxo de caixa mensal"
                  type="composed"
                  data={data.fluxoCaixa}
                  series={[
                    {
                      key: 'receita', label: 'Receita', type: 'bar', color: '#1e8449'
                    },
                    {
                      key: 'despesa', label: 'Despesa', type: 'bar', color: '#b43030'
                    },
                    {
                      key: 'saldo', label: 'Saldo', type: 'line', color: '#16548e'
                    },
                  ]}
                  valueFormatter={moedaFmt}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <ChartCard title="Receita bruta por método" type="pie" data={data.receitaPorMetodo} valueFormatter={moedaFmt} />
              </Grid>
              <Grid item xs={12} md={4}>
                <ChartCard title="Receita por canal" type="pie" data={data.receitaPorCanal} valueFormatter={moedaFmt} />
              </Grid>
              <Grid item xs={12} md={4}>
                <ChartCard title="Pedidos por status" type="bar" data={data.porStatusInscricao} />
              </Grid>
            </Grid>

            {/* Tabela por evento */}
            <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mt: 3 }}>Por evento</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Evento</TableCell>
                    <TableCell align="right">Capacidade</TableCell>
                    <TableCell align="right">Inscritos</TableCell>
                    <TableCell align="right">Ocupação</TableCell>
                    <TableCell align="right">Rec. Bruta</TableCell>
                    <TableCell align="right">Despesa</TableCell>
                    <TableCell align="right">Saldo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.eventos.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center">Sem dados.</TableCell></TableRow>
                  )}
                  {data.eventos.map((e) => {
                    const lotado = e.ocupacao != null && e.ocupacao >= 100;
                    const quaseCheiO = e.ocupacao != null && e.ocupacao >= 80 && e.ocupacao < 100;
                    return (
                      <TableRow key={e.eventId} hover>
                        <TableCell>{e.evento}</TableCell>
                        <TableCell align="right">{e.capacidade != null ? fmtNumero(e.capacidade) : '—'}</TableCell>
                        <TableCell align="right">{fmtNumero(e.inscritos)}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            color: lotado ? 'success.main' : quaseCheiO ? 'warning.main' : 'text.primary',
                          }}
                        >
                          {e.ocupacao != null ? `${e.ocupacao}%` : '—'}
                        </TableCell>
                        <TableCell align="right">{fmtMoeda(e.receita)}</TableCell>
                        <TableCell align="right">{fmtMoeda(e.despesa)}</TableCell>
                        <TableCell align="right">{fmtMoeda(e.saldo)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {notification && <Notification message={notification} close={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default EventsFinanceReport;
