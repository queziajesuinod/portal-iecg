/**
 * Visibilidade de eventos por perfil.
 *
 * Regra:
 *  - Quem tem ADMIN_FULL_ACCESS ou a permissao EVENTS_VIEW_ALL ve TODOS os eventos.
 *  - Os demais (ex.: perfil "coordenador") so veem os eventos em que estao
 *    vinculados como coordenador (User -> Member.userId -> EventCoordinator.memberId).
 */
const { Member, EventCoordinator } = require('../models');
const { getUserPermissionNames } = require('./permissionResolver');

const VIEW_ALL_PERMISSIONS = ['ADMIN_FULL_ACCESS', 'EVENTS_VIEW_ALL'];

/**
 * Resolve (e memoiza no req) a visibilidade do usuario atual.
 * @returns {Promise<{ seeAll: boolean, allowedEventIds: string[] }>}
 */
async function resolveEventVisibility(req) {
  if (req._eventVisibility) return req._eventVisibility;

  const userId = req.user?.userId;
  const permissoes = await getUserPermissionNames(userId);
  const seeAll = permissoes.some((p) => VIEW_ALL_PERMISSIONS.includes(p));

  let allowedEventIds = [];
  if (!seeAll && userId) {
    const member = await Member.findOne({ where: { userId }, attributes: ['id'] });
    if (member) {
      const coords = await EventCoordinator.findAll({
        where: { memberId: member.id },
        attributes: ['eventId']
      });
      allowedEventIds = Array.from(new Set(coords.map((c) => c.eventId)));
    }
  }

  req._eventVisibility = { seeAll, allowedEventIds };
  return req._eventVisibility;
}

/**
 * Middleware: bloqueia acesso a um evento fora da visibilidade do usuario.
 * @param {string} paramName - nome do parametro de rota com o eventId (ex.: 'eventId' ou 'id')
 */
function eventVisibilityGuard(paramName = 'eventId') {
  return async (req, res, next) => {
    try {
      const vis = await resolveEventVisibility(req);
      if (vis.seeAll) return next();
      const eventId = req.params[paramName];
      if (eventId && vis.allowedEventIds.includes(eventId)) return next();
      return res.status(403).json({ message: 'Você não tem acesso a este evento.' });
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  resolveEventVisibility,
  eventVisibilityGuard,
  VIEW_ALL_PERMISSIONS
};
