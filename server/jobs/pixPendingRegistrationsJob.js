/* eslint-disable no-await-in-loop, no-restricted-syntax */
const { Op } = require('sequelize');
const { Registration, RegistrationPayment } = require('../models');
const registrationService = require('../services/registrationService');

const parsedThreshold = Number(process.env.PIX_PENDING_TIMEOUT_MINUTES);
const PIX_PENDING_TIMEOUT_MINUTES = Number.isFinite(parsedThreshold) && parsedThreshold > 0
  ? parsedThreshold
  : 10;

const parsedInterval = Number(process.env.PIX_PENDING_CHECK_INTERVAL_MS);
const PIX_PENDING_CHECK_INTERVAL_MS = Number.isFinite(parsedInterval) && parsedInterval > 0
  ? parsedInterval
  : 2 * 60 * 1000;

const parsedInitialDelay = Number(process.env.PIX_PENDING_INITIAL_DELAY_MS);
const PIX_PENDING_INITIAL_DELAY_MS = Number.isFinite(parsedInitialDelay) && parsedInitialDelay >= 0
  ? parsedInitialDelay
  : 15 * 1000;

const parsedConcurrency = Number(process.env.PIX_PENDING_JOB_CONCURRENCY);
const PIX_PENDING_JOB_CONCURRENCY = Number.isFinite(parsedConcurrency) && parsedConcurrency > 0
  ? parsedConcurrency
  : 1;

const parsedBatchSize = Number(process.env.PIX_PENDING_JOB_BATCH_SIZE);
const PIX_PENDING_JOB_BATCH_SIZE = Number.isFinite(parsedBatchSize) && parsedBatchSize > 0
  ? parsedBatchSize
  : 10;

let running = false;

async function runWithConcurrency(items, worker, limit = 1) {
  const concurrency = Math.max(1, Number(limit) || 1);
  const executing = new Set();
  const errors = [];

  for (const item of items) {
    const task = Promise.resolve()
      .then(() => worker(item))
      .catch((error) => {
        errors.push(error);
      })
      .finally(() => executing.delete(task));

    executing.add(task);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);

  if (errors.length) {
    const error = new Error('Falha ao processar um ou mais itens do job PIX pendente');
    error.causes = errors;
    throw error;
  }
}

async function checkPixPendingRegistrations() {
  if (running) {
    console.info('[pixPendingJob] Execucao anterior ainda em andamento, pulando este ciclo');
    return;
  }

  if (PIX_PENDING_TIMEOUT_MINUTES <= 0) {
    return;
  }

  running = true;

  try {
    const cutoff = new Date(Date.now() - PIX_PENDING_TIMEOUT_MINUTES * 60 * 1000);
    const pending = await Registration.findAll({
      where: {
        paymentMethod: 'pix',
        paymentStatus: 'pending',
        createdAt: { [Op.lt]: cutoff }
      },
      attributes: [
        'id',
        'orderCode',
        'eventId',
        'quantity',
        'finalPrice',
        'paymentId',
        'paymentStatus',
        'paymentMethod',
        'pixQrCode',
        'pixQrCodeBase64',
        'pixTransactionId',
        'pixEndToEndId',
        'cieloResponse',
        'createdAt',
      ],
      order: [['createdAt', 'ASC']],
      limit: PIX_PENDING_JOB_BATCH_SIZE
    });

    if (!pending.length) {
      return;
    }

    await runWithConcurrency(pending, async (registration) => {
      try {
        await registrationService.atualizarStatusPagamentoPorPagamentos(registration);
      } catch (error) {
        console.error(`[pixPendingJob] Falha ao validar pagamento PIX para ${registration.orderCode}`, error);
      }

      if (registration.paymentStatus !== 'pending') {
        console.info(`[pixPendingJob] Inscricao ${registration.orderCode} ja atualizada para ${registration.paymentStatus}`);
        return;
      }

      const [expiredPayments] = await RegistrationPayment.update(
        {
          status: 'expired',
          notes: `Expirado automaticamente apos ${PIX_PENDING_TIMEOUT_MINUTES} minutos pendente`
        },
        {
          where: {
            registrationId: registration.id,
            status: 'pending'
          }
        }
      );

      if (expiredPayments > 0) {
        await registrationService.atualizarStatusPagamentoPorPagamentos(registration);
      }

      console.info(`[pixPendingJob] Inscricao ${registration.orderCode} recalculada para ${registration.paymentStatus} apos expiracao de PIX pendente`);
    }, PIX_PENDING_JOB_CONCURRENCY);
  } finally {
    running = false;
  }
}

async function scheduleNextRun() {
  await checkPixPendingRegistrations().catch((error) => {
    console.error('[pixPendingJob] Erro ao verificar inscricoes PIX pendentes', error);
  });

  setTimeout(scheduleNextRun, PIX_PENDING_CHECK_INTERVAL_MS);
}

function startPixPendingJob() {
  if (process.env.DISABLE_PIX_PENDING_JOB === 'true') {
    console.info('[pixPendingJob] Desativado via DISABLE_PIX_PENDING_JOB=true');
    return;
  }

  if (PIX_PENDING_TIMEOUT_MINUTES <= 0) {
    console.warn('[pixPendingJob] Tempo limite invalido, job nao iniciado');
    return;
  }

  setTimeout(scheduleNextRun, PIX_PENDING_INITIAL_DELAY_MS);
}

module.exports = {
  startPixPendingJob
};
