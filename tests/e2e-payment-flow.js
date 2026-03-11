/**
 * Script de Teste E2E - Fluxo Completo de Pagamento PIX
 *
 * Este script testa o fluxo completo:
 * 1. Criar evento com formas de pagamento
 * 2. Criar inscricao com PIX
 * 3. Simular webhook Cielo
 * 4. Verificar atualizacao de status e identificadores Pix
 */

const axios = require('axios');
const chalk = require('chalk');

const API_URL = process.env.API_URL || 'http://localhost:3005';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ADMIN_TOKEN}`
  }
});

const log = {
  info: (msg) => console.log(chalk.blue('[info]'), msg),
  success: (msg) => console.log(chalk.green('[ok]'), msg),
  error: (msg) => console.log(chalk.red('[erro]'), msg),
  warning: (msg) => console.log(chalk.yellow('[aviso]'), msg),
  step: (num, msg) => console.log(chalk.cyan(`\n[etapa ${num}]`), chalk.bold(msg))
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const testData = {
  event: {
    title: `Evento Teste E2E - ${Date.now()}`,
    description: 'Evento criado automaticamente para teste E2E',
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Local de Teste',
    maxRegistrations: 100,
    maxPerBuyer: 5,
    isActive: true
  },
  batch: {
    name: 'Lote Unico',
    price: 100.0,
    maxQuantity: 50,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true
  },
  paymentOption: {
    paymentType: 'pix',
    maxInstallments: 1,
    interestRate: 0,
    interestType: 'percentage',
    isActive: true
  },
  registration: {
    buyerData: {
      nome: 'Joao da Silva',
      email: 'joao.teste@example.com',
      cpf: '12345678901',
      telefone: '11999999999'
    },
    attendeesData: [
      {
        nome: 'Joao da Silva',
        email: 'joao.teste@example.com'
      }
    ]
  }
};

let eventId;
let batchId;
let paymentOptionId;
let orderCode;
let paymentId;
let pixTransactionId;
let pixEndToEndId;

async function criarEvento() {
  log.step(1, 'Criando evento de teste');

  try {
    const response = await adminApi.post('/api/admin/events', testData.event);
    eventId = response.data.id;
    log.success(`Evento criado com ID: ${eventId}`);
    return true;
  } catch (error) {
    log.error(`Erro ao criar evento: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function criarLote() {
  log.step(2, 'Criando lote do evento');

  try {
    const response = await adminApi.post(`/api/admin/events/${eventId}/batches`, {
      ...testData.batch,
      eventId
    });
    batchId = response.data.id;
    log.success(`Lote criado com ID: ${batchId}`);
    return true;
  } catch (error) {
    log.error(`Erro ao criar lote: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function configurarPagamentoPix() {
  log.step(3, 'Configurando forma de pagamento PIX');

  try {
    const response = await adminApi.post(`/api/admin/events/${eventId}/payment-options`, {
      ...testData.paymentOption,
      eventId
    });
    paymentOptionId = response.data.id;
    log.success(`Forma de pagamento PIX configurada com ID: ${paymentOptionId}`);
    return true;
  } catch (error) {
    log.error(`Erro ao configurar pagamento: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function criarInscricao() {
  log.step(4, 'Criando inscricao com pagamento PIX');

  try {
    const response = await api.post('/api/public/events/register', {
      eventId,
      batchId,
      quantity: 1,
      buyerData: testData.registration.buyerData,
      attendeesData: testData.registration.attendeesData,
      paymentOptionId,
      paymentData: {}
    });

    orderCode = response.data.orderCode;
    log.success(`Inscricao criada com codigo: ${orderCode}`);
    log.info(`Status inicial: ${response.data.registration.paymentStatus}`);

    return true;
  } catch (error) {
    log.error(`Erro ao criar inscricao: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function consultarInscricao() {
  log.step(5, 'Consultando dados da inscricao');

  try {
    const response = await api.get(`/api/public/events/registrations/${orderCode}`);
    const registration = response.data;

    paymentId = registration.paymentId;
    pixTransactionId = registration.pixTransactionId || null;
    pixEndToEndId = registration.pixEndToEndId || null;

    log.success('Dados da inscricao:');
    console.log({
      orderCode: registration.orderCode,
      paymentStatus: registration.paymentStatus,
      paymentMethod: registration.paymentMethod,
      finalPrice: registration.finalPrice,
      paymentId: registration.paymentId,
      pixTransactionId: registration.pixTransactionId || '(nao retornado ainda)',
      pixEndToEndId: registration.pixEndToEndId || '(nao retornado ainda)',
      pixQrCode: registration.pixQrCode ? 'gerado' : 'nao gerado'
    });

    return true;
  } catch (error) {
    log.error(`Erro ao consultar inscricao: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function simularWebhook() {
  log.step(6, 'Simulando webhook da Cielo');

  if (!paymentId) {
    log.warning('PaymentId nao disponivel, gerando mock');
    paymentId = `mock-payment-${Date.now()}`;
  }

  try {
    const webhookPayload = {
      PaymentId: paymentId,
      ChangeType: 1,
      MerchantOrderId: orderCode
    };

    log.info('Payload do webhook:');
    console.log(JSON.stringify(webhookPayload, null, 2));

    const response = await api.post('/api/webhooks/cielo', webhookPayload);

    log.success('Webhook processado com sucesso');
    console.log({
      success: response.data.success,
      message: response.data.message,
      orderCode: response.data.orderCode,
      status: response.data.status
    });

    return true;
  } catch (error) {
    log.error(`Erro ao processar webhook: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function verificarStatus() {
  log.step(7, 'Verificando atualizacao de status');

  await sleep(1000);

  try {
    const response = await api.get(`/api/public/events/registrations/${orderCode}`);
    const registration = response.data;

    if (registration.pixTransactionId) {
      pixTransactionId = registration.pixTransactionId;
    }
    if (registration.pixEndToEndId) {
      pixEndToEndId = registration.pixEndToEndId;
    }

    log.info(`Status atual: ${registration.paymentStatus}`);
    console.log({
      paymentStatus: registration.paymentStatus,
      paymentId: registration.paymentId,
      pixTransactionId: pixTransactionId || '(nao retornado ainda)',
      pixEndToEndId: pixEndToEndId || '(nao retornado ainda)'
    });

    if (registration.paymentStatus === 'confirmed') {
      log.success('Status atualizado corretamente para confirmed');
      return true;
    }

    if (registration.paymentStatus === 'pending' && (registration.pixTransactionId || registration.pixEndToEndId)) {
      log.warning('Status ainda esta pending, mas os identificadores Pix foram persistidos.');
      return true;
    }

    if (registration.paymentStatus === 'pending') {
      log.warning('Status ainda esta pending e os identificadores Pix nao apareceram.');
      return false;
    }

    log.error(`Status inesperado: ${registration.paymentStatus}`);
    return false;
  } catch (error) {
    log.error(`Erro ao verificar status: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function limparDadosTeste() {
  log.step(8, 'Limpando dados de teste');

  try {
    await adminApi.patch(`/api/admin/events/${eventId}`, {
      isActive: false,
      title: `[TESTE CONCLUIDO] ${testData.event.title}`
    });
    log.success('Evento desativado');
    return true;
  } catch (error) {
    log.warning('Nao foi possivel limpar dados de teste');
    return false;
  }
}

async function executarTestes() {
  console.log(chalk.bold.cyan('\nTESTE E2E - FLUXO DE PAGAMENTO PIX\n'));
  console.log(chalk.gray('='.repeat(60)));

  const results = {
    total: 7,
    passed: 0,
    failed: 0
  };

  if (!ADMIN_TOKEN) {
    log.error('ADMIN_TOKEN nao configurado');
    log.info('Execute: $env:ADMIN_TOKEN="seu_token_aqui"');
    process.exit(1);
  }

  const etapas = [
    criarEvento,
    criarLote,
    configurarPagamentoPix,
    criarInscricao,
    consultarInscricao,
    simularWebhook,
    verificarStatus
  ];

  for (const etapa of etapas) {
    const sucesso = await etapa();
    if (sucesso) {
      results.passed += 1;
    } else {
      results.failed += 1;
      log.error('Teste falhou. Abortando...');
      break;
    }
    await sleep(500);
  }

  await limparDadosTeste();

  console.log(chalk.gray('\n' + '='.repeat(60)));
  console.log(chalk.bold.cyan('\nRELATORIO FINAL\n'));
  console.log(`Total de etapas: ${results.total}`);
  console.log(chalk.green(`Passou: ${results.passed}`));
  console.log(chalk.red(`Falhou: ${results.failed}`));

  if (results.failed === 0) {
    console.log(chalk.bold.green('\nTODOS OS TESTES PASSARAM\n'));
    process.exit(0);
  }

  console.log(chalk.bold.red('\nALGUNS TESTES FALHARAM\n'));
  process.exit(1);
}

executarTestes().catch((error) => {
  log.error(`Erro fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
