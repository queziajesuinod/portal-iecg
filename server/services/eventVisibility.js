/**
 * Visibilidade de eventos por perfil.
 *
 * Regra:
 *  - Quem tem ADMIN_FULL_ACCESS ou a permissao EVENTS_VIEW_ALL ve TODOS os eventos.
 *  - Os demais (ex.: perfil "coordenador") so veem os eventos em que estao
 *    vinculados como coordenador. O vinculo e reconhecido por qualquer um destes:
 *      a) membro do usuario (User -> Member.userId) apontado em EventCoordinator.memberId;
 *      b) e-mail de login do usuario igual ao e-mail do coordenador; ou
 *      c) e-mail de login igual ao e-mail do membro vinculado ao coordenador.
 *    O casamento por e-mail cobre coordenadores cadastrados so com contato
 *    (sem membro vinculado) ou membros sem conta de login (sem userId).
 */
const {
  Op, fn, col, where
} = require('sequelize');
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
    const member = await Member.findOne({ where: { userId }, attributes: ['id', 'email'] });

    const orConditions = [];
    if (member) orConditions.push({ memberId: member.id });

    // Casa tambem pelo e-mail (login do usuario e/ou e-mail do membro),
    // para coordenadores cadastrados so com contato ou membros sem conta.
    const emails = Array.from(new Set(
      [req.user?.email, member?.email]
        .filter(Boolean)
        .map((e) => String(e).trim().toLowerCase())
    ));
    if (emails.length) {
      orConditions.push(where(fn('lower', col('email')), { [Op.in]: emails }));
    }

    if (orConditions.length) {
      const coords = await EventCoordinator.findAll({
        where: orConditions.length === 1 ? orConditions[0] : { [Op.or]: orConditions },
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
