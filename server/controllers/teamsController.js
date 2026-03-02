const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { generateTeamsAllocation } = require('../services/llmAllocationService');
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

async function getConfig(req, res) {
  try {
    const { eventId } = req.params;
    const config = await db.EventTeamsConfig.findOne({
      where: { eventId },
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
    });
    return res.json(config || null);
  } catch (error) {
    console.error('teamsController.getConfig:', error);
    return res.status(500).json({ error: 'Erro ao buscar configuracao de times' });
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
    console.error('teamsController.getAvailableFields:', error);
    return res.status(500).json({ error: 'Erro ao buscar campos de attendeeData' });
  }
}

async function saveConfig(req, res) {
  try {
    const { eventId } = req.params;
    const {
      teamsCount,
      playersPerTeam,
      teamNames,
      customRules
    } = req.body;

    if (!teamsCount || teamsCount < 2) {
      return res.status(400).json({ error: 'Informe ao menos 2 times.' });
    }

    const existingConfigs = await db.EventTeamsConfig.findAll({
      where: { eventId },
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
    });

    const latestConfig = existingConfigs[0] || null;
    if (latestConfig) {
      latestConfig.teamsCount = parseInt(teamsCount, 10);
      latestConfig.playersPerTeam = playersPerTeam ? parseInt(playersPerTeam, 10) : null;
      latestConfig.teamNames = teamNames || null;
      latestConfig.customRules = customRules || null;
      await latestConfig.save();

      if (existingConfigs.length > 1) {
        const duplicatedIds = existingConfigs.slice(1).map((item) => item.id);
        await db.EventTeamsConfig.destroy({
          where: { id: duplicatedIds }
        });
      }

      return res.status(200).json(latestConfig);
    }

    const createdConfig = await db.EventTeamsConfig.create({
      id: uuidv4(),
      eventId,
      teamsCount: parseInt(teamsCount, 10),
      playersPerTeam: playersPerTeam ? parseInt(playersPerTeam, 10) : null,
      teamNames: teamNames || null,
      customRules: customRules || null
    });

    return res.status(201).json(createdConfig);
  } catch (error) {
    console.error('teamsController.saveConfig:', error);
    return res.status(500).json({ error: 'Erro ao salvar configuracao de times' });
  }
}

async function generate(req, res) {
  try {
    const { eventId } = req.params;
    const { customRules } = req.body;

    const config = await db.EventTeamsConfig.findOne({
      where: { eventId },
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
    });
    if (!config) {
      return res.status(400).json({ error: 'Configure os times antes de gerar a divisao.' });
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
    const result = await generateTeamsAllocation(
      rawAttendees,
      {
        teamsCount: config.teamsCount,
        playersPerTeam: config.playersPerTeam,
        teamNames: config.teamNames
      },
      rulesToUse
    );

    return res.json({
      allocation: result.allocation,
      teamsSummary: result.teamsSummary || [],
      warnings: result.warnings || [],
      reasoning: result.reasoning || '',
      totalAttendees: attendees.length
    });
  } catch (error) {
    console.error('teamsController.generate:', error);
    return res.status(500).json({ error: `Erro ao gerar divisao de times: ${error.message}` });
  }
}

async function saveAllocation(req, res) {
  try {
    const { eventId } = req.params;
    const { allocation, reasoning } = req.body;

    if (!allocation || !Array.isArray(allocation) || allocation.length === 0) {
      return res.status(400).json({ error: 'Informe a alocacao a ser salva.' });
    }

    await db.EventTeamsAllocation.destroy({ where: { eventId } });

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
        teamId: item.teamId,
        teamName: item.teamName,
        idade: sanitizeSnapshotValue(attendeeData.idade),
        lider_de_celula: sanitizeSnapshotValue(attendeeData.lider_de_celula),
        llmReasoning: reasoning || null,
        generatedAt: now,
        createdAt: now,
        updatedAt: now
      };
    });

    await db.EventTeamsAllocation.bulkCreate(rows);

    return res.json({ message: 'Divisao de times salva com sucesso.', total: rows.length });
  } catch (error) {
    console.error('teamsController.saveAllocation:', error);
    return res.status(500).json({ error: 'Erro ao salvar divisao de times' });
  }
}

async function getAllocation(req, res) {
  try {
    const { eventId } = req.params;

    const allocation = await db.EventTeamsAllocation.findAll({
      where: { eventId },
      include: [
        {
          model: db.RegistrationAttendee,
          as: 'attendee',
          attributes: ['id', 'attendeeData', 'attendeeNumber', 'registrationId']
        }
      ],
      order: [['teamId', 'ASC']]
    });

    return res.json(allocation);
  } catch (error) {
    console.error('teamsController.getAllocation:', error);
    return res.status(500).json({ error: 'Erro ao buscar divisao de times' });
  }
}

module.exports = {
  getConfig,
  getAvailableFields,
  saveConfig,
  generate,
  saveAllocation,
  getAllocation
};
