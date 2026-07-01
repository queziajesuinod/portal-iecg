/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Collapse, Divider, IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import TuneIcon from '@mui/icons-material/Tune';
import { Helmet } from 'react-helmet';
import * as XLSX from 'xlsx';
import PapperBlock from 'dan-components/PapperBlock/PapperBlock';
import { buscarVersiculos } from '../../../api/bibleApi';

function exportToExcel(verses, contexts, query) {
  const rows = verses.map((v, i) => ({
    '#': i + 1,
    Referência: v.reference,
    Livro: v.book,
    Capítulo: v.chapter,
    Versículo: v.number,
    Versão: (v.version || '').toUpperCase(),
    Texto: v.text,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Larguras de coluna
  ws['!cols'] = [
    { wch: 4 },
    { wch: 18 },
    { wch: 18 },
    { wch: 9 },
    { wch: 9 },
    { wch: 7 },
    { wch: 90 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Versículos');

  // Aba de metadados com os contextos pesquisados
  const meta = [
    { Campo: 'Busca', Valor: query },
    { Campo: 'Contextos', Valor: contexts.join(', ') },
    { Campo: 'Total de versículos', Valor: verses.length },
    { Campo: 'Exportado em', Valor: new Date().toLocaleString('pt-BR') },
  ];
  const wsMeta = XLSX.utils.json_to_sheet(meta);
  wsMeta['!cols'] = [{ wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Busca');

  const safeQuery = query.replace(/[^\wáàâãéèêíïóôõúüçñ\s]/gi, '').trim().substring(0, 40);
  XLSX.writeFile(wb, `versiculos-${safeQuery}.xlsx`);
}

const STOP_WORDS = new Set([
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'o', 'a', 'os', 'as',
  'e', 'ou', 'que', 'para', 'com', 'um', 'uma', 'uns', 'umas', 'por', 'ao', 'aos', 'às',
  'se', 'não', 'é', 'são', 'foi', 'ser', 'ter', 'como', 'mais', 'mas', 'seu', 'sua',
  'seus', 'suas', 'ele', 'ela', 'eles', 'elas', 'este', 'esta', 'isso', 'aqui', 'lá',
  'me', 'te', 'lhe', 'nos', 'vos', 'lhes', 'meu', 'minha', 'teu', 'tua', 'nosso', 'nossa',
]);

function buildHighlightPattern(contexts) {
  const terms = new Set();
  for (const ctx of contexts) {
    ctx.split(/\s+/)
      .map((w) => w.replace(/[^\wáàâãéèêíïóôõúüçñ]/gi, '').toLowerCase())
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
      .forEach((w) => terms.add(w));
  }
  if (terms.size === 0) return null;
  const escaped = [...terms].map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${escaped.join('|')})`, 'gi');
}

// Destaca em negrito os termos dos contextos dentro do texto do versículo
function VerseText({ text, pattern }) {
  if (!pattern || !text) return <Typography variant="body1">{text}</Typography>;
  const parts = text.split(pattern);
  return (
    <Typography variant="body1">
      {parts.map((part, i) => (pattern.test(part)
        ? <Box key={i} component="strong" sx={{ fontWeight: 700 }}>{part}</Box>
        : part)
      )}
    </Typography>
  );
}

const BibleSearchPage = () => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [contextText, setContextText] = useState('');
  const [excludeTopics, setExcludeTopics] = useState('');

  const buscaMutation = useMutation({
    mutationFn: () => buscarVersiculos({
      query: query.trim(),
      version: 'nvi',
      limit: limit ? Number(limit) : 0,
      contextText: contextText.trim() || undefined,
      excludeTopics: excludeTopics.trim()
        ? excludeTopics.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) buscaMutation.mutate();
  };

  const result = buscaMutation.data;
  const highlightPattern = result?.contexts ? buildHighlightPattern(result.contexts) : null;

  return (
    <div>
      <Helmet>
        <title>Bíblia — Busca por Contexto</title>
      </Helmet>
      <PapperBlock
        title="Bíblia — Busca por Contexto"
        icon="ion-ios-book-outline"
        desc="Digite contextos separados por vírgula. A busca usa inteligência semântica para encontrar versículos que realmente se encaixam no significado — não apenas na palavra."
      >
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Contextos de busca (separados por vírgula)"
              placeholder="Ex.: não tenha medo, confiar em Deus, paz interior"
              multiline
              minRows={2}
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                label="Limite de versículos (vazio = sem limite)"
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                inputProps={{ min: 1 }}
                sx={{ width: 240 }}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={buscaMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                disabled={!query.trim() || buscaMutation.isPending}
              >
                Buscar
              </Button>
              <Tooltip title={showGuide ? 'Ocultar orientações' : 'Orientar a busca (transcrição, exclusões…)'}>
                <IconButton
                  onClick={() => setShowGuide((v) => !v)}
                  color={showGuide ? 'primary' : 'default'}
                  size="small"
                >
                  <TuneIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <Collapse in={showGuide}>
              <Box sx={{
                p: 2, bgcolor: 'action.hover', borderRadius: 1, mt: 1
              }}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1.5 }}>
                  Essas informações são enviadas à inteligência artificial para refinar quais palavras-chave buscar na Bíblia — não aparecem nos resultados.
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Texto de contexto (transcrição, anotações, descrição do tema)"
                    placeholder="Cole aqui uma transcrição de vídeo, anotações de sermão ou qualquer texto que descreva o tema em profundidade. A IA usará para entender melhor o que procurar."
                    multiline
                    minRows={4}
                    maxRows={12}
                    fullWidth
                    value={contextText}
                    onChange={(e) => setContextText(e.target.value)}
                    helperText={contextText.length > 0 ? `${contextText.length} caracteres (máx. 2500 usados)` : ''}
                  />
                  <TextField
                    label="Temas a excluir (separados por vírgula)"
                    placeholder="Ex.: animais, casamento, trabalho, guerra"
                    fullWidth
                    value={excludeTopics}
                    onChange={(e) => setExcludeTopics(e.target.value)}
                    helperText="A IA evitará gerar termos ligados a esses assuntos."
                  />
                </Stack>
              </Box>
            </Collapse>
          </Stack>
        </Box>

        {buscaMutation.isPending && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Varrendo a Bíblia e calculando relevância semântica…
            </Typography>
          </Box>
        )}

        {buscaMutation.isError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {buscaMutation.error?.response?.data?.erro || buscaMutation.error?.message || 'Erro na busca.'}
          </Alert>
        )}

        {result && !buscaMutation.isPending && (
          <Box sx={{ mt: 4 }}>
            {result.contexts?.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary" sx={{ mr: 1 }}>
                  Contextos pesquisados:
                </Typography>
                {result.contexts.map((ctx) => (
                  <Chip key={ctx} label={ctx} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                ))}
              </Box>
            )}

            <Divider sx={{ mb: 2 }} />

            {(!result.verses || result.verses.length === 0) ? (
              <Alert severity="info" icon={<MenuBookIcon />}>
                Nenhum versículo encontrado com relevância semântica suficiente para esses contextos.
                Tente palavras-chave mais diretas ou ajuste os contextos.
              </Alert>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    {result.total} versículo(s) encontrado(s) — em ordem cronológica bíblica
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => exportToExcel(result.verses, result.contexts, result.query || query)}
                  >
                    Exportar Excel
                  </Button>
                </Stack>
                <Stack spacing={2}>
                  {result.verses.map((v) => (
                    <Card key={`${v.book}-${v.chapter}-${v.number}-${v.version}`} variant="outlined">
                      <CardContent sx={{ pb: '12px !important' }}>
                        <Typography variant="subtitle1" color="primary" fontWeight={700} sx={{ mb: 0.75 }}>
                          {v.reference}
                        </Typography>
                        <VerseText text={v.text} pattern={highlightPattern} />
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </>
            )}
          </Box>
        )}
      </PapperBlock>
    </div>
  );
};

export default BibleSearchPage;
