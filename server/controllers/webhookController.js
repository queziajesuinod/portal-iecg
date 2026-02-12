const WebhookService = require('../services/WebhookService');
const registrationService = require('../services/registrationService');
const paymentService = require('../services/paymentService');
const { Registration, RegistrationPayment, Event, sequelize } = require('../models');

const WebhookController = {
  async list(req, res) {
    try {
      const data = await WebhookService.list();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  },

  async create(req, res) {
    try {
      const webhook = await WebhookService.create(req.body || {});
      return res.status(201).json(webhook);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  },

  async update(req, res) {
    try {
      const webhook = await WebhookService.update(req.params.id, req.body || {});
      return res.status(200).json(webhook);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  },

  async sendEvent(req, res) {
    try {
      const { event, payload } = req.body || {};
      if (!event) {
        return res.status(400).json({ erro: 'event é obrigatório' });
      }
      await WebhookService.sendEvent(event, payload || {});
      return res.status(202).json({ mensagem: 'Evento recebido' });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  },

  /**
   * Webhook da Cielo para notificações de pagamento
   */
  async cieloWebhook(req, res) {
    try {
      console.log('🟦 [WEBHOOK CIELO] Notificação recebida:', JSON.stringify(req.body, null, 2));

      const { PaymentId, ChangeType, MerchantOrderId } = req.body;

      if (!PaymentId) {
        console.error('❌ [WEBHOOK CIELO] PaymentId não fornecido');
        return res.status(400).json({ message: 'PaymentId é obrigatório' });
      }

      let registration;
      let registrationPayment = await RegistrationPayment.findOne({
        where: { providerPaymentId: PaymentId }
      });

      if (registrationPayment) {
        registration = await Registration.findByPk(registrationPayment.registrationId, {
          include: [{ model: Event, as: 'event' }]
        });
      } else if (MerchantOrderId) {
        try {
          registration = await registrationService.buscarInscricaoPorCodigo(MerchantOrderId);
        } catch (error) {
          console.error('❌ [WEBHOOK CIELO] Inscrição não encontrada:', MerchantOrderId);
        }
      }

      if (!registration) {
        registration = await Registration.findOne({
          where: { paymentId: PaymentId },
          include: [{ model: Event, as: 'event' }]
        });
      }

      if (!registration) {
        console.error('❌ [WEBHOOK CIELO] Inscrição não encontrada para PaymentId:', PaymentId);
        return res.status(404).json({ message: 'Inscrição não encontrada' });
      }

      console.log(`🕵️ [WEBHOOK CIELO] Inscrição encontrada: ${registration.orderCode}`);
      console.log(`📈 [WEBHOOK CIELO] Status atual: ${registration.paymentStatus}`);
      console.log(`🔄 [WEBHOOK CIELO] Tipo de mudança: ${ChangeType}`);

      const statusCielo = await paymentService.consultarPagamento(PaymentId);

      if (!statusCielo.sucesso) {
        console.error('❌ [WEBHOOK CIELO] Erro ao consultar pagamento na Cielo:', statusCielo.erro);
        return res.status(500).json({ message: 'Erro ao consultar pagamento' });
      }

      console.log(`✅ [WEBHOOK CIELO] Status na Cielo: ${statusCielo.status}`);

      const novoStatus = paymentService.mapearStatusCielo(statusCielo.status);

      console.log(`🟢 [WEBHOOK CIELO] Novo status mapeado: ${novoStatus}`);

      if (registrationPayment && registrationPayment.status === novoStatus) {
        console.log('⚠️ [WEBHOOK CIELO] Status não mudou, nenhuma ação necessária');
        return res.status(200).json({
          success: true,
          message: 'Webhook processado com sucesso',
          orderCode: registration.orderCode,
          status: novoStatus
        });
      }

      let statusAtualizado = false;
      let statusAnteriorWebhook = null;
      await sequelize.transaction(async (transaction) => {
        if (!registrationPayment) {
          registrationPayment = await RegistrationPayment.create({
            registrationId: registration.id,
            channel: 'ONLINE',
            method: registration.paymentMethod || 'pix',
            amount: registration.finalPrice,
            status: novoStatus,
            provider: 'cielo',
            providerPaymentId: PaymentId,
            providerPayload: statusCielo.dadosCompletos
              ? { ...statusCielo.dadosCompletos, originalStatus: statusCielo.status }
              : { originalStatus: statusCielo.status },
            pixQrCode: statusCielo.dadosCompletos?.Payment?.QrCodeString || null,
            pixQrCodeBase64: statusCielo.dadosCompletos?.Payment?.QrCodeBase64Image || null
          }, { transaction });
        } else {
          registrationPayment.status = novoStatus;
          registrationPayment.providerPayload = statusCielo.dadosCompletos
            ? { ...statusCielo.dadosCompletos, originalStatus: statusCielo.status }
            : { originalStatus: statusCielo.status };
          registrationPayment.pixQrCode = statusCielo.dadosCompletos?.Payment?.QrCodeString || registrationPayment.pixQrCode;
          registrationPayment.pixQrCodeBase64 = statusCielo.dadosCompletos?.Payment?.QrCodeBase64Image || registrationPayment.pixQrCodeBase64;
          await registrationPayment.save({ transaction });
        }

        const modoPagamento = registration.event?.registrationPaymentMode || 'SINGLE';
        if (modoPagamento === 'SINGLE') {
          if (registration.paymentStatus !== novoStatus) {
            const statusAnterior = registration.paymentStatus;
            registration.paymentStatus = novoStatus;
            registration.cieloResponse = statusCielo.dadosCompletos;
            await registration.save({ transaction });
            await registrationService.ajustarContadoresDeStatus(registration, statusAnterior);
            console.log(`🔁 [WEBHOOK CIELO] Status atualizado: ${statusAnterior} → ${novoStatus}`);
            statusAtualizado = true;
            statusAnteriorWebhook = statusAnterior;
          }
        } else {
          await registrationService.atualizarStatusPagamentoPorPagamentos(registration, { transaction });
        }

        await paymentService.registrarTransacao(
          registration.id,
          'webhook_notification',
          statusCielo.status.toString(),
          statusCielo.dadosCompletos
        );
      });

      if (statusAtualizado) {
        await registrationService.emitirWebhookRegistroAtualizado(registration.id, {
          previousStatus: statusAnteriorWebhook,
          currentStatus: novoStatus,
          source: 'cielo_webhook'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
        orderCode: registration.orderCode,
        status: novoStatus
      });
    } catch (error) {
      console.error('❌ [WEBHOOK CIELO] Erro ao processar webhook:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar webhook',
        error: error.message
      });
    }
  }
};

module.exports = WebhookController;
