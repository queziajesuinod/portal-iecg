const uuid = require('uuid');
const { EventBatch, Event } = require('../models');

async function listarLotesPorEvento(eventId) {
  const lotes = await EventBatch.findAll({
    where: { eventId },
    order: [['order', 'ASC']]
  });

  // Converter price de string para número (Sequelize DECIMAL retorna string)
  return lotes.map(lote => ({
    ...lote.toJSON(),
    price: Number(lote.price)
  }));
}

async function buscarLotePorId(id) {
  const batch = await EventBatch.findByPk(id, {
    include: [
      {
        model: Event,
        as: 'event',
        attributes: ['id', 'title']
      }
    ]
  });

  if (!batch) {
    throw new Error('Lote não encontrado');
  }

  return batch;
}

async function criarLote(body) {
  const {
    eventId, name, price, maxQuantity, startDate, endDate, order
  } = body;

  if (!eventId) {
    throw new Error('ID do evento é obrigatório');
  }

  if (!name) {
    throw new Error('Nome do lote é obrigatório');
  }

  if (!price || price <= 0) {
    throw new Error('Preço do lote deve ser maior que zero');
  }

  // Verificar se evento existe
  const event = await Event.findByPk(eventId);
  if (!event) {
    throw new Error('Evento não encontrado');
  }

  return EventBatch.create({
    id: uuid.v4(),
    eventId,
    name,
    price,
    maxQuantity,
    currentQuantity: 0,
    startDate,
    endDate,
    isActive: true,
    order: order ?? 0
  });
}

async function atualizarLote(id, body) {
  const batch = await EventBatch.findByPk(id);

  if (!batch) {
    throw new Error('Lote não encontrado');
  }

  batch.name = body.name ?? batch.name;
  batch.price = body.price ?? batch.price;
  batch.maxQuantity = body.maxQuantity ?? batch.maxQuantity;
  batch.startDate = body.startDate ?? batch.startDate;
  batch.endDate = body.endDate ?? batch.endDate;
  batch.isActive = body.isActive ?? batch.isActive;
  batch.order = body.order ?? batch.order;

  await batch.save();
  return batch;
}

async function deletarLote(id) {
  const batch = await EventBatch.findByPk(id);

  if (!batch) {
    throw new Error('Lote não encontrado');
  }

  // Verificar se há inscrições neste lote
  const { Registration } = require('../models');
  const registrationCount = await Registration.count({ where: { batchId: id } });

  if (registrationCount > 0) {
    throw new Error('Não é possível deletar lote com inscrições. Desative o lote ao invés de deletar.');
  }

  await batch.destroy();
}

// Verificar disponibilidade de lote
async function verificarDisponibilidade(batchId, quantidade) {
  const batch = await EventBatch.findByPk(batchId);

  if (!batch) {
    throw new Error('Lote não encontrado');
  }

  if (!batch.isActive) {
    throw new Error('Lote não está ativo');
  }

  // Verificar datas de validade
  const now = new Date();
  if (batch.startDate && new Date(batch.startDate) > now) {
    throw new Error('Lote ainda não está disponível');
  }

  if (batch.endDate && new Date(batch.endDate) < now) {
    throw new Error('Lote expirado');
  }

  // Verificar quantidade disponível
  if (batch.maxQuantity) {
    const disponiveis = batch.maxQuantity - batch.currentQuantity;
    if (disponiveis < quantidade) {
      throw new Error(`Apenas ${disponiveis} vagas disponíveis neste lote`);
    }
  }

  return {
    disponivel: true,
    batch,
    vagasRestantes: batch.maxQuantity ? batch.maxQuantity - batch.currentQuantity : null
  };
}

// Incrementar quantidade vendida
async function incrementarQuantidade(batchId, quantidade) {
  const batch = await EventBatch.findByPk(batchId);

  if (!batch) {
    throw new Error('Lote não encontrado');
  }

  batch.currentQuantity += quantidade;
  await batch.save();

  return batch;
}

module.exports = {
  listarLotesPorEvento,
  buscarLotePorId,
  criarLote,
  atualizarLote,
  deletarLote,
  verificarDisponibilidade,
  incrementarQuantidade
};
