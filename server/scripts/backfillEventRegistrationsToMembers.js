/* eslint-disable no-console, no-await-in-loop, no-continue, no-restricted-syntax */
/**
 * Sincroniza inscrições confirmadas de eventos com membros.
 *
 * Para cada Registration confirmada:
 *   - Busca o membro pelo email ou whatsapp do comprador
 *   - Se não encontrar, cria o membro como VISITANTE
 *   - Cria MemberActivity EVENTO_INSCRICAO (idempotente por registrationId)
 *   - Se o evento for ENCONTRO, cria MemberMilestone ENCONTRO_COM_DEUS (idempotente)
 *
 * Uso:
 *   node server/scripts/backfillEventRegistrationsToMembers.js
 *   node server/scripts/backfillEventRegistrationsToMembers.js --dry-run
 *   node server/scripts/backfillEventRegistrationsToMembers.js --event-id <uuid>
 *   node server/scripts/backfillEventRegistrationsToMembers.js --limit 100
 */

const { Op } = require('sequelize');
const {
  sequelize,
  Registration,
  Event,
  Member,
  MemberJourney,
  MemberActivity,
  MemberActivityType,
  MemberMilestone
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');

const eventIdArg = (() => {
  const idx = process.argv.indexOf('--event-id');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const limitArg = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : null;
})();

const ACTIVITY_TYPE = 'EVENTO_INSCRICAO';
const MILESTONE_ENCONTRO = 'ENCONTRO_COM_DEUS';
const BATCH_SIZE = 100;

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

function extractBuyer(buyerData) {
  if (!buyerData) return {};
  const phoneRaw = buyerData.buyer_phone || buyerData.buyer_whatsapp || buyerData.phone || buyerData.telefone || buyerData.whatsapp || '';
  const whatsappRaw = buyerData.buyer_whatsapp || buyerData.whatsapp || buyerData.buyer_phone || buyerData.phone || '';
  return {
    name: String(buyerData.buyer_name || buyerData.nome || buyerData.name || '').trim() || null,
    email: normalizeEmail(buyerData.buyer_email || buyerData.email || buyerData.usuarioEmail || ''),
    phone: normalizePhone(phoneRaw),
    whatsapp: normalizePhone(whatsappRaw),
    cpf: formatCpf(buyerData.buyer_document || buyerData.cpf || buyerData.documento || buyerData.document || '')
  };
}

function buildPhoneConditions(number) {
  if (!number) return [];
  const alt = number.length === 11 ? number.slice(1) : `9${number}`;
  return [
    { whatsapp: number }, { phone: number },
    { whatsapp: alt },   { phone: alt }
  ];
}

function toDateOnly(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatDateBr(value) {
  if (!value) return null;
  const s = toDateOnly(value);
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// ── core logic ────────────────────────────────────────────────────────────────

async function findMember(buyer, t) {
  if (buyer.email) {
    const byEmail = await Member.findOne({ where: { email: buyer.email }, transaction: t });
    if (byEmail) return { member: byEmail, matchBy: 'email' };
  }

  if (buyer.cpf) {
    const cpfDigits = sanitizeDigits(buyer.cpf);
    const byCpf = await Member.findOne({
      where: { [Op.or]: [{ cpf: buyer.cpf }, { cpf: cpfDigits }] },
      transaction: t
    });
    if (byCpf) return { member: byCpf, matchBy: 'cpf' };
  }

  const phoneConds = [
    ...buildPhoneConditions(buyer.whatsapp),
    ...buildPhoneConditions(buyer.phone)
  ].filter(Boolean);

  if (phoneConds.length) {
    const byPhone = await Member.findOne({ where: { [Op.or]: phoneConds }, transaction: t });
    if (byPhone) return { member: byPhone, matchBy: 'phone' };
  }

  return { member: null, matchBy: null };
}

async function createMember(buyer, t) {
  const displayName =
    buyer.name ||
    (buyer.email ? buyer.email.split('@')[0] : null) ||
    (buyer.phone ? `Visitante ${buyer.phone}` : 'Visitante');

  const member = await Member.create({
    fullName: displayName,
    status: 'VISITANTE',
    email: buyer.email || null,
    phone: buyer.phone || null,
    whatsapp: buyer.whatsapp || null,
    cpf: buyer.cpf || null,
    country: 'Brasil',
    statusChangeDate: toDateOnly(new Date())
  }, { transaction: t });

  return member;
}

async function ensureJourney(memberId, t) {
  const existing = await MemberJourney.findOne({ where: { memberId }, transaction: t });
  if (existing) return false;
  await MemberJourney.create({
    memberId,
    currentStage: 'VISITANTE',
    stageChangedAt: new Date(),
    lastActivityDate: new Date(),
    healthStatus: 'SAUDAVEL'
  }, { transaction: t });
  return true;
}

let cachedActivityPoints = null;
async function getActivityPoints(t) {
  if (cachedActivityPoints !== null) return cachedActivityPoints;
  const ref = await MemberActivityType.findOne({
    where: { code: ACTIVITY_TYPE },
    attributes: ['defaultPoints'],
    transaction: t
  });
  cachedActivityPoints = Number(ref?.defaultPoints || 0);
  return cachedActivityPoints;
}

async function ensureActivity(memberId, registrationId, eventId, eventName, eventDate, t) {
  const where = { memberId, activityType: ACTIVITY_TYPE };

  // Uma atividade por evento — ignora compras duplicadas do mesmo evento
  if (eventId) {
    where.eventId = eventId;
  } else {
    where.metadata = { [Op.contains]: { registrationId } };
  }

  const existing = await MemberActivity.findOne({ where, transaction: t });
  if (existing) return false;

  const points = await getActivityPoints(t);
  await MemberActivity.create({
    memberId,
    activityType: ACTIVITY_TYPE,
    activityDate: new Date(),
    points,
    eventId: eventId || null,
    metadata: {
      source: 'backfill_event_registrations',
      registrationId,
      eventName: eventName || null,
      description: [eventName, eventDate].filter(Boolean).join(' - ') || null
    }
  }, { transaction: t });
  return true;
}

async function ensureMilestone(memberId, description, t) {
  const existing = await MemberMilestone.findOne({
    where: { memberId, milestoneType: MILESTONE_ENCONTRO },
    transaction: t
  });
  if (existing) return false;

  await MemberMilestone.create({
    memberId,
    milestoneType: MILESTONE_ENCONTRO,
    achievedDate: toDateOnly(new Date()),
    description
  }, { transaction: t });
  return true;
}

// ── process one registration ──────────────────────────────────────────────────

async function processRegistration(registration, event) {
  const buyer = extractBuyer(registration.buyerData);

  if (!buyer.email && !buyer.phone && !buyer.whatsapp) {
    return { skipped: true, reason: 'sem_identificacao' };
  }

  const eventDateFmt = formatDateBr(event?.startDate);
  const milestoneDesc = [event?.title, eventDateFmt].filter(Boolean).join(' - ');

  if (isDryRun) {
    return {
      skipped: false,
      dryRun: true,
      buyer: { name: buyer.name, email: buyer.email, phone: buyer.phone },
      event: event?.title,
      isEncontro: event?.eventType === 'ENCONTRO'
    };
  }

  const t = await sequelize.transaction();
  try {
    let { member, matchBy } = await findMember(buyer, t);
    let memberCreated = false;

    if (!member) {
      member = await createMember(buyer, t);
      matchBy = 'criado';
      memberCreated = true;
    }

    const journeyCreated = await ensureJourney(member.id, t);
    const activityCreated = await ensureActivity(
      member.id, registration.id, registration.eventId, event?.title, eventDateFmt, t
    );

    let milestoneCreated = false;
    if (event?.eventType === 'ENCONTRO') {
      milestoneCreated = await ensureMilestone(member.id, milestoneDesc, t);
    }

    await t.commit();

    return {
      skipped: false,
      memberId: member.id,
      memberCreated,
      journeyCreated,
      activityCreated,
      milestoneCreated,
      matchBy
    };
  } catch (err) {
    if (!t.finished) await t.rollback();
    throw err;
  }
}

// ── load registrations in batches ─────────────────────────────────────────────

async function loadRegistrations(offset, batchSize) {
  const where = { paymentStatus: 'confirmed' };
  if (eventIdArg) where.eventId = eventIdArg;

  return Registration.findAll({
    where,
    include: [{
      model: Event,
      as: 'event',
      attributes: ['id', 'title', 'eventType', 'startDate'],
      required: false
    }],
    order: [['createdAt', 'ASC']],
    limit: batchSize,
    offset
  });
}

async function countTotal() {
  const where = { paymentStatus: 'confirmed' };
  if (eventIdArg) where.eventId = eventIdArg;
  return Registration.count({ where });
}

// ── main ──────────────────────────────────────────────────────────────────────

async function run() {
  const total = await countTotal();
  const effective = limitArg !== null ? Math.min(total, limitArg) : total;

  console.log(`\n${'='.repeat(70)}`);
  console.log('Backfill: Inscrições de eventos → Membros');
  if (isDryRun) console.log('MODO DRY-RUN — nenhuma alteração será salva');
  if (eventIdArg) console.log(`Filtro por evento: ${eventIdArg}`);
  console.log(`Inscrições confirmadas encontradas: ${total}`);
  if (limitArg !== null) console.log(`Limite aplicado: ${limitArg}`);
  console.log(`${'='.repeat(70)}\n`);

  const summary = {
    total: 0,
    skippedSemId: 0,
    membersCreated: 0,
    membersFound: 0,
    journeysCreated: 0,
    activitiesCreated: 0,
    activitiesJaExistiam: 0,
    milestonesCreated: 0,
    failed: 0,
    matchByEmail: 0,
    matchByCpf: 0,
    matchByPhone: 0,
    matchByCriado: 0
  };

  let offset = 0;
  let processed = 0;

  while (processed < effective) {
    const batchLimit = Math.min(BATCH_SIZE, effective - processed);
    const registrations = await loadRegistrations(offset, batchLimit);

    if (!registrations.length) break;

    for (const reg of registrations) {
      try {
        const result = await processRegistration(reg, reg.event);

        if (result.skipped) {
          summary.skippedSemId += 1;
        } else if (!result.dryRun) {
          summary.total += 1;
          if (result.memberCreated) summary.membersCreated += 1;
          else summary.membersFound += 1;
          if (result.journeyCreated) summary.journeysCreated += 1;
          if (result.activityCreated) summary.activitiesCreated += 1;
          else summary.activitiesJaExistiam += 1;
          if (result.milestoneCreated) summary.milestonesCreated += 1;
          if (result.matchBy === 'email') summary.matchByEmail += 1;
          if (result.matchBy === 'cpf') summary.matchByCpf += 1;
          if (result.matchBy === 'phone') summary.matchByPhone += 1;
          if (result.matchBy === 'criado') summary.matchByCriado += 1;
        } else {
          summary.total += 1;
          console.log(`  [dry-run] ${result.buyer.name || result.buyer.email} → evento: ${result.event}${result.isEncontro ? ' [ENCONTRO]' : ''}`);
        }
      } catch (err) {
        summary.failed += 1;
        const detail = err.errors ? err.errors.map((e) => `${e.path}: ${e.message}`).join(', ') : '';
        console.error(`  ERRO reg ${reg.id}: ${err.message}${detail ? ` [${detail}]` : ''}`);
        console.error(`    buyerData: ${JSON.stringify(reg.buyerData)}`);
      }

      processed += 1;

      if (processed % 50 === 0 || processed === effective) {
        console.log(`Progresso: ${processed}/${effective} | criados=${summary.membersCreated} | atividades=${summary.activitiesCreated} | falhas=${summary.failed}`);
      }
    }

    offset += registrations.length;
    if (registrations.length < batchLimit) break;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('RESULTADO FINAL');
  console.log(`${'='.repeat(70)}`);
  console.log(`Inscrições processadas : ${summary.total}`);
  console.log(`Ignoradas sem identif. : ${summary.skippedSemId}`);
  console.log(`Falhas                 : ${summary.failed}`);
  console.log(`Membros criados        : ${summary.membersCreated}`);
  console.log(`Membros encontrados    : ${summary.membersFound}`);
  console.log(`  por email            : ${summary.matchByEmail}`);
  console.log(`  por CPF              : ${summary.matchByCpf}`);
  console.log(`  por telefone         : ${summary.matchByPhone}`);
  console.log(`Jornadas criadas       : ${summary.journeysCreated}`);
  console.log(`Atividades criadas     : ${summary.activitiesCreated}`);
  console.log(`Atividades já existiam : ${summary.activitiesJaExistiam}`);
  console.log(`Marcos Encontro cri.   : ${summary.milestonesCreated}`);
  if (isDryRun) console.log('\n⚠  Dry-run: nenhuma alteração foi persistida.');
  console.log('');
}

run()
  .catch((err) => {
    console.error('Erro fatal:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
