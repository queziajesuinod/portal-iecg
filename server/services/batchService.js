const uuid = require('uuid');
const { EventBatch, Event } = require('../models');
const { COUNTABLE_PAYMENT_STATUSES } = require('../constants/registrationStatuses');

async function listarLotesPorEvento(eventId) {
  const lotes = await EventBatch.findAll({
    where: { eventId },
    order: [['order', 'ASC']]
  });

  const { RegistrationAttendee, Registration } = require('../models');

  const lotesComVagas = await Promise.all(lotes.map(async (lote) => {
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

    const inscritosConfirmados = await RegistrationAttendee.count({
      where: { batchId: lote.id },
      include: [{
        model: Registration,
        as: 'registration',
        where: {
          paymentStatus: 'confirmed'
        },
        attributes: []
      }]
    });

    const vagasDisponiveis = lote.maxQuantity
      ? lote.maxQuantity - inscritosOcupados
      : null;

    return {
      ...lote.toJSON(),
      price: Number(lote.price),
      vagasDisponiveis,
      inscritosOcupados,
      inscritosConfirmados
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
    throw new Error('Lote nao encontrado');
  }

  return batch;
}

async function criarLote(body) {
  const {
    eventId, name, price, maxQuantity, startDate, endDate, order
  } = body;

  if (!eventId) {
    throw new Error('ID do evento e obrigatorio');
  }

  if (!name) {
    throw new Error('Nome do lote e obrigatorio');
  }

  const event = await Event.findByPk(eventId);
  if (!event) {
    throw new Error('Evento nao encontrado');
  }

  if (event.requiresPayment !== false && (!price || Number(price) <= 0)) {
    throw new Error('Preco do lote deve ser maior que zero');
  }

  return EventBatch.create({
    id: uuid.v4(),
    eventId,
    name,
    price: event.requiresPayment === false ? 0 : price,
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
    throw new Error('Lote nao encontrado');
  }

  const event = await Event.findByPk(batch.eventId);
  if (!event) {
    throw new Error('Evento nao encontrado');
  }

  if (event.requiresPayment !== false && body.price !== undefined && body.price !== null && Number(body.price) <= 0) {
    throw new Error('Preco do lote deve ser maior que zero');
  }

  batch.name = body.name ?? batch.name;
  batch.price = event.requiresPayment === false ? 0 : (body.price ?? batch.price);
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
    throw new Error('Lote nao encontrado');
  }

  const { Registration, RegistrationAttendee } = require('../models');
  const registrationCount = await Registration.count({ where: { batchId: id } });
  const attendeeCount = await RegistrationAttendee.count({ where: { batchId: id } });

  if (registrationCount > 0 || attendeeCount > 0) {
    throw new Error('Nao e possivel deletar lote com inscricoes. Desative o lote ao inves de deletar.');
  }

  await batch.destroy();
}

async function verificarDisponibilidade(batchId, quantidade) {
  const batch = await EventBatch.findByPk(batchId);

  if (!batch) {
    throw new Error('Lote nao encontrado');
  }

  if (!batch.isActive) {
    throw new Error('Lote nao esta ativo');
  }

  const now = new Date();
  if (batch.startDate && new Date(batch.startDate) > now) {
    throw new Error('Lote ainda nao esta disponivel');
  }

  if (batch.endDate && new Date(batch.endDate) < now) {
    throw new Error('Lote expirado');
  }

  if (batch.maxQuantity) {
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
      console.warn(
        `[batchService] lote ${batch.id} sem vagas: maxQuantity=${batch.maxQuantity} ocupados=${inscritosOcupados} solicitado=${quantidade}`
      );
      throw new Error(`Apenas ${disponiveis} vagas disponiveis neste lote`);
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

async function incrementarQuantidade(batchId, quantidade) {
  const batch = await EventBatch.findByPk(batchId);

  if (!batch) {
    throw new Error('Lote nao encontrado');
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
