const paymentOptionService = require('../services/paymentOptionService');

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
    
    const isPublic = req.baseUrl?.includes('/api/public');
    const paymentOptions = await paymentOptionService.listarPorEvento(eventId, {
      includeOffline: !isPublic
    });
    res.status(200).json(paymentOptions);
  } catch (err) {
    console.error('Erro ao listar formas de pagamento:', err);
    res.status(500).json({ message: 'Erro ao listar formas de pagamento' });
  }
}

async function criar(req, res) {
  try {
    const paymentOption = await paymentOptionService.criar(req.params.eventId, req.body);
    res.status(201).json(paymentOption);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const paymentOption = await paymentOptionService.atualizar(req.params.id, req.body);
    res.status(200).json(paymentOption);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function deletar(req, res) {
  try {
    await paymentOptionService.deletar(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listarPorEvento,
  criar,
  atualizar,
  deletar
};
