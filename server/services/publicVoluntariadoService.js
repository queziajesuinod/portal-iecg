'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Member, MemberJourney, User, Voluntariado, AreaVoluntariado, MemberMilestone, Perfil } = require('../models');
const { normalizeCpf } = require('../utils/cpf');

const DEFAULT_MEMBER_PERFIL_ID = process.env.DEFAULT_MEMBER_PERFIL_ID || '7d47d03a-a7aa-4907-b8b9-8fcf87bd52dc';

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function sanitizePhone(value) {
  if (!value) return null;
  return String(value).replace(/\D/g, '') || null;
}

function buildUsername(fullName, email) {
  if (email && email.includes('@')) return email.split('@')[0].toLowerCase();
  return (fullName || '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '').slice(0, 40);
}

const PublicVoluntariadoService = {
  async listarAreas() {
    return AreaVoluntariado.findAll({
      where: { ativo: true },
      attributes: ['id', 'nome'],
      order: [['nome', 'ASC']]
    });
  },

  /**
   * Cadastra voluntário publicamente.
   * - Busca membro por CPF ou e-mail
   * - Se existir: atualiza dados básicos
   * - Se não existir: cria Member + User (senha = telefone limpo)
   * - Em ambos os casos: garante que User existe e está ativo
   * - Vincula à área de voluntariado (status PENDENTE)
   * - Registra marco VOLUNTARIADO
   * - Se área for BACKSTAGE: aplica perfil BACKSTAGE ao User
   */
  async cadastrarVoluntario(dados) {
    const {
      fullName,
      preferredName,
      email,
      cpf,
      phone,
      whatsapp,
      birthDate,
      areaVoluntariadoId,
      dataInicio,
      observacao
    } = dados;

    if (!fullName || !areaVoluntariadoId || !dataInicio) {
      throw new Error('Nome completo, área de voluntariado e data de início são obrigatórios');
    }
    if (!cpf && !email && !phone) {
      throw new Error('Informe ao menos CPF, e-mail ou telefone para identificação');
    }

    const area = await AreaVoluntariado.findByPk(areaVoluntariadoId);
    if (!area || !area.ativo) throw new Error('Área de voluntariado não encontrada ou inativa');

    const cpfLimpo = normalizeCpf(cpf);
    const phoneLimpo = sanitizePhone(phone || whatsapp);
    const senha = phoneLimpo || cpfLimpo || crypto.randomBytes(8).toString('hex');

    const transaction = await sequelize.transaction();

    try {
      // ── 1. Localizar membro existente ──────────────────────
      const conditions = [];
      if (cpfLimpo) conditions.push({ cpf: cpfLimpo });
      if (email) conditions.push({ email: email.toLowerCase().trim() });

      let member = conditions.length
        ? await Member.findOne({ where: { [Op.or]: conditions }, transaction })
        : null;

      let user = null;

      if (member) {
        // ── 2a. Membro existe — atualiza dados básicos ─────────
        await member.update({
          fullName,
          preferredName: preferredName || member.preferredName,
          phone: phoneLimpo || member.phone,
          whatsapp: phoneLimpo || member.whatsapp,
          birthDate: birthDate || member.birthDate
        }, { transaction });

        // Garante que o usuário vinculado existe e está ativo
        if (member.userId) {
          user = await User.findByPk(member.userId, { transaction });
          if (user) {
            const updates = { active: true };
            // Se o usuário não tem senha, define o telefone como senha agora
            if (!user.salt || !user.passwordHash) {
              const salt = crypto.randomBytes(16).toString('hex');
              updates.salt = salt;
              updates.passwordHash = hashSHA256WithSalt(senha, salt);
            }
            await user.update(updates, { transaction });
          }
        }

        // Se ainda não tem usuário, cria agora
        if (!user) {
          const salt = crypto.randomBytes(16).toString('hex');
          const passwordHash = hashSHA256WithSalt(senha, salt);

          user = await User.create({
            name: fullName,
            email: email ? email.toLowerCase().trim() : null,
            telefone: phoneLimpo,
            username: buildUsername(fullName, email),
            cpf: cpfLimpo,
            active: true,
            perfilId: DEFAULT_MEMBER_PERFIL_ID,
            passwordHash,
            salt
          }, { transaction });

          await member.update({ userId: user.id }, { transaction });
        }
      } else {
        // ── 2b. Membro não existe — localiza ou cria User, depois cria Member ──

        // Verifica se já existe usuário com o mesmo email
        if (email) {
          user = await User.findOne({ where: { email: email.toLowerCase().trim() }, transaction });
        }

        if (user) {
          // Usuário já existe: atualiza dados e garante senha/ativo
          const updates = {
            name: fullName,
            telefone: phoneLimpo || user.telefone,
            cpf: cpfLimpo || user.cpf,
            active: true
          };
          if (!user.salt || !user.passwordHash) {
            const salt = crypto.randomBytes(16).toString('hex');
            updates.salt = salt;
            updates.passwordHash = hashSHA256WithSalt(senha, salt);
          }
          await user.update(updates, { transaction });
        } else {
          // Cria novo User
          const salt = crypto.randomBytes(16).toString('hex');
          const passwordHash = hashSHA256WithSalt(senha, salt);

          user = await User.create({
            name: fullName,
            email: email ? email.toLowerCase().trim() : null,
            telefone: phoneLimpo,
            username: buildUsername(fullName, email),
            cpf: cpfLimpo,
            active: true,
            perfilId: DEFAULT_MEMBER_PERFIL_ID,
            passwordHash,
            salt
          }, { transaction });
        }

        member = await Member.create({
          fullName,
          preferredName: preferredName || null,
          email: email ? email.toLowerCase().trim() : null,
          cpf: cpfLimpo,
          phone: phoneLimpo,
          whatsapp: phoneLimpo,
          birthDate: birthDate || null,
          status: 'MEMBRO',
          statusChangeDate: new Date(),
          userId: user.id
        }, { transaction });

        await MemberJourney.create({
          memberId: member.id,
          currentStage: 'MEMBRO',
          lastActivityDate: new Date()
        }, { transaction });
      }

      // ── 3. Vincular à área de voluntariado ─────────────────
      const voluntariado = await Voluntariado.create({
        memberId: member.id,
        areaVoluntariadoId,
        dataInicio,
        observacao: observacao || null,
        status: 'PENDENTE'
      }, { transaction });

      // ── 4. Marco de voluntariado ───────────────────────────
      await MemberMilestone.create({
        memberId: member.id,
        milestoneType: 'VOLUNTARIADO',
        achievedDate: dataInicio,
        description: `Voluntariado em ${area.nome}`,
        createdBy: null
      }, { transaction });

      // ── 5. Perfil BACKSTAGE se aplicável ───────────────────
      if (area.nome.toUpperCase() === 'BACKSTAGE') {
        const perfilBackstage = await Perfil.findOne({ where: { descricao: 'BACKSTAGE' }, transaction });
        if (perfilBackstage) {
          await user.update({ perfilId: perfilBackstage.id }, { transaction });
        }
      }

      await transaction.commit();

      return {
        memberId: member.id,
        voluntariadoId: voluntariado.id,
        status: 'PENDENTE',
        area: area.nome,
        mensagem: 'Cadastro realizado com sucesso. Aguardando aprovação.'
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};

module.exports = PublicVoluntariadoService;
