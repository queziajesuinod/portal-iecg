const {
  EventCheckIn,
  EventCheckInSchedule,
  EventCheckInStation,
  Registration,
  RegistrationAttendee,
  Event,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

// Timezone de Campo Grande, MS
const TIMEZONE = 'America/Campo_Grande';

class CheckInService {
  /**
   * Criar agendamento de check-in
   */
  async criarAgendamento(dados) {
    const { eventId, name, startTime, endTime, isActive = true } = dados;

    if (!eventId || !name || !startTime || !endTime) {
      throw new Error('Campos obrigatórios: eventId, name, startTime, endTime');
    }

    // Verificar se o evento existe
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Evento não encontrado');
    }

    // Validar datas
    const start = moment.tz(startTime, TIMEZONE);
    const end = moment.tz(endTime, TIMEZONE);

    if (end.isBefore(start)) {
      throw new Error('Data de fim deve ser posterior à data de início');
    }

    return EventCheckInSchedule.create({
      eventId,
      name,
      startTime: start.toDate(),
      endTime: end.toDate(),
      isActive
    });
  }

  /**
   * Listar agendamentos de um evento
   */
  async listarAgendamentos(eventId) {
    return EventCheckInSchedule.findAll({
      where: { eventId },
      order: [['startTime', 'ASC']]
    });
  }

  /**
   * Atualizar agendamento
   */
  async atualizarAgendamento(id, dados) {
    const schedule = await EventCheckInSchedule.findByPk(id);
    if (!schedule) {
      throw new Error('Agendamento não encontrado');
    }

    const updates = { ...dados };

    // Converter datas para o timezone correto
    if (updates.startTime) {
      updates.startTime = moment.tz(updates.startTime, TIMEZONE).toDate();
    }
    if (updates.endTime) {
      updates.endTime = moment.tz(updates.endTime, TIMEZONE).toDate();
    }

    // Validar datas
    const start = moment.tz(updates.startTime || schedule.startTime, TIMEZONE);
    const end = moment.tz(updates.endTime || schedule.endTime, TIMEZONE);

    if (end.isBefore(start)) {
      throw new Error('Data de fim deve ser posterior à data de início');
    }

    return schedule.update(updates);
  }

  /**
   * Deletar agendamento
   */
  async deletarAgendamento(id) {
    const schedule = await EventCheckInSchedule.findByPk(id);
    if (!schedule) {
      throw new Error('Agendamento não encontrado');
    }

    await schedule.destroy();
    return { message: 'Agendamento deletado com sucesso' };
  }

  /**
   * Criar estação de check-in
   */
  async criarEstacao(dados) {
    const { eventId, name, latitude, longitude, nfcTagId, isActive = true } = dados;

    if (!eventId || !name) {
      throw new Error('Campos obrigatórios: eventId, name');
    }

    // Verificar se o evento existe
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Evento não encontrado');
    }

    // Se tem NFC, verificar se já não está em uso
    if (nfcTagId) {
      const existing = await EventCheckInStation.findOne({
        where: {
          nfcTagId,
          isActive: true,
          id: { [Op.ne]: dados.id || null }
        }
      });

      if (existing) {
        throw new Error('Esta tag NFC já está em uso em outra estação');
      }
    }

    return EventCheckInStation.create({
      eventId,
      name,
      latitude,
      longitude,
      nfcTagId,
      isActive
    });
  }

  /**
   * Listar estações de um evento
   */
  async listarEstacoes(eventId) {
    return EventCheckInStation.findAll({
      where: { eventId },
      order: [['name', 'ASC']]
    });
  }

  /**
   * Atualizar estação
   */
  async atualizarEstacao(id, dados) {
    const station = await EventCheckInStation.findByPk(id);
    if (!station) {
      throw new Error('Estação não encontrada');
    }

    // Se está atualizando NFC, verificar se já não está em uso
    if (dados.nfcTagId && dados.nfcTagId !== station.nfcTagId) {
      const existing = await EventCheckInStation.findOne({
        where: {
          nfcTagId: dados.nfcTagId,
          isActive: true,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        throw new Error('Esta tag NFC já está em uso em outra estação');
      }
    }

    return station.update(dados);
  }

  /**
   * Deletar estação
   */
  async deletarEstacao(id) {
    const station = await EventCheckInStation.findByPk(id);
    if (!station) {
      throw new Error('Estação não encontrada');
    }

    await station.destroy();
    return { message: 'Estação deletada com sucesso' };
  }

  /**
   * Verificar se há agendamento ativo no momento
   */
  async verificarAgendamentoAtivo(eventId) {
    const agora = moment.tz(TIMEZONE).toDate();

    const schedule = await EventCheckInSchedule.findOne({
      where: {
        eventId,
        isActive: true,
        startTime: { [Op.lte]: agora },
        endTime: { [Op.gte]: agora }
      }
    });

    return schedule;
  }

  /**
   * Verificar se já existe check-in recente (evitar duplicação)
   */
  async verificarCheckInRecente(registrationId, attendeeId = null, minutos = 5) {
    const tempoLimite = moment.tz(TIMEZONE).subtract(minutos, 'minutes').toDate();

    const where = {
      registrationId,
      checkInAt: { [Op.gte]: tempoLimite }
    };

    if (attendeeId) {
      where.attendeeId = attendeeId;
    }

    const checkInRecente = await EventCheckIn.findOne({
      where,
      order: [['checkInAt', 'DESC']]
    });

    return checkInRecente;
  }

  /**
   * Realizar check-in manual (por staff)
   */
  async realizarCheckInManual(dados, userId) {
    const {
      registrationId,
      attendeeId,
      eventId,
      stationId,
      notes
    } = dados;

    // Validações
    if (!registrationId || !eventId) {
      throw new Error('Campos obrigatórios: registrationId, eventId');
    }

    // Verificar se a inscrição existe e está confirmada
    const registration = await Registration.findByPk(registrationId, {
      include: [
        { model: Event, as: 'event' },
        { model: RegistrationAttendee, as: 'attendees' }
      ]
    });

    if (!registration) {
      throw new Error('Inscrição não encontrada');
    }

    if (registration.paymentStatus !== 'confirmed') {
      throw new Error('Inscrição não está confirmada. Status: ' + registration.paymentStatus);
    }

    // Verificar se o evento está ativo
    if (!registration.event.isActive) {
      throw new Error('Evento não está ativo');
    }

    // Verificar se há agendamento ativo
    const scheduleAtivo = await this.verificarAgendamentoAtivo(eventId);
    if (!scheduleAtivo) {
      throw new Error('Não há agendamento de check-in ativo no momento');
    }

    // Verificar check-in duplicado
    const checkInRecente = await this.verificarCheckInRecente(registrationId, attendeeId);
    if (checkInRecente) {
      throw new Error('Check-in já realizado recentemente');
    }

    // Se especificou attendeeId, verificar se pertence a esta inscrição
    if (attendeeId) {
      const attendee = registration.attendees.find(a => a.id === attendeeId);
      if (!attendee) {
        throw new Error('Inscrito não encontrado nesta inscrição');
      }
    }

    // Criar check-in
    return EventCheckIn.create({
      registrationId,
      attendeeId,
      eventId,
      scheduleId: scheduleAtivo.id,
      stationId,
      checkInMethod: 'manual',
      checkInAt: moment.tz(TIMEZONE).toDate(),
      checkInBy: userId,
      notes
    });
  }

  /**
   * Realizar check-in via QR Code
   */
  async realizarCheckInQRCode(dados) {
    const {
      orderCode,
      attendeeId,
      eventId,
      stationId,
      latitude,
      longitude,
      deviceInfo
    } = dados;

    if (!orderCode || !eventId) {
      throw new Error('Campos obrigatórios: orderCode, eventId');
    }

    // Buscar inscrição pelo código
    const registration = await Registration.findOne({
      where: { orderCode },
      include: [
        { model: Event, as: 'event' },
        { model: RegistrationAttendee, as: 'attendees' }
      ]
    });

    if (!registration) {
      throw new Error('Inscrição não encontrada');
    }

    if (registration.eventId !== eventId) {
      throw new Error('Código de inscrição não pertence a este evento');
    }

    if (registration.paymentStatus !== 'confirmed') {
      throw new Error('Inscrição não está confirmada');
    }

    // Verificar agendamento ativo
    const scheduleAtivo = await this.verificarAgendamentoAtivo(eventId);
    if (!scheduleAtivo) {
      throw new Error('Não há agendamento de check-in ativo no momento');
    }

    // Verificar duplicação
    const checkInRecente = await this.verificarCheckInRecente(registration.id, attendeeId);
    if (checkInRecente) {
      throw new Error('Check-in já realizado recentemente');
    }

    // Criar check-in
    return EventCheckIn.create({
      registrationId: registration.id,
      attendeeId,
      eventId,
      scheduleId: scheduleAtivo.id,
      stationId,
      checkInMethod: 'qrcode',
      checkInAt: moment.tz(TIMEZONE).toDate(),
      latitude,
      longitude,
      deviceInfo
    });
  }

  /**
   * Realizar check-in via NFC
   */
  async realizarCheckInNFC(dados) {
    const {
      nfcTagId,
      orderCode,
      attendeeId,
      latitude,
      longitude,
      deviceInfo
    } = dados;

    if (!nfcTagId || !orderCode) {
      throw new Error('Campos obrigatórios: nfcTagId, orderCode');
    }

    // Buscar estação pela tag NFC
    const station = await EventCheckInStation.findOne({
      where: { nfcTagId, isActive: true },
      include: [{ model: Event, as: 'event' }]
    });

    if (!station) {
      throw new Error('Tag NFC não encontrada ou inativa');
    }

    const eventId = station.eventId;

    // Buscar inscrição
    const registration = await Registration.findOne({
      where: { orderCode },
      include: [
        { model: Event, as: 'event' },
        { model: RegistrationAttendee, as: 'attendees' }
      ]
    });

    if (!registration) {
      throw new Error('Inscrição não encontrada');
    }

    if (registration.eventId !== eventId) {
      throw new Error('Código de inscrição não pertence a este evento');
    }

    if (registration.paymentStatus !== 'confirmed') {
      throw new Error('Inscrição não está confirmada');
    }

    // Verificar agendamento ativo
    const scheduleAtivo = await this.verificarAgendamentoAtivo(eventId);
    if (!scheduleAtivo) {
      throw new Error('Não há agendamento de check-in ativo no momento');
    }

    // Verificar duplicação (para NFC, usar janela menor - 2 minutos)
    const checkInRecente = await this.verificarCheckInRecente(registration.id, attendeeId, 2);
    if (checkInRecente) {
      throw new Error('Check-in já realizado recentemente');
    }

    // Criar check-in
    return EventCheckIn.create({
      registrationId: registration.id,
      attendeeId,
      eventId,
      scheduleId: scheduleAtivo.id,
      stationId: station.id,
      checkInMethod: 'nfc',
      checkInAt: moment.tz(TIMEZONE).toDate(),
      latitude,
      longitude,
      deviceInfo
    });
  }

  /**
   * Listar check-ins de um evento
   */
  async listarCheckIns(eventId, filtros = {}) {
    const where = { eventId };

    // Filtros opcionais
    if (filtros.scheduleId) {
      where.scheduleId = filtros.scheduleId;
    }

    if (filtros.stationId) {
      where.stationId = filtros.stationId;
    }

    if (filtros.checkInMethod) {
      where.checkInMethod = filtros.checkInMethod;
    }

    if (filtros.dataInicio && filtros.dataFim) {
      where.checkInAt = {
        [Op.between]: [
          moment.tz(filtros.dataInicio, TIMEZONE).startOf('day').toDate(),
          moment.tz(filtros.dataFim, TIMEZONE).endOf('day').toDate()
        ]
      };
    }

    return EventCheckIn.findAll({
      where,
      include: [
        {
          model: Registration,
          as: 'registration',
          attributes: ['id', 'orderCode', 'buyerData']
        },
        {
          model: RegistrationAttendee,
          as: 'attendee',
          attributes: ['id', 'attendeeData']
        },
        {
          model: EventCheckInSchedule,
          as: 'schedule',
          attributes: ['id', 'name']
        },
        {
          model: EventCheckInStation,
          as: 'station',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'name']
        }
      ],
      order: [['checkInAt', 'DESC']]
    });
  }

  /**
   * Obter estatísticas de check-in de um evento
   */
  async obterEstatisticas(eventId) {
    const totalCheckIns = await EventCheckIn.count({ where: { eventId } });

    const totalInscricoes = await Registration.count({
      where: {
        eventId,
        paymentStatus: 'confirmed'
      }
    });

    const porMetodo = await EventCheckIn.findAll({
      where: { eventId },
      attributes: [
        'checkInMethod',
        [sequelize.fn('COUNT', sequelize.col('EventCheckIn.id')), 'total']
      ],
      group: ['checkInMethod'],
      raw: true
    });

    const porAgendamento = await EventCheckIn.findAll({
      where: { eventId },
      attributes: [
        'scheduleId',
        [sequelize.fn('COUNT', sequelize.col('EventCheckIn.id')), 'total']
      ],
      include: [
        {
          model: EventCheckInSchedule,
          as: 'schedule',
          attributes: ['name']
        }
      ],
      group: ['scheduleId', 'schedule.id', 'schedule.name']
    });

    const taxaComparecimento = totalInscricoes > 0
      ? ((totalCheckIns / totalInscricoes) * 100).toFixed(2)
      : 0;

    return {
      totalCheckIns,
      totalInscricoes,
      taxaComparecimento: parseFloat(taxaComparecimento),
      porMetodo,
      porAgendamento
    };
  }

  /**
   * Validar código de inscrição (para QR Code scanner)
   */
  async validarCodigo(orderCode) {
    const registration = await Registration.findOne({
      where: { orderCode },
      include: [
        { model: Event, as: 'event' },
        { model: RegistrationAttendee, as: 'attendees' }
      ]
    });

    if (!registration) {
      return {
        valido: false,
        mensagem: 'Código de inscrição não encontrado'
      };
    }

    if (registration.paymentStatus !== 'confirmed') {
      return {
        valido: false,
        mensagem: 'Inscrição não está confirmada',
        registration: {
          orderCode: registration.orderCode,
          status: registration.paymentStatus
        }
      };
    }

    // Verificar se já fez check-in
    const checkIn = await EventCheckIn.findOne({
      where: { registrationId: registration.id },
      order: [['checkInAt', 'DESC']]
    });

    return {
      valido: true,
      jaFezCheckIn: !!checkIn,
      checkInAt: checkIn ? checkIn.checkInAt : null,
      registration: {
        id: registration.id,
        orderCode: registration.orderCode,
        eventId: registration.eventId,
        eventTitle: registration.event.title,
        buyerData: registration.buyerData,
        attendees: registration.attendees
      }
    };
  }
}

module.exports = new CheckInService();
