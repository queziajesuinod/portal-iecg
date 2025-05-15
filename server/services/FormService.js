const {
  Form,
  FormField,
  FormType,
  FormSubmission,
  FormPaymentConfig
} = require('../models');

class FormService {
  async criarFormulario(data) {
    const {
      name,
      description,
      slug,
      formTypeId,
      hasPayment,
      allowMultiplePayments,
      startDate,
      endDate,
      fields = [],
      configuracaoPagamento
    } = data;

    // Antes de criar ou editar um form
    const existing = await Form.findOne({ where: { slug } });
    if (existing && (!id || existing.id !== id)) {
      throw new Error('Já existe um Evento com esse slug.');
    }


    // Cria o formulário principal
    const form = await Form.create({
      name,
      description,
      slug,
      formTypeId,
      hasPayment,
      allowMultiplePayments,
      startDate,
      endDate
    });

    // Salva os campos do formulário (fields)
    if (fields.length) {
      for (const field of fields) {
        await FormField.create({
          label: field.label,
          type: field.type,
          required: field.required || false,
          options: field.options || '',
          FormId: form.id
        });
      }
    }

    // Salva configuração de pagamento, se houver
    if (hasPayment && configuracaoPagamento) {
      await FormPaymentConfig.create({
        FormId: form.id,
        totalAmount: configuracaoPagamento.totalAmount,
        minEntry: configuracaoPagamento.minEntry,
        dueDate: configuracaoPagamento.dueDate,
        gateway: configuracaoPagamento.gateway,
        returnUrl: configuracaoPagamento.returnUrl || null
      });
    }

    return form;
  }

  async atualizarFormulario(id, data) {
    const {
      name,
      description,
      slug,
      hasPayment,
      allowMultiplePayments,
      startDate,
      endDate,
      fields = [],
      configuracaoPagamento
    } = data;

    // Busca o formulário
    const form = await Form.findByPk(id);
    if (!form) throw new Error('Evento não encontrado.');

    // Atualiza os dados do formulário
    await form.update({
      name,
      description,
      slug,
      hasPayment,
      allowMultiplePayments,
      startDate,
      endDate
    });

    // Atualiza os fields: deleta todos e cria novamente
    await FormField.destroy({ where: { FormId: id } });
    if (fields.length) {
      for (const field of fields) {
        await FormField.create({
          label: field.label,
          type: field.type,
          required: field.required || false,
          options: field.options || '',
          FormId: id
        });
      }
    }

    // Atualiza (ou cria) a configuração de pagamento
    if (hasPayment && configuracaoPagamento) {
      const [paymentConfig, created] = await FormPaymentConfig.findOrCreate({
        where: { FormId: id },
        defaults: {
          totalAmount: configuracaoPagamento.totalAmount,
          minEntry: configuracaoPagamento.minEntry,
          dueDate: configuracaoPagamento.dueDate,
          gateway: configuracaoPagamento.gateway,
          returnUrl: configuracaoPagamento.returnUrl || null
        }
      });
      if (!created) {
        await paymentConfig.update({
          totalAmount: configuracaoPagamento.totalAmount,
          minEntry: configuracaoPagamento.minEntry,
          dueDate: configuracaoPagamento.dueDate,
          gateway: configuracaoPagamento.gateway,
          returnUrl: configuracaoPagamento.returnUrl || null
        });
      }
    } else {
      // Se removeu o pagamento, deleta config se existir
      await FormPaymentConfig.destroy({ where: { FormId: id } });
    }

    return form;
  }

  async listarFormulariosAtivos() {
    return Form.findAll({
      where: { isActive: true },
      include: [
        { model: FormType, as: 'formType' },
        { model: FormField, as: 'FormFields' },
        { model: FormPaymentConfig, as: 'FormPaymentConfig' }
      ]
    });
  }

  async buscarFormularioPorId(id) {
    return Form.findOne({
      where: { id, isActive: true },
      include: [
        { model: FormField, as: 'FormFields' },
        { model: FormPaymentConfig, as: 'FormPaymentConfig' },
        { model: FormType, as: 'formType' }
      ]
    });
  }

  async buscarFormularioPorSlug(slug) {
    return Form.findOne({
      where: { slug, isActive: true },
      include: [
        { model: FormField, as: 'FormFields' },
        { model: FormPaymentConfig, as: 'FormPaymentConfig' },
        { model: FormType, as: 'formType' }
      ]
    });
  }

  async validarPeriodo(form) {
    const now = new Date();
    return !((form.startDate && now < form.startDate) || (form.endDate && now > form.endDate));
  }

  async obterConfiguracaoPagamento(FormId) {
    return FormPaymentConfig.findOne({ where: { FormId } });
  }

  async criarSubmissao(FormId, fields) {
    return FormSubmission.create({ FormId, data: fields });
  }

  async deletarFormulario(id) {
    // Busca se existe submissão para o form
    const submissionCount = await FormSubmission.count({ where: { FormId: id } });
    if (submissionCount > 0) {
      throw new Error('Não é possível excluir: já existem Inscrições neste Evento.');
    }

    // Deleta fields e configurações de pagamento relacionados
    await FormField.destroy({ where: { FormId: id } });
    await FormPaymentConfig.destroy({ where: { FormId: id } });

    // Agora deleta o próprio form
    await Form.destroy({ where: { id } });

    return { success: true };
  }

}

module.exports = new FormService();
