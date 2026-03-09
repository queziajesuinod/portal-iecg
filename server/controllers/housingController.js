const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { generateHousingAllocation } = require('../services/llmAllocationService');
const REGISTRATION_ATTRIBUTES = Object.keys(db.Registration.rawAttributes || {});
const REGISTRATION_ATTENDEE_ATTRIBUTES = Object.keys(db.RegistrationAttendee.rawAttributes || {});
const REGISTRATION_LLM_ATTRIBUTES = [
  'id',
  'orderCode',
  'eventId',
  'batchId',
  'couponId',
  'quantity',
  'originalPrice',
  'discountAmount',
  'finalPrice',
  'paymentStatus',
  'paymentMethod',
  'createdAt'
];
const EVENT_BATCH_LLM_ATTRIBUTES = [
  'id',
  'eventId',
  'name',
  'price',
  'maxQuantity',
  'currentQuantity',
  'startDate',
  'endDate',
  'isActive',
  'order'
];

function sanitizeSnapshotValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object') return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeRulesText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function toHistoryArray(value) {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : [];
}

function toRulesVersion(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeWarnings(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((warning) => String(warning || '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

function mergeRuleLines(baseRules = '', additionalRules = []) {
  const merged = [
    ...normalizeRulesText(baseRules).split('\n').filter(Boolean),
    ...additionalRules.map((line) => String(line || '').trim()).filter(Boolean)
  ];
  const seen = new Set();
  return merged.filter((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function suggestionLinesFromWarnings(warnings = []) {
  const normalizedWarnings = normalizeWarnings(warnings).map((item) => item.toLowerCase());
  const suggestions = [];
  if (normalizedWarnings.some((item) => item.includes('duplicado'))) {
    suggestions.push('- Nao duplicar attendeeId no resultado.');
  }
  if (normalizedWarnings.some((item) => item.includes('quarto invalido'))) {
    suggestions.push('- Usar somente roomId existentes na estrutura de quartos.');
  }
  if (normalizedWarnings.some((item) => item.includes('parcial') || item.includes('cobertura insuficiente'))) {
    suggestions.push('- Priorizar cobertura maxima e alocar todos os elegiveis ate o limite de vagas.');
  }
  if (normalizedWarnings.some((item) => item.includes('sem vagas'))) {
    suggestions.push('- Quando faltar vaga, priorizar melhor encaixe por capacidade antes de dividir grupos.');
  }
  if (normalizedWarnings.some((item) => item.includes('misto'))) {
    suggestions.push('- Evitar quarto misto quando houver sexo informado.');
  }
  if (normalizedWarnings.some((item) => item.includes('lider') && item.includes('violada'))) {
    suggestions.push('- Respeitar a regra de lider_de_celula como bloco quando esta regra estiver ativa.');
  }
  if (!suggestions.length) {
    suggestions.push('- Revisar alocacao para evitar inconsistencias de roomId, duplicidade e baixa cobertura.');
  }
  return suggestions;
}

function improveRulesFromContext(baseRules = '', warnings = [], reasoning = '') {
  const additions = suggestionLinesFromWarnings(warnings);
  const normalizedReasoning = String(reasoning || '').trim();
  if (normalizedReasoning) {
    additions.push(`- Contexto da ultima geracao: ${normalizedReasoning.slice(0, 280)}`);
  }
  return mergeRuleLines(baseRules, additions).join('\n');
}

function applyRulesVersionUpdate(config, payload = {}) {
  const currentRules = normalizeRulesText(config.customRules || '');
  const nextRules = normalizeRulesText(payload.nextRules);
  const source = String(payload.source || 'manual').trim() || 'manual';
  const warnings = normalizeWarnings(payload.warnings);
  const reasoning = String(payload.reasoning || '').trim();

  if (currentRules === nextRules) {
    return {
      changed: false,
      previousRules: currentRules,
      nextRules
    };
  }

  const currentVersion = toRulesVersion(config.customRulesVersion);
  const nextVersion = currentVersion + 1;
  const history = toHistoryArray(config.customRulesHistory);
  history.push({
    id: uuidv4(),
    source,
    fromVersion: currentVersion,
    toVersion: nextVersion,
    previousRules: currentRules || null,
    nextRules: nextRules || null,
    warnings,
    reasoning: reasoning || null,
    createdAt: new Date().toISOString()
  });

  config.customRulesHistory = history.slice(-100);
  config.customRulesVersion = nextVersion;
  config.customRules = nextRules || null;

  return {
    changed: true,
    previousRules: currentRules,
    nextRules
  };
}

function serializeConfig(config) {
  if (!config) return null;
  const payload = config.toJSON ? config.toJSON() : { ...config };
  payload.customRulesHistory = toHistoryArray(payload.customRulesHistory);
  payload.customRulesVersion = toRulesVersion(payload.customRulesVersion);
  payload.customRules = payload.customRules || '';
  return payload;
}

async function getConfig(req, res) {
  try {
    const { eventId } = req.params;
    const config = await db.EventHousingConfig.findOne({
      where: { eventId },
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
    });
    return res.json(serializeConfig(config));
  } catch (error) {
    console.error('housingController.getConfig:', error);
    return res.status(500).json({ error: 'Erro ao buscar configuracao de hospedagem' });
  }
}

async function getAvailableFields(req, res) {
  try {
    const { eventId } = req.params;
    const attendees = await db.RegistrationAttendee.findAll({
      attributes: ['id', 'attendeeData'],
      include: [
        {
          model: db.Registration,
          as: 'registration',
          where: { eventId, paymentStatus: 'confirmed' },
          attributes: ['id']
        }
      ]
    });

    const fields = Array.from(new Set(attendees.flatMap((attendee) => {
      const data = attendee.attendeeData;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return [];
      }
      return Object.keys(data);
    }))).sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));

    const registrationFields = [...REGISTRATION_ATTRIBUTES]
      .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));
    const registrationAttendeeFields = [...REGISTRATION_ATTENDEE_ATTRIBUTES]
      .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));

    const flattenedFields = [
      ...fields.map((field) => `attendeeData.${field}`),
      ...registrationFields.map((field) => `registration.${field}`),
      ...registrationAttendeeFields.map((field) => `registrationAttendee.${field}`)
    ];

    return res.json({
      fields: flattenedFields,
      byTable: {
        attendeeData: fields,
        registrations: registrationFields,
        registrationAttendees: registrationAttendeeFields
      },
      totalAttendees: attendees.length
    });
  } catch (error) {
    console.error('housingController.getAvailableFields:', error);
    return res.status(500).json({ error: 'Erro ao buscar campos de attendeeData' });
  }
}

async function saveConfig(req, res) {
  try {
    const { eventId } = req.params;
    const { rooms, customRules, rulesMeta } = req.body;
    const rulesUpdateMeta = rulesMeta && typeof rulesMeta === 'object' ? rulesMeta : {};
    const hasCustomRules = Object.prototype.hasOwnProperty.call(req.body || {}, 'customRules');
    const normalizedRules = hasCustomRules ? normalizeRulesText(customRules) : null;

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ error: 'Informe ao menos um quarto.' });
    }

    const invalidRoom = rooms.find((room) => !room.name || !room.capacity || Number(room.capacity) < 1);
    if (invalidRoom) {
      return res.status(400).json({ error: 'Cada quarto precisa de nome e capacidade valida.' });
    }

    const normalizedRooms = rooms.map((room) => ({
      ...room,
      id: room.id || uuidv4(),
      capacity: parseInt(room.capacity, 10)
    }));

    const existingConfigs = await db.EventHousingConfig.findAll({
      where: { eventId },
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
    });

    const latestConfig = existingConfigs[0] || null;
    if (latestConfig) {
      latestConfig.rooms = normalizedRooms;
      if (!latestConfig.customRulesVersion) {
        latestConfig.customRulesVersion = 1;
      }
      if (!Array.isArray(latestConfig.customRulesHistory)) {
        latestConfig.customRulesHistory = [];
      }
      if (hasCustomRules) {
        applyRulesVersionUpdate(latestConfig, {
          nextRules: normalizedRules,
          source: rulesUpdateMeta.source || 'manual',
          warnings: rulesUpdateMeta.warnings,
          reasoning: rulesUpdateMeta.reasoning
        });
      }
      await latestConfig.save();

      if (existingConfigs.length > 1) {
        const duplicatedIds = existingConfigs.slice(1).map((item) => item.id);
        await db.EventHousingConfig.destroy({
          where: { id: duplicatedIds }
        });
      }

      return res.status(200).json(serializeConfig(latestConfig));
    }

    const createdConfig = await db.EventHousingConfig.create({
      id: uuidv4(),
      eventId,
      rooms: normalizedRooms,
      customRules: hasCustomRules ? (normalizedRules || null) : null,
      customRulesVersion: 1,
      customRulesHistory: []
    });

    return res.status(201).json(serializeConfig(createdConfig));
  } catch (error) {
    console.error('housingController.saveConfig:', error);
    return res.status(500).json({ error: 'Erro ao salvar configuracao de hospedagem' });
  }
}

async function improveInstructions(req, res) {
  try {
    const { eventId } = req.params;
    const { baseRules, warnings, reasoning } = req.body || {};

    const config = await db.EventHousingConfig.findOne({
      where: { eventId },
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
    });

    if (!config) {
      return res.status(400).json({ error: 'Configure os quartos antes de aprimorar as instrucoes.' });
    }

    if (!config.customRulesVersion) {
      config.customRulesVersion = 1;
    }
    if (!Array.isArray(config.customRulesHistory)) {
      config.customRulesHistory = [];
    }

    const base = normalizeRulesText(baseRules || config.customRules || '');
    const improvedRules = improveRulesFromContext(base, warnings, reasoning);
    const updateResult = applyRulesVersionUpdate(config, {
      nextRules: improvedRules,
      source: 'auto_improvement',
      warnings,
      reasoning
    });

    if (updateResult.changed) {
      await config.save();
    }

    return res.json({
      changed: updateResult.changed,
      previousRules: updateResult.previousRules,
      customRules: normalizeRulesText(config.customRules || improvedRules),
      customRulesVersion: toRulesVersion(config.customRulesVersion),
      customRulesHistory: toHistoryArray(config.customRulesHistory),
      appliedSuggestions: suggestionLinesFromWarnings(warnings)
    });
  } catch (error) {
    console.error('housingController.improveInstructions:', error);
    return res.status(500).json({ error: 'Erro ao aprimorar instrucoes de hospedagem' });
  }
}

async function generate(req, res) {
  try {
    const { eventId } = req.params;
    const { customRules } = req.body;

    const config = await db.EventHousingConfig.findOne({
      where: { eventId },
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
    });
    if (!config) {
      return res.status(400).json({ error: 'Configure os quartos antes de gerar a alocacao.' });
    }

    const attendees = await db.RegistrationAttendee.findAll({
      include: [
        {
          model: db.Registration,
          as: 'registration',
          where: { eventId, paymentStatus: 'confirmed' },
          attributes: REGISTRATION_LLM_ATTRIBUTES
        },
        {
          model: db.EventBatch,
          as: 'batch',
          required: false,
          attributes: EVENT_BATCH_LLM_ATTRIBUTES
        }
      ]
    });

    if (!attendees || attendees.length === 0) {
      return res.status(400).json({ error: 'Nenhum inscrito confirmado encontrado para este evento.' });
    }

    const rawAttendees = attendees.map((attendee) => ({
      id: attendee.id,
      registrationId: attendee.registrationId,
      batchId: attendee.batchId,
      attendeeNumber: attendee.attendeeNumber,
      attendeeData: attendee.attendeeData,
      registrationAttendee: {
        id: attendee.id,
        registrationId: attendee.registrationId,
        batchId: attendee.batchId,
        attendeeNumber: attendee.attendeeNumber,
        createdAt: attendee.createdAt,
        updatedAt: attendee.updatedAt
      },
      registration: attendee.registration ? attendee.registration.toJSON() : null,
      batch: attendee.batch ? attendee.batch.toJSON() : null
    }));

    const rulesToUse = customRules || config.customRules || '';
    const result = await generateHousingAllocation(rawAttendees, config.rooms, rulesToUse);

    return res.json({
      allocation: result.allocation,
      warnings: result.warnings || [],
      reasoning: result.reasoning || '',
      totalAttendees: attendees.length,
      totalSlots: (config.rooms || []).reduce((sum, room) => sum + Number(room.capacity || 0), 0),
      customRulesVersion: toRulesVersion(config.customRulesVersion),
      customRulesUsed: rulesToUse
    });
  } catch (error) {
    console.error('housingController.generate:', error);
    return res.status(500).json({ error: `Erro ao gerar alocacao: ${error.message}` });
  }
}

async function saveAllocation(req, res) {
  try {
    const { eventId } = req.params;
    const { allocation, reasoning } = req.body;

    if (!allocation || !Array.isArray(allocation) || allocation.length === 0) {
      return res.status(400).json({ error: 'Informe a alocacao a ser salva.' });
    }

    await db.EventHousingAllocation.destroy({ where: { eventId } });

    const attendeeIds = Array.from(new Set(
      allocation
        .map((item) => String(item?.attendeeId || '').trim())
        .filter(Boolean)
    ));

    const attendees = attendeeIds.length
      ? await db.RegistrationAttendee.findAll({
        where: { id: attendeeIds },
        attributes: ['id', 'attendeeData']
      })
      : [];

    const attendeeDataById = new Map(attendees.map((attendee) => [
      String(attendee.id),
      attendee?.attendeeData && typeof attendee.attendeeData === 'object' && !Array.isArray(attendee.attendeeData)
        ? attendee.attendeeData
        : {}
    ]));

    const now = new Date();
    const rows = allocation.map((item) => {
      const attendeeData = attendeeDataById.get(String(item.attendeeId || '')) || {};
      return {
        id: uuidv4(),
        eventId,
        attendeeId: item.attendeeId,
        roomId: item.roomId,
        roomName: item.roomName,
        slotLabel: item.slotLabel,
        idade: sanitizeSnapshotValue(attendeeData.idade),
        lider_de_celula: sanitizeSnapshotValue(attendeeData.lider_de_celula),
        llmReasoning: reasoning || null,
        generatedAt: now,
        createdAt: now,
        updatedAt: now
      };
    });

    await db.EventHousingAllocation.bulkCreate(rows);

    return res.json({ message: 'Alocacao de hospedagem salva com sucesso.', total: rows.length });
  } catch (error) {
    console.error('housingController.saveAllocation:', error);
    return res.status(500).json({ error: 'Erro ao salvar alocacao de hospedagem' });
  }
}

async function getAllocation(req, res) {
  try {
    const { eventId } = req.params;

    const allocation = await db.EventHousingAllocation.findAll({
      where: { eventId },
      include: [
        {
          model: db.RegistrationAttendee,
          as: 'attendee',
          attributes: ['id', 'attendeeData', 'attendeeNumber', 'registrationId']
        }
      ],
      order: [['slotLabel', 'ASC']]
    });

    return res.json(allocation);
  } catch (error) {
    console.error('housingController.getAllocation:', error);
    return res.status(500).json({ error: 'Erro ao buscar alocacao de hospedagem' });
  }
}

module.exports = {
  getConfig,
  getAvailableFields,
  saveConfig,
  improveInstructions,
  generate,
  saveAllocation,
  getAllocation
};
