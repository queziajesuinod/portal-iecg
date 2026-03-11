/* eslint-disable no-console, no-await-in-loop, no-continue, no-restricted-syntax */
const { Op } = require('sequelize');
const {
  sequelize,
  ApeloDirecionadoCelula,
  ApeloDirecionadoHistorico,
  Member,
  MemberJourney,
  MemberActivity,
  MemberMilestone,
  MemberActivityType,
  Campus,
  Sequelize
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');
const DIRECTION_STATUSES = new Set([
  'MOVIMENTACAO_CELULA',
  'DIRECIONADO_COM_SUCESSO',
  'CONSOLIDADO_CELULA'
]);
const ACTIVITY_SOURCE = 'apelo_direcionado_backfill';
const STATE_UF_BY_NAME = {
  ACRE: 'AC',
  ALAGOAS: 'AL',
  AMAPA: 'AP',
  AMAZONAS: 'AM',
  BAHIA: 'BA',
  CEARA: 'CE',
  'DISTRITO FEDERAL': 'DF',
  'ESPIRITO SANTO': 'ES',
  GOIAS: 'GO',
  MARANHAO: 'MA',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',
  'MINAS GERAIS': 'MG',
  PARA: 'PA',
  PARAIBA: 'PB',
  PARANA: 'PR',
  PERNAMBUCO: 'PE',
  PIAUI: 'PI',
  'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN',
  'RIO GRANDE DO SUL': 'RS',
  RONDONIA: 'RO',
  RORAIMA: 'RR',
  'SANTA CATARINA': 'SC',
  'SAO PAULO': 'SP',
  SERGIPE: 'SE',
  TOCANTINS: 'TO'
};

let campusCache = null;
const activityPointsCache = new Map();

function sanitizePhone(value) {
  return String(value || '').replace(/\D/g, '');
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

function normalizeExactText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCampusText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStateUf(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (!normalized) return null;
  if (normalized.length === 2) return normalized;
  return STATE_UF_BY_NAME[normalized] || null;
}

function normalizePhoneForCompare(value) {
  const digits = sanitizePhone(value);
  if (!digits) return '';
  if (digits.length > 11) return digits.slice(-11);
  return digits;
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

function getPhoneSuffixes(value) {
  const digits = normalizePhoneForCompare(value);
  if (!digits) return [];

  const values = new Set([digits]);
  if (digits.length >= 11) values.add(digits.slice(-11));
  if (digits.length >= 10) values.add(digits.slice(-10));
  if (digits.length >= 9) values.add(digits.slice(-9));

  return Array.from(values).filter((item) => item.length >= 8);
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

function resolveDecisionActivityType(decision) {
  const normalized = normalizeExactText(decision);
  if (normalized === 'encaminhamento_celula') return 'ENCAMINHAMENTO_CELULA';
  if (normalized === 'apelo_decisao' || normalized === 'apelo_volta') return 'APELO';
  return null;
}

function getBaseEventDate(apelo) {
  return apelo.createdAt || apelo.data_direcionamento || apelo.updatedAt || new Date();
}

function getDirectionDate(apelo, histories) {
  const historyDates = histories
    .filter((item) => (
      DIRECTION_STATUSES.has(item.status_novo)
      || item.tipo_evento === 'CELULA'
    ))
    .map((item) => item.data_movimento)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));

  if (historyDates.length) {
    return historyDates[0];
  }

  if (DIRECTION_STATUSES.has(apelo.status)) {
    return apelo.data_direcionamento || apelo.updatedAt || new Date();
  }

  return null;
}

function getConsolidationDate(apelo, histories) {
  const historyDates = histories
    .filter((item) => item.status_novo === 'CONSOLIDADO_CELULA')
    .map((item) => item.data_movimento)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));

  if (historyDates.length) {
    return historyDates[0];
  }

  if (apelo.status === 'CONSOLIDADO_CELULA') {
    return apelo.updatedAt || apelo.data_direcionamento || new Date();
  }

  return null;
}

async function loadCampuses(transaction) {
  if (campusCache) {
    return campusCache;
  }

  campusCache = await Campus.findAll({
    attributes: ['id', 'nome'],
    transaction
  });

  return campusCache;
}

async function resolveCampusId(campusName, transaction) {
  const normalizedCampus = normalizeCampusText(campusName);
  if (!normalizedCampus) {
    return null;
  }

  const campuses = await loadCampuses(transaction);
  const exactMatch = campuses.find((campus) => normalizeCampusText(campus.nome) === normalizedCampus);
  if (exactMatch) {
    return exactMatch.id;
  }

  const partialMatch = campuses.find((campus) => {
    const normalizedName = normalizeCampusText(campus.nome);
    return normalizedName.includes(normalizedCampus) || normalizedCampus.includes(normalizedName);
  });

  return partialMatch ? partialMatch.id : null;
}

async function findMemberByPhone(phone, name, transaction) {
  const normalizedPhone = normalizePhoneForCompare(phone);
  if (!normalizedPhone) {
    return null;
  }

  const suffixes = getPhoneSuffixes(normalizedPhone);
  if (!suffixes.length) {
    return null;
  }

  const buildPhoneCondition = (columnName, suffix) => Sequelize.where(
    Sequelize.fn(
      'regexp_replace',
      Sequelize.fn('coalesce', Sequelize.col(columnName), ''),
      '\\D',
      '',
      'g'
    ),
    { [Op.like]: `%${suffix}` }
  );

  const candidates = await Member.findAll({
    where: {
      [Op.or]: suffixes.flatMap((suffix) => ([
        buildPhoneCondition('phone', suffix),
        buildPhoneCondition('whatsapp', suffix)
      ]))
    },
    order: [['updatedAt', 'DESC']],
    transaction
  });

  return (
    candidates.find((member) => (
      phonesMatch(normalizedPhone, member.phone)
      || phonesMatch(normalizedPhone, member.whatsapp)
    ))
    || candidates.find((member) => namesLookSimilar(name, member.fullName))
    || null
  );
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

async function resolveActivityPoints(activityType, transaction) {
  if (!activityType) {
    return 0;
  }

  if (activityPointsCache.has(activityType)) {
    return activityPointsCache.get(activityType);
  }

  const activityTypeRef = await MemberActivityType.findOne({
    where: { code: activityType },
    attributes: ['defaultPoints'],
    transaction
  });

  const points = Number(activityTypeRef ? activityTypeRef.defaultPoints : 0);
  activityPointsCache.set(activityType, points);
  return points;
}

async function ensureMemberForApelo(apelo, transaction) {
  const phone = apelo.whatsapp || null;
  const campusId = await resolveCampusId(apelo.campus_iecg, transaction);
  const existingMember = await findMemberByPhone(phone, apelo.nome, transaction);

  if (existingMember) {
    const nextPayload = {};

    if (!existingMember.fullName && apelo.nome) nextPayload.fullName = apelo.nome;
    if (!existingMember.phone && phone) nextPayload.phone = phone;
    if (!existingMember.whatsapp && phone) nextPayload.whatsapp = phone;
    if (!existingMember.zipCode && apelo.cep_apelo) nextPayload.zipCode = apelo.cep_apelo;
    if (!existingMember.neighborhood && apelo.bairro_apelo) nextPayload.neighborhood = apelo.bairro_apelo;
    if (!existingMember.city && apelo.cidade_apelo) nextPayload.city = apelo.cidade_apelo;
    if (!existingMember.state && normalizeStateUf(apelo.estado_apelo)) {
      nextPayload.state = normalizeStateUf(apelo.estado_apelo);
    }
    if (!existingMember.campusId && campusId) nextPayload.campusId = campusId;

    if (Object.keys(nextPayload).length) {
      await existingMember.update(nextPayload, { transaction });
      return { member: existingMember, created: false, enriched: true };
    }

    return { member: existingMember, created: false, enriched: false };
  }

  const member = await Member.create({
    fullName: apelo.nome || 'Visitante sem nome',
    status: 'VISITANTE',
    phone: phone || null,
    whatsapp: phone || null,
    zipCode: apelo.cep_apelo || null,
    neighborhood: apelo.bairro_apelo || null,
    city: apelo.cidade_apelo || null,
    state: normalizeStateUf(apelo.estado_apelo),
    country: 'Brasil',
    campusId,
    statusChangeDate: toDateOnly(apelo.createdAt) || toDateOnly(new Date()),
    createdAt: apelo.createdAt || new Date(),
    updatedAt: apelo.updatedAt || apelo.createdAt || new Date()
  }, { transaction });

  return { member, created: true, enriched: false };
}

async function ensureActivity(memberId, activityType, activityDate, metadata, transaction) {
  if (!memberId || !activityType || !activityDate) {
    return { created: false, activity: null };
  }

  const existing = await MemberActivity.findAll({
    where: {
      memberId,
      activityType
    },
    order: [['activityDate', 'ASC']],
    transaction
  });

  const matched = existing.find((activity) => {
    const existingMetadata = activity.metadata || {};
    return String(existingMetadata.apeloId || '') === String(metadata.apeloId || '');
  });

  if (matched) {
    return { created: false, activity: matched };
  }

  const points = await resolveActivityPoints(activityType, transaction);
  const activity = await MemberActivity.create({
    memberId,
    activityType,
    activityDate,
    points,
    metadata: {
      ...metadata,
      source: ACTIVITY_SOURCE
    }
  }, { transaction });

  return { created: true, activity };
}

async function ensureMilestone(memberId, milestoneType, achievedDate, description, transaction) {
  if (!memberId || !milestoneType || !achievedDate) {
    return { created: false, updated: false, milestone: null };
  }

  const normalizedDate = toDateOnly(achievedDate);
  const existing = await MemberMilestone.findOne({
    where: {
      memberId,
      milestoneType
    },
    transaction
  });

  if (!existing) {
    return {
      created: true,
      updated: false,
      milestone: await MemberMilestone.create({
        memberId,
        milestoneType,
        achievedDate: normalizedDate,
        description: description || null,
        createdAt: achievedDate
      }, { transaction })
    };
  }

  const nextValues = {};
  if (normalizedDate && String(existing.achievedDate) > normalizedDate) {
    nextValues.achievedDate = normalizedDate;
  }
  if (!existing.description && description) {
    nextValues.description = description;
  }

  if (Object.keys(nextValues).length) {
    await existing.update(nextValues, { transaction });
    return { created: false, updated: true, milestone: existing };
  }

  return { created: false, updated: false, milestone: existing };
}

async function loadApelos() {
  const apelos = await ApeloDirecionadoCelula.findAll({
    order: [['createdAt', 'ASC']]
  });
  const histories = await ApeloDirecionadoHistorico.findAll({
    order: [['data_movimento', 'ASC']]
  });

  const historiesByApeloId = histories.reduce((acc, item) => {
    const current = acc.get(item.apelo_id) || [];
    current.push(item);
    acc.set(item.apelo_id, current);
    return acc;
  }, new Map());

  return apelos.map((apelo) => ({
    apelo,
    histories: historiesByApeloId.get(apelo.id) || []
  }));
}

async function processApelo(apelo, histories, transaction) {
  const phone = sanitizePhone(apelo.whatsapp);
  if (!phone) {
    return {
      skipped: true,
      reason: 'sem_telefone'
    };
  }

  const memberResult = await ensureMemberForApelo(apelo, transaction);
  const { member } = memberResult;

  const createdActivities = [];
  const createdMilestones = [];
  let updatedMilestone = false;

  const baseEventDate = getBaseEventDate(apelo);
  const baseActivityType = resolveDecisionActivityType(apelo.decisao);
  if (baseActivityType) {
    const activityResult = await ensureActivity(
      member.id,
      baseActivityType,
      baseEventDate,
      {
        apeloId: apelo.id,
        decisao: apelo.decisao || null
      },
      transaction
    );

    if (activityResult.created) {
      createdActivities.push(baseActivityType);
    }
  }

  const directionDate = getDirectionDate(apelo, histories);
  if (directionDate && baseActivityType !== 'ENCAMINHAMENTO_CELULA') {
    const directionActivityResult = await ensureActivity(
      member.id,
      'ENCAMINHAMENTO_CELULA',
      directionDate,
      {
        apeloId: apelo.id,
        decisao: apelo.decisao || null,
        status: apelo.status || null
      },
      transaction
    );

    if (directionActivityResult.created) {
      createdActivities.push('ENCAMINHAMENTO_CELULA');
    }
  }

  const consolidationDate = getConsolidationDate(apelo, histories);
  if (consolidationDate) {
    const consolidationActivityResult = await ensureActivity(
      member.id,
      'CONSOLIDADO_CELULA',
      consolidationDate,
      {
        apeloId: apelo.id,
        decisao: apelo.decisao || null,
        status: 'CONSOLIDADO_CELULA'
      },
      transaction
    );

    if (consolidationActivityResult.created) {
      createdActivities.push('CONSOLIDADO_CELULA');
    }

    const milestoneResult = await ensureMilestone(
      member.id,
      'CONSOLIDADO_CELULA',
      consolidationDate,
      'Consolidado via apelo direcionado',
      transaction
    );

    if (milestoneResult.created) {
      createdMilestones.push('CONSOLIDADO_CELULA');
    }
    if (milestoneResult.updated) {
      updatedMilestone = true;
    }
  }

  const lastActivityDate = consolidationDate || directionDate || baseEventDate;
  const journeyResult = await ensureMemberJourney(member.id, lastActivityDate, transaction);

  return {
    skipped: false,
    memberCreated: memberResult.created,
    memberEnriched: memberResult.enriched,
    journeyCreated: journeyResult.created,
    createdActivities,
    createdMilestones,
    updatedMilestone
  };
}

async function run() {
  const apelosComHistorico = await loadApelos();

  console.log(`Apelos encontrados: ${apelosComHistorico.length}`);
  if (!apelosComHistorico.length) {
    return;
  }

  const summary = {
    processed: 0,
    skippedWithoutPhone: 0,
    membersCreated: 0,
    membersEnriched: 0,
    journeysCreated: 0,
    activitiesCreated: 0,
    milestonesCreated: 0,
    milestonesUpdated: 0,
    failed: 0
  };

  for (const item of apelosComHistorico) {
    const { apelo, histories } = item;
    const transaction = await sequelize.transaction();

    try {
      const result = await processApelo(apelo, histories, transaction);

      if (result.skipped) {
        await transaction.rollback();
        summary.skippedWithoutPhone += 1;
        console.log(`Ignorado sem telefone: ${apelo.id} / ${apelo.nome || 'Sem nome'}`);
        continue;
      }

      if (isDryRun) {
        await transaction.rollback();
      } else {
        await transaction.commit();
      }

      summary.processed += 1;
      summary.membersCreated += result.memberCreated ? 1 : 0;
      summary.membersEnriched += result.memberEnriched ? 1 : 0;
      summary.journeysCreated += result.journeyCreated ? 1 : 0;
      summary.activitiesCreated += result.createdActivities.length;
      summary.milestonesCreated += result.createdMilestones.length;
      summary.milestonesUpdated += result.updatedMilestone ? 1 : 0;
    } catch (error) {
      summary.failed += 1;
      await transaction.rollback();
      console.error(`Erro ao processar apelo ${apelo.id}: ${error.message}`);
      if (error.original && error.original.detail) {
        console.error(`  detalhe: ${error.original.detail}`);
      }
    }
  }

  console.log(isDryRun ? 'Dry-run ativo, nenhuma alteracao foi persistida.' : 'Backfill concluido.');
  console.log(`Apelos processados: ${summary.processed}`);
  console.log(`Apelos ignorados sem telefone: ${summary.skippedWithoutPhone}`);
  console.log(`Membros criados: ${summary.membersCreated}`);
  console.log(`Membros enriquecidos: ${summary.membersEnriched}`);
  console.log(`Jornadas criadas: ${summary.journeysCreated}`);
  console.log(`Atividades criadas: ${summary.activitiesCreated}`);
  console.log(`Marcos criados: ${summary.milestonesCreated}`);
  console.log(`Marcos atualizados: ${summary.milestonesUpdated}`);
  console.log(`Falhas: ${summary.failed}`);
}

run()
  .catch((error) => {
    console.error('Erro ao executar backfill de apelos para membros:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
