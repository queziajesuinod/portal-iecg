/**
 * Script de Teste E2E - Fluxo Completo de Pagamento PIX
 * 
 * Este script testa o fluxo completo:
 * 1. Criar evento com formas de pagamento
 * 2. Criar inscrição com PIX
 * 3. Simular webhook Cielo
 * 4. Verificar atualização de status
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuração
const API_URL = process.env.API_URL || 'http://localhost:3005';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // Token de autenticação admin

// Cliente HTTP
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Cliente autenticado (admin)
const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`
  }
});

// Utilitários
const log = {
  info: (msg) => console.log(chalk.blue('ℹ️ '), msg),
  success: (msg) => console.log(chalk.green('✅'), msg),
  error: (msg) => console.log(chalk.red('❌'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠️ '), msg),
  step: (num, msg) => console.log(chalk.cyan(`\n📍 Etapa ${num}:`), chalk.bold(msg))
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Dados de teste
const testData = {
  event: {
    title: `Evento Teste E2E - ${Date.now()}`,
    description: 'Evento criado automaticamente para teste E2E',
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
    endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Local de Teste',
    maxRegistrations: 100,
    maxPerBuyer: 5,
    isActive: true
  },
  batch: {
    name: 'Lote Único',
    price: 100.00,
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
      nome: 'João da Silva',
      email: 'joao.teste@example.com',
      cpf: '12345678901',
      telefone: '11999999999'
    },
    attendeesData: [
      {
        nome: 'João da Silva',
        email: 'joao.teste@example.com'
      }
    ]
  }
};

// Variáveis globais do teste
let eventId, batchId, paymentOptionId, orderCode, paymentId;

/**
 * Etapa 1: Criar Evento
 */
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

/**
 * Etapa 2: Criar Lote
 */
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

/**
 * Etapa 3: Configurar Forma de Pagamento PIX
 */
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

/**
 * Etapa 4: Criar Inscrição com PIX
 */
async function criarInscricao() {
  log.step(4, 'Criando inscrição com pagamento PIX');
  
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
    log.success(`Inscrição criada com código: ${orderCode}`);
    log.info(`Status inicial: ${response.data.registration.paymentStatus}`);
    
    return true;
  } catch (error) {
    log.error(`Erro ao criar inscrição: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * Etapa 5: Consultar Inscrição
 */
async function consultarInscricao() {
  log.step(5, 'Consultando dados da inscrição');
  
  try {
    const response = await api.get(`/api/public/events/registrations/${orderCode}`);
    const registration = response.data;
    
    paymentId = registration.paymentId;
    
    log.success('Dados da inscrição:');
    console.log({
      orderCode: registration.orderCode,
      paymentStatus: registration.paymentStatus,
      paymentMethod: registration.paymentMethod,
      finalPrice: registration.finalPrice,
      paymentId: registration.paymentId,
      pixQrCode: registration.pixQrCode ? '✅ Gerado' : '❌ Não gerado'
    });
    
    return true;
  } catch (error) {
    log.error(`Erro ao consultar inscrição: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Etapa 6: Simular Webhook Cielo
 */
async function simularWebhook() {
  log.step(6, 'Simulando webhook da Cielo');
  
  if (!paymentId) {
    log.warning('PaymentId não disponível, gerando mock');
    paymentId = `mock-payment-${Date.now()}`;
  }
  
  try {
    const webhookPayload = {
      PaymentId: paymentId,
      ChangeType: 1, // Mudança de status
      MerchantOrderId: orderCode
    };
    
    log.info('Payload do webhook:');
    console.log(JSON.stringify(webhookPayload, null, 2));
    
    const response = await api.post('/api/webhooks/cielo', webhookPayload);
    
    log.success('Webhook processado com sucesso!');
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

/**
 * Etapa 7: Verificar Atualização de Status
 */
async function verificarStatus() {
  log.step(7, 'Verificando atualização de status');
  
  // Aguardar um pouco para garantir que o webhook foi processado
  await sleep(1000);
  
  try {
    const response = await api.get(`/api/public/events/registrations/${orderCode}`);
    const registration = response.data;
    
    log.info(`Status atual: ${registration.paymentStatus}`);
    
    if (registration.paymentStatus === 'confirmed') {
      log.success('✅ Status atualizado corretamente para "confirmed"!');
      return true;
    } else if (registration.paymentStatus === 'pending') {
      log.warning('⚠️  Status ainda está "pending" (webhook pode não ter sido processado)');
      return false;
    } else {
      log.error(`❌ Status inesperado: ${registration.paymentStatus}`);
      return false;
    }
  } catch (error) {
    log.error(`Erro ao verificar status: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Limpeza: Deletar dados de teste (opcional)
 */
async function limparDadosTeste() {
  log.step(8, 'Limpando dados de teste (opcional)');
  
  try {
    // Desativar evento ao invés de deletar
    await adminApi.patch(`/api/admin/events/${eventId}`, {
      isActive: false,
      title: `[TESTE CONCLUÍDO] ${testData.event.title}`
    });
    log.success('Evento desativado');
    return true;
  } catch (error) {
    log.warning('Não foi possível limpar dados de teste');
    return false;
  }
}

/**
 * Executar todos os testes
 */
async function executarTestes() {
  console.log(chalk.bold.cyan('\n🧪 TESTE E2E - FLUXO DE PAGAMENTO PIX\n'));
  console.log(chalk.gray('='.repeat(60)));
  
  const results = {
    total: 7,
    passed: 0,
    failed: 0
  };
  
  // Verificar configuração
  if (!ADMIN_TOKEN) {
    log.error('ADMIN_TOKEN não configurado!');
    log.info('Execute: export ADMIN_TOKEN="seu_token_aqui"');
    process.exit(1);
  }
  
  // Executar etapas
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
      results.passed++;
    } else {
      results.failed++;
      log.error('Teste falhou! Abortando...');
      break;
    }
    await sleep(500); // Pequena pausa entre etapas
  }
  
  // Limpar dados (sempre executar)
  await limparDadosTeste();
  
  // Relatório final
  console.log(chalk.gray('\n' + '='.repeat(60)));
  console.log(chalk.bold.cyan('\n📊 RELATÓRIO FINAL\n'));
  
  console.log(`Total de etapas: ${results.total}`);
  console.log(chalk.green(`✅ Passou: ${results.passed}`));
  console.log(chalk.red(`❌ Falhou: ${results.failed}`));
  
  if (results.failed === 0) {
    console.log(chalk.bold.green('\n🎉 TODOS OS TESTES PASSARAM!\n'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red('\n❌ ALGUNS TESTES FALHARAM\n'));
    process.exit(1);
  }
}

// Executar
executarTestes().catch(error => {
  log.error(`Erro fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
