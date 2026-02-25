/**
 * housingController.js
 * Controller para o módulo de Hospedagem de Eventos.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { generateHousingAllocation } = require('../services/llmAllocationService');

// ─── Configuração ──────────────────────────────────────────────────────────────

/**
 * GET /:eventId/housing/config
 * Retorna a configuração atual de quartos do evento.
 */
async function getConfig(req, res) {
  try {
    const { eventId } = req.params;
    const config = await db.EventHousingConfig.findOne({ where: { eventId } });
    return res.json(config || null);
  } catch (error) {
    console.error('housingController.getConfig:', error);
    return res.status(500).json({ error: 'Erro ao buscar configuração de hospedagem' });
  }
}

/**
 * POST /:eventId/housing/config
 * Salva (cria ou atualiza) a configuração de quartos do evento.
 * Body: { rooms: [{id, name, capacity}], customRules: "texto livre" }
 */
async function saveConfig(req, res) {
  try {
    const { eventId } = req.params;
    const { rooms, customRules } = req.body;

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ error: 'Informe ao menos um quarto.' });
    }

    // Valida cada quarto
    for (const room of rooms) {
      if (!room.name || !room.capacity || room.capacity < 1) {
        return res.status(400).json({ error: 'Cada quarto precisa de nome e capacidade válida.' });
      }
      if (!room.id) room.id = uuidv4();
    }

    const [config, created] = await db.EventHousingConfig.upsert(
      { eventId, rooms, customRules: customRules || null },
      { returning: true }
    );

    return res.status(created ? 201 : 200).json(config);
  } catch (error) {
    console.error('housingController.saveConfig:', error);
    return res.status(500).json({ error: 'Erro ao salvar configuração de hospedagem' });
  }
}

// ─── Geração via LLM ──────────────────────────────────────────────────────────

/**
 * POST /:eventId/housing/generate
 * Gera alocação de hospedagem usando o LLM.
 * Body: { customRules: "texto livre opcional" }
 */
async function generate(req, res) {
  try {
    const { eventId } = req.params;
    const { customRules } = req.body;

    // 1. Busca configuração de quartos
    const config = await db.EventHousingConfig.findOne({ where: { eventId } });
    if (!config) {
      return res.status(400).json({ error: 'Configure os quartos antes de gerar a alocação.' });
    }

    // 2. Busca todos os inscritos confirmados do evento
    const attendees = await db.RegistrationAttendee.findAll({
      include: [
        {
          model: db.Registration,
          as: 'registration',
          where: { eventId, status: 'confirmed' },
          attributes: ['id', 'status'],
        },
      ],
    });

    if (!attendees || attendees.length === 0) {
      return res.status(400).json({ error: 'Nenhum inscrito confirmado encontrado para este evento.' });
    }

    // 3. Formata attendees para o serviço LLM
    const rawAttendees = attendees.map((a) => ({
      id: a.id,
      registrationId: a.registrationId,
      attendeeNumber: a.attendeeNumber,
      attendeeData: a.attendeeData,
    }));

    // 4. Chama o LLM
    const rulesToUse = customRules || config.customRules || '';
    const result = await generateHousingAllocation(rawAttendees, config.rooms, rulesToUse);

    return res.json({
      allocation: result.allocation,
      warnings: result.warnings || [],
      reasoning: result.reasoning || '',
      totalAttendees: attendees.length,
      totalSlots: config.rooms.reduce((sum, r) => sum + r.capacity, 0),
    });
  } catch (error) {
    console.error('housingController.generate:', error);
    return res.status(500).json({ error: `Erro ao gerar alocação: ${error.message}` });
  }
}

// ─── Salvar resultado final ───────────────────────────────────────────────────

/**
 * PUT /:eventId/housing/allocation
 * Salva a alocação final (após possível ajuste manual pelo usuário).
 * Body: { allocation: [{attendeeId, roomId, roomName, slotLabel}] }
 */
async function saveAllocation(req, res) {
  try {
    const { eventId } = req.params;
    const { allocation, reasoning } = req.body;

    if (!allocation || !Array.isArray(allocation) || allocation.length === 0) {
      return res.status(400).json({ error: 'Informe a alocação a ser salva.' });
    }

    // Remove alocação anterior do evento
    await db.EventHousingAllocation.destroy({ where: { eventId } });

    // Insere nova alocação
    const now = new Date();
    const rows = allocation.map((item) => ({
      id: uuidv4(),
      eventId,
      attendeeId: item.attendeeId,
      roomId: item.roomId,
      roomName: item.roomName,
      slotLabel: item.slotLabel,
      llmReasoning: reasoning || null,
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    }));

    await db.EventHousingAllocation.bulkCreate(rows);

    return res.json({ message: 'Alocação de hospedagem salva com sucesso.', total: rows.length });
  } catch (error) {
    console.error('housingController.saveAllocation:', error);
    return res.status(500).json({ error: 'Erro ao salvar alocação de hospedagem' });
  }
}

/**
 * GET /:eventId/housing/allocation
 * Retorna a alocação salva do evento com dados do inscrito.
 */
async function getAllocation(req, res) {
  try {
    const { eventId } = req.params;

    const allocation = await db.EventHousingAllocation.findAll({
      where: { eventId },
      include: [
        {
          model: db.RegistrationAttendee,
          as: 'attendee',
          attributes: ['id', 'attendeeData', 'attendeeNumber', 'registrationId'],
        },
      ],
      order: [['slotLabel', 'ASC']],
    });

    return res.json(allocation);
  } catch (error) {
    console.error('housingController.getAllocation:', error);
    return res.status(500).json({ error: 'Erro ao buscar alocação de hospedagem' });
  }
}

module.exports = {
  getConfig,
  saveConfig,
  generate,
  saveAllocation,
  getAllocation,
};
