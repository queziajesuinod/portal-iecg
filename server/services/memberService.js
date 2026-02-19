/* eslint-disable class-methods-use-this */
const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize,
  Member,
  MemberJourney,
  MemberActivity,
  MemberMilestone,
  MIA,
  User,
  Campus,
  Celula
} = require('../models');
const cache = require('../utils/cache');

const DEFAULT_MEMBER_PERFIL_ID = process.env.DEFAULT_MEMBER_PERFIL_ID || '7d47d03a-a7aa-4907-b8b9-8fcf87bd52dc';
const ALLOWED_GENDERS = ['MASCULINO', 'FEMININO'];

const sanitizePhone = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits || null;
};

const hashSHA256WithSalt = (password, salt) => crypto.createHmac('sha256', salt).update(password).digest('hex');

const buildUsername = (fullName, email) => {
  if (email && email.includes('@')) {
    return email.split('@')[0].toLowerCase();
  }
  const base = (fullName || 'membro').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base || 'membro'}-${Date.now()}`;
};

class MemberService {
  validateGender(gender) {
    if (!gender) return;
    if (!ALLOWED_GENDERS.includes(gender)) {
      throw new Error('Genero invalido. Use apenas MASCULINO ou FEMININO');
    }
  }

  async validateSpouseMember(spouseMemberId, memberId = null) {
    if (!spouseMemberId) return null;
    if (memberId && spouseMemberId === memberId) {
      throw new Error('Nao e possivel vincular o proprio membro como conjuge');
    }

    const spouse = await Member.findByPk(spouseMemberId);
    if (!spouse) {
      throw new Error('Conjuge informado nao foi encontrado');
    }
    return spouse;
  }

  async syncSpouseLink(memberId, spouseMemberId) {
    const member = await Member.findByPk(memberId);
    if (!member) return;

    const currentSpouseId = member.spouseMemberId || null;
    const nextSpouseId = spouseMemberId || null;

    if (currentSpouseId === nextSpouseId) {
      if (nextSpouseId) {
        const currentSpouse = await Member.findByPk(nextSpouseId);
        if (currentSpouse && currentSpouse.spouseMemberId !== member.id) {
          await currentSpouse.update({ spouseMemberId: member.id });
        }
      }
      return;
    }

    if (currentSpouseId) {
      const oldSpouse = await Member.findByPk(currentSpouseId);
      if (oldSpouse && oldSpouse.spouseMemberId === member.id) {
        await oldSpouse.update({ spouseMemberId: null });
      }
    }

    if (!nextSpouseId) {
      if (member.spouseMemberId !== null) {
        await member.update({ spouseMemberId: null });
      }
      return;
    }

    const nextSpouse = await this.validateSpouseMember(nextSpouseId, member.id);

    if (nextSpouse.spouseMemberId && nextSpouse.spouseMemberId !== member.id) {
      const previousOfNext = await Member.findByPk(nextSpouse.spouseMemberId);
      if (previousOfNext && previousOfNext.spouseMemberId === nextSpouse.id) {
        await previousOfNext.update({ spouseMemberId: null });
      }
    }

    if (member.spouseMemberId !== nextSpouse.id) {
      await member.update({ spouseMemberId: nextSpouse.id });
    }
    if (nextSpouse.spouseMemberId !== member.id) {
      await nextSpouse.update({ spouseMemberId: member.id });
    }
  }

  /**
   * Criar novo membro
   */
  async createMember(data, createdBy) {
    try {
      this.validateGender(data.gender);
      const transaction = await sequelize.transaction();
      let member;

      try {
        const salt = crypto.randomBytes(16).toString('hex');
        const defaultPassword = (data.cpf || '').replace(/\D/g, '') || crypto.randomBytes(8).toString('hex');
        const passwordHash = hashSHA256WithSalt(defaultPassword, salt);

        const user = await User.create({
          name: data.fullName,
          email: data.email || null,
          telefone: sanitizePhone(data.phone || data.whatsapp),
          image: data.photoUrl || null,
          username: buildUsername(data.fullName, data.email),
          cpf: data.cpf || null,
          data_nascimento: data.birthDate || null,
          endereco: data.street || null,
          bairro: data.neighborhood || null,
          numero: data.number || null,
          cep: data.zipCode || null,
          active: !['INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'].includes(data.status || 'MEMBRO'),
          perfilId: DEFAULT_MEMBER_PERFIL_ID,
          passwordHash,
          salt
        }, { transaction });

        if (data.spouseMemberId) {
          await this.validateSpouseMember(data.spouseMemberId);
        }

        member = await Member.create({
          ...data,
          userId: user.id,
          createdBy,
          statusChangeDate: new Date()
        }, { transaction });

        await MemberJourney.create({
          memberId: member.id,
          currentStage: this.mapStatusToStage(member.status),
          lastActivityDate: new Date()
        }, { transaction });

        if (member.status === 'VISITANTE') {
          await MemberMilestone.create({
            memberId: member.id,
            milestoneType: 'PRIMEIRA_VISITA',
            achievedDate: new Date(),
            description: 'Primeira visita a igreja',
            createdBy
          }, { transaction });

          await MemberActivity.create({
            memberId: member.id,
            activityType: 'CULTO_PRESENCA',
            activityDate: new Date(),
            points: 10
          }, { transaction });
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      if (data.spouseMemberId) {
        await this.syncSpouseLink(member.id, data.spouseMemberId || null);
      }

      // Invalidar cache
      await cache.del('members:all');

      return await this.getMemberById(member.id);
    } catch (error) {
      throw new Error(`Erro ao criar membro: ${error.message}`);
    }
  }

  /**
   * Buscar membro por ID (com todos os relacionamentos)
   */
  async getMemberById(id) {
    try {
      const member = await Member.findByPk(id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email', 'perfilId', 'active'] },
          { model: Campus, as: 'campus' },
          { model: Celula, as: 'celula' },
          {
            model: Celula,
            as: 'liderancaCelulas',
            attributes: [
              'id',
              'celula',
              'rede',
              'bairro',
              'dia',
              'horario',
              'ativo',
              'campusId'
            ],
            include: [
              {
                model: Campus,
                as: 'campusRef',
                attributes: ['id', 'nome']
              }
            ]
          },
          { model: Member, as: 'spouse', attributes: ['id', 'fullName', 'photoUrl'] },
          {
            model: MemberJourney,
            as: 'journey'
          },
          {
            model: MemberActivity,
            as: 'activities',
            limit: 50,
            order: [['activityDate', 'DESC']]
          },
          {
            model: MemberMilestone,
            as: 'milestones',
            order: [['achievedDate', 'DESC']]
          },
          {
            model: MIA,
            as: 'miaRecord',
            include: [
              { model: User, as: 'responsiblePastor', attributes: ['id', 'name', 'email'] },
              { model: User, as: 'responsibleLeader', attributes: ['id', 'name', 'email'] }
            ]
          }
        ]
      });

      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      return member;
    } catch (error) {
      throw new Error(`Erro ao buscar membro: ${error.message}`);
    }
  }

  /**
   * Listar membros com filtros
   */
  async listMembers(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      const where = {};

      // Filtros
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.campusId) {
        where.campusId = filters.campusId;
      }
      if (filters.celulaId) {
        where.celulaId = filters.celulaId;
      }
      if (filters.search) {
        where[Op.or] = [
          { fullName: { [Op.iLike]: `%${filters.search}%` } },
          { email: { [Op.iLike]: `%${filters.search}%` } },
          { cpf: { [Op.like]: `%${filters.search}%` } }
        ];
      }

      const { count, rows } = await Member.findAndCountAll({
        where,
        include: [
          { model: Campus, as: 'campus', attributes: ['id', 'nome'] },
          { model: Celula, as: 'celula', attributes: ['id', 'celula'] },
          { model: MemberJourney, as: 'journey', attributes: ['currentStage', 'engagementScore', 'healthStatus'] }
        ],
        limit,
        offset,
        order: [['fullName', 'ASC']]
      });

      return {
        members: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Erro ao listar membros: ${error.message}`);
    }
  }

  /**
   * Atualizar membro
   */
  async updateMember(id, data, updatedBy) {
    try {
      const payload = { ...data };
      this.validateGender(payload.gender);
      const member = await Member.findByPk(id);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'spouseMemberId')) {
        await this.validateSpouseMember(payload.spouseMemberId, id);
      }

      // Se mudou o status, registrar
      if (payload.status && payload.status !== member.status) {
        payload.statusChangeDate = new Date();

        // Atualizar journey
        const journey = await MemberJourney.findOne({ where: { memberId: id } });
        if (journey) {
          await journey.update({
            currentStage: this.mapStatusToStage(payload.status),
            stageChangedAt: new Date()
          });
        }

        // Se virou MIA, criar registro
        if (payload.status === 'MIA' && member.status !== 'MIA') {
          await this.convertToMIA(id, payload.statusReason, updatedBy);
        }
      }

      await member.update(payload);

      if (Object.prototype.hasOwnProperty.call(payload, 'spouseMemberId')) {
        await this.syncSpouseLink(id, payload.spouseMemberId || null);
      }

      // Invalidar cache
      await cache.del(`member:${id}`);
      await cache.del('members:all');

      return await this.getMemberById(id);
    } catch (error) {
      throw new Error(`Erro ao atualizar membro: ${error.message}`);
    }
  }

  /**
   * Deletar membro (soft delete)
   */
  async deleteMember(id) {
    try {
      const member = await Member.findByPk(id);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const transaction = await sequelize.transaction();
      try {
        const linkedUserId = member.userId || null;

        if (member.spouseMemberId) {
          await this.syncSpouseLink(member.id, null);
        }

        await member.destroy({ transaction });

        if (linkedUserId) {
          await User.destroy({
            where: { id: linkedUserId },
            transaction
          });
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      // Invalidar cache
      await cache.del(`member:${id}`);
      await cache.del('members:all');

      return { success: true };
    } catch (error) {
      throw new Error(`Erro ao deletar membro: ${error.message}`);
    }
  }

  /**
   * Converter membro para MIA
   */
  async convertToMIA(memberId, reason, createdBy) {
    try {
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      // Atualizar status do membro
      await member.update({
        status: 'MIA',
        statusChangeDate: new Date(),
        statusReason: reason
      });

      // Criar registro MIA
      const mia = await MIA.create({
        memberId,
        miaDate: new Date(),
        reason: 'OUTRO',
        reasonDetails: reason,
        createdBy
      });

      // Atualizar journey
      const journey = await MemberJourney.findOne({ where: { memberId } });
      if (journey) {
        await journey.update({
          currentStage: 'MIA',
          healthStatus: 'MIA',
          stageChangedAt: new Date()
        });
      }

      // Invalidar cache
      await cache.del(`member:${memberId}`);

      return mia;
    } catch (error) {
      throw new Error(`Erro ao converter para MIA: ${error.message}`);
    }
  }

  /**
   * Vincular User a Member
   */
  async linkUserToMember(memberId, userId) {
    try {
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Membro nao encontrado');
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Usuario nao encontrado');
      }

      // Verificar se o user ja esta vinculado a outro membro
      const existingLink = await Member.findOne({ where: { userId } });
      if (existingLink && existingLink.id !== memberId) {
        throw new Error('Este usuario ja esta vinculado a outro membro');
      }

      await member.update({ userId });

      // Invalidar cache
      await cache.del(`member:${memberId}`);

      return await this.getMemberById(memberId);
    } catch (error) {
      throw new Error(`Erro ao vincular usuario: ${error.message}`);
    }
  }

  /**
   * Mapear status do membro para estagio da jornada
   */
  mapStatusToStage(status) {
    const mapping = {
      VISITANTE: 'VISITANTE',
      CONGREGADO: 'CONGREGADO',
      MEMBRO: 'MEMBRO',
      INATIVO: 'VISITANTE',
      MIA: 'MIA',
      TRANSFERIDO: 'MEMBRO',
      FALECIDO: 'MEMBRO'
    };
    return mapping[status] || 'VISITANTE';
  }

  /**
   * Obter estatisticas gerais
   */
  async getStatistics(campusId = null) {
    try {
      const where = {};
      if (campusId) {
        where.campusId = campusId;
      }

      const total = await Member.count({ where });
      const visitantes = await Member.count({ where: { ...where, status: 'VISITANTE' } });
      const congregados = await Member.count({ where: { ...where, status: 'CONGREGADO' } });
      const membros = await Member.count({ where: { ...where, status: 'MEMBRO' } });
      const inativos = await Member.count({ where: { ...where, status: 'INATIVO' } });
      const mia = await Member.count({ where: { ...where, status: 'MIA' } });

      return {
        total,
        byStatus: {
          visitantes,
          congregados,
          membros,
          inativos,
          mia
        },
        active: visitantes + congregados + membros
      };
    } catch (error) {
      throw new Error(`Erro ao obter estatisticas: ${error.message}`);
    }
  }
}

module.exports = new MemberService();
