const batchService = require('../services/batchService');

async function listarPorEvento(req, res) {
  try {
    const lotes = await batchService.listarLotesPorEvento(req.params.eventId);
    res.status(200).json(lotes);
  } catch (err) {
    console.error('Erro ao listar lotes:', err);
    res.status(500).json({ message: 'Erro ao listar lotes' });
  }
}

async function buscarPorId(req, res) {
  try {
    const lote = await batchService.buscarLotePorId(req.params.id);
    res.status(200).json(lote);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

async function criar(req, res) {
  try {
    const lote = await batchService.criarLote(req.body);
    res.status(201).json(lote);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const lote = await batchService.atualizarLote(req.params.id, req.body);
    res.status(200).json(lote);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remover(req, res) {
  try {
    await batchService.deletarLote(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function verificarDisponibilidade(req, res) {
  try {
    const { batchId, quantidade } = req.query;
    const resultado = await batchService.verificarDisponibilidade(batchId, parseInt(quantidade, 10));
    res.status(200).json(resultado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listarPorEvento,
  buscarPorId,
  criar,
  atualizar,
  remover,
  verificarDisponibilidade
};
