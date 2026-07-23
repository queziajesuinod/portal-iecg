const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const MAX_TOKENS = 3072;

// Cadeia de provedores tentada em ordem no resumo do vídeo.
// Prioriza os gratuitos (Groq/Grok/Gemini) e cai para o Claude (pago) só se os anteriores falharem.
// Configurável via VIDEO_SUMMARY_PROVIDERS (ex.: "grok,gemini,claude").
const DEFAULT_CHAIN = 'groq,gemini,claude';
const KNOWN_PROVIDERS = ['groq', 'grok', 'gemini', 'claude'];

const DEFAULT_MODELS = {
  claude: process.env.VIDEO_SUMMARY_CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  gemini: process.env.VIDEO_SUMMARY_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  groq: process.env.VIDEO_SUMMARY_GROQ_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  grok: process.env.VIDEO_SUMMARY_GROK_MODEL || process.env.GROK_MODEL || 'grok-2-latest',
};

const TOOL_NAME = 'salvar_resumo_video';
const TOOL_DEFINITION = {
  name: TOOL_NAME,
  description: 'Salva o resumo HTML, pontos principais e metadados SEO de um vídeo de pregação',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'HTML formatado com 4-6 parágrafos. Use <p>, <strong>, <em>, <blockquote>, opcionalmente <h3>. Sem <html>, <body> ou wrappers.',
      },
      bulletPoints: {
        type: 'array',
        items: { type: 'string' },
        description: '5 a 7 frases curtas em texto puro, sem HTML, prontas para card devocional.',
      },
      metaTitle: {
        type: 'string',
        description: 'Título SEO para Google, entre 50 e 60 caracteres.',
      },
      metaDescription: {
        type: 'string',
        description: 'Meta description SEO entre 140 e 160 caracteres que convide ao clique.',
      },
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: '5 a 8 palavras-chave em português, minúsculas, sem hashtags.',
      },
      slug: {
        type: 'string',
        description: 'URL-friendly slug do post: lowercase, sem acentos, palavras separadas por hífen, máximo 80 caracteres.',
      },
      speaker: {
        type: 'string',
        description: 'Nome do pregador/orador do video. Extraia preferencialmente do titulo (ex: "Pr. Aldo", "Pra. Mariana", "Bispo Joao"). Se nao aparecer no titulo, infira do conteudo da transcricao se possivel. Se realmente nao for identificavel, deixe vazio. Mantenha o titulo eclesiastico ("Pr.", "Pra.", "Bp.", "Rev.", "Diac.") junto do nome.',
      },
    },
    required: ['summary', 'bulletPoints', 'metaTitle', 'metaDescription', 'keywords', 'slug', 'speaker'],
  },
};

// Corpo do prompt compartilhado por todos os provedores. O bloco final (formato técnico da
// resposta) muda conforme o provedor: Claude usa tool-use; os demais usam JSON puro.
const BASE_PROMPT = `Você é um redator de blog cristão que transforma pregações e ensinos bíblicos em posts otimizados para SEO e leitura confortável no portal de uma igreja.

Seu trabalho é pegar a transcrição de um vídeo (pregação, estudo, culto) e produzir:
1. Um post devocional fluido, calmo, com formatação rica (HTML).
2. Pontos principais para compartilhar em redes sociais.
3. Metadados de SEO prontos para indexação no Google.

═══════════════════════════════════════════════════════════════════
PRINCÍPIOS DE ESCRITA DO RESUMO
═══════════════════════════════════════════════════════════════════
- Linguagem natural, calorosa, próxima de quem lê. Como um pastor escrevendo para a comunidade dele.
- Frases curtas e médias, parágrafos respiráveis (3 a 5 linhas no máximo).
- Conecte ideias com transições suaves ("E é exatamente aqui que...", "Mas o pregador vai além...", "Repare como...").
- Mostre, não apenas resuma. Recrie cenas, histórias e exemplos com pinceladas — o leitor precisa sentir o coração da mensagem.
- Comece com um gancho — uma frase de impacto, pergunta retórica ou cena que prende a atenção.
- Termine com uma reflexão que convide à aplicação prática.
- Evite linguagem acadêmica, jargão eclesiástico desnecessário, frases tipo "o pregador divide o tema em três partes".
- Não use "Em primeiro lugar...", "Em segundo lugar..." — quebra o ritmo.

═══════════════════════════════════════════════════════════════════
FORMATAÇÃO HTML DO RESUMO
═══════════════════════════════════════════════════════════════════
O campo "summary" deve ser HTML válido com a seguinte estrutura:
- Cada parágrafo dentro de <p>...</p>
- Frases de destaque ou ensinamentos centrais: <strong>texto</strong>
- Citações bíblicas curtas integradas no texto podem usar <em>texto</em>
- Versículos completos citados em destaque: <blockquote><p>"...texto..." (Referência)</p></blockquote>
- NÃO use <h1>, <h2>. Pode usar <h3>...</h3> para subtítulos curtos entre seções (no máximo 2 subtítulos no resumo todo).
- NÃO use <ul>, <ol> dentro do resumo — listas vão nos bulletPoints.
- NÃO inclua <html>, <body>, <div> ou qualquer wrapper.
- Total: 4 a 6 parágrafos. Use subtítulos somente se o conteúdo for longo e ganhar com a divisão.

═══════════════════════════════════════════════════════════════════
FIDELIDADE AO CONTEÚDO
═══════════════════════════════════════════════════════════════════
- Preserve referências bíblicas exatamente como aparecem (João 3:16, Salmos 23, Habacuque 2:4).
- Preserve nomes bíblicos com grafia correta (Habacuque, Melquisedeque, Sadraque, Mesaque, Abednego, Naamã, etc.).
- Preserve nomes próprios de pessoas e lugares citados na pregação.
- Nunca invente histórias, versículos, citações ou conclusões que não estão na transcrição.
- Mantenha o tom espiritual original sem suavizar nem dramatizar.

═══════════════════════════════════════════════════════════════════
BULLET POINTS
═══════════════════════════════════════════════════════════════════
- 5 a 7 frases curtas (1 linha cada), em texto puro SEM tags HTML.
- Cada uma autossuficiente, pronta para virar postagem de Instagram ou cartão devocional.
- Não comece com "O pregador disse que..." — escreva o ensinamento direto.

═══════════════════════════════════════════════════════════════════
SEO
═══════════════════════════════════════════════════════════════════
- "metaTitle": título otimizado para Google. Entre 50 e 60 caracteres. Pode incluir o assunto principal + emoção/benefício.
- "metaDescription": resumo conciso e atrativo para o snippet do Google. Entre 140 e 160 caracteres. Termine com algo que convide o clique sem ser sensacionalista.
- "keywords": array com 5 a 8 palavras-chave/expressões relevantes em português, todas minúsculas, sem hashtags. Misture termos amplos ("fé cristã", "evangelho") com específicos do conteúdo do vídeo (nome do livro bíblico, tema do sermão, ex: "salmo 23", "bom pastor", "pregação sobre confiança").
- "slug": versão URL-friendly do título do post (lowercase, sem acentos, palavras separadas por hífen, máximo 80 caracteres). Ex.: "o-bom-pastor-confianca-em-deus".

═══════════════════════════════════════════════════════════════════
IDENTIFICAÇÃO DO ORADOR (SPEAKER)
═══════════════════════════════════════════════════════════════════
- Priorize extrair o nome do orador do TÍTULO do vídeo (geralmente vem como "Pr. Aldo", "Pra. Mariana", "Bp. João").
- Mantenha o título eclesiástico junto: "Pr. Aldo Giovanni", "Pra. Ana Carolina", "Bp. Edir".
- Se o título não traz, verifique se a transcrição apresenta a pessoa ("hoje recebemos o Pr. Silas", "vamos ouvir a Pra. Inês").
- Se ainda não for identificável, retorne string vazia "" — NUNCA invente nome.
- Use apenas o NOME do orador, sem o tema ou contexto extra. Errado: "Pr. Aldo - Sobre família". Certo: "Pr. Aldo".`;

const CLAUDE_FORMAT_ENDING = `═══════════════════════════════════════════════════════════════════
FORMATO TÉCNICO DA RESPOSTA
═══════════════════════════════════════════════════════════════════
Use SEMPRE a ferramenta "${TOOL_NAME}" para entregar o resultado. Não escreva o resumo em texto solto — só chame a ferramenta com os argumentos preenchidos. Os campos obrigatórios são: summary, bulletPoints, metaTitle, metaDescription, keywords, slug.`;

const JSON_FORMAT_ENDING = `═══════════════════════════════════════════════════════════════════
FORMATO TÉCNICO DA RESPOSTA
═══════════════════════════════════════════════════════════════════
Responda APENAS com um único objeto JSON válido (sem markdown, sem crases, sem texto fora do objeto), contendo EXATAMENTE estes campos:
- "summary": string com o HTML do resumo (conforme as regras de formatação acima).
- "bulletPoints": array de 5 a 7 strings em texto puro (sem HTML).
- "metaTitle": string (50 a 60 caracteres).
- "metaDescription": string (140 a 160 caracteres).
- "keywords": array de 5 a 8 strings minúsculas.
- "slug": string url-friendly (máximo 80 caracteres).
- "speaker": string com o nome do orador, ou "" se não for identificável.
Não inclua nenhum texto, comentário ou explicação fora do objeto JSON.`;

// Exportado para retrocompatibilidade / testes.
const SYSTEM_PROMPT = `${BASE_PROMPT}\n\n${CLAUDE_FORMAT_ENDING}`;
const JSON_SYSTEM_PROMPT = `${BASE_PROMPT}\n\n${JSON_FORMAT_ENDING}`;

function extractJson(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error(`Falha ao parsear JSON da resposta da LLM: ${err.message}`);
  }
}

function buildUserMessage(transcript, { title, language }) {
  return `Título do vídeo: ${title || '(sem título)'}\nIdioma: ${language}\n\nTranscrição completa:\n\n${transcript}`;
}

// ───────────────────────────── Provedores ─────────────────────────────

async function callClaude(userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no .env');

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: DEFAULT_MODELS.claude,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [TOOL_DEFINITION],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [{ role: 'user', content: `${userMessage}\n\nUse a ferramenta ${TOOL_NAME} para entregar o resultado.` }],
  });

  const toolUseBlock = response.content.find((b) => b.type === 'tool_use' && b.name === TOOL_NAME);
  if (toolUseBlock && toolUseBlock.input && typeof toolUseBlock.input === 'object') {
    return { parsed: toolUseBlock.input, model: response.model };
  }
  const rawText = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!rawText) throw new Error('Claude não retornou nem tool_use nem texto');
  return { parsed: extractJson(rawText), model: response.model };
}

async function callGemini(userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada no .env');
  const model = DEFAULT_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const { data } = await axios.post(
    url,
    {
      systemInstruction: { parts: [{ text: JSON_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
        // Modelos "thinking" (2.5) consomem orçamento pensando e devolvem vazio; desligamos.
        thinkingConfig: { thinkingBudget: 0 },
      },
    },
    { timeout: 60000, headers: { 'Content-Type': 'application/json' } }
  );
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) throw new Error(`Gemini retornou resposta vazia (finishReason: ${candidate?.finishReason || 'desconhecido'})`);
  return { parsed: extractJson(text), model };
}

async function callOpenAICompatible(baseURL, apiKey, model, userMessage) {
  const { data } = await axios.post(
    `${baseURL}/chat/completions`,
    {
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: JSON_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    },
    { timeout: 60000, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  );
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Resposta vazia do provedor');
  return { parsed: extractJson(text), model };
}

async function callGroq(userMessage) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada no .env');
  return callOpenAICompatible('https://api.groq.com/openai/v1', apiKey, DEFAULT_MODELS.groq, userMessage);
}

async function callGrok(userMessage) {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('GROK_API_KEY (xAI) não configurada no .env');
  return callOpenAICompatible('https://api.x.ai/v1', apiKey, DEFAULT_MODELS.grok, userMessage);
}

const PROVIDER_FNS = {
  claude: callClaude,
  gemini: callGemini,
  groq: callGroq,
  grok: callGrok,
};

const PROVIDER_KEY_ENV = {
  claude: () => process.env.ANTHROPIC_API_KEY,
  gemini: () => process.env.GEMINI_API_KEY,
  groq: () => process.env.GROQ_API_KEY,
  grok: () => process.env.GROK_API_KEY || process.env.XAI_API_KEY,
};

function getProviderChain() {
  return (process.env.VIDEO_SUMMARY_PROVIDERS || DEFAULT_CHAIN)
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => KNOWN_PROVIDERS.includes(p));
}

/**
 * Retorna true se ao menos um provedor da cadeia tem chave configurada.
 * Usado para decidir se vale a pena tentar gerar o resumo.
 */
function hasConfiguredProvider() {
  return getProviderChain().some((p) => !!PROVIDER_KEY_ENV[p]());
}

function normalizeResult(parsed, meta) {
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    bulletPoints: Array.isArray(parsed.bulletPoints)
      ? parsed.bulletPoints.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim())
      : [],
    metaTitle: typeof parsed.metaTitle === 'string' ? parsed.metaTitle.trim().slice(0, 160) : null,
    metaDescription: typeof parsed.metaDescription === 'string' ? parsed.metaDescription.trim().slice(0, 320) : null,
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim().toLowerCase())
      : [],
    slug: typeof parsed.slug === 'string' ? parsed.slug.trim().toLowerCase().slice(0, 200) : null,
    speaker: typeof parsed.speaker === 'string' ? parsed.speaker.trim().slice(0, 160) || null : null,
    provider: meta.provider,
    model: meta.model,
  };
}

async function generateSummary(transcript, { title, language = 'pt' } = {}) {
  if (!transcript || !transcript.trim()) {
    throw new Error('Transcrição vazia');
  }

  const chain = getProviderChain();
  if (!chain.length) {
    throw new Error(`Nenhum provedor válido em VIDEO_SUMMARY_PROVIDERS. Use: ${KNOWN_PROVIDERS.join(', ')}`);
  }

  const userMessage = buildUserMessage(transcript, { title, language });
  const errors = [];

  for (const provider of chain) {
    if (!PROVIDER_KEY_ENV[provider]()) {
      console.warn(`[summary] provedor "${provider}" sem chave configurada, pulando`);
      continue;
    }
    try {
      const { parsed, model } = await PROVIDER_FNS[provider](userMessage);
      const result = normalizeResult(parsed, { provider, model });
      if (!result.summary) throw new Error('resumo vazio na resposta');
      if (errors.length) {
        console.log(`[summary] gerado via "${provider}" após falha de: ${errors.map((e) => e.provider).join(', ')}`);
      }
      return result;
    } catch (err) {
      console.warn(`[summary] provedor "${provider}" falhou: ${err.message}`);
      errors.push({ provider, message: err.message });
    }
  }

  const detail = errors.map((e) => `${e.provider}: ${e.message}`).join(' | ');
  throw new Error(`Falha ao gerar resumo em todos os provedores (${detail || 'nenhum provedor tentado'})`);
}

module.exports = {
  generateSummary,
  getProviderChain,
  hasConfiguredProvider,
  SYSTEM_PROMPT,
};
