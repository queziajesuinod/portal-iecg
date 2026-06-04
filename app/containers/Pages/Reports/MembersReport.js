import React, { useCallback, useEffect, useState } from 'react';
import {
  Grid, Box, Button, FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import { Helmet } from 'react-helmet';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import { buscarRelatorioMembros } from '../../../api/reportsApi';
import { listarCampus } from '../../../api/campusApi';
import KpiCard from './components/KpiCard';
import ChartCard from './components/ChartCard';
import {
  exportarPDF, exportarExcel, fmtNumero, PDF,
} from './utils/exportHelpers';

const STATUS_OPCOES = [
  'VISITANTE', 'CONGREGADO', 'MEMBRO', 'INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO',
];

const MembersReport = () => {
  const [campusOptions, setCampusOptions] = useState([]);
  const [campusId, setCampusId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    listarCampus()
      .then((res) => setCampusOptions(Array.isArray(res) ? res : []))
      .catch(() => setNotification('Erro ao carregar campus'));
  }, []);

  const gerar = useCallback(() => {
    setLoading(true);
    buscarRelatorioMembros({
      campusId, status, dateFrom, dateTo,
    })
      .then(setData)
      .catch((err) => setNotification(err.message || 'Erro ao gerar relatório'))
      .finally(() => setLoading(false));
  }, [campusId, status, dateFrom, dateTo]);

  // Gera automaticamente ao abrir
  useEffect(() => { gerar(); }, []);

  const exportarPdf = () => {
    if (!data) return;
    exportarPDF({
      fileName: 'relatorio-membros',
      title: 'Relatório de Membros',
      subtitle: 'Demografia e crescimento',
      footer: 'Portal IECG | Relatórios',
      meta: [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      cards: [
        {
          title: 'Total', value: fmtNumero(data.resumo.total), subtitle: 'membros', color: PDF.primary
        },
        {
          title: 'Ativos', value: fmtNumero(data.resumo.ativos), subtitle: 'visitante/congregado/membro', color: PDF.accent
        },
        {
          title: 'Inativos', value: fmtNumero(data.resumo.inativos), subtitle: 'demais status', color: PDF.warning
        },
        {
          title: 'Campus', value: fmtNumero(data.resumo.campos), subtitle: 'com membros', color: PDF.primaryDark
        },
      ],
      sections: [
        {
          title: 'Por status',
          columns: [{ label: 'Status', key: 'label', width: 60 }, {
            label: 'Total', key: 'value', width: 20, align: 'right'
          }],
          rows: data.porStatus,
        },
        {
          title: 'Por campus',
          columns: [{ label: 'Campus', key: 'label', width: 60 }, {
            label: 'Total', key: 'value', width: 20, align: 'right'
          }],
          rows: data.porCampus,
        },
        {
          title: 'Crescimento (novos membros por mês)',
          columns: [{ label: 'Mês', key: 'label', width: 40 }, {
            label: 'Novos', key: 'value', width: 20, align: 'right'
          }],
          rows: data.crescimento,
        },
      ],
    });
  };

  const exportarExcelArquivo = () => {
    if (!data) return;
    exportarExcel('relatorio-membros', [
      { name: 'Status', columns: [{ label: 'Status', key: 'label' }, { label: 'Total', key: 'value' }], rows: data.porStatus },
      { name: 'Genero', columns: [{ label: 'Gênero', key: 'label' }, { label: 'Total', key: 'value' }], rows: data.porGenero },
      { name: 'Faixa Etaria', columns: [{ label: 'Faixa', key: 'label' }, { label: 'Total', key: 'value' }], rows: data.porFaixaEtaria },
      { name: 'Campus', columns: [{ label: 'Campus', key: 'label' }, { label: 'Total', key: 'value' }], rows: data.porCampus },
      { name: 'Cargo', columns: [{ label: 'Cargo', key: 'label' }, { label: 'Total', key: 'value' }], rows: data.porCargo },
      { name: 'Crescimento', columns: [{ label: 'Mês', key: 'label' }, { label: 'Novos', key: 'value' }], rows: data.crescimento },
    ]);
  };

  return (
    <div>
      <Helmet><title>Relatório de Membros</title></Helmet>
      <PapperBlock title="Relatório de Membros" icon="ion-ios-people" desc="Demografia, crescimento e distribuição">
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Campus</InputLabel>
              <Select value={campusId} label="Campus" onChange={(e) => setCampusId(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {campusOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {STATUS_OPCOES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" type="date" label="De (filiação)" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField fullWidth size="small" type="date" label="Até (filiação)" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button variant="contained" startIcon={<RefreshIcon />} onClick={gerar} disabled={loading}>Gerar</Button>
            </Box>
          </Grid>
        </Grid>

        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportarPdf} disabled={!data}>PDF</Button>
          <Button variant="outlined" startIcon={<TableViewIcon />} onClick={exportarExcelArquivo} disabled={!data}>Excel</Button>
        </Box>

        {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}

        {!loading && data && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} md={3}><KpiCard label="Total" value={fmtNumero(data.resumo.total)} subtitle="membros" color="#16548e" /></Grid>
              <Grid item xs={6} md={3}><KpiCard label="Ativos" value={fmtNumero(data.resumo.ativos)} subtitle="visitante/congregado/membro" color="#1e8449" /></Grid>
              <Grid item xs={6} md={3}><KpiCard label="Inativos" value={fmtNumero(data.resumo.inativos)} subtitle="demais status" color="#c97a16" /></Grid>
              <Grid item xs={6} md={3}><KpiCard label="Campus" value={fmtNumero(data.resumo.campos)} subtitle="com membros" color="#14365c" /></Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={8}><ChartCard title="Crescimento (novos membros por mês)" type="line" data={data.crescimento} /></Grid>
              <Grid item xs={12} md={4}><ChartCard title="Por gênero" type="pie" data={data.porGenero} /></Grid>
              <Grid item xs={12} md={6}><ChartCard title="Por faixa etária" type="bar" data={data.porFaixaEtaria} /></Grid>
              <Grid item xs={12} md={6}><ChartCard title="Por status" type="bar" data={data.porStatus} /></Grid>
              <Grid item xs={12} md={6}><ChartCard title="Por campus" type="bar" data={data.porCampus} /></Grid>
              <Grid item xs={12} md={6}><ChartCard title="Por cargo (lideranças)" type="bar" data={data.porCargo} /></Grid>
            </Grid>
          </>
        )}

        {notification && <Notification message={notification} close={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default MembersReport;
