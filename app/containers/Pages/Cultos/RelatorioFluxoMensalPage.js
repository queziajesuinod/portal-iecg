import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Helmet } from 'react-helmet';
import JsPDF from 'jspdf';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import Notification from 'dan-components/Notification/Notification';
import {
  buscarRelatorioMensal,
  listarCampusPorMinisterio,
  listarMinisterios,
} from '../../../api/cultosApi';

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const mesAtual = () => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
};

const formatarNumero = (valor) => Number(valor || 0).toLocaleString('pt-BR');
const formatarDecimal = (valor) => Number(valor || 0).toFixed(2);
const formatarPercentual = (valor) => `${Number(valor || 0).toFixed(2)}%`;
const formatarDataCurta = (data) => {
  if (!data) return '';
  const [ano, mes, dia] = String(data).split('-');
  return `${dia}/${mes}/${ano}`;
};

const corTendencia = (label) => {
  if (label === 'AUMENTO') return 'success';
  if (label === 'QUEDA') return 'error';
  return 'default';
};

const PDF = {
  margin: 14,
  pageWidth: 210,
  pageHeight: 297,
  contentWidth: 182,
  primary: [22, 84, 142],
  primaryDark: [14, 54, 92],
  accent: [30, 132, 73],
  danger: [180, 48, 48],
  warning: [201, 122, 22],
  border: [220, 226, 232],
  muted: [93, 108, 125],
  soft: [244, 248, 252],
  white: [255, 255, 255],
  black: [30, 37, 47],
};

const colorByTrend = (label) => {
  if (label === 'AUMENTO') return PDF.accent;
  if (label === 'QUEDA') return PDF.danger;
  return PDF.muted;
};

const ensurePdfSpace = (doc, state, needed = 18) => {
  if (state.y + needed <= PDF.pageHeight - 14) return;
  doc.addPage();
  state.page += 1;
  state.y = 18;
};

const setPdfText = (doc, size, color = PDF.black, bold = false) => {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
};

const drawSectionTitle = (doc, state, title) => {
  ensurePdfSpace(doc, state, 16);
  doc.setDrawColor(...PDF.primary);
  doc.setLineWidth(0.7);
  doc.line(PDF.margin, state.y, PDF.margin + 6, state.y);
  setPdfText(doc, 12, PDF.primaryDark, true);
  doc.text(title, PDF.margin + 9, state.y + 1);
  state.y += 8;
};

const drawWrappedText = (doc, state, text, options = {}) => {
  const {
    x = PDF.margin,
    width = PDF.contentWidth,
    size = 9,
    color = PDF.black,
    bold = false,
    lineHeight = 5,
  } = options;
  setPdfText(doc, size, color, bold);
  const lines = doc.splitTextToSize(String(text || ''), width);
  lines.forEach((line) => {
    ensurePdfSpace(doc, state, lineHeight + 2);
    doc.text(line, x, state.y);
    state.y += lineHeight;
  });
};

const drawMetricCard = (doc, x, y, width, title, value, subtitle, color = PDF.primary) => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF.border);
  doc.roundedRect(x, y, width, 25, 2, 2, 'FD');
  doc.setFillColor(...color);
  doc.roundedRect(x, y, 2.5, 25, 1.2, 1.2, 'F');
  setPdfText(doc, 7, PDF.muted, true);
  doc.text(String(title || '').toUpperCase(), x + 6, y + 7);
  setPdfText(doc, 14, color, true);
  doc.text(String(value ?? '0'), x + 6, y + 15);
  if (subtitle) {
    setPdfText(doc, 7, PDF.muted);
    doc.text(String(subtitle), x + 6, y + 21);
  }
};

const drawFooter = (doc, totalPages) => {
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...PDF.border);
    doc.line(PDF.margin, 286, PDF.pageWidth - PDF.margin, 286);
    setPdfText(doc, 8, PDF.muted);
    doc.text('Portal IECG | Saude dos Cultos', PDF.margin, 291);
    doc.text(`Pagina ${page} de ${totalPages}`, PDF.pageWidth - PDF.margin, 291, { align: 'right' });
  }
};

const drawExecutiveInsights = (doc, state, relatorioData) => {
  const campus = Array.isArray(relatorioData.campus) ? relatorioData.campus : [];
  if (!campus.length) return;

  const porMedia = [...campus].sort((a, b) => Number(b.mediaPorCulto || 0) - Number(a.mediaPorCulto || 0));
  const porVariacao = [...campus].sort((a, b) => Number(b.variacao || 0) - Number(a.variacao || 0));
  const porQueda = [...campus].sort((a, b) => Number(a.variacao || 0) - Number(b.variacao || 0));
  const semCultos = campus.filter((item) => Number(item.totalCultos || 0) === 0);
  const resumo = relatorioData.resumo || {};
  const maiorMedia = porMedia[0];
  const maiorAumento = porVariacao[0];
  const maiorQueda = porQueda[0];
  const destaquesCultos = relatorioData.destaquesCultos || {};
  const variosCampus = campus.length > 1;
  const formatarCulto = (item) => {
    if (!item) return '';
    const partes = [
      item.tituloMensagem || 'Sem titulo',
      item.eSerie && item.nomeSerie ? `serie ${item.nomeSerie}` : '',
      item.campus?.nome || '',
      formatarDataCurta(item.data),
    ].filter(Boolean);
    return `${partes.join(' | ')} - ${formatarNumero(item.presenca)} pessoas`;
  };

  drawSectionTitle(doc, state, 'Analise executiva');
  const insights = [
    `Media geral atual de ${formatarDecimal(resumo.mediaGeralAtual)} por culto, comparada a ${formatarDecimal(resumo.mediaGeralAnterior)} no mes anterior.`,
    destaquesCultos.acimaMedia
      ? `Culto acima da media: ${formatarCulto(destaquesCultos.acimaMedia)}.`
      : '',
    destaquesCultos.abaixoMedia
      ? `Culto abaixo da media: ${formatarCulto(destaquesCultos.abaixoMedia)}.`
      : '',
    variosCampus && maiorMedia
      ? `Campus com maior media por culto: ${maiorMedia.campus.nome}, com ${formatarDecimal(maiorMedia.mediaPorCulto)} pessoas por culto.`
      : '',
    variosCampus && maiorAumento && Number(maiorAumento.variacao || 0) > 0
      ? `Maior aumento: ${maiorAumento.campus.nome}, variacao de ${formatarPercentual(maiorAumento.variacao)}.`
      : '',
    variosCampus && maiorQueda && Number(maiorQueda.variacao || 0) < 0
      ? `Maior queda: ${maiorQueda.campus.nome}, variacao de ${formatarPercentual(maiorQueda.variacao)}.`
      : '',
    variosCampus && semCultos.length ? `Campus sem cultos registrados no mes: ${semCultos.map((item) => item.campus.nome).join(', ')}.` : '',
  ].filter(Boolean);

  doc.setFillColor(...PDF.soft);
  doc.setDrawColor(...PDF.border);
  const boxStart = state.y;
  const lineCount = insights.reduce((acc, item) => acc + doc.splitTextToSize(item, 168).length, 0);
  const boxHeight = Math.max(26, 8 + (lineCount * 5));
  ensurePdfSpace(doc, state, boxHeight + 4);
  doc.roundedRect(PDF.margin, state.y, PDF.contentWidth, boxHeight, 2, 2, 'FD');
  state.y += 7;
  insights.forEach((item) => {
    doc.setFillColor(...PDF.primary);
    doc.circle(PDF.margin + 6, state.y - 1.5, 1.2, 'F');
    drawWrappedText(doc, state, item, {
      x: PDF.margin + 11,
      width: 166,
      size: 9,
      color: PDF.black,
      lineHeight: 5,
    });
    state.y += 1;
  });
  state.y = Math.max(state.y, boxStart + boxHeight + 6);
};

const drawCampusTable = (doc, state, campusRows) => {
  drawSectionTitle(doc, state, 'Resultado por campus');
  const columns = [
    {
      label: 'Campus', x: 16, width: 52, align: 'left',
    },
    {
      label: 'Cultos', x: 75, width: 16, align: 'right',
    },
    {
      label: 'Fluxo', x: 99, width: 18, align: 'right',
    },
    {
      label: 'Media', x: 126, width: 19, align: 'right',
    },
    {
      label: 'Anterior', x: 153, width: 21, align: 'right',
    },
    {
      label: 'Variacao', x: 183, width: 22, align: 'right',
    },
  ];

  const drawHeader = () => {
    ensurePdfSpace(doc, state, 16);
    doc.setFillColor(...PDF.primaryDark);
    doc.roundedRect(PDF.margin, state.y, PDF.contentWidth, 8, 1.5, 1.5, 'F');
    setPdfText(doc, 7.5, PDF.white, true);
    columns.forEach((column) => {
      doc.text(column.label, column.x, state.y + 5, { align: column.align });
    });
    state.y += 9;
  };

  drawHeader();
  campusRows.forEach((item, index) => {
    ensurePdfSpace(doc, state, 13);
    if (state.y < 20) drawHeader();
    const rowHeight = 10;
    const fill = index % 2 === 0 ? [250, 252, 254] : PDF.white;
    doc.setFillColor(...fill);
    doc.rect(PDF.margin, state.y, PDF.contentWidth, rowHeight, 'F');
    doc.setDrawColor(...PDF.border);
    doc.line(PDF.margin, state.y + rowHeight, PDF.pageWidth - PDF.margin, state.y + rowHeight);

    const trendColor = colorByTrend(item.tendencia?.label);
    setPdfText(doc, 8, PDF.black, true);
    const nomeCampus = doc.splitTextToSize(item.campus?.nome || '-', 50)[0];
    doc.text(nomeCampus, columns[0].x, state.y + 6);
    setPdfText(doc, 8, PDF.black);
    doc.text(formatarNumero(item.totalCultos), columns[1].x, state.y + 6, { align: 'right' });
    doc.text(formatarNumero(item.fluxoGeral), columns[2].x, state.y + 6, { align: 'right' });
    doc.text(formatarDecimal(item.mediaPorCulto), columns[3].x, state.y + 6, { align: 'right' });
    doc.text(formatarDecimal(item.mediaMesAnterior), columns[4].x, state.y + 6, { align: 'right' });
    setPdfText(doc, 8, trendColor, true);
    doc.text(formatarPercentual(item.variacao), columns[5].x, state.y + 6, { align: 'right' });
    state.y += rowHeight;
  });
  state.y += 6;
};

const RelatorioFluxoMensalPage = () => {
  const [ministerios, setMinisterios] = useState([]);
  const [campusOptions, setCampusOptions] = useState([]);
  const [mesReferencia, setMesReferencia] = useState(mesAtual());
  const [ministerioId, setMinisterioId] = useState('');
  const [campusId, setCampusId] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFiltros, setLoadingFiltros] = useState(true);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    listarMinisterios(true)
      .then((data) => setMinisterios(Array.isArray(data) ? data : []))
      .catch(() => setNotification('Erro ao carregar ministerios'))
      .finally(() => setLoadingFiltros(false));
  }, []);

  useEffect(() => {
    setCampusId('');
    setCampusOptions([]);
    setRelatorio(null);
    if (!ministerioId) return;

    listarCampusPorMinisterio(ministerioId)
      .then((data) => setCampusOptions(Array.isArray(data) ? data : []))
      .catch(() => setNotification('Erro ao carregar campus do ministerio'));
  }, [ministerioId]);

  const ministerioSelecionado = useMemo(
    () => ministerios.find((item) => item.id === ministerioId) || null,
    [ministerioId, ministerios]
  );

  const campusSelecionado = useMemo(
    () => campusOptions.find((item) => item.id === campusId) || null,
    [campusId, campusOptions]
  );

  const gerarRelatorio = useCallback(() => {
    if (!ministerioId || !mesReferencia) {
      setNotification('Selecione o mes e o ministerio para gerar o relatorio');
      return;
    }

    const [ano, mes] = mesReferencia.split('-');
    setLoading(true);
    buscarRelatorioMensal({
      ano,
      mes,
      ministerioId,
      campusId,
    })
      .then(setRelatorio)
      .catch((error) => setNotification(error.message || 'Erro ao gerar relatorio'))
      .finally(() => setLoading(false));
  }, [campusId, mesReferencia, ministerioId]);

  const copiarTexto = async () => {
    if (!relatorio?.textoMensagem) return;
    try {
      await navigator.clipboard.writeText(relatorio.textoMensagem);
      setNotification('Texto copiado');
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = relatorio.textoMensagem;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setNotification('Texto copiado');
    }
  };

  const exportarPdf = () => {
    if (!relatorio) return;
    const doc = new JsPDF({ unit: 'mm', format: 'a4' });
    const estado = { y: 18, page: 1 };
    const resumoAtual = relatorio.resumo || {};
    const campusRows = Array.isArray(relatorio.campus) ? relatorio.campus : [];
    const nomeArquivo = [
      'relatorio-fluxo',
      relatorio.ministerio?.nome || 'ministerio',
      relatorio.referencia?.ano,
      String(relatorio.referencia?.mes || '').padStart(2, '0'),
    ]
      .join('-')
      .replace(/[^a-z0-9-]+/gi, '-')
      .toLowerCase();

    doc.setFillColor(...PDF.primaryDark);
    doc.rect(0, 0, PDF.pageWidth, 48, 'F');
    doc.setFillColor(...PDF.primary);
    doc.rect(0, 0, PDF.pageWidth, 9, 'F');
    setPdfText(doc, 20, PDF.white, true);
    doc.text('Relatorio de Fluxo Mensal', PDF.margin, 24);
    setPdfText(doc, 10, [220, 232, 244]);
    doc.text(`Ministerio: ${relatorio.ministerio?.nome || '-'}`, PDF.margin, 32);
    doc.text(
      `Referencia: ${relatorio.referencia?.nomeMes}/${relatorio.referencia?.ano}  |  Comparativo: ${relatorio.comparativo?.nomeMes}/${relatorio.comparativo?.ano}`,
      PDF.margin,
      39
    );
    if (campusSelecionado) {
      setPdfText(doc, 9, [220, 232, 244], true);
      doc.text(`Campus filtrado: ${campusSelecionado.nome}`, PDF.pageWidth - PDF.margin, 39, { align: 'right' });
    }

    estado.y = 58;
    drawMetricCard(doc, 14, estado.y, 29, 'Cultos', formatarNumero(resumoAtual.totalCultos), 'no mes', PDF.primary);
    drawMetricCard(doc, 47, estado.y, 34, 'Fluxo geral', formatarNumero(resumoAtual.fluxoGeral), 'presencial', PDF.primaryDark);
    drawMetricCard(doc, 85, estado.y, 34, 'Media atual', formatarDecimal(resumoAtual.mediaGeralAtual), 'por culto', PDF.accent);
    drawMetricCard(doc, 123, estado.y, 34, 'Media anterior', formatarDecimal(resumoAtual.mediaGeralAnterior), 'por culto', PDF.warning);
    drawMetricCard(
      doc,
      161,
      estado.y,
      35,
      'Variacao',
      formatarPercentual(resumoAtual.variacao),
      resumoAtual.tendencia?.label || 'ESTAVEL',
      colorByTrend(resumoAtual.tendencia?.label)
    );
    estado.y += 36;

    drawExecutiveInsights(doc, estado, relatorio);
    drawCampusTable(doc, estado, campusRows);

    drawFooter(doc, doc.getNumberOfPages());

    doc.save(`${nomeArquivo}.pdf`);
  };

  const resumo = relatorio?.resumo;
  const campusRelatorio = Array.isArray(relatorio?.campus) ? relatorio.campus : [];
  const nomeMesSelecionado = mesReferencia
    ? `${MESES[parseInt(mesReferencia.split('-')[1], 10) - 1]}/${mesReferencia.split('-')[0]}`
    : '';

  return (
    <div>
      <Helmet><title>Relatorio de Fluxo Mensal</title></Helmet>
      <PapperBlock
        title="Relatorio de Fluxo Mensal"
        icon="ion-ios-paper-outline"
        desc="Comparativo mensal por ministerio e campus"
      >
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="month"
              label="Mes de referencia"
              value={mesReferencia}
              onChange={(e) => {
                setMesReferencia(e.target.value);
                setRelatorio(null);
              }}
              InputLabelProps={{ shrink: true }}
              helperText={nomeMesSelecionado}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" disabled={loadingFiltros}>
              <InputLabel>Ministerio</InputLabel>
              <Select
                value={ministerioId}
                label="Ministerio"
                onChange={(e) => setMinisterioId(e.target.value)}
              >
                <MenuItem value="">Selecione</MenuItem>
                {ministerios.map((ministerio) => (
                  <MenuItem key={ministerio.id} value={ministerio.id}>{ministerio.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" disabled={!ministerioId || campusOptions.length === 0}>
              <InputLabel>Campus</InputLabel>
              <Select
                value={campusId}
                label="Campus"
                onChange={(e) => {
                  setCampusId(e.target.value);
                  setRelatorio(null);
                }}
              >
                <MenuItem value="">Todos os campus</MenuItem>
                {campusOptions.map((campus) => (
                  <MenuItem key={campus.id} value={campus.id}>{campus.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={gerarRelatorio}
                disabled={loading || !ministerioId || !mesReferencia}
              >
                Gerar
              </Button>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdfIcon />}
                onClick={exportarPdf}
                disabled={!relatorio}
              >
                PDF
              </Button>
            </Box>
          </Grid>
        </Grid>

        {ministerioSelecionado && campusOptions.length <= 1 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Campus vinculados ao ministerio: {campusOptions.length}
          </Alert>
        )}

        {loading && <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>}

        {!loading && resumo && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Cultos</Typography>
                    <Typography variant="h5" fontWeight={700}>{formatarNumero(resumo.totalCultos)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Fluxo Geral</Typography>
                    <Typography variant="h5" fontWeight={700}>{formatarNumero(resumo.fluxoGeral)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Media Atual</Typography>
                    <Typography variant="h5" fontWeight={700}>{formatarDecimal(resumo.mediaGeralAtual)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Media Anterior</Typography>
                    <Typography variant="h5" fontWeight={700}>{formatarDecimal(resumo.mediaGeralAnterior)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Variacao</Typography>
                    <Typography variant="h5" fontWeight={700}>{formatarPercentual(resumo.variacao)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Tendencia</Typography>
                    <Box mt={0.5}>
                      <Chip
                        label={`${resumo.tendencia.label} ${resumo.tendencia.icone}`}
                        color={corTendencia(resumo.tendencia.label)}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Campus</TableCell>
                    <TableCell align="right">Total de Cultos</TableCell>
                    <TableCell align="right">Fluxo Geral</TableCell>
                    <TableCell align="right">Media por Culto</TableCell>
                    <TableCell align="right">Media Mes Anterior</TableCell>
                    <TableCell align="right">Variacao</TableCell>
                    <TableCell align="center">Tendencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campusRelatorio.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">Nenhum campus encontrado para este ministerio.</TableCell>
                    </TableRow>
                  )}
                  {campusRelatorio.map((item) => (
                    <TableRow key={item.campus.id} hover>
                      <TableCell>{item.campus.nome}</TableCell>
                      <TableCell align="right">{formatarNumero(item.totalCultos)}</TableCell>
                      <TableCell align="right">{formatarNumero(item.fluxoGeral)}</TableCell>
                      <TableCell align="right">{formatarDecimal(item.mediaPorCulto)}</TableCell>
                      <TableCell align="right">{formatarDecimal(item.mediaMesAnterior)}</TableCell>
                      <TableCell align="right">{formatarPercentual(item.variacao)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${item.tendencia.label} ${item.tendencia.icone}`}
                          color={corTendencia(item.tendencia.label)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} gap={1} flexWrap="wrap">
              <Typography variant="subtitle1" fontWeight={700}>Texto simples para mensagem</Typography>
              <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copiarTexto}>
                Copiar texto
              </Button>
            </Box>
            <TextField
              fullWidth
              multiline
              minRows={12}
              value={relatorio.textoMensagem || ''}
              InputProps={{ readOnly: true }}
            />
          </>
        )}

        {notification && <Notification message={notification} close={() => setNotification('')} />}
      </PapperBlock>
    </div>
  );
};

export default RelatorioFluxoMensalPage;
