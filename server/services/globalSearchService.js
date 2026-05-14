const { Op } = require('sequelize');
const {
  Member, Event, Registration, sequelize
} = require('../models');

const LIMIT = 5;

async function search(q) {
  const term = q ? q.trim() : '';
  if (term.length < 2) return { members: [], events: [], registrations: [] };

  const like = `%${term}%`;

  const [members, events, registrations] = await Promise.all([
    Member.findAll({
      where: {
        [Op.or]: [
          { fullName: { [Op.iLike]: like } },
          { email: { [Op.iLike]: like } },
          { phone: { [Op.iLike]: like } },
          { whatsapp: { [Op.iLike]: like } },
          { cpf: { [Op.iLike]: like } }
        ]
      },
      attributes: ['id', 'fullName', 'email', 'phone', 'whatsapp', 'status'],
      limit: LIMIT,
      order: [['fullName', 'ASC']]
    }),

    Event.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: like } },
          { location: { [Op.iLike]: like } },
          { city: { [Op.iLike]: like } }
        ]
      },
      attributes: ['id', 'title', 'startDate', 'city', 'eventType', 'isActive'],
      limit: LIMIT,
      order: [['startDate', 'DESC']]
    }),

    Registration.findAll({
      where: {
        [Op.or]: [
          { orderCode: { [Op.iLike]: like } },
          sequelize.where(
            sequelize.cast(sequelize.col('Registration.buyerData'), 'text'),
            { [Op.iLike]: like }
          )
        ]
      },
      attributes: ['id', 'orderCode', 'buyerData', 'paymentStatus'],
      include: [{ model: Event, as: 'event', attributes: ['id', 'title'] }],
      limit: LIMIT,
      order: [['createdAt', 'DESC']]
    })
  ]);

  return {
    members: members.map((m) => ({
      id: m.id,
      label: m.fullName,
      sub: m.email || m.phone || m.whatsapp || '',
      badge: m.status,
      link: '/app/start/membros'
    })),
    events: events.map((e) => ({
      id: e.id,
      label: e.title,
      sub: [e.city, e.startDate ? new Date(e.startDate).toLocaleDateString('pt-BR') : null].filter(Boolean).join(' · '),
      badge: e.isActive ? 'Ativo' : 'Encerrado',
      link: `/app/events/${e.id}`
    })),
    registrations: registrations.map((r) => ({
      id: r.id,
      label: r.buyerData?.buyer_name || r.buyerData?.nome || r.buyerData?.name || r.orderCode,
      sub: `${r.orderCode}${r.event?.title ? ` · ${r.event.title}` : ''}`,
      badge: r.paymentStatus,
      link: `/app/events/registrations/${r.id}`
    }))
  };
}

module.exports = { search };
