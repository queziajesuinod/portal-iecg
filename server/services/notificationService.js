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
        { model: RegistrationAttendee, as: 'attendees' }
      ]
    });

    if (!registration) {
      throw new Error('Inscrição não encontrada');
    }

    // Preparar dados para substituição de variáveis
    const dadosSubstituicao = {
      nome: registration.buyerData?.name || 'Participante',
      evento: registration.event.title,
      data: moment(registration.event.startDate).tz(TIMEZONE).format('DD/MM/YYYY'),
      hora: moment(registration.event.startDate).tz(TIMEZONE).format('HH:mm'),
      local: registration.event.location || '',
      codigo: registration.orderCode,
      link: `${process.env.FRONTEND_URL}/eventos/${registration.event.id}`,
      valor: registration.totalAmount ? `R$ ${registration.totalAmount.toFixed(2)}` : '',
      lote: registration.batch?.name || ''
    };

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

    // Obter destinatário
    let recipient = '';
    if (channel === 'whatsapp' || channel === 'sms') {
      recipient = registration.buyerData?.phone || registration.buyerData?.whatsapp;
      if (!recipient) {
        throw new Error('Telefone não encontrado na inscrição');
      }
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
    for (const member of group.members) {
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
