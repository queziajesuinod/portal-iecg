const uuid = require('uuid');
const { EventBatch, Event } = require('../models');
const { COUNTABLE_PAYMENT_STATUSES } = require('../constants/registrationStatuses');

async function listarLotesPorEvento(eventId) {
  const lotes = await EventBatch.findAll({
    where: { eventId },
    order: [['order', 'ASC']]
  });

  // Contar inscritos com status pending ou paid para cada lote
  const { RegistrationAttendee, Registration } = require('../models');

  const lotesComVagas = await Promise.all(lotes.map(async (lote) => {
    let vagasDisponiveis = null;

    if (lote.maxQuantity) {
      const inscritosOcupados = await RegistrationAttendee.count({
        where: { batchId: lote.id },
        include: [{
          model: Registration,
          as: 'registration',
          where: {
            paymentStatus: COUNTABLE_PAYMENT_STATUSES
          },
          attributes: []
        }]
      });

      vagasDisponiveis = lote.maxQuantity - inscritosOcupados;
    }

    return {
      ...lote.toJSON(),
      price: Number(lote.price),
      vagasDisponiveis,
      inscritosOcupados: vagasDisponiveis !== null ? lote.maxQuantity - vagasDisponiveis : 0
    };
  }));

  return lotesComVagas;
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

  // Verificar se há inscrições (attendees) neste lote
  const { Registration, RegistrationAttendee } = require('../models');
  const registrationCount = await Registration.count({ where: { batchId: id } });
  const attendeeCount = await RegistrationAttendee.count({ where: { batchId: id } });

  if (registrationCount > 0 || attendeeCount > 0) {
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
    // Contar inscritos com status pending ou paid neste lote
    const { RegistrationAttendee, Registration } = require('../models');
    const inscritosOcupados = await RegistrationAttendee.count({
      where: { batchId },
      include: [{
        model: Registration,
        as: 'registration',
        where: {
          paymentStatus: COUNTABLE_PAYMENT_STATUSES
        },
        attributes: []
      }]
    });

    const disponiveis = batch.maxQuantity - inscritosOcupados;
    if (disponiveis < quantidade) {
      throw new Error(`Apenas ${disponiveis} vagas disponíveis neste lote`);
    }

    return {
      disponivel: true,
      batch,
      vagasRestantes: disponiveis
    };
  }

  return {
    disponivel: true,
    batch,
    vagasRestantes: null
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
