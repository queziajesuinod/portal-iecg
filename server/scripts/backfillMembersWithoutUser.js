/* eslint-disable no-console, no-await-in-loop, no-restricted-syntax, no-continue */
const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize,
  Member,
  User,
  UserPerfil
} = require('../models');

const schema = process.env.DB_SCHEMA || 'dev_iecg';
const isDryRun = process.argv.includes('--dry-run');
const DEFAULT_MEMBER_PERFIL_ID = process.env.DEFAULT_MEMBER_PERFIL_ID || '7d47d03a-a7aa-4907-b8b9-8fcf87bd52dc';

function sanitizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = sanitizeDigits(value);
  if (!digits) return '';
  return digits.length > 11 ? digits.slice(-11) : digits;
}

function normalizeCpf(value) {
  const digits = sanitizeDigits(value);
  return digits.length === 11 ? digits : '';
}

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function buildUsername(fullName, email, memberId) {
  if (email && email.includes('@')) {
    return email.split('@')[0].toLowerCase();
  }
  const base = String(fullName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (base) {
    return base;
  }

  return `membro${String(memberId || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || Date.now()}`;
}

function resolveDefaultPassword(member) {
  const cpf = normalizeCpf(member.cpf);
  if (cpf) return { password: cpf, source: 'cpf' };

  const phone = normalizePhone(member.phone || member.whatsapp);
  if (phone) return { password: phone, source: 'telefone' };

  return {
    password: crypto.randomBytes(8).toString('hex'),
    source: 'aleatoria'
  };
}

function isMemberActive(status) {
  return !['INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'].includes(String(status || '').toUpperCase());
}

function addToMultiMap(map, key, value) {
  if (!key) return;
  const current = map.get(key) || [];
  current.push(value);
  map.set(key, current);
}

function buildUserIndexes(users = []) {
  const byEmail = new Map();
  const byCpf = new Map();
  const byPhone = new Map();
  const byUsername = new Set();
  const byId = new Map();

  users.forEach((user) => {
    byId.set(String(user.id), user);
    addToMultiMap(byEmail, normalizeEmail(user.email), user);
    addToMultiMap(byCpf, normalizeCpf(user.cpf), user);
    addToMultiMap(byPhone, normalizePhone(user.telefone), user);
    if (user.username) {
      byUsername.add(String(user.username).trim().toLowerCase());
    }
  });

  return {
    byId,
    byEmail,
    byCpf,
    byPhone,
    byUsername
  };
}

function getSingleMatch(map, key) {
  if (!key) return { user: null, ambiguous: false };
  const matches = map.get(key) || [];
  if (!matches.length) return { user: null, ambiguous: false };
  if (matches.length > 1) return { user: null, ambiguous: true };
  return { user: matches[0], ambiguous: false };
}

function findExistingUserForMember(member, indexes) {
  const cpfMatch = getSingleMatch(indexes.byCpf, normalizeCpf(member.cpf));
  if (cpfMatch.user || cpfMatch.ambiguous) {
    return { ...cpfMatch, matchedBy: 'cpf' };
  }

  const emailMatch = getSingleMatch(indexes.byEmail, normalizeEmail(member.email));
  if (emailMatch.user || emailMatch.ambiguous) {
    return { ...emailMatch, matchedBy: 'email' };
  }

  const phoneMatch = getSingleMatch(indexes.byPhone, normalizePhone(member.phone || member.whatsapp));
  if (phoneMatch.user || phoneMatch.ambiguous) {
    return { ...phoneMatch, matchedBy: 'telefone' };
  }

  return { user: null, ambiguous: false, matchedBy: null };
}

function buildUniqueUsername(member, indexes) {
  const base = buildUsername(member.fullName, member.email, member.id);
  let candidate = base;
  let suffix = 2;

  while (indexes.byUsername.has(candidate.toLowerCase())) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function buildUserPayload(member, username, passwordParts) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashSHA256WithSalt(passwordParts.password, salt);

  return {
    name: member.fullName || 'Membro sem nome',
    email: member.email || null,
    active: isMemberActive(member.status),
    perfilId: DEFAULT_MEMBER_PERFIL_ID,
    passwordHash,
    salt,
    image: member.photoUrl || null,
    username,
    telefone: normalizePhone(member.phone || member.whatsapp) || null,
    endereco: member.street || null,
    bairro: member.neighborhood || null,
    numero: member.number || null,
    cep: member.zipCode || null,
    cpf: member.cpf || null,
    data_nascimento: member.birthDate || null
  };
}

async function loadMembersWithoutUser() {
  return Member.findAll({
    where: { userId: null },
    order: [['createdAt', 'ASC']]
  });
}

async function loadUsers() {
  return User.findAll({
    order: [['createdAt', 'ASC']]
  });
}

async function loadLinkedMembersMap() {
  const linkedMembers = await Member.findAll({
    where: {
      userId: {
        [Op.ne]: null
      }
    },
    attributes: ['id', 'userId']
  });

  return linkedMembers.reduce((acc, member) => {
    acc.set(String(member.userId), String(member.id));
    return acc;
  }, new Map());
}

async function ensureUserPerfil(userId, transaction) {
  if (!DEFAULT_MEMBER_PERFIL_ID) return;

  await UserPerfil.findOrCreate({
    where: {
      userId,
      perfilId: DEFAULT_MEMBER_PERFIL_ID
    },
    defaults: {
      userId,
      perfilId: DEFAULT_MEMBER_PERFIL_ID
    },
    transaction
  });
}

async function run() {
  const members = await loadMembersWithoutUser();
  const users = await loadUsers();
  const linkedMembersByUserId = await loadLinkedMembersMap();
  const indexes = buildUserIndexes(users);

  console.log(`Schema atual: ${schema}`);
  console.log(`Membros sem userId: ${members.length}`);

  if (!members.length) {
    return;
  }

  const summary = {
    createdUsers: 0,
    linkedExistingUsers: 0,
    skippedAmbiguous: 0,
    skippedAlreadyLinked: 0,
    failed: 0
  };

  for (const member of members) {
    const transaction = await sequelize.transaction();

    try {
      const existingMatch = findExistingUserForMember(member, indexes);
      let user = existingMatch.user || null;
      let createdUserPassword = null;
      let createdNewUser = false;

      if (existingMatch.ambiguous) {
        summary.skippedAmbiguous += 1;
        await transaction.rollback();
        console.warn(`Ignorado por correspondencia ambigua: membro ${member.id} / ${member.fullName} / criterio ${existingMatch.matchedBy}`);
        continue;
      }

      if (user) {
        const linkedMemberId = linkedMembersByUserId.get(String(user.id));
        if (linkedMemberId && linkedMemberId !== String(member.id)) {
          summary.skippedAlreadyLinked += 1;
          await transaction.rollback();
          console.warn(`Ignorado: user ${user.id} ja vinculado ao membro ${linkedMemberId}`);
          continue;
        }
      } else {
        const username = buildUniqueUsername(member, indexes);
        const passwordParts = resolveDefaultPassword(member);
        const payload = buildUserPayload(member, username, passwordParts);
        user = await User.create(payload, { transaction });
        await ensureUserPerfil(user.id, transaction);
        createdUserPassword = passwordParts;
        createdNewUser = true;
      }

      await member.update({ userId: user.id }, { transaction });

      if (isDryRun) {
        await transaction.rollback();
      } else {
        await transaction.commit();
      }

      if (createdNewUser) {
        users.push(user);
        indexes.byId.set(String(user.id), user);
        addToMultiMap(indexes.byEmail, normalizeEmail(user.email), user);
        addToMultiMap(indexes.byCpf, normalizeCpf(user.cpf), user);
        addToMultiMap(indexes.byPhone, normalizePhone(user.telefone), user);
        indexes.byUsername.add(String(user.username || '').trim().toLowerCase());
      }
      linkedMembersByUserId.set(String(user.id), String(member.id));

      if (existingMatch.user) {
        summary.linkedExistingUsers += 1;
      } else {
        summary.createdUsers += 1;
        console.log(
          `${isDryRun ? 'Dry-run criaria' : 'Criado'} user ${user.id} para membro ${member.id} / senha via ${createdUserPassword.source}`
        );
      }
    } catch (error) {
      summary.failed += 1;
      await transaction.rollback();
      console.error(`Erro ao processar membro ${member.id} (${member.fullName}): ${error.message}`);
      if (error.original?.detail) {
        console.error(`  detalhe: ${error.original.detail}`);
      }
    }
  }

  console.log(isDryRun ? 'Dry-run ativo, nenhuma alteracao foi persistida.' : 'Backfill concluido.');
  console.log(`Users criados: ${summary.createdUsers}`);
  console.log(`Users existentes vinculados: ${summary.linkedExistingUsers}`);
  console.log(`Ignorados por ambiguidade: ${summary.skippedAmbiguous}`);
  console.log(`Ignorados por user ja vinculado em outro membro: ${summary.skippedAlreadyLinked}`);
  console.log(`Falhas: ${summary.failed}`);
}

run()
  .catch((error) => {
    console.error('Erro ao executar backfill de membros sem usuario:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
