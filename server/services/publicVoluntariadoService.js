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
   * - Vincula a uma ou mais áreas de voluntariado (status PENDENTE)
   * - Registra marco VOLUNTARIADO por área
   * - Se alguma área for BACKSTAGE: aplica perfil BACKSTAGE ao User
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
      areaVoluntariadoIds,
      dataInicio,
      observacao
    } = dados;

    const requestedAreaIds = Array.isArray(areaVoluntariadoIds)
      ? areaVoluntariadoIds
      : (areaVoluntariadoIds
        ? [areaVoluntariadoIds]
        : (Array.isArray(areaVoluntariadoId)
          ? areaVoluntariadoId
          : (areaVoluntariadoId ? [areaVoluntariadoId] : [])));

    const normalizedAreaIds = [...new Set(
      requestedAreaIds
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )];

    if (!fullName || !normalizedAreaIds.length || !dataInicio) {
      throw new Error('Nome completo, area(s) de voluntariado e data de inicio sao obrigatorios');
    }
    if (!cpf && !email && !phone) {
      throw new Error('Informe ao menos CPF, e-mail ou telefone para identificacao');
    }

    const areas = await AreaVoluntariado.findAll({
      where: {
        id: { [Op.in]: normalizedAreaIds },
        ativo: true
      }
    });
    const areaById = new Map(areas.map((area) => [String(area.id), area]));
    const selectedAreas = normalizedAreaIds
      .map((id) => areaById.get(id))
      .filter(Boolean);
    if (selectedAreas.length !== normalizedAreaIds.length) {
      throw new Error('Uma ou mais areas de voluntariado nao foram encontradas ou estao inativas');
    }

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

      // ── 3. Vincular às áreas de voluntariado ───────────────
      const voluntariados = await Voluntariado.bulkCreate(
        selectedAreas.map((area) => ({
          memberId: member.id,
          areaVoluntariadoId: area.id,
          dataInicio,
          observacao: observacao || null,
          status: 'PENDENTE'
        })),
        { transaction, returning: true }
      );

      await MemberMilestone.bulkCreate(
        selectedAreas.map((area) => ({
          memberId: member.id,
          milestoneType: 'VOLUNTARIADO',
          achievedDate: dataInicio,
          description: `Voluntariado em ${area.nome}`,
          createdBy: null
        })),
        { transaction }
      );

      const hasBackstage = selectedAreas.some((area) => String(area.nome || '').toUpperCase() === 'BACKSTAGE');
      if (hasBackstage) {
        const perfilBackstage = await Perfil.findOne({ where: { descricao: 'BACKSTAGE' }, transaction });
        if (perfilBackstage) {
          await user.update({ perfilId: perfilBackstage.id }, { transaction });
        }
      }
      await transaction.commit();

      return {
        memberId: member.id,
        voluntariadoId: voluntariados[0]?.id || null,
        voluntariadoIds: voluntariados.map((item) => item.id),
        status: 'PENDENTE',
        area: selectedAreas[0]?.nome || null,
        areas: selectedAreas.map((area) => area.nome),
        mensagem: 'Cadastro realizado com sucesso. Aguardando aprovação.'
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};

module.exports = PublicVoluntariadoService;
