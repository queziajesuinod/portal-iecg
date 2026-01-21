const { Event, EventBatch, FormField, Registration, User } = require('../models');
const uuid = require('uuid');

// ============= EVENT CRUD =============

async function listarEventos() {
  return Event.findAll({
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      },
      {
        model: EventBatch,
        as: 'batches',
        order: [['order', 'ASC']]
      }
    ],
    order: [['createdAt', 'DESC']]
  });
}

async function buscarEventoPorId(id) {
  const event = await Event.findByPk(id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      },
      {
        model: EventBatch,
        as: 'batches',
        order: [['order', 'ASC']]
      },
      {
        model: FormField,
        as: 'formFields',
        order: [['order', 'ASC']]
      },
      {
        model: Registration,
        as: 'registrations'
      }
    ]
  });
  
  if (!event) {
    throw new Error('Evento não encontrado');
  }
  
  return event;
}

async function criarEvento(body, userId) {
  const { title, description, startDate, endDate, location, imageUrl, maxRegistrations, maxPerBuyer } = body;
  
  if (!title) {
    throw new Error('Título do evento é obrigatório');
  }
  
  return Event.create({
    id: uuid.v4(),
    title,
    description,
    startDate,
    endDate,
    location,
    imageUrl,
    maxRegistrations,
    maxPerBuyer,
    currentRegistrations: 0,
    isActive: true,
    createdBy: userId
  });
}

async function atualizarEvento(id, body) {
  const event = await Event.findByPk(id);
  
  if (!event) {
    throw new Error('Evento não encontrado');
  }
  
  event.title = body.title ?? event.title;
  event.description = body.description ?? event.description;
  event.startDate = body.startDate ?? event.startDate;
  event.endDate = body.endDate ?? event.endDate;
  event.location = body.location ?? event.location;
  event.imageUrl = body.imageUrl ?? event.imageUrl;
  event.maxRegistrations = body.maxRegistrations ?? event.maxRegistrations;
  event.maxPerBuyer = body.maxPerBuyer ?? event.maxPerBuyer;
  event.isActive = body.isActive ?? event.isActive;
  
  await event.save();
  return event;
}

async function deletarEvento(id) {
  const event = await Event.findByPk(id);
  
  if (!event) {
    throw new Error('Evento não encontrado');
  }
  
  // Verificar se há inscrições
  const registrationCount = await Registration.count({ where: { eventId: id } });
  
  if (registrationCount > 0) {
    throw new Error('Não é possível deletar evento com inscrições. Desative o evento ao invés de deletar.');
  }
  
  await event.destroy();
}

// ============= EVENTOS PÚBLICOS =============

async function listarEventosPublicos() {
  return Event.findAll({
    where: { isActive: true },
    include: [
      {
        model: EventBatch,
        as: 'batches',
        where: { isActive: true },
        required: false,
        order: [['order', 'ASC']]
      }
    ],
    order: [['startDate', 'ASC']]
  });
}

async function buscarEventoPublicoPorId(id) {
  const event = await Event.findOne({
    where: { id, isActive: true },
    include: [
      {
        model: EventBatch,
        as: 'batches',
        where: { isActive: true },
        required: false,
        order: [['order', 'ASC']]
      },
      {
        model: FormField,
        as: 'formFields',
        order: [['order', 'ASC']]
      }
    ]
  });
  
  if (!event) {
    throw new Error('Evento não encontrado ou inativo');
  }
  
  return event;
}

module.exports = {
  listarEventos,
  buscarEventoPorId,
  criarEvento,
  atualizarEvento,
  deletarEvento,
  listarEventosPublicos,
  buscarEventoPublicoPorId
};
