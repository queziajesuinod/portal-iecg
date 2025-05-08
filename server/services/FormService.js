// services/FormService.js
const { Form, FormField, FormType, FormSubmission, FormPaymentConfig } = require('../models');

class FormService {
  async criarFormulario(data) {
    const {
      name,
      description,
      formTypeId,
      hasPayment,
      startDate,
      endDate,
      slug,
      fields = [],
      configuracaoPagamento
    } = data;

    const form = await Form.create({
      name,
      description,
      slug,
      formTypeId,
      hasPayment,
      startDate,
      endDate
    });

    for (const field of fields) {
      await FormField.create({
        label: field.label,
        type: field.type,
        required: field.required || false,
        options: field.options || '',
        FormId: form.id
      });
    }

    if (hasPayment && configuracaoPagamento) {
      await FormPaymentConfig.create({
        formId: form.id,
        totalAmount: configuracaoPagamento.totalAmount,
        minEntry: configuracaoPagamento.minEntry,
        dueDate: configuracaoPagamento.dueDate,
        gateway: configuracaoPagamento.gateway,
        returnUrl: configuracaoPagamento.returnUrl || null
      });
    }

    return form;
  }

  async atualizarFormulario(id, dados) {
    const { name, description, slug, startDate, endDate, hasPayment, FormFields } = dados;

    const form = await Form.findByPk(id);
    if (!form) throw new Error('Formulário não encontrado.');

    await form.update({ name, description, slug, startDate, endDate, hasPayment });

    await FormField.destroy({ where: { formId: id } });

    if (Array.isArray(FormFields) && FormFields.length > 0) {
      const novosCampos = FormFields.map(f => ({
        label: f.label,
        type: f.type,
        options: f.options || [],
        required: f.required || false,
        formId: id
      }));

      await FormField.bulkCreate(novosCampos);
    }

    return form;
  }

  async listarFormulariosAtivos() {
    return Form.findAll({
      where: { isActive: true },
      include: [{
        model: FormType,
        as: 'formType',
        required: false
      }]
    });
  }

  async buscarFormularioPorId(id) {
    return Form.findOne({
      where: { id, isActive: true },
      include: [FormField, FormType]
    });
  }

  async buscarFormularioPorSlug(slug) {
    return Form.findOne({
      where: { slug, isActive: true },
      include: [FormField, FormType]
    });
  }

  async validarPeriodo(form) {
    const now = new Date();
    return !((form.startDate && now < form.startDate) || (form.endDate && now > form.endDate));
  }

  async obterConfiguracaoPagamento(formId) {
    return FormPaymentConfig.findOne({ where: { formId } });
  }

  async criarSubmissao(formId, fields) {
    return FormSubmission.create({ formId, data: fields });
  }
}

module.exports = new FormService();
