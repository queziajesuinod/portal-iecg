'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Member, MemberJourney, User, Voluntariado, AreaVoluntariado, Campus, Perfil } = require('../models');
const CampusMinisterioService = require('./campusMinisterioService');
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

  async listarCampus() {
    return Campus.findAll({
      attributes: ['id', 'nome'],
      order: [['nome', 'ASC']]
    });
  },

  async listarMinisteriosPorCampus(campusId) {
    return CampusMinisterioService.listarMinisteriosPorCampus(campusId);
  },

  /**
   * Cadastra voluntario publicamente.
   * - Busca membro por CPF ou e-mail
   * - Se existir: atualiza dados basicos
   * - Se nao existir: cria Member + User (senha = telefone limpo)
   * - Em ambos os casos: garante que User existe e estÃ¡ ativo
   * - Vincula a uma ou mais areas de voluntariado (status PENDENTE)
   * - O marco VOLUNTARIADO e criado somente na aprovacao do vÃ­nculo
   * - Se alguma area for BACKSTAGE: aplica perfil BACKSTAGE ao User
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
      campusId,
      ministerioId,
      vinculos,
      voluntariados,
      dataInicio,
      observacao
    } = dados;

    // Suporta quatro formatos de entrada:
    // 1. voluntariados: [{ areaVoluntariadoId, campusId, ministerioId }] — alias de vinculos
    // 2. vinculos: [{ areaVoluntariadoId, campusId, ministerioId }]
    // 3. areaVoluntariadoIds + campusId + ministerioId
    // 4. areaVoluntariadoId — forma simples (retrocompatível)
    const vinculosInput = (Array.isArray(vinculos) && vinculos.length ? vinculos : null)
      || (Array.isArray(voluntariados) && voluntariados.length ? voluntariados : null);

    let resolvedVinculos;
    if (vinculosInput) {
      resolvedVinculos = vinculosInput.map((v) => ({
        areaVoluntariadoId: String(v.areaVoluntariadoId || '').trim(),
        campusId: v.campusId || null,
        ministerioId: v.ministerioId || null,
        dataInicio: v.dataInicio || null,
        observacao: v.observacao || null,
      })).filter((v) => v.areaVoluntariadoId);
    } else {
      const requestedAreaIds = Array.isArray(areaVoluntariadoIds)
        ? areaVoluntariadoIds
        : (areaVoluntariadoIds
          ? [areaVoluntariadoIds]
          : (Array.isArray(areaVoluntariadoId)
            ? areaVoluntariadoId
            : (areaVoluntariadoId ? [areaVoluntariadoId] : [])));
      resolvedVinculos = [...new Set(requestedAreaIds.map((id) => String(id || '').trim()).filter(Boolean))]
        .map((id) => ({ areaVoluntariadoId: id, campusId: campusId || null, ministerioId: ministerioId || null }));
    }

    const normalizedAreaIds = resolvedVinculos.map((v) => v.areaVoluntariadoId);

    // dataInicio pode vir na raiz ou dentro de cada item do array
    const dataInicioRaiz = dataInicio || resolvedVinculos[0]?.dataInicio || null;

    if (!fullName) throw new Error('Campo obrigatorio ausente: fullName (nome completo)');
    if (!dataInicioRaiz) throw new Error('Campo obrigatorio ausente: dataInicio (data de inicio) — informe na raiz ou dentro de cada item do array');
    if (!normalizedAreaIds.length) {
      throw new Error(
        'Campo obrigatorio ausente: area de voluntariado. ' +
        'Envie "vinculos": [{"areaVoluntariadoId": "uuid"}] ' +
        'ou "areaVoluntariadoId": "uuid" no corpo da requisicao'
      );
    }
    if (!cpf && !email && !phone) {
      throw new Error('Informe ao menos um identificador: cpf, email ou phone');
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
      // -- 1. Localizar membro existente ----------------------
      const conditions = [];
      if (cpfLimpo) conditions.push({ cpf: cpfLimpo });
      if (email) conditions.push({ email: email.toLowerCase().trim() });

      let member = conditions.length
        ? await Member.findOne({ where: { [Op.or]: conditions }, transaction })
        : null;

      let user = null;

      if (member) {
        // -- 2a. Membro existe - atualiza dados basicos --------â”€
        await member.update({
          fullName,
          preferredName: preferredName || member.preferredName,
          phone: phoneLimpo || member.phone,
          whatsapp: phoneLimpo || member.whatsapp,
          birthDate: birthDate || member.birthDate
        }, { transaction });

        // Garante que o usuario vinculado existe e está ativo — nunca altera senha existente
        if (member.userId) {
          user = await User.findByPk(member.userId, { transaction });
          if (user) {
            await user.update({ active: true }, { transaction });
          }
        }

        // Se ainda nao tem usuario, cria agora
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
        // -- 2b. Membro nao existe - localiza ou cria User, depois cria Member --

        // Verifica se jÃ¡ existe usuario com o mesmo email
        if (email) {
          user = await User.findOne({ where: { email: email.toLowerCase().trim() }, transaction });
        }

        if (user) {
          // Usuario já existe — atualiza apenas dados cadastrais, nunca a senha
          await user.update({
            name: fullName,
            telefone: phoneLimpo || user.telefone,
            cpf: cpfLimpo || user.cpf,
            active: true
          }, { transaction });
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

      // -- 3. Vincular as areas de voluntariado --------------
      const voluntariados = await Voluntariado.bulkCreate(
        resolvedVinculos.map((v) => ({
          memberId: member.id,
          areaVoluntariadoId: v.areaVoluntariadoId,
          campusId: v.campusId || null,
          ministerioId: v.ministerioId || null,
          dataInicio: v.dataInicio || dataInicioRaiz,
          observacao: v.observacao || observacao || null,
          status: 'PENDENTE'
        })),
        { transaction, returning: true }
      );

      const hasBackstage = selectedAreas.some((area) => String(area.nome || '').toUpperCase() === 'BACKSTAGE');
      // Só aplica o perfil BACKSTAGE se o usuário ainda tem o perfil padrão de membro
      // (nunca rebaixa quem já tem uma permissão mais elevada)
      if (hasBackstage && user.perfilId === DEFAULT_MEMBER_PERFIL_ID) {
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
        mensagem: 'Cadastro realizado com sucesso. Aguardando aprovacao.'
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};

module.exports = PublicVoluntariadoService;
