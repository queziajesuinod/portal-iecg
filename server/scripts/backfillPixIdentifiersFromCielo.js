/* eslint-disable no-console */
const { Op } = require('sequelize');
const {
  sequelize,
  Registration,
  RegistrationPayment
} = require('../models');
const paymentService = require('../services/paymentService');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const allowNonProduction = args.includes('--allow-non-production');
const environment = process.env.CIELO_ENVIRONMENT || 'sandbox';
const sleepArg = args.find((arg) => arg.startsWith('--sleep-ms='));
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const paymentIdArg = args.find((arg) => arg.startsWith('--payment-id='));
const registrationIdArg = args.find((arg) => arg.startsWith('--registration-id='));

const sleepMs = sleepArg ? Number(sleepArg.split('=')[1]) : 250;
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
const paymentIdFilter = paymentIdArg ? paymentIdArg.split('=')[1] : null;
const registrationIdFilter = registrationIdArg ? registrationIdArg.split('=')[1] : null;

function isBlank(value) {
  return value === null || value === undefined || value === '';
}

function sleep(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPixIdentifierUpdate(current, identifiers, qrCode) {
  const update = {};

  if (isBlank(current.pixTransactionId) && identifiers.txid) {
    update.pixTransactionId = identifiers.txid;
  }

  if (isBlank(current.pixEndToEndId) && identifiers.endToEndId) {
    update.pixEndToEndId = identifiers.endToEndId;
  }

  if (isBlank(current.pixQrCode) && qrCode.qrCodeString) {
    update.pixQrCode = qrCode.qrCodeString;
  }

  if (isBlank(current.pixQrCodeBase64) && qrCode.qrCodeBase64) {
    update.pixQrCodeBase64 = qrCode.qrCodeBase64;
  }

  return update;
}

function selectBestPixPayment(registration, payments) {
  if (!payments.length) {
    return null;
  }

  if (registration.paymentId) {
    const matchedByPaymentId = payments.find((payment) => payment.providerPaymentId === registration.paymentId);
    if (matchedByPaymentId) {
      return matchedByPaymentId;
    }
  }

  const withIdentifiers = payments.filter((payment) => payment.pixTransactionId || payment.pixEndToEndId);
  if (withIdentifiers.length) {
    return withIdentifiers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }

  return payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

function buildCandidateWhere() {
  const where = {
    provider: 'cielo',
    method: 'pix',
    providerPaymentId: { [Op.ne]: null },
    [Op.or]: [
      { pixTransactionId: null },
      { pixTransactionId: '' },
      { pixEndToEndId: null },
      { pixEndToEndId: '' }
    ]
  };

  if (paymentIdFilter) {
    where.providerPaymentId = paymentIdFilter;
  }

  if (registrationIdFilter) {
    where.registrationId = registrationIdFilter;
  }

  return where;
}

async function consultarECorrigirPagamentos() {
  const queryOptions = {
    where: buildCandidateWhere(),
    include: [
      {
        model: Registration,
        as: 'registration',
        attributes: [
          'id',
          'orderCode',
          'paymentId',
          'paymentMethod',
          'pixTransactionId',
          'pixEndToEndId',
          'pixQrCode',
          'pixQrCodeBase64',
          'cieloResponse'
        ],
        required: false
      }
    ],
    order: [['createdAt', 'ASC']]
  };

  if (Number.isFinite(limit) && limit > 0) {
    queryOptions.limit = limit;
  }

  const payments = await RegistrationPayment.findAll(queryOptions);

  console.log(`Ambiente Cielo atual: ${environment}`);
  console.log(`Pagamentos Pix candidatos para consulta na Cielo: ${payments.length}`);
  if (!payments.length) {
    return {
      candidates: 0,
      consulted: 0,
      paymentUpdated: 0,
      registrationUpdated: 0,
      missingIdentifiers: 0,
      failed: 0
    };
  }

  let consulted = 0;
  let paymentUpdated = 0;
  let registrationUpdated = 0;
  let missingIdentifiers = 0;
  let failed = 0;

  for (const payment of payments) {
    consulted += 1;
    console.log(`Consultando PaymentId ${payment.providerPaymentId} (${consulted}/${payments.length})`);

    const consulta = await paymentService.consultarPagamento(payment.providerPaymentId);
    if (!consulta.sucesso) {
      failed += 1;
      console.warn(`Falha ao consultar ${payment.providerPaymentId}: ${consulta.erro}`);
      await sleep(sleepMs);
      continue;
    }

    const identifiers = paymentService.extrairPixIdentifiers(consulta.dadosCompletos);
    const qrCode = paymentService.extrairPixQrCode(consulta.dadosCompletos);
    const paymentUpdate = buildPixIdentifierUpdate(payment, identifiers, qrCode);

    if (!identifiers.txid && !identifiers.endToEndId) {
      missingIdentifiers += 1;
    }

    if (!isDryRun && (Object.keys(paymentUpdate).length || consulta.dadosCompletos)) {
      await payment.update({
        ...paymentUpdate,
        providerPayload: consulta.dadosCompletos || payment.providerPayload
      });
    }
    if (Object.keys(paymentUpdate).length) {
      paymentUpdated += 1;
      Object.assign(payment, paymentUpdate);
    }

    const registration = payment.registration;
    if (registration) {
      const registrationUpdate = buildPixIdentifierUpdate(registration, identifiers, qrCode);
      const shouldAttachPayload = registration.paymentId === payment.providerPaymentId
        || registration.paymentMethod === 'pix';

      if (!isDryRun && (Object.keys(registrationUpdate).length || shouldAttachPayload)) {
        await registration.update({
          ...registrationUpdate,
          ...(shouldAttachPayload ? { cieloResponse: consulta.dadosCompletos || registration.cieloResponse } : {})
        });
      }

      if (Object.keys(registrationUpdate).length) {
        registrationUpdated += 1;
      }
    }

    await sleep(sleepMs);
  }

  return {
    candidates: payments.length,
    consulted,
    paymentUpdated,
    registrationUpdated,
    missingIdentifiers,
    failed
  };
}

async function sincronizarInscricoesAPartirDosPagamentos() {
  const where = {
    [Op.or]: [
      { pixTransactionId: null },
      { pixTransactionId: '' },
      { pixEndToEndId: null },
      { pixEndToEndId: '' }
    ]
  };

  if (registrationIdFilter) {
    where.id = registrationIdFilter;
  }

  const registrations = await Registration.findAll({
    where,
    include: [
      {
        model: RegistrationPayment,
        as: 'payments',
        required: true,
        where: {
          provider: 'cielo',
          method: 'pix',
          providerPaymentId: { [Op.ne]: null }
        },
        attributes: [
          'id',
          'providerPaymentId',
          'pixTransactionId',
          'pixEndToEndId',
          'pixQrCode',
          'pixQrCodeBase64',
          'createdAt'
        ]
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  let updated = 0;
  let skipped = 0;

  for (const registration of registrations) {
    const selectedPayment = selectBestPixPayment(registration, registration.payments || []);
    if (!selectedPayment) {
      skipped += 1;
      continue;
    }

    const update = buildPixIdentifierUpdate(registration, {
      txid: selectedPayment.pixTransactionId,
      endToEndId: selectedPayment.pixEndToEndId
    }, {
      qrCodeString: selectedPayment.pixQrCode,
      qrCodeBase64: selectedPayment.pixQrCodeBase64
    });

    if (!Object.keys(update).length) {
      skipped += 1;
      continue;
    }

    if (!isDryRun) {
      await registration.update(update);
    }
    updated += 1;
  }

  return { updated, skipped };
}

async function run() {
  if (!process.env.CIELO_MERCHANT_ID || !process.env.CIELO_MERCHANT_KEY) {
    throw new Error('Credenciais Cielo nao configuradas. Defina CIELO_MERCHANT_ID e CIELO_MERCHANT_KEY.');
  }

  if (environment !== 'production' && !allowNonProduction) {
    throw new Error('Este backfill foi pensado para ambiente real. Use CIELO_ENVIRONMENT=production ou passe --allow-non-production conscientemente.');
  }

  if (isDryRun) {
    console.log('Dry-run ativo. Nenhuma atualizacao sera aplicada.');
  }

  const consultaResult = await consultarECorrigirPagamentos();
  const registrationResult = await sincronizarInscricoesAPartirDosPagamentos();

  console.log(`Pagamentos candidatos: ${consultaResult.candidates}`);
  console.log(`Pagamentos consultados na Cielo: ${consultaResult.consulted}`);
  console.log(`Pagamentos com campos preenchidos: ${consultaResult.paymentUpdated}`);
  console.log(`Inscricoes com campos preenchidos durante consulta: ${consultaResult.registrationUpdated}`);
  console.log(`Consultas sem txid/EndToEndId na resposta: ${consultaResult.missingIdentifiers}`);
  console.log(`Consultas com falha: ${consultaResult.failed}`);
  console.log(`Inscricoes sincronizadas a partir dos pagamentos: ${registrationResult.updated}`);
  console.log(`Inscricoes sem alteracao na sincronizacao final: ${registrationResult.skipped}`);
}

run()
  .catch((error) => {
    console.error('Erro no backfill Pix consultando a Cielo:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
