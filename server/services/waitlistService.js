/**
 * Lista de espera de eventos.
 *
 * Fluxo:
 *  1. Lote lotado/encerrado + waitlist habilitada -> pessoa entra na fila (entrarNaFila),
 *     guardando o payload COMPLETO da inscricao (sem pagamento).
 *  2. Vaga liberada (cancelamento/expiracao) dispara onSlotFreed(batchId) via gancho em
 *     registrationService.ajustarContadoresDeStatus.
 *  3. onSlotFreed pega o proximo da fila (FIFO por lote), materializa uma inscricao PENDING
 *     com PREÇO VIGENTE do lote (reserva a vaga) e notifica com o link de pagamento.
 *  4. Pagou -> inscricao confirmed -> marcarComoAtendida marca a entrada como fulfilled.
 *  5. Nao pagou no prazo -> expirarOfertasVencidas cancela a inscricao pendente (libera a
 *     vaga) -> onSlotFreed oferta ao proximo. Assim sucessivamente.
 */
const { Op } = require('sequelize');
const uuid = require('uuid');
const {
  WaitlistEntry, Event, EventBatch, Registration, RegistrationAttendee, PaymentOption, sequelize
} = require('../models');
const { COUNTABLE_PAYMENT_STATUSES } = require('../constants/registrationStatuses');
const registrationService = require('./registrationService');

const ACTIVE_ENTRY_STATUSES = ['waiting', 'offered'];

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function extractContact(buyerData = {}) {
  return {
    name: buyerData.buyer_name || buyerData.nome || buyerData.name || null,
    email: (buyerData.buyer_email || buyerData.email || '').trim().toLowerCase() || null,
    whatsapp: buyerData.buyer_whatsapp || buyerData.buyer_phone || buyerData.whatsapp || buyerData.telefone || null,
    cpf: onlyDigits(buyerData.buyer_document || buyerData.cpf || buyerData.documento || buyerData.document) || null,
  };
}

// Vagas realmente ocupadas: attendees em inscricoes com status contabilizavel.
async function contarOcupadosLote(batchId) {
  return RegistrationAttendee.count({
    where: { batchId },
    include: [{
      model: Registration,
      as: 'registration',
      where: { paymentStatus: COUNTABLE_PAYMENT_STATUSES },
      attributes: []
    }]
  });
}

// null = ilimitado (nunca precisa de fila).
async function vagasLivresLote(batch) {
  if (!batch.maxQuantity) return null;
  const ocupados = await contarOcupadosLote(batch.id);
  return batch.maxQuantity - ocupados;
}

function loteAbertoParaInscricao(batch) {
  if (!batch.isActive) return false;
  const now = new Date();
  if (batch.startDate && new Date(batch.startDate) > now) return false;
  if (batch.endDate && new Date(batch.endDate) < now) return false;
  return true;
}

// Serializa operacoes concorrentes sobre a fila de um mesmo lote (mesmo padrao do
// advisory lock por inscricao). Evita ofertar a mesma vaga duas vezes.
async function withBatchLock(batchId, fn) {
  const guardTx = await sequelize.transaction();
  try {
    await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:lockKey))', {
      replacements: { lockKey: `waitlist:batch:${batchId}` },
      transaction: guardTx,
    });
    const resultado = await fn();
    await guardTx.commit();
    return resultado;
  } catch (err) {
    await guardTx.rollback().catch(() => {});
    throw err;
  }
}

/**
 * Posicao (1-based) de uma entrada 'waiting' na fila do seu lote.
 * offered/fulfilled/etc retornam 0.
 */
async function posicaoNaFila(entry) {
  if (!entry || entry.status !== 'waiting') return 0;
  const anteriores = await WaitlistEntry.count({
    where: {
      batchId: entry.batchId,
      status: 'waiting',
      createdAt: { [Op.lt]: entry.createdAt }
    }
  });
  return anteriores + 1;
}

/**
 * Entrar na lista de espera de um lote.
 * @param {object} dados - { eventId, batchId?, quantity?, buyerData, attendeesData, couponCode?, termAcceptances? }
 */
async function entrarNaFila(dados = {}) {
  const {
    eventId, buyerData, attendeesData, couponCode, termAcceptances
  } = dados;

  if (!eventId) throw new Error('eventId e obrigatorio');
  if (!buyerData) throw new Error('Dados do comprador (buyerData) sao obrigatorios');
  if (!Array.isArray(attendeesData) || !attendeesData.length) {
    throw new Error('Informe ao menos um inscrito (attendeesData)');
  }

  const event = await Event.findByPk(eventId);
  if (!event) throw new Error('Evento nao encontrado');
  if (!event.waitlistEnabled) {
    throw new Error('Este evento nao possui lista de espera habilitada');
  }

  // A fila e por lote: todos os inscritos deste pedido devem ser do mesmo lote.
  const batchId = dados.batchId || attendeesData[0]?.batchId;
  if (!batchId) throw new Error('Cada inscrito deve ter um lote (batchId)');
  const lotesDistintos = new Set(attendeesData.map((a) => a.batchId).filter(Boolean));
  if (lotesDistintos.size > 1 || (lotesDistintos.size === 1 && !lotesDistintos.has(batchId))) {
    throw new Error('A lista de espera e por lote: envie um lote por vez');
  }

  const batch = await EventBatch.findByPk(batchId);
  if (!batch || batch.eventId !== eventId) {
    throw new Error('Lote invalido para este evento');
  }

  const quantity = attendeesData.length;

  // So faz sentido entrar na fila quando NAO da para se inscrever normalmente
  // (lote lotado ou encerrado). Se ainda ha vaga, redireciona para inscricao normal.
  const livres = await vagasLivresLote(batch);
  if (loteAbertoParaInscricao(batch) && (livres === null || livres >= quantity)) {
    throw new Error('Ainda ha vagas neste lote — faca a inscricao normalmente.');
  }

  const contact = extractContact(buyerData);
  if (!contact.email && !contact.whatsapp) {
    throw new Error('Informe e-mail ou WhatsApp para receber a oferta de vaga');
  }

  // Impede 2 entradas ativas da mesma pessoa no mesmo lote (por CPF ou e-mail).
  const orIdent = [];
  if (contact.cpf) orIdent.push({ contactCpf: contact.cpf });
  if (contact.email) orIdent.push({ contactEmail: contact.email });
  if (orIdent.length) {
    const jaExiste = await WaitlistEntry.findOne({
      where: {
        batchId,
        status: { [Op.in]: ACTIVE_ENTRY_STATUSES },
        [Op.or]: orIdent
      }
    });
    if (jaExiste) {
      throw new Error('Voce ja esta na lista de espera deste lote.');
    }
  }

  const entry = await WaitlistEntry.create({
    id: uuid.v4(),
    eventId,
    batchId,
    quantity,
    contactName: contact.name,
    contactEmail: contact.email,
    contactWhatsapp: contact.whatsapp,
    contactCpf: contact.cpf,
    payload: {
      eventId,
      couponCode: couponCode || null,
      quantity,
      buyerData,
      attendeesData,
      termAcceptances: termAcceptances || null,
    },
    status: 'waiting',
  });

  const position = await posicaoNaFila(entry);

  // Confirmacao de entrada na fila (best-effort).
  setImmediate(() => {
    require('./waitlistNotificationService').notifyJoined(entry, { position })
      .catch((err) => console.error('[waitlist] notifyJoined falhou:', err.message));
  });

  return { entry, position };
}

/**
 * Materializa a oferta para uma entrada: cria a inscricao (PENDING via PIX, ou CONFIRMED
 * se o evento for gratuito), reservando a vaga, e marca a entrada como 'offered'.
 * Retorna a Registration criada, ou null se nao foi possivel materializar.
 */
async function materializarOferta(entry, event) {
  const eventRequiresPayment = event.requiresPayment !== false;
  const isBalanceDue = event.registrationPaymentMode === 'BALANCE_DUE';

  const dados = {
    ...entry.payload,
    eventId: event.id,
    origemListaEspera: true,
  };

  if (eventRequiresPayment && isBalanceDue) {
    // Evento parcelado: cria inscricao PENDENTE sem cobranca. A pessoa escolhe
    // sinal/total na tela de pagamento pendente (RegistrationView).
    dados.criarPendenteSemPagamento = true;
  } else if (eventRequiresPayment) {
    // Pagamento unico: gera PIX do valor cheio ja na oferta.
    const pixOption = await PaymentOption.findOne({
      where: { eventId: event.id, paymentType: 'pix', isActive: true }
    });
    if (!pixOption) {
      await entry.update({
        lastError: 'Sem forma de pagamento PIX ativa para materializar a oferta'
      });
      console.error(`[waitlist] evento ${event.id} sem PaymentOption PIX ativa — oferta nao materializada`);
      return null;
    }
    dados.paymentOptionId = pixOption.id;
    dados.paymentData = { method: 'pix' };
  }
  // Evento gratuito: processarInscricao cria a inscricao ja confirmada.

  let resultado;
  try {
    resultado = await registrationService.processarInscricao(dados);
  } catch (err) {
    await entry.update({ lastError: `Falha ao materializar oferta: ${err.message}`.slice(0, 2000) });
    console.error(`[waitlist] materializarOferta(${entry.id}) falhou:`, err.message);
    return null;
  }

  const registration = resultado?.registration;
  if (!registration) {
    await entry.update({ lastError: 'Materializacao nao retornou inscricao' });
    return null;
  }

  const ttlHours = Number(event.waitlistOfferTtlHours) > 0 ? Number(event.waitlistOfferTtlHours) : 12;
  const jaConfirmada = registration.paymentStatus === 'confirmed';
  const offeredAt = new Date();
  const offerExpiresAt = jaConfirmada ? null : new Date(offeredAt.getTime() + ttlHours * 3600 * 1000);

  await entry.update({
    registrationId: registration.id,
    status: jaConfirmada ? 'fulfilled' : 'offered',
    offerToken: uuid.v4().replace(/-/g, ''),
    offeredAt,
    offerExpiresAt,
    notifiedCount: (entry.notifiedCount || 0) + 1,
    lastError: null,
  });

  // Notifica a oferta (link de pagamento) — best-effort.
  setImmediate(() => {
    require('./waitlistNotificationService').notifyOffer(entry, registration)
      .catch((err) => console.error('[waitlist] notifyOffer falhou:', err.message));
  });

  return registration;
}

/**
 * Vaga liberada em um lote: oferta aos proximos da fila enquanto houver vaga.
 */
async function onSlotFreed(batchId) {
  if (!batchId) return { offered: 0 };

  return withBatchLock(batchId, async () => {
    const batch = await EventBatch.findByPk(batchId);
    if (!batch || !batch.maxQuantity) return { offered: 0 }; // ilimitado: nunca precisa

    const event = await Event.findByPk(batch.eventId);
    if (!event || !event.waitlistEnabled) return { offered: 0 };

    let ofertados = 0;
    // Enquanto houver vaga e proximo na fila que caiba, oferta.
    // Cada materializacao reserva a vaga (inscricao pending) — recontamos a cada volta.
    // Guard de seguranca contra loop infinito.
    for (let i = 0; i < 100; i += 1) {
      const ocupados = await contarOcupadosLote(batch.id);
      const livres = batch.maxQuantity - ocupados;
      if (livres <= 0) break;

      const proximo = await WaitlistEntry.findOne({
        where: { batchId, status: 'waiting' },
        order: [['createdAt', 'ASC']]
      });
      if (!proximo) break;

      // Respeita FIFO: se o proximo pede mais vagas do que ha livres, espera abrir mais.
      if (proximo.quantity > livres) break;

      const registration = await materializarOferta(proximo, event);
      if (!registration) break; // falha (ex.: sem PIX) — para para nao travar em loop

      ofertados += 1;
    }

    return { offered: ofertados };
  });
}

/**
 * Marca a entrada da lista de espera como atendida quando sua inscricao e confirmada.
 */
async function marcarComoAtendida(registrationId) {
  if (!registrationId) return null;
  const entry = await WaitlistEntry.findOne({
    where: { registrationId, status: { [Op.in]: ['offered', 'waiting'] } }
  });
  if (!entry) return null;
  await entry.update({ status: 'fulfilled', offerExpiresAt: null, lastError: null });
  return entry;
}

/**
 * Varre ofertas vencidas: cancela a inscricao pendente (libera a vaga -> cascata para o
 * proximo via onSlotFreed) e marca a entrada como expirada.
 */
async function expirarOfertasVencidas({ limit = 50 } = {}) {
  const agora = new Date();
  const vencidas = await WaitlistEntry.findAll({
    where: {
      status: 'offered',
      offerExpiresAt: { [Op.lte]: agora }
    },
    order: [['offerExpiresAt', 'ASC']],
    limit
  });

  let expiradas = 0;
  let atendidas = 0;
  for (const entry of vencidas) {
    try {
      const registration = entry.registrationId
        ? await Registration.findByPk(entry.registrationId)
        : null;

      // Se ja pagou no ultimo instante, marca como atendida em vez de expirar.
      if (registration && ['confirmed', 'partial'].includes(registration.paymentStatus)) {
        await entry.update({ status: 'fulfilled', offerExpiresAt: null });
        atendidas += 1;
        continue;
      }

      // Cancela a inscricao pendente -> libera a vaga -> onSlotFreed (gancho) oferta ao proximo.
      if (registration && !['cancelled', 'refunded'].includes(registration.paymentStatus)) {
        await registrationService.cancelarInscricao(registration.id);
      }
      await entry.update({ status: 'expired' });
      expiradas += 1;

      setImmediate(() => {
        require('./waitlistNotificationService').notifyExpired(entry)
          .catch((err) => console.error('[waitlist] notifyExpired falhou:', err.message));
      });
    } catch (err) {
      console.error(`[waitlist] expirar oferta ${entry.id} falhou:`, err.message);
      await entry.update({ lastError: `Falha ao expirar: ${err.message}`.slice(0, 2000) }).catch(() => {});
    }
  }

  return { processed: vencidas.length, expired: expiradas, fulfilled: atendidas };
}

/**
 * Consulta publica da posicao/status de uma pessoa na fila (por e-mail ou CPF).
 */
async function consultarPosicaoPublica({
  eventId, batchId, email, cpf
}) {
  const ident = [];
  const emailNorm = (email || '').trim().toLowerCase();
  const cpfNorm = onlyDigits(cpf);
  if (emailNorm) ident.push({ contactEmail: emailNorm });
  if (cpfNorm) ident.push({ contactCpf: cpfNorm });
  if (!ident.length) throw new Error('Informe e-mail ou CPF');

  const where = {
    eventId,
    status: { [Op.in]: ACTIVE_ENTRY_STATUSES },
    [Op.or]: ident
  };
  if (batchId) where.batchId = batchId;

  const entry = await WaitlistEntry.findOne({
    where,
    include: [{ model: EventBatch, as: 'batch', attributes: ['id', 'name', 'sector'] }],
    order: [['createdAt', 'ASC']]
  });
  if (!entry) return { found: false };

  const position = await posicaoNaFila(entry);
  return {
    found: true,
    status: entry.status,
    position,
    batch: entry.batch ? { id: entry.batch.id, name: entry.batch.name, sector: entry.batch.sector } : null,
    offerExpiresAt: entry.offerExpiresAt,
    orderCode: entry.registrationId ? (await Registration.findByPk(entry.registrationId, { attributes: ['orderCode'] }))?.orderCode : null,
  };
}

// ===================== ADMIN =====================

async function listarPorEvento(eventId, { batchId } = {}) {
  const where = { eventId };
  if (batchId) where.batchId = batchId;
  const entries = await WaitlistEntry.findAll({
    where,
    include: [{ model: EventBatch, as: 'batch', attributes: ['id', 'name', 'sector'] }],
    order: [['batchId', 'ASC'], ['createdAt', 'ASC']]
  });

  // Numera a posicao dos 'waiting' por lote.
  const posPorLote = {};
  return entries.map((e) => {
    const plain = e.toJSON();
    if (e.status === 'waiting') {
      posPorLote[e.batchId] = (posPorLote[e.batchId] || 0) + 1;
      plain.position = posPorLote[e.batchId];
    } else {
      plain.position = null;
    }
    return plain;
  });
}

async function resumoPorEvento(eventId) {
  const rows = await WaitlistEntry.findAll({
    where: { eventId },
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    group: ['status'],
    raw: true
  });
  return rows.reduce((acc, r) => {
    acc[r.status] = Number(r.total);
    return acc;
  }, {});
}

async function removerEntrada(id) {
  const entry = await WaitlistEntry.findByPk(id);
  if (!entry) throw new Error('Entrada da lista de espera nao encontrada');
  if (['fulfilled', 'cancelled'].includes(entry.status)) {
    return entry;
  }
  // Se ha oferta ativa com inscricao pendente, cancela para liberar a vaga.
  if (entry.status === 'offered' && entry.registrationId) {
    const registration = await Registration.findByPk(entry.registrationId);
    if (registration && !['cancelled', 'refunded'].includes(registration.paymentStatus)
      && !['confirmed', 'partial'].includes(registration.paymentStatus)) {
      await registrationService.cancelarInscricao(registration.id).catch((err) => {
        console.error('[waitlist] cancelar inscricao ao remover entrada falhou:', err.message);
      });
    }
  }
  await entry.update({ status: 'cancelled' });
  return entry;
}

async function ofertarAgora(id) {
  const entry = await WaitlistEntry.findByPk(id);
  if (!entry) throw new Error('Entrada da lista de espera nao encontrada');
  if (entry.status !== 'waiting') {
    throw new Error(`So e possivel ofertar entradas na fila (status atual: ${entry.status})`);
  }
  const event = await Event.findByPk(entry.eventId);
  if (!event) throw new Error('Evento nao encontrado');

  return withBatchLock(entry.batchId, async () => {
    const registration = await materializarOferta(entry, event);
    if (!registration) {
      throw new Error(entry.lastError || 'Nao foi possivel materializar a oferta');
    }
    return { entry: await entry.reload(), registration };
  });
}

async function reenviarOferta(id) {
  const entry = await WaitlistEntry.findByPk(id);
  if (!entry) throw new Error('Entrada da lista de espera nao encontrada');
  if (entry.status !== 'offered' || !entry.registrationId) {
    throw new Error('So e possivel reenviar ofertas ativas');
  }
  const registration = await Registration.findByPk(entry.registrationId);
  if (!registration) throw new Error('Inscricao da oferta nao encontrada');
  await entry.update({ notifiedCount: (entry.notifiedCount || 0) + 1 });
  return require('./waitlistNotificationService').notifyOffer(entry, registration);
}

module.exports = {
  entrarNaFila,
  onSlotFreed,
  marcarComoAtendida,
  expirarOfertasVencidas,
  posicaoNaFila,
  consultarPosicaoPublica,
  listarPorEvento,
  resumoPorEvento,
  removerEntrada,
  ofertarAgora,
  reenviarOferta,
  // helpers expostos para reuso/testes
  vagasLivresLote,
  loteAbertoParaInscricao,
};
