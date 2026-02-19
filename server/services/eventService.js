const uuid = require("uuid");
const {
  Event,
  EventBatch,
  FormField,
  PaymentOption,
  Registration,
  RegistrationPayment,
  RegistrationAttendee,
  User,
  sequelize,
} = require("../models");
const { Op, QueryTypes } = require("sequelize");
const webhookEmitter = require("./webhookEmitter");
const cache = require("../utils/cache");

const camposPadraoComprador = [
  {
    fieldType: "text",
    fieldLabel: "Nome do Comprador",
    fieldName: "buyer_name",
    placeholder: "Nome completo",
    isRequired: true,
    order: 0,
    section: "buyer",
  },
  {
    fieldType: "cpf",
    fieldLabel: "CPF ou CNPJ",
    fieldName: "buyer_document",
    placeholder: "CPF ou CNPJ",
    isRequired: true,
    order: 1,
    section: "buyer",
  },
  {
    fieldType: "email",
    fieldLabel: "Email do Comprador",
    fieldName: "buyer_email",
    placeholder: "E-mail do comprador",
    isRequired: true,
    order: 2,
    section: "buyer",
  },
  {
    fieldType: "phone",
    fieldLabel: "WhatsApp do Comprador",
    fieldName: "buyer_whatsapp",
    placeholder: "WhatsApp com DDD",
    isRequired: true,
    order: 3,
    section: "buyer",
  },
];

const camposPadraoInscrito = [
  {
    fieldType: "text",
    fieldLabel: "Nome Completo",
    fieldName: "nome_completo",
    placeholder: "Nome completo do inscrito",
    isRequired: true,
    order: 0,
    section: "attendee",
  },
];

async function garantirCamposPadraoFormulario(eventId, options = {}) {
  if (!eventId) return;
  const todosCamposPadrao = [...camposPadraoComprador, ...camposPadraoInscrito];
  const fieldNames = todosCamposPadrao.map((campo) => campo.fieldName);
  const existentes = await FormField.findAll({
    where: {
      eventId,
      fieldName: fieldNames,
    },
    attributes: ["fieldName"],
    transaction: options.transaction,
  });
  const existentesSet = new Set(existentes.map((campo) => campo.fieldName));

  const criacoes = todosCamposPadrao
    .filter((campo) => !existentesSet.has(campo.fieldName))
    .map((campo) => ({
      id: uuid.v4(),
      eventId,
      fieldType: campo.fieldType,
      fieldLabel: campo.fieldLabel,
      fieldName: campo.fieldName,
      placeholder: campo.placeholder,
      isRequired: campo.isRequired,
      order: campo.order,
      section: campo.section,
    }));

  if (criacoes.length) {
    await FormField.bulkCreate(criacoes, { transaction: options.transaction });
  }
}

// ============= EVENT CRUD =============

async function listarEventos() {
  const [eventos, registrationsTotal] = await Promise.all([
    Event.findAll({
      attributes: [
        "id",
        "title",
        "startDate",
        "isActive",
        "maxRegistrations",
        "createdAt",
      ],
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "name", "email"],
        },
        {
          model: EventBatch,
          as: "batches",
          attributes: [
            "id",
            "name",
            "price",
            "maxQuantity",
            "startDate",
            "endDate",
            "isActive",
            "order",
          ],
          order: [["order", "ASC"]],
        },
      ],
      order: [["createdAt", "DESC"]],
    }),
    Registration.findAll({
      where: {
        paymentStatus: { [Op.in]: ["pending", "confirmed"] },
      },
      attributes: [
        "eventId",
        [sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantity"],
      ],
      group: ["eventId"],
      raw: true,
    }),
  ]);

  const totalsByEvent = registrationsTotal.reduce((acc, row) => {
    acc[row.eventId] = Number(row.totalQuantity || 0);
    return acc;
  }, {});

  eventos.forEach((event) => {
    const countableRegistrations = totalsByEvent[event.id] || 0;
    event.setDataValue("currentRegistrations", countableRegistrations);
  });

  return eventos;
}

async function obterResumoInscricoesPorEvento(eventId) {
  if (!eventId) {
    return {
      totalRegistrations: 0,
      confirmedCount: 0,
      confirmedTotalValue: 0,
      deniedCancelled: 0,
      expiredCount: 0,
      pendingCount: 0,
    };
  }

  const registrationTable = Registration.getTableName();
  const quotedTable = typeof registrationTable === 'object'
    ? `"${registrationTable.schema}"."${registrationTable.tableName}"`
    : `"${registrationTable}"`;

  const [summary] = await sequelize.query(
    `
    SELECT
      COALESCE(SUM("quantity"), 0) AS "totalRegistrations",
      COALESCE(SUM("finalPrice") FILTER (WHERE "paymentStatus" = 'confirmed'), 0) AS "confirmedTotalValue",
      COALESCE(SUM("quantity") FILTER (WHERE "paymentStatus" IN ('pending', 'authorized', 'partial')), 0) AS "pendingCount",
      COALESCE(SUM("quantity") FILTER (WHERE "paymentStatus" IN ('denied', 'cancelled')), 0) AS "deniedCancelled",
      COALESCE(SUM("quantity") FILTER (WHERE "paymentStatus" = 'confirmed'), 0) AS "confirmedCount",
      COALESCE(SUM("quantity") FILTER (WHERE "paymentStatus" = 'expired'), 0) AS "expiredCount"
    FROM ${quotedTable}
    WHERE "eventId" = :eventId
    `,
    {
      replacements: { eventId },
      type: QueryTypes.SELECT,
    }
  );

  return {
    totalRegistrations: Number(summary.totalRegistrations || 0),
    confirmedCount: Number(summary.confirmedCount || 0),
    confirmedTotalValue: Number(summary.confirmedTotalValue || 0),
    deniedCancelled: Number(summary.deniedCancelled || 0),
    expiredCount: Number(summary.expiredCount || 0),
    pendingCount: Number(summary.pendingCount || 0),
  };
}

async function buscarEventoPorId(id) {
  // ============================================
  // OTIMIZAÇÃO: Query com JOINs ao invés de queries separadas
  // ============================================
  // separate: false força o Sequelize a usar JOINs
  // order no nível superior para ordenar relacionamentos
  // Ganho estimado: 30-50% de redução no tempo de query
  // ============================================
  const event = await Event.findByPk(id, {
    include: [
      {
        model: User,
        as: "creator",
        attributes: ["id", "name", "email"],
      },
      {
        model: EventBatch,
        as: "batches",
        attributes: [
          "id",
          "name",
          "price",
          "maxQuantity",
          "startDate",
          "endDate",
          "isActive",
          "order",
        ],
        required: false,
        separate: false, // Força JOIN ao invés de query separada
      },
      {
        model: FormField,
        as: "formFields",
        attributes: [
          "id",
          "fieldType",
          "fieldLabel",
          "fieldName",
          "placeholder",
          "isRequired",
          "options",
          "order",
          "section",
        ],
        required: false,
        separate: false, // Força JOIN ao invés de query separada
      },
    ],
    // Ordenação correta no nível superior
    order: [
      [{ model: EventBatch, as: "batches" }, "order", "ASC"],
      [{ model: FormField, as: "formFields" }, "order", "ASC"],
    ],
  });

  if (!event) {
    throw new Error("Evento não encontrado");
  }

  const stats = await obterResumoInscricoesPorEvento(id);
  event.setDataValue("registrationStats", stats);

  return event;
}

async function listarEventosPublicos() {
  return Event.findAll({
    where: { isActive: true },
    include: [
      {
        model: EventBatch,
        as: "batches",
        where: { isActive: true },
        required: false,
        order: [["order", "ASC"]],
      },
    ],
    order: [["startDate", "DESC"]],
  });
}

async function buscarEventoPublicoPorId(id) {
  const startTime = Date.now();
  const cacheKey = cache.CACHE_KEYS.eventPublic(id);

  // ============================================
  // OTIMIZAÇÃO: Cache Redis
  // ============================================
  // Buscar do cache primeiro, se não existir, buscar do banco
  // Ganho estimado: 10-13 segundos para requisições em cache
  // ============================================
  const result = await cache.getOrSet(
    cacheKey,
    async () => {
      console.log(`[DB QUERY] Buscando evento ${id} do banco de dados...`);
      
      // ============================================
      // OTIMIZAÇÃO: Query com JOINs otimizados
      // ============================================
      const event = await Event.findOne({
        where: { id, isActive: true },
        include: [
          {
            model: EventBatch,
            as: "batches",
            where: { isActive: true },
            required: false,
            separate: false, // Força JOIN ao invés de query separada
          },
          {
            model: FormField,
            as: "formFields",
            required: false,
            separate: false, // Força JOIN ao invés de query separada
          },
        ],
        // Ordenação no nível superior
        order: [
          [{ model: EventBatch, as: "batches" }, "order", "ASC"],
          [{ model: FormField, as: "formFields" }, "order", "ASC"],
        ],
      });

      if (!event) {
        throw new Error("Evento não encontrado ou inativo");
      }

      return event;
    },
    cache.DEFAULT_TTL
  );

  const duration = Date.now() - startTime;
  console.log(`[PERFORMANCE] buscarEventoPublicoPorId: ${duration}ms`);

  return result;
}

async function obterEstatisticasGerais() {
  const [totalEventos, eventosAtivos, totalInscricoes, receitaTotalRaw] =
    await Promise.all([
      Event.count(),
      Event.count({ where: { isActive: true } }),
      Registration.sum("quantity", { where: { paymentStatus: "confirmed" } }),
      Registration.sum("finalPrice", { where: { paymentStatus: "confirmed" } }),
    ]);
  const receitaTotal = Number(parseFloat(receitaTotalRaw || 0).toFixed(2));

  return {
    totalEventos,
    eventosAtivos,
    totalInscricoes: Number(totalInscricoes || 0),
    receitaTotal,
  };
}

function categorizarMetodoPagamento(method) {
  if (method === 'credit_card') return 'credit';
  if (method === 'pix') return 'pix';
  return 'others';
}

function arredondarMoeda(valor) {
  return Number((Number(valor || 0)).toFixed(2));
}

async function obterResumoIngressosPorEvento(eventId) {
  if (!eventId) {
    return { batches: [], totals: {} };
  }

  const [batches, registrations, attendees, payments] = await Promise.all([
    EventBatch.findAll({
      where: { eventId },
      attributes: ['id', 'name', 'price', 'maxQuantity', 'currentQuantity', 'order'],
      order: [['order', 'ASC']]
    }),
    Registration.findAll({
      where: { eventId },
      attributes: ['id', 'batchId']
    }),
    RegistrationAttendee.findAll({
      include: [
        {
          model: Registration,
          as: 'registration',
          attributes: [],
          where: { eventId },
          required: true
        }
      ],
      attributes: ['registrationId', 'batchId'],
      raw: true
    }),
    RegistrationPayment.findAll({
      where: { status: 'confirmed' },
      include: [
        {
          model: Registration,
          as: 'registration',
          attributes: [],
          where: { eventId },
          required: true
        }
      ],
      attributes: ['registrationId', 'method', 'amount'],
      raw: true
    })
  ]);

  const batchesById = new Map();
  const summaryByBatchId = new Map();

  batches.forEach((batch) => {
    const batchId = batch.id;
    batchesById.set(batchId, batch);
    summaryByBatchId.set(batchId, {
      batchId,
      batchName: batch.name,
      price: Number(batch.price || 0),
      sold: Number(batch.currentQuantity || 0),
      total: batch.maxQuantity == null ? null : Number(batch.maxQuantity),
      credit: 0,
      pix: 0,
      others: 0,
      totalPaid: 0
    });
  });

  const attendeeCountsByRegistration = attendees.reduce((acc, attendee) => {
    const regId = attendee.registrationId;
    const batchId = attendee.batchId;
    if (!regId || !batchId || !summaryByBatchId.has(batchId)) return acc;
    if (!acc[regId]) acc[regId] = {};
    acc[regId][batchId] = (acc[regId][batchId] || 0) + 1;
    return acc;
  }, {});

  const sharesByRegistration = {};
  registrations.forEach((registration) => {
    const regId = registration.id;
    const counts = attendeeCountsByRegistration[regId];
    if (counts && Object.keys(counts).length) {
      const weightedTotal = Object.entries(counts).reduce((sum, [batchId, count]) => {
        const batch = batchesById.get(batchId);
        const batchPrice = Number(batch?.price || 0);
        return sum + (batchPrice * Number(count || 0));
      }, 0);

      if (weightedTotal > 0) {
        sharesByRegistration[regId] = Object.entries(counts).map(([batchId, count]) => {
          const batch = batchesById.get(batchId);
          const batchPrice = Number(batch?.price || 0);
          return {
            batchId,
            share: (batchPrice * Number(count || 0)) / weightedTotal
          };
        });
      } else {
        const countTotal = Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0);
        sharesByRegistration[regId] = Object.entries(counts).map(([batchId, count]) => ({
          batchId,
          share: countTotal > 0 ? Number(count || 0) / countTotal : 0
        }));
      }
      return;
    }

    if (registration.batchId && summaryByBatchId.has(registration.batchId)) {
      sharesByRegistration[regId] = [{ batchId: registration.batchId, share: 1 }];
    } else {
      sharesByRegistration[regId] = [];
    }
  });

  payments.forEach((payment) => {
    const regShares = sharesByRegistration[payment.registrationId] || [];
    if (!regShares.length) return;

    const amount = Number(payment.amount || 0);
    const category = categorizarMetodoPagamento(payment.method);

    regShares.forEach(({ batchId, share }) => {
      const row = summaryByBatchId.get(batchId);
      if (!row) return;
      const allocated = amount * Number(share || 0);
      row[category] += allocated;
      row.totalPaid += allocated;
    });
  });

  const rows = Array.from(summaryByBatchId.values()).map((row) => ({
    ...row,
    credit: arredondarMoeda(row.credit),
    pix: arredondarMoeda(row.pix),
    others: arredondarMoeda(row.others),
    totalPaid: arredondarMoeda(row.totalPaid)
  }));

  const totals = rows.reduce((acc, row) => {
    acc.sold += Number(row.sold || 0);
    acc.total += Number(row.total || 0);
    acc.credit += Number(row.credit || 0);
    acc.pix += Number(row.pix || 0);
    acc.others += Number(row.others || 0);
    acc.totalPaid += Number(row.totalPaid || 0);
    return acc;
  }, {
    sold: 0,
    total: 0,
    credit: 0,
    pix: 0,
    others: 0,
    totalPaid: 0
  });

  return {
    batches: rows,
    totals: {
      ...totals,
      credit: arredondarMoeda(totals.credit),
      pix: arredondarMoeda(totals.pix),
      others: arredondarMoeda(totals.others),
      totalPaid: arredondarMoeda(totals.totalPaid)
    }
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
    eventType,
    registrationPaymentMode,
    minDepositAmount,
    maxPaymentCount,
  } = body;

  if (!title) {
    throw new Error("Título do evento é obrigatório");
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
    eventType: eventType || "ACAMP",
    registrationPaymentMode: registrationPaymentMode || "SINGLE",
    minDepositAmount: minDepositAmount || null,
    maxPaymentCount: maxPaymentCount || null,
    currentRegistrations: 0,
    isActive: true,
    createdBy: userId,
  });

  await garantirCamposPadraoFormulario(event.id);
  webhookEmitter.emit("event.created", {
    id: event.id,
    data: body,
  });

  return event;
}

async function atualizarEvento(id, body) {
  const event = await Event.findByPk(id);

  if (!event) {
    throw new Error("Evento não encontrado");
  }

  event.title = body.title != null ? body.title : event.title;
  event.description =
    body.description != null ? body.description : event.description;
  event.startDate = body.startDate != null ? body.startDate : event.startDate;
  event.endDate = body.endDate != null ? body.endDate : event.endDate;
  event.location = body.location != null ? body.location : event.location;
  event.imageUrl = body.imageUrl != null ? body.imageUrl : event.imageUrl;
  event.maxRegistrations =
    body.maxRegistrations != null
      ? body.maxRegistrations
      : event.maxRegistrations;
  event.maxPerBuyer =
    body.maxPerBuyer != null ? body.maxPerBuyer : event.maxPerBuyer;
  event.addressNumber =
    body.addressNumber != null ? body.addressNumber : event.addressNumber;
  event.neighborhood =
    body.neighborhood != null ? body.neighborhood : event.neighborhood;
  event.city = body.city != null ? body.city : event.city;
  event.cep = body.cep != null ? body.cep : event.cep;
  event.latitude = body.latitude != null ? body.latitude : event.latitude;
  event.longitude = body.longitude != null ? body.longitude : event.longitude;
  event.eventType = body.eventType != null ? body.eventType : event.eventType;
  event.registrationPaymentMode =
    body.registrationPaymentMode != null
      ? body.registrationPaymentMode
      : event.registrationPaymentMode;
  event.minDepositAmount =
    body.minDepositAmount != null
      ? body.minDepositAmount
      : event.minDepositAmount;
  event.maxPaymentCount =
    body.maxPaymentCount != null ? body.maxPaymentCount : event.maxPaymentCount;
  event.isActive = body.isActive != null ? body.isActive : event.isActive;

  await event.save();
  const changes = {};
  Object.keys(body).forEach((key) => {
    if (["id", "createdAt", "updatedAt"].includes(key)) return;
    if (body[key] === undefined) return;
    changes[key] = event[key];
  });
  webhookEmitter.emit("event.updated", {
    id: event.id,
    data: body,
  });
  return event;
}

async function deletarEvento(id) {
  const event = await Event.findByPk(id);

  if (!event) {
    throw new Error("Evento não encontrado");
  }

  const registrationCount = await Registration.count({
    where: { eventId: id },
  });

  if (registrationCount > 0) {
    throw new Error(
      "Não é possível deletar evento com inscrições. Desative o evento ao invés de deletar."
    );
  }

  await event.destroy();
  webhookEmitter.emit("event.deleted", {
    id: event.id,
  });
}

async function duplicarEvento(eventId, userId) {
  const event = await Event.findByPk(eventId, {
    include: [
      {
        model: EventBatch,
        as: "batches",
      },
      {
        model: FormField,
        as: "formFields",
      },
      {
        model: PaymentOption,
        as: "paymentOptions",
      },
    ],
  });

  if (!event) {
    throw new Error("Evento não encontrado");
  }

  const copyTitle =
    event.title && event.title.includes("(Duplicado)")
      ? event.title
      : `${event.title} (Duplicado)`;

  return sequelize.transaction(async (transaction) => {
    const newEvent = await Event.create(
      {
        id: uuid.v4(),
        title: copyTitle,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        imageUrl: event.imageUrl,
        maxRegistrations: event.maxRegistrations,
        maxPerBuyer: event.maxPerBuyer,
        addressNumber: event.addressNumber,
        neighborhood: event.neighborhood,
        city: event.city,
        cep: event.cep,
        latitude: event.latitude,
        longitude: event.longitude,
        eventType: event.eventType,
        registrationPaymentMode: event.registrationPaymentMode,
        minDepositAmount: event.minDepositAmount,
        maxPaymentCount: event.maxPaymentCount,
        currentRegistrations: 0,
        isActive: false,
        createdBy: userId,
      },
      { transaction }
    );

    const batchPromises = (event.batches || []).map((batch) =>
      EventBatch.create(
        {
          id: uuid.v4(),
          eventId: newEvent.id,
          name: batch.name,
          price: batch.price,
          maxQuantity: batch.maxQuantity,
          startDate: batch.startDate,
          endDate: batch.endDate,
          isActive: batch.isActive,
          order: batch.order,
        },
        { transaction }
      )
    );

    const fieldPromises = (event.formFields || []).map((field) =>
      FormField.create(
        {
          id: uuid.v4(),
          eventId: newEvent.id,
          fieldType: field.fieldType,
          fieldLabel: field.fieldLabel,
          fieldName: field.fieldName,
          placeholder: field.placeholder,
          isRequired: field.isRequired,
          options: field.options,
          order: field.order,
          section: field.section,
          validationRules: field.validationRules,
        },
        { transaction }
      )
    );

    const paymentPromises = (event.paymentOptions || []).map((option) =>
      PaymentOption.create(
        {
          id: uuid.v4(),
          eventId: newEvent.id,
          paymentType: option.paymentType,
          maxInstallments: option.maxInstallments,
          interestRate: option.interestRate,
          interestType: option.interestType,
          isActive: option.isActive,
        },
        { transaction }
      )
    );

    await Promise.all([...batchPromises, ...fieldPromises, ...paymentPromises]);
    await garantirCamposPadraoFormulario(newEvent.id, { transaction });

    webhookEmitter.emit("event.duplicated", {
      originalEventId: eventId,
      newEventId: newEvent.id,
      createdBy: userId,
    });

    return newEvent;
  });
}

module.exports = {
  listarEventos,
  buscarEventoPorId,
  criarEvento,
  atualizarEvento,
  deletarEvento,
  listarEventosPublicos,
  buscarEventoPublicoPorId,
  obterEstatisticasGerais,
  obterResumoIngressosPorEvento,
  duplicarEvento,
};
