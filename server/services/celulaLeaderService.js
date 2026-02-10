const { Celula, User } = require('../models');
const { Op } = require('sequelize');

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

const buildLeaderAttributes = ({ name, email, telefone, celulaId }) => {
  const suffix = celulaId ? `-${celulaId.slice(0, 8)}` : '';
  return {
    name: name || 'Líder de Célula',
    email: email ? email.toLowerCase() : null,
    telefone,
    username: createUsername(name, email, suffix)
  };
};

class CelulaLeaderService {
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
    if (leaderId) {
      const leader = await User.findByPk(leaderId);
      if (!leader) throw new Error('Líder não encontrado');
    }
    await celula.update({ liderId: leaderId || null });
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
    const celulas = await Celula.findAll();
    const migrated = [];

    for (const celula of celulas) {
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

      await celula.update({
        liderId: leader.id,
        lider: leaderAttrs.name,
        email_lider: leaderAttrs.email,
        cel_lider: leaderAttrs.telefone
      });

      migrated.push({ celulaId: celula.id, leaderId: leader.id });
    }

    return migrated;
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

    if (celula) {
      await celula.update({
        liderId: leader.id,
        lider: leaderAttrs.name,
        email_lider: leaderAttrs.email,
        cel_lider: leaderAttrs.telefone
      });
    }

    const leaderExtras = {
      ...(data_nascimento ? { data_nascimento } : {}),
      ...(cpf ? { cpf } : {}),
      ...(estado_civil ? { estado_civil } : {}),
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
