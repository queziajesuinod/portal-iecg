/* eslint-disable no-await-in-loop, no-continue, no-restricted-syntax */
const { Op } = require('sequelize');
const {
  Event, FormField, Registration, RegistrationAttendee,
  Member, MemberJourney, MemberActivity
} = require('../models');

const MEMBER_FIELDS = [
  { key: 'fullName', label: 'Nome completo' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'cpf', label: 'CPF' },
  { key: 'birthDate', label: 'Data de nascimento' },
  { key: 'gender', label: 'Gênero' },
  { key: 'maritalStatus', label: 'Estado civil' },
  { key: 'zipCode', label: 'CEP' },
  { key: 'street', label: 'Endereço' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'Estado' },
];

function suggestMapping(fields) {
  const map = {};
  for (const field of fields) {
    const name = field.fieldName.toLowerCase();
    const { fieldType } = field;
    if (name.includes('nome') || name.includes('name')) map[field.fieldName] = 'fullName';
    else if (fieldType === 'email' || name.includes('email')) map[field.fieldName] = 'email';
    else if (fieldType === 'cpf' || name.includes('cpf') || name.includes('documento')) map[field.fieldName] = 'cpf';
    else if (name.includes('whatsapp')) map[field.fieldName] = 'whatsapp';
    else if (fieldType === 'phone' || name.includes('telefone') || name.includes('phone')) map[field.fieldName] = 'phone';
    else if (fieldType === 'date' && (name.includes('nascimento') || name.includes('birth'))) map[field.fieldName] = 'birthDate';
    else if (name.includes('genero') || name.includes('sexo') || name.includes('gender')) map[field.fieldName] = 'gender';
    else if (name.includes('cep') || name.includes('zip')) map[field.fieldName] = 'zipCode';
    else if (name.includes('endereco') || name.includes('rua') || name.includes('street')) map[field.fieldName] = 'street';
    else if (name.includes('bairro') || name.includes('neighborhood')) map[field.fieldName] = 'neighborhood';
    else if (name.includes('cidade') || name.includes('city')) map[field.fieldName] = 'city';
    else if (name.includes('estado') && !name.includes('civil')) map[field.fieldName] = 'state';
    else if (name.includes('civil') || name.includes('marital')) map[field.fieldName] = 'maritalStatus';
  }
  return map;
}

async function getSetup(eventId) {
  const event = await Event.findByPk(eventId, {
    attributes: ['id', 'title', 'startDate', 'endDate', 'eventType']
  });
  if (!event) throw new Error('Evento não encontrado');

  const fields = await FormField.findAll({
    where: { eventId, section: 'attendee' },
    attributes: ['id', 'fieldName', 'fieldLabel', 'fieldType', 'isRequired'],
    order: [['order', 'ASC']]
  });

  const buyerFields = await FormField.findAll({
    where: { eventId, section: 'buyer' },
    attributes: ['id', 'fieldName', 'fieldLabel', 'fieldType', 'isRequired'],
    order: [['order', 'ASC']]
  });

  const [attendeeCount, importedCount] = await Promise.all([
    getAttendeeCount(eventId),
    MemberActivity.count({ where: { activityType: 'EVENTO_INSCRICAO', eventId } })
  ]);

  return {
    event,
    attendeeFields: fields,
    buyerFields,
    memberFields: MEMBER_FIELDS,
    suggestedMapping: suggestMapping(fields),
    suggestedBuyerMapping: suggestMapping(buyerFields),
    attendeeCount,
    importedCount
  };
}

async function getAttendeeCount(eventId) {
  return RegistrationAttendee.count({
    include: [{
      model: Registration,
      as: 'registration',
      where: {
        eventId,
        paymentStatus: { [Op.in]: ['confirmed', 'authorized'] }
      },
      required: true
    }]
  });
}

function extractData(rawData, fieldMapping) {
  const result = {};
  for (const [fieldName, memberField] of Object.entries(fieldMapping)) {
    if (!memberField) continue;
    const value = rawData[fieldName];
    if (value !== undefined && value !== null && value !== '') {
      result[memberField] = value;
    }
  }
  return result;
}

function sanitizeData(data) {
  const out = { ...data };
  if (out.cpf) out.cpf = String(out.cpf).replace(/\D/g, '').slice(0, 11) || null;
  if (out.phone) out.phone = String(out.phone).replace(/\D/g, '') || null;
  if (out.whatsapp) out.whatsapp = String(out.whatsapp).replace(/\D/g, '') || null;
  if (out.email) out.email = String(out.email).trim().toLowerCase() || null;
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) out.email = null;
  return out;
}

async function findExistingMember(data) {
  const clauses = [];
  if (data.email) clauses.push({ email: data.email });
  if (data.cpf && data.cpf.length >= 11) clauses.push({ cpf: data.cpf });
  const phone = data.whatsapp || data.phone;
  if (phone && phone.length >= 8) {
    const suffix = phone.slice(-9);
    clauses.push({ whatsapp: { [Op.like]: `%${suffix}` } });
    clauses.push({ phone: { [Op.like]: `%${suffix}` } });
  }
  if (!clauses.length) return null;
  return Member.findOne({
    where: { [Op.or]: clauses },
    attributes: ['id', 'fullName', 'status', 'email', 'phone', 'whatsapp']
  });
}

async function previewImport(eventId, fieldMapping, buyerFieldMapping = {}) {
  const attendees = await RegistrationAttendee.findAll({
    include: [{
      model: Registration,
      as: 'registration',
      where: {
        eventId,
        paymentStatus: { [Op.in]: ['confirmed', 'authorized'] }
      },
      required: true,
      attributes: ['id', 'orderCode', 'paymentStatus', 'buyerData']
    }],
    attributes: ['id', 'registrationId', 'attendeeData', 'attendeeNumber']
  });

  const result = [];

  for (const att of attendees) {
    const attendeeRaw = att.attendeeData || {};
    const buyerRaw = att.registration?.buyerData || {};

    let data = extractData(attendeeRaw, fieldMapping);
    const buyerData = extractData(buyerRaw, buyerFieldMapping);

    // Fallback para dados do comprador quando campo não está mapeado no inscrito
    if (!data.fullName && buyerData.fullName) data.fullName = buyerData.fullName;
    if (!data.email && buyerData.email) data.email = buyerData.email;
    if (!data.phone && buyerData.phone) data.phone = buyerData.phone;
    if (!data.whatsapp && buyerData.whatsapp) data.whatsapp = buyerData.whatsapp;
    if (!data.cpf && buyerData.cpf) data.cpf = buyerData.cpf;

    data = sanitizeData(data);

    const existing = await findExistingMember(data);

    let hasActivity = false;
    if (existing) {
      const existingActivity = await MemberActivity.findOne({
        where: { memberId: existing.id, activityType: 'EVENTO_INSCRICAO', eventId }
      });
      hasActivity = Boolean(existingActivity);
    }

    let action = 'create';
    if (existing && hasActivity) action = 'skip';
    else if (existing) action = 'add_activity';

    result.push({
      attendeeId: att.id,
      attendeeNumber: att.attendeeNumber,
      orderCode: att.registration?.orderCode,
      mappedData: data,
      existingMember: existing
        ? { id: existing.id, fullName: existing.fullName, status: existing.status }
        : null,
      hasActivity,
      action
    });
  }

  const summary = result.reduce((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1;
    return acc;
  }, { create: 0, add_activity: 0, skip: 0 });

  return { attendees: result, summary };
}

async function executeImport(eventId, fieldMapping, buyerFieldMapping = {}, memberStatus = 'MEMBRO') {
  const event = await Event.findByPk(eventId, {
    attributes: ['id', 'title', 'startDate']
  });
  if (!event) throw new Error('Evento não encontrado');

  const attendees = await RegistrationAttendee.findAll({
    include: [{
      model: Registration,
      as: 'registration',
      where: {
        eventId,
        paymentStatus: { [Op.in]: ['confirmed', 'authorized'] }
      },
      required: true,
      attributes: ['id', 'orderCode', 'buyerData']
    }],
    attributes: ['id', 'registrationId', 'attendeeData', 'attendeeNumber']
  });

  const stats = {
    created: 0, addedActivity: 0, skipped: 0, errors: []
  };

  for (const att of attendees) {
    try {
      const attendeeRaw = att.attendeeData || {};
      const buyerRaw = att.registration?.buyerData || {};

      let data = extractData(attendeeRaw, fieldMapping);
      const buyerData = extractData(buyerRaw, buyerFieldMapping);

      if (!data.fullName && buyerData.fullName) data.fullName = buyerData.fullName;
      if (!data.email && buyerData.email) data.email = buyerData.email;
      if (!data.phone && buyerData.phone) data.phone = buyerData.phone;
      if (!data.whatsapp && buyerData.whatsapp) data.whatsapp = buyerData.whatsapp;
      if (!data.cpf && buyerData.cpf) data.cpf = buyerData.cpf;

      data = sanitizeData(data);

      if (!data.fullName) {
        stats.errors.push({ attendeeId: att.id, orderCode: att.registration?.orderCode, erro: 'Nome não mapeado' });
        continue;
      }

      let member = await findExistingMember(data);

      if (!member) {
        member = await Member.create({
          fullName: data.fullName,
          email: data.email || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          cpf: data.cpf || null,
          birthDate: data.birthDate || null,
          gender: data.gender || null,
          maritalStatus: data.maritalStatus || null,
          zipCode: data.zipCode || null,
          street: data.street || null,
          neighborhood: data.neighborhood || null,
          city: data.city || null,
          state: data.state || null,
          status: memberStatus
        });

        await MemberJourney.findOrCreate({
          where: { memberId: member.id },
          defaults: {
            memberId: member.id,
            currentStage: memberStatus,
            healthStatus: 'SAUDAVEL',
            engagementScore: 0
          }
        });

        stats.created += 1;
      }

      // Idempotência: não duplica atividade
      const existingActivity = await MemberActivity.findOne({
        where: { memberId: member.id, activityType: 'EVENTO_INSCRICAO', eventId }
      });

      if (existingActivity) {
        stats.skipped += 1;
        continue;
      }

      await MemberActivity.create({
        memberId: member.id,
        activityType: 'EVENTO_INSCRICAO',
        activityDate: event.startDate || new Date(),
        points: 5,
        eventId,
        metadata: {
          source: 'event_import',
          eventName: event.title,
          eventDate: event.startDate,
          registrationId: att.registrationId,
          attendeeId: att.id,
          orderCode: att.registration?.orderCode
        }
      });

      stats.addedActivity += 1;
    } catch (err) {
      stats.errors.push({
        attendeeId: att.id,
        orderCode: att.registration?.orderCode,
        erro: err.message
      });
    }
  }

  return stats;
}

module.exports = {
  getSetup,
  getAttendeeCount,
  previewImport,
  executeImport,
  MEMBER_FIELDS
};
