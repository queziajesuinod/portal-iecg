const couponService = require('../services/couponService');
const { EventBatch } = require('../models');

// Resolve preco total e itens (setor + preco por ingresso) a partir dos batchIds
// enviados pelo checkout. O preco NUNCA vem do front: buscamos o preco real do lote.
async function resolverItensDoPedido(req) {
  const lista = (Array.isArray(req.body.attendeesData) && req.body.attendeesData.length)
    ? req.body.attendeesData
    : (Array.isArray(req.body.attendees) ? req.body.attendees : []);
  const batchIds = [...new Set(lista.map((a) => a && a.batchId).filter(Boolean))];
  if (batchIds.length === 0) return null;

  const lotes = await EventBatch.findAll({
    where: { id: batchIds },
    attributes: ['id', 'sector', 'price'],
  });
  const porId = new Map(lotes.map((l) => [l.id, l]));

  const items = lista
    .filter((a) => a && a.batchId)
    .map((a) => {
      const lote = porId.get(a.batchId);
      return {
        sector: lote ? (lote.sector || null) : null,
        price: lote ? parseFloat(lote.price) : 0,
      };
    });
  const preco = items.reduce((sum, it) => sum + it.price, 0);
  return { items, preco };
}

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
    const { code, eventId, paymentType } = req.body;

    // Preferir resolucao server-side pelos batchIds (autoritativa e segura).
    const resolvido = await resolverItensDoPedido(req);

    // Fallback retrocompat: cliente que envia preco/items direto (ex: painel admin).
    const itensCliente = Array.isArray(req.body.items)
      ? req.body.items.map((it) => ({ sector: it.sector || null, price: parseFloat(it.price) || 0 }))
      : null;

    const itensCupom = resolvido ? resolvido.items : itensCliente;
    const preco = resolvido ? resolvido.preco : parseFloat(req.body.preco);

    const quantityRaw = Number(
      req.body.quantity
      ?? (itensCupom ? itensCupom.length : undefined)
      ?? req.body.attendees?.length
      ?? req.body.attendeesData?.length
      ?? 0
    );
    const quantity = Number.isFinite(quantityRaw) ? quantityRaw : 0;

    const resultado = await couponService.validarCupom(
      code, eventId, preco, quantity, paymentType || null, itensCupom
    );
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
