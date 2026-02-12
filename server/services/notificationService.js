const {
  EventNotification,
  EventNotificationTemplate,
  EventNotificationGroup,
  EventNotificationGroupMember,
  Registration,
  RegistrationAttendee,
  Event,
  EventBatch,
  EventCheckIn,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const evolutionApiService = require('./evolutionApiService');

const TIMEZONE = 'America/Campo_Grande';
const GROUP_SEND_DELAY_MS = Number(process.env.NOTIFICATION_GROUP_DELAY_MS || 1200);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeWhatsappDigits = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;

  // Se já vier com DDI 55, apenas normaliza removendo DDI para aplicar regra local
  const raw = digits.startsWith('55') ? digits.slice(2) : digits;
  if (!raw) return null;

  if (raw.length >= 10) {
    const ddd = raw.slice(0, 2);
    let number = raw.slice(2);
    if (number.length === 9) {
      number = number.slice(1); // remove o primeiro dígito se for '9'
    }
    return `55${ddd}${number}`;
  }

  return `55${raw}`;
};

const extractBuyerPhone = (buyerData = {}) => buyerData?.buyer_whatsapp || null;

const isWhatsappValid = (validation) => {
  if (!validation) return true;
  if (typeof validation.valid === 'boolean') return validation.valid;
  if (typeof validation.status === 'string') {
    const status = validation.status.toLowerCase();
    return ['connected', 'valid', 'ready', 'ok'].includes(status);
  }
  return true;
};

class NotificationService {
  // ========== GRUPOS DE NOTIFICAÇÃO ==========

  /**
   * Criar grupo de notificação
   */
  async criarGrupo(dados) {
    const { eventId, name, description, filterCriteria } = dados;

    if (!eventId || !name) {
      throw new Error('Campos obrigatórios: eventId, name');
    }

    // Verificar se o evento existe
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Evento não encontrado');
    }

    return EventNotificationGroup.create({
      eventId,
      name,
      description,
      filterCriteria,
      isActive: true
    });
  }

  /**
   * Listar grupos de um evento
   */
  async listarGrupos(eventId) {
    return EventNotificationGroup.findAll({
      where: { eventId },
      include: [
        {
          model: EventNotificationGroupMember,
          as: 'members',
          attributes: ['id'],
          separate: true
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Adicionar membros a um grupo
   */
  async adicionarMembrosAoGrupo(groupId, registrationIds, userId = null) {
    const group = await EventNotificationGroup.findByPk(groupId);
    if (!group) {
      throw new Error('Grupo não encontrado');
    }

    const membersToAdd = registrationIds.map(registrationId => ({
      groupId,
      registrationId,
      addedBy: userId,
      addedAt: moment.tz(TIMEZONE).toDate()
    }));

    // Usar upsert para evitar duplicatas
    const results = await Promise.allSettled(
      membersToAdd.map(member => 
        EventNotificationGroupMember.findOrCreate({
          where: {
            groupId: member.groupId,
            registrationId: member.registrationId
          },
          defaults: member
        })
      )
    );

    const adicionados = results.filter(r => r.status === 'fulfilled' && r.value[1]).length;
    const jaExistentes = results.filter(r => r.status === 'fulfilled' && !r.value[1]).length;

    return {
      adicionados,
      jaExistentes,
      total: registrationIds.length
    };
  }

  /**
   * Remover membro de um grupo
   */
  async removerMembroDoGrupo(groupId, registrationId) {
    const deleted = await EventNotificationGroupMember.destroy({
      where: { groupId, registrationId }
    });

    if (deleted === 0) {
      throw new Error('Membro não encontrado no grupo');
    }

    return { message: 'Membro removido com sucesso' };
  }

  /**
   * Criar grupo automaticamente baseado em agendamento de check-in
   */
  async criarGrupoPorAgendamento(scheduleId, userId = null) {
    const schedule = await sequelize.models.EventCheckInSchedule.findByPk(scheduleId, {
      include: [{ model: Event, as: 'event' }]
    });

    if (!schedule) {
      throw new Error('Agendamento não encontrado');
    }

    // Criar grupo
    const group = await this.criarGrupo({
      eventId: schedule.eventId,
      name: `Grupo: ${schedule.name}`,
      description: `Grupo automático criado para o agendamento ${schedule.name}`,
      filterCriteria: { scheduleId }
    });

    // Associar o grupo ao agendamento
    await schedule.update({ notificationGroupId: group.id });

    // Buscar todos os check-ins deste agendamento
    const checkIns = await EventCheckIn.findAll({
      where: { scheduleId },
      attributes: ['registrationId'],
      group: ['registrationId']
    });

    const registrationIds = checkIns.map(c => c.registrationId);

    if (registrationIds.length > 0) {
      await this.adicionarMembrosAoGrupo(group.id, registrationIds, userId);
    }

    return group;
  }

  // ========== TEMPLATES ==========

  /**
   * Criar template de notificação
   */
  async criarTemplate(dados) {
    const { eventId, name, type, channel, subject, message, mediaUrl } = dados;

    if (!name || !type || !channel || !message) {
      throw new Error('Campos obrigatórios: name, type, channel, message');
    }

    // Se tem eventId, verificar se existe
    if (eventId) {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Evento não encontrado');
      }
    }

    return EventNotificationTemplate.create({
      eventId,
      name,
      type,
      channel,
      subject,
      message,
      mediaUrl,
      isActive: true
    });
  }

  /**
   * Listar templates (globais ou de um evento específico)
   */
  async listarTemplates(eventId = null) {
    const where = eventId ? { eventId } : { eventId: null };

    return EventNotificationTemplate.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Atualizar template
   */
  async atualizarTemplate(id, dados) {
    const template = await EventNotificationTemplate.findByPk(id);
    if (!template) {
      throw new Error('Template não encontrado');
    }

    return template.update(dados);
  }

  /**
   * Deletar template
   */
  async deletarTemplate(id) {
    const template = await EventNotificationTemplate.findByPk(id);
    if (!template) {
      throw new Error('Template não encontrado');
    }

    await template.destroy();
    return { message: 'Template deletado com sucesso' };
  }

  /**
   * Substituir variáveis no template
   */
  substituirVariaveis(template, dados) {
    let mensagem = template;

    const variaveis = {
      '{{buyer_name}}': dados.buyer_name || '',
      '{{buyer_email}}': dados.buyer_email || '',
      '{{buyer_whatsapp}}': dados.buyer_whatsapp || '',
      '{{orderCode}}': dados.orderCode || '',
      '{{nome}}': dados.nome || '',
      '{{evento}}': dados.evento || '',
      '{{data}}': dados.data || '',
      '{{hora}}': dados.hora || '',
      '{{local}}': dados.local || '',
      '{{codigo}}': dados.codigo || '',
      '{{link}}': dados.link || '',
      '{{valor}}': dados.valor || '',
      '{{lote}}': dados.lote || ''
    };

    Object.keys(variaveis).forEach(variavel => {
      mensagem = mensagem.replace(new RegExp(variavel, 'g'), variaveis[variavel]);
    });

    // Substituir variáveis dinâmicas como {{orderCode_1}}, {{lote_1}}, etc.
    Object.keys(dados || {}).forEach((key) => {
      const token = `{{${key}}}`;
      if (mensagem.includes(token)) {
        mensagem = mensagem.replace(new RegExp(token, 'g'), dados[key] ?? '');
      }
    });

    return mensagem;
  }

  // ========== ENVIO DE NOTIFICAÇÕES ==========

  /**
   * Enviar notificação individual
   */
  async enviarNotificacao(dados, userId = null) {
    const {
      eventId,
      registrationId,
      templateId,
      channel = 'whatsapp',
      customMessage,
      customSubject,
      customMediaUrl
    } = dados;

    // Buscar inscrição
    const registration = await Registration.findByPk(registrationId, {
      include: [
        { model: Event, as: 'event' },
        { model: EventBatch, as: 'batch' },
        {
          model: RegistrationAttendee,
          as: 'attendees',
          include: [{ model: EventBatch, as: 'batch', attributes: ['id', 'name'] }]
        }
      ]
    });

    if (!registration) {
      throw new Error('Inscrição não encontrada');
    }

    // Preparar dados para substituição de variáveis
    const buyerName = registration.buyerData?.buyer_name
      || registration.buyerData?.name
      || registration.buyerData?.nome
      || registration.buyerData?.nome_completo
      || 'Participante';
    const buyerEmail = registration.buyerData?.buyer_email
      || registration.buyerData?.email
      || '';
    const buyerWhatsapp = registration.buyerData?.buyer_whatsapp || '';
    const attendeeBatches = (registration.attendees || [])
      .map((attendee) => attendee.batch?.name)
      .filter(Boolean);
    const loteSummary = attendeeBatches.length
      ? attendeeBatches.join(' / ')
      : (registration.batch?.name || '');

    const dadosSubstituicao = {
      nome: buyerName,
      evento: registration.event.title,
      data: moment(registration.event.startDate).tz(TIMEZONE).format('DD/MM/YYYY'),
      hora: moment(registration.event.startDate).tz(TIMEZONE).format('HH:mm'),
      local: registration.event.location || '',
      codigo: registration.orderCode,
      orderCode: registration.orderCode,
      link: `${process.env.FRONTEND_URL}/eventos/${registration.event.id}`,
      valor: registration.totalAmount ? `R$ ${registration.totalAmount.toFixed(2)}` : '',
      lote: loteSummary,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_whatsapp: buyerWhatsapp
    };

    (registration.attendees || []).forEach((attendee, index) => {
      const pos = index + 1;
      dadosSubstituicao[`orderCode_${pos}`] = `${registration.orderCode}_${pos}`;
      dadosSubstituicao[`lote_${pos}`] = attendee.batch?.name || '';
    });

    let message = customMessage;
    let subject = customSubject;
    let mediaUrl = customMediaUrl;

    // Se tem template, usar ele
    if (templateId) {
      const template = await EventNotificationTemplate.findByPk(templateId);
      if (!template) {
        throw new Error('Template não encontrado');
      }

      message = this.substituirVariaveis(template.message, dadosSubstituicao);
      subject = template.subject ? this.substituirVariaveis(template.subject, dadosSubstituicao) : null;
      mediaUrl = template.mediaUrl || mediaUrl;
    } else if (!customMessage) {
      throw new Error('É necessário fornecer templateId ou customMessage');
    } else {
      message = this.substituirVariaveis(customMessage, dadosSubstituicao);
    }

    // Obter destinatário e validar WhatsApp
    let recipient = '';
      if (channel === 'whatsapp' || channel === 'sms') {
        const rawPhone = extractBuyerPhone(registration.buyerData);
        const normalizedPhone = normalizeWhatsappDigits(rawPhone);
        console.log('[Notification] Número recebido', {
          rawPhone,
          normalizedPhone,
          registrationId: registration.id
        });
        if (!normalizedPhone) {
          throw new Error('Telefone não encontrado na inscrição');
        }

        if (channel === 'whatsapp') {
          const validation = await evolutionApiService.validarNumeroWhatsapp(normalizedPhone);
          if (!isWhatsappValid(validation)) {
            throw new Error(validation?.message || 'Número de WhatsApp inválido ou desconectado');
          }
        }

        recipient = normalizedPhone;
      } else if (channel === 'email') {
      recipient = registration.buyerData?.email;
      if (!recipient) {
        throw new Error('Email não encontrado na inscrição');
      }
    }

    // Criar registro de notificação
    const notification = await EventNotification.create({
      eventId: eventId || registration.eventId,
      registrationId,
      templateId,
      channel,
      recipient,
      subject,
      message,
      mediaUrl,
      status: 'pending',
      sentBy: userId
    });

    // Enviar via canal apropriado
    try {
      let resultado;

      if (channel === 'whatsapp') {
        if (mediaUrl) {
          resultado = await evolutionApiService.enviarMensagemComMidia(
            recipient,
            message,
            mediaUrl,
            'image'
          );
        } else {
          resultado = await evolutionApiService.enviarMensagemTexto(recipient, message);
        }

        if (resultado.sucesso) {
          await notification.update({
            status: 'sent',
            externalId: resultado.externalId,
            sentAt: moment.tz(TIMEZONE).toDate()
          });
        } else {
          await notification.update({
            status: 'failed',
            errorMessage: resultado.erro
          });
        }
      } else if (channel === 'email') {
        // TODO: Implementar envio de email
        await notification.update({
          status: 'failed',
          errorMessage: 'Envio de email ainda não implementado'
        });
      } else if (channel === 'sms') {
        // TODO: Implementar envio de SMS
        await notification.update({
          status: 'failed',
          errorMessage: 'Envio de SMS ainda não implementado'
        });
      }

      return notification;
    } catch (error) {
      await notification.update({
        status: 'failed',
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Enviar notificação para um grupo
   */
  async enviarNotificacaoParaGrupo(groupId, dados, userId = null) {
    const group = await EventNotificationGroup.findByPk(groupId, {
      include: [
        {
          model: EventNotificationGroupMember,
          as: 'members',
          include: [{ model: Registration, as: 'registration' }]
        }
      ]
    });

    if (!group) {
      throw new Error('Grupo não encontrado');
    }

    const resultados = {
      total: group.members.length,
      enviados: 0,
      falhas: 0,
      erros: []
    };

    // Enviar para cada membro
    for (let index = 0; index < group.members.length; index += 1) {
      const member = group.members[index];
      try {
        await this.enviarNotificacao({
          ...dados,
          registrationId: member.registrationId,
          groupId
        }, userId);
        resultados.enviados++;
      } catch (error) {
        resultados.falhas++;
        resultados.erros.push({
          registrationId: member.registrationId,
          erro: error.message
        });
      }

      if (GROUP_SEND_DELAY_MS > 0 && index < group.members.length - 1) {
        await sleep(GROUP_SEND_DELAY_MS);
      }
    }

    return resultados;
  }

  /**
   * Listar notificações de um evento
   */
  async listarNotificacoes(eventId, filtros = {}) {
    const where = { eventId };

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.channel) {
      where.channel = filtros.channel;
    }

    if (filtros.dataInicio && filtros.dataFim) {
      where.createdAt = {
        [Op.between]: [
          moment.tz(filtros.dataInicio, TIMEZONE).startOf('day').toDate(),
          moment.tz(filtros.dataFim, TIMEZONE).endOf('day').toDate()
        ]
      };
    }

    return EventNotification.findAll({
      where,
      include: [
        {
          model: Registration,
          as: 'registration',
          attributes: ['id', 'orderCode', 'buyerData']
        },
        {
          model: EventNotificationTemplate,
          as: 'template',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: filtros.limit || 100
    });
  }

  /**
   * Obter estatísticas de notificações
   */
  async obterEstatisticas(eventId) {
    const total = await EventNotification.count({ where: { eventId } });

    const porStatus = await EventNotification.findAll({
      where: { eventId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      group: ['status'],
      raw: true
    });

    const porCanal = await EventNotification.findAll({
      where: { eventId },
      attributes: [
        'channel',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      group: ['channel'],
      raw: true
    });

    return {
      total,
      porStatus,
      porCanal
    };
  }

  /**
   * Processar webhook da Evolution API
   */
  async processarWebhook(webhookData) {
    const info = evolutionApiService.processarWebhook(webhookData);
    
    if (!info || !info.messageId) {
      return { message: 'Webhook ignorado - sem messageId' };
    }

    // Buscar notificação pelo externalId
    const notification = await EventNotification.findOne({
      where: { externalId: info.messageId }
    });

    if (!notification) {
      return { message: 'Notificação não encontrada' };
    }

    // Atualizar status
    const updates = { status: info.status };

    if (info.status === 'delivered') {
      updates.deliveredAt = moment.tz(TIMEZONE).toDate();
    } else if (info.status === 'read') {
      updates.readAt = moment.tz(TIMEZONE).toDate();
    }

    await notification.update(updates);

    return { message: 'Webhook processado com sucesso', notification };
  }
}

module.exports = new NotificationService();
