// services/PaymentService.js
const { Payment, PaymentHistory, FormSubmission, FormPaymentConfig, Form } = require('../models');
const CieloService = require('./payments/CieloService');
const EfiService = require('./payments/EfiService');
const crypto = require('crypto');

class PaymentService {
  async processarPagamento({ form, submission, config, valorSolicitado, paymentInfo }) {
    if (valorSolicitado < config.minEntry) {
      return { success: false, message: `Valor mínimo de entrada: R$ ${config.minEntry}` };
    }

    const totalPago = (await Payment.sum('amount', {
      where: { formSubmissionId: submission.id, status: 'confirmado' }
    })) || 0;

    if (!form.allowMultiplePayments && totalPago > 0) {
      return { success: false, message: 'Esse formulário permite apenas um pagamento' };
    }

    if (valorSolicitado > (config.totalAmount - totalPago)) {
      return { success: false, message: `Falta pagar R$ ${(config.totalAmount - totalPago).toFixed(2)}` };
    }

    const service = config.gateway === 'efi' ? EfiService : CieloService;
    const response = await service.processPayment({
      amount: valorSolicitado,
      payerName: paymentInfo.payerName,
      payerEmail: paymentInfo.payerEmail,
      payerPhone: paymentInfo.payerPhone,
      returnUrl: config.returnUrl
    });

    if (!response.success) return { success: false, message: 'Erro ao iniciar pagamento.' };

    const payment = await Payment.create({
      id: crypto.randomUUID(),
      formSubmissionId: submission.id,
      amount: valorSolicitado,
      status: response.status,
      gateway: config.gateway,
      transactionId: response.transactionId,
      checkoutUrl: response.checkoutUrl,
      returnUrl: config.returnUrl,
      payerName: paymentInfo.payerName,
      payerEmail: paymentInfo.payerEmail,
      payerPhone: paymentInfo.payerPhone
    });

    await PaymentHistory.create({
      id: crypto.randomUUID(),
      paymentId: payment.id,
      status: response.status,
      timestamp: new Date(),
      notes: 'Pagamento iniciado'
    });

    return { success: true, checkoutUrl: response.checkoutUrl };
  }

  async obterStatusPagamento(submissionId) {
    const submission = await FormSubmission.findByPk(submissionId, { include: [Form] });
    if (!submission || !submission.Form) return null;

    const config = await FormPaymentConfig.findOne({ where: { formId: submission.formId } });
    const payments = await Payment.findAll({ where: { formSubmissionId: submissionId, status: 'confirmado' } });
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      totalAmount: config.totalAmount,
      totalPaid,
      allowMultiplePayments: submission.Form.allowMultiplePayments
    };
  }

  async obterHistoricoPagamento(paymentId) {
    return PaymentHistory.findAll({
      where: { paymentId },
      order: [['timestamp', 'DESC']]
    });
  }
  

  async novoPagamento(submissionId, dados) {
    const { amount, payerName, payerEmail, payerPhone } = dados;
    const submission = await FormSubmission.findByPk(submissionId, { include: [Form] });
    if (!submission || !submission.Form) throw new Error('Submissão não encontrada');

    const config = await FormPaymentConfig.findOne({ where: { formId: submission.formId } });

    if (!submission.Form.allowMultiplePayments) {
      const pagos = await Payment.count({ where: { formSubmissionId: submissionId, status: 'confirmado' } });
      if (pagos > 0) throw new Error('Pagamentos adicionais não são permitidos.');
    }

    const service = config.gateway === 'efi' ? EfiService : CieloService;
    const response = await service.processPayment({
      amount,
      payerName,
      payerEmail,
      payerPhone,
      returnUrl: config.returnUrl
    });

    if (!response.success) throw new Error('Erro ao processar pagamento.');

    const payment = await Payment.create({
      id: crypto.randomUUID(),
      formSubmissionId: submission.id,
      amount,
      status: response.status,
      gateway: config.gateway,
      transactionId: response.transactionId,
      checkoutUrl: response.checkoutUrl,
      returnUrl: config.returnUrl,
      payerName,
      payerEmail,
      payerPhone
    });

    await PaymentHistory.create({
      id: crypto.randomUUID(),
      paymentId: payment.id,
      status: response.status,
      timestamp: new Date(),
      notes: 'Pagamento adicional'
    });

    return payment;
  }
}

module.exports = new PaymentService();
