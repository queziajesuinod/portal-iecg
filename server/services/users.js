const { User, Perfil, Permissao } = require('../models');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');

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
    user.perfilId = perfis[0].id;
    await user.save();
  }
}

async function getTodosUsers() {
  const users = await User.findAll({
    include: [
      {
        model: Perfil,
        required: false,
        include: [{ model: Permissao, as: 'permissoes', through: { attributes: [] } }]
      },
      {
        model: Perfil,
        as: 'perfis',
        through: { attributes: [] }
      }
    ]
  });
  return users;
}

async function updateUser(id, updateData) {
  const user = await User.findByPk(id);
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const fields = ['name', 'email', 'image', 'username', 'perfilId', 'active'];
  fields.forEach((field) => {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  });

  await user.save();

  if (Array.isArray(updateData.perfilIds)) {
    await syncUserPerfis(user, updateData.perfilIds);
  }

  return user;
}

async function getUserById(id) {
  const user = await User.findByPk(id, {
    include: [
      {
        model: Perfil,
        required: false,
        include: [{ model: Permissao, as: 'permissoes', through: { attributes: [] } }]
      },
      {
        model: Perfil,
        as: 'perfis',
        through: { attributes: [] }
      }
    ]
  });
  return user;
}

async function getUserWithSpouse(id) {
  const user = await User.findByPk(id, {
    include: [
      {
        model: Perfil,
        required: false,
        include: [{ model: Permissao, as: 'permissoes', through: { attributes: [] } }]
      },
      {
        model: Perfil,
        as: 'perfis',
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'conjuge',
        attributes: ['id', 'name', 'email', 'telefone', 'username', 'cpf', 'estado_civil', 'profissao']
      }
    ]
  });

  if (!user) {
    return null;
  }

  const spouse = user.conjuge ? (user.conjuge.toJSON ? user.conjuge.toJSON() : user.conjuge) : null;
  delete user.dataValues.conjuge;
  return { user, spouse };
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
    perfilIds = []
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
    telefone
  });
  const finalPerfilIds = Array.isArray(perfilIds) && perfilIds.length ? perfilIds : perfilId ? [perfilId] : [];
  await syncUserPerfis(newUser, finalPerfilIds);
  return newUser;
}

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

module.exports = {
  getTodosUsers,
  createUser,
  getUserById,
  updateUser,
  getUserWithSpouse
};
