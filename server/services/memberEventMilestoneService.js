'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  Member,
  MemberJourney,
  MemberActivity,
  MemberActivityType,
  MemberMilestone,
  Event
} = require('../models');

const ACTIVITY_TYPE = 'EVENTO_INSCRICAO';
const MILESTONE_ENCONTRO = 'ENCONTRO_COM_DEUS';

// ── helpers ──────────────────────────────────────────────────────────────────

function sanitizeDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeEmail(v) {
  const s = String(v || '').trim().toLowerCase();
  return s && s !== 'sem-email@exemplo.com' ? s : null;
}

function normalizePhone(v) {
  const d = sanitizeDigits(v);
  if (!d) return null;
  return d.length > 11 ? d.slice(-11) : d;
}

function formatCpf(v) {
  const d = sanitizeDigits(v);
  if (d.length !== 11) return null;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function extractBuyerInfo(buyerData) {
  if (!buyerData) return {};
  const phone = normalizePhone(
    buyerData.buyer_phone || buyerData.phone || buyerData.telefone || buyerData.whatsapp || ''
  );
  const whatsapp = normalizePhone(
    buyerData.whatsapp || buyerData.buyer_phone || buyerData.phone || ''
  );
  return {
    name: String(buyerData.buyer_name || buyerData.nome || buyerData.name || '').trim() || null,
    email: normalizeEmail(buyerData.buyer_email || buyerData.email || buyerData.usuarioEmail || ''),
    phone,
    whatsapp,
    cpf: formatCpf(buyerData.buyer_document || buyerData.cpf || buyerData.documento || buyerData.document || '')
  };
}

// Monta array de condições OR para busca por telefone (aceita variações de 10/11 dígitos)
function buildPhoneConditions(number) {
  if (!number) return [];
  const conditions = [{ whatsapp: number }, { phone: number }];
  const alt = number.length === 11 ? number.slice(1) : `9${number}`;
  conditions.push({ whatsapp: alt }, { phone: alt });
  return conditions;
}

// ── lógica de negócio ─────────────────────────────────────────────────────────

async function findMember(buyer, transaction) {
  if (buyer.email) {
    const byEmail = await Member.findOne({ where: { email: buyer.email }, transaction });
    if (byEmail) return byEmail;
  }

  const phoneConditions = [
    ...buildPhoneConditions(buyer.whatsapp),
    ...buildPhoneConditions(buyer.phone)
  ].filter(Boolean);

  if (phoneConditions.length) {
    const byPhone = await Member.findOne({
      where: { [Op.or]: phoneConditions },
      transaction
    });
    if (byPhone) return byPhone;
  }

  return null;
}

async function createMember(buyer, transaction) {
  const displayName =
    buyer.name ||
    (buyer.email ? buyer.email.split('@')[0] : null) ||
    (buyer.phone ? `Visitante ${buyer.phone}` : 'Visitante');

  return Member.create({
    fullName: displayName,
    status: 'VISITANTE',
    email: buyer.email || null,
    phone: buyer.phone || null,
    whatsapp: buyer.whatsapp || null,
    cpf: buyer.cpf || null,
    country: 'Brasil',
    statusChangeDate: new Date().toISOString().slice(0, 10)
  }, { transaction });
}

async function ensureJourney(memberId, transaction) {
  const existing = await MemberJourney.findOne({ where: { memberId }, transaction });
  if (existing) return;
  await MemberJourney.create({
    memberId,
    currentStage: 'VISITANTE',
    stageChangedAt: new Date(),
    lastActivityDate: new Date(),
    healthStatus: 'SAUDAVEL'
  }, { transaction });
}

async function ensureActivity(memberId, registrationId, eventId, eventName, transaction) {
  // Idempotência por registrationId no metadata
  const existing = await MemberActivity.findOne({
    where: {
      memberId,
      activityType: ACTIVITY_TYPE,
      metadata: { [Op.contains]: { registrationId } }
    },
    transaction
  });
  if (existing) return false;

  const typeRef = await MemberActivityType.findOne({
    where: { code: ACTIVITY_TYPE },
    attributes: ['defaultPoints'],
    transaction
  });

  await MemberActivity.create({
    memberId,
    activityType: ACTIVITY_TYPE,
    activityDate: new Date(),
    points: Number(typeRef?.defaultPoints || 0),
    eventId: eventId || null,
    metadata: {
      source: 'event_registration',
      registrationId,
      eventName: eventName || null
    }
  }, { transaction });

  return true;
}

async function ensureMilestoneEncontro(memberId, description, transaction) {
  const existing = await MemberMilestone.findOne({
    where: { memberId, milestoneType: MILESTONE_ENCONTRO },
    transaction
  });
  if (existing) return false;

  await MemberMilestone.create({
    memberId,
    milestoneType: MILESTONE_ENCONTRO,
    achievedDate: new Date().toISOString().slice(0, 10),
    description
  }, { transaction });

  return true;
}

// ── ponto de entrada ──────────────────────────────────────────────────────────

async function processarInscricaoConfirmada(registration) {
  const buyer = extractBuyerInfo(registration.buyerData);

  if (!buyer.email && !buyer.phone && !buyer.whatsapp) {
    return; // sem identificador para vincular ao membro
  }

  const t = await sequelize.transaction();
  try {
    const event = await Event.findByPk(registration.eventId, {
      attributes: ['id', 'title', 'eventType', 'startDate'],
      transaction: t
    });

    const eventDateFormatted = event?.startDate
      ? new Date(event.startDate).toLocaleDateString('pt-BR')
      : null;
    const milestoneDescription = [event?.title, eventDateFormatted].filter(Boolean).join(' - ');

    let member = await findMember(buyer, t);
    let memberCreated = false;

    if (!member) {
      member = await createMember(buyer, t);
      memberCreated = true;
    }

    await ensureJourney(member.id, t);
    const activityCreated = await ensureActivity(
      member.id,
      registration.id,
      registration.eventId,
      event?.title,
      t
    );

    let milestoneCreated = false;
    if (event?.eventType === 'ENCONTRO') {
      milestoneCreated = await ensureMilestoneEncontro(member.id, milestoneDescription, t);
    }

    await t.commit();

    console.log(
      `[MemberEventMilestone] membro=${memberCreated ? 'criado' : 'vinculado'} id=${member.id}` +
      ` | atividade=${activityCreated ? 'criada' : 'ja_existe'}` +
      ` | marco_encontro=${milestoneCreated ? 'criado' : 'n/a'}` +
      ` | evento=${event?.title || registration.eventId}`
    );
  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error('[MemberEventMilestone] Erro ao processar inscricao confirmada:', err.message);
  }
}

module.exports = { processarInscricaoConfirmada };
