const { Op } = require('sequelize');
const {
  Member,
  Registration,
  ApeloDirecionadoCelula,
  Celula,
  Voluntariado
} = require('../models');

// ── helpers ──────────────────────────────────────────────────────────────────

function sanitizePhone(v) {
  return String(v || '').replace(/\D/g, '');
}

function buildOptionalLikeFilter(value) {
  if (!value) return undefined;
  return { [Op.iLike]: `%${value}%` };
}

// ── resolvers por source ──────────────────────────────────────────────────────

async function resolveMembersAudience(filters = {}, contactField = 'whatsapp') {
  const where = {};

  const statuses = filters.status;
  if (statuses?.length) where.status = { [Op.in]: statuses };

  if (filters.campusId) where.campusId = filters.campusId;
  if (filters.celulaId) where.celulaId = filters.celulaId;

  const members = await Member.findAll({
    where,
    attributes: ['id', 'fullName', 'email', 'phone', 'whatsapp']
  });

  return members
    .map((m) => {
      const contact = contactField === 'email'
        ? m.email
        : sanitizePhone(m.whatsapp || m.phone);
      if (!contact) return null;
      return {
        sourceType: 'member',
        sourceId: m.id,
        name: m.fullName,
        contact,
        variables: { nome: m.fullName, email: m.email }
      };
    })
    .filter(Boolean);
}

async function resolveRegistrationsAudience(filters = {}, contactField = 'buyer_phone') {
  const where = {};

  const statuses = filters.paymentStatus;
  if (statuses?.length) where.paymentStatus = { [Op.in]: statuses };

  if (filters.eventId) where.eventId = filters.eventId;

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt[Op.gte] = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt[Op.lte] = new Date(filters.dateTo);
  }

  const registrations = await Registration.findAll({
    where,
    attributes: ['id', 'buyerData', 'eventId']
  });

  return registrations
    .map((r) => {
      const buyer = r.buyerData || {};
      const phone = sanitizePhone(
        buyer.buyer_phone || buyer.buyer_whatsapp || buyer.phone || buyer.whatsapp || ''
      );
      const email = buyer.buyer_email || buyer.email || '';
      const contact = contactField === 'email' ? email : phone;
      if (!contact) return null;
      const name = buyer.buyer_name || buyer.nome || buyer.name || '';
      return {
        sourceType: 'registration',
        sourceId: r.id,
        name,
        contact,
        variables: { nome: name, email, eventId: r.eventId }
      };
    })
    .filter(Boolean);
}

async function resolveApelosAudience(filters = {}) {
  const where = {};

  if (filters.statusApelo) where.status = buildOptionalLikeFilter(filters.statusApelo);
  if (filters.celulaId) where.celula_id = filters.celulaId;
  if (filters.rede) where.rede = buildOptionalLikeFilter(filters.rede);
  if (filters.campusIecg) where.campus_iecg = buildOptionalLikeFilter(filters.campusIecg);
  if (filters.decisao) where.decisao = buildOptionalLikeFilter(filters.decisao);

  if (filters.dateFrom || filters.dateTo) {
    where.data_direcionamento = {};
    if (filters.dateFrom) where.data_direcionamento[Op.gte] = filters.dateFrom;
    if (filters.dateTo) where.data_direcionamento[Op.lte] = filters.dateTo;
  }

  const apelos = await ApeloDirecionadoCelula.findAll({
    where,
    attributes: ['id', 'nome', 'whatsapp', 'status', 'decisao', 'rede']
  });

  return apelos
    .map((a) => {
      const contact = sanitizePhone(a.whatsapp);
      if (!contact) return null;
      return {
        sourceType: 'apelo',
        sourceId: a.id,
        name: a.nome,
        contact,
        variables: { nome: a.nome, status: a.status, decisao: a.decisao }
      };
    })
    .filter(Boolean);
}

async function resolveLideresApelosAudience(filters = {}, contactField = 'cel_lider') {
  const apeloWhere = {};

  if (filters.statusApelo) apeloWhere.status = buildOptionalLikeFilter(filters.statusApelo);
  if (filters.celulaId) apeloWhere.celula_id = filters.celulaId;
  if (filters.decisao) apeloWhere.decisao = buildOptionalLikeFilter(filters.decisao);

  if (filters.dateFrom || filters.dateTo) {
    apeloWhere.data_direcionamento = {};
    if (filters.dateFrom) apeloWhere.data_direcionamento[Op.gte] = filters.dateFrom;
    if (filters.dateTo) apeloWhere.data_direcionamento[Op.lte] = filters.dateTo;
  }

  const celulaWhere = {};
  if (filters.campusId) celulaWhere.campusId = filters.campusId;
  if (filters.rede) celulaWhere.rede = buildOptionalLikeFilter(filters.rede);

  const apelos = await ApeloDirecionadoCelula.findAll({
    where: apeloWhere,
    attributes: ['id', 'celula_id'],
    include: [{
      model: Celula,
      as: 'celulaAtual',
      attributes: ['id', 'celula', 'lider', 'cel_lider', 'email_lider', 'rede'],
      where: Object.keys(celulaWhere).length ? celulaWhere : undefined,
      required: true
    }]
  });

  // deduplicar por célula (um líder por célula, independente de quantos apelos tem)
  const seen = new Map();
  apelos.forEach((apelo) => {
    const celula = apelo.celulaAtual;
    if (!celula || seen.has(celula.id)) return;
    const contact = contactField === 'email'
      ? celula.email_lider
      : sanitizePhone(celula.cel_lider);
    if (!contact) return;
    seen.set(celula.id, {
      sourceType: 'lider_apelo',
      sourceId: celula.id,
      name: celula.lider,
      contact,
      variables: {
        nome: celula.lider,
        celula: celula.celula,
        rede: celula.rede
      }
    });
  });

  return [...seen.values()];
}

async function resolveVoluntariosAudience(filters = {}, contactField = 'whatsapp') {
  const where = {};

  const statuses = filters.status;
  if (statuses?.length) where.status = { [Op.in]: statuses };

  if (filters.campusId) where.campusId = filters.campusId;
  if (filters.ministerioId) where.ministerioId = filters.ministerioId;
  if (filters.areaVoluntariadoId) where.areaVoluntariadoId = filters.areaVoluntariadoId;

  if (filters.dateFrom || filters.dateTo) {
    where.dataInicio = {};
    if (filters.dateFrom) where.dataInicio[Op.gte] = filters.dateFrom;
    if (filters.dateTo) where.dataInicio[Op.lte] = filters.dateTo;
  }

  const registros = await Voluntariado.findAll({
    where,
    include: [{
      model: Member,
      as: 'membro',
      attributes: ['id', 'fullName', 'email', 'phone', 'whatsapp']
    }]
  });

  return registros
    .map((v) => {
      const m = v.membro;
      if (!m) return null;
      const contact = contactField === 'email'
        ? m.email
        : sanitizePhone(m.whatsapp || m.phone);
      if (!contact) return null;
      return {
        sourceType: 'voluntario',
        sourceId: v.id,
        name: m.fullName,
        contact,
        variables: { nome: m.fullName, email: m.email }
      };
    })
    .filter(Boolean);
}

// ── mapa de resolvers ─────────────────────────────────────────────────────────

const RESOLVERS = {
  members: resolveMembersAudience,
  registrations: resolveRegistrationsAudience,
  apelos: resolveApelosAudience,
  liders_apelos: resolveLideresApelosAudience,
  voluntarios: resolveVoluntariosAudience
};

// ── função principal ──────────────────────────────────────────────────────────

async function resolveAudience(sources = []) {
  const results = [];

  for (const source of sources) {
    const resolver = RESOLVERS[source.type];
    if (!resolver) continue;
    const items = await resolver(source.filters || {}, source.contactField || 'whatsapp');
    results.push(...items);
  }

  // deduplicar pelo campo de contato
  const seen = new Set();
  return results.filter((item) => {
    const key = String(item.contact).toLowerCase().replace(/\D/g, '') || item.contact;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function previewAudienceCount(sources = []) {
  const audience = await resolveAudience(sources);
  return { total: audience.length };
}

module.exports = { resolveAudience, previewAudienceCount };
