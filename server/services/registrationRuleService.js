'use strict';

const { EventRegistrationRule, FormField } = require('../models');

// ─── Operadores suportados ────────────────────────────────────────────────────

/**
 * Calcula a idade completa em anos a partir de uma string de data de nascimento.
 * Aceita formatos: "YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss.sssZ"
 * Retorna null se não conseguir parsear.
 */
function calcularIdade(valorData) {
  if (!valorData) return null;

  let nascimento;

  // Tenta ISO (YYYY-MM-DD ou datetime)
  const isoMatch = String(valorData).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    nascimento = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  // Tenta BR (DD/MM/YYYY)
  if (!nascimento) {
    const brMatch = String(valorData).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      nascimento = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    }
  }

  if (!nascimento || isNaN(nascimento.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();
  const mesNasc = nascimento.getMonth();
  const diaNasc = nascimento.getDate();

  // Ainda não fez aniversário este ano
  if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) {
    idade -= 1;
  }

  return idade;
}

function avaliarOperador(valorInformado, operator, valorRegra) {
  // Normaliza para comparação
  const vStr = String(valorInformado ?? '').trim().toLowerCase();
  const vNum = Number(valorInformado);

  switch (operator) {
    case 'eq':
      return vStr === String(valorRegra).toLowerCase();
    case 'neq':
      return vStr !== String(valorRegra).toLowerCase();
    case 'gt':
      return Number.isFinite(vNum) && vNum > Number(valorRegra);
    case 'gte':
      return Number.isFinite(vNum) && vNum >= Number(valorRegra);
    case 'lt':
      return Number.isFinite(vNum) && vNum < Number(valorRegra);
    case 'lte':
      return Number.isFinite(vNum) && vNum <= Number(valorRegra);
    case 'in': {
      const lista = Array.isArray(valorRegra) ? valorRegra : [valorRegra];
      return lista.map(v => String(v).toLowerCase()).includes(vStr);
    }
    case 'not_in': {
      const lista = Array.isArray(valorRegra) ? valorRegra : [valorRegra];
      return !lista.map(v => String(v).toLowerCase()).includes(vStr);
    }
    case 'contains':
      return vStr.includes(String(valorRegra).toLowerCase());

    // ── Operadores de idade (campo = data de nascimento) ──────────────────
    case 'age_gte': {
      const idade = calcularIdade(valorInformado);
      return idade !== null && idade >= Number(valorRegra);
    }
    case 'age_lte': {
      const idade = calcularIdade(valorInformado);
      return idade !== null && idade <= Number(valorRegra);
    }
    case 'age_gt': {
      const idade = calcularIdade(valorInformado);
      return idade !== null && idade > Number(valorRegra);
    }
    case 'age_lt': {
      const idade = calcularIdade(valorInformado);
      return idade !== null && idade < Number(valorRegra);
    }

    default:
      return true;
  }
}

// ─── Avaliação das regras ─────────────────────────────────────────────────────

async function avaliarRegrasDeBloquio(eventId, buyerData, attendeesData) {
  const regras = await EventRegistrationRule.findAll({
    where: { eventId, isActive: true },
    order: [['ruleGroup', 'ASC']],
  });

  if (!regras.length) return; // sem regras configuradas

  // Separar regras por aplicação
  const regrasBuyer = regras.filter(r => r.appliesTo === 'buyer');
  const regrasAttendee = regras.filter(r => r.appliesTo === 'attendee');

  // Validar dados do comprador
  if (regrasBuyer.length > 0) {
    _avaliarParaDados(regrasBuyer, buyerData, 'comprador');
  }

  // Validar cada inscrito individualmente
  if (regrasAttendee.length > 0) {
    attendeesData.forEach((att, idx) => {
      const dados = att.data || att;
      _avaliarParaDados(regrasAttendee, dados, `inscrito ${idx + 1}`);
    });
  }
}

/**
 * Lança erro se os dados não passarem em nenhum grupo de regras.
 * Grupos são avaliados com OR entre si; dentro de cada grupo, AND.
 */
function _avaliarParaDados(regras, dados, contexto) {
  // Agrupar por ruleGroup
  const grupos = {};
  regras.forEach(r => {
    if (!grupos[r.ruleGroup]) grupos[r.ruleGroup] = [];
    grupos[r.ruleGroup].push(r);
  });

  const gruposArray = Object.values(grupos);

  const passouAlgumGrupo = gruposArray.some(regrasDoGrupo =>
    regrasDoGrupo.every(regra => {
      const valorInformado = dados?.[regra.fieldKey];
      return avaliarOperador(valorInformado, regra.operator, regra.value);
    })
  );

  if (!passouAlgumGrupo) {
    // Usa a mensagem do primeiro grupo que bloqueou
    const mensagem = gruposArray[0][0]?.errorMessage
      || `Inscrição não permitida para o perfil do ${contexto}`;
    throw new Error(mensagem);
  }
}

// ─── CRUD de regras ───────────────────────────────────────────────────────────

async function listarRegrasPorEvento(eventId) {
  return EventRegistrationRule.findAll({
    where: { eventId },
    include: [{ model: FormField, as: 'formField', attributes: ['id', 'fieldLabel', 'fieldName', 'fieldType', 'options'] }],
    order: [['ruleGroup', 'ASC'], ['createdAt', 'ASC']],
  });
}

async function criarRegra(dados) {
  const { eventId, formFieldId, fieldKey, operator, value, errorMessage, appliesTo, ruleGroup } = dados;

  if (!eventId || !fieldKey || !operator || value === undefined || value === null || !errorMessage) {
    throw new Error('Campos obrigatórios: eventId, fieldKey, operator, value, errorMessage');
  }

  return EventRegistrationRule.create({
    eventId,
    formFieldId: formFieldId || null,
    fieldKey,
    operator,
    value,
    errorMessage,
    appliesTo: appliesTo || 'attendee',
    ruleGroup: ruleGroup || 1,
    isActive: true,
  });
}

async function atualizarRegra(id, dados) {
  const regra = await EventRegistrationRule.findByPk(id);
  if (!regra) throw new Error('Regra não encontrada');
  await regra.update(dados);
  return regra.reload({ include: [{ model: FormField, as: 'formField', attributes: ['id', 'fieldLabel', 'fieldName', 'fieldType', 'options'] }] });
}

async function removerRegra(id) {
  const regra = await EventRegistrationRule.findByPk(id);
  if (!regra) throw new Error('Regra não encontrada');
  await regra.destroy();
}

module.exports = {
  avaliarRegrasDeBloquio,
  listarRegrasPorEvento,
  criarRegra,
  atualizarRegra,
  removerRegra,
};
