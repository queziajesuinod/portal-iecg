const { Op } = require('sequelize');
const moment = require('moment-timezone');
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

// Timezone de Campo Grande, MS
const TIMEZONE = 'America/Campo_Grande';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isInscricaoConfirmada(registration) {
  if (registration.paymentStatus === 'confirmed') return true;
  if (registration.paymentStatus === 'partial'
      && registration.event?.registrationPaymentMode === 'BALANCE_DUE') return true;
  return false;
}

class CheckInService {
  obterEventId(payload = {}) {
    return payload.eventId || payload.event_id || null;
  }

  obterNomeAttendee(attendee, fallback = 'Inscrito') {
    const attendeeData = attendee?.attendeeData || {};
    return attendeeData.nome_completo
      || attendeeData.name
      || attendeeData.nome
      || fallback;
  }

  // Normaliza buyerData/attendeeData (pode vir como objeto ou string JSON)
  _parseDados(data) {
    if (!data) return {};
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (_) {
        return {};
      }
    }
    return typeof data === 'object' ? data : {};
  }

  // Todos os valores (string, minusculos) de um objeto de dados
  _coletarValores(data) {
    return Object.values(this._parseDados(data))
      .map((valor) => String(valor ?? '').trim().toLowerCase())
      .filter(Boolean);
  }

  // Primeiro campo cujo NOME contenha "email" (cobre buyer_email, email_do_inscrito, etc.)
  _extrairEmail(data) {
    const obj = this._parseDados(data);
    if (obj.email) return obj.email;
    const chave = Object.keys(obj).find(
      (k) => k.toLowerCase().includes('email') && obj[k]
    );
    return chave ? obj[chave] : null;
  }

  obterEmailAttendee(attendee, registration = null) {
    return (
      this._extrairEmail(attendee?.attendeeData)
      || this._extrairEmail(registration?.buyerData)
      || null
    );
  }

  /**
   * Monta a resposta de um check-in bem sucedido com dados para exibir a
   * confirmacao no app (nome do inscrito, agendamento, horario).
   */
  montarRespostaCheckIn(checkIn, { registration, attendee, schedule } = {}) {
    const nome = this.obterNomeAttendee(attendee);
    const email = this.obterEmailAttendee(attendee, registration);
    const checkInAtLabel = checkIn.checkInAt
      ? moment.tz(checkIn.checkInAt, TIMEZONE).format('DD/MM/YYYY HH:mm')
      : null;

    return {
      success: true,
      id: checkIn.id,
      message: `Check-in de ${nome} realizado com sucesso!`,
      attendee: { name: nome, email },
      checkInAt: checkIn.checkInAt,
      checkInAtLabel,
      scheduleId: schedule?.id || checkIn.scheduleId || null,
      scheduleName: schedule?.name || null,
      method: checkIn.checkInMethod,
      registrationId: checkIn.registrationId,
      attendeeId: checkIn.attendeeId,
      orderCode: registration?.orderCode || null
    };
  }

  /**
   * Cria um erro estruturado (HTTP 409) para quando o inscrito ja fez check-in
   * no agendamento, carregando nome e horario do check-in anterior.
   */
  criarErroDuplicado(attendee, checkInExistente, schedule = null) {
    const nome = this.obterNomeAttendee(attendee);
    const horaLabel = checkInExistente?.checkInAt
      ? moment.tz(checkInExistente.checkInAt, TIMEZONE).format('DD/MM/YYYY HH:mm')
      : null;
    const mensagem = horaLabel
      ? `${nome} ja fez check-in neste agendamento em ${horaLabel}.`
      : `${nome} ja fez check-in neste agendamento.`;

    const erro = new Error(mensagem);
    erro.code = 'ALREADY_CHECKED_IN';
    erro.statusCode = 409;
    erro.details = {
      attendee: { name: nome },
      checkInAt: checkInExistente?.checkInAt || null,
      checkInAtLabel: horaLabel,
      scheduleName: schedule?.name || null
    };
    return erro;
  }

  resolverAttendeeParaCheckIn(registration, attendeeId) {
    const attendees = Array.isArray(registration?.attendees) ? registration.attendees : [];

    if (attendees.length === 0) {
      throw new Error('Nenhum inscrito encontrado para esta inscricao');
    }

    if (!attendeeId) {
      if (attendees.length === 1) {
        return attendees[0];
      }
      throw new Error('attendeeId e obrigatorio para esta inscricao');
    }

    const attendee = attendees.find((item) => String(item.id) === String(attendeeId));
    if (!attendee) {
      throw new Error('Inscrito nao encontrado nesta inscricao');
    }

    return attendee;
  }

  /**
   * Criar agendamento de check-in
   */
  async criarAgendamento(dados) {
    const {
      eventId, name, startTime, endTime, isActive = true
    } = dados;

    if (!eventId || !name || !startTime || !endTime) {
      throw new Error('Campos obrigatÃ³rios: eventId, name, startTime, endTime');
    }

    // Verificar se o evento existe
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Evento nÃ£o encontrado');
    }

    // Validar datas
    const start = moment.tz(startTime, TIMEZONE);
    const end = moment.tz(endTime, TIMEZONE);

    if (end.isBefore(start)) {
      throw new Error('Data de fim deve ser posterior Ã  data de inÃ­cio');
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
      throw new Error('Agendamento nÃ£o encontrado');
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
      throw new Error('Data de fim deve ser posterior Ã  data de inÃ­cio');
    }

    return schedule.update(updates);
  }

  /**
   * Deletar agendamento
   */
  async deletarAgendamento(id) {
    const schedule = await EventCheckInSchedule.findByPk(id);
    if (!schedule) {
      throw new Error('Agendamento nÃ£o encontrado');
    }

    await schedule.destroy();
    return { message: 'Agendamento deletado com sucesso' };
  }

  /**
   * Criar estaÃ§Ã£o de check-in
   */
  async criarEstacao(dados) {
    const {
      eventId, name, latitude, longitude, nfcTagId, isActive = true
    } = dados;

    if (!eventId || !name) {
      throw new Error('Campos obrigatÃ³rios: eventId, name');
    }

    // Verificar se o evento existe
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Evento nÃ£o encontrado');
    }

    // Se tem NFC, verificar se jÃ¡ nÃ£o estÃ¡ em uso
    if (nfcTagId) {
      const existing = await EventCheckInStation.findOne({
        where: {
          nfcTagId,
          isActive: true,
          id: { [Op.ne]: dados.id || null }
        }
      });

      if (existing) {
        throw new Error('Esta tag NFC jÃ¡ estÃ¡ em uso em outra estaÃ§Ã£o');
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
   * Listar estaÃ§Ãµes de um evento
   */
  async listarEstacoes(eventId) {
    return EventCheckInStation.findAll({
      where: { eventId },
      order: [['name', 'ASC']]
    });
  }

  /**
   * Atualizar estaÃ§Ã£o
   */
  async atualizarEstacao(id, dados) {
    const station = await EventCheckInStation.findByPk(id);
    if (!station) {
      throw new Error('EstaÃ§Ã£o nÃ£o encontrada');
    }

    // Se estÃ¡ atualizando NFC, verificar se jÃ¡ nÃ£o estÃ¡ em uso
    if (dados.nfcTagId && dados.nfcTagId !== station.nfcTagId) {
      const existing = await EventCheckInStation.findOne({
        where: {
          nfcTagId: dados.nfcTagId,
          isActive: true,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        throw new Error('Esta tag NFC jÃ¡ estÃ¡ em uso em outra estaÃ§Ã£o');
      }
    }

    return station.update(dados);
  }

  /**
   * Deletar estaÃ§Ã£o
   */
  async deletarEstacao(id) {
    const station = await EventCheckInStation.findByPk(id);
    if (!station) {
      throw new Error('EstaÃ§Ã£o nÃ£o encontrada');
    }

    await station.destroy();
    return { message: 'EstaÃ§Ã£o deletada com sucesso' };
  }

  /**
   * Verificar se hÃ¡ agendamento ativo no momento
   */
  async verificarAgendamentoAtivo(eventId) {
    const agora = moment.tz(TIMEZONE).toDate();

    const schedule = await EventCheckInSchedule.findOne({
      where: {
        eventId,
        isActive: true,
        startTime: { [Op.lte]: agora },
        endTime: { [Op.gte]: agora }
      },
      order: [['startTime', 'ASC'], ['createdAt', 'ASC']]
    });

    return schedule;
  }

  /**
   * Verificar se jÃ¡ existe check-in recente (evitar duplicaÃ§Ã£o)
   */
  async verificarCheckInNoAgendamento(registrationId, scheduleId, attendeeId = null, eventId = null) {
    const where = {
      registrationId,
      scheduleId
    };

    if (eventId) {
      where.eventId = eventId;
    }

    if (attendeeId) {
      // Compatibilidade com registros antigos sem attendeeId:
      // se já existe check-in null para a mesma inscrição/agendamento, também bloqueia.
      where[Op.or] = [
        { attendeeId },
        { attendeeId: null }
      ];
    }

    const checkInExistente = await EventCheckIn.findOne({
      where,
      order: [['checkInAt', 'DESC']]
    });

    return checkInExistente;
  }

  /**
   * Realizar check-in manual (por staff)
   */
  async realizarCheckInManual(dados, userId) {
    const {
      registrationId,
      orderCode,
      attendeeId,
      stationId,
      notes
    } = dados;
    const eventId = this.obterEventId(dados);

    if ((!registrationId && !orderCode) || !eventId) {
      throw new Error('Campos obrigatorios: registrationId ou orderCode, eventId/event_id');
    }

    const includeRegistration = [
      { model: Event, as: 'event' },
      { model: RegistrationAttendee, as: 'attendees' }
    ];

    const registrationIdentifier = String(registrationId || '').trim();
    const orderCodeIdentifier = String(orderCode || '').trim() || (!UUID_REGEX.test(registrationIdentifier) ? registrationIdentifier : '');

    let registration = null;
    if (registrationIdentifier && UUID_REGEX.test(registrationIdentifier)) {
      registration = await Registration.findByPk(registrationIdentifier, {
        include: includeRegistration
      });
    } else if (orderCodeIdentifier) {
      registration = await Registration.findOne({
        where: { orderCode: orderCodeIdentifier },
        include: includeRegistration
      });
    }

    if (!registration) {
      throw new Error('Inscricao nao encontrada');
    }

    if (registration.eventId !== eventId) {
      throw new Error('Codigo de inscricao nao pertence a este evento');
    }

    if (!isInscricaoConfirmada(registration)) {
      throw new Error('Inscricao nao esta confirmada. Status: ' + registration.paymentStatus);
    }

    if (!registration.event.isActive) {
      throw new Error('Evento nao esta ativo');
    }

    const scheduleAtivo = await this.verificarAgendamentoAtivo(eventId);
    if (!scheduleAtivo) {
      throw new Error('Nao ha agendamento de check-in ativo no momento');
    }

    const attendee = this.resolverAttendeeParaCheckIn(registration, attendeeId);

    const checkInNoAgendamento = await this.verificarCheckInNoAgendamento(
      registration.id,
      scheduleAtivo.id,
      attendee.id,
      eventId
    );
    if (checkInNoAgendamento) {
      throw this.criarErroDuplicado(attendee, checkInNoAgendamento, scheduleAtivo);
    }

    const checkIn = await EventCheckIn.create({
      registrationId: registration.id,
      attendeeId: attendee.id,
      eventId,
      scheduleId: scheduleAtivo.id,
      stationId,
      checkInMethod: 'manual',
      checkInAt: moment.tz(TIMEZONE).toDate(),
      checkInBy: userId,
      notes
    });

    return this.montarRespostaCheckIn(checkIn, { registration, attendee, schedule: scheduleAtivo });
  }

  /**
   * Realizar check-in via QR Code
   */
  async realizarCheckInQRCode(dados) {
    const {
      orderCode,
      attendeeId,
      stationId,
      latitude,
      longitude,
      deviceInfo
    } = dados;
    const eventId = this.obterEventId(dados);

    if (!orderCode || !eventId) {
      throw new Error('Campos obrigatorios: orderCode, eventId/event_id');
    }

    const registration = await Registration.findOne({
      where: { orderCode },
      include: [
        { model: Event, as: 'event' },
        { model: RegistrationAttendee, as: 'attendees' }
      ]
    });

    if (!registration) {
      throw new Error('Inscricao nao encontrada');
    }

    if (registration.eventId !== eventId) {
      throw new Error('Codigo de inscricao nao pertence a este evento');
    }

    if (!isInscricaoConfirmada(registration)) {
      throw new Error('Inscricao nao esta confirmada');
    }

    const attendee = this.resolverAttendeeParaCheckIn(registration, attendeeId);

    const scheduleAtivo = await this.verificarAgendamentoAtivo(eventId);
    if (!scheduleAtivo) {
      throw new Error('Nao ha agendamento de check-in ativo no momento');
    }

    const checkInNoAgendamento = await this.verificarCheckInNoAgendamento(
      registration.id,
      scheduleAtivo.id,
      attendee.id,
      eventId
    );
    if (checkInNoAgendamento) {
      throw this.criarErroDuplicado(attendee, checkInNoAgendamento, scheduleAtivo);
    }

    const checkIn = await EventCheckIn.create({
      registrationId: registration.id,
      attendeeId: attendee.id,
      eventId,
      scheduleId: scheduleAtivo.id,
      stationId,
      checkInMethod: 'qrcode',
      checkInAt: moment.tz(TIMEZONE).toDate(),
      latitude,
      longitude,
      deviceInfo
    });

    return this.montarRespostaCheckIn(checkIn, { registration, attendee, schedule: scheduleAtivo });
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
      throw new Error('Campos obrigatorios: nfcTagId, orderCode');
    }

    const station = await EventCheckInStation.findOne({
      where: { nfcTagId, isActive: true },
      include: [{ model: Event, as: 'event' }]
    });

    if (!station) {
      throw new Error('Tag NFC nao encontrada ou inativa');
    }

    const { eventId } = station;

    const registration = await Registration.findOne({
      where: { orderCode },
      include: [
        { model: Event, as: 'event' },
        { model: RegistrationAttendee, as: 'attendees' }
      ]
    });

    if (!registration) {
      throw new Error('Inscricao nao encontrada');
    }

    if (registration.eventId !== eventId) {
      throw new Error('Codigo de inscricao nao pertence a este evento');
    }

    if (!isInscricaoConfirmada(registration)) {
      throw new Error('Inscricao nao esta confirmada');
    }

    const attendee = this.resolverAttendeeParaCheckIn(registration, attendeeId);

    const scheduleAtivo = await this.verificarAgendamentoAtivo(eventId);
    if (!scheduleAtivo) {
      throw new Error('Nao ha agendamento de check-in ativo no momento');
    }

    const checkInNoAgendamento = await this.verificarCheckInNoAgendamento(
      registration.id,
      scheduleAtivo.id,
      attendee.id,
      eventId
    );
    if (checkInNoAgendamento) {
      throw this.criarErroDuplicado(attendee, checkInNoAgendamento, scheduleAtivo);
    }

    const checkIn = await EventCheckIn.create({
      registrationId: registration.id,
      attendeeId: attendee.id,
      eventId,
      scheduleId: scheduleAtivo.id,
      stationId: station.id,
      checkInMethod: 'nfc',
      checkInAt: moment.tz(TIMEZONE).toDate(),
      latitude,
      longitude,
      deviceInfo
    });

    return this.montarRespostaCheckIn(checkIn, { registration, attendee, schedule: scheduleAtivo });
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
          attributes: ['id', 'orderCode', 'buyerData'],
          include: [
            {
              model: RegistrationAttendee,
              as: 'attendees',
              attributes: ['id', 'attendeeData']
            }
          ]
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
   * Obter estatÃ­sticas de check-in de um evento
   */
  async obterEstatisticas(eventId) {
    const event = await Event.findByPk(eventId, { attributes: ['registrationPaymentMode'] });
    const confirmedStatuses = event?.registrationPaymentMode === 'BALANCE_DUE'
      ? ['confirmed', 'partial']
      : ['confirmed'];

    // Total de INSCRITOS (attendees) de inscricoes confirmadas — nao de pedidos/compras.
    const totalInscritos = await RegistrationAttendee.count({
      include: [{
        model: Registration,
        as: 'registration',
        attributes: [],
        required: true,
        where: {
          eventId,
          paymentStatus: { [Op.in]: confirmedStatuses }
        }
      }]
    });

    // Escopo dos contadores: agendamento ativo no momento.
    const scheduleAtivo = await this.verificarAgendamentoAtivo(eventId);

    // Feitos = inscritos distintos que fizeram check-in no agendamento ativo.
    const done = scheduleAtivo
      ? await EventCheckIn.count({
        where: { eventId, scheduleId: scheduleAtivo.id },
        distinct: true,
        col: 'attendeeId'
      })
      : 0;

    const pending = Math.max(totalInscritos - done, 0);

    // Total historico de check-ins (todos os agendamentos), para relatorios.
    const totalCheckIns = await EventCheckIn.count({ where: { eventId } });

    // Inscritos distintos que compareceram em qualquer agendamento (para a taxa).
    const totalPresentes = await EventCheckIn.count({
      where: { eventId },
      distinct: true,
      col: 'attendeeId'
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

    // Taxa baseada em inscritos distintos presentes (nunca passa de 100%).
    const taxaComparecimento = totalInscritos > 0
      ? ((totalPresentes / totalInscritos) * 100).toFixed(2)
      : 0;

    return {
      // Contadores exibidos no app (por inscrito, escopo do agendamento ativo)
      done,
      pending,
      totalInscritos,
      totalCheckInsNoAgendamento: done,
      scheduleAtivo: scheduleAtivo
        ? { id: scheduleAtivo.id, name: scheduleAtivo.name }
        : null,
      // Escopo do evento inteiro
      totalPresentes,
      pendingEvento: Math.max(totalInscritos - totalPresentes, 0),
      // Compatibilidade / relatorios
      totalInscricoes: totalInscritos,
      totalCheckIns,
      taxaComparecimento: parseFloat(taxaComparecimento),
      porMetodo,
      porAgendamento
    };
  }

  /**
   * Obter configuraÃ§Ã£o pÃºblica de check-in de um evento
   */
  async obterConfiguracaoPublica(eventId) {
    if (!eventId) {
      throw new Error('eventId Ã© obrigatÃ³rio');
    }

    const event = await Event.findByPk(eventId, {
      attributes: ['id', 'title', 'isActive']
    });

    if (!event) {
      throw new Error('Evento nÃ£o encontrado');
    }

    if (!event.isActive) {
      throw new Error('Evento nÃ£o estÃ¡ ativo');
    }

    const [scheduleAtivo, estacoes] = await Promise.all([
      this.verificarAgendamentoAtivo(eventId),
      EventCheckInStation.findAll({
        where: {
          eventId,
          isActive: true
        },
        attributes: ['id', 'name', 'latitude', 'longitude', 'nfcTagId'],
        order: [['name', 'ASC']]
      })
    ]);

    return {
      event: {
        id: event.id,
        title: event.title
      },
      schedule: scheduleAtivo
        ? {
          id: scheduleAtivo.id,
          name: scheduleAtivo.name,
          startTime: scheduleAtivo.startTime,
          endTime: scheduleAtivo.endTime
        }
        : null,
      stations: estacoes
    };
  }

  async listarAttendeesPublico({ orderCode, query, eventId } = {}) {
    const idEvento = String(eventId || '').trim();
    const termo = String(query || orderCode || '').trim();

    if (!termo) {
      throw new Error('Informe o codigo de inscricao ou o e-mail do comprador');
    }

    // Busca por e-mail do comprador: agrega os inscritos de todos os pedidos
    // confirmados daquele e-mail no evento.
    if (termo.includes('@')) {
      return this.listarAttendeesPorEmail(termo, idEvento);
    }

    const codigo = termo;
    const resultado = await this.validarCodigo(codigo);
    if (!resultado?.valido) {
      throw new Error(resultado?.mensagem || 'Codigo de inscricao invalido');
    }

    if (idEvento && String(resultado.registration?.eventId) !== idEvento) {
      throw new Error('Codigo de inscricao nao pertence a este evento');
    }

    const attendees = Array.isArray(resultado.registration?.attendees)
      ? resultado.registration.attendees
      : [];

    return {
      valido: true,
      matchedBy: 'orderCode',
      orderCode: resultado.registration?.orderCode,
      eventId: resultado.registration?.eventId,
      eventTitle: resultado.registration?.eventTitle,
      totalAttendees: attendees.length,
      totalCheckInsNoAgendamento: resultado.totalCheckInsNoAgendamento || 0,
      attendees,
      registration: resultado.registration
    };
  }

  /**
   * Buscar inscritos pelo e-mail do comprador dentro de um evento.
   * Agrega os inscritos de todos os pedidos confirmados daquele e-mail.
   */
  async listarAttendeesPorEmail(email, eventId) {
    if (!eventId) {
      throw new Error('eventId e obrigatorio para busca por e-mail');
    }

    const event = await Event.findByPk(eventId, {
      attributes: ['id', 'title', 'registrationPaymentMode']
    });
    if (!event) {
      throw new Error('Evento nao encontrado');
    }

    const confirmedStatuses = event.registrationPaymentMode === 'BALANCE_DUE'
      ? ['confirmed', 'partial']
      : ['confirmed'];
    const emailNormalizado = email.trim().toLowerCase();

    const registrations = await Registration.findAll({
      where: {
        eventId,
        paymentStatus: { [Op.in]: confirmedStatuses }
      },
      include: [{ model: RegistrationAttendee, as: 'attendees' }]
    });

    // Casa o e-mail com qualquer campo do comprador (buyer_email, email, ...)
    // ou de qualquer inscrito (email_do_inscrito, email, ...), sem depender do
    // nome exato do campo (que varia por evento).
    const pedidosDoEmail = registrations.filter((reg) => {
      if (this._coletarValores(reg.buyerData).includes(emailNormalizado)) {
        return true;
      }
      return (reg.attendees || []).some((att) => this._coletarValores(att.attendeeData).includes(emailNormalizado)
      );
    });

    if (pedidosDoEmail.length === 0) {
      throw new Error('Nenhuma inscricao confirmada encontrada para este e-mail neste evento');
    }

    const scheduleAtivo = await this.verificarAgendamentoAtivo(eventId);
    const attendees = [];

    for (const reg of pedidosDoEmail) {
      const checkInsAtivos = scheduleAtivo
        // eslint-disable-next-line no-await-in-loop
        ? await EventCheckIn.findAll({
          where: { registrationId: reg.id, scheduleId: scheduleAtivo.id },
          attributes: ['attendeeId', 'checkInAt']
        })
        : [];

      const checkInPorAttendee = checkInsAtivos.reduce((acc, checkIn) => {
        if (checkIn.attendeeId) {
          acc[String(checkIn.attendeeId)] = checkIn;
        }
        return acc;
      }, {});

      (reg.attendees || []).forEach((attendee, index) => {
        const checkIn = checkInPorAttendee[String(attendee.id)] || null;
        const attendeeJson = attendee.toJSON ? attendee.toJSON() : attendee;
        const nome = this.obterNomeAttendee(attendee, `Inscrito ${index + 1}`);

        attendees.push({
          ...attendeeJson,
          attendeeId: attendee.id,
          attendeeName: nome,
          name: nome,
          email: this.obterEmailAttendee(attendee, reg),
          orderCode: reg.orderCode,
          jaFezCheckInNoAgendamento: !!checkIn,
          checkInAt: checkIn ? checkIn.checkInAt : null
        });
      });
    }

    return {
      valido: true,
      matchedBy: 'email',
      query: email,
      eventId,
      eventTitle: event.title,
      totalPedidos: pedidosDoEmail.length,
      totalAttendees: attendees.length,
      attendees
    };
  }

  /**
   * Validar cÃ³digo de inscriÃ§Ã£o (para QR Code scanner)
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
        mensagem: 'Codigo de inscricao nao encontrado'
      };
    }

    if (!isInscricaoConfirmada(registration)) {
      return {
        valido: false,
        mensagem: 'Inscricao nao esta confirmada',
        registration: {
          orderCode: registration.orderCode,
          status: registration.paymentStatus
        }
      };
    }

    const ultimoCheckIn = await EventCheckIn.findOne({
      where: { registrationId: registration.id },
      order: [['checkInAt', 'DESC']]
    });

    const scheduleAtivo = await this.verificarAgendamentoAtivo(registration.eventId);
    const checkInsNoAgendamentoAtual = scheduleAtivo
      ? await EventCheckIn.findAll({
        where: {
          registrationId: registration.id,
          scheduleId: scheduleAtivo.id
        },
        attributes: ['id', 'attendeeId', 'checkInAt'],
        order: [['checkInAt', 'DESC']]
      })
      : [];

    const checkInByAttendeeId = checkInsNoAgendamentoAtual.reduce((acc, checkIn) => {
      if (!checkIn.attendeeId) {
        return acc;
      }

      const key = String(checkIn.attendeeId);
      if (!acc[key]) {
        acc[key] = checkIn;
      }
      return acc;
    }, {});

    const attendeesDetalhados = (registration.attendees || []).map((attendee, index) => {
      const key = String(attendee.id);
      const checkInAttendee = checkInByAttendeeId[key] || null;
      const attendeeJson = attendee.toJSON ? attendee.toJSON() : attendee;

      return {
        ...attendeeJson,
        attendeeName: this.obterNomeAttendee(attendee, `Inscrito ${index + 1}`),
        jaFezCheckInNoAgendamento: !!checkInAttendee,
        checkInAt: checkInAttendee ? checkInAttendee.checkInAt : null
      };
    });

    const totalCheckInsNoAgendamento = attendeesDetalhados.filter(
      (attendee) => attendee.jaFezCheckInNoAgendamento
    ).length;
    const checkInMaisRecenteNoAgendamento = checkInsNoAgendamentoAtual[0] || null;

    return {
      valido: true,
      jaFezCheckIn: totalCheckInsNoAgendamento > 0,
      checkInAt: checkInMaisRecenteNoAgendamento ? checkInMaisRecenteNoAgendamento.checkInAt : null,
      jaFezCheckInHistorico: !!ultimoCheckIn,
      ultimoCheckInAt: ultimoCheckIn ? ultimoCheckIn.checkInAt : null,
      totalAttendees: attendeesDetalhados.length,
      totalCheckInsNoAgendamento,
      registration: {
        id: registration.id,
        orderCode: registration.orderCode,
        eventId: registration.eventId,
        eventTitle: registration.event.title,
        buyerData: registration.buyerData,
        attendees: attendeesDetalhados
      }
    };
  }
}

module.exports = new CheckInService();
