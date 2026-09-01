import React, {
  useState, useEffect, useMemo, useRef, useCallback
} from 'react';
import DOMPurify from 'dompurify';
import { Helmet } from 'react-helmet';
import { PapperBlock, Notification } from 'dan-components';
import {
  Grid,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Divider,
  Switch,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Backdrop,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Stack,
  InputAdornment
} from '@mui/material';
import { Editor } from 'react-draft-wysiwyg';
import {
  EditorState, ContentState, convertToRaw, Modifier
} from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import SaveIcon from '@mui/icons-material/Save';
import BackIcon from '@mui/icons-material/ArrowBack';
import ImageIcon from '@mui/icons-material/Image';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import useTheme from '@mui/material/styles/useTheme';
import { useHistory, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import {
  buscarEvento,
  obterTermoEvento,
  salvarTermoEvento,
  listarAceitesTermo
} from '../../../api/eventsApi';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const toDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = (err) => reject(err);
  reader.readAsDataURL(file);
});

const htmlToEditorState = (html) => {
  if (!html) return EditorState.createEmpty();
  const { contentBlocks, entityMap } = htmlToDraft(html);
  const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);
  return EditorState.createWithContent(contentState);
};

const SIGNATURE_MODES = [
  { value: 'DRAW', label: 'Assinatura à mão (canvas)' },
  { value: 'TYPED', label: 'Aceite + nome digitado' },
  { value: 'CHECKBOX', label: 'Somente checkbox de aceite' },
];

// Campos padrão que podem ser coletados na assinatura (quando não vierem do inscrito).
const STANDARD_COLLECT = [
  { key: 'RESPONSAVEL_NOME', label: 'Nome do responsável' },
  { key: 'RESPONSAVEL_CPF', label: 'CPF do responsável' },
  { key: 'CONTATO_EMERGENCIA_NOME', label: 'Contato de emergência (nome)' },
  { key: 'CONTATO_EMERGENCIA_WHATSAPP', label: 'Contato de emergência (WhatsApp)' },
];

const PAGE_BREAK = '{{QUEBRA_PAGINA}}';

const PAGE_BREAK_MARKER = '<div data-pagebreak="1" style="border-top:2px dashed #bbb;color:#999;font-size:10px;text-align:center;margin:6px 0">— quebra de página —</div>';

const applyPageBreaks = (html) => String(html).replace(/(<p>\s*)?\{\{\s*QUEBRA_PAGINA\s*\}\}(\s*<\/p>)?/g, PAGE_BREAK_MARKER);

// Divide o HTML em páginas medindo blocos num container offscreen que replica a
// largura/fonte reais da caixa de texto (quebra manual + estouro).
const paginateHtml = (html, widthPx, pageHeightPx, style) => {
  if (!widthPx || !pageHeightPx || pageHeightPx < 20) return [html];
  const mkBox = () => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;width:${widthPx}px;`;
    if (style) {
      el.style.fontSize = style.fontSize;
      el.style.lineHeight = style.lineHeight;
      el.style.fontFamily = style.fontFamily;
    }
    document.body.appendChild(el);
    return el;
  };
  const measurer = mkBox();
  measurer.innerHTML = html;
  const blocks = Array.from(measurer.children);
  const pageEl = mkBox();
  const pages = [];
  const flush = () => {
    if (pageEl.childNodes.length) { pages.push(pageEl.innerHTML); pageEl.innerHTML = ''; }
  };
  blocks.forEach((block) => {
    const isBreak = (block.textContent || '').trim() === PAGE_BREAK || block.getAttribute('data-pagebreak') != null;
    if (isBreak) { flush(); return; }
    const clone = block.cloneNode(true);
    pageEl.appendChild(clone);
    if (pageEl.scrollHeight > pageHeightPx && pageEl.childNodes.length > 1) {
      pageEl.removeChild(clone);
      flush();
      pageEl.appendChild(clone);
    }
  });
  flush();
  document.body.removeChild(measurer);
  document.body.removeChild(pageEl);
  return pages.length ? pages : [''];
};

function LiabilityTerm() {
  const history = useHistory();
  const theme = useTheme();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState('');
  const [evento, setEvento] = useState(null);

  const [requiresTerm, setRequiresTerm] = useState(false);
  const [title, setTitle] = useState('');
  const [signatureMode, setSignatureMode] = useState('DRAW');
  const [requireDocument, setRequireDocument] = useState(true);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [contentTopOffset, setContentTopOffset] = useState(0);
  const [contentBottomOffset, setContentBottomOffset] = useState(0);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [systemPlaceholders, setSystemPlaceholders] = useState([]);
  const [standardPlaceholders, setStandardPlaceholders] = useState([]);
  const [pageBreakToken, setPageBreakToken] = useState('QUEBRA_PAGINA');
  const [attendeeFields, setAttendeeFields] = useState([]);
  const [participantNameField, setParticipantNameField] = useState('');
  const [signerNameField, setSignerNameField] = useState('');
  const [signerDocumentField, setSignerDocumentField] = useState('');
  const [collectFields, setCollectFields] = useState([]);
  const [aceites, setAceites] = useState([]);
  const [buscaAceite, setBuscaAceite] = useState('');

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setLoading(true);
        const [ev, cfg, ace] = await Promise.all([
          buscarEvento(id).catch(() => null),
          obterTermoEvento(id).catch(() => ({ term: null, systemPlaceholders: [], attendeeFields: [] })),
          listarAceitesTermo(id).catch(() => []),
        ]);
        if (!ativo) return;
        setEvento(ev);
        setRequiresTerm(Boolean(ev?.requiresLiabilityTerm));
        setSystemPlaceholders(Array.isArray(cfg?.systemPlaceholders) ? cfg.systemPlaceholders : []);
        setStandardPlaceholders(Array.isArray(cfg?.standardPlaceholders) ? cfg.standardPlaceholders : []);
        setPageBreakToken(cfg?.pageBreakToken || 'QUEBRA_PAGINA');
        setAttendeeFields(Array.isArray(cfg?.attendeeFields) ? cfg.attendeeFields : []);
        setAceites(Array.isArray(ace) ? ace : []);
        const term = cfg?.term;
        if (term) {
          setTitle(term.title || '');
          setSignatureMode(term.signatureMode || 'DRAW');
          setRequireDocument(term.requireDocument !== false);
          setBackgroundImageUrl(term.backgroundImageUrl || '');
          setContentTopOffset(Number(term.contentTopOffset) || 0);
          setContentBottomOffset(Number(term.contentBottomOffset) || 0);
          setParticipantNameField(term.participantNameField || '');
          setSignerNameField(term.signerNameField || '');
          setSignerDocumentField(term.signerDocumentField || '');
          setCollectFields(Array.isArray(term.collectFields) ? term.collectFields : []);
          setEditorState(htmlToEditorState(term.contentHtml || ''));
        }
      } catch (e) {
        if (ativo) setNotification(e.message || 'Erro ao carregar o termo');
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [id]);

  const contentHtml = useMemo(
    () => draftToHtml(convertToRaw(editorState.getCurrentContent())),
    [editorState]
  );

  const sampleValues = useMemo(() => {
    const values = {
      EVENTO_NOME: evento?.title || 'Nome do Evento',
      EVENTO_DATA: evento?.startDate ? new Date(evento.startDate).toLocaleDateString('pt-BR') : '01/01/2026',
      EVENTO_LOCAL: evento?.location || 'Local do evento',
      DATA_ASSINATURA: new Date().toLocaleDateString('pt-BR'),
      // Campos padrão: exemplos.
      PARTICIPANTE_NOME: 'João da Silva',
      RESPONSAVEL_NOME: 'Maria da Silva',
      RESPONSAVEL_CPF: '000.000.000-00',
      CONTATO_EMERGENCIA_NOME: 'Contato de Emergência',
      CONTATO_EMERGENCIA_WHATSAPP: '(00) 00000-0000',
    };
    // Campos do inscrito: exemplo = "[Rótulo do campo]".
    attendeeFields.forEach((f) => { values[f.key] = `[${f.label}]`; });
    return values;
  }, [evento, attendeeFields]);

  const previewHtml = useMemo(() => {
    const filled = contentHtml.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, k) => {
      if (k === pageBreakToken) return match; // tratado por applyPageBreaks
      return sampleValues[k] != null ? sampleValues[k] : `{{${k}}}`;
    });
    return DOMPurify.sanitize(applyPageBreaks(filled));
  }, [contentHtml, sampleValues, pageBreakToken]);

  // Paginação da pré-visualização: mede a caixa de texto REAL (largura/altura/fonte).
  const previewOverlayRef = useRef(null);
  const [previewPages, setPreviewPages] = useState([previewHtml]);
  useEffect(() => {
    const measure = () => {
      const ov = previewOverlayRef.current;
      if (!backgroundImageUrl || !ov) { setPreviewPages([previewHtml]); return; }
      const w = ov.clientWidth;
      const h = ov.clientHeight;
      if (!w || !h) { setPreviewPages([previewHtml]); return; }
      const cs = window.getComputedStyle(ov);
      setPreviewPages(paginateHtml(previewHtml, w, h, {
        fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontFamily: cs.fontFamily,
      }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (previewWrapRef.current) ro.observe(previewWrapRef.current);
    return () => ro.disconnect();
  }, [previewHtml, contentTopOffset, contentBottomOffset, backgroundImageUrl]);

  const insertPlaceholder = (key) => {
    const token = `{{${key}}}`;
    const content = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const newContent = Modifier.insertText(content, selection, token);
    const next = EditorState.push(editorState, newContent, 'insert-characters');
    setEditorState(EditorState.forceSelection(next, newContent.getSelectionAfter()));
  };

  const handleBackgroundImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      setNotification('Imagem muito grande (máx. 5MB).');
      return;
    }
    try {
      const dataUrl = await toDataUrl(file);
      setBackgroundImageUrl(dataUrl);
    } catch {
      setNotification('Não foi possível carregar a imagem.');
    }
  };

  // Arraste das alças (cabeçalho/rodapé) sobre a imagem para mapear onde o texto começa/termina.
  const previewWrapRef = useRef(null);
  const dragging = useRef(null); // 'top' | 'bottom' | null

  const onDragMove = useCallback((e) => {
    const which = dragging.current;
    const wrap = previewWrapRef.current;
    if (!which || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let pct = ((clientY - rect.top) / rect.height) * 100;
    pct = Math.max(0, Math.min(100, pct));
    if (which === 'top') {
      setContentTopOffset(Math.round(pct * 10) / 10);
    } else {
      setContentBottomOffset(Math.round((100 - pct) * 10) / 10);
    }
  }, []);

  const stopDrag = useCallback(() => { dragging.current = null; }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', stopDrag);
    return () => {
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', stopDrag);
    };
  }, [onDragMove, stopDrag]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await salvarTermoEvento(id, {
        requiresTerm,
        title,
        contentHtml,
        backgroundImageUrl: backgroundImageUrl || null,
        contentTopOffset,
        contentBottomOffset,
        signatureMode,
        requireDocument,
        participantNameField: participantNameField || null,
        signerNameField: signerNameField || null,
        signerDocumentField: signerDocumentField || null,
        collectFields,
      });
      setNotification('Termo salvo com sucesso.');
    } catch (e) {
      setNotification(e.message || 'Erro ao salvar o termo.');
    } finally {
      setSaving(false);
    }
  };

  const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '-');

  const aceitesFiltrados = useMemo(() => {
    const termo = buscaAceite.trim().toLowerCase();
    if (!termo) return aceites;
    return aceites.filter((a) => [a.participantName, a.signerName, a.signerDocument]
      .some((v) => String(v || '').toLowerCase().includes(termo)));
  }, [aceites, buscaAceite]);

  return (
    <div>
      <Helmet><title>{brand.name} - Termo de Responsabilidade</title></Helmet>
      <Notification message={notification} close={() => setNotification('')} />

      <PapperBlock
        title="Termo de Responsabilidade"
        icon="ion-ios-document-outline"
        whiteBg
        desc={evento ? `Configuração do termo para: ${evento.title}` : 'Configuração do termo do evento'}
      >
        <Box sx={{ mb: 2 }}>
          <Button startIcon={<BackIcon />} onClick={() => history.goBack()}>Voltar</Button>
        </Box>

        <Grid container spacing={3}>
          {/* Coluna de configuração */}
          <Grid item xs={12} md={7}>
            <Card variant="outlined">
              <CardContent>
                <FormControlLabel
                  control={<Switch checked={requiresTerm} onChange={(e) => setRequiresTerm(e.target.checked)} />}
                  label="Este evento exige termo de responsabilidade"
                />
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Quando ativo, o responsável precisa ler e assinar o termo (um por participante)
                  antes de concluir a inscrição/pagamento.
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  label="Título do termo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={7}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="sig-mode-label">Modo de assinatura</InputLabel>
                      <Select
                        labelId="sig-mode-label"
                        label="Modo de assinatura"
                        value={signatureMode}
                        onChange={(e) => setSignatureMode(e.target.value)}
                      >
                        {SIGNATURE_MODES.map((m) => (
                          <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <FormControlLabel
                      control={<Switch checked={requireDocument} onChange={(e) => setRequireDocument(e.target.checked)} />}
                      label="Exigir CPF"
                    />
                  </Grid>
                </Grid>

                {/* Designacao de campos do inscrito para auditoria/diferenciacao */}
                <Typography variant="subtitle2" gutterBottom>
                  Identificação (campos do inscrito)
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Aponte quais campos do formulário do inscrito representam o participante e o responsável.
                </Typography>
                <Grid container spacing={2} sx={{ mt: 0.5, mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="pn-field-label">Nome do participante</InputLabel>
                      <Select
                        labelId="pn-field-label"
                        label="Nome do participante"
                        value={participantNameField}
                        onChange={(e) => setParticipantNameField(e.target.value)}
                      >
                        <MenuItem value="">— nenhum —</MenuItem>
                        {attendeeFields.map((f) => (
                          <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="sn-field-label">Nome do responsável</InputLabel>
                      <Select
                        labelId="sn-field-label"
                        label="Nome do responsável"
                        value={signerNameField}
                        onChange={(e) => setSignerNameField(e.target.value)}
                      >
                        <MenuItem value="">— nenhum —</MenuItem>
                        {attendeeFields.map((f) => (
                          <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="sd-field-label">CPF do responsável</InputLabel>
                      <Select
                        labelId="sd-field-label"
                        label="CPF do responsável"
                        value={signerDocumentField}
                        onChange={(e) => setSignerDocumentField(e.target.value)}
                      >
                        <MenuItem value="">— nenhum —</MenuItem>
                        {attendeeFields.map((f) => (
                          <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Campos padrão a pedir na assinatura quando não vierem do inscrito */}
                <Typography variant="subtitle2" gutterBottom>
                  Coletar na assinatura (se não vier do inscrito)
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Marque os campos que o responsável deve preencher no momento de assinar.
                </Typography>
                <FormGroup row sx={{ mt: 0.5, mb: 2 }}>
                  {STANDARD_COLLECT.map((f) => (
                    <FormControlLabel
                      key={f.key}
                      control={(
                        <Checkbox
                          size="small"
                          checked={collectFields.includes(f.key)}
                          onChange={(e) => setCollectFields((prev) => (e.target.checked
                            ? [...prev, f.key]
                            : prev.filter((k) => k !== f.key)))}
                        />
                      )}
                      label={f.label}
                    />
                  ))}
                </FormGroup>

                <Box sx={{ mb: 2 }}>
                  <Button component="label" variant="outlined" size="small" startIcon={<ImageIcon />}>
                    {backgroundImageUrl ? 'Trocar imagem de fundo' : 'Imagem de fundo / marca d’água (opcional)'}
                    <input type="file" accept="image/*" hidden onChange={handleBackgroundImage} />
                  </Button>
                  {backgroundImageUrl && (
                    <Button color="error" size="small" sx={{ ml: 1 }} onClick={() => setBackgroundImageUrl('')}>
                      Remover
                    </Button>
                  )}
                  {backgroundImageUrl && (
                    <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                      O texto é renderizado sobre a imagem. Arraste as linhas na pré-visualização
                      (ou use os campos abaixo) para marcar onde o cabeçalho termina e o rodapé começa.
                    </Typography>
                  )}
                  {backgroundImageUrl && (
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Topo do texto (%)"
                          value={contentTopOffset}
                          onChange={(e) => setContentTopOffset(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                          inputProps={{ min: 0, max: 100, step: 0.5 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Rodapé reservado (%)"
                          value={contentBottomOffset}
                          onChange={(e) => setContentBottomOffset(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                          inputProps={{ min: 0, max: 100, step: 0.5 }}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>

                <Typography variant="subtitle2" gutterBottom>Conteúdo do termo</Typography>
                <Typography variant="caption" color="textSecondary">
                  Clique em um campo para inseri-lo onde o cursor estiver.
                </Typography>

                {attendeeFields.length > 0 && (
                  <>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }} fontWeight={700}>
                      Campos do inscrito
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ my: 0.5 }}>
                      {attendeeFields.map((f) => (
                        <Chip
                          key={f.key}
                          label={f.label}
                          size="small"
                          color="primary"
                          variant="outlined"
                          onClick={() => insertPlaceholder(f.key)}
                        />
                      ))}
                    </Stack>
                  </>
                )}

                {standardPlaceholders.length > 0 && (
                  <>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }} fontWeight={700}>
                      Campos padrão (coletados na assinatura se faltarem no inscrito)
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ my: 0.5 }}>
                      {standardPlaceholders.map((p) => (
                        <Chip
                          key={p.key}
                          label={p.label}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          onClick={() => insertPlaceholder(p.key)}
                        />
                      ))}
                    </Stack>
                  </>
                )}

                <Typography variant="caption" display="block" sx={{ mt: 1 }} fontWeight={700}>
                  Campos do sistema
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ my: 0.5 }}>
                  {systemPlaceholders.map((p) => (
                    <Chip
                      key={p.key}
                      label={p.label}
                      size="small"
                      variant="outlined"
                      onClick={() => insertPlaceholder(p.key)}
                    />
                  ))}
                  <Chip
                    label="⤵ Quebra de página"
                    size="small"
                    onClick={() => insertPlaceholder(pageBreakToken)}
                  />
                </Stack>

                <Box sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  '& .rdw-editor-main': { minHeight: '260px', padding: '8px 12px' },
                }}
                >
                  <Editor
                    editorState={editorState}
                    onEditorStateChange={setEditorState}
                    toolbar={{
                      options: ['inline', 'blockType', 'list', 'textAlign', 'link', 'history'],
                      inline: { options: ['bold', 'italic', 'underline'] },
                      list: { options: ['unordered', 'ordered'] },
                    }}
                  />
                </Box>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Salvando…' : 'Salvar termo'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Coluna de preview */}
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{ position: 'sticky', top: 16 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Pré-visualização
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {backgroundImageUrl
                    ? 'Arraste as linhas para marcar o fim do cabeçalho (azul) e o início do rodapé (laranja).'
                    : 'Placeholders preenchidos com dados de exemplo.'}
                </Typography>
                <Divider sx={{ my: 1.5 }} />

                {backgroundImageUrl ? (
                  <Box sx={{ width: '100%' }}>
                    {previewPages.map((pageHtml, i) => (
                      <Box
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                        ref={i === 0 ? previewWrapRef : undefined}
                        sx={{
                          position: 'relative',
                          width: '100%',
                          aspectRatio: '210 / 297',
                          bgcolor: '#fff',
                          overflow: 'hidden',
                          mb: 1.5,
                          userSelect: 'none',
                          touchAction: 'none',
                        }}
                      >
                        <Box
                          component="img"
                          src={backgroundImageUrl}
                          alt={`página ${i + 1}`}
                          sx={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', display: 'block',
                          }}
                        />

                        <Box
                          ref={i === 0 ? previewOverlayRef : undefined}
                          sx={{
                            position: 'absolute',
                            left: '8%',
                            right: '8%',
                            top: `${contentTopOffset}%`,
                            bottom: `${contentBottomOffset}%`,
                            overflow: 'hidden',
                            fontSize: 12,
                            color: '#000',
                            '& ul': { listStyleType: 'disc', pl: 2.5, my: 0.5 },
                            '& ol': { listStyleType: 'decimal', pl: 2.5, my: 0.5 },
                            '& li': { display: 'list-item' },
                          }}
                        >
                          {/* eslint-disable-next-line react/no-danger */}
                          <div dangerouslySetInnerHTML={{ __html: pageHtml }} />
                        </Box>

                        {/* Alças de mapeamento apenas na primeira página */}
                        {i === 0 && (
                          <>
                            <Box
                              onPointerDown={() => { dragging.current = 'top'; }}
                              sx={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${contentTopOffset}%`,
                                borderTop: '2px dashed #1976d2',
                                cursor: 'row-resize',
                                height: 0,
                              }}
                            >
                              <Box sx={{
                                position: 'absolute',
                                right: 2,
                                top: -18,
                                fontSize: 10,
                                bgcolor: '#1976d2',
                                color: '#fff',
                                px: 0.5,
                                borderRadius: 0.5,
                              }}
                              >
                                cabeçalho {contentTopOffset}%
                              </Box>
                            </Box>
                            <Box
                              onPointerDown={() => { dragging.current = 'bottom'; }}
                              sx={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: `${contentBottomOffset}%`,
                                borderTop: '2px dashed #ed6c02',
                                cursor: 'row-resize',
                                height: 0,
                              }}
                            >
                              <Box sx={{
                                position: 'absolute',
                                right: 2,
                                top: 2,
                                fontSize: 10,
                                bgcolor: '#ed6c02',
                                color: '#fff',
                                px: 0.5,
                                borderRadius: 0.5,
                              }}
                              >
                                rodapé {contentBottomOffset}%
                              </Box>
                            </Box>
                          </>
                        )}
                      </Box>
                    ))}
                    {previewPages.length > 1 && (
                      <Typography variant="caption" color="textSecondary">
                        {previewPages.length} páginas
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box sx={{
                    p: 2,
                    bgcolor: theme.palette.background.default,
                    borderRadius: 1,
                    maxHeight: 520,
                    overflow: 'auto',
                    '& ul': { listStyleType: 'disc', pl: 2.5, my: 0.5 },
                    '& ol': { listStyleType: 'decimal', pl: 2.5, my: 0.5 },
                    '& li': { display: 'list-item' },
                  }}
                  >
                    {title && (
                      <Typography variant="h6" align="center" gutterBottom>{title}</Typography>
                    )}
                    {/* eslint-disable-next-line react/no-danger */}
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Assinaturas registradas */}
        <Box sx={{ mt: 4 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 1.5 }}
          >
            <Typography variant="h6">
              Assinaturas registradas ({aceites.length})
            </Typography>
            <TextField
              size="small"
              placeholder="Buscar participante / responsável / CPF"
              value={buscaAceite}
              onChange={(e) => setBuscaAceite(e.target.value)}
              sx={{ minWidth: { sm: 320 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                ),
              }}
            />
          </Stack>

          {aceites.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              Nenhuma assinatura registrada ainda.
            </Typography>
          ) : aceitesFiltrados.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              Nenhuma assinatura encontrada para “{buscaAceite}”. Este participante ainda não assinou o termo.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Situação</TableCell>
                    <TableCell>Participante</TableCell>
                    <TableCell>Responsável</TableCell>
                    <TableCell>CPF</TableCell>
                    <TableCell>Assinado em</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aceitesFiltrados.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Assinado"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{a.participantName || '-'}</TableCell>
                      <TableCell>{a.signerName || '-'}</TableCell>
                      <TableCell>{a.signerDocument || '-'}</TableCell>
                      <TableCell>{fmtDateTime(a.acceptedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </PapperBlock>

      <Backdrop open={loading} sx={{ zIndex: (t) => t.zIndex.drawer + 1, color: '#fff' }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </div>
  );
}

export default LiabilityTerm;
