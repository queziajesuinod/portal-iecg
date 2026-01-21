const WebhookService = require('../services/WebhookService');
const registrationService = require('../services/registrationService');
const paymentService = require('../services/paymentService');

class WebhookController {
  async list(req, res) {
    try {
      const data = await WebhookService.list();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async create(req, res) {
    try {
      const webhook = await WebhookService.create(req.body || {});
      return res.status(201).json(webhook);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }

  async update(req, res) {
    try {
      const webhook = await WebhookService.update(req.params.id, req.body || {});
      return res.status(200).json(webhook);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }

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
  }

  /**
   * Webhook da Cielo para notificações de pagamento
   */
  async cieloWebhook(req, res) {
    try {
      console.log('🔔 [WEBHOOK CIELO] Notificação recebida:', JSON.stringify(req.body, null, 2));
      
      const { PaymentId, ChangeType, MerchantOrderId } = req.body;
      
      if (!PaymentId) {
        console.error('❌ [WEBHOOK CIELO] PaymentId não fornecido');
        return res.status(400).json({ message: 'PaymentId é obrigatório' });
      }
      
      // Buscar inscrição pelo orderCode (MerchantOrderId)
      let registration;
      if (MerchantOrderId) {
        try {
          registration = await registrationService.buscarInscricaoPorCodigo(MerchantOrderId);
        } catch (error) {
          console.error('❌ [WEBHOOK CIELO] Inscrição não encontrada:', MerchantOrderId);
        }
      }
      
      // Se não encontrou pelo orderCode, buscar pelo PaymentId
      if (!registration) {
        const { Registration } = require('../models');
        registration = await Registration.findOne({
          where: { paymentId: PaymentId }
        });
        
        if (!registration) {
          console.error('❌ [WEBHOOK CIELO] Inscrição não encontrada para PaymentId:', PaymentId);
          return res.status(404).json({ message: 'Inscrição não encontrada' });
        }
      }
      
      console.log(`📝 [WEBHOOK CIELO] Inscrição encontrada: ${registration.orderCode}`);
      console.log(`📊 [WEBHOOK CIELO] Status atual: ${registration.paymentStatus}`);
      console.log(`🔄 [WEBHOOK CIELO] Tipo de mudança: ${ChangeType}`);
      
      // Consultar status atual na Cielo
      const statusCielo = await paymentService.consultarPagamento(PaymentId);
      
      if (!statusCielo.sucesso) {
        console.error('❌ [WEBHOOK CIELO] Erro ao consultar pagamento na Cielo:', statusCielo.erro);
        return res.status(500).json({ message: 'Erro ao consultar pagamento' });
      }
      
      console.log(`✅ [WEBHOOK CIELO] Status na Cielo: ${statusCielo.status}`);
      
      // Mapear status Cielo para nosso sistema
      const novoStatus = paymentService.mapearStatusCielo(statusCielo.status);
      
      console.log(`🔄 [WEBHOOK CIELO] Novo status mapeado: ${novoStatus}`);
      
      // Atualizar status se mudou
      if (registration.paymentStatus !== novoStatus) {
        const statusAnterior = registration.paymentStatus;
        registration.paymentStatus = novoStatus;
        registration.cieloResponse = statusCielo.dadosCompletos;
        await registration.save();
        
        console.log(`✅ [WEBHOOK CIELO] Status atualizado: ${statusAnterior} → ${novoStatus}`);
        
        // Registrar transação
        await paymentService.registrarTransacao(
          registration.id,
          'webhook_notification',
          statusCielo.status.toString(),
          statusCielo.dadosCompletos
        );
        
        console.log(`📧 [WEBHOOK CIELO] Transação registrada`);
      } else {
        console.log(`ℹ️ [WEBHOOK CIELO] Status não mudou, nenhuma ação necessária`);
      }
      
      // Cielo espera resposta 200 OK
      res.status(200).json({ 
        success: true,
        message: 'Webhook processado com sucesso',
        orderCode: registration.orderCode,
        status: novoStatus
      });
      
    } catch (error) {
      console.error('❌ [WEBHOOK CIELO] Erro ao processar webhook:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro ao processar webhook',
        error: error.message 
      });
    }
  }
}

module.exports = new WebhookController();
