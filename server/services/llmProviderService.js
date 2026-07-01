const axios = require('axios');

// Adaptador genérico de LLM. Permite trocar de provedor só mudando LLM_PROVIDER no .env.
// Provedores suportados:
//   - gemini  (Google AI Studio — tier gratuito generoso)        GEMINI_API_KEY
//   - groq    (Llama — gratuito, rápido, compatível com OpenAI)  GROQ_API_KEY
//   - claude  (Anthropic — pago, SDK já instalado)               ANTHROPIC_API_KEY
//
// Expõe uma única função chatJson(systemPrompt, userMessage) que retorna um objeto JSON
// já parseado, normalizando as diferenças entre provedores.

const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

const DEFAULT_MODELS = {
  gemini: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  groq: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  claude: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
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

async function callGemini(systemPrompt, userMessage, retries = 2) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada no .env');
  const model = DEFAULT_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { data } = await axios.post(
        url,
        {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            // Modelos "thinking" (2.5) gastam orçamento pensando e devolvem vazio;
            // desligamos para garantir a saída JSON.
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
        { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
      );
      const candidate = data?.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';
      if (!text) {
        const reason = candidate?.finishReason || 'desconhecido';
        throw new Error(`Gemini retornou resposta vazia (finishReason: ${reason}).`);
      }
      return extractJson(text);
    } catch (err) {
      lastErr = err;
      // Só faz retry em erros temporários (503/429)
      const status = err.response?.status;
      if ((status === 503 || status === 429) && attempt < retries) {
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function callOpenAICompatible(baseURL, apiKey, model, systemPrompt, userMessage) {
  const { data } = await axios.post(
    `${baseURL}/chat/completions`,
    {
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    },
    { timeout: 30000, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  );
  return extractJson(data?.choices?.[0]?.message?.content || '');
}

async function callGroq(systemPrompt, userMessage) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada no .env');
  return callOpenAICompatible('https://api.groq.com/openai/v1', apiKey, DEFAULT_MODELS.groq, systemPrompt, userMessage);
}

async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no .env');
  // SDK já instalado no projeto.
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: DEFAULT_MODELS.claude,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: `${userMessage}\n\nResponda APENAS com um objeto JSON válido.` }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return extractJson(text);
}

/**
 * Envia um prompt e retorna a resposta da LLM já parseada como objeto JSON.
 */
async function chatJson(systemPrompt, userMessage) {
  switch (PROVIDER) {
    case 'gemini':
      return callGemini(systemPrompt, userMessage);
    case 'groq':
      return callGroq(systemPrompt, userMessage);
    case 'claude':
      return callClaude(systemPrompt, userMessage);
    default:
      throw new Error(`LLM_PROVIDER desconhecido: "${PROVIDER}". Use gemini, groq ou claude.`);
  }
}

module.exports = {
  chatJson,
  PROVIDER,
};
