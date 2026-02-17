const { Op } = require('sequelize');
const { Registration, RegistrationPayment, Event } = require('../models');
const registrationService = require('../services/registrationService');

const parsedThreshold = Number(process.env.PIX_PENDING_TIMEOUT_MINUTES);
const PIX_PENDING_TIMEOUT_MINUTES = Number.isFinite(parsedThreshold) && parsedThreshold > 0
  ? parsedThreshold
  : 10;

const parsedInterval = Number(process.env.PIX_PENDING_CHECK_INTERVAL_MS);
const PIX_PENDING_CHECK_INTERVAL_MS = Number.isFinite(parsedInterval) && parsedInterval > 0
  ? parsedInterval
  : 60 * 1000;

async function checkPixPendingRegistrations() {
  if (PIX_PENDING_TIMEOUT_MINUTES <= 0) {
    return;
  }

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
      },
      {
        model: Event,
        as: 'event',
        attributes: ['id', 'registrationPaymentMode']
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  if (!pending.length) {
    return;
  }

  await Promise.all(pending.map(async (registration) => {
    try {
      await registrationService.atualizarStatusPagamentoPorPagamentos(registration);
    } catch (error) {
      console.error(`[pixPendingJob] Falha ao validar pagamento PIX para ${registration.orderCode}`, error);
    }

    await registration.reload({ include: [{ model: RegistrationPayment, as: 'payments' }] });
    if (registration.paymentStatus !== 'pending') {
      console.info(`[pixPendingJob] Inscrição ${registration.orderCode} já atualizada para ${registration.paymentStatus}`);
      return;
    }

    const pendingPayments = registration.payments.filter((payment) => payment.status === 'pending');
    if (pendingPayments.length) {
      await RegistrationPayment.update(
        {
          status: 'expired',
          notes: `Expirado automaticamente após ${PIX_PENDING_TIMEOUT_MINUTES} minutos pendente`
        },
        {
          where: {
            registrationId: registration.id,
            status: 'pending'
          }
        }
      );
    }

    const updatedPayments = await RegistrationPayment.findAll({
      where: { registrationId: registration.id }
    });
    const activeStatuses = new Set(['pending', 'authorized', 'confirmed', 'partial']);
    const hasActivePayment = updatedPayments.some((payment) => activeStatuses.has(payment.status));

    const paymentMode = (registration.event?.registrationPaymentMode || 'SINGLE').toUpperCase();
    const isSinglePayment = paymentMode === 'SINGLE';

    if (!hasActivePayment) {
      const statusAnterior = registration.paymentStatus;
      registration.set('paymentStatus', 'expired');
      await registration.save();
      await registrationService.ajustarContadoresDeStatus(registration, statusAnterior);

      console.info(`[pixPendingJob] Inscrição ${registration.orderCode} expirada automaticamente após ${PIX_PENDING_TIMEOUT_MINUTES} minutos pendente`);
      return;
    }

    if (!isSinglePayment) {
      console.info(`[pixPendingJob] Inscrição ${registration.orderCode} permanece ativa (modo ${paymentMode}); apenas expira o pagamento PIX pendente`);
      return;
    }

    const statusAnterior = registration.paymentStatus;
    registration.set('paymentStatus', 'expired');
    await registration.save();
    await registrationService.ajustarContadoresDeStatus(registration, statusAnterior);

    console.info(`[pixPendingJob] Inscrição ${registration.orderCode} expirada automaticamente após ${PIX_PENDING_TIMEOUT_MINUTES} minutos pendente`);
  }));
}

async function scheduleNextRun() {
  await checkPixPendingRegistrations().catch((error) => {
    console.error('[pixPendingJob] Erro ao verificar inscrições PIX pendentes', error);
  });

  setTimeout(scheduleNextRun, PIX_PENDING_CHECK_INTERVAL_MS);
}

function startPixPendingJob() {
  if (process.env.DISABLE_PIX_PENDING_JOB === 'true') {
    console.info('[pixPendingJob] Desativado via DISABLE_PIX_PENDING_JOB=true');
    return;
  }

  if (PIX_PENDING_TIMEOUT_MINUTES <= 0) {
    console.warn('[pixPendingJob] Tempo limite inválido, job não iniciado');
    return;
  }

  scheduleNextRun();
}

module.exports = {
  startPixPendingJob
};
