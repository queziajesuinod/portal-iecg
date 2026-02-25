/**
 * llmAllocationService.js
 *
 * Serviço responsável por toda a lógica de alocação inteligente via LLM (OpenAI).
 * Recebe inscritos normalizados + estrutura + regras → devolve alocação.
 */

const axios = require('axios');

// ─── Helpers de normalização ──────────────────────────────────────────────────

/**
 * Extrai todos os campos únicos presentes nos attendeeData dos inscritos.
 */
function extractAvailableFields(attendees) {
  const fields = new Set();
  attendees.forEach((a) => {
    if (a.attendeeData && typeof a.attendeeData === 'object') {
      Object.keys(a.attendeeData).forEach((k) => fields.add(k));
    }
  });
  return Array.from(fields);
}

/**
 * Normaliza o campo sexo para "M" ou "F" independente do formato do evento.
 */
function normalizeSexo(valor) {
  if (!valor) return null;
  const v = valor.toString().toLowerCase().trim();
  if (['m', 'masculino', 'homem', 'male', 'masc'].includes(v)) return 'M';
  if (['f', 'feminino', 'mulher', 'female', 'fem'].includes(v)) return 'F';
  return valor; // devolve original se não reconhecer
}

/**
 * Calcula idade a partir de data de nascimento ou campo idade direto.
 */
function calcularIdade(attendeeData) {
  // Tenta campo numérico direto
  if (attendeeData.idade) {
    const n = parseInt(attendeeData.idade, 10);
    if (!Number.isNaN(n)) return n;
  }
  // Tenta data de nascimento
  const camposDt = ['data_de_nascimento', 'data_nascimento', 'nascimento', 'birthdate', 'birth_date'];
  for (const campo of camposDt) {
    if (attendeeData[campo]) {
      try {
        const nascimento = new Date(attendeeData[campo]);
        const hoje = new Date();
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
        if (!Number.isNaN(idade) && idade >= 0) return idade;
      } catch (_) {
        // ignora erros de parse
      }
    }
  }
  return null;
}

/**
 * Normaliza os inscritos para um formato limpo antes de enviar ao LLM.
 * Agrupa por registrationId para identificar grupos da mesma compra.
 */
function normalizeAttendees(rawAttendees) {
  return rawAttendees.map((a) => {
    const data = a.attendeeData || {};
    return {
      id: a.id,
      nome: data.nome_completo || data.nome || `Inscrito ${a.attendeeNumber}`,
      registrationId: a.registrationId, // mesmo registrationId = mesma compra = ficam juntos
      sexo: normalizeSexo(data.sexo || data.genero || data.gender),
      idade: calcularIdade(data),
      camposDinamicos: data, // todos os campos originais ficam disponíveis
    };
  });
}

// ─── Housing (Hospedagem) ──────────────────────────────────────────────────────

/**
 * Gera alocação de hospedagem usando o LLM.
 *
 * @param {Array}  rawAttendees   - Registros brutos de RegistrationAttendees
 * @param {Array}  rooms          - [{id, name, capacity}]
 * @param {string} customRules    - Regras em linguagem natural do usuário
 * @returns {Object} { allocation, warnings, reasoning }
 */
async function generateHousingAllocation(rawAttendees, rooms, customRules = '') {
  const attendees = normalizeAttendees(rawAttendees);
  const availableFields = extractAvailableFields(rawAttendees);

  // Monta as camas disponíveis expandidas
  const roomsExpanded = rooms.map((room) => {
    const slots = Array.from({ length: room.capacity }, (_, i) => ({
      slotLabel: `${room.id}.${i + 1}`,
    }));
    return { ...room, slots, totalSlots: room.capacity };
  });

  const totalSlots = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const totalAttendees = attendees.length;

  const prompt = `Você é um sistema especializado em alocação de hospedagem para eventos.

## Estrutura de Quartos Disponíveis
${JSON.stringify(roomsExpanded, null, 2)}

Total de vagas: ${totalSlots}
Total de inscritos: ${totalAttendees}
${totalAttendees > totalSlots ? `⚠️ ATENÇÃO: Há mais inscritos (${totalAttendees}) do que vagas (${totalSlots})! Aloque o máximo possível e liste os não alocados em warnings.` : ''}

## Campos disponíveis nos dados dos inscritos
${availableFields.join(', ')}

## Regras OBRIGATÓRIAS do sistema (sempre aplicar)
1. Inscritos com o MESMO registrationId fizeram parte da mesma compra — devem ficar no MESMO quarto
2. Dentro de cada quarto, ordenar alfabeticamente pelo nome
3. As camas são numeradas como roomId.numero (ex: 1.1, 1.2, 2.1, 2.2)
4. Separar por sexo: masculinos em quartos separados de femininas (se possível pela quantidade de vagas)

## Regras adicionais definidas pelo organizador
${customRules || 'Nenhuma regra adicional informada.'}

## Lista de Inscritos
${JSON.stringify(attendees, null, 2)}

## Instruções de resposta
Retorne um objeto JSON no seguinte formato:
{
  "allocation": [
    {
      "attendeeId": "uuid-do-inscrito",
      "nome": "Nome do Inscrito",
      "roomId": "1",
      "roomName": "Quarto 1",
      "slotLabel": "1.1"
    }
  ],
  "warnings": [
    "Descrição de qualquer regra que não pôde ser satisfeita ou conflito encontrado"
  ],
  "reasoning": "Explicação resumida das principais decisões de alocação"
}`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  try {
    return JSON.parse(response.data.choices[0].message.content);
  } catch (err) {
    throw new Error(`Falha ao parsear resposta do LLM: ${err.message}`);
  }
}

// ─── Teams (Times) ────────────────────────────────────────────────────────────

/**
 * Gera alocação de times usando o LLM.
 *
 * @param {Array}  rawAttendees   - Registros brutos de RegistrationAttendees
 * @param {Object} teamsConfig    - { teamsCount, playersPerTeam, teamNames }
 * @param {string} customRules    - Regras em linguagem natural do usuário
 * @returns {Object} { allocation, warnings, reasoning, teamsSummary }
 */
async function generateTeamsAllocation(rawAttendees, teamsConfig, customRules = '') {
  const attendees = normalizeAttendees(rawAttendees);
  const availableFields = extractAvailableFields(rawAttendees);

  const { teamsCount, playersPerTeam, teamNames } = teamsConfig;

  // Monta nomes dos times
  const times = Array.from({ length: teamsCount }, (_, i) => ({
    id: String(i + 1),
    name: (teamNames && teamNames[i]) || `Time ${i + 1}`,
    maxPlayers: playersPerTeam || Math.ceil(attendees.length / teamsCount),
  }));

  const prompt = `Você é um sistema especializado em divisão equilibrada de times para eventos.

## Configuração dos Times
${JSON.stringify(times, null, 2)}

Total de inscritos: ${attendees.length}
Jogadores por time (aproximado): ${playersPerTeam || Math.ceil(attendees.length / teamsCount)}

## Campos disponíveis nos dados dos inscritos
${availableFields.join(', ')}

## Regras OBRIGATÓRIAS do sistema (sempre aplicar, em ordem de prioridade)
1. Inscritos com o MESMO registrationId fizeram parte da mesma compra — presumir que são amigos/família e devem ficar NO MESMO TIME
2. Equilibrar a quantidade de HOMENS e MULHERES entre os times (distribuição proporcional)
3. Equilibrar a FAIXA ETÁRIA entre os times (não concentrar todos os mais velhos ou mais novos num único time)
4. Os times devem ter tamanhos o mais iguais possível

## Regras adicionais definidas pelo organizador
${customRules || 'Nenhuma regra adicional informada.'}

## Lista de Inscritos
${JSON.stringify(attendees, null, 2)}

## Instruções de resposta
Retorne um objeto JSON no seguinte formato:
{
  "allocation": [
    {
      "attendeeId": "uuid-do-inscrito",
      "nome": "Nome do Inscrito",
      "teamId": "1",
      "teamName": "Time 1"
    }
  ],
  "teamsSummary": [
    {
      "teamId": "1",
      "teamName": "Time 1",
      "total": 10,
      "masculino": 5,
      "feminino": 5,
      "idadeMedia": 22.3
    }
  ],
  "warnings": [
    "Descrição de qualquer regra que não pôde ser satisfeita ou conflito encontrado"
  ],
  "reasoning": "Explicação resumida das principais decisões de distribuição"
}`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  try {
    return JSON.parse(response.data.choices[0].message.content);
  } catch (err) {
    throw new Error(`Falha ao parsear resposta do LLM: ${err.message}`);
  }
}

module.exports = {
  generateHousingAllocation,
  generateTeamsAllocation,
  normalizeAttendees,
  extractAvailableFields,
};
