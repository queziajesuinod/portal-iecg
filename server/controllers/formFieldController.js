const formFieldService = require('../services/formFieldService');

// Regex para validar UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(uuid) {
  return UUID_REGEX.test(uuid);
}

async function listarPorEvento(req, res) {
  try {
    const { eventId } = req.params;
    
    // Validar se eventId é um UUID válido
    if (!isValidUUID(eventId)) {
      return res.status(400).json({ 
        message: 'ID de evento inválido. Deve ser um UUID válido.',
        receivedId: eventId 
      });
    }
    
    const campos = await formFieldService.listarCamposPorEvento(eventId);
    res.status(200).json(campos);
  } catch (err) {
    console.error('Erro ao listar campos:', err);
    res.status(500).json({ message: 'Erro ao listar campos' });
  }
}

async function buscarPorId(req, res) {
  try {
    const campo = await formFieldService.buscarCampoPorId(req.params.id);
    res.status(200).json(campo);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

async function criar(req, res) {
  try {
    const campo = await formFieldService.criarCampo(req.body);
    res.status(201).json(campo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function criarEmLote(req, res) {
  try {
    const { eventId, campos } = req.body;
    const camposCriados = await formFieldService.criarCamposEmLote(eventId, campos);
    res.status(201).json(camposCriados);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const campo = await formFieldService.atualizarCampo(req.params.id, req.body);
    res.status(200).json(campo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remover(req, res) {
  try {
    await formFieldService.deletarCampo(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listarPorEvento,
  buscarPorId,
  criar,
  criarEmLote,
  atualizar,
  remover
};
