const paymentService = require('./paymentService');

let warningLogged = false;

function logDeprecationWarning() {
  if (warningLogged) {
    return;
  }

  warningLogged = true;
  console.warn('[cieloService] Servico legado em uso. Encaminhando chamadas para paymentService.');
}

async function criarTransacaoPix(data) {
  logDeprecationWarning();

  const response = await paymentService.criarTransacaoPix({
    merchantOrderId: data.merchantOrderId,
    amount: data.amount,
    customerName: data.customer?.name,
    customerEmail: data.customer?.email,
    customerDocument: data.customer?.document
  });

  if (!response.sucesso) {
    throw new Error(response.erro || 'Erro ao processar pagamento PIX');
  }

  return {
    success: true,
    paymentId: response.paymentId,
    qrCodeBase64: response.qrCodeBase64,
    qrCodeString: response.qrCodeString,
    pixTransactionId: response.pixTransactionId || null,
    pixEndToEndId: response.pixEndToEndId || null,
    status: response.status
  };
}

async function criarTransacaoCartao(data) {
  logDeprecationWarning();

  const response = await paymentService.criarTransacao({
    merchantOrderId: data.merchantOrderId,
    amount: data.amount,
    installments: data.installments || 1,
    customerName: data.customer?.name,
    customerEmail: data.customer?.email,
    customerDocument: data.customer?.document,
    cardNumber: data.card?.number,
    holder: data.card?.holder,
    expirationDate: data.card?.expirationDate,
    securityCode: data.card?.securityCode,
    brand: data.card?.brand || 'Visa'
  });

  if (!response.sucesso) {
    throw new Error(response.erro || 'Erro ao processar pagamento com cartao');
  }

  return {
    success: response.sucesso,
    paymentId: response.paymentId,
    status: response.status,
    returnCode: response.returnCode,
    returnMessage: response.returnMessage
  };
}

async function consultarTransacao(paymentId) {
  logDeprecationWarning();

  const response = await paymentService.consultarPagamento(paymentId);
  if (!response.sucesso) {
    throw new Error(response.erro || 'Erro ao consultar status do pagamento');
  }

  return {
    paymentId: response.paymentId || paymentId,
    status: response.status,
    pixTransactionId: response.pixTransactionId || null,
    pixEndToEndId: response.pixEndToEndId || null,
    amount: response.dadosCompletos?.Payment?.Amount || null
  };
}

module.exports = {
  criarTransacaoPix,
  criarTransacaoCartao,
  consultarTransacao
};
