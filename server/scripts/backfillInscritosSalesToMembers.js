/* eslint-disable no-console, no-await-in-loop, no-continue, no-restricted-syntax */
const { QueryTypes } = require('sequelize');
const {
  sequelize,
  Member,
  MemberJourney,
  MemberActivity,
  MemberActivityType
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');
const schema = process.env.DB_SCHEMA || 'dev_iecg';
const ACTIVITY_TYPE = 'EVENTO_INSCRICAO';
const ACTIVITY_SOURCE = 'inscritos_sales_backfill';
const activityPointsCache = new Map();

function sanitizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeDocument(value) {
  return sanitizeDigits(value);
}

function formatCpf(value) {
  const digits = normalizeDocument(value);
  if (digits.length !== 11) return null;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhoneForCompare(value) {
  const digits = sanitizeDigits(value);
  if (!digits) return '';
  if (digits.length > 11) return digits.slice(-11);
  return digits;
}

function normalizePhoneForStore(value) {
  const digits = normalizePhoneForCompare(value);
  return digits || null;
}

function phonesMatch(valueA, valueB) {
  const a = normalizePhoneForCompare(valueA);
  const b = normalizePhoneForCompare(valueB);

  if (!a || !b) return false;
  if (a === b) return true;

  const a10 = a.length === 11 ? a.slice(1) : a;
  const b10 = b.length === 11 ? b.slice(1) : b;
  return a10 === b10;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesLookSimilar(nameA, nameB) {
  const a = normalizeText(nameA);
  const b = normalizeText(nameB);

  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const tokensA = a.split(' ').filter((token) => token.length >= 2);
  const tokensB = b.split(' ').filter((token) => token.length >= 2);
  if (!tokensA.length || !tokensB.length) return false;

  const tokensBSet = new Set(tokensB);
  const intersection = tokensA.filter((token) => tokensBSet.has(token));
  const ratioA = intersection.length / tokensA.length;
  const ratioB = intersection.length / tokensB.length;

  if (ratioA >= 0.6 && ratioB >= 0.6) return true;
  if (intersection.length >= 2 && (ratioA >= 0.45 || ratioB >= 0.45)) return true;

  return tokensA[0] && tokensA[0] === tokensB[0] && (ratioA >= 0.35 || ratioB >= 0.35);
}

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const normalized = String(value).trim();
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return normalized.slice(0, 10);
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function resolveSaleDate(sale) {
  return sale.created_at_src || sale.created_at || new Date();
}

function resolveMemberName(sale) {
  const name = String(sale.payment_user_name || '').trim();
  if (name) return name;

  const email = normalizeEmail(sale.payment_user_email);
  if (email) return email.split('@')[0];

  const phone = normalizePhoneForStore(sale.payment_user_phone);
  if (phone) return `Visitante ${phone}`;

  return `Visitante ${String(sale.sale_uuid || '').slice(0, 8) || sale.id}`;
}

function buildObservation(sale) {
  return `INSCRITO NO ${sale.event_name || 'EVENTO'}`;
}

async function loadSales(transaction) {
  return sequelize.query(
    `
      SELECT
        id,
        sale_uuid,
        event_name,
        payment_status_id,
        payment_status_name,
        payment_user_uuid,
        payment_user_name,
        payment_user_email,
        payment_user_phone,
        payment_user_document,
        sales_amount_total,
        payment_provider,
        payment_installments,
        payment_method_name,
        processed_at,
        payment_at,
        canceled_at,
        created_at_src,
        updated_at_src,
        created_at,
        updated_at
      FROM "${schema}"."inscritos_sales"
      WHERE NULLIF(BTRIM(COALESCE(payment_user_name, '')), '') IS NOT NULL
      ORDER BY COALESCE(created_at_src, created_at) ASC, id ASC
    `,
    {
      type: QueryTypes.SELECT,
      transaction
    }
  );
}

async function loadMembers(transaction) {
  return Member.findAll({
    order: [['updatedAt', 'DESC']],
    transaction
  });
}

async function loadExistingActivities(transaction) {
  const activities = await MemberActivity.findAll({
    where: {
      activityType: ACTIVITY_TYPE
    },
    attributes: ['id', 'memberId', 'metadata'],
    transaction
  });

  return activities.reduce((acc, activity) => {
    const saleUuid = String(activity.metadata?.saleUuid || '').trim();
    if (saleUuid) {
      acc.set(saleUuid, activity);
    }
    return acc;
  }, new Map());
}

async function resolveActivityPoints(transaction) {
  if (activityPointsCache.has(ACTIVITY_TYPE)) {
    return activityPointsCache.get(ACTIVITY_TYPE);
  }

  const activityTypeRef = await MemberActivityType.findOne({
    where: { code: ACTIVITY_TYPE },
    attributes: ['defaultPoints'],
    transaction
  });

  const points = Number(activityTypeRef ? activityTypeRef.defaultPoints : 0);
  activityPointsCache.set(ACTIVITY_TYPE, points);
  return points;
}

function findMemberByDocument(document, members) {
  const normalizedDocument = normalizeDocument(document);
  if (!normalizedDocument) return null;

  return members.find((member) => normalizeDocument(member.cpf) === normalizedDocument) || null;
}

function findMemberByPhone(phone, name, members) {
  const normalizedPhone = normalizePhoneForCompare(phone);
  if (!normalizedPhone) return null;

  const candidates = members.filter((member) => (
    phonesMatch(normalizedPhone, member.phone) || phonesMatch(normalizedPhone, member.whatsapp)
  ));

  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];

  return candidates.find((member) => namesLookSimilar(name, member.fullName)) || candidates[0];
}

function findMemberByEmail(email, members) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return members.find((member) => normalizeEmail(member.email) === normalizedEmail) || null;
}

function findMemberBySimilarName(name, members) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return null;

  const tokens = normalizedName.split(' ').filter((token) => token.length >= 2);
  if (tokens.length < 2) {
    return null;
  }

  const candidates = members.filter((member) => namesLookSimilar(name, member.fullName));
  if (candidates.length === 1) {
    return candidates[0];
  }

  return null;
}

function findMemberForSale(sale, members) {
  const byDocument = findMemberByDocument(sale.payment_user_document, members);
  if (byDocument) {
    return { member: byDocument, matchBy: 'documento' };
  }

  const byPhone = findMemberByPhone(sale.payment_user_phone, sale.payment_user_name, members);
  if (byPhone) {
    return { member: byPhone, matchBy: 'telefone' };
  }

  const byEmail = findMemberByEmail(sale.payment_user_email, members);
  if (byEmail) {
    return { member: byEmail, matchBy: 'email' };
  }

  const byName = findMemberBySimilarName(sale.payment_user_name, members);
  if (byName) {
    return { member: byName, matchBy: 'nome' };
  }

  return { member: null, matchBy: null };
}

function buildMemberUpdatePayload(member, sale) {
  const payload = {};
  const normalizedPhone = normalizePhoneForStore(sale.payment_user_phone);
  const normalizedEmail = normalizeEmail(sale.payment_user_email);
  const formattedCpf = formatCpf(sale.payment_user_document);
  const name = String(sale.payment_user_name || '').trim();

  if (!member.fullName && name) payload.fullName = name;
  if (!member.email && normalizedEmail) payload.email = normalizedEmail;
  if (!member.phone && normalizedPhone) payload.phone = normalizedPhone;
  if (!member.whatsapp && normalizedPhone) payload.whatsapp = normalizedPhone;
  if (!member.cpf && formattedCpf) payload.cpf = formattedCpf;

  return payload;
}

function buildMemberCreatePayload(sale) {
  const activityDate = resolveSaleDate(sale);
  const normalizedPhone = normalizePhoneForStore(sale.payment_user_phone);
  const normalizedEmail = normalizeEmail(sale.payment_user_email) || null;

  return {
    fullName: resolveMemberName(sale),
    status: 'VISITANTE',
    email: normalizedEmail,
    phone: normalizedPhone,
    whatsapp: normalizedPhone,
    cpf: formatCpf(sale.payment_user_document),
    country: 'Brasil',
    statusChangeDate: toDateOnly(activityDate) || toDateOnly(new Date()),
    createdAt: activityDate,
    updatedAt: sale.updated_at_src || activityDate
  };
}

async function ensureMemberJourney(memberId, lastActivityDate, transaction) {
  const existing = await MemberJourney.findOne({
    where: { memberId },
    transaction
  });

  if (!existing) {
    return {
      created: true,
      journey: await MemberJourney.create({
        memberId,
        currentStage: 'VISITANTE',
        stageChangedAt: lastActivityDate || new Date(),
        lastActivityDate: lastActivityDate || new Date(),
        healthStatus: 'SAUDAVEL'
      }, { transaction })
    };
  }

  const nextValues = {};
  if (!existing.lastActivityDate || (lastActivityDate && new Date(lastActivityDate) > new Date(existing.lastActivityDate))) {
    nextValues.lastActivityDate = lastActivityDate;
  }

  if (Object.keys(nextValues).length) {
    await existing.update(nextValues, { transaction });
  }

  return { created: false, journey: existing };
}

async function ensureActivity(memberId, sale, activityDate, existingActivitiesBySaleUuid, transaction) {
  const saleUuid = String(sale.sale_uuid || '').trim();
  if (!memberId || !saleUuid) {
    return { created: false, alreadyExists: false, conflictingMemberId: null };
  }

  const existing = existingActivitiesBySaleUuid.get(saleUuid);
  if (existing) {
    return {
      created: false,
      alreadyExists: true,
      conflictingMemberId: existing.memberId && existing.memberId !== memberId ? existing.memberId : null
    };
  }

  const points = await resolveActivityPoints(transaction);
  const activity = await MemberActivity.create({
    memberId,
    activityType: ACTIVITY_TYPE,
    activityDate,
    points,
    metadata: {
      source: ACTIVITY_SOURCE,
      saleId: sale.id,
      saleUuid,
      eventName: sale.event_name || null,
      observation: buildObservation(sale),
      paymentStatusId: sale.payment_status_id || null,
      paymentStatusName: sale.payment_status_name || null,
      paymentMethodName: sale.payment_method_name || null,
      paymentProvider: sale.payment_provider || null
    }
  }, { transaction });

  existingActivitiesBySaleUuid.set(saleUuid, activity);
  return { created: true, alreadyExists: false, conflictingMemberId: null };
}

function hasAnyIdentifier(sale) {
  return Boolean(
    String(sale.payment_user_name || '').trim()
    || normalizeEmail(sale.payment_user_email)
    || normalizePhoneForStore(sale.payment_user_phone)
    || normalizeDocument(sale.payment_user_document)
  );
}

async function processSale(sale, members, existingActivitiesBySaleUuid, transaction) {
  if (!hasAnyIdentifier(sale)) {
    return {
      skipped: true,
      reason: 'sem_identificacao'
    };
  }

  const { member: matchedMember, matchBy } = findMemberForSale(sale, members);
  let member = matchedMember;
  let memberCreated = false;
  let memberEnriched = false;

  if (member) {
    const updatePayload = buildMemberUpdatePayload(member, sale);
    if (Object.keys(updatePayload).length) {
      await member.update(updatePayload, { transaction });
      memberEnriched = true;
    }
  } else {
    member = await Member.create(buildMemberCreatePayload(sale), { transaction });
    memberCreated = true;
  }

  const activityDate = resolveSaleDate(sale);
  const journeyResult = await ensureMemberJourney(member.id, activityDate, transaction);
  const activityResult = await ensureActivity(
    member.id,
    sale,
    activityDate,
    existingActivitiesBySaleUuid,
    transaction
  );

  return {
    skipped: false,
    reason: null,
    matchBy,
    memberId: member.id,
    member,
    saleUuid: String(sale.sale_uuid || ''),
    memberCreated,
    memberEnriched,
    journeyCreated: journeyResult.created,
    activityCreated: activityResult.created,
    activityAlreadyExists: activityResult.alreadyExists,
    conflictingActivityMemberId: activityResult.conflictingMemberId
  };
}

async function processSales(sales, members, existingActivitiesBySaleUuid, sharedTransaction, dryRunMode) {
  const progressInterval = 25;
  const summary = {
    processed: 0,
    skippedWithoutIdentification: 0,
    membersCreated: 0,
    membersEnriched: 0,
    journeysCreated: 0,
    activitiesCreated: 0,
    activitiesAlreadyExisted: 0,
    activityConflicts: 0,
    matchedByDocument: 0,
    matchedByPhone: 0,
    matchedByEmail: 0,
    matchedByName: 0,
    failed: 0
  };

  console.log(`Processando ${sales.length} vendas...`);

  for (const sale of sales) {
    const transaction = sharedTransaction || await sequelize.transaction();

    try {
      const result = await processSale(sale, members, existingActivitiesBySaleUuid, transaction);

      if (result.skipped) {
        if (!sharedTransaction) {
          await transaction.rollback();
        }
        summary.skippedWithoutIdentification += 1;
        console.log(`Ignorado sem identificacao: ${sale.sale_uuid}`);
        continue;
      }

      if (!sharedTransaction) {
        await transaction.commit();
      }

      if (result.memberCreated) {
        members.push(result.member);
      }

      summary.processed += 1;
      summary.membersCreated += result.memberCreated ? 1 : 0;
      summary.membersEnriched += result.memberEnriched ? 1 : 0;
      summary.journeysCreated += result.journeyCreated ? 1 : 0;
      summary.activitiesCreated += result.activityCreated ? 1 : 0;
      summary.activitiesAlreadyExisted += result.activityAlreadyExists ? 1 : 0;
      summary.activityConflicts += result.conflictingActivityMemberId ? 1 : 0;
      summary.matchedByDocument += result.matchBy === 'documento' ? 1 : 0;
      summary.matchedByPhone += result.matchBy === 'telefone' ? 1 : 0;
      summary.matchedByEmail += result.matchBy === 'email' ? 1 : 0;
      summary.matchedByName += result.matchBy === 'nome' ? 1 : 0;

      if (result.conflictingActivityMemberId) {
        console.warn(
          `Atividade ja existe com outro membro para sale_uuid ${result.saleUuid}: ${result.conflictingActivityMemberId}`
        );
      }
    } catch (error) {
      summary.failed += 1;

      console.error(`Erro ao processar venda ${sale.sale_uuid}: ${error.message}`);
      if (error.original && error.original.detail) {
        console.error(`  detalhe: ${error.original.detail}`);
      }

      if (!sharedTransaction) {
        await transaction.rollback();
      } else {
        throw error;
      }
    }

    const handledCount = summary.processed + summary.skippedWithoutIdentification + summary.failed;
    if (handledCount % progressInterval === 0 || handledCount === sales.length) {
      console.log(
        `Progresso: ${handledCount}/${sales.length} | processadas=${summary.processed} | criadas=${summary.membersCreated} | atividades=${summary.activitiesCreated} | falhas=${summary.failed}`
      );
    }
  }

  if (dryRunMode) {
    console.log('Dry-run ativo, nenhuma alteracao foi persistida.');
  } else {
    console.log('Backfill concluido.');
  }

  console.log(`Vendas encontradas: ${sales.length}`);
  console.log(`Vendas processadas: ${summary.processed}`);
  console.log(`Ignoradas sem identificacao: ${summary.skippedWithoutIdentification}`);
  console.log(`Membros criados: ${summary.membersCreated}`);
  console.log(`Membros enriquecidos: ${summary.membersEnriched}`);
  console.log(`Jornadas criadas: ${summary.journeysCreated}`);
  console.log(`Atividades criadas: ${summary.activitiesCreated}`);
  console.log(`Atividades ja existentes: ${summary.activitiesAlreadyExisted}`);
  console.log(`Conflitos de atividade por sale_uuid: ${summary.activityConflicts}`);
  console.log(`Matches por documento: ${summary.matchedByDocument}`);
  console.log(`Matches por telefone: ${summary.matchedByPhone}`);
  console.log(`Matches por email: ${summary.matchedByEmail}`);
  console.log(`Matches por nome parecido: ${summary.matchedByName}`);
  console.log(`Falhas: ${summary.failed}`);

  return summary;
}

async function runDryRun(sales) {
  const transaction = await sequelize.transaction();

  try {
    const members = await loadMembers(transaction);
    const existingActivitiesBySaleUuid = await loadExistingActivities(transaction);
    return await processSales(sales, members, existingActivitiesBySaleUuid, transaction, true);
  } finally {
    await transaction.rollback();
  }
}

async function runPersisted(sales) {
  const members = await loadMembers();
  const existingActivitiesBySaleUuid = await loadExistingActivities();

  return processSales(sales, members, existingActivitiesBySaleUuid, null, false);
}

async function run() {
  const sales = await loadSales();

  console.log(`Vendas em inscritos_sales: ${sales.length}`);
  if (!sales.length) {
    return;
  }

  if (isDryRun) {
    await runDryRun(sales);
    return;
  }

  await runPersisted(sales);
}

run()
  .catch((error) => {
    console.error('Erro ao executar backfill de inscritos_sales para membros:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
