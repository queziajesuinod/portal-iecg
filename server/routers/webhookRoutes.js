const express = require('express');
const router = express.Router();
const { Registration, PaymentTransaction } = require('../models');
const paymentService = require('../services/paymentService');

/**
 * Webhook da Cielo para notificações de mudança de status
 * POST /api/webhooks/cielo
 */
router.post('/cielo', async (req, res) => {
  try {
    console.log('[Webhook Cielo] Recebido:', JSON.stringify(req.body, null, 2));

    const { PaymentId, ChangeType } = req.body;

    if (!PaymentId) {
      console.error('[Webhook Cielo] PaymentId não fornecido');
      return res.status(400).json({ message: 'PaymentId é obrigatório' });
    }

    // Buscar inscrição pelo PaymentId da Cielo
    const registration = await Registration.findOne({
      where: { cieloPaymentId: PaymentId }
    });

    if (!registration) {
      console.error(`[Webhook Cielo] Inscrição não encontrada para PaymentId: ${PaymentId}`);
      return res.status(404).json({ message: 'Inscrição não encontrada' });
    }

    console.log(`[Webhook Cielo] Inscrição encontrada: ${registration.orderCode}`);

    // Consultar status atualizado na Cielo
    const statusCielo = await paymentService.consultarPagamento(PaymentId);
    const novoStatus = paymentService.mapearStatusCielo(statusCielo.Status);

    console.log(`[Webhook Cielo] Status atual: ${registration.paymentStatus} -> Novo status: ${novoStatus}`);

    // Atualizar status da inscrição
    await registration.update({
      paymentStatus: novoStatus,
      cieloResponse: statusCielo
    });

    // Registrar transação de webhook
    await PaymentTransaction.create({
      id: require('uuid').v4(),
      registrationId: registration.id,
      transactionType: 'webhook',
      amount: registration.finalPrice,
      status: 'success',
      cieloPaymentId: PaymentId,
      cieloResponse: {
        changeType: ChangeType,
        status: statusCielo.Status,
        receivedAt: new Date()
      }
    });

    console.log(`[Webhook Cielo] Inscrição ${registration.orderCode} atualizada com sucesso`);

    // Responder com sucesso
    res.status(200).json({
      success: true,
      message: 'Webhook processado com sucesso',
      orderCode: registration.orderCode,
      newStatus: novoStatus
    });

  } catch (error) {
    console.error('[Webhook Cielo] Erro ao processar:', error);
    
    // Mesmo em caso de erro, retornar 200 para evitar reenvios
    res.status(200).json({
      success: false,
      message: 'Erro ao processar webhook',
      error: error.message
    });
  }
});

/**
 * Endpoint de teste para simular webhook
 * POST /api/webhooks/cielo/test
 */
router.post('/cielo/test', async (req, res) => {
  try {
    const { orderCode, newStatus } = req.body;

    if (!orderCode || !newStatus) {
      return res.status(400).json({ message: 'orderCode e newStatus são obrigatórios' });
    }

    const registration = await Registration.findOne({
      where: { orderCode }
    });

    if (!registration) {
      return res.status(404).json({ message: 'Inscrição não encontrada' });
    }

    await registration.update({
      paymentStatus: newStatus
    });

    res.status(200).json({
      success: true,
      message: 'Status atualizado com sucesso (teste)',
      orderCode: registration.orderCode,
      oldStatus: registration.paymentStatus,
      newStatus
    });

  } catch (error) {
    console.error('[Webhook Test] Erro:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
