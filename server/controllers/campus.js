const service = require('../services/campus');

async function listar(req, res) {
  try {
    const campi = await service.listar();
    res.status(200).json(campi);
  } catch (err) {
    console.error('Erro ao listar campus:', err);
    res.status(500).json({ message: 'Erro ao listar campus' });
  }
}

async function criar(req, res) {
  try {
    const campus = await service.criar(req.body);
    res.status(201).json(campus);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const campus = await service.atualizar(req.params.id, req.body);
    res.status(200).json(campus);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remover(req, res) {
  try {
    await service.deletar(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listar,
  criar,
  atualizar,
  remover,
};
