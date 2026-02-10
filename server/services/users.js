const { User, Perfil, Permissao } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
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

const sanitizePhone = (value) => {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
};

function serializeUserWithSpouse(user) {
  if (!user) return null;
  const plainUser = typeof user.get === 'function' ? user.get({ plain: true }) : { ...user };
  const spouse = plainUser.conjuge || null;
  if (spouse && spouse.name) {
    plainUser.nome_esposo = spouse.name;
  }
  return plainUser;
}

function buildUserWithSpouse(user) {
  if (!user) return { user: null, spouse: null };
  const serialized = serializeUserWithSpouse(user);
  const spouse = serialized.conjuge || null;
  delete serialized.conjuge;
  return { user: serialized, spouse };
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
      },
      {
        model: User,
        as: 'conjuge',
        attributes: [
          'id',
          'name',
          'email',
          'telefone',
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

  return users.map((user) => serializeUserWithSpouse(user));
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
    'escolaridade',
    'nome_esposo'
  ];
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
      },
      {
        model: User,
        as: 'conjuge',
        attributes: [
          'id',
          'name',
          'email',
          'telefone',
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
  return serialized;
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
        attributes: [
          'id',
          'name',
          'email',
          'telefone',
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
        attributes: [
          'id',
          'name',
          'email',
          'telefone',
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
    escolaridade,
    nome_esposo,
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
    telefone,
    endereco,
    bairro,
    cep,
    numero,
    escolaridade,
    nome_esposo
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
  getUserWithSpouse,
  findUserWithSpouseByContact
};
