const { Member, MemberJourney, MemberActivity, MemberMilestone, MIA, User, Campus, Celula } = require('../models');
const { Op } = require('sequelize');
const cache = require('../utils/cache');

class MemberService {
  
  /**
   * Criar novo membro
   */
  async createMember(data, createdBy) {
    try {
      // Criar membro
      const member = await Member.create({
        ...data,
        createdBy,
        statusChangeDate: new Date()
      });
      
      // Criar MemberJourney automaticamente
      await MemberJourney.create({
        memberId: member.id,
        currentStage: this.mapStatusToStage(member.status),
        lastActivityDate: new Date()
      });
      
      // Registrar marco de primeira visita
      if (member.status === 'VISITANTE') {
        await MemberMilestone.create({
          memberId: member.id,
          milestoneType: 'PRIMEIRA_VISITA',
          achievedDate: new Date(),
          description: 'Primeira visita à igreja',
          createdBy
        });
        
        // Registrar atividade
        await MemberActivity.create({
          memberId: member.id,
          activityType: 'CULTO_PRESENCA',
          activityDate: new Date(),
          points: 10
        });
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
      const cacheKey = `member:${id}`;
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
      
      const member = await Member.findByPk(id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
          { model: Campus, as: 'campus' },
          { model: Celula, as: 'celula' },
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
        throw new Error('Membro não encontrado');
      }
      
      await cache.set(cacheKey, member);
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
          { model: Campus, as: 'campus', attributes: ['id', 'name'] },
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
      const member = await Member.findByPk(id);
      if (!member) {
        throw new Error('Membro não encontrado');
      }
      
      // Se mudou o status, registrar
      if (data.status && data.status !== member.status) {
        data.statusChangeDate = new Date();
        
        // Atualizar journey
        const journey = await MemberJourney.findOne({ where: { memberId: id } });
        if (journey) {
          await journey.update({
            currentStage: this.mapStatusToStage(data.status),
            stageChangedAt: new Date()
          });
        }
        
        // Se virou MIA, criar registro
        if (data.status === 'MIA' && member.status !== 'MIA') {
          await this.convertToMIA(id, data.statusReason, updatedBy);
        }
      }
      
      await member.update(data);
      
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
        throw new Error('Membro não encontrado');
      }
      
      await member.destroy();
      
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
        throw new Error('Membro não encontrado');
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
        throw new Error('Membro não encontrado');
      }
      
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      
      // Verificar se o user já está vinculado a outro membro
      const existingLink = await Member.findOne({ where: { userId } });
      if (existingLink && existingLink.id !== memberId) {
        throw new Error('Este usuário já está vinculado a outro membro');
      }
      
      await member.update({ userId });
      
      // Invalidar cache
      await cache.del(`member:${memberId}`);
      
      return await this.getMemberById(memberId);
    } catch (error) {
      throw new Error(`Erro ao vincular usuário: ${error.message}`);
    }
  }
  
  /**
   * Mapear status do membro para estágio da jornada
   */
  mapStatusToStage(status) {
    const mapping = {
      'VISITANTE': 'VISITANTE',
      'CONGREGADO': 'CONGREGADO',
      'MEMBRO': 'MEMBRO',
      'INATIVO': 'VISITANTE',
      'MIA': 'MIA',
      'TRANSFERIDO': 'MEMBRO',
      'FALECIDO': 'MEMBRO'
    };
    return mapping[status] || 'VISITANTE';
  }
  
  /**
   * Obter estatísticas gerais
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
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }
  }
}

module.exports = new MemberService();
