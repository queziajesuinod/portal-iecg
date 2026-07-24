const axios = require('axios');

// Chamador generico de LLM que retorna JSON, com cadeia de fallback entre provedores.
// Tenta cada provedor em ordem e cai para o proximo se falhar. Mesma config do resumo
// de video (VIDEO_SUMMARY_PROVIDERS) por padrao, para reaproveitar as chaves ja existentes.
//
// Difere do llmProviderService (single-provider, modulo Biblia) por ter a cadeia de fallback,
// e do videoSummaryService por ser generico (sem tool-use / prompt de resumo).

const DEFAULT_CHAIN = 'groq,gemini,claude';
const KNOWN_PROVIDERS = ['groq', 'grok', 'gemini', 'claude'];

const DEFAULT_MODELS = {
  claude: process.env.VIDEO_SUMMARY_CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  gemini: process.env.VIDEO_SUMMARY_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  groq: process.env.VIDEO_SUMMARY_GROQ_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  grok: process.env.VIDEO_SUMMARY_GROK_MODEL || process.env.GROK_MODEL || 'grok-2-latest',
};

const PROVIDER_KEY_ENV = {
  claude: () => process.env.ANTHROPIC_API_KEY,
  gemini: () => process.env.GEMINI_API_KEY,
  groq: () => process.env.GROQ_API_KEY,
  grok: () => process.env.GROK_API_KEY || process.env.XAI_API_KEY,
};

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

// Retenta erros transitorios (429/503) antes de desistir e cair para o proximo provedor.
async function withRetry(fn, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if ((status === 429 || status === 503) && attempt < retries) {
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function callGemini(systemPrompt, userMessage, maxTokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY nao configurada no .env');
  const model = DEFAULT_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const { data } = await withRetry(() => axios.post(
    url,
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingBudget: 0 },
      },
    },
    { timeout: 60000, headers: { 'Content-Type': 'application/json' } }
  ));
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) throw new Error(`Gemini retornou vazio (finishReason: ${candidate?.finishReason || 'desconhecido'})`);
  return { parsed: extractJson(text), model };
}

async function callOpenAICompatible(baseURL, apiKey, model, systemPrompt, userMessage, maxTokens) {
  const { data } = await withRetry(() => axios.post(
    `${baseURL}/chat/completions`,
    {
      model,
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    },
    { timeout: 60000, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  ));
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Resposta vazia do provedor');
  return { parsed: extractJson(text), model };
}

async function callGroq(systemPrompt, userMessage, maxTokens) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY nao configurada no .env');
  return callOpenAICompatible('https://api.groq.com/openai/v1', apiKey, DEFAULT_MODELS.groq, systemPrompt, userMessage, maxTokens);
}

async function callGrok(systemPrompt, userMessage, maxTokens) {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('GROK_API_KEY (xAI) nao configurada no .env');
  return callOpenAICompatible('https://api.x.ai/v1', apiKey, DEFAULT_MODELS.grok, systemPrompt, userMessage, maxTokens);
}

async function callClaude(systemPrompt, userMessage, maxTokens) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY nao configurada no .env');
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: DEFAULT_MODELS.claude,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: `${userMessage}\n\nResponda APENAS com um objeto JSON valido.` }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { parsed: extractJson(text), model: response.model };
}

const PROVIDER_FNS = {
  claude: callClaude,
  gemini: callGemini,
  groq: callGroq,
  grok: callGrok,
};

function getChain(override) {
  const raw = override || process.env.LLM_CHAIN_PROVIDERS || process.env.VIDEO_SUMMARY_PROVIDERS || DEFAULT_CHAIN;
  return String(raw)
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => KNOWN_PROVIDERS.includes(p));
}

function hasConfiguredProvider(override) {
  return getChain(override).some((p) => !!PROVIDER_KEY_ENV[p]());
}

/**
 * Envia system+user e retorna { data, provider, model } com o JSON ja parseado.
 * Tenta a cadeia de provedores em ordem; cai para o proximo em caso de falha.
 */
async function chatJson(systemPrompt, userMessage, { chain, maxTokens = 2048 } = {}) {
  const providers = getChain(chain);
  if (!providers.length) {
    throw new Error(`Nenhum provedor valido. Use: ${KNOWN_PROVIDERS.join(', ')}`);
  }

  const errors = [];
  for (const provider of providers) {
    if (!PROVIDER_KEY_ENV[provider]()) {
      console.warn(`[llmChain] provedor "${provider}" sem chave, pulando`);
      continue;
    }
    try {
      const { parsed, model } = await PROVIDER_FNS[provider](systemPrompt, userMessage, maxTokens);
      if (errors.length) {
        console.log(`[llmChain] respondido por "${provider}" apos falha de: ${errors.map((e) => e.provider).join(', ')}`);
      }
      return { data: parsed, provider, model };
    } catch (err) {
      console.warn(`[llmChain] provedor "${provider}" falhou: ${err.message}`);
      errors.push({ provider, message: err.message });
    }
  }

  const detail = errors.map((e) => `${e.provider}: ${e.message}`).join(' | ');
  throw new Error(`Falha em todos os provedores (${detail || 'nenhum provedor tentado'})`);
}

module.exports = {
  chatJson,
  getChain,
  hasConfiguredProvider,
};
