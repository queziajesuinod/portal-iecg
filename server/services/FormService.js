// services/FormService.js
const { Form, FormField, FormType, FormSubmission, FormPaymentConfig } = require('../models');

class FormService {
  async criarFormulario(data) {
    const { name, description, formTypeId, hasPayment, startDate, endDate, slug, fields } = data;
    const form = await Form.create({ name, description, slug, formTypeId, hasPayment, startDate, endDate });

    if (Array.isArray(fields)) {
      for (const field of fields) {
        await form.createFormField(field);
      }
    }

    return form;
  }

  async atualizarFormulario(id, dados) {
    const { name, description, slug, startDate, endDate, hasPayment, FormFields } = dados;

    const form = await Form.findByPk(id);
    if (!form) throw new Error('Formulário não encontrado.');

    await form.update({ name, description, slug, startDate, endDate, hasPayment });

    await FormField.destroy({ where: { formId: id } });
    for (const f of FormFields) {
      await FormField.create({
        label: f.label,
        type: f.type,
        options: f.options || '',
        required: f.required || false,
        formId: id
      });
    }

    return form;
  }

  async listarFormulariosAtivos() {
    return Form.findAll({
      where: { isActive: true },
      include: [{
        model: FormType,
        as: 'formType',
        required: false // ou true, se quiser garantir integridade
      }]
    });

  }

  async buscarFormularioPorId(id) {
    return Form.findOne({ where: { id, isActive: true }, include: [FormField, FormType] });
  }

  async buscarFormularioPorSlug(slug) {
    return Form.findOne({ where: { slug, isActive: true }, include: [FormField, FormType] });
  }

  async validarPeriodo(form) {
    const now = new Date();
    if ((form.startDate && now < form.startDate) || (form.endDate && now > form.endDate)) {
      return false;
    }
    return true;
  }

  async obterConfiguracaoPagamento(formId) {
    return FormPaymentConfig.findOne({ where: { formId } });
  }

  async criarSubmissao(formId, fields) {
    return FormSubmission.create({ formId, data: fields });
  }
}

module.exports = new FormService();
