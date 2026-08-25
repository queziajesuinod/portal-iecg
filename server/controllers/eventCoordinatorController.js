const coordinatorService = require('../services/eventCoordinatorService');

function getUserId(req) {
  return req.user?.userId || req.user?.id || null;
}

async function listarPorEvento(req, res) {
  try {
    const coordenadores = await coordinatorService.listByEvent(req.params.eventId);
    res.status(200).json(coordenadores);
  } catch (err) {
    console.error('Erro ao listar coordenadores:', err);
    res.status(500).json({ message: 'Erro ao listar coordenadores do evento' });
  }
}

async function opcoesCampos(req, res) {
  try {
    const opcoes = await coordinatorService.getFieldOptions(req.params.eventId);
    res.status(200).json(opcoes);
  } catch (err) {
    console.error('Erro ao obter opcoes de campos:', err);
    res.status(500).json({ message: 'Erro ao obter opcoes de campos' });
  }
}

async function buscarPorId(req, res) {
  try {
    const coordenador = await coordinatorService.getById(req.params.id);
    res.status(200).json(coordenador);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

async function criar(req, res) {
  try {
    const coordenador = await coordinatorService.create(
      req.params.eventId,
      req.body,
      getUserId(req)
    );
    res.status(201).json(coordenador);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const coordenador = await coordinatorService.update(req.params.id, req.body);
    res.status(200).json(coordenador);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remover(req, res) {
  try {
    await coordinatorService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function validar(req, res) {
  try {
    const resultado = await coordinatorService.validate(req.params.id);
    res.status(200).json(resultado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function enviar(req, res) {
  try {
    const resultado = await coordinatorService.sendById(req.params.id, {
      trigger: 'manual',
      userId: getUserId(req)
    });
    res.status(200).json(resultado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function enviarTeste(req, res) {
  try {
    const resultado = await coordinatorService.sendById(req.params.id, {
      trigger: 'test',
      testMode: true,
      userId: getUserId(req)
    });
    res.status(200).json(resultado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function listarLogs(req, res) {
  try {
    const logs = await coordinatorService.listLogs(req.params.id);
    res.status(200).json(logs);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listarPorEvento,
  opcoesCampos,
  buscarPorId,
  criar,
  atualizar,
  remover,
  validar,
  enviar,
  enviarTeste,
  listarLogs
};
