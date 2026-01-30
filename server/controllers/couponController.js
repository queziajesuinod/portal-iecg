const couponService = require('../services/couponService');

async function listar(req, res) {
  try {
    const cupons = await couponService.listarCupons();
    res.status(200).json(cupons);
  } catch (err) {
    console.error('Erro ao listar cupons:', err);
    res.status(500).json({ message: 'Erro ao listar cupons' });
  }
}

async function buscarPorId(req, res) {
  try {
    const cupom = await couponService.buscarCuponPorId(req.params.id);
    res.status(200).json(cupom);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

async function criar(req, res) {
  try {
    const cupom = await couponService.criarCupom(req.body);
    res.status(201).json(cupom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function atualizar(req, res) {
  try {
    const cupom = await couponService.atualizarCupom(req.params.id, req.body);
    res.status(200).json(cupom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remover(req, res) {
  try {
    await couponService.deletarCupom(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// Rota pública para validar cupom
async function validar(req, res) {
  try {
    const { code, eventId, preco } = req.body;
    const quantityRaw = Number(req.body.quantity ?? req.body.attendees?.length ?? req.body.attendeesData?.length ?? 0);
    const quantity = Number.isFinite(quantityRaw) ? quantityRaw : 0;
    const resultado = await couponService.validarCupom(code, eventId, parseFloat(preco), quantity);
    res.status(200).json(resultado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
  validar
};
