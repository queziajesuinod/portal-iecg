const axios = require('axios');
const uuid = require('uuid');
const { PaymentTransaction } = require('../models');

// Configurações Cielo (devem vir de variáveis de ambiente)
const CIELO_MERCHANT_ID = process.env.CIELO_MERCHANT_ID || '';
const CIELO_MERCHANT_KEY = process.env.CIELO_MERCHANT_KEY || '';
const CIELO_ENVIRONMENT = process.env.CIELO_ENVIRONMENT || 'sandbox'; // 'sandbox' ou 'production'

const CIELO_ENDPOINTS = {
  sandbox: 'https://apisandbox.cieloecommerce.cielo.com.br',
  production: 'https://api.cieloecommerce.cielo.com.br'
};

const CIELO_QUERY_ENDPOINTS = {
  sandbox: 'https://apiquerysandbox.cieloecommerce.cielo.com.br',
  production: 'https://apiquery.cieloecommerce.cielo.com.br'
};

const BASE_URL = CIELO_ENDPOINTS[CIELO_ENVIRONMENT];
const QUERY_BASE_URL = CIELO_QUERY_ENDPOINTS[CIELO_ENVIRONMENT];

function logCielo(message, payload = {}) {
  console.info(`[Cielo] ${message}`, JSON.stringify(payload));
}

function montarMensagemErroCampos(dadosErro = []) {
  if (!Array.isArray(dadosErro) || !dadosErro.length) {
    return 'Verifique os dados informados e tente novamente.';
  }
  return dadosErro
    .map((item) => item?.Message || item?.message || item?.Code || item?.code)
    .filter(Boolean)
    .join(', ');
}

function classificarErroCielo(error) {
  const status = Number(error?.response?.status || 0);
  const payload = error?.response?.data;

  if (Array.isArray(payload)) {
    return {
      tipoErro: 'validation',
      mensagem: montarMensagemErroCampos(payload),
      detalhes: payload
    };
  }

  if (payload?.ModelState) {
    const mensagens = Object.values(payload.ModelState || {}).flat();
    return {
      tipoErro: 'validation',
      mensagem: montarMensagemErroCampos(mensagens.map((message) => ({ Message: message }))),
      detalhes: payload
    };
  }

  const mensagemPadrao = payload?.Payment?.ReturnMessage || payload?.message || error?.message || 'Erro ao processar pagamento';
  if (status === 400) {
    const msg = String(mensagemPadrao || '').toLowerCase();
    const pareceErroCampo = /(invalid|inválid|campo|required|obrigat|formato|tamanho|cpf|cnpj|cartao|cartão|expiration|security code|cvv)/i.test(msg);
    if (pareceErroCampo) {
      return {
        tipoErro: 'validation',
        mensagem: mensagemPadrao,
        detalhes: payload
      };
    }
  }

  return {
    tipoErro: 'processing',
    mensagem: mensagemPadrao,
    detalhes: payload
  };
}

function montarCustomer(dadosPagamento) {
  const customerData = dadosPagamento.customer || {};
  const documentValue = (
    dadosPagamento.customerDocument ||
    customerData.document ||
    customerData.cpf ||
    customerData.cnpj ||
    customerData.documento ||
    customerData.cnpjcpf ||
    ''
  ).toString();

  const sanitizedDocument = documentValue.replace(/\D/g, '') || '00000000000';
  return {
    name: dadosPagamento.customerName || customerData.name || customerData.nome || 'Cliente',
    email: dadosPagamento.customerEmail || customerData.email || customerData.usuarioEmail || 'sem-email@exemplo.com',
    document: sanitizedDocument
  };
}

/**
 * Criar transação PIX na Cielo
 */
async function criarTransacaoPix(dadosPagamento) {
  const { merchantOrderId, amount } = dadosPagamento;
  const customer = montarCustomer(dadosPagamento);
  logCielo('PIX request', {
    merchantOrderId,
    customerName: customer.name,
    customerEmail: customer.email,
    customerDocument: customer.document,
    amount
  });

  const payload = {
    MerchantOrderId: merchantOrderId,
    Customer: {
      Name: customer.name,
      Email: customer.email,
      Identity: customer.document,
      IdentityType: customer.document.length === 11 ? 'CPF' : 'CNPJ'
    },
    Payment: {
      Type: 'Pix',
      Amount: amount
    }
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/1/sales`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          MerchantId: CIELO_MERCHANT_ID,
          MerchantKey: CIELO_MERCHANT_KEY
        }
      }
    );

    logCielo('PIX response', {
      paymentId: response.data.Payment.PaymentId,
      status: response.data.Payment.Status,
      qrCodeString: response.data.Payment.QrCodeString,
      qrCodeBase64: response.data.Payment.QrCodeBase64Image
    });

    return {
      sucesso: true,
      paymentId: response.data.Payment.PaymentId,
      status: response.data.Payment.Status,
      qrCodeBase64: response.data.Payment.QrCodeBase64Image,
      qrCodeString: response.data.Payment.QrCodeString,
      dadosCompletos: response.data
    };
  } catch (error) {
    logCielo('PIX error', {
      message: error.message,
      payload: error.response?.data
    });
    console.error('Erro ao criar transação PIX:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);

    const erroClassificado = classificarErroCielo(error);

    return {
      sucesso: false,
      erro: erroClassificado.mensagem,
      tipoErro: erroClassificado.tipoErro,
      returnCode: error.response?.data?.Payment?.ReturnCode,
      dadosCompletos: error.response?.data
    };
  }
}

/**
 * Criar transação de pagamento com cartão na Cielo
 */
async function criarTransacao(dadosPagamento) {
  const {
    merchantOrderId,
    amount, // Valor em centavos (ex: R$ 100,00 = 10000)
    cardNumber,
    holder,
    expirationDate,
    securityCode,
    brand
  } = dadosPagamento;
  const customer = montarCustomer(dadosPagamento);
  logCielo('CreditCard request', {
    merchantOrderId,
    customerName: customer.name,
    amount,
    installments: dadosPagamento.installments,
    brand
  });

  const payload = {
    MerchantOrderId: merchantOrderId,
    Customer: {
      Name: customer.name,
      Email: customer.email,
      Identity: customer.document,
      IdentityType: customer.document.length === 11 ? 'CPF' : 'CNPJ'
    },
    Payment: {
      Type: 'CreditCard',
      Amount: amount,
      Installments: dadosPagamento.installments || 1,
      SoftDescriptor: 'IECG',
      CreditCard: {
        CardNumber: cardNumber,
        Holder: holder,
        ExpirationDate: expirationDate,
        SecurityCode: securityCode,
        Brand: brand
      }
    }
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/1/sales`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          MerchantId: CIELO_MERCHANT_ID,
          MerchantKey: CIELO_MERCHANT_KEY
        }
      }
    );

    return {
      sucesso: true,
      paymentId: response.data.Payment.PaymentId,
      status: response.data.Payment.Status,
      returnCode: response.data.Payment.ReturnCode,
      returnMessage: response.data.Payment.ReturnMessage,
      authorizationCode: response.data.Payment.AuthorizationCode,
      proofOfSale: response.data.Payment.ProofOfSale,
      tid: response.data.Payment.Tid,
      dadosCompletos: response.data
    };
  } catch (error) {
    logCielo('CreditCard error', {
      message: error.message,
      payload: error.response?.data
    });
    console.error('Erro ao criar transação Cielo:', error.response?.data || error.message);

    const erroClassificado = classificarErroCielo(error);

    return {
      sucesso: false,
      erro: erroClassificado.mensagem,
      tipoErro: erroClassificado.tipoErro,
      returnCode: error.response?.data?.Payment?.ReturnCode,
      dadosCompletos: error.response?.data
    };
  }
}

/**
 * Capturar pagamento autorizado
 */
async function capturarPagamento(paymentId, amount) {
  logCielo('Capture request', { paymentId, amount });
  try {
    const response = await axios.put(
      `${BASE_URL}/1/sales/${paymentId}/capture`,
      { Amount: amount },
      {
        headers: {
          'Content-Type': 'application/json',
          MerchantId: CIELO_MERCHANT_ID,
          MerchantKey: CIELO_MERCHANT_KEY
        }
      }
    );

    return {
      sucesso: true,
      status: response.data.Status,
      returnCode: response.data.ReturnCode,
      returnMessage: response.data.ReturnMessage,
      dadosCompletos: response.data
    };
  } catch (error) {
    logCielo('Capture error', {
      paymentId,
      amount,
      payload: error.response?.data
    });
    console.error('Erro ao capturar pagamento Cielo:', error.response?.data || error.message);

    return {
      sucesso: false,
      erro: error.response?.data?.ReturnMessage || error.message,
      dadosCompletos: error.response?.data
    };
  }
}

/**
 * Cancelar pagamento
 */
async function cancelarPagamento(paymentId, amount) {
  logCielo('Void request', { paymentId, amount });
  try {
    const response = await axios.put(
      `${BASE_URL}/1/sales/${paymentId}/void`,
      { Amount: amount },
      {
        headers: {
          'Content-Type': 'application/json',
          MerchantId: CIELO_MERCHANT_ID,
          MerchantKey: CIELO_MERCHANT_KEY
        }
      }
    );

    return {
      sucesso: true,
      status: response.data.Status,
      returnCode: response.data.ReturnCode,
      returnMessage: response.data.ReturnMessage,
      dadosCompletos: response.data
    };
  } catch (error) {
    logCielo('Void error', {
      paymentId,
      amount,
      payload: error.response?.data
    });
    console.error('Erro ao cancelar pagamento Cielo:', error.response?.data || error.message);

    return {
      sucesso: false,
      erro: error.response?.data?.ReturnMessage || error.message,
      dadosCompletos: error.response?.data
    };
  }
}

/**
 * Estornar (reembolsar) pagamento já capturado
 */
async function estornarPagamento(paymentId, amount) {
  logCielo('Refund request', { paymentId, amount });
  try {
    const response = await axios.put(
      `${BASE_URL}/1/sales/${paymentId}/void`,
      { Amount: amount },
      {
        headers: {
          'Content-Type': 'application/json',
          MerchantId: CIELO_MERCHANT_ID,
          MerchantKey: CIELO_MERCHANT_KEY
        }
      }
    );

    return {
      sucesso: true,
      status: response.data.Status,
      returnCode: response.data.ReturnCode,
      returnMessage: response.data.ReturnMessage,
      dadosCompletos: response.data
    };
  } catch (error) {
    logCielo('Refund error', {
      paymentId,
      amount,
      payload: error.response?.data
    });
    console.error('Erro ao estornar pagamento Cielo:', error.response?.data || error.message);

    return {
      sucesso: false,
      erro: error.response?.data?.ReturnMessage || error.message,
      dadosCompletos: error.response?.data
    };
  }
}

/**
 * Consultar status de pagamento
 */
async function consultarPagamento(paymentId) {
  logCielo('Consult request', { paymentId });
  try {
    const response = await axios.get(
      `${QUERY_BASE_URL}/1/sales/${paymentId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          MerchantId: CIELO_MERCHANT_ID,
          MerchantKey: CIELO_MERCHANT_KEY
        }
      }
    );

    return {
      sucesso: true,
      status: response.data.Payment.Status,
      dadosCompletos: response.data
    };
  } catch (error) {
    logCielo('Consult error', {
      paymentId,
      payload: error.response?.data
    });
    console.error('Erro ao consultar pagamento Cielo:', error.response?.data || error.message);

    return {
      sucesso: false,
      erro: error.message,
      dadosCompletos: error.response?.data
    };
  }
}

/**
 * Registrar transação no banco de dados
 */
async function registrarTransacao(registrationId, tipo, status, dados) {
  return PaymentTransaction.create({
    id: uuid.v4(),
    registrationId,
    transactionType: tipo,
    status,
    cieloPaymentId: dados.paymentId || null,
    amount: dados.amount || null,
    responseData: dados.dadosCompletos || null,
    errorMessage: dados.erro || null
  });
}

/**
 * Mapear status Cielo para status do sistema
 */
function mapearStatusCielo(statusCielo) {
  const statusMap = {
    0: 'pending', // NotFinished
    1: 'authorized', // Authorized
    2: 'confirmed', // PaymentConfirmed
    3: 'denied', // Denied
    10: 'cancelled', // Voided
    11: 'refunded', // Refunded
    12: 'pending', // Pending
    13: 'cancelled' // Aborted
  };

  if (typeof statusCielo === 'string') {
    const trimmed = statusCielo.trim();
    if (trimmed === '') return 'pending';
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber)) {
      return statusMap[asNumber] || 'pending';
    }
    const normalized = trimmed.toLowerCase();
    const statusMapText = {
      notfinished: 'pending',
      authorized: 'authorized',
      paymentconfirmed: 'confirmed',
      denied: 'denied',
      voided: 'cancelled',
      refunded: 'refunded',
      pending: 'pending',
      aborted: 'cancelled'
    };
    return statusMapText[normalized] || 'pending';
  }

  return statusMap[statusCielo] || 'pending';
}

/**
 * Converter valor de reais para centavos
 */
function converterParaCentavos(valorReais) {
  return Math.round(parseFloat(valorReais) * 100);
}

/**
 * Converter valor de centavos para reais
 */
function converterParaReais(valorCentavos) {
  return (parseInt(valorCentavos, 10) / 100).toFixed(2);
}

/**
 * Detectar bandeira do cartão pelo número
 */
function detectarBandeira(cardNumber) {
  const numero = cardNumber.replace(/\D/g, '');

  // Visa: começa com 4
  if (/^4/.test(numero)) {
    return 'Visa';
  }

  // Mastercard: começa com 51-55 ou 2221-2720
  if (/^5[1-5]/.test(numero) || /^2[2-7]/.test(numero)) {
    return 'Master';
  }

  // Amex: começa com 34 ou 37
  if (/^3[47]/.test(numero)) {
    return 'Amex';
  }

  // Elo: começa com 636368, 438935, 504175, 451416, 636297, 5067, 4576, 4011
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(numero)) {
    return 'Elo';
  }

  // Diners: começa com 36 ou 38 ou 30[0-5]
  if (/^3[068]/.test(numero) || /^30[0-5]/.test(numero)) {
    return 'Diners';
  }

  // Discover: começa com 6011, 622126-622925, 644-649, 65
  if (/^(6011|65|64[4-9]|622)/.test(numero)) {
    return 'Discover';
  }

  // JCB: começa com 35
  if (/^35/.test(numero)) {
    return 'JCB';
  }

  // Hipercard: começa com 606282
  if (/^606282/.test(numero)) {
    return 'Hipercard';
  }

  // Padrão: Visa
  return 'Visa';
}

function normalizeCardBrand(brand) {
  if (!brand) return null;
  const raw = String(brand).trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  const mapping = {
    visa: 'Visa',
    master: 'Master',
    mastercard: 'Master',
    amex: 'Amex',
    elo: 'Elo',
    diners: 'Diners',
    discover: 'Discover',
    jcb: 'JCB',
    hipercard: 'Hipercard'
  };
  return mapping[normalized] || raw;
}

function extrairBandeiraCartao(payload = {}) {
  if (!payload) {
    return null;
  }

  let parsedPayload = payload;
  if (typeof payload === 'string') {
    try {
      parsedPayload = JSON.parse(payload);
    } catch (error) {
      return null;
    }
  }

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return null;
  }

  const root = parsedPayload?.dadosCompletos && typeof parsedPayload.dadosCompletos === 'object'
    ? parsedPayload.dadosCompletos
    : parsedPayload?.responseData && typeof parsedPayload.responseData === 'object'
      ? parsedPayload.responseData
      : parsedPayload;

  const candidates = [
    // Formato padrão Cielo informado: Payment.CreditCard.Brand
    root?.Payment?.CreditCard?.Brand,
    root?.Payment?.Brand,
    root?.Payment?.CardBrand,
    root?.CreditCard?.Brand,
    root?.creditCard?.brand,
    root?.brand
  ];

  const found = candidates.find((item) => item && String(item).trim());
  return normalizeCardBrand(found);
}

module.exports = {
  criarTransacao,
  criarTransacaoPix,
  capturarPagamento,
  cancelarPagamento,
  estornarPagamento,
  consultarPagamento,
  registrarTransacao,
  mapearStatusCielo,
  converterParaCentavos,
  converterParaReais,
  detectarBandeira,
  normalizeCardBrand,
  extrairBandeiraCartao
};
