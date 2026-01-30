const uuid = require('uuid');
const {
  Event, EventBatch, FormField, Registration, User
} = require('../models');

const camposPadraoComprador = [
  {
    fieldType: 'text',
    fieldLabel: 'Nome do Comprador',
    fieldName: 'buyer_name',
    placeholder: 'Nome completo',
    isRequired: true,
    order: 0,
    section: 'buyer'
  },
  {
    fieldType: 'cpf',
    fieldLabel: 'CPF ou CNPJ',
    fieldName: 'buyer_document',
    placeholder: 'CPF ou CNPJ',
    isRequired: true,
    order: 1,
    section: 'buyer'
  }
];

async function garantirCamposBasicosDoComprador(eventId) {
  if (!eventId) return;
  const fieldNames = camposPadraoComprador.map(campo => campo.fieldName);
  const existentes = await FormField.findAll({
    where: {
      eventId,
      fieldName: fieldNames
    },
    attributes: ['fieldName']
  });
  const existentesSet = new Set(existentes.map(campo => campo.fieldName));

  const criacoes = camposPadraoComprador
    .filter(campo => !existentesSet.has(campo.fieldName))
    .map((campo) => ({
      id: uuid.v4(),
      eventId,
      fieldType: campo.fieldType,
      fieldLabel: campo.fieldLabel,
      fieldName: campo.fieldName,
      placeholder: campo.placeholder,
      isRequired: campo.isRequired,
      order: campo.order,
      section: campo.section
    }));

  if (criacoes.length) {
    await FormField.bulkCreate(criacoes);
  }
}

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

async function obterEstatisticasGerais() {
  const totalEventos = await Event.count();
  const eventosAtivos = await Event.count({ where: { isActive: true } });
  const totalInscricoes = await Registration.sum('quantity', {
    where: { paymentStatus: 'confirmed' }
  }) || 0;
  const receitaTotalRaw = await Registration.sum('finalPrice', {
    where: { paymentStatus: 'confirmed' }
  }) || 0;
  const receitaTotal = Number(parseFloat(receitaTotalRaw || 0).toFixed(2));

  return {
    totalEventos,
    eventosAtivos,
    totalInscricoes: Number(totalInscricoes || 0),
    receitaTotal
  };
}

async function criarEvento(body, userId) {
  const {
    title,
    description,
    startDate,
    endDate,
    location,
    imageUrl,
    maxRegistrations,
    maxPerBuyer,
    addressNumber,
    neighborhood,
    city,
    cep,
    latitude,
    longitude,
    eventType
  } = body;

  if (!title) {
    throw new Error('Título do evento é obrigatório');
  }

  const event = await Event.create({
    id: uuid.v4(),
    title,
    description,
    startDate,
    endDate,
    location,
    imageUrl,
    maxRegistrations,
    maxPerBuyer,
    addressNumber,
    neighborhood,
    city,
    cep,
    latitude,
    longitude,
    eventType: eventType || 'ACAMP',
    currentRegistrations: 0,
    isActive: true,
    createdBy: userId
  });

  await garantirCamposBasicosDoComprador(event.id);

  return event;
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
  event.addressNumber = body.addressNumber ?? event.addressNumber;
  event.neighborhood = body.neighborhood ?? event.neighborhood;
  event.city = body.city ?? event.city;
  event.cep = body.cep ?? event.cep;
  event.latitude = body.latitude ?? event.latitude;
  event.longitude = body.longitude ?? event.longitude;
  event.eventType = body.eventType ?? event.eventType;
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
  buscarEventoPublicoPorId,
  obterEstatisticasGerais
};
