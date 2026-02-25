/**
 * teamsController.js
 * Controller para o módulo de Divisão de Times de Eventos.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const { generateTeamsAllocation } = require('../services/llmAllocationService');

// ─── Configuração ──────────────────────────────────────────────────────────────

/**
 * GET /:eventId/teams/config
 * Retorna a configuração atual de times do evento.
 */
async function getConfig(req, res) {
  try {
    const { eventId } = req.params;
    const config = await db.EventTeamsConfig.findOne({ where: { eventId } });
    return res.json(config || null);
  } catch (error) {
    console.error('teamsController.getConfig:', error);
    return res.status(500).json({ error: 'Erro ao buscar configuração de times' });
  }
}

/**
 * POST /:eventId/teams/config
 * Salva (cria ou atualiza) a configuração de times do evento.
 * Body: { teamsCount, playersPerTeam, teamNames, customRules }
 */
async function saveConfig(req, res) {
  try {
    const { eventId } = req.params;
    const { teamsCount, playersPerTeam, teamNames, customRules } = req.body;

    if (!teamsCount || teamsCount < 2) {
      return res.status(400).json({ error: 'Informe ao menos 2 times.' });
    }

    const [config, created] = await db.EventTeamsConfig.upsert(
      {
        eventId,
        teamsCount: parseInt(teamsCount, 10),
        playersPerTeam: playersPerTeam ? parseInt(playersPerTeam, 10) : null,
        teamNames: teamNames || null,
        customRules: customRules || null,
      },
      { returning: true }
    );

    return res.status(created ? 201 : 200).json(config);
  } catch (error) {
    console.error('teamsController.saveConfig:', error);
    return res.status(500).json({ error: 'Erro ao salvar configuração de times' });
  }
}

// ─── Geração via LLM ──────────────────────────────────────────────────────────

/**
 * POST /:eventId/teams/generate
 * Gera a divisão de times usando o LLM.
 * Body: { customRules: "texto livre opcional" }
 */
async function generate(req, res) {
  try {
    const { eventId } = req.params;
    const { customRules } = req.body;

    // 1. Busca configuração de times
    const config = await db.EventTeamsConfig.findOne({ where: { eventId } });
    if (!config) {
      return res.status(400).json({ error: 'Configure os times antes de gerar a divisão.' });
    }

    // 2. Busca inscritos confirmados
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

    // 3. Formata para o serviço
    const rawAttendees = attendees.map((a) => ({
      id: a.id,
      registrationId: a.registrationId,
      attendeeNumber: a.attendeeNumber,
      attendeeData: a.attendeeData,
    }));

    // 4. Chama o LLM
    const rulesToUse = customRules || config.customRules || '';
    const result = await generateTeamsAllocation(
      rawAttendees,
      {
        teamsCount: config.teamsCount,
        playersPerTeam: config.playersPerTeam,
        teamNames: config.teamNames,
      },
      rulesToUse
    );

    return res.json({
      allocation: result.allocation,
      teamsSummary: result.teamsSummary || [],
      warnings: result.warnings || [],
      reasoning: result.reasoning || '',
      totalAttendees: attendees.length,
    });
  } catch (error) {
    console.error('teamsController.generate:', error);
    return res.status(500).json({ error: `Erro ao gerar divisão de times: ${error.message}` });
  }
}

// ─── Salvar resultado final ───────────────────────────────────────────────────

/**
 * PUT /:eventId/teams/allocation
 * Salva a divisão de times final.
 * Body: { allocation: [{attendeeId, teamId, teamName}] }
 */
async function saveAllocation(req, res) {
  try {
    const { eventId } = req.params;
    const { allocation, reasoning } = req.body;

    if (!allocation || !Array.isArray(allocation) || allocation.length === 0) {
      return res.status(400).json({ error: 'Informe a alocação a ser salva.' });
    }

    await db.EventTeamsAllocation.destroy({ where: { eventId } });

    const now = new Date();
    const rows = allocation.map((item) => ({
      id: uuidv4(),
      eventId,
      attendeeId: item.attendeeId,
      teamId: item.teamId,
      teamName: item.teamName,
      llmReasoning: reasoning || null,
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    }));

    await db.EventTeamsAllocation.bulkCreate(rows);

    return res.json({ message: 'Divisão de times salva com sucesso.', total: rows.length });
  } catch (error) {
    console.error('teamsController.saveAllocation:', error);
    return res.status(500).json({ error: 'Erro ao salvar divisão de times' });
  }
}

/**
 * GET /:eventId/teams/allocation
 * Retorna a divisão de times salva com dados dos inscritos.
 */
async function getAllocation(req, res) {
  try {
    const { eventId } = req.params;

    const allocation = await db.EventTeamsAllocation.findAll({
      where: { eventId },
      include: [
        {
          model: db.RegistrationAttendee,
          as: 'attendee',
          attributes: ['id', 'attendeeData', 'attendeeNumber', 'registrationId'],
        },
      ],
      order: [['teamId', 'ASC']],
    });

    return res.json(allocation);
  } catch (error) {
    console.error('teamsController.getAllocation:', error);
    return res.status(500).json({ error: 'Erro ao buscar divisão de times' });
  }
}

module.exports = {
  getConfig,
  saveConfig,
  generate,
  saveAllocation,
  getAllocation,
};
