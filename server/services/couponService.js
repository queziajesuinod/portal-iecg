const uuid = require('uuid');
const { Coupon, Event } = require('../models');

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

async function criarCupom(body) {
  const {
    eventId, code, discountType, discountValue, maxUses, validFrom, validUntil, description, minimumQuantity
  } = body;

  if (!code) {
    throw new Error('Código do cupom é obrigatório');
  }

  if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
    throw new Error('Tipo de desconto inválido. Use "percentage" ou "fixed"');
  }

  if (!discountValue || discountValue <= 0) {
    throw new Error('Valor do desconto deve ser maior que zero');
  }

  if (discountType === 'percentage' && discountValue > 100) {
    throw new Error('Desconto percentual não pode ser maior que 100%');
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

  return Coupon.create({
    id: uuid.v4(),
    eventId: eventId || null,
    code: code.toUpperCase(),
    discountType,
    discountValue,
    minimumQuantity: normalizeMinimumQuantity(minimumQuantity),
    maxUses,
    currentUses: 0,
    validFrom,
    validUntil,
    isActive: true,
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

// Validar e aplicar cupom
async function validarCupom(code, eventId, preco, quantity) {
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

  // Calcular desconto
  let desconto = 0;
  if (coupon.discountType === 'percentage') {
    desconto = (preco * coupon.discountValue) / 100;
  } else {
    desconto = parseFloat(coupon.discountValue);
  }

  // Garantir que desconto não seja maior que o preço
  if (desconto > preco) {
    desconto = preco;
  }

  return {
    valido: true,
    coupon,
    desconto: parseFloat(desconto.toFixed(2)),
    precoFinal: parseFloat((preco - desconto).toFixed(2))
  };
}

// Incrementar uso do cupom
async function incrementarUso(couponId) {
  const coupon = await Coupon.findByPk(couponId);

  if (!coupon) {
    throw new Error('Cupom não encontrado');
  }

  coupon.currentUses += 1;
  await coupon.save();

  return coupon;
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

