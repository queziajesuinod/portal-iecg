const { Op } = require('sequelize');
const {
  Member,
  MemberCargo,
  Campus,
  Registration,
  RegistrationPayment,
  Event,
  FinancialExpense,
} = require('../models');
const registroCultoService = require('./registroCultoService');
const {
  calculateConfiguredFee,
  calculateCustomerFeeAmount,
} = require('./financialService');

// ===== Helpers =====
const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUS_ATIVOS = ['VISITANTE', 'CONGREGADO', 'MEMBRO'];

const CARGO_LABELS = {
  lideranca_apostolica: 'Liderança Apostólica',
  pastor_geracao: 'Pastor de Geração',
  pastor_campus: 'Pastor de Campus',
};

const METODO_LABELS = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  boleto: 'Boleto',
  cash: 'Dinheiro',
  pos: 'Maquininha (POS)',
  transfer: 'Transferência',
  manual: 'Manual',
  other: 'Outro',
};

const STATUS_PAGAMENTO_LABELS = {
  pending: 'Pendente',
  authorized: 'Autorizado',
  partial: 'Parcial',
  confirmed: 'Confirmado',
  denied: 'Negado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
  refunded: 'Estornado',
};

const toMoney = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(2));
};

const normalizeOptional = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null') return null;
  return normalized;
};

const monthKey = (dateLike) => {
  if (!dateLike) return null;
  const iso = String(dateLike).slice(0, 7); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(iso)) return null;
  return iso;
};

const monthLabel = (key) => {
  if (!key) return '';
  const [ano, mes] = key.split('-');
  return `${MESES_PT[Number(mes) - 1]?.slice(0, 3) || mes}/${ano}`;
};

const idade = (birthDate) => {
  if (!birthDate) return null;
  const hoje = new Date();
  const nasc = new Date(birthDate);
  if (Number.isNaN(nasc.getTime())) return null;
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const diffMes = hoje.getMonth() - nasc.getMonth();
  if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < nasc.getDate())) anos -= 1;
  return anos;
};

const faixaEtaria = (anos) => {
  if (anos == null) return 'Não informado';
  if (anos <= 11) return '0-11 (Crianças)';
  if (anos <= 17) return '12-17 (Adolescentes)';
  if (anos <= 24) return '18-24 (Jovens)';
  if (anos <= 34) return '25-34';
  if (anos <= 49) return '35-49';
  if (anos <= 64) return '50-64';
  return '65+';
};

const ordemFaixas = [
  '0-11 (Crianças)', '12-17 (Adolescentes)', '18-24 (Jovens)',
  '25-34', '35-49', '50-64', '65+', 'Não informado',
];

const buildDateRange = (dateFrom, dateTo) => {
  const range = {};
  const from = normalizeOptional(dateFrom);
  const to = normalizeOptional(dateTo);
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return Object.keys(range).length ? range : null;
};

// Converte um objeto { chave: valor } em array ordenado para gráficos.
const toDistribution = (map, { labels = {}, order = null } = {}) => {
  let entries = Object.entries(map);
  if (order) {
    entries = order
      .filter((key) => map[key] !== undefined)
      .map((key) => [key, map[key]]);
  } else {
    entries.sort((a, b) => b[1] - a[1]);
  }
  return entries.map(([key, value]) => ({
    key,
    label: labels[key] || key,
    value,
  }));
};

// ===== Relatório de Membros =====
async function membros(filtros = {}) {
  const where = {};
  const campusId = normalizeOptional(filtros.campusId);
  const status = normalizeOptional(filtros.status);
  if (campusId) where.campusId = campusId;
  if (status) where.status = status;

  const dateRange = buildDateRange(filtros.dateFrom, filtros.dateTo);
  if (dateRange) where.membershipDate = dateRange;

  const registros = await Member.findAll({
    where,
    attributes: ['id', 'status', 'gender', 'birthDate', 'membershipDate', 'createdAt', 'campusId'],
    include: [
      { model: Campus, as: 'campus', attributes: ['id', 'nome'] },
      {
        model: MemberCargo,
        as: 'cargos',
        attributes: ['cargo', 'ativo'],
        required: false,
      },
    ],
  });

  const porStatus = {};
  const porGenero = {};
  const porFaixa = {};
  const porCampus = {};
  const porCargo = {};
  const crescimento = {};
  let ativos = 0;
  let inativos = 0;

  registros.forEach((registroModel) => {
    const r = registroModel.toJSON();

    porStatus[r.status] = (porStatus[r.status] || 0) + 1;
    if (STATUS_ATIVOS.includes(r.status)) ativos += 1;
    else inativos += 1;

    const genero = r.gender || 'Não informado';
    porGenero[genero] = (porGenero[genero] || 0) + 1;

    const faixa = faixaEtaria(idade(r.birthDate));
    porFaixa[faixa] = (porFaixa[faixa] || 0) + 1;

    const nomeCampus = r.campus?.nome || 'Sem campus';
    porCampus[nomeCampus] = (porCampus[nomeCampus] || 0) + 1;

    (r.cargos || []).forEach((c) => {
      if (c.ativo === false) return;
      porCargo[c.cargo] = (porCargo[c.cargo] || 0) + 1;
    });

    const refData = r.membershipDate || r.createdAt;
    const key = monthKey(refData);
    if (key) crescimento[key] = (crescimento[key] || 0) + 1;
  });

  const crescimentoSerie = Object.keys(crescimento)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, label: monthLabel(key), value: crescimento[key] }));

  return {
    geradoEm: new Date().toISOString(),
    filtros: {
      campusId: campusId || null, status: status || null, dateFrom: normalizeOptional(filtros.dateFrom), dateTo: normalizeOptional(filtros.dateTo)
    },
    resumo: {
      total: registros.length,
      ativos,
      inativos,
      campos: Object.keys(porCampus).length,
    },
    porStatus: toDistribution(porStatus, { labels: { MASCULINO: 'Masculino' } }),
    porGenero: toDistribution(porGenero, { labels: { MASCULINO: 'Masculino', FEMININO: 'Feminino', OUTRO: 'Outro' } }),
    porFaixaEtaria: toDistribution(porFaixa, { order: ordemFaixas }),
    porCampus: toDistribution(porCampus),
    porCargo: toDistribution(porCargo, { labels: CARGO_LABELS }),
    crescimento: crescimentoSerie,
  };
}

// ===== Relatório de Eventos e Finanças =====
async function eventosFinanceiro(filtros = {}) {
  const eventId = normalizeOptional(filtros.eventId);
  const registrationWhere = {};
  if (eventId) registrationWhere.eventId = eventId;

  // createdAt é timestamp: usa fim-de-dia no "até" para incluir o dia inteiro.
  const createdFrom = normalizeOptional(filtros.dateFrom);
  const createdTo = normalizeOptional(filtros.dateTo);
  if (createdFrom || createdTo) {
    registrationWhere.createdAt = {};
    if (createdFrom) registrationWhere.createdAt[Op.gte] = `${createdFrom} 00:00:00`;
    if (createdTo) registrationWhere.createdAt[Op.lte] = `${createdTo} 23:59:59`;
  }

  // Inscrições no período (todas, para conversão e ocupação)
  const registrations = await Registration.findAll({
    where: registrationWhere,
    attributes: ['id', 'eventId', 'quantity', 'originalPrice', 'discountAmount', 'finalPrice', 'paymentStatus', 'createdAt'],
    include: [{ model: Event, as: 'event', attributes: ['id', 'title', 'maxRegistrations', 'currentRegistrations'] }],
  });

  const registrationIds = registrations.map((r) => r.id);

  // Pagamentos confirmados ligados a essas inscrições
  const payments = registrationIds.length
    ? await RegistrationPayment.findAll({
      where: { registrationId: { [Op.in]: registrationIds }, status: 'confirmed' },
      attributes: ['id', 'registrationId', 'channel', 'method', 'amount', 'taxa', 'installments', 'cardBrand', 'providerPayload', 'createdAt'],
    })
    : [];

  // Carrega todas as configurações de taxas vigentes (histórico completo) uma única vez.
  // Para cada pagamento, usa a config vigente na data em que foi feito — sem N+1.
  const { listarHistoricoFeeConfig: listarFeeConfigs } = require('./financialService');
  const todasFeeConfigs = await listarFeeConfigs();

  const getFeeConfigParaData = (dateIso) => {
    const d = String(dateIso || '').slice(0, 10);
    // Procura a config cuja vigência cobre a data (mais recente primeiro)
    const match = todasFeeConfigs.find((c) => {
      const de = c.vigenteDe || '2000-01-01';
      const ate = c.vigenteAte || '9999-12-31';
      return d >= de && d <= ate;
    });
    return match || todasFeeConfigs[0]; // fallback: config mais recente
  };

  // Despesas no período (por expenseDate)
  const expenseWhere = {};
  if (eventId) expenseWhere.eventId = eventId;
  const expenseRange = buildDateRange(filtros.dateFrom, filtros.dateTo);
  if (expenseRange) expenseWhere.expenseDate = expenseRange;
  const expenses = await FinancialExpense.findAll({
    where: expenseWhere,
    attributes: ['id', 'eventId', 'amount', 'paymentMethod', 'isSettled', 'expenseDate'],
    include: [{ model: Event, as: 'event', attributes: ['id', 'title'] }],
  });

  // Agregações de inscrições
  const STATUS_CONFIRMADOS = ['confirmed', 'partial'];
  const porStatusInscricao = {};
  let totalInscricoes = 0; // pedidos (qualquer status) — para conversão
  let totalInscritos = 0; // soma de quantity apenas confirmados/parciais
  let receitaPrevista = 0; // finalPrice dos confirmados/parciais
  let totalDescontos = 0; // descontos dos confirmados/parciais
  const porEvento = {};

  const ensureEvento = (id, eventObj) => {
    if (!porEvento[id]) {
      porEvento[id] = {
        eventId: id,
        evento: eventObj?.title || 'Sem evento',
        capacidade: eventObj?.maxRegistrations ?? null, // null = ilimitado
        inscritos: 0,
        receita: 0,
        despesa: 0,
      };
    }
    return porEvento[id];
  };

  registrations.forEach((regModel) => {
    const r = regModel.toJSON();
    // Todos os pedidos contam para o gráfico de status e taxa de conversão
    porStatusInscricao[r.paymentStatus] = (porStatusInscricao[r.paymentStatus] || 0) + 1;
    totalInscricoes += 1;
    const ev = ensureEvento(r.eventId, r.event);
    // Inscritos e receita prevista: apenas confirmed/partial
    if (STATUS_CONFIRMADOS.includes(r.paymentStatus)) {
      totalInscritos += Number(r.quantity || 0);
      receitaPrevista += toMoney(r.finalPrice);
      totalDescontos += toMoney(r.discountAmount);
      ev.inscritos += Number(r.quantity || 0);
    }
  });

  // Agregações de pagamentos confirmados
  const regById = new Map(registrations.map((r) => [r.id, r]));

  // Por método: { quantidade, receita(bruto), taxaCliente, taxaLojista, liquido }
  const porMetodo = {};
  const porCanal = {};
  const receitaPorMes = {};
  let receitaBruta = 0; // amount + taxaCliente (total pago pelo comprador)
  let totalTaxaCliente = 0; // taxa repassada ao cliente (campo taxa)
  let totalTaxaLojista = 0; // MDR/processadora que o lojista absorve
  let receitaLiquida = 0; // receitaBruta − totalTaxaCliente − totalTaxaLojista

  const ensureMetodo = (method) => {
    if (!porMetodo[method]) {
      porMetodo[method] = {
        quantidade: 0, receita: 0, taxaCliente: 0, taxaLojista: 0, liquido: 0,
      };
    }
    return porMetodo[method];
  };

  payments.forEach((payModel) => {
    const p = payModel.toJSON();
    const taxaCliente = toMoney(p.taxa || 0); // taxa repassada ao cliente
    const amount = toMoney(p.amount);
    const bruto = toMoney(amount + taxaCliente);

    // Usa a config de taxas vigente na data do pagamento (não a de hoje)
    const feeConfig = getFeeConfigParaData(p.createdAt);
    const { feeAmount } = calculateConfiguredFee(p, feeConfig);
    const { customerFeeAmount } = calculateCustomerFeeAmount(p);
    const taxaLojista = toMoney(Math.max(0, feeAmount - customerFeeAmount));
    const liquido = toMoney(bruto - feeAmount); // bruto menos toda a taxa processadora

    receitaBruta += bruto;
    totalTaxaCliente += taxaCliente;
    totalTaxaLojista += taxaLojista;
    receitaLiquida += liquido;

    const m = ensureMetodo(p.method);
    m.quantidade += 1;
    m.receita += bruto;
    m.taxaCliente += taxaCliente;
    m.taxaLojista += taxaLojista;
    m.liquido += liquido;

    porCanal[p.channel] = (porCanal[p.channel] || 0) + bruto;

    const key = monthKey(p.createdAt);
    if (key) {
      if (!receitaPorMes[key]) receitaPorMes[key] = { receita: 0, despesa: 0 };
      receitaPorMes[key].receita += bruto;
    }

    const reg = regById.get(p.registrationId);
    if (reg) {
      const ev = ensureEvento(reg.eventId, reg.event);
      ev.receita += bruto;
    }
  });

  // Agregações de despesas
  const despesaPorMetodo = {};
  let despesaTotal = 0;
  let despesaLiquidada = 0;
  let despesaPendente = 0;

  expenses.forEach((expModel) => {
    const e = expModel.toJSON();
    const amount = toMoney(e.amount);
    despesaTotal += amount;
    if (e.isSettled) despesaLiquidada += amount;
    else despesaPendente += amount;
    despesaPorMetodo[e.paymentMethod] = (despesaPorMetodo[e.paymentMethod] || 0) + amount;

    const key = monthKey(e.expenseDate);
    if (key) {
      if (!receitaPorMes[key]) receitaPorMes[key] = { receita: 0, despesa: 0 };
      receitaPorMes[key].despesa += amount;
    }

    const ev = ensureEvento(e.eventId || 'sem-evento', e.event);
    ev.despesa += amount;
  });

  // Taxa de conversão: pedidos confirmados / total de pedidos
  const confirmadas = porStatusInscricao.confirmed || 0;
  const taxaConversao = totalInscricoes
    ? Number(((confirmadas / totalInscricoes) * 100).toFixed(1))
    : 0;

  const fluxoCaixa = Object.keys(receitaPorMes)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      label: monthLabel(key),
      receita: toMoney(receitaPorMes[key].receita),
      despesa: toMoney(receitaPorMes[key].despesa),
      saldo: toMoney(receitaPorMes[key].receita - receitaPorMes[key].despesa),
    }));

  const eventos = Object.values(porEvento)
    .map((ev) => {
      const ocupacao = ev.capacidade
        ? Number(((ev.inscritos / ev.capacidade) * 100).toFixed(1))
        : null;
      return {
        ...ev,
        ocupacao, // % de vagas preenchidas (null = sem limite)
        receita: toMoney(ev.receita),
        despesa: toMoney(ev.despesa),
        saldo: toMoney(ev.receita - ev.despesa),
      };
    })
    .sort((a, b) => b.receita - a.receita);

  return {
    geradoEm: new Date().toISOString(),
    filtros: { eventId: eventId || null, dateFrom: normalizeOptional(filtros.dateFrom), dateTo: normalizeOptional(filtros.dateTo) },
    resumo: {
      totalInscricoes,
      totalInscritos,
      receitaBruta: toMoney(receitaBruta),
      totalTaxaCliente: toMoney(totalTaxaCliente),
      totalTaxaLojista: toMoney(totalTaxaLojista),
      totalTaxas: toMoney(totalTaxaCliente + totalTaxaLojista),
      receitaLiquida: toMoney(receitaLiquida),
      receitaPrevista: toMoney(receitaPrevista),
      totalDescontos: toMoney(totalDescontos),
      despesaTotal: toMoney(despesaTotal),
      despesaLiquidada: toMoney(despesaLiquidada),
      despesaPendente: toMoney(despesaPendente),
      saldo: toMoney(receitaLiquida - despesaLiquidada),
      taxaConversao,
    },
    porStatusInscricao: toDistribution(porStatusInscricao, { labels: STATUS_PAGAMENTO_LABELS }),
    // Por método: { key, label, quantidade, receita(bruto), taxaCliente, taxaLojista, liquido }
    receitaPorMetodo: Object.entries(porMetodo)
      .sort((a, b) => b[1].receita - a[1].receita)
      .map(([key, v]) => ({
        key,
        label: METODO_LABELS[key] || key,
        quantidade: v.quantidade,
        receita: toMoney(v.receita),
        taxaCliente: toMoney(v.taxaCliente),
        taxaLojista: toMoney(v.taxaLojista),
        liquido: toMoney(v.liquido),
        value: toMoney(v.receita), // compatibilidade com ChartCard (usa "value")
      })),
    receitaPorCanal: toDistribution(porCanal, { labels: { ONLINE: 'Online', OFFLINE: 'Presencial' } }).map((i) => ({ ...i, value: toMoney(i.value) })),
    despesaPorMetodo: toDistribution(despesaPorMetodo, { labels: METODO_LABELS }).map((i) => ({ ...i, value: toMoney(i.value) })),
    fluxoCaixa,
    eventos,
  };
}

// ===== Relatório de Saúde dos Cultos (reaproveita o dashboard rico existente) =====
async function cultos(filtros = {}) {
  const dashboard = await registroCultoService.dashboard(filtros);
  return {
    geradoEm: new Date().toISOString(),
    filtros: {
      campusId: normalizeOptional(filtros.campusId),
      ministerioId: normalizeOptional(filtros.ministerioId),
      tipoEventoId: normalizeOptional(filtros.tipoEventoId),
      dataInicio: normalizeOptional(filtros.dataInicio),
      dataFim: normalizeOptional(filtros.dataFim),
    },
    ...dashboard,
  };
}

module.exports = {
  membros,
  eventosFinanceiro,
  cultos,
};
