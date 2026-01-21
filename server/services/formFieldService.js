const { FormField, Event } = require('../models');
const uuid = require('uuid');

async function listarCamposPorEvento(eventId) {
  return FormField.findAll({
    where: { eventId },
    order: [['section', 'ASC'], ['order', 'ASC']]
  });
}

async function buscarCampoPorId(id) {
  const field = await FormField.findByPk(id);
  
  if (!field) {
    throw new Error('Campo não encontrado');
  }
  
  return field;
}

async function criarCampo(body) {
  const { eventId, fieldType, fieldLabel, fieldName, placeholder, isRequired, options, order, section, validationRules } = body;
  
  if (!eventId) {
    throw new Error('ID do evento é obrigatório');
  }
  
  if (!fieldType) {
    throw new Error('Tipo do campo é obrigatório');
  }
  
  if (!fieldLabel) {
    throw new Error('Label do campo é obrigatório');
  }
  
  if (!fieldName) {
    throw new Error('Nome do campo é obrigatório');
  }
  
  // Verificar se evento existe
  const event = await Event.findByPk(eventId);
  if (!event) {
    throw new Error('Evento não encontrado');
  }
  
  // Verificar se fieldName já existe para este evento
  const existingField = await FormField.findOne({
    where: { eventId, fieldName }
  });
  
  if (existingField) {
    throw new Error('Já existe um campo com este nome para este evento');
  }
  
  // Validar options para campos select, radio, checkbox
  if (['select', 'radio', 'checkbox'].includes(fieldType)) {
    if (!options || !Array.isArray(options) || options.length === 0) {
      throw new Error(`Campo do tipo ${fieldType} requer opções`);
    }
  }
  
  return FormField.create({
    id: uuid.v4(),
    eventId,
    fieldType,
    fieldLabel,
    fieldName,
    placeholder,
    isRequired: isRequired ?? false,
    options,
    order: order ?? 0,
    section: section ?? 'attendee',
    validationRules
  });
}

async function atualizarCampo(id, body) {
  const field = await FormField.findByPk(id);
  
  if (!field) {
    throw new Error('Campo não encontrado');
  }
  
  field.fieldType = body.fieldType ?? field.fieldType;
  field.fieldLabel = body.fieldLabel ?? field.fieldLabel;
  field.fieldName = body.fieldName ?? field.fieldName;
  field.placeholder = body.placeholder ?? field.placeholder;
  field.isRequired = body.isRequired ?? field.isRequired;
  field.options = body.options ?? field.options;
  field.order = body.order ?? field.order;
  field.section = body.section ?? field.section;
  field.validationRules = body.validationRules ?? field.validationRules;
  
  await field.save();
  return field;
}

async function deletarCampo(id) {
  const field = await FormField.findByPk(id);
  
  if (!field) {
    throw new Error('Campo não encontrado');
  }
  
  await field.destroy();
}

// Criar múltiplos campos de uma vez
async function criarCamposEmLote(eventId, campos) {
  if (!Array.isArray(campos) || campos.length === 0) {
    throw new Error('Lista de campos inválida');
  }
  
  // Verificar se evento existe
  const event = await Event.findByPk(eventId);
  if (!event) {
    throw new Error('Evento não encontrado');
  }
  
  const camposParaCriar = campos.map((campo, index) => ({
    id: uuid.v4(),
    eventId,
    fieldType: campo.fieldType,
    fieldLabel: campo.fieldLabel,
    fieldName: campo.fieldName,
    placeholder: campo.placeholder,
    isRequired: campo.isRequired ?? false,
    options: campo.options,
    order: campo.order ?? index,
    section: campo.section ?? 'attendee',
    validationRules: campo.validationRules
  }));
  
  return FormField.bulkCreate(camposParaCriar);
}

// Validar dados do formulário
async function validarDadosFormulario(eventId, dados, section = 'attendee') {
  const campos = await FormField.findAll({
    where: { eventId, section }
  });
  
  const erros = [];
  
  campos.forEach((campo) => {
    const valor = dados[campo.fieldName];
    
    // Verificar campos obrigatórios
    if (campo.isRequired && (!valor || valor === '')) {
      erros.push(`Campo "${campo.fieldLabel}" é obrigatório`);
      return;
    }
    
    // Validar tipo de campo
    if (valor) {
      if (campo.fieldType === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(valor)) {
          erros.push(`Campo "${campo.fieldLabel}" deve ser um email válido`);
        }
      } else if (campo.fieldType === 'phone') {
        const phoneRegex = /^\(?[1-9]{2}\)? ?(?:[2-8]|9[1-9])[0-9]{3}-?[0-9]{4}$/;
        if (!phoneRegex.test(valor.replace(/\D/g, ''))) {
          erros.push(`Campo "${campo.fieldLabel}" deve ser um telefone válido`);
        }
      } else if (campo.fieldType === 'cpf') {
        const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
        if (!cpfRegex.test(valor)) {
          erros.push(`Campo "${campo.fieldLabel}" deve ser um CPF válido (formato: 000.000.000-00)`);
        }
      } else if (campo.fieldType === 'number') {
        if (Number.isNaN(Number(valor))) {
          erros.push(`Campo "${campo.fieldLabel}" deve ser um número`);
        }
      }
    }
  });
  
  if (erros.length > 0) {
    throw new Error(erros.join('; '));
  }
  
  return true;
}

module.exports = {
  listarCamposPorEvento,
  buscarCampoPorId,
  criarCampo,
  atualizarCampo,
  deletarCampo,
  criarCamposEmLote,
  validarDadosFormulario
};
