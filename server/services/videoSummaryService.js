const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 2048;

const SYSTEM_PROMPT = `Voce e um assistente especializado em resumir pregacoes evangelicas, ensinos biblicos e cultos cristaos em portugues do Brasil.

Sua tarefa e:
1. Ler a transcricao completa de um video
2. Produzir um resumo claro e fiel ao conteudo original
3. Listar os pontos principais para que o leitor entenda a mensagem sem assistir ao video

Diretrizes:
- PRESERVE referencias biblicas exatamente (livros, capitulos, versiculos: ex. "Joao 3:16", "Salmos 23")
- PRESERVE nomes biblicos com grafia correta (Habacuque, Melquisedeque, Sadraque, Mesaque, Abednego, etc.)
- PRESERVE nomes de pessoas, lugares e citacoes diretas
- NAO invente conteudo que nao esta na transcricao
- Use linguagem clara, respeitosa e fiel ao tom original
- O resumo deve ter 3-5 paragrafos, capturando: tese central, argumentos principais, exemplos/historias usadas, aplicacoes praticas
- Os pontos principais (bulletPoints) devem ser 5-7 frases curtas e independentes, cada uma com um ensinamento ou aplicacao concreta

SAIDA: responda APENAS com um JSON valido neste formato exato, sem comentarios ou texto antes/depois:
{
  "summary": "Texto do resumo em 3-5 paragrafos. Separe paragrafos com \\n\\n.",
  "bulletPoints": [
    "Primeiro ponto principal",
    "Segundo ponto principal",
    "..."
  ]
}`;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY nao configurada no .env');
  }
  return new Anthropic({ apiKey });
}

function extractJson(text) {
  const cleaned = String(text)
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
    throw new Error(`Falha ao parsear JSON da resposta do Claude: ${err.message}`);
  }
}

async function generateSummary(transcript, { title, language = 'pt', model = DEFAULT_MODEL } = {}) {
  if (!transcript || !transcript.trim()) {
    throw new Error('Transcricao vazia');
  }

  const client = getClient();
  const userMessage = `Titulo do video: ${title || '(sem titulo)'}\nIdioma: ${language}\n\nTranscricao completa:\n\n${transcript}`;

  const response = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const rawText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  const parsed = extractJson(rawText);

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    bulletPoints: Array.isArray(parsed.bulletPoints)
      ? parsed.bulletPoints.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim())
      : [],
    usage: response.usage,
    model: response.model,
  };
}

module.exports = {
  generateSummary,
  SYSTEM_PROMPT,
};
