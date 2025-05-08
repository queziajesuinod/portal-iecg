// controllers/FormController.js
const FormService = require('../services/FormService');
const { Payment, PaymentHistory, FormSubmission, FormPaymentConfig } = require('../models');
const CieloService = require('../services/payments/CieloService');
const EfiService = require('../services/payments/EfiService');
const crypto = require('crypto');

class FormController {
  async createForm(req, res) {
    try {
      const form = await FormService.criarFormulario(req.body);
      return res.status(201).json(form);
    } catch (error) {
      console.error('Erro ao criar formulário:', error);
      return res.status(500).json({ error: 'Erro interno ao criar formulário.' });
    }
  }

  async updateForm(req, res) {
    try {
      const form = await FormService.atualizarFormulario(req.params.id, req.body);
      return res.json({ success: true, message: 'Formulário atualizado com sucesso.' });
    } catch (error) {
      console.error('Erro ao atualizar formulário:', error);
      return res.status(500).json({ message: 'Erro interno ao atualizar formulário.' });
    }
  }

  async listForms(req, res) {
    try {
      const forms = await FormService.listarFormulariosAtivos();
      return res.json(forms);
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno ao listar formulários.' });
    }
  }

  async getForm(req, res) {
    try {
      const form = await FormService.buscarFormularioPorId(req.params.id);
      if (!form) return res.status(404).json({ message: 'Formulário não encontrado' });

      const periodoValido = await FormService.validarPeriodo(form);
      if (!periodoValido) return res.status(403).json({ message: 'Formulário fora do período de preenchimento' });

      return res.json(form);
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno ao buscar formulário' });
    }
  }

  async getFormBySlug(req, res) {
    try {
      const form = await FormService.buscarFormularioPorSlug(req.params.slug);
      if (!form) return res.status(404).json({ message: 'Formulário não encontrado' });

      const periodoValido = await FormService.validarPeriodo(form);
      if (!periodoValido) return res.status(403).json({ message: 'Fora do período permitido' });

      return res.json(form);
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno ao buscar por slug' });
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const { submissionId } = req.params;
      const submission = await FormSubmission.findByPk(submissionId, { include: ['Form'] });
      if (!submission || !submission.Form) return res.status(404).json({ message: 'Submissão não encontrada' });

      const config = await FormService.obterConfiguracaoPagamento(submission.formId);
      const payments = await Payment.findAll({ where: { formSubmissionId: submissionId, status: 'confirmado' } });
      const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

      return res.json({
        totalAmount: config.totalAmount,
        totalPaid,
        allowMultiplePayments: submission.Form.allowMultiplePayments
      });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao consultar status de pagamento.' });
    }
  }

  async makeAdditionalPayment(req, res) {
    try {
      const { submissionId } = req.params;
      const { amount, payerName, payerEmail, payerPhone } = req.body;

      const submission = await FormSubmission.findByPk(submissionId, { include: ['Form'] });
      if (!submission || !submission.Form) return res.status(404).json({ message: 'Submissão não encontrada' });

      const config = await FormService.obterConfiguracaoPagamento(submission.formId);

      if (!submission.Form.allowMultiplePayments) {
        const pagos = await Payment.count({ where: { formSubmissionId: submission.id, status: 'confirmado' } });
        if (pagos > 0) return res.status(400).json({ message: 'Pagamentos adicionais não são permitidos.' });
      }

      const gatewayService = config.gateway === 'efi' ? EfiService : CieloService;
      const paymentResponse = await gatewayService.processPayment({ amount, returnUrl: config.returnUrl, payerName, payerEmail, payerPhone });

      if (!paymentResponse.success) return res.status(500).json({ message: 'Erro ao processar pagamento.' });

      const payment = await Payment.create({
        id: crypto.randomUUID(),
        formSubmissionId: submission.id,
        amount,
        status: paymentResponse.status,
        gateway: config.gateway,
        transactionId: paymentResponse.transactionId,
        checkoutUrl: paymentResponse.checkoutUrl,
        returnUrl: config.returnUrl,
        payerName,
        payerEmail,
        payerPhone
      });

      await PaymentHistory.create({
        id: crypto.randomUUID(),
        paymentId: payment.id,
        status: payment.status,
        timestamp: new Date(),
        notes: 'Pagamento adicional'
      });

      return res.status(201).json({ checkoutUrl: payment.checkoutUrl });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao criar pagamento adicional.' });
    }
  }
}

module.exports = new FormController();