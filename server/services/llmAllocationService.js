const axios = require('axios');

function isObjectRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function prefixObjectKeys(source, prefix) {
  if (!isObjectRecord(source)) return {};
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [`${prefix}.${key}`, value])
  );
}

const ALWAYS_INCLUDED_PROMPT_FIELDS = [
  'attendeeData.nome',
  'attendeeData.nome_completo',
  'attendeeData.lider_de_celula',
  'attendeeData.convidado',
  'attendeeData.quem_te_convidou',
  'attendeeData.sexo',
  'attendeeData.genero',
  'attendeeData.gender',
  'attendeeData.idade',
  'attendeeData.data_de_nascimento',
  'attendeeData.data_nascimento',
  'attendeeData.nascimento',
  'registration.id',
  'registration.orderCode',
  'registration.paymentStatus',
  'registrationAttendee.id',
  'registrationAttendee.registrationId',
  'registrationAttendee.batchId',
  'registrationAttendee.attendeeNumber',
  'eventBatch.id',
  'eventBatch.name'
];
const MAX_PROMPT_FIELD_STRING = 120;
const MAX_PROMPT_CHARS = 120000;
const MAX_PROMPT_FIELDS_WITHOUT_REFERENCE = 20;

function extractAvailableFields(attendees = []) {
  const fields = new Set();
  attendees.forEach((attendee) => {
    if (isObjectRecord(attendee?.attendeeData)) {
      Object.keys(attendee.attendeeData).forEach((key) => {
        fields.add(`attendeeData.${key}`);
      });
    }
    if (isObjectRecord(attendee?.registration)) {
      Object.keys(attendee.registration).forEach((key) => {
        fields.add(`registration.${key}`);
      });
    }
    if (isObjectRecord(attendee?.registrationAttendee)) {
      Object.keys(attendee.registrationAttendee).forEach((key) => {
        fields.add(`registrationAttendee.${key}`);
      });
    }
    if (isObjectRecord(attendee?.batch)) {
      Object.keys(attendee.batch).forEach((key) => {
        fields.add(`eventBatch.${key}`);
      });
    }
  });
  return Array.from(fields).sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));
}

function normalizeSexo(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().trim();
  if (['m', 'masculino', 'homem', 'male', 'masc'].includes(normalized)) return 'M';
  if (['f', 'feminino', 'mulher', 'female', 'fem'].includes(normalized)) return 'F';
  return normalized;
}

function calcularIdade(attendeeData = {}) {
  if (attendeeData.idade !== undefined && attendeeData.idade !== null) {
    const directAge = Number.parseInt(attendeeData.idade, 10);
    if (Number.isFinite(directAge) && directAge >= 0) {
      return directAge;
    }
  }

  const birthDateFields = ['data_de_nascimento', 'data_nascimento', 'nascimento', 'birthdate', 'birth_date'];
  const parsedAges = birthDateFields
    .map((field) => {
      if (!attendeeData[field]) return null;
      const birthDate = new Date(attendeeData[field]);
      if (Number.isNaN(birthDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
      }
      return Number.isFinite(age) && age >= 0 ? age : null;
    })
    .filter((age) => age !== null);

  return parsedAges.length ? parsedAges[0] : null;
}

function normalizeAttendees(rawAttendees = []) {
  return rawAttendees.map((attendee) => {
    const normalizeBooleanInAttendee = (value) => {
      if (value === true) return true;
      if (value === false) return false;
      if (value === null || value === undefined) return null;
      const normalized = String(value).trim().toLowerCase();
      if (['true', '1', 'sim', 'yes', 'y', 'masculino', 'm'].includes(normalized)) return true;
      if (['false', '0', 'nao', 'não', 'no', 'n', 'feminino', 'f'].includes(normalized)) return false;
      return null;
    };

    const attendeeData = isObjectRecord(attendee.attendeeData) ? attendee.attendeeData : {};
    const registrationData = isObjectRecord(attendee.registration) ? attendee.registration : {};
    const registrationAttendeeData = isObjectRecord(attendee.registrationAttendee)
      ? attendee.registrationAttendee
      : {
        id: attendee.id,
        registrationId: attendee.registrationId,
        batchId: attendee.batchId,
        attendeeNumber: attendee.attendeeNumber
      };
    const eventBatchData = isObjectRecord(attendee.batch) ? attendee.batch : {};
    const directSexo = normalizeSexo(attendeeData.sexo || attendeeData.genero || attendeeData.gender);
    const masculineFlag = normalizeBooleanInAttendee(
      attendeeData.sexoMasculino ?? attendeeData.sexo_masculino ?? attendeeData.masculino
    );
    const feminineFlag = normalizeBooleanInAttendee(
      attendeeData.sexoFeminino ?? attendeeData.sexo_feminino ?? attendeeData.feminino
    );
    let inferredSexo = directSexo;
    if (masculineFlag === true && feminineFlag !== true) inferredSexo = 'M';
    if (feminineFlag === true && masculineFlag !== true) inferredSexo = 'F';
    const contextualData = {
      ...prefixObjectKeys(attendeeData, 'attendeeData'),
      ...prefixObjectKeys(registrationData, 'registration'),
      ...prefixObjectKeys(registrationAttendeeData, 'registrationAttendee'),
      ...prefixObjectKeys(eventBatchData, 'eventBatch')
    };

    return {
      id: attendee.id,
      nome: attendeeData.nome_completo || attendeeData.nome || `Inscrito ${attendee.attendeeNumber || ''}`.trim(),
      registrationId: attendee.registrationId || attendee.id,
      sexo: inferredSexo,
      idade: calcularIdade(attendeeData),
      camposDinamicos: contextualData,
      registrationData,
      eventBatchData
    };
  });
}

function toPositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function sanitizeWarnings(warnings) {
  if (!Array.isArray(warnings)) return [];
  return warnings
    .map((warning) => String(warning || '').trim())
    .filter(Boolean);
}

function sanitizeText(value) {
  if (!value) return '';
  return String(value).trim();
}

function sanitizeAllocationValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return null;
    return normalized.slice(0, MAX_PROMPT_FIELD_STRING);
  }
  if (Array.isArray(value)) {
    const sanitized = value
      .map((item) => sanitizeAllocationValue(item))
      .filter((item) => item !== null)
      .slice(0, 3);
    return sanitized.length ? sanitized : null;
  }
  return null;
}

function normalizeKey(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

const LEADER_EXCEPTION_KEYS = new Set([
  '',
  'NAO TENHO',
  'OUTRO LIDER'
]);

function isLeaderException(value) {
  const key = normalizeKey(value);
  return LEADER_EXCEPTION_KEYS.has(key);
}

function getMappedFieldValue(attendee = {}, fieldPath = null) {
  if (!fieldPath) return null;
  const value = attendee?.camposDinamicos?.[fieldPath];
  return value === undefined ? null : value;
}

function getLeaderValueFromAttendee(attendee = {}, mapping = {}) {
  const byMapping = getMappedFieldValue(attendee, mapping?.leaderField);
  if (byMapping !== null && byMapping !== undefined && String(byMapping).trim() !== '') {
    return byMapping;
  }
  const defaultLeader = attendee?.camposDinamicos?.['attendeeData.lider_de_celula'];
  if (defaultLeader !== undefined) return defaultLeader;
  return null;
}

function toFieldCandidates(availableFields = []) {
  return availableFields
    .filter((field) => typeof field === 'string' && field.includes('.'))
    .map((field) => ({
      path: field.trim(),
      pathKey: normalizeKey(field),
      tailKey: normalizeKey(field.split('.').pop() || '')
    }));
}

function chooseFieldByExact(candidates = [], exactPaths = []) {
  const exactKeys = exactPaths.map((path) => normalizeKey(path));
  const matched = candidates.find((candidate) => exactKeys.includes(candidate.pathKey));
  return matched ? matched.path : null;
}

function chooseFieldByHeuristic(candidates = [], options = {}) {
  const {
    mustIncludeAll = [],
    shouldIncludeAny = [],
    preferAttendeeData = true
  } = options;
  const mustKeys = mustIncludeAll.map((token) => normalizeKey(token));
  const anyKeys = shouldIncludeAny.map((token) => normalizeKey(token));

  const ranked = candidates
    .map((candidate) => {
      const text = candidate.pathKey;
      const tail = candidate.tailKey;
      const matchesAll = mustKeys.every((token) => text.includes(token) || tail.includes(token));
      const anyScore = anyKeys.reduce((score, token) => (
        (text.includes(token) || tail.includes(token)) ? score + 1 : score
      ), 0);
      if (!matchesAll || (anyKeys.length > 0 && anyScore === 0)) return null;

      let score = 0;
      if (preferAttendeeData && text.startsWith('ATTENDEEDATA.')) score += 50;
      score += anyScore * 20;
      if (matchesAll && mustKeys.length > 0) score += 30;
      if (tail === text.replace('ATTENDEEDATA.', '')) score += 1;

      return {
        field: candidate.path,
        score
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.field.localeCompare(right.field, 'pt-BR', { sensitivity: 'base' }));

  return ranked[0]?.field || null;
}

function parseFieldMappingFromCustomRules(customRules = '') {
  const mapping = {
    leaderField: null,
    nameField: null,
    guestField: null,
    invitedByField: null
  };

  String(customRules || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/\b(leaderField|guestField|invitedByField|nameField)\s*=\s*([a-zA-Z0-9_.]+)/i);
      if (!match) return;
      const key = match[1];
      const value = match[2];
      if (Object.prototype.hasOwnProperty.call(mapping, key)) {
        mapping[key] = value;
      }
    });

  return mapping;
}

function inferFieldMappingFromAvailableFields(availableFields = [], customRules = '') {
  const explicit = parseFieldMappingFromCustomRules(customRules);
  const candidates = toFieldCandidates(availableFields);

  const leaderField = explicit.leaderField
    || chooseFieldByExact(candidates, ['attendeeData.lider_de_celula'])
    || chooseFieldByHeuristic(candidates, {
      mustIncludeAll: ['lider'],
      shouldIncludeAny: ['lider', 'celula']
    });

  const nameField = explicit.nameField
    || chooseFieldByExact(candidates, [
      'attendeeData.nome_completo',
      'attendeeData.full_name',
      'attendeeData.nome',
      'attendeeData.name'
    ])
    || chooseFieldByHeuristic(candidates, {
      shouldIncludeAny: ['nome_completo', 'full_name', 'nome', 'name']
    });

  const guestField = explicit.guestField
    || chooseFieldByExact(candidates, ['attendeeData.convidado', 'attendeeData.guest'])
    || chooseFieldByHeuristic(candidates, {
      shouldIncludeAny: ['convidado', 'guest']
    });

  const invitedByField = explicit.invitedByField
    || chooseFieldByExact(candidates, [
      'attendeeData.quem_te_convidou',
      'attendeeData.invited_by',
      'attendeeData.convidou'
    ])
    || chooseFieldByHeuristic(candidates, {
      shouldIncludeAny: ['quem_te_convidou', 'invited_by', 'convidou']
    });

  return {
    leaderField: leaderField || null,
    nameField: nameField || null,
    guestField: guestField || null,
    invitedByField: invitedByField || null
  };
}

function normalizeBooleanLike(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'sim', 'yes', 'y', 'masculino', 'm'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'não', 'no', 'n', 'feminino', 'f'].includes(normalized)) return false;
  return null;
}

function normalizeRuleText(customRules = '') {
  return String(customRules || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function extractReferencedBatchIds(customRules = '') {
  const matches = String(customRules || '').match(/eventBatch\.id\s*[:=]\s*([a-f0-9-]{36})/gi) || [];
  const ids = matches
    .map((match) => {
      const capture = String(match).match(/([a-f0-9-]{36})/i);
      return capture ? capture[1].toLowerCase() : null;
    })
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function shouldFilterOnlyReferencedBatches(customRules = '', referencedBatchIds = []) {
  if (!referencedBatchIds.length) return false;
  const text = normalizeRuleText(customRules);
  return text.includes('somente lote')
    || text.includes('apenas lote')
    || text.includes('so lote')
    || text.includes('so pode ser alocado')
    || text.includes('so pode ser alocada')
    || text.includes('so podem ser alocados')
    || text.includes('so podem ser alocadas');
}

function shouldEnforceFemaleOnlyHousing(customRules = '') {
  const text = normalizeRuleText(customRules);
  return text.includes('somente meninas')
    || text.includes('apenas meninas')
    || text.includes('so meninas')
    || text.includes('lote meninas')
    || text.includes('meninas quarto');
}

function shouldExcludeMaleFromHousing(customRules = '') {
  const text = normalizeRuleText(customRules);
  const mentionsMale = text.includes('sexomasculino')
    || text.includes('sexo masculino')
    || text.includes('masculino')
    || text.includes('menino')
    || text.includes('meninos');
  const mentionsExclusion = text.includes('nao vai ficar no quarto')
    || text.includes('nao fica no quarto')
    || text.includes('nao ficar no quarto')
    || text.includes('nao vai para o quarto')
    || text.includes('nao alocar')
    || text.includes('nao pode alocar')
    || text.includes('nao deve alocar')
    || text.includes('nao incluir');
  return mentionsMale && mentionsExclusion;
}

function shouldSequentialFillRooms(customRules = '') {
  const text = normalizeRuleText(customRules);
  return text.includes('so vai para o outro quarto quando completar o quarto atual')
    || text.includes('preencher o quarto atual')
    || text.includes('completar o quarto atual')
    || text.includes('só vai para o outro quarto quando completar o quarto atual');
}

function shouldEnforceLeaderGroupingRule(customRules = '') {
  const text = normalizeRuleText(customRules);
  if (!text) return false;
  if (text.includes('regra 5')) return true;

  const mentionsLeader = text.includes('lider');
  if (!mentionsLeader) return false;

  return text.includes('agrupar')
    || text.includes('juntar')
    || text.includes('juntos')
    || text.includes('mesmo quarto')
    || text.includes('nao separar')
    || text.includes('nao dividir');
}

function attendeeIsMale(attendee = {}) {
  const byFlag = normalizeBooleanLike(
    attendee?.camposDinamicos?.['attendeeData.sexoMasculino']
    ?? attendee?.camposDinamicos?.['attendeeData.sexo_masculino']
  );
  if (byFlag === true) return true;
  if (byFlag === false) return false;
  return attendee?.sexo === 'M';
}

function applyHousingRulePreFilters(attendees = [], customRules = '') {
  const warnings = [];
  let filteredAttendees = [...attendees];
  const sequentialFill = shouldSequentialFillRooms(customRules);
  const referencedBatchIds = extractReferencedBatchIds(customRules);

  if (shouldFilterOnlyReferencedBatches(customRules, referencedBatchIds)) {
    const allowedBatches = new Set(referencedBatchIds.map((batchId) => String(batchId).toLowerCase()));
    const beforeCount = filteredAttendees.length;
    filteredAttendees = filteredAttendees.filter((attendee) => {
      const batchId = String(attendee?.eventBatchData?.id || '').toLowerCase();
      return batchId && allowedBatches.has(batchId);
    });
    const removed = beforeCount - filteredAttendees.length;
    warnings.push(`Regra aplicada: lote(s) restrito(s) (${referencedBatchIds.join(', ')}); ${removed} inscrito(s) fora do lote removidos.`);
  }

  if (shouldEnforceFemaleOnlyHousing(customRules)) {
    const beforeCount = filteredAttendees.length;
    filteredAttendees = filteredAttendees.filter((attendee) => attendee?.sexo === 'F');
    const removed = beforeCount - filteredAttendees.length;
    if (removed > 0) {
      warnings.push(`Regra aplicada: somente meninas; ${removed} inscrito(s) removidos por sexo.`);
    }
  }

  if (shouldExcludeMaleFromHousing(customRules)) {
    const beforeCount = filteredAttendees.length;
    filteredAttendees = filteredAttendees.filter((attendee) => !attendeeIsMale(attendee));
    const removed = beforeCount - filteredAttendees.length;
    if (removed > 0) {
      warnings.push(`Regra aplicada: ${removed} inscrito(s) masculinos removidos da hospedagem.`);
    }
  }

  return {
    attendees: filteredAttendees,
    warnings,
    sequentialFill
  };
}

function sanitizeHousingAllocation(allocation, allowedAttendeesById, rooms = [], mapping = {}) {
  if (!Array.isArray(allocation)) {
    return {
      allocation: [],
      warnings: ['Resposta da IA invalida: allocation ausente ou fora do formato esperado.']
    };
  }

  const roomsById = new Map(rooms.map((room) => [String(room.id), room]));
  const seenAttendees = new Set();
  const slotCountByRoom = {};
  const sanitized = [];
  let duplicates = 0;
  let unknownAttendees = 0;
  let invalidRooms = 0;

  allocation.forEach((item) => {
    const attendeeId = String(item?.attendeeId || '');
    const roomId = String(item?.roomId || '');
    if (!attendeeId || !allowedAttendeesById.has(attendeeId)) {
      unknownAttendees += 1;
      return;
    }
    if (seenAttendees.has(attendeeId)) {
      duplicates += 1;
      return;
    }
    if (!roomId || !roomsById.has(roomId)) {
      invalidRooms += 1;
      return;
    }

    seenAttendees.add(attendeeId);
    const attendee = allowedAttendeesById.get(attendeeId);
    const room = roomsById.get(roomId);
    slotCountByRoom[roomId] = (slotCountByRoom[roomId] || 0) + 1;
    const fallbackSlotLabel = `${roomId}.${slotCountByRoom[roomId]}`;

    sanitized.push({
      attendeeId,
      nome: sanitizeAllocationValue(item?.nome) || attendee.nome,
      roomId,
      roomName: sanitizeAllocationValue(item?.roomName) || room.name,
      slotLabel: sanitizeAllocationValue(item?.slotLabel) || fallbackSlotLabel,
      idade: sanitizeAllocationValue(item?.idade)
        || sanitizeAllocationValue(attendee?.camposDinamicos?.['attendeeData.idade'])
        || sanitizeAllocationValue(attendee?.idade),
      lider_de_celula: sanitizeAllocationValue(item?.lider_de_celula)
        || sanitizeAllocationValue(getLeaderValueFromAttendee(attendee, mapping))
    });
  });

  const warnings = [];
  if (duplicates > 0) warnings.push(`IA retornou ${duplicates} inscrito(s) duplicado(s); duplicatas foram removidas.`);
  if (unknownAttendees > 0) warnings.push(`IA retornou ${unknownAttendees} item(ns) com inscrito invalido; itens ignorados.`);
  if (invalidRooms > 0) warnings.push(`IA retornou ${invalidRooms} item(ns) com quarto invalido; itens ignorados.`);
  const missingAttendees = Math.max(allowedAttendeesById.size - sanitized.length, 0);
  if (missingAttendees > 0) warnings.push(`IA retornou alocacao parcial: faltaram ${missingAttendees} inscrito(s) elegivel(is).`);

  return { allocation: sanitized, warnings };
}

function violatesLeaderHardRule(allocation = [], allowedAttendeesById = new Map(), leaderField = null) {
  if (!leaderField || !Array.isArray(allocation) || allocation.length === 0) return false;

  const roomIdsByLeader = new Map();
  return allocation.some((item) => {
    const attendeeId = String(item?.attendeeId || '');
    if (!attendeeId || !allowedAttendeesById.has(attendeeId)) return false;

    const attendee = allowedAttendeesById.get(attendeeId);
    const leaderValue = attendee?.camposDinamicos?.[leaderField];
    if (isLeaderException(leaderValue)) return false;

    const leaderKey = normalizeKey(leaderValue);
    if (!leaderKey) return false;

    const roomId = String(item?.roomId || '').trim();
    if (!roomId) return false;

    if (!roomIdsByLeader.has(leaderKey)) {
      roomIdsByLeader.set(leaderKey, new Set());
    }
    roomIdsByLeader.get(leaderKey).add(roomId);
    if (roomIdsByLeader.get(leaderKey).size > 1) {
      return true;
    }
    return false;
  });
}

function sanitizeTeamsAllocation(allocation, allowedAttendeesById, teams = []) {
  if (!Array.isArray(allocation)) {
    return {
      allocation: [],
      warnings: ['Resposta da IA invalida: allocation ausente ou fora do formato esperado.']
    };
  }

  const teamsById = new Map(teams.map((team) => [String(team.id), team]));
  const seenAttendees = new Set();
  const sanitized = [];
  let duplicates = 0;
  let unknownAttendees = 0;
  let invalidTeams = 0;

  allocation.forEach((item) => {
    const attendeeId = String(item?.attendeeId || '');
    const teamId = String(item?.teamId || '');
    if (!attendeeId || !allowedAttendeesById.has(attendeeId)) {
      unknownAttendees += 1;
      return;
    }
    if (seenAttendees.has(attendeeId)) {
      duplicates += 1;
      return;
    }
    if (!teamId || !teamsById.has(teamId)) {
      invalidTeams += 1;
      return;
    }

    seenAttendees.add(attendeeId);
    const attendee = allowedAttendeesById.get(attendeeId);
    const team = teamsById.get(teamId);
    sanitized.push({
      attendeeId,
      nome: sanitizeAllocationValue(item?.nome) || attendee.nome,
      teamId,
      teamName: sanitizeAllocationValue(item?.teamName) || team.name
    });
  });

  const warnings = [];
  if (duplicates > 0) warnings.push(`IA retornou ${duplicates} inscrito(s) duplicado(s); duplicatas foram removidas.`);
  if (unknownAttendees > 0) warnings.push(`IA retornou ${unknownAttendees} item(ns) com inscrito invalido; itens ignorados.`);
  if (invalidTeams > 0) warnings.push(`IA retornou ${invalidTeams} item(ns) com time invalido; itens ignorados.`);

  return { allocation: sanitized, warnings };
}

function extractReferencedFieldPaths(customRules = '') {
  const matches = String(customRules || '')
    .match(/\b(?:attendeeData|registration|registrationAttendee|eventBatch)\.[a-zA-Z0-9_]+\b/g);
  return new Set((matches || []).map((match) => String(match).trim()));
}

function sanitizePromptValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return null;
    return normalized.slice(0, MAX_PROMPT_FIELD_STRING);
  }
  if (Array.isArray(value)) {
    const sanitized = value
      .map((item) => sanitizePromptValue(item))
      .filter((item) => item !== null)
      .slice(0, 3);
    return sanitized.length ? sanitized : null;
  }
  return null;
}

function buildPromptFieldSelection(availableFields = [], customRules = '') {
  const referenced = extractReferencedFieldPaths(customRules);
  const prioritized = new Set([...ALWAYS_INCLUDED_PROMPT_FIELDS, ...referenced]);
  const prioritizedFields = availableFields.filter((field) => prioritized.has(field));
  const remainingFields = availableFields
    .filter((field) => !prioritized.has(field))
    .slice(0, MAX_PROMPT_FIELDS_WITHOUT_REFERENCE);
  const selectedFields = prioritizedFields.length
    ? [...prioritizedFields, ...remainingFields]
    : availableFields.slice(0, MAX_PROMPT_FIELDS_WITHOUT_REFERENCE);

  return {
    selectedFields,
    omittedCount: Math.max(availableFields.length - selectedFields.length, 0)
  };
}

function buildCompactPromptAttendees(attendees = [], selectedFields = []) {
  return attendees.map((attendee) => {
    const compact = {
      id: attendee.id,
      nome: sanitizePromptValue(attendee.nome),
      registrationId: attendee.registrationId,
      sexo: sanitizePromptValue(attendee.sexo),
      idade: sanitizePromptValue(attendee.idade)
    };

    const fields = {};
    selectedFields.forEach((fieldPath) => {
      const rawValue = attendee.camposDinamicos?.[fieldPath];
      const sanitizedValue = sanitizePromptValue(rawValue);
      if (sanitizedValue !== null) {
        fields[fieldPath] = sanitizedValue;
      }
    });

    if (Object.keys(fields).length > 0) {
      compact.campos = fields;
    }

    return compact;
  });
}

function reducePromptAttendeesIfNeeded(attendees = []) {
  const withBatchAndStatus = attendees.map((attendee) => ({
    id: attendee.id,
    nome: sanitizePromptValue(attendee.nome),
    registrationId: attendee.registrationId,
    sexo: sanitizePromptValue(attendee.sexo),
    idade: sanitizePromptValue(attendee.idade),
    eventBatchId: sanitizePromptValue(attendee.eventBatchData?.id),
    eventBatchName: sanitizePromptValue(attendee.eventBatchData?.name),
    registrationPaymentStatus: sanitizePromptValue(attendee.registrationData?.paymentStatus)
  }));

  if (JSON.stringify(withBatchAndStatus).length <= MAX_PROMPT_CHARS) {
    return withBatchAndStatus;
  }

  return attendees.map((attendee) => ({
    id: attendee.id,
    registrationId: attendee.registrationId,
    sexo: sanitizePromptValue(attendee.sexo),
    idade: sanitizePromptValue(attendee.idade),
    eventBatchId: sanitizePromptValue(attendee.eventBatchData?.id)
  }));
}

function getOpenAIErrorMessage(error) {
  if (error?.response?.data?.error?.message) {
    return String(error.response.data.error.message);
  }
  if (error?.response?.status) {
    return `erro HTTP ${error.response.status}`;
  }
  if (error?.code) {
    return `erro de rede (${error.code})`;
  }
  return error?.message || 'falha desconhecida';
}

function sortByName(left, right) {
  return String(left.nome || '').localeCompare(String(right.nome || ''), 'pt-BR', { sensitivity: 'base' });
}

function groupByRegistration(attendees = []) {
  const grouped = attendees.reduce((acc, attendee) => {
    const key = attendee.registrationId || attendee.id;
    if (!acc[key]) {
      acc[key] = {
        registrationId: key,
        members: []
      };
    }
    acc[key].members.push(attendee);
    return acc;
  }, {});

  return Object.values(grouped).map((group) => {
    const maleCount = group.members.filter((member) => member.sexo === 'M').length;
    const femaleCount = group.members.filter((member) => member.sexo === 'F').length;
    const knownSexCount = maleCount + femaleCount;
    const idadeValues = group.members
      .map((member) => Number(member.idade))
      .filter((value) => Number.isFinite(value) && value >= 0);

    let sexo = 'U';
    if (knownSexCount === group.members.length) {
      if (maleCount === group.members.length) sexo = 'M';
      if (femaleCount === group.members.length) sexo = 'F';
    }

    return {
      ...group,
      size: group.members.length,
      sexo,
      maleCount,
      femaleCount,
      idadeMedia: idadeValues.length
        ? Number((idadeValues.reduce((sum, age) => sum + age, 0) / idadeValues.length).toFixed(2))
        : null
    };
  });
}

function sanitizeRooms(rooms = []) {
  if (!Array.isArray(rooms)) return [];
  return rooms
    .map((room, index) => {
      const capacity = toPositiveInt(room?.capacity, 0);
      if (capacity <= 0) return null;
      const roomId = room?.id ? String(room.id) : String(index + 1);
      const roomName = room?.name ? String(room.name) : `Quarto ${roomId}`;
      return {
        id: roomId,
        name: roomName,
        capacity
      };
    })
    .filter(Boolean);
}

async function requestOpenAIJson(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY nao configurada');
  }

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192,
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const content = response?.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('resposta vazia da OpenAI');
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`falha ao parsear JSON da OpenAI: ${error.message}`);
  }
}

function buildHousingFallback(rawAttendees, rooms, customRules = '', options = {}) {
  const allowedIds = options.allowedAttendeeIds || null;
  const sequentialFill = options.sequentialFill || false;
  const attendees = normalizeAttendees(rawAttendees)
    .filter((attendee) => !allowedIds || allowedIds.has(attendee.id));
  const normalizedRooms = sanitizeRooms(rooms);
  const groups = groupByRegistration(attendees).sort((left, right) => (
    right.size - left.size
    || String(left.registrationId).localeCompare(String(right.registrationId), 'pt-BR', { numeric: true })
  ));

  const roomStates = normalizedRooms.map((room) => ({
    roomId: String(room.id),
    roomName: room.name,
    capacity: room.capacity,
    remaining: room.capacity,
    currentSlot: 0,
    sexoHint: null,
    occupants: []
  }));

  const warnings = [];
  const notAllocated = [];
  const maxRoomCapacity = roomStates.reduce((max, room) => Math.max(max, room.capacity), 0);

  const roomAcceptsGroupBySexo = (room, group) => {
    if (!room.sexoHint || room.sexoHint === 'U' || group.sexo === 'U') return true;
    return room.sexoHint === group.sexo;
  };

  const pickRoomForGroup = (group) => {
    if (sequentialFill) {
      return roomStates.find((room) => (
        room.remaining >= group.size && roomAcceptsGroupBySexo(room, group)
      )) || null;
    }

    const candidates = roomStates
      .filter((room) => room.remaining >= group.size)
      .map((room) => {
        const remainingAfter = room.remaining - group.size;
        let sexoScore = 0;
        if (!room.sexoHint || room.sexoHint === 'U' || group.sexo === 'U') {
          sexoScore = 1;
        }
        if (room.sexoHint === group.sexo && group.sexo !== 'U') {
          sexoScore = 2;
        }
        return {
          room,
          remainingAfter,
          sexoScore
        };
      })
      .sort((left, right) => (
        right.sexoScore - left.sexoScore
        || left.remainingAfter - right.remainingAfter
        || String(left.room.roomId).localeCompare(String(right.room.roomId), 'pt-BR', { numeric: true })
      ));

    return candidates[0]?.room || null;
  };

  const allocateSingleMember = (member) => {
    const singleGroup = {
      size: 1,
      sexo: member.sexo
    };
    const room = pickRoomForGroup(singleGroup);
    if (!room) {
      notAllocated.push(member);
      return;
    }
    room.currentSlot += 1;
    room.occupants.push({
      ...member,
      slotLabel: `${room.roomId}.${room.currentSlot}`
    });
    room.remaining -= 1;
    if (!room.sexoHint && member.sexo) {
      room.sexoHint = member.sexo;
    } else if (room.sexoHint && room.sexoHint !== member.sexo && member.sexo) {
      room.sexoHint = 'U';
    }
  };

  groups.forEach((group) => {
    const room = pickRoomForGroup(group);
    if (!room) {
      if (group.size > maxRoomCapacity || roomStates.some((state) => state.remaining > 0)) {
        const sortedMembers = [...group.members].sort(sortByName);
        sortedMembers.forEach((member) => allocateSingleMember(member));
        warnings.push(`Grupo da inscricao ${group.registrationId} foi dividido por restricao de capacidade.`);
      } else {
        notAllocated.push(...group.members);
      }
      return;
    }

    const sortedMembers = [...group.members].sort(sortByName);
    sortedMembers.forEach((member) => {
      room.currentSlot += 1;
      room.occupants.push({
        ...member,
        slotLabel: `${room.roomId}.${room.currentSlot}`
      });
    });

    room.remaining -= group.size;
    if (!room.sexoHint) {
      room.sexoHint = group.sexo;
    } else if (room.sexoHint !== group.sexo && group.sexo !== 'U') {
      room.sexoHint = 'U';
    }
  });

  if (notAllocated.length > 0) {
    warnings.push(`Sem vagas para ${notAllocated.length} inscrito(s).`);
  }

  roomStates.forEach((room) => {
    const hasMale = room.occupants.some((member) => member.sexo === 'M');
    const hasFemale = room.occupants.some((member) => member.sexo === 'F');
    if (hasMale && hasFemale) {
      warnings.push(`Quarto "${room.roomName}" ficou misto por restricao de vagas.`);
    }
  });

  const allocation = roomStates.flatMap((room) => (
    room.occupants
      .sort((left, right) => String(left.slotLabel).localeCompare(String(right.slotLabel), 'pt-BR', { numeric: true }))
      .map((member) => ({
        attendeeId: member.id,
        nome: member.nome,
        roomId: room.roomId,
        roomName: room.roomName,
        slotLabel: member.slotLabel,
        idade: sanitizeAllocationValue(member?.camposDinamicos?.['attendeeData.idade'])
          || sanitizeAllocationValue(member?.idade),
        lider_de_celula: sanitizeAllocationValue(member?.camposDinamicos?.['attendeeData.lider_de_celula'])
      }))
  ));

  const reasoning = [
    'Alocacao gerada com algoritmo local.',
    'Grupos da mesma compra foram mantidos juntos e aplicado melhor encaixe por capacidade.'
  ];
  if (customRules) {
    reasoning.push('Regras livres foram registradas, mas sem interpretacao por IA neste fallback.');
  }

  return {
    allocation,
    warnings,
    reasoning: reasoning.join(' ')
  };
}

function inferGroupSexoHint(members = []) {
  const known = members
    .map((member) => member?.sexo)
    .filter((sexo) => sexo === 'M' || sexo === 'F');
  if (!known.length) return 'U';
  const first = known[0];
  return known.every((sexo) => sexo === first) ? first : 'U';
}

function buildHousingFallbackByLeaderBlocks(rawAttendees, rooms, customRules = '', options = {}, mapping = {}) {
  const allowedIds = options.allowedAttendeeIds || null;
  const sequentialFill = options.sequentialFill || false;
  const attendees = normalizeAttendees(rawAttendees)
    .filter((attendee) => !allowedIds || allowedIds.has(attendee.id));
  const normalizedRooms = sanitizeRooms(rooms);

  const roomStates = normalizedRooms.map((room) => ({
    roomId: String(room.id),
    roomName: room.name,
    capacity: room.capacity,
    remaining: room.capacity,
    currentSlot: 0,
    sexoHint: null,
    occupants: []
  }));

  const roomAcceptsGroupBySexo = (room, groupSexo) => {
    if (!room.sexoHint || room.sexoHint === 'U' || groupSexo === 'U') return true;
    return room.sexoHint === groupSexo;
  };

  const pickRoomForBlock = (size, groupSexo) => {
    const candidates = roomStates.filter((room) => (
      room.remaining >= size && roomAcceptsGroupBySexo(room, groupSexo)
    ));
    if (!candidates.length) return null;

    if (sequentialFill) return candidates[0];

    const ranked = candidates
      .map((room) => {
        const remainingAfter = room.remaining - size;
        let sexoScore = 0;
        if (!room.sexoHint || room.sexoHint === 'U' || groupSexo === 'U') sexoScore = 1;
        if (room.sexoHint === groupSexo && groupSexo !== 'U') sexoScore = 2;
        return { room, remainingAfter, sexoScore };
      })
      .sort((left, right) => (
        right.sexoScore - left.sexoScore
        || left.remainingAfter - right.remainingAfter
        || String(left.room.roomId).localeCompare(String(right.room.roomId), 'pt-BR', { numeric: true })
      ));

    return ranked[0]?.room || null;
  };

  const allocateMembersToRoom = (room, members = []) => {
    const targetRoom = room;
    const sorted = [...members].sort(sortByName);
    sorted.forEach((member) => {
      targetRoom.currentSlot += 1;
      targetRoom.occupants.push({
        ...member,
        slotLabel: `${targetRoom.roomId}.${targetRoom.currentSlot}`
      });
    });
    targetRoom.remaining -= sorted.length;

    const blockSexo = inferGroupSexoHint(sorted);
    if (!targetRoom.sexoHint) {
      targetRoom.sexoHint = blockSexo;
    } else if (targetRoom.sexoHint !== blockSexo && blockSexo !== 'U') {
      targetRoom.sexoHint = 'U';
    }
  };

  const leaderGroupsMap = new Map();
  const singles = [];
  attendees.forEach((attendee) => {
    const leaderValue = getLeaderValueFromAttendee(attendee, mapping);
    if (isLeaderException(leaderValue)) {
      singles.push(attendee);
      return;
    }
    const leaderKey = normalizeKey(leaderValue);
    if (!leaderKey) {
      singles.push(attendee);
      return;
    }
    if (!leaderGroupsMap.has(leaderKey)) {
      leaderGroupsMap.set(leaderKey, []);
    }
    leaderGroupsMap.get(leaderKey).push(attendee);
  });

  const leaderGroups = Array.from(leaderGroupsMap.entries())
    .map(([leaderKey, members]) => ({
      leaderKey,
      members,
      size: members.length,
      sexo: inferGroupSexoHint(members)
    }))
    .sort((left, right) => (
      right.size - left.size
      || left.leaderKey.localeCompare(right.leaderKey, 'pt-BR', { sensitivity: 'base' })
    ));

  const notAllocated = [];
  leaderGroups.forEach((group) => {
    const room = pickRoomForBlock(group.size, group.sexo);
    if (!room) {
      notAllocated.push(...group.members);
      return;
    }
    allocateMembersToRoom(room, group.members);
  });

  const singlesSorted = [...singles].sort(sortByName);
  singlesSorted.forEach((single) => {
    const room = pickRoomForBlock(1, single.sexo || 'U');
    if (!room) {
      notAllocated.push(single);
      return;
    }
    allocateMembersToRoom(room, [single]);
  });

  const warnings = ['Fallback lider (hard) aplicado'];
  if (notAllocated.length > 0) {
    warnings.push(`Sem vagas para ${notAllocated.length} inscrito(s).`);
  }

  const allocation = roomStates.flatMap((room) => (
    room.occupants
      .sort((left, right) => String(left.slotLabel).localeCompare(String(right.slotLabel), 'pt-BR', { numeric: true }))
      .map((member) => ({
        attendeeId: member.id,
        nome: member.nome,
        roomId: room.roomId,
        roomName: room.roomName,
        slotLabel: member.slotLabel,
        idade: sanitizeAllocationValue(member?.camposDinamicos?.['attendeeData.idade'])
          || sanitizeAllocationValue(member?.idade),
        lider_de_celula: sanitizeAllocationValue(getLeaderValueFromAttendee(member, mapping))
      }))
  ));

  const reasoning = [
    'Alocacao gerada com algoritmo local.',
    'Regra de lider aplicada como bloco indivisivel por quarto.'
  ];
  if (customRules) {
    reasoning.push('Regras livres foram registradas, mas sem interpretacao por IA neste fallback.');
  }

  return {
    allocation,
    warnings,
    reasoning: reasoning.join(' ')
  };
}

function buildTeamsFallback(rawAttendees, teamsConfig, customRules = '') {
  const attendees = normalizeAttendees(rawAttendees);
  const groups = groupByRegistration(attendees).sort((left, right) => (
    right.size - left.size
    || String(left.registrationId).localeCompare(String(right.registrationId), 'pt-BR', { numeric: true })
  ));

  const teamsCount = Math.max(toPositiveInt(teamsConfig?.teamsCount, 2), 2);
  const requestedPlayersPerTeam = toPositiveInt(teamsConfig?.playersPerTeam, 0);
  const teamNames = Array.isArray(teamsConfig?.teamNames) ? teamsConfig.teamNames : [];
  const computedMaxPlayers = requestedPlayersPerTeam > 0
    ? requestedPlayersPerTeam
    : Math.max(Math.ceil(attendees.length / teamsCount), 1);

  const teams = Array.from({ length: teamsCount }, (_item, index) => ({
    teamId: String(index + 1),
    teamName: teamNames[index] || `Time ${index + 1}`,
    maxPlayers: computedMaxPlayers,
    members: [],
    maleCount: 0,
    femaleCount: 0,
    ageSum: 0,
    ageCount: 0
  }));

  let exceededConfiguredLimit = false;

  const pickTeamForGroup = (group) => {
    const fittingTeams = teams.filter((team) => team.members.length + group.size <= team.maxPlayers);
    const candidates = fittingTeams.length ? fittingTeams : teams;
    if (!fittingTeams.length && requestedPlayersPerTeam > 0) {
      exceededConfiguredLimit = true;
    }

    const ranked = candidates
      .map((team) => {
        const sizeAfter = team.members.length + group.size;
        const maleAfter = team.maleCount + group.maleCount;
        const femaleAfter = team.femaleCount + group.femaleCount;
        const imbalanceAfter = Math.abs(maleAfter - femaleAfter);
        return {
          team,
          sizeAfter,
          imbalanceAfter
        };
      })
      .sort((left, right) => (
        left.sizeAfter - right.sizeAfter
        || left.imbalanceAfter - right.imbalanceAfter
        || String(left.team.teamId).localeCompare(String(right.team.teamId), 'pt-BR', { numeric: true })
      ));

    return ranked[0].team;
  };

  groups.forEach((group) => {
    const team = pickTeamForGroup(group);
    const sortedMembers = [...group.members].sort(sortByName);
    sortedMembers.forEach((member) => {
      team.members.push(member);
      if (member.sexo === 'M') team.maleCount += 1;
      if (member.sexo === 'F') team.femaleCount += 1;
      if (Number.isFinite(member.idade)) {
        team.ageSum += Number(member.idade);
        team.ageCount += 1;
      }
    });
  });

  const warnings = [];
  if (exceededConfiguredLimit) {
    warnings.push('Quantidade por time foi extrapolada para acomodar todos os inscritos.');
  }

  const allocation = teams.flatMap((team) => (
    team.members.map((member) => ({
      attendeeId: member.id,
      nome: member.nome,
      teamId: team.teamId,
      teamName: team.teamName
    }))
  ));

  const teamsSummary = teams.map((team) => ({
    teamId: team.teamId,
    teamName: team.teamName,
    total: team.members.length,
    masculino: team.maleCount,
    feminino: team.femaleCount,
    idadeMedia: team.ageCount > 0 ? Number((team.ageSum / team.ageCount).toFixed(1)) : null
  }));

  const reasoning = [
    'Divisao gerada com algoritmo local.',
    'Grupos da mesma compra foram mantidos no mesmo time e equilibrados por tamanho.'
  ];
  if (customRules) {
    reasoning.push('Regras livres foram registradas, mas sem interpretacao por IA neste fallback.');
  }

  return {
    allocation,
    teamsSummary,
    warnings,
    reasoning: reasoning.join(' ')
  };
}

function buildHousingPrompt(attendees, roomsExpanded, availableFields, customRules, totalSlots, omittedFieldsCount = 0) {
  return `Voce e um sistema de alocacao de hospedagem para eventos.

## Estrutura de quartos
${JSON.stringify(roomsExpanded, null, 2)}

Total de vagas: ${totalSlots}
Total de inscritos: ${attendees.length}
${attendees.length > totalSlots ? `ATENCAO: existem mais inscritos (${attendees.length}) que vagas (${totalSlots}). Aloque o maximo possivel e liste faltas em warnings.` : ''}

## Campos disponiveis nos inscritos
${availableFields.join(', ')}
${omittedFieldsCount > 0 ? `\n(Foram omitidos ${omittedFieldsCount} campos menos relevantes para reduzir tamanho do prompt.)` : ''}

## Regras obrigatorias

1. Slot de cama no formato roomId.numero (ex: 1.1, 1.2, 2.1).
2. Só pode pessoas no mesmo sexo no quarto.

## Regras adicionais
${customRules || 'Nenhuma regra adicional.'}

## Inscritos
${JSON.stringify(attendees, null, 2)}

## Formato de saida JSON
{
  "allocation": [
    {
      "attendeeId": "uuid",
      "nome": "Nome",
      "roomId": "1",
      "roomName": "Quarto 1",
      "slotLabel": "1.1"
    }
  ],
  "warnings": ["texto"],
  "reasoning": "texto"
}`;
}

function buildTeamsPrompt(attendees, times, availableFields, customRules, omittedFieldsCount = 0) {
  return `Voce e um sistema de divisao equilibrada de times para eventos.

## Configuracao de times
${JSON.stringify(times, null, 2)}

Total de inscritos: ${attendees.length}

## Campos disponiveis nos inscritos
${availableFields.join(', ')}
${omittedFieldsCount > 0 ? `\n(Foram omitidos ${omittedFieldsCount} campos menos relevantes para reduzir tamanho do prompt.)` : ''}

## Regras obrigatorias (ordem de prioridade)
1. Pessoas com o mesmo registrationId ficam no mesmo time.
2. Equilibrar sexo entre os times.
3. Equilibrar faixa etaria entre os times.
4. Deixar os times com tamanhos parecidos.

## Regras adicionais
${customRules || 'Nenhuma regra adicional.'}

## Inscritos
${JSON.stringify(attendees, null, 2)}

## Formato de saida JSON
{
  "allocation": [
    {
      "attendeeId": "uuid",
      "nome": "Nome",
      "teamId": "1",
      "teamName": "Time 1"
    }
  ],
  "teamsSummary": [
    {
      "teamId": "1",
      "teamName": "Time 1",
      "total": 10,
      "masculino": 5,
      "feminino": 5,
      "idadeMedia": 22.3
    }
  ],
  "warnings": ["texto"],
  "reasoning": "texto"
}`;
}

async function generateHousingAllocation(rawAttendees, rooms, customRules = '') {
  const normalizedAttendees = normalizeAttendees(rawAttendees);
  const preFilterResult = applyHousingRulePreFilters(normalizedAttendees, customRules);
  const filteredAttendees = preFilterResult.attendees;
  const allowedAttendeeIds = new Set(filteredAttendees.map((attendee) => attendee.id));
  const allowedAttendeesById = new Map(filteredAttendees.map((attendee) => [attendee.id, attendee]));
  const availableFields = extractAvailableFields(rawAttendees);
  const mapping = inferFieldMappingFromAvailableFields(availableFields, customRules);
  const leaderHardEnabled = Boolean(mapping.leaderField && shouldEnforceLeaderGroupingRule(customRules));
  const fieldSelection = buildPromptFieldSelection(availableFields, customRules);
  const normalizedRooms = sanitizeRooms(rooms);

  if (!normalizedRooms.length) {
    throw new Error('Nenhum quarto valido configurado');
  }

  let promptAttendees = buildCompactPromptAttendees(filteredAttendees, fieldSelection.selectedFields);
  if (JSON.stringify(promptAttendees).length > MAX_PROMPT_CHARS) {
    promptAttendees = reducePromptAttendeesIfNeeded(filteredAttendees);
  }

  const roomsExpanded = normalizedRooms.map((room) => ({
    ...room,
    totalSlots: room.capacity,
    slots: Array.from({ length: room.capacity }, (_item, index) => ({
      slotLabel: `${room.id}.${index + 1}`
    }))
  }));
  const totalSlots = normalizedRooms.reduce((sum, room) => sum + room.capacity, 0);
  const prompt = buildHousingPrompt(
    promptAttendees,
    roomsExpanded,
    fieldSelection.selectedFields,
    customRules,
    totalSlots,
    fieldSelection.omittedCount
  );

  const buildFallbackResult = () => {
    if (leaderHardEnabled) {
      return buildHousingFallbackByLeaderBlocks(rawAttendees, normalizedRooms, customRules, {
        sequentialFill: preFilterResult.sequentialFill,
        allowedAttendeeIds
      }, mapping);
    }
    return buildHousingFallback(rawAttendees, normalizedRooms, customRules, {
      sequentialFill: preFilterResult.sequentialFill,
      allowedAttendeeIds
    });
  };

  try {
    const llmResult = await requestOpenAIJson(prompt);
    if (!llmResult || !Array.isArray(llmResult.allocation)) {
      throw new Error('resposta da IA sem allocation');
    }
    const sanitizedAllocation = sanitizeHousingAllocation(
      llmResult.allocation,
      allowedAttendeesById,
      normalizedRooms,
      mapping
    );
    if (leaderHardEnabled && violatesLeaderHardRule(
      sanitizedAllocation.allocation,
      allowedAttendeesById,
      mapping.leaderField
    )) {
      const fallbackByLeader = buildHousingFallbackByLeaderBlocks(rawAttendees, normalizedRooms, customRules, {
        sequentialFill: preFilterResult.sequentialFill,
        allowedAttendeeIds
      }, mapping);
      return {
        allocation: fallbackByLeader.allocation,
        warnings: [
          ...preFilterResult.warnings,
          ...sanitizeWarnings(llmResult.warnings),
          ...sanitizedAllocation.warnings,
          'Regra 5 violada pela IA; alocacao corrigida por algoritmo local (lider como bloco).',
          ...fallbackByLeader.warnings
        ],
        reasoning: `${sanitizeText(llmResult.reasoning)} Resultado final ajustado por algoritmo local para garantir regra de lider.`
      };
    }

    const expectedAllocations = Math.min(filteredAttendees.length, totalSlots);
    const llmCoverage = sanitizedAllocation.allocation.length;
    const shouldUseFallbackToComplete = llmCoverage < expectedAllocations;

    if (shouldUseFallbackToComplete) {
      const fallback = buildFallbackResult();

      if (fallback.allocation.length > llmCoverage) {
        return {
          allocation: fallback.allocation,
          warnings: [
            ...preFilterResult.warnings,
            ...sanitizeWarnings(llmResult.warnings),
            ...sanitizedAllocation.warnings,
            `IA retornou cobertura insuficiente (${llmCoverage}/${expectedAllocations}); alocacao substituida por algoritmo local.`,
            ...fallback.warnings
          ],
          reasoning: `${sanitizeText(llmResult.reasoning)} Resultado final ajustado por algoritmo local para maximizar cobertura.`
        };
      }
    }

    return {
      allocation: sanitizedAllocation.allocation,
      warnings: [
        ...preFilterResult.warnings,
        ...sanitizeWarnings(llmResult.warnings),
        ...sanitizedAllocation.warnings
      ],
      reasoning: sanitizeText(llmResult.reasoning)
    };
  } catch (error) {
    const fallback = buildFallbackResult();
    return {
      ...fallback,
      warnings: [
        ...preFilterResult.warnings,
        `IA indisponivel (${getOpenAIErrorMessage(error)}). Resultado gerado por algoritmo local.`,
        ...fallback.warnings
      ]
    };
  }
}

async function generateTeamsAllocation(rawAttendees, teamsConfig, customRules = '') {
  const normalizedAttendees = normalizeAttendees(rawAttendees);
  const allowedAttendeesById = new Map(normalizedAttendees.map((attendee) => [attendee.id, attendee]));
  const availableFields = extractAvailableFields(rawAttendees);
  const fieldSelection = buildPromptFieldSelection(availableFields, customRules);
  const teamsCount = Math.max(toPositiveInt(teamsConfig?.teamsCount, 2), 2);
  const playersPerTeam = toPositiveInt(teamsConfig?.playersPerTeam, 0);
  const teamNames = Array.isArray(teamsConfig?.teamNames) ? teamsConfig.teamNames : [];
  let promptAttendees = buildCompactPromptAttendees(normalizedAttendees, fieldSelection.selectedFields);
  if (JSON.stringify(promptAttendees).length > MAX_PROMPT_CHARS) {
    promptAttendees = reducePromptAttendeesIfNeeded(normalizedAttendees);
  }
  const times = Array.from({ length: teamsCount }, (_item, index) => ({
    id: String(index + 1),
    name: teamNames[index] || `Time ${index + 1}`,
    maxPlayers: playersPerTeam || Math.max(Math.ceil(normalizedAttendees.length / teamsCount), 1)
  }));
  const prompt = buildTeamsPrompt(
    promptAttendees,
    times,
    fieldSelection.selectedFields,
    customRules,
    fieldSelection.omittedCount
  );

  try {
    const llmResult = await requestOpenAIJson(prompt);
    if (!llmResult || !Array.isArray(llmResult.allocation)) {
      throw new Error('resposta da IA sem allocation');
    }
    const sanitizedAllocation = sanitizeTeamsAllocation(llmResult.allocation, allowedAttendeesById, times);
    return {
      allocation: sanitizedAllocation.allocation,
      teamsSummary: Array.isArray(llmResult.teamsSummary) ? llmResult.teamsSummary : [],
      warnings: [
        ...sanitizeWarnings(llmResult.warnings),
        ...sanitizedAllocation.warnings
      ],
      reasoning: sanitizeText(llmResult.reasoning)
    };
  } catch (error) {
    const fallback = buildTeamsFallback(rawAttendees, teamsConfig, customRules);
    return {
      ...fallback,
      warnings: [
        `IA indisponivel (${getOpenAIErrorMessage(error)}). Resultado gerado por algoritmo local.`,
        ...fallback.warnings
      ]
    };
  }
}

module.exports = {
  generateHousingAllocation,
  generateTeamsAllocation,
  normalizeAttendees,
  extractAvailableFields,
  normalizeKey,
  isLeaderException,
  inferFieldMappingFromAvailableFields,
  violatesLeaderHardRule,
  buildHousingFallbackByLeaderBlocks,
  shouldEnforceLeaderGroupingRule
};
