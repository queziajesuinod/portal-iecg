const axios = require('axios');

// Configurações Cielo
const CIELO_API_URL = process.env.CIELO_API_URL || 'https://apisandbox.cieloecommerce.cielo.com.br';
const CIELO_MERCHANT_ID = process.env.CIELO_MERCHANT_ID;
const CIELO_MERCHANT_KEY = process.env.CIELO_MERCHANT_KEY;

/**
 * Criar transação PIX via Cielo
 * @param {Object} data - Dados da transação
 * @param {number} data.amount - Valor em centavos (ex: 10000 = R$ 100,00)
 * @param {string} data.merchantOrderId - ID único do pedido
 * @param {Object} data.customer - Dados do cliente
 * @returns {Promise<Object>} - Resposta da Cielo com QR Code
 */
async function criarTransacaoPix(data) {
  if (!CIELO_MERCHANT_ID || !CIELO_MERCHANT_KEY) {
    throw new Error('Credenciais Cielo não configuradas. Configure CIELO_MERCHANT_ID e CIELO_MERCHANT_KEY no .env');
  }

  try {
    const response = await axios.post(
      `${CIELO_API_URL}/1/sales/`,
      {
        MerchantOrderId: data.merchantOrderId,
        Customer: {
          Name: data.customer.name,
          Email: data.customer.email,
          Identity: data.customer.document,
          IdentityType: data.customer.document.length === 11 ? 'CPF' : 'CNPJ',
        },
        Payment: {
          Type: 'Pix',
          Amount: data.amount,
          Provider: 'Cielo30',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          MerchantId: CIELO_MERCHANT_ID,
          MerchantKey: CIELO_MERCHANT_KEY,
        },
      }
    );

    return {
      success: true,
      paymentId: response.data.Payment.PaymentId,
      qrCodeBase64: response.data.Payment.QrCodeBase64Image,
      qrCodeString: response.data.Payment.QrCodeString,
      status: response.data.Payment.Status,
    };
  } catch (error) {
    console.error('Erro ao criar transação PIX:', error.response?.data || error.message);
    throw new Error('Erro ao processar pagamento PIX');
  }
}

/**
 * Criar transação com cartão de crédito via Cielo
 * @param {Object} data - Dados da transação
 * @returns {Promise<Object>} - Resposta da Cielo
 */
async function criarTransacaoCartao(data) {
  if (!CIELO_MERCHANT_ID || !CIELO_MERCHANT_KEY) {
    throw new Error('Credenciais Cielo não configuradas');
  }

  try {
    const response = await axios.post(
      `${CIELO_API_URL}/1/sales/`,
      {
        MerchantOrderId: data.merchantOrderId,
        Customer: {
          Name: data.customer.name,
          Email: data.customer.email,
        },
        Payment: {
          Type: 'CreditCard',
          Amount: data.amount,
          Installments: data.installments || 1,
          SoftDescriptor: data.softDescriptor || 'IECG',
          CreditCard: {
            CardNumber: data.card.number,
            Holder: data.card.holder,
            ExpirationDate: data.card.expirationDate,
            SecurityCode: data.card.securityCode,
            Brand: data.card.brand || 'Visa',
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          MerchantId: CIELO_MERCHANT_ID,
          MerchantKey: CIELO_MERCHANT_KEY,
        },
      }
    );

    return {
      success: response.data.Payment.Status === 2, // 2 = Autorizado
      paymentId: response.data.Payment.PaymentId,
      status: response.data.Payment.Status,
      returnCode: response.data.Payment.ReturnCode,
      returnMessage: response.data.Payment.ReturnMessage,
    };
  } catch (error) {
    console.error('Erro ao processar cartão:', error.response?.data || error.message);
    throw new Error('Erro ao processar pagamento com cartão');
  }
}

/**
 * Consultar status de uma transação
 * @param {string} paymentId - ID do pagamento na Cielo
 * @returns {Promise<Object>} - Status da transação
 */
async function consultarTransacao(paymentId) {
  if (!CIELO_MERCHANT_ID || !CIELO_MERCHANT_KEY) {
    throw new Error('Credenciais Cielo não configuradas');
  }

  try {
    const response = await axios.get(
      `${CIELO_API_URL}/1/sales/${paymentId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          MerchantId: CIELO_MERCHANT_ID,
          MerchantKey: CIELO_MERCHANT_KEY,
        },
      }
    );

    return {
      paymentId: response.data.Payment.PaymentId,
      status: response.data.Payment.Status,
      amount: response.data.Payment.Amount,
    };
  } catch (error) {
    console.error('Erro ao consultar transação:', error.response?.data || error.message);
    throw new Error('Erro ao consultar status do pagamento');
  }
}

module.exports = {
  criarTransacaoPix,
  criarTransacaoCartao,
  consultarTransacao,
};
