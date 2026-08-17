const uuid = require('uuid');
const { QueryTypes } = require('sequelize');
const { Coupon, Event } = require('../models');

const COUPONS_SCHEMA = process.env.DB_SCHEMA || 'dev_iecg';

function normalizeMinimumQuantity(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Quantidade mínima de ingressos deve ser um número inteiro maior que zero');
  }
  return parsed;
}

// Normaliza o mapa de precos por setor usado no discountType=fixed_price.
// Ex: { "Frente": "220", "GALERIA": 140 } => { "FRENTE": 220, "GALERIA": 140 }
function normalizeSectorPrices(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('sectorPrices deve ser um objeto no formato { SETOR: preco }');
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    throw new Error('Cupom de preço fixo exige ao menos um preço por setor');
  }
  const normalized = {};
  entries.forEach(([setor, preco]) => {
    const chave = String(setor || '').toUpperCase().trim();
    if (!chave) {
      throw new Error('Setor inválido em sectorPrices');
    }
    const parsed = Number(preco);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Preço do setor "${chave}" deve ser um número maior que zero`);
    }
    normalized[chave] = parseFloat(parsed.toFixed(2));
  });
  return normalized;
}

async function listarCupons() {
  return Coupon.findAll({
    include: [
      {
        model: Event,
        as: 'event',
        attributes: ['id', 'title'],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']]
  });
}

async function buscarCuponPorId(id) {
  const coupon = await Coupon.findByPk(id, {
    include: [
      {
        model: Event,
        as: 'event',
        attributes: ['id', 'title']
      }
    ]
  });

  if (!coupon) {
    throw new Error('Cupom não encontrado');
  }

  return coupon;
}

const VALID_PAYMENT_TYPES = ['pix', 'credit_card', 'boleto', 'offline'];

async function criarCupom(body) {
  const {
    eventId, code, discountType, discountValue, maxUses, validFrom, validUntil, description, minimumQuantity,
    allowedPaymentTypes, sectorPrices,
  } = body;

  if (!code) {
    throw new Error('Código do cupom é obrigatório');
  }

  if (!discountType || !['percentage', 'fixed', 'fixed_price'].includes(discountType)) {
    throw new Error('Tipo de desconto inválido. Use "percentage", "fixed" ou "fixed_price"');
  }

  let sectorPricesNormalizado = null;
  if (discountType === 'fixed_price') {
    // Preco fixo por setor so faz sentido amarrado a um evento (220/160/140 nao valem em outro evento).
    if (!eventId) {
      throw new Error('Cupom de preço fixo (fixed_price) deve estar vinculado a um evento');
    }
    sectorPricesNormalizado = normalizeSectorPrices(sectorPrices);
  } else {
    if (!discountValue || discountValue <= 0) {
      throw new Error('Valor do desconto deve ser maior que zero');
    }
    if (discountType === 'percentage' && discountValue > 100) {
      throw new Error('Desconto percentual não pode ser maior que 100%');
    }
  }

  // Verificar se código já existe
  const existingCoupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });
  if (existingCoupon) {
    throw new Error('Código de cupom já existe');
  }

  // Se eventId foi fornecido, verificar se evento existe
  if (eventId) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Evento não encontrado');
    }
  }

  const tiposPermitidos = Array.isArray(allowedPaymentTypes) && allowedPaymentTypes.length > 0
    ? allowedPaymentTypes.filter(t => VALID_PAYMENT_TYPES.includes(t))
    : null;

  return Coupon.create({
    id: uuid.v4(),
    eventId: eventId || null,
    code: code.toUpperCase(),
    discountType,
    discountValue: discountType === 'fixed_price' ? 0 : discountValue,
    sectorPrices: sectorPricesNormalizado,
    minimumQuantity: normalizeMinimumQuantity(minimumQuantity),
    maxUses,
    currentUses: 0,
    validFrom,
    validUntil,
    isActive: true,
    allowedPaymentTypes: tiposPermitidos,
    description
  });
}

async function atualizarCupom(id, body) {
  const coupon = await Coupon.findByPk(id);

  if (!coupon) {
    throw new Error('Cupom não encontrado');
  }

  // Não permitir alterar código se já foi usado
  if (body.code && body.code !== coupon.code && coupon.currentUses > 0) {
    throw new Error('Não é possível alterar código de cupom que já foi usado');
  }

  coupon.code = body.code ? body.code.toUpperCase() : coupon.code;
  coupon.discountType = body.discountType ?? coupon.discountType;
  coupon.discountValue = body.discountValue ?? coupon.discountValue;
  coupon.maxUses = body.maxUses ?? coupon.maxUses;
  coupon.validFrom = body.validFrom ?? coupon.validFrom;
  coupon.validUntil = body.validUntil ?? coupon.validUntil;
  coupon.isActive = body.isActive ?? coupon.isActive;
  coupon.description = body.description ?? coupon.description;
  if (Object.prototype.hasOwnProperty.call(body, 'minimumQuantity')) {
    coupon.minimumQuantity = normalizeMinimumQuantity(body.minimumQuantity);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'allowedPaymentTypes')) {
    const tipos = body.allowedPaymentTypes;
    coupon.allowedPaymentTypes = Array.isArray(tipos) && tipos.length > 0
      ? tipos.filter(t => VALID_PAYMENT_TYPES.includes(t))
      : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'sectorPrices')) {
    coupon.sectorPrices = normalizeSectorPrices(body.sectorPrices);
  }

  // Consistencia para fixed_price (vale tanto se o tipo mudou quanto se ja era)
  if (coupon.discountType === 'fixed_price') {
    if (!coupon.eventId) {
      throw new Error('Cupom de preço fixo (fixed_price) deve estar vinculado a um evento');
    }
    if (!coupon.sectorPrices || Object.keys(coupon.sectorPrices).length === 0) {
      throw new Error('Cupom de preço fixo (fixed_price) exige preços por setor (sectorPrices)');
    }
    coupon.discountValue = 0;
  }

  await coupon.save();
  return coupon;
}

async function deletarCupom(id) {
  const coupon = await Coupon.findByPk(id);

  if (!coupon) {
    throw new Error('Cupom não encontrado');
  }

  // Verificar se cupom já foi usado
  if (coupon.currentUses > 0) {
    throw new Error('Não é possível deletar cupom que já foi usado. Desative o cupom ao invés de deletar.');
  }

  await coupon.destroy();
}

const PAYMENT_TYPE_LABELS = {
  pix: 'PIX', credit_card: 'Cartão de Crédito', boleto: 'Boleto', offline: 'Pagamento Presencial'
};

// Validar e aplicar cupom
async function validarCupom(code, eventId, preco, quantity, paymentType = null, items = null) {
  const normalizedCode = String(code || '').toUpperCase().trim();
  const coupon = await Coupon.findOne({
    where: {
      code: normalizedCode,
      isActive: true
    }
  });

  if (!coupon) {
    const existingCoupon = await Coupon.findOne({
      where: { code: normalizedCode },
      attributes: ['id', 'isActive']
    });
    if (existingCoupon && !existingCoupon.isActive) {
      throw new Error('Cupom inativo');
    }
    throw new Error('Cupom n�o encontrado');
  }

  // Verificar se cupom é específico para um evento
  if (coupon.eventId && coupon.eventId !== eventId) {
    throw new Error('Cupom não válido para este evento');
  }

  // Verificar validade temporal
  const now = new Date();
  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    throw new Error('Cupom ainda não está válido');
  }

  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    throw new Error('Cupom expirado');
  }

  // Verificar limite de uso
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    throw new Error('Cupom atingiu limite de uso');
  }

  const quantidadeRaw = Number(quantity ?? 0);
  const quantidade = Number.isFinite(quantidadeRaw) ? quantidadeRaw : 0;
  if (coupon.minimumQuantity && quantidade < coupon.minimumQuantity) {
    throw new Error(`Cupom válido apenas para compras com no mínimo ${coupon.minimumQuantity} ingressos`);
  }

  // Verificar restrição de forma de pagamento
  if (coupon.allowedPaymentTypes && coupon.allowedPaymentTypes.length > 0 && paymentType) {
    if (!coupon.allowedPaymentTypes.includes(paymentType)) {
      const permitidos = coupon.allowedPaymentTypes
        .map(t => PAYMENT_TYPE_LABELS[t] || t)
        .join(' ou ');
      throw new Error(`Este cupom é válido apenas para pagamento via ${permitidos}`);
    }
  }

  // Calcular preco final conforme o tipo de cupom
  let desconto = 0;
  let precoFinal = preco;

  if (coupon.discountType === 'fixed_price') {
    // Precisa do detalhamento por ingresso para resolver o preco de cada setor
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Cupom de preço fixo requer o detalhamento dos ingressos por setor');
    }
    const precos = coupon.sectorPrices || {};
    const somaFinal = items.reduce((sum, item) => {
      const setor = (String(item.sector || 'DEFAULT').toUpperCase().trim()) || 'DEFAULT';
      const precoLote = Number(item.price) || 0;
      const precoCupomRaw = precos[setor] ?? precos.DEFAULT;
      if (precoCupomRaw === undefined || precoCupomRaw === null) {
        throw new Error(`Este cupom não define preço para o setor "${setor}"`);
      }
      // Nunca cobrar mais que o lote vigente por causa do cupom (protege promocoes futuras)
      const precoItem = Math.min(Number(precoCupomRaw), precoLote);
      return sum + precoItem;
    }, 0);
    precoFinal = parseFloat(somaFinal.toFixed(2));
    desconto = parseFloat(Math.max(0, preco - precoFinal).toFixed(2));
  } else {
    if (coupon.discountType === 'percentage') {
      desconto = (preco * coupon.discountValue) / 100;
    } else {
      desconto = parseFloat(coupon.discountValue);
    }
    // Garantir que desconto não seja maior que o preço
    if (desconto > preco) {
      desconto = preco;
    }
    desconto = parseFloat(desconto.toFixed(2));
    precoFinal = parseFloat((preco - desconto).toFixed(2));
  }

  return {
    valido: true,
    coupon,
    desconto,
    precoFinal,
    allowedPaymentTypes: coupon.allowedPaymentTypes || null,
  };
}

// Incrementar uso do cupom.
// UPDATE condicional atomico: respeita maxUses mesmo com pedidos concorrentes,
// evitando a corrida do antigo findByPk + save (dois pedidos passavam o limite juntos).
async function incrementarUso(couponId) {
  const rows = await Coupon.sequelize.query(
    `UPDATE "${COUPONS_SCHEMA}"."Coupons"
        SET "currentUses" = "currentUses" + 1, "updatedAt" = NOW()
      WHERE id = :id
        AND ("maxUses" IS NULL OR "currentUses" < "maxUses")
    RETURNING "currentUses"`,
    { replacements: { id: couponId }, type: QueryTypes.SELECT }
  );

  if (!rows || rows.length === 0) {
    // 0 linhas = cupom inexistente ou limite ja atingido. Nao lancamos aqui porque
    // o pagamento normalmente ja foi capturado neste ponto; apenas registramos.
    console.warn(`[couponService] incrementarUso nao aplicado (cupom ${couponId} inexistente ou limite atingido)`);
    return { atualizado: false, currentUses: null };
  }

  return { atualizado: true, currentUses: rows[0].currentUses };
}

module.exports = {
  listarCupons,
  buscarCuponPorId,
  criarCupom,
  atualizarCupom,
  deletarCupom,
  validarCupom,
  incrementarUso
};
