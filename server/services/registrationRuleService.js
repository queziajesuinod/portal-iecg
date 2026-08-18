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

  if (!nascimento || Number.isNaN(nascimento.getTime())) return null;

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
 * Núcleo de avaliação (sem lançar). Retorna { ok, message }.
 * Grupos são avaliados com OR entre si; dentro de cada grupo, AND.
 */
function _avaliarGrupos(regras, dados) {
  // Agrupar por ruleGroup
  const grupos = {};
  regras.forEach(r => {
    if (!grupos[r.ruleGroup]) grupos[r.ruleGroup] = [];
    grupos[r.ruleGroup].push(r);
  });

  const gruposArray = Object.values(grupos);

  const passouAlgumGrupo = gruposArray.some(regrasDoGrupo => regrasDoGrupo.every(regra => {
    const valorInformado = dados?.[regra.fieldKey];
    return avaliarOperador(valorInformado, regra.operator, regra.value);
  })
  );

  if (passouAlgumGrupo) return { ok: true, message: null };

  // Usa a mensagem do primeiro grupo que bloqueou
  return { ok: false, message: gruposArray[0][0]?.errorMessage || null };
}

/**
 * Lança erro se os dados não passarem em nenhum grupo de regras.
 */
function _avaliarParaDados(regras, dados, contexto) {
  const { ok, message } = _avaliarGrupos(regras, dados);
  if (!ok) {
    throw new Error(message || `Inscrição não permitida para o perfil do ${contexto}`);
  }
}

/**
 * Pré-validação NÃO-lançante das regras de bloqueio.
 * Permite validar apenas o comprador, apenas os inscritos, ou ambos —
 * útil para checar os dados dos inscritos antes de preencher o comprador.
 *
 * @param {string} eventId
 * @param {object} opts
 * @param {object} [opts.buyerData]        Dados do comprador
 * @param {Array}  [opts.attendeesData]    Lista de inscritos ({ data } ou objeto plano)
 * @param {'buyer'|'attendee'|'all'} [opts.scope]  Escopo explícito. Se omitido,
 *        valida apenas o que foi enviado (buyerData e/ou attendeesData).
 * @returns {Promise<{ ok: boolean, errors: Array<{ scope, index, message }> }>}
 */
async function validarRegras(eventId, { buyerData, attendeesData, scope } = {}) {
  const errors = [];

  const regras = await EventRegistrationRule.findAll({
    where: { eventId, isActive: true },
    order: [['ruleGroup', 'ASC']],
  });

  if (!regras.length) return { ok: true, errors };

  const checarBuyer = scope === 'buyer' || scope === 'all' || (!scope && buyerData !== undefined);
  const checarAttendee = scope === 'attendee' || scope === 'all' || (!scope && attendeesData !== undefined);

  const regrasBuyer = regras.filter(r => r.appliesTo === 'buyer');
  const regrasAttendee = regras.filter(r => r.appliesTo === 'attendee');

  if (checarBuyer && regrasBuyer.length > 0 && buyerData) {
    const { ok, message } = _avaliarGrupos(regrasBuyer, buyerData);
    if (!ok) {
      errors.push({
        scope: 'buyer',
        index: null,
        message: message || 'Inscrição não permitida para o perfil do comprador',
      });
    }
  }

  if (checarAttendee && regrasAttendee.length > 0 && Array.isArray(attendeesData)) {
    attendeesData.forEach((att, idx) => {
      const dados = att?.data || att;
      const { ok, message } = _avaliarGrupos(regrasAttendee, dados);
      if (!ok) {
        errors.push({
          scope: 'attendee',
          index: idx,
          message: message || `Inscrição não permitida para o perfil do inscrito ${idx + 1}`,
        });
      }
    });
  }

  return { ok: errors.length === 0, errors };
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
  const {
    eventId, formFieldId, fieldKey, operator, value, errorMessage, appliesTo, ruleGroup
  } = dados;

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
  validarRegras,
  listarRegrasPorEvento,
  criarRegra,
  atualizarRegra,
  removerRegra,
};
