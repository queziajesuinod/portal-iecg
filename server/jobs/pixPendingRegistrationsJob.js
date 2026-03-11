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
  : 60 * 1000;

const parsedInitialDelay = Number(process.env.PIX_PENDING_INITIAL_DELAY_MS);
const PIX_PENDING_INITIAL_DELAY_MS = Number.isFinite(parsedInitialDelay) && parsedInitialDelay >= 0
  ? parsedInitialDelay
  : 15 * 1000;

const parsedConcurrency = Number(process.env.PIX_PENDING_JOB_CONCURRENCY);
const PIX_PENDING_JOB_CONCURRENCY = Number.isFinite(parsedConcurrency) && parsedConcurrency > 0
  ? parsedConcurrency
  : 2;

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
      include: [
        {
          model: RegistrationPayment,
          as: 'payments'
        }
      ],
      order: [['createdAt', 'ASC']]
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

      await registration.reload({ include: [{ model: RegistrationPayment, as: 'payments' }] });
      if (registration.paymentStatus !== 'pending') {
        console.info(`[pixPendingJob] Inscricao ${registration.orderCode} ja atualizada para ${registration.paymentStatus}`);
        return;
      }

      const pendingPayments = registration.payments.filter((payment) => payment.status === 'pending');
      if (pendingPayments.length) {
        await RegistrationPayment.update(
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
      }

      await registration.reload({ include: [{ model: RegistrationPayment, as: 'payments' }] });
      await registrationService.atualizarStatusPagamentoPorPagamentos(registration);
      await registration.reload({ include: [{ model: RegistrationPayment, as: 'payments' }] });

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
