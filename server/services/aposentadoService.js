const { Aposentado, User, sequelize } = require('../models');
const crypto = require('crypto');
const { Op } = require('sequelize');

// Utilitário: gera username como primeiro.ultimo (sem acento)
function gerarUsernamePorNome(nomeCompleto) {
  if (!nomeCompleto) return null;
  const removerAcentos = (str) =>
    str.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const partes = removerAcentos(nomeCompleto.trim().toLowerCase()).split(/\s+/);
  const primeiro = partes[0];
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : '';
  return `${primeiro}.${ultimo}`;
}

// Utilitário: gera hash SHA256 com salt
function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

class AposentadoService {
  async criarAposentado(dados) {
    const t = await sequelize.transaction();

    try {
      const cpfLimpo = dados.cpf ? dados.cpf.replace(/\D/g, '') : '';

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
        await t.rollback();
        throw new Error('Já existe um aposentado cadastrado com este CPF.');
      }

      // Impede cadastro duplicado de aposentado com mesmo e-mail
      const jaExistePorEmail = await Aposentado.findOne({
        include: [{
          model: User,
          as: 'user',
          where: { email: dados.email }
        }],
        transaction: t
      });

      if (jaExistePorEmail) {
        await t.rollback();
        throw new Error('Já existe um aposentado cadastrado com este e-mail.');
      }

      let user = await User.findOne({
        where: {
          [Op.or]: [
            { email: dados.email },
            { cpf: cpfLimpo }
          ]
        },
        transaction: t
      });

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashSHA256WithSalt(cpfLimpo || 'senha123', salt);

      if (user) {
        // Atualiza somente dados não sensíveis do usuário
        await user.update({
          name: dados.name,
          username: gerarUsernamePorNome(dados.name),
          image: dados.image || user.image,
          data_nascimento: dados.data_nascimento,
          endereco: dados.endereco,
          telefone: dados.telefone,
          estado_civil: dados.estado_civil,
          nome_esposo: dados.nome_esposo,
          profissao: dados.profissao,
          frequenta_celula: dados.frequenta_celula,
          batizado: dados.batizado,
          encontro: dados.encontro,
          escolas: dados.escolas,
          cpf: cpfLimpo,
          perfilId: dados.perfilId || user.perfilId
        }, { transaction: t });
      } else {
        // Cria novo user
        user = await User.create({
          name: dados.name,
          email: dados.email,
          username: gerarUsernamePorNome(dados.name),
          image: dados.image || null,
          cpf: cpfLimpo,
          data_nascimento: dados.data_nascimento,
          endereco: dados.endereco,
          telefone: dados.telefone,
          estado_civil: dados.estado_civil,
          nome_esposo: dados.nome_esposo,
          profissao: dados.profissao,
          frequenta_celula: dados.frequenta_celula,
          batizado: dados.batizado,
          encontro: dados.encontro,
          escolas: dados.escolas,
          passwordHash,
          salt,
          perfilId: dados.perfilId || '251b1ad9-4a77-47f2-9a2e-b2c978dda534'
        }, { transaction: t });
      }

      const aposentado = await Aposentado.create({
        filhos: dados.filhos,
        indicacao: dados.indicacao,
        patologia: dados.patologia,
        plano_saude: dados.plano_saude,
        hospital: dados.hospital,
        remedios: dados.remedios,
        habilidades: dados.habilidades,
        analfabeto: dados.analfabeto,
        tipo_pessoa: dados.tipo_pessoa,
        user_id: user.id
      }, { transaction: t });

      await t.commit();
      return aposentado;
    } catch (error) {
      await t.rollback();
      throw new Error('Erro ao criar aposentado: ' + error.message);
    }
  }

  // ... demais métodos permanecem iguais
}

module.exports = new AposentadoService();
