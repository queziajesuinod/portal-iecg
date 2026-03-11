const sanitizePhone = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits || null;
};

const parseLegacyNotes = (notes) => {
  if (!notes) return {};
  try {
    const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;
    if (parsed && parsed.legacy && typeof parsed.legacy === 'object') {
      return parsed.legacy;
    }
  } catch (error) {
    return {};
  }
  return {};
};

const resolveUserMaritalStatus = (UserModel, maritalStatus) => {
  if (!maritalStatus) return null;

  const values = UserModel?.getAttributes?.().estado_civil?.values || [];
  const indexesByMemberValue = {
    SOLTEIRO: 0,
    CASADO: 1,
    VIUVO: 2,
    DIVORCIADO: 3,
    UNIAO_ESTAVEL: 1
  };

  const index = indexesByMemberValue[String(maritalStatus).toUpperCase()];
  if (typeof index !== 'number' || !values[index]) {
    return null;
  }

  return values[index];
};

const resolveUserEducation = (UserModel, education) => {
  if (!education) return null;

  const values = UserModel?.getAttributes?.().escolaridade?.values || [];
  const indexesByLabel = {
    ANALFABETO: 0,
    'ENSINO FUNDAMENTAL INCOMPLETO': 1,
    'ENSINO FUNDAMENTAL COMPLETO': 2,
    'ENSINO MEDIO INCOMPLETO': 3,
    'ENSINO MEDIO COMPLETO': 4,
    'ENSINO SUPERIOR INCOMPLETO': 5,
    'ENSINO SUPERIOR COMPLETO': 6
  };

  const index = indexesByLabel[String(education).trim().toUpperCase()];
  if (typeof index !== 'number' || !values[index]) {
    return null;
  }

  return values[index];
};

const serializeSchools = (schools) => {
  if (Array.isArray(schools)) {
    const normalized = schools.map((item) => String(item || '').trim()).filter(Boolean);
    return normalized.length ? normalized.join(', ') : null;
  }

  if (typeof schools === 'string') {
    const normalized = schools.trim();
    return normalized || null;
  }

  return null;
};

const mapMemberStatusToActive = (status) => !['INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'].includes(status || 'MEMBRO');

async function syncUserFromMemberRecord(member, options = {}) {
  if (!member?.userId) return;

  const transaction = options.transaction || null;
  const models = options.models || member.sequelize?.models || {};
  const UserModel = models.User;
  const MemberModel = models.Member || member.constructor;

  if (!UserModel || !MemberModel) return;

  const user = await UserModel.findByPk(member.userId, { transaction });
  if (!user) return;

  const legacy = parseLegacyNotes(member.notes);
  const spouse = member.spouseMemberId
    ? await MemberModel.findByPk(member.spouseMemberId, {
      attributes: ['id', 'fullName', 'preferredName', 'userId'],
      transaction
    })
    : null;

  const isMarried = member.maritalStatus === 'CASADO';
  const spouseName = spouse ? (spouse.preferredName || spouse.fullName || null) : null;

  const desiredValues = {
    name: member.fullName || null,
    email: member.email || null,
    image: member.photoUrl || null,
    data_nascimento: member.birthDate || null,
    endereco: member.street || null,
    bairro: member.neighborhood || null,
    numero: member.number || null,
    cep: member.zipCode || null,
    telefone: sanitizePhone(member.phone || member.whatsapp),
    cpf: member.cpf || null,
    active: mapMemberStatusToActive(member.status),
    estado_civil: resolveUserMaritalStatus(UserModel, member.maritalStatus),
    nome_esposo: isMarried ? (spouseName || legacy.nome_esposo || null) : null,
    profissao: legacy.profissao || null,
    frequenta_celula: typeof legacy.frequenta_celula === 'boolean'
      ? legacy.frequenta_celula
      : Boolean(member.celulaId),
    batizado: Boolean(member.baptismDate),
    encontro: typeof legacy.encontro === 'boolean' ? legacy.encontro : false,
    escolas: serializeSchools(legacy.escolas),
    escolaridade: resolveUserEducation(UserModel, legacy.escolaridade),
    conjuge_id: isMarried && spouse?.userId ? spouse.userId : null
  };

  const updates = Object.entries(desiredValues).reduce((acc, [field, nextValue]) => {
    const currentValue = user[field] ?? null;
    if (currentValue !== (nextValue ?? null)) {
      acc[field] = nextValue ?? null;
    }
    return acc;
  }, {});

  if (Object.keys(updates).length) {
    await user.update(updates, { transaction });
  }
}

module.exports = {
  parseLegacyNotes,
  syncUserFromMemberRecord
};
