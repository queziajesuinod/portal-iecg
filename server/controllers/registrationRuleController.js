const registrationRuleService = require('../services/registrationRuleService');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  return UUID_REGEX.test(id);
}

async function listarPorEvento(req, res) {
  try {
    const { eventId } = req.params;
    if (!isValidUUID(eventId)) {
      return res.status(400).json({ message: 'ID de evento inválido' });
    }
    const regras = await registrationRuleService.listarRegrasPorEvento(eventId);
    return res.status(200).json(regras);
  } catch (err) {
    console.error('Erro ao listar regras:', err);
    return res.status(500).json({ message: 'Erro ao listar regras de bloqueio' });
  }
}

// Pré-validação pública das regras de bloqueio (não cria inscrição).
// Body: { buyerData?, attendeesData?, scope? }
async function validarPublico(req, res) {
  try {
    const { eventId } = req.params;
    if (!isValidUUID(eventId)) {
      return res.status(400).json({ message: 'ID de evento inválido' });
    }
    const { buyerData, attendeesData, scope } = req.body || {};
    const resultado = await registrationRuleService.validarRegras(eventId, {
      buyerData,
      attendeesData,
      scope,
    });
    return res.status(200).json(resultado);
  } catch (err) {
    console.error('Erro ao validar regras de bloqueio:', err);
    return res.status(500).json({ message: 'Erro ao validar regras de bloqueio' });
  }
}

async function criar(req, res) {
  try {
    const regra = await registrationRuleService.criarRegra(req.body);
    return res.status(201).json(regra);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const regra = await registrationRuleService.atualizarRegra(req.params.id, req.body);
    return res.status(200).json(regra);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

async function remover(req, res) {
  try {
    await registrationRuleService.removerRegra(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listarPorEvento, validarPublico, criar, atualizar, remover
};
