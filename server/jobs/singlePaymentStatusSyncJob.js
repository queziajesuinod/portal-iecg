/* eslint-disable no-await-in-loop, no-restricted-syntax */
const { Op } = require('sequelize');
const { Registration, RegistrationPayment, Event } = require('../models');
const registrationService = require('../services/registrationService');

const parsedInterval = Number(process.env.SINGLE_PAYMENT_STATUS_CHECK_INTERVAL_MS);
const SINGLE_PAYMENT_STATUS_CHECK_INTERVAL_MS = Number.isFinite(parsedInterval) && parsedInterval > 0
  ? parsedInterval
  : 5 * 60 * 1000;

const parsedInitialDelay = Number(process.env.SINGLE_PAYMENT_STATUS_INITIAL_DELAY_MS);
const SINGLE_PAYMENT_STATUS_INITIAL_DELAY_MS = Number.isFinite(parsedInitialDelay) && parsedInitialDelay >= 0
  ? parsedInitialDelay
  : 45 * 1000;

const parsedConcurrency = Number(process.env.SINGLE_PAYMENT_STATUS_JOB_CONCURRENCY);
const SINGLE_PAYMENT_STATUS_JOB_CONCURRENCY = Number.isFinite(parsedConcurrency) && parsedConcurrency > 0
  ? parsedConcurrency
  : 2;

const TARGET_PAYMENT_STATUSES = ['expired'];
const FINAL_REGISTRATION_STATUSES = new Set(['cancelled', 'refunded']);

let running = false;

async function runWithConcurrency(items, worker, limit = 1) {
  const concurrency = Math.max(1, Number(limit) || 1);
  const executing = new Set();

  for (const item of items) {
    const task = Promise.resolve()
      .then(() => worker(item))
      .finally(() => executing.delete(task));

    executing.add(task);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}

async function checkSinglePaymentStatus() {
  if (running) {
    console.info('[singlePaymentStatusJob] Execucao anterior ainda em andamento, pulando este ciclo');
    return;
  }

  running = true;

  try {
    const payments = await RegistrationPayment.findAll({
      where: {
        status: { [Op.in]: TARGET_PAYMENT_STATUSES },
        providerPaymentId: { [Op.ne]: null }
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Registration,
          as: 'registration',
          required: true,
          include: [
            {
              model: Event,
              as: 'event',
              attributes: ['id', 'registrationPaymentMode']
            }
          ]
        }
      ]
    });

    if (!payments.length) {
      return;
    }

    const uniqueRegistrations = new Map();

    payments.forEach((payment) => {
      const { registration } = payment;
      if (!registration) {
        return;
      }

      if (FINAL_REGISTRATION_STATUSES.has(registration.paymentStatus)) {
        return;
      }

      const existing = uniqueRegistrations.get(registration.id);
      if (!existing || payment.createdAt > existing.payment.createdAt) {
        uniqueRegistrations.set(registration.id, { registration, payment });
      }
    });

    if (!uniqueRegistrations.size) {
      return;
    }

    await runWithConcurrency([...uniqueRegistrations.values()], async ({ registration }) => {
      const statusAnterior = registration.paymentStatus;
      await registrationService.atualizarStatusPagamentoPorPagamentos(registration);
      if (registration.paymentStatus !== statusAnterior) {
        console.info(`[singlePaymentStatusJob] Inscricao ${registration.orderCode} recalculada para ${registration.paymentStatus}`);
      }
    }, SINGLE_PAYMENT_STATUS_JOB_CONCURRENCY);
  } finally {
    running = false;
  }
}

async function scheduleNextRun() {
  await checkSinglePaymentStatus().catch((error) => {
    console.error('[singlePaymentStatusJob] Falha ao atualizar status de inscricao unica', error);
  });
  setTimeout(scheduleNextRun, SINGLE_PAYMENT_STATUS_CHECK_INTERVAL_MS);
}

function startSinglePaymentStatusJob() {
  if (process.env.DISABLE_SINGLE_PAYMENT_STATUS_JOB === 'true') {
    console.info('[singlePaymentStatusJob] Desativado via DISABLE_SINGLE_PAYMENT_STATUS_JOB=true');
    return;
  }

  if (SINGLE_PAYMENT_STATUS_CHECK_INTERVAL_MS <= 0) {
    console.warn('[singlePaymentStatusJob] Intervalo invalido, job nao iniciado');
    return;
  }

  setTimeout(scheduleNextRun, SINGLE_PAYMENT_STATUS_INITIAL_DELAY_MS);
}

module.exports = {
  startSinglePaymentStatusJob
};
