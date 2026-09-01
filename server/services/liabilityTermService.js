const crypto = require('crypto');
const {
  Event,
  EventLiabilityTerm,
  RegistrationTermAcceptance,
  RegistrationAttendee,
  FormField,
} = require('../models');

// Token de controle: quebra manual de pagina. Preservado na renderizacao (nao e' um valor).
const PAGE_BREAK_TOKEN = 'QUEBRA_PAGINA';

// Placeholders de SISTEMA (evento/data).
const SYSTEM_PLACEHOLDERS = [
  { key: 'EVENTO_NOME', label: 'Nome do evento' },
  { key: 'EVENTO_DATA', label: 'Data do evento' },
  { key: 'EVENTO_LOCAL', label: 'Local do evento' },
  { key: 'DATA_ASSINATURA', label: 'Data da assinatura' },
];

// Placeholders PADRAO: sempre disponiveis. Resolvidos dos dados do inscrito
// (campo mapeado ou heuristica) e, se ausentes, coletados na assinatura.
const STANDARD_PLACEHOLDERS = [
  { key: 'PARTICIPANTE_NOME', label: 'Nome do participante' },
  { key: 'RESPONSAVEL_NOME', label: 'Nome do responsável (assinatura)' },
  { key: 'RESPONSAVEL_CPF', label: 'CPF do responsável' },
  { key: 'CONTATO_EMERGENCIA_NOME', label: 'Contato de emergência (nome)' },
  { key: 'CONTATO_EMERGENCIA_WHATSAPP', label: 'Contato de emergência (WhatsApp)' },
];

const EDITABLE_FIELDS = [
  'title', 'contentHtml', 'backgroundImageUrl', 'contentTopOffset', 'contentBottomOffset',
  'signatureMode', 'requireDocument',
  'participantNameField', 'signerNameField', 'signerDocumentField', 'collectFields',
];

// Rotulos dos campos padrao (para mensagens de validacao).
const STANDARD_LABELS = {
  RESPONSAVEL_NOME: 'nome do responsável',
  RESPONSAVEL_CPF: 'CPF do responsável',
  CONTATO_EMERGENCIA_NOME: 'nome do contato de emergência',
  CONTATO_EMERGENCIA_WHATSAPP: 'WhatsApp do contato de emergência',
};

function fmtDate(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

function systemValues(event = {}, signedAt = null) {
  return {
    EVENTO_NOME: event.title || '',
    EVENTO_DATA: fmtDate(event.startDate),
    EVENTO_LOCAL: event.location || '',
    DATA_ASSINATURA: fmtDate(signedAt || new Date()),
  };
}

// Heuristica: acha valor em attendeeData por chaves candidatas (exatas ou por substring).
function pick(data = {}, candidates = []) {
  if (!data || typeof data !== 'object') return '';
  for (const key of candidates) {
    if (data[key] != null && String(data[key]).trim() !== '') return String(data[key]).trim();
  }
  const entries = Object.entries(data);
  for (const cand of candidates) {
    const hit = entries.find(([k]) => k.toLowerCase().includes(cand.toLowerCase()));
    if (hit && hit[1] != null && String(hit[1]).trim() !== '') return String(hit[1]).trim();
  }
  return '';
}

function getAttendeeValue(attendeeData, fieldName) {
  if (!fieldName || !attendeeData) return '';
  const v = attendeeData[fieldName];
  return v != null ? String(v).trim() : '';
}

// Resolve os placeholders PADRAO de forma ESTRITA: responsavel so' pelo campo mapeado
// (designacao) ou pelo valor coletado no aceite; emergencia so' pelo aceite. Evita
// heuristica frouxa que pegaria o dado do proprio participante. Nome do participante
// pode usar heuristica (e' o proprio).
function resolveStandardValues(term = {}, attendeeData = {}, acc = {}) {
  return {
    PARTICIPANTE_NOME: getAttendeeValue(attendeeData, term.participantNameField)
      || pick(attendeeData, ['nome_completo', 'nome', 'name', 'nome_participante'])
      || acc.participantName || '',
    RESPONSAVEL_NOME: getAttendeeValue(attendeeData, term.signerNameField) || acc.signerName || '',
    RESPONSAVEL_CPF: getAttendeeValue(attendeeData, term.signerDocumentField) || acc.signerDocument || '',
    CONTATO_EMERGENCIA_NOME: acc.emergencyContactName || '',
    CONTATO_EMERGENCIA_WHATSAPP: acc.emergencyContactPhone || '',
  };
}

// Marcador de quebra de pagina (detectado na paginacao; separador visivel fora dela).
const PAGE_BREAK_MARKER = '<div data-pagebreak="1" style="border-top:2px dashed #bbb;color:#999;font-size:10px;text-align:center;margin:6px 0">— quebra de página —</div>';

// Converte {{QUEBRA_PAGINA}} (inclusive quando sozinho num <p>) no marcador de quebra.
function applyPageBreaks(html = '') {
  return String(html).replace(/(<p>\s*)?\{\{\s*QUEBRA_PAGINA\s*\}\}(\s*<\/p>)?/g, PAGE_BREAK_MARKER);
}

// Substitui {{CHAVE}}: resolve sistema, padrao e campos do inscrito; converte a quebra de pagina.
function renderTermHtml(contentHtml = '', {
  attendeeData = {}, standardValues = {}, event = {}, signedAt = null,
} = {}) {
  const sys = systemValues(event, signedAt);
  const substituted = String(contentHtml).replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, key) => {
    if (key === PAGE_BREAK_TOKEN) return match; // tratado por applyPageBreaks
    if (sys[key] != null) return String(sys[key]);
    if (standardValues[key] != null && standardValues[key] !== '') return String(standardValues[key]);
    if (attendeeData && attendeeData[key] != null) return String(attendeeData[key]);
    return '';
  });
  return applyPageBreaks(substituted);
}

function hashContent(html = '') {
  return crypto.createHash('sha256').update(String(html), 'utf8').digest('hex');
}

function termReferences(term, key) {
  return String(term?.contentHtml || '').includes(`{{${key}}}`)
    || new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`).test(String(term?.contentHtml || ''));
}

// ===== Catalogo de placeholders =====

async function getPlaceholderCatalog(eventId) {
  const fields = await FormField.findAll({
    where: { eventId, section: 'attendee' },
    attributes: ['fieldName', 'fieldLabel', 'fieldType'],
    order: [['order', 'ASC']],
  });
  const attendeeFields = fields.map((f) => ({
    key: f.fieldName,
    label: f.fieldLabel || f.fieldName,
    fieldType: f.fieldType,
  }));
  return {
    systemPlaceholders: SYSTEM_PLACEHOLDERS,
    standardPlaceholders: STANDARD_PLACEHOLDERS,
    attendeeFields,
    pageBreakToken: PAGE_BREAK_TOKEN,
  };
}

// ===== Config (admin) =====

async function getConfigByEvent(eventId) {
  return EventLiabilityTerm.findOne({ where: { eventId, isActive: true } });
}

function sanitizeConfig(payload = {}) {
  const clean = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) clean[field] = payload[field];
  }
  if (clean.signatureMode && !['DRAW', 'CHECKBOX', 'TYPED'].includes(clean.signatureMode)) {
    delete clean.signatureMode;
  }
  return clean;
}

async function upsertConfig(eventId, payload = {}, userId = null) {
  const event = await Event.findByPk(eventId);
  if (!event) throw new Error('Evento não encontrado');

  const clean = sanitizeConfig(payload);
  let term = await EventLiabilityTerm.findOne({ where: { eventId, isActive: true } });

  if (!term) {
    term = await EventLiabilityTerm.create({
      eventId,
      ...clean,
      contentHtml: clean.contentHtml || '',
      version: 1,
      isActive: true,
      createdBy: userId,
    });
  } else {
    const contentChanged = Object.prototype.hasOwnProperty.call(clean, 'contentHtml')
      && clean.contentHtml !== term.contentHtml;
    await term.update({
      ...clean,
      version: contentChanged ? term.version + 1 : term.version,
    });
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'requiresTerm')) {
    await event.update({ requiresLiabilityTerm: Boolean(payload.requiresTerm) });
  }

  return { term, requiresLiabilityTerm: event.requiresLiabilityTerm };
}

// ===== Aceites (auditoria) =====

async function listAcceptances(eventId) {
  return RegistrationTermAcceptance.findAll({
    where: { eventId },
    attributes: { exclude: ['termSnapshotHtml'] },
    include: [{
      model: RegistrationAttendee, as: 'attendee', required: false, attributes: ['id', 'attendeeNumber']
    }],
    order: [['acceptedAt', 'DESC']],
  });
}

// ===== Aceite no fluxo de inscricao (check-in app) =====

function findAcceptance(list, index) {
  if (!Array.isArray(list)) return null;
  const byIndex = list.find((a) => Number(a.attendeeIndex) === index);
  return byIndex || list[index] || null;
}

function attendeeDataAt(attendeesData, index) {
  const item = attendeesData[index];
  if (!item) return {};
  return item.data || item;
}

// Valida (antes de cobrar) que ha aceite valido por participante quando o evento exige termo.
function validateAcceptances({ event, attendeesData = [], termAcceptances }) {
  if (!event || !event.requiresLiabilityTerm) return;
  const term = event.liabilityTerm;
  const mode = term?.signatureMode || 'DRAW';
  const requireDoc = term?.requireDocument !== false;

  attendeesData.forEach((_att, index) => {
    const acc = findAcceptance(termAcceptances, index);
    if (!acc || !acc.accepted) {
      throw new Error('É necessário aceitar o termo de responsabilidade de cada participante.');
    }
    if (mode === 'DRAW' && !acc.signatureImage) {
      throw new Error('É necessário assinar o termo de responsabilidade.');
    }
    const attendeeData = attendeeDataAt(attendeesData, index);
    const std = resolveStandardValues(term, attendeeData, acc);

    if (requireDoc && !std.RESPONSAVEL_CPF) {
      throw new Error('CPF do responsável é obrigatório no termo.');
    }
    // Campos padrao exigidos: os marcados para coletar (collectFields) ou referenciados no texto.
    const exigidos = new Set([...(Array.isArray(term?.collectFields) ? term.collectFields : [])]);
    ['RESPONSAVEL_NOME', 'RESPONSAVEL_CPF', 'CONTATO_EMERGENCIA_NOME', 'CONTATO_EMERGENCIA_WHATSAPP']
      .forEach((k) => { if (termReferences(term, k)) exigidos.add(k); });
    exigidos.forEach((k) => {
      if (STANDARD_LABELS[k] && !std[k]) {
        throw new Error(`Informe o ${STANDARD_LABELS[k]} no termo.`);
      }
    });
  });
}

// Persiste os aceites (auditoria) apos a inscricao/participantes existirem.
async function persistAcceptances({
  event, registration, attendees = [], attendeesData = [], termAcceptances, clientMeta = {},
}, transaction = undefined) {
  if (!event || !event.requiresLiabilityTerm) return;
  const term = event.liabilityTerm;
  const signedAt = new Date();

  const rows = attendees.map((attendee) => {
    const index = (attendee.attendeeNumber || 1) - 1;
    const acc = findAcceptance(termAcceptances, index) || {};
    const attendeeData = attendeeDataAt(attendeesData, index) || attendee.attendeeData || {};
    const std = resolveStandardValues(term, attendeeData, acc);
    const snapshot = term
      ? renderTermHtml(term.contentHtml || '', {
        attendeeData, standardValues: std, event, signedAt,
      })
      : '';

    return {
      registrationId: registration.id,
      registrationAttendeeId: attendee.id,
      eventId: event.id,
      eventLiabilityTermId: term?.id || null,
      termVersion: term?.version || null,
      signerName: std.RESPONSAVEL_NOME || null,
      signerDocument: std.RESPONSAVEL_CPF || null,
      participantName: std.PARTICIPANTE_NOME || null,
      emergencyContactName: std.CONTATO_EMERGENCIA_NOME || null,
      emergencyContactPhone: std.CONTATO_EMERGENCIA_WHATSAPP || null,
      signatureImage: acc.signatureImage || null,
      termSnapshotHtml: snapshot,
      contentHash: hashContent(snapshot),
      ipAddress: clientMeta.ip || null,
      userAgent: clientMeta.userAgent || null,
      acceptedAt: signedAt,
    };
  });

  if (rows.length) {
    await RegistrationTermAcceptance.bulkCreate(rows, { transaction });
  }
}

module.exports = {
  PAGE_BREAK_TOKEN,
  SYSTEM_PLACEHOLDERS,
  STANDARD_PLACEHOLDERS,
  getPlaceholderCatalog,
  renderTermHtml,
  resolveStandardValues,
  hashContent,
  getConfigByEvent,
  upsertConfig,
  listAcceptances,
  validateAcceptances,
  persistAcceptances,
};
