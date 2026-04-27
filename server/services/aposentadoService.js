const { Aposentado, User, Member, sequelize } = require('../models');
const crypto = require('crypto');
const { Op } = require('sequelize');

function gerarUsernamePorNome(nomeCompleto) {
  if (!nomeCompleto) return null;
  const removerAcentos = (str) =>
    str.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const partes = removerAcentos(nomeCompleto.trim().toLowerCase()).split(/\s+/);
  const primeiro = partes[0];
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : '';
  return `${primeiro}.${ultimo}`;
}

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Converte string vazia em null para campos opcionais
function emptyToNull(value) {
  if (value === '' || value === undefined) return null;
  return value;
}

const MARITAL_STATUS_MAP = {
  SOLTEIRO: 'Solteiro',
  CASADO: 'Casado',
  DIVORCIADO: 'Divorciado',
  VIUVO: 'Viúvo',
  UNIAO_ESTAVEL: 'Casado'
};

function mapMemberToUserFields(member) {
  const enderecoParts = [member.street, member.number, member.neighborhood, member.city, member.state]
    .filter(Boolean);
  return {
    name: member.fullName || member.preferredName || null,
    email: member.email || null,
    telefone: member.phone || member.whatsapp || null,
    data_nascimento: member.birthDate || null,
    estado_civil: MARITAL_STATUS_MAP[member.maritalStatus] || null,
    endereco: enderecoParts.length ? enderecoParts.join(', ') : null,
    image: member.photoUrl || null,
    batizado: Boolean(member.baptismDate),
    frequenta_celula: Boolean(member.celulaId),
    encontro: false,
    profissao: null,
    escolas: null,
    rede_social: null,
    nome_esposo: null
  };
}

class AposentadoService {
  async criarAposentado(dados) {
    const t = await sequelize.transaction();

    try {
      const cpfLimpo = dados.cpf ? dados.cpf.replace(/\D/g, '') : '';
      const emailNormalizado = emptyToNull(dados.email);

      // Impede cadastro duplicado de aposentado com mesmo CPF
      const existente = await Aposentado.findOne({
        include: [{
          model: User,
          as: 'user',
          where: { cpf: cpfLimpo }
        }],
        transaction: t
      });

      if (existente) {
        if (!t.finished) await t.rollback();
        throw new Error('Erro: Já existe um aposentado cadastrado com este CPF. Por favor, verifique os dados e tente novamente.');
      }

      const orConditions = [{ cpf: cpfLimpo }];
      if (emailNormalizado) orConditions.push({ email: emailNormalizado });

      let user = await User.findOne({
        where: { [Op.or]: orConditions },
        transaction: t
      });

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashSHA256WithSalt(cpfLimpo || 'senha123', salt);

      const dadosUser = {
        name: dados.name,
        image: emptyToNull(dados.image),
        data_nascimento: emptyToNull(dados.data_nascimento),
        endereco: emptyToNull(dados.endereco),
        telefone: emptyToNull(dados.telefone),
        estado_civil: emptyToNull(dados.estado_civil),
        nome_esposo: emptyToNull(dados.nome_esposo),
        profissao: emptyToNull(dados.profissao),
        rede_social: emptyToNull(dados.rede_social),
        frequenta_celula: Boolean(dados.frequenta_celula),
        batizado: Boolean(dados.batizado),
        encontro: Boolean(dados.encontro),
        escolas: emptyToNull(dados.escolas)
      };

      if (user) {
        await user.update(dadosUser, { transaction: t });
      } else {
        user = await User.create({
          ...dadosUser,
          email: emailNormalizado,
          username: gerarUsernamePorNome(dados.name),
          cpf: cpfLimpo,
          passwordHash,
          salt,
          perfilId: dados.perfilId || '251b1ad9-4a77-47f2-9a2e-b2c978dda534'
        }, { transaction: t });
      }

      const aposentado = await Aposentado.create({
        filhos: dados.filhos || [],
        indicacao: emptyToNull(dados.indicacao),
        patologia: emptyToNull(dados.patologia),
        plano_saude: emptyToNull(dados.plano_saude),
        hospital: emptyToNull(dados.hospital),
        remedios: dados.remedios || [],
        habilidades: emptyToNull(dados.habilidades),
        analfabeto: Boolean(dados.analfabeto),
        tipo_pessoa: emptyToNull(dados.tipo_pessoa),
        user_id: user.id
      }, { transaction: t });

      await t.commit();
      return aposentado;
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw new Error('Erro ao criar aposentado: ' + error.message);
    }
  }

  async editarAposentado(id, dadosAtualizados) {
    const t = await sequelize.transaction();

    try {
      const aposentado = await Aposentado.findByPk(id, {
        include: [{ model: User, as: 'user' }],
        transaction: t
      });
      if (!aposentado) throw new Error('Aposentado não encontrado');
      if (!aposentado.user) throw new Error('Usuário vinculado não encontrado');

      await aposentado.user.update({
        name: dadosAtualizados.name,
        image: emptyToNull(dadosAtualizados.image),
        data_nascimento: emptyToNull(dadosAtualizados.data_nascimento),
        endereco: emptyToNull(dadosAtualizados.endereco),
        telefone: emptyToNull(dadosAtualizados.telefone),
        estado_civil: emptyToNull(dadosAtualizados.estado_civil),
        nome_esposo: emptyToNull(dadosAtualizados.nome_esposo),
        profissao: emptyToNull(dadosAtualizados.profissao),
        rede_social: emptyToNull(dadosAtualizados.rede_social),
        frequenta_celula: Boolean(dadosAtualizados.frequenta_celula),
        batizado: Boolean(dadosAtualizados.batizado),
        encontro: Boolean(dadosAtualizados.encontro),
        escolas: emptyToNull(dadosAtualizados.escolas)
      }, { transaction: t });

      await aposentado.update({
        filhos: dadosAtualizados.filhos || [],
        indicacao: emptyToNull(dadosAtualizados.indicacao),
        patologia: emptyToNull(dadosAtualizados.patologia),
        plano_saude: emptyToNull(dadosAtualizados.plano_saude),
        hospital: emptyToNull(dadosAtualizados.hospital),
        remedios: dadosAtualizados.remedios || [],
        habilidades: emptyToNull(dadosAtualizados.habilidades),
        analfabeto: Boolean(dadosAtualizados.analfabeto),
        tipo_pessoa: emptyToNull(dadosAtualizados.tipo_pessoa)
      }, { transaction: t });

      await t.commit();
      return aposentado;

    } catch (error) {
      if (!t.finished) await t.rollback();
      throw new Error('Erro ao atualizar aposentado: ' + error.message);
    }
  }

  async buscarTodosAposentados() {
    return Aposentado.findAll({
      include: [{ model: User, as: 'user' }]
    });
  }

  async buscaPaginada(page, limit) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Aposentado.findAndCountAll({
      include: [{ model: User, as: 'user' }],
      limit,
      offset,
      order: [[{ model: User, as: 'user' }, 'name', 'ASC']]
    });

    return {
      registros: rows,
      totalPaginas: Math.ceil(count / limit),
      paginaAtual: page,
      totalRegistros: count
    };
  }

  async buscaPorNomePaginada(name, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Aposentado.findAndCountAll({
      include: [{
        model: User,
        as: 'user',
        where: {
          name: { [Op.iLike]: `%${name}%` }
        }
      }],
      limit,
      offset,
      order: [[{ model: User, as: 'user' }, 'name', 'ASC']]
    });

    return {
      registros: rows,
      totalPaginas: Math.ceil(count / limit),
      paginaAtual: page,
      totalRegistros: count
    };
  }

  async buscarAposentadoPorId(id) {
    const aposentado = await Aposentado.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });
    if (!aposentado) {
      throw new Error('Aposentado não encontrado');
    }
    return aposentado;
  }

  async deletarAposentado(id) {
    const aposentado = await this.buscarAposentadoPorId(id);
    await aposentado.destroy();
    return { mensagem: 'Aposentado removido com sucesso' };
  }

  async buscarPorCpf(cpf) {
    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '';
    if (!cpfLimpo) throw new Error('CPF inválido');

    const member = await Member.findOne({ where: { cpf: cpfLimpo } });
    const user = member?.userId
      ? await User.findByPk(member.userId)
      : await User.findOne({ where: { cpf: cpfLimpo } });

    if (!member && !user) return null;

    // Campos vindos do Member (base de dados eclesiásticos)
    const memberFields = member ? mapMemberToUserFields(member) : {};

    // Monta resultado: User tem prioridade, Member complementa o que está vazio
    const pick = (userVal, memberVal) => (userVal !== null && userVal !== undefined && userVal !== '') ? userVal : (memberVal || null);

    return {
      fonte: member ? 'member' : 'user',
      memberId: member?.id || null,
      cpf: cpfLimpo,
      name: pick(user?.name, memberFields.name),
      email: pick(user?.email, memberFields.email),
      telefone: pick(user?.telefone, memberFields.telefone),
      data_nascimento: pick(user?.data_nascimento, memberFields.data_nascimento),
      estado_civil: pick(user?.estado_civil, memberFields.estado_civil),
      endereco: pick(user?.endereco, memberFields.endereco),
      image: pick(user?.image, memberFields.image),
      batizado: user?.batizado || memberFields.batizado || false,
      encontro: user?.encontro || memberFields.encontro || false,
      frequenta_celula: user?.frequenta_celula || memberFields.frequenta_celula || false,
      profissao: pick(user?.profissao, memberFields.profissao),
      escolas: pick(user?.escolas, memberFields.escolas),
      rede_social: user?.rede_social || null,
      nome_esposo: user?.nome_esposo || null
    };
  }
}

module.exports = new AposentadoService();
