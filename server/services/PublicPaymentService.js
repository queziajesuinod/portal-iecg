// services/PublicPaymentService.js
const { FormSubmission, Payment, Form, FormPaymentConfig } = require('../models');

class PublicPaymentService {
  async consultarPorCpf(cpf) {
    const submissions = await FormSubmission.findAll({
      include: [
        {
          model: Form,
          attributes: ['id', 'name', 'allowMultiplePayments'],
          include: [FormPaymentConfig]
        }
      ]
    });

    const filtradas = submissions.filter(sub => {
      const campos = sub.data || {};
      return campos.cpf && campos.cpf.replace(/\D/g, '') === cpf.replace(/\D/g, '');
    });

    const resultado = await Promise.all(filtradas.map(async (sub) => {
      const pagos = await Payment.findAll({
        where: { formSubmissionId: sub.id, status: 'confirmado' }
      });
      const totalPago = pagos.reduce((acc, p) => acc + p.amount, 0);

      return {
        submissionId: sub.id,
        formName: sub.Form.name,
        totalAmount: sub.Form.FormPaymentConfig.totalAmount,
        totalPaid: totalPago,
        allowMultiplePayments: sub.Form.allowMultiplePayments
      };
    }));

    return resultado;
  }
}

module.exports = new PublicPaymentService();
