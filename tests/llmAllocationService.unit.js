const assert = require('assert');

const {
  normalizeAttendees,
  inferFieldMappingFromAvailableFields,
  normalizeKey,
  violatesLeaderHardRule,
  buildHousingFallbackByLeaderBlocks,
  shouldEnforceLeaderGroupingRule
} = require('../server/services/llmAllocationService');

function testInferLeaderFieldViaAvailableFields() {
  const availableFields = [
    'attendeeData.nome_completo',
    'attendeeData.lider_de_celula',
    'attendeeData.convidado',
    'attendeeData.quem_te_convidou',
    'registration.orderCode'
  ];
  const mapping = inferFieldMappingFromAvailableFields(availableFields, '');
  assert.strictEqual(mapping.leaderField, 'attendeeData.lider_de_celula');
  assert.strictEqual(mapping.nameField, 'attendeeData.nome_completo');
  assert.strictEqual(mapping.guestField, 'attendeeData.convidado');
  assert.strictEqual(mapping.invitedByField, 'attendeeData.quem_te_convidou');
}

function testDetectLeaderViolationAcrossRooms() {
  const rawAttendees = [
    {
      id: 'a1', registrationId: 'r1', attendeeNumber: 1, attendeeData: { nome: 'Ana', lider_de_celula: 'Lider A' }
    },
    {
      id: 'a2', registrationId: 'r2', attendeeNumber: 1, attendeeData: { nome: 'Bia', lider_de_celula: 'Lider A' }
    }
  ];
  const normalized = normalizeAttendees(rawAttendees);
  const byId = new Map(normalized.map((attendee) => [attendee.id, attendee]));
  const allocation = [
    { attendeeId: 'a1', roomId: '1' },
    { attendeeId: 'a2', roomId: '2' }
  ];
  assert.strictEqual(
    violatesLeaderHardRule(allocation, byId, 'attendeeData.lider_de_celula'),
    true
  );
}

function testFallbackByLeaderBlocksKeepsLeaderTogether() {
  const rawAttendees = [
    {
      id: 'a1', registrationId: 'r1', attendeeNumber: 1, attendeeData: { nome: 'Ana', idade: 20, minha_lideranca: 'Lider A' }
    },
    {
      id: 'a2', registrationId: 'r2', attendeeNumber: 1, attendeeData: { nome: 'Bruna', idade: 21, minha_lideranca: 'Lider A' }
    },
    {
      id: 'a3', registrationId: 'r3', attendeeNumber: 1, attendeeData: { nome: 'Carla', idade: 19, minha_lideranca: 'Lider B' }
    },
    {
      id: 'a4', registrationId: 'r4', attendeeNumber: 1, attendeeData: { nome: 'Dani', idade: 22, minha_lideranca: 'NAO TENHO' }
    }
  ];
  const rooms = [
    { id: '1', name: 'Quarto 1', capacity: 2 },
    { id: '2', name: 'Quarto 2', capacity: 2 }
  ];
  const mapping = { leaderField: 'attendeeData.minha_lideranca' };
  const result = buildHousingFallbackByLeaderBlocks(rawAttendees, rooms, '', {}, mapping);

  const leaderARooms = new Set(
    result.allocation
      .filter((item) => normalizeKey(item.lider_de_celula) === 'LIDER A')
      .map((item) => item.roomId)
  );
  assert.strictEqual(leaderARooms.size, 1);
  assert.ok(result.warnings.includes('Fallback lider (hard) aplicado'));

  const normalized = normalizeAttendees(rawAttendees);
  const byId = new Map(normalized.map((attendee) => [attendee.id, attendee]));
  assert.strictEqual(
    violatesLeaderHardRule(result.allocation, byId, mapping.leaderField),
    false
  );
}

function testLeaderHardRuleOnlyWhenCustomRuleIsWritten() {
  assert.strictEqual(
    shouldEnforceLeaderGroupingRule(''),
    false
  );
  assert.strictEqual(
    shouldEnforceLeaderGroupingRule('Separar por idade e cidade'),
    false
  );
  assert.strictEqual(
    shouldEnforceLeaderGroupingRule('Agrupar juntos por lider de celula no mesmo quarto'),
    true
  );
}

function run() {
  testInferLeaderFieldViaAvailableFields();
  testDetectLeaderViolationAcrossRooms();
  testFallbackByLeaderBlocksKeepsLeaderTogether();
  testLeaderHardRuleOnlyWhenCustomRuleIsWritten();
  console.log('llmAllocationService.unit.js: all tests passed');
}

if (require.main === module) {
  run();
}

module.exports = {
  run
};
