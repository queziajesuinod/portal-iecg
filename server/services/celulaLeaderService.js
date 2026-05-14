/* eslint-disable camelcase */
const { Op } = require('sequelize');
const {
  Celula, User, Member, MemberJourney
} = require('../models');

const ESTADO_CIVIL_NORMALIZED = {
  solteiro: 'Solteiro',
  casado: 'Casado',
  viuvo: 'Viúvo',
  divorciado: 'Divorciado',
  uniao_estavel: 'Casado',
  uniao: 'Casado'
};

const normalizeEstadoCivil = (value) => {
  if (!value) return null;
  const key = String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return ESTADO_CIVIL_NORMALIZED[key] || null;
};

const MEMBER_PROFILE_ID = '7d47d03a-a7aa-4907-b8b9-8fcf87bd52dc';

const sanitizePhone = (value) => {
  if (!value) return null;
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
};

const getPreferredName = (user) => (user?.name || user?.username || null);

const createUsername = (name, email, suffix = '') => {
  if (email) {
    const localPart = email.split('@')[0];
    if (localPart) return localPart.toLowerCase();
  }
  if (name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (slug) return `${slug}${suffix}`;
  }
  return `celula-lider${suffix}`;
};

const buildLeaderAttributes = ({
  name, email, telefone, celulaId
}) => {
  const suffix = celulaId ? `-${celulaId.slice(0, 8)}` : '';
  return {
    name: name || 'Líder de Célula',
    email: email ? email.toLowerCase() : null,
    telefone,
    username: createUsername(name, email, suffix)
  };
};

class CelulaLeaderService {
  static async resolveMemberIdByUserId(userId) {
    if (!userId) return null;
    const member = await Member.findOne({
      where: { userId },
      attributes: ['id']
    });
    return member?.id || null;
  }

  static async ensureMemberForLeader(user) {
    if (!user?.id) return null;

    let member = await Member.findOne({ where: { userId: user.id } });
    if (member) return member.id;

    const fullName = (user.name || user.username || '').trim();
    if (!fullName) return null;

    const sanitized = String(user.telefone || '').replace(/\D/g, '') || null;
    const rawEmail = user.email ? user.email.trim() : null;
    const validEmail = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;

    member = await Member.create({
      fullName,
      email: validEmail,
      telefone: sanitized,
      userId: user.id,
      status: 'MEMBRO'
    });

    await MemberJourney.findOrCreate({
      where: { memberId: member.id },
      defaults: {
        memberId: member.id,
        currentStage: 'LIDER_ATIVO',
        healthStatus: 'SAUDAVEL',
        engagementScore: 0
      }
    });

    return member.id;
  }

  static async findCandidateLeader({ email, telefone, excludeId } = {}) {
    const clauses = [];
    if (email) clauses.push({ email: { [Op.iLike]: email } });
    if (telefone) clauses.push({ telefone });
    if (!clauses.length) return null;

    const where = { [Op.or]: clauses };
    if (excludeId) where.id = { [Op.ne]: excludeId };

    return User.findOne({ where });
  }

  static async markAsLeader(user, payload = {}) {
    const updates = {
      is_lider_celula: true,
      frequenta_celula: true,
      ...payload
    };
    await user.update(updates);
    return user;
  }

  static async assignLeaderToCelula(celulaId, leaderId) {
    const celula = await Celula.findByPk(celulaId);
    if (!celula) throw new Error('Célula não encontrada');
    let liderMemberId = null;
    if (leaderId) {
      const leader = await User.findByPk(leaderId);
      if (!leader) throw new Error('Líder não encontrado');
      liderMemberId = await CelulaLeaderService.ensureMemberForLeader(leader);
    }
    await celula.update({ liderId: leaderId || null, liderMemberId });
    return celula;
  }

  static async linkSpouses(leaderId, spouseId) {
    if (!leaderId || !spouseId) throw new Error('Ambos os identificadores são obrigatórios');
    if (leaderId === spouseId) throw new Error('Não é possível vincular o mesmo usuário como cônjuge');

    const [leader, spouse] = await Promise.all([
      User.findByPk(leaderId),
      User.findByPk(spouseId)
    ]);

    if (!leader || !spouse) throw new Error('Usuário ou cônjuge não encontrado');
    const spouseName = getPreferredName(spouse);
    const leaderName = getPreferredName(leader);
    await leader.update({
      conjuge_id: spouse.id,
      ...(spouseName ? { nome_esposo: spouseName } : {})
    });
    await spouse.update({
      conjuge_id: leader.id,
      ...(leaderName ? { nome_esposo: leaderName } : {})
    });
    return leader.reload();
  }

  static buildLeaderPayload(celula) {
    const telefone = sanitizePhone(celula?.cel_lider);
    return buildLeaderAttributes({
      name: celula?.lider,
      email: celula?.email_lider,
      telefone,
      celulaId: celula?.id
    });
  }

  static async migrateCelulaLeaders({ memberProfileId = MEMBER_PROFILE_ID } = {}) {
    const celulas = await Celula.findAll({ where: { ativo: true } });
    const migrated = [];
    const errors = [];

    for (const celula of celulas) {
      try {
        const hasName = Boolean(celula.lider?.trim());
        const hasEmail = Boolean(celula.email_lider?.trim());
        const hasPhone = Boolean(celula.cel_lider?.trim());
        if (!hasName && !hasEmail && !hasPhone) continue;

        const leaderAttrs = CelulaLeaderService.buildLeaderPayload(celula);
        const candidate = await CelulaLeaderService.findCandidateLeader({
          email: leaderAttrs.email,
          telefone: leaderAttrs.telefone
        });

        let leader = candidate;
        if (!leader) {
          leader = await User.create({
            ...leaderAttrs,
            active: true,
            perfilId: memberProfileId,
            is_lider_celula: true,
            frequenta_celula: true
          });
        } else {
          await CelulaLeaderService.markAsLeader(leader, {
            name: leaderAttrs.name,
            email: leaderAttrs.email || leader.email,
            telefone: leaderAttrs.telefone || leader.telefone,
            perfilId: leader.perfilId || memberProfileId
          });
        }

        const liderMemberId = await CelulaLeaderService.ensureMemberForLeader(leader);
        await celula.update({
          liderId: leader.id,
          liderMemberId,
          lider: leaderAttrs.name,
          email_lider: leaderAttrs.email,
          cel_lider: leaderAttrs.telefone
        });

        migrated.push({ celulaId: celula.id, leaderId: leader.id, liderMemberId });
      } catch (err) {
        errors.push({ celulaId: celula.id, celula: celula.celula, erro: err.message });
      }
    }

    return { migrated, errors };
  }

  static async upsertLeaderForCelula({
    celulaId,
    lider,
    email_lider,
    cel_lider,
    perfilId,
    data_nascimento,
    cpf,
    estado_civil,
    profissao,
    batizado,
    encontro,
    escolas,
    image,
    endereco,
    bairro,
    numero,
    cep,
    escolaridade,
    nome_esposo
  }) {
    const celula = celulaId ? await Celula.findByPk(celulaId) : null;
    if (celulaId && !celula) throw new Error('Célula não encontrada');

    const telefone = sanitizePhone(cel_lider);
    const leaderAttrs = buildLeaderAttributes({
      name: lider || celula?.lider,
      email: email_lider || celula?.email_lider,
      telefone: telefone || celula?.cel_lider,
      celulaId
    });

    let leader = null;
    if (celula?.liderId) {
      leader = await User.findByPk(celula.liderId);
    }

    if (!leader) {
      leader = await CelulaLeaderService.findCandidateLeader({
        email: leaderAttrs.email,
        telefone: leaderAttrs.telefone
      });
    }

    const addressPayload = {
      ...(endereco != null ? { endereco } : {}),
      ...(bairro != null ? { bairro } : {}),
      ...(numero != null ? { numero } : {}),
      ...(cep != null ? { cep } : {})
    };

    if (!leader) {
      leader = await User.create({
        ...leaderAttrs,
        active: true,
        perfilId: perfilId || MEMBER_PROFILE_ID,
        is_lider_celula: true,
        frequenta_celula: true,
        ...addressPayload,
        ...(escolaridade != null ? { escolaridade } : {}),
        ...(nome_esposo != null ? { nome_esposo } : {})
      });
    } else {
      await CelulaLeaderService.markAsLeader(leader, {
        name: leaderAttrs.name,
        email: leaderAttrs.email || leader.email,
        telefone: leaderAttrs.telefone || leader.telefone,
        perfilId: leader.perfilId || perfilId || MEMBER_PROFILE_ID,
        ...(escolaridade != null ? { escolaridade } : {}),
        ...(nome_esposo != null ? { nome_esposo } : {})
      });
    }

    const liderMemberId = await CelulaLeaderService.ensureMemberForLeader(leader);

    if (celula) {
      await celula.update({
        liderId: leader.id,
        liderMemberId,
        lider: leaderAttrs.name,
        email_lider: leaderAttrs.email,
        cel_lider: leaderAttrs.telefone
      });
    }

    if (liderMemberId) {
      await CelulaLeaderService.syncMemberFromLeaderPayload(liderMemberId, {
        lider: leaderAttrs.name,
        email_lider: leaderAttrs.email,
        telefone: leaderAttrs.telefone,
        data_nascimento,
        cpf,
        estado_civil,
        endereco,
        bairro,
        numero,
        cep,
        image
      });
    }

    const estadoCivilNorm = normalizeEstadoCivil(estado_civil);
    const leaderExtras = {
      ...(data_nascimento ? { data_nascimento } : {}),
      ...(cpf ? { cpf } : {}),
      ...(estadoCivilNorm ? { estado_civil: estadoCivilNorm } : {}),
      ...(profissao ? { profissao } : {}),
      ...(typeof batizado === 'boolean' ? { batizado } : {}),
      ...(typeof encontro === 'boolean' ? { encontro } : {}),
      ...(Array.isArray(escolas) ? { escolas: escolas.join(', ') } : {}),
      ...(image ? { image } : {}),
      ...(endereco != null ? { endereco } : {}),
      ...(bairro != null ? { bairro } : {}),
      ...(numero != null ? { numero } : {}),
      ...(cep != null ? { cep } : {}),
      ...(escolaridade != null ? { escolaridade } : {}),
      ...(nome_esposo != null ? { nome_esposo } : {})
    };

    if (Object.keys(leaderExtras).length) {
      await leader.update(leaderExtras);
    }

    return {
      celula: celula ? await celula.reload() : null,
      leader: await leader.reload()
    };
  }

  static async syncMemberFromLeaderPayload(memberId, {
    lider, email_lider, telefone, data_nascimento, cpf,
    estado_civil, endereco, bairro, numero, cep, image
  }) {
    const member = await Member.findByPk(memberId);
    if (!member) return;

    const MARITAL_MAP = {
      solteiro: 'SOLTEIRO',
      casado: 'CASADO',
      viuvo: 'VIUVO',
      divorciado: 'DIVORCIADO',
      uniao_estavel: 'UNIAO_ESTAVEL',
      uniao: 'UNIAO_ESTAVEL'
    };

    const maritalKey = estado_civil
      ? String(estado_civil).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      : null;
    const maritalStatus = maritalKey ? (MARITAL_MAP[maritalKey] || null) : null;

    const rawEmail = email_lider ? String(email_lider).trim() : null;
    const validEmail = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;

    const normalizedCpf = cpf ? String(cpf).replace(/\D/g, '') : null;
    const validCpf = normalizedCpf && normalizedCpf.length === 11 ? normalizedCpf : null;

    const updates = {
      ...(lider ? { fullName: lider } : {}),
      ...(email_lider !== undefined ? { email: validEmail } : {}),
      ...(telefone != null ? { whatsapp: telefone } : {}),
      ...(data_nascimento ? { birthDate: data_nascimento } : {}),
      ...(validCpf ? { cpf: validCpf } : {}),
      ...(maritalStatus ? { maritalStatus } : {}),
      ...(endereco != null ? { street: endereco } : {}),
      ...(bairro != null ? { neighborhood: bairro } : {}),
      ...(numero != null ? { number: numero } : {}),
      ...(cep != null ? { zipCode: cep } : {}),
      ...(image ? { photoUrl: image } : {})
    };

    if (Object.keys(updates).length) {
      await member.update(updates, { skipLinkedUserSync: true });
    }
  }

  static async linkSpouseByContact({ leaderId, email, telefone }) {
    if (!leaderId) throw new Error('leaderId é obrigatório');
    if (!email && !telefone) throw new Error('Informe email ou telefone para localizar o cônjuge.');

    const spouse = await CelulaLeaderService.findCandidateLeader({
      email,
      telefone,
      excludeId: leaderId
    });

    if (!spouse) throw new Error('Cônjuge não encontrado');

    const leader = await User.findByPk(leaderId);
    if (!leader) throw new Error('Líder não encontrado');

    const spouseName = getPreferredName(spouse);
    const leaderName = getPreferredName(leader);
    await leader.update({
      conjuge_id: spouse.id,
      ...(spouseName ? { nome_esposo: spouseName } : {})
    });
    await spouse.update({
      conjuge_id: leader.id,
      ...(leaderName ? { nome_esposo: leaderName } : {})
    });

    return {
      leader: await leader.reload(),
      spouse: await spouse.reload()
    };
  }

  static async unlinkSpouseByLeaderId({ leaderId }) {
    if (!leaderId) throw new Error('leaderId é obrigatório');
    const leader = await User.findByPk(leaderId);
    if (!leader) throw new Error('Líder não encontrado');

    const spouseId = leader.conjuge_id;
    await leader.update({ conjuge_id: null });

    if (!spouseId) {
      return { leader: await leader.reload(), spouse: null };
    }

    const spouse = await User.findByPk(spouseId);
    if (spouse) {
      await spouse.update({ conjuge_id: null });
    }

    return {
      leader: await leader.reload(),
      spouse: spouse ? await spouse.reload() : null
    };
  }
}

module.exports = CelulaLeaderService;
