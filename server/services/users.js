const crypto = require('crypto');
const uuid = require('uuid');
const { Op } = require('sequelize');
const {
  User,
  Perfil,
  Permissao,
  Member
} = require('../models');
const { buildPermissionInclude } = require('./permissionResolver');
const { normalizeCpf } = require('../utils/cpf');

async function syncUserPerfis(user, perfilIds = []) {
  if (!user || !Array.isArray(perfilIds)) {
    return;
  }
  const uniqueIds = Array.from(new Set(perfilIds.filter(Boolean)));
  if (!uniqueIds.length) {
    await user.setPerfis([]);
    return;
  }
  const perfis = await Perfil.findAll({
    where: {
      id: uniqueIds
    }
  });
  await user.setPerfis(perfis);
  if (perfis.length) {
    await user.update({ perfilId: perfis[0].id });
  }
}

async function syncUserPermissoes(user, permissaoIds = []) {
  if (!user || !Array.isArray(permissaoIds)) {
    return;
  }
  const uniqueIds = Array.from(new Set(permissaoIds.filter(Boolean)));
  if (!uniqueIds.length) {
    await user.setPermissoesDiretas([]);
    return;
  }
  const permissoes = await Permissao.findAll({
    where: {
      id: uniqueIds
    }
  });
  await user.setPermissoesDiretas(permissoes);
}

const sanitizePhone = (value) => {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
};

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function resolvePasswordForUpdate(updateData = {}) {
  if (typeof updateData.password === 'string') {
    return updateData.password;
  }
  if (typeof updateData.newPassword === 'string') {
    return updateData.newPassword;
  }
  return null;
}

function serializeUserWithSpouse(user) {
  if (!user) return null;
  const plainUser = typeof user.get === 'function' ? user.get({ plain: true }) : { ...user };
  const spouse = plainUser.conjuge || null;
  if (spouse && spouse.name) {
    plainUser.nome_esposo = spouse.name;
  }
  return plainUser;
}

function serializeLinkedMember(member) {
  if (!member) return null;
  const plainMember = typeof member.get === 'function' ? member.get({ plain: true }) : { ...member };
  return {
    id: plainMember.id,
    fullName: plainMember.fullName,
    email: plainMember.email,
    phone: plainMember.phone,
    whatsapp: plainMember.whatsapp,
    status: plainMember.status,
    userId: plainMember.userId || null
  };
}

async function attachLinkedMembers(users = []) {
  if (!users.length) return [];

  const userIds = users
    .map((user) => (typeof user.get === 'function' ? user.get('id') : user.id))
    .filter(Boolean);

  const members = !userIds.length ? [] : await Member.findAll({
    where: {
      userId: {
        [Op.in]: userIds
      }
    },
    attributes: ['id', 'fullName', 'email', 'phone', 'whatsapp', 'status', 'userId']
  });

  const membersByUserId = members.reduce((acc, member) => {
    acc[String(member.userId)] = serializeLinkedMember(member);
    return acc;
  }, {});

  return users.map((user) => {
    const serialized = serializeUserWithSpouse(user);
    serialized.linkedMember = membersByUserId[String(serialized.id)] || null;
    return serialized;
  });
}

async function attachLinkedMember(user) {
  if (!user) return null;
  const [serialized] = await attachLinkedMembers([user]);
  return serialized || null;
}

function normalizeEmail(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

async function loadUserById(id) {
  const user = await User.findByPk(id, {
    include: [
      ...buildPermissionInclude(),
      {
        model: Perfil,
        as: 'perfis',
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'conjuge',
        attributes: [
          'id',
          'name',
          'email',
          'telefone',
          'image',
          'username',
          'cpf',
          'estado_civil',
          'profissao',
          'endereco',
          'bairro',
          'numero',
          'cep',
          'escolaridade'
        ]
      }
    ]
  });

  if (!user) return null;
  const serialized = serializeUserWithSpouse(user);
  if (serialized) {
    delete serialized.conjuge;
  }
  return attachLinkedMember(serialized);
}

function buildUserWithSpouse(user) {
  if (!user) return { user: null, spouse: null };
  const serialized = serializeUserWithSpouse(user);
  const spouse = serialized.conjuge || null;
  delete serialized.conjuge;
  return { user: serialized, spouse };
}

async function findMemberCandidateByUser(user) {
  if (!user) return { member: null, matchedBy: null };

  const rawCpf = normalizeCpf(user.cpf);
  if (rawCpf) {
    const memberByCpf = await Member.findOne({
      where: {
        cpf: rawCpf,
        [Op.or]: [
          { userId: null },
          { userId: user.id }
        ]
      },
      attributes: ['id', 'fullName', 'email', 'phone', 'whatsapp', 'status', 'userId']
    });
    if (memberByCpf) {
      return { member: memberByCpf, matchedBy: 'cpf' };
    }
  }

  const normalizedEmail = normalizeEmail(user.email);
  if (normalizedEmail) {
    const membersByEmail = await Member.findAll({
      where: {
        email: { [Op.iLike]: normalizedEmail },
        [Op.or]: [
          { userId: null },
          { userId: user.id }
        ]
      },
      attributes: ['id', 'fullName', 'email', 'phone', 'whatsapp', 'status', 'userId'],
      limit: 2
    });
    if (membersByEmail.length === 1) {
      return { member: membersByEmail[0], matchedBy: 'email' };
    }
    if (membersByEmail.length > 1) {
      throw new Error('Mais de um membro encontrado com o mesmo e-mail');
    }
  }

  const normalizedPhone = sanitizePhone(user.telefone);
  if (normalizedPhone) {
    const membersByPhone = await Member.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { phone: normalizedPhone },
              { whatsapp: normalizedPhone }
            ]
          },
          {
            [Op.or]: [
              { userId: null },
              { userId: user.id }
            ]
          }
        ]
      },
      attributes: ['id', 'fullName', 'email', 'phone', 'whatsapp', 'status', 'userId'],
      limit: 2
    });
    if (membersByPhone.length === 1) {
      return { member: membersByPhone[0], matchedBy: 'telefone' };
    }
    if (membersByPhone.length > 1) {
      throw new Error('Mais de um membro encontrado com o mesmo telefone');
    }
  }

  return { member: null, matchedBy: null };
}

async function getTodosUsers() {
  const users = await User.findAll({
    include: [
      ...buildPermissionInclude(),
      {
        model: Perfil,
        as: 'perfis',
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'conjuge',
        attributes: [
          'id',
          'name',
          'email',
          'telefone',
          'image',
          'username',
          'cpf',
          'estado_civil',
          'profissao',
          'endereco',
          'bairro',
          'numero',
          'cep',
          'escolaridade'
        ]
      }
    ]
  });

  return attachLinkedMembers(users);
}

async function updateUser(id, updateData) {
  const user = await User.findByPk(id);
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const fields = [
    'name',
    'email',
    'image',
    'username',
    'perfilId',
    'active',
    'telefone',
    'endereco',
    'bairro',
    'numero',
    'cep',
    'cpf',
    'escolaridade',
    'nome_esposo'
  ];
  fields.forEach((field) => {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  });

  const passwordFromPayload = resolvePasswordForUpdate(updateData);
  if (typeof passwordFromPayload === 'string') {
    const nextPassword = passwordFromPayload.trim();
    if (!nextPassword) {
      throw new Error('Senha informada e invalida');
    }

    const nextSalt = crypto.randomBytes(16).toString('hex');
    user.salt = nextSalt;
    user.passwordHash = hashSHA256WithSalt(nextPassword, nextSalt);
  }

  await user.save();

  if (Array.isArray(updateData.perfilIds)) {
    await syncUserPerfis(user, updateData.perfilIds);
  }
  if (Array.isArray(updateData.permissaoIds)) {
    await syncUserPermissoes(user, updateData.permissaoIds);
  }
  return loadUserById(id);
}

async function getUserById(id) {
  return loadUserById(id);
}

async function getUserWithSpouse(id) {
  const user = await User.findByPk(id, {
    include: [
      ...buildPermissionInclude(),
      {
        model: Perfil,
        as: 'perfis',
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'conjuge',
        attributes: [
          'id',
          'name',
          'email',
          'telefone',
          'image',
          'username',
          'cpf',
          'estado_civil',
          'profissao',
          'endereco',
          'bairro',
          'numero',
          'cep',
          'escolaridade'
        ]
      }
    ]
  });

  if (!user) {
    return null;
  }

  return buildUserWithSpouse(user);
}

async function findUserWithSpouseByContact({ email, telefone }) {
  const clauses = [];
  if (email) {
    clauses.push({ email: { [Op.iLike]: email } });
  }
  if (telefone) {
    const digits = sanitizePhone(telefone);
    if (digits) {
      clauses.push({ telefone: digits });
    }
  }

  if (!clauses.length) {
    return null;
  }

  const user = await User.findOne({
    where: {
      [Op.or]: clauses
    },
    include: [
      ...buildPermissionInclude(),
      {
        model: Perfil,
        as: 'perfis',
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'conjuge',
        attributes: [
          'id',
          'name',
          'email',
          'telefone',
          'image',
          'username',
          'cpf',
          'estado_civil',
          'profissao',
          'endereco',
          'bairro',
          'numero',
          'cep',
          'escolaridade'
        ]
      }
    ]
  });

  if (!user) return null;
  return buildUserWithSpouse(user);
}

async function createUser(body) {
  const {
    name,
    email,
    active,
    perfilId,
    password,
    image,
    username,
    telefone,
    endereco,
    bairro,
    numero,
    cep,
    cpf,
    escolaridade,
    nome_esposo: nomeEsposo,
    perfilIds = [],
    permissaoIds = []
  } = body;
  const safePassword = password || crypto.randomBytes(8).toString('hex');
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashSHA256WithSalt(safePassword, salt);
  const safeUsername = username || (email ? email.split('@')[0] : `membro-${Date.now()}`);
  const newUser = await User.create({
    id: uuid.v4(),
    name,
    email,
    active,
    perfilId,
    passwordHash,
    salt,
    image,
    username: safeUsername,
    telefone,
    endereco,
    bairro,
    cep,
    numero,
    cpf,
    escolaridade,
    nome_esposo: nomeEsposo
  });
  const finalPerfilIds = Array.isArray(perfilIds) && perfilIds.length ? perfilIds : perfilId ? [perfilId] : [];
  await syncUserPerfis(newUser, finalPerfilIds);
  if (Array.isArray(permissaoIds)) {
    await syncUserPermissoes(newUser, permissaoIds);
  }
  return loadUserById(newUser.id);
}

async function syncUserLinkedMember(userId) {
  const user = await User.findByPk(userId, {
    include: [
      ...buildPermissionInclude(),
      {
        model: Perfil,
        as: 'perfis',
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'conjuge',
        attributes: [
          'id',
          'name',
          'email',
          'telefone',
          'image',
          'username',
          'cpf',
          'estado_civil',
          'profissao',
          'endereco',
          'bairro',
          'numero',
          'cep',
          'escolaridade'
        ]
      }
    ]
  });

  if (!user) {
    throw new Error('Usuario nao encontrado');
  }

  const currentMember = await Member.findOne({
    where: { userId: user.id },
    attributes: ['id', 'fullName', 'email', 'phone', 'whatsapp', 'status', 'userId']
  });

  if (currentMember) {
    return {
      status: 'already_linked',
      matchedBy: 'userId',
      user: await attachLinkedMember(user),
      member: serializeLinkedMember(currentMember)
    };
  }

  const { member, matchedBy } = await findMemberCandidateByUser(user);
  if (!member) {
    return {
      status: 'not_found',
      matchedBy: null,
      user: await attachLinkedMember(user),
      member: null
    };
  }

  if (member.userId && String(member.userId) !== String(user.id)) {
    throw new Error('O membro encontrado ja esta vinculado a outro usuario');
  }

  if (!member.userId) {
    await member.update({ userId: user.id });
  }

  return {
    status: 'linked',
    matchedBy,
    user: await loadUserById(user.id),
    member: serializeLinkedMember(member)
  };
}

async function syncAllUsersLinkedMembers() {
  const users = await User.findAll({
    attributes: ['id'],
    order: [['createdAt', 'ASC']]
  });

  const summary = {
    total: users.length,
    linked: 0,
    alreadyLinked: 0,
    notFound: 0,
    failed: 0,
    results: []
  };

  const results = await Promise.all(users.map(async (user) => {
    try {
      const result = await syncUserLinkedMember(user.id);
      return {
        userId: user.id,
        status: result.status,
        matchedBy: result.matchedBy,
        memberId: result.member?.id || null,
        memberName: result.member?.fullName || null
      };
    } catch (error) {
      return {
        userId: user.id,
        status: 'failed',
        matchedBy: null,
        memberId: null,
        memberName: null,
        error: error.message
      };
    }
  }));

  results.forEach((result) => {
    try {
      if (result.status === 'linked') summary.linked += 1;
      if (result.status === 'already_linked') summary.alreadyLinked += 1;
      if (result.status === 'not_found') summary.notFound += 1;
      if (result.status === 'failed') summary.failed += 1;
      summary.results.push(result);
    } catch (error) {
      summary.failed += 1;
    }
  });

  return summary;
}

module.exports = {
  getTodosUsers,
  createUser,
  getUserById,
  updateUser,
  getUserWithSpouse,
  findUserWithSpouseByContact,
  syncUserLinkedMember,
  syncAllUsersLinkedMembers
};
