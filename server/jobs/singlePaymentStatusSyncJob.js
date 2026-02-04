const { Op } = require('sequelize');
const { Registration, RegistrationPayment, Event } = require('../models');
const registrationService = require('../services/registrationService');

const parsedInterval = Number(process.env.SINGLE_PAYMENT_STATUS_CHECK_INTERVAL_MS);
const SINGLE_PAYMENT_STATUS_CHECK_INTERVAL_MS = Number.isFinite(parsedInterval) && parsedInterval > 0
  ? parsedInterval
  : 5 * 60 * 1000;
const TARGET_PAYMENT_STATUSES = ['expired', 'denied'];
const FINAL_REGISTRATION_STATUSES = new Set(['expired', 'denied', 'cancelled', 'refunded']);

async function checkSinglePaymentStatus() {
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
    const registration = payment.registration;
    if (!registration) {
      return;
    }

    const eventMode = (registration.event?.registrationPaymentMode || 'SINGLE').toUpperCase();
    if (eventMode !== 'SINGLE') {
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

  await Promise.all([...uniqueRegistrations.values()].map(async ({ registration, payment }) => {
    const targetStatus = payment.status;
    if (registration.paymentStatus === targetStatus) {
      return;
    }

    const statusAnterior = registration.paymentStatus;
    registration.paymentStatus = targetStatus;
    await registration.save();
    await registrationService.ajustarContadoresDeStatus(registration, statusAnterior);
    console.info(`[singlePaymentStatusJob] Inscrição ${registration.orderCode} atualizada para ${targetStatus}`);
  }));
}

async function scheduleNextRun() {
  await checkSinglePaymentStatus().catch((error) => {
    console.error('[singlePaymentStatusJob] Falha ao atualizar status de inscrição única', error);
  });
  setTimeout(scheduleNextRun, SINGLE_PAYMENT_STATUS_CHECK_INTERVAL_MS);
}

function startSinglePaymentStatusJob() {
  if (process.env.DISABLE_SINGLE_PAYMENT_STATUS_JOB === 'true') {
    console.info('[singlePaymentStatusJob] Desativado via DISABLE_SINGLE_PAYMENT_STATUS_JOB=true');
    return;
  }

  if (SINGLE_PAYMENT_STATUS_CHECK_INTERVAL_MS <= 0) {
    console.warn('[singlePaymentStatusJob] Intervalo inválido, job não iniciado');
    return;
  }

  scheduleNextRun();
}

module.exports = {
  startSinglePaymentStatusJob
};
