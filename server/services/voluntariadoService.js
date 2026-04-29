'use strict';
const { Voluntariado, AreaVoluntariado, Campus, Ministerio, Member, MemberActivity, MemberMilestone, Perfil, User } = require('../models');

const includeAssociations = [
  {
    model: Member,
    as: 'membro',
    attributes: ['id', 'fullName', 'preferredName', 'email', 'phone']
  },
  {
    model: AreaVoluntariado,
    as: 'area',
    attributes: ['id', 'nome', 'ativo']
  },
  {
    model: Campus,
    as: 'campus',
    attributes: ['id', 'nome'],
    required: false
  },
  {
    model: Ministerio,
    as: 'ministerio',
    attributes: ['id', 'nome'],
    required: false
  }
];

const VoluntariadoService = {
  async listar(filtros = {}) {
    const where = {};
    if (filtros.memberId) where.memberId = filtros.memberId;
    if (filtros.areaVoluntariadoId) where.areaVoluntariadoId = filtros.areaVoluntariadoId;
    if (filtros.campusId) where.campusId = filtros.campusId;
    if (filtros.ministerioId) where.ministerioId = filtros.ministerioId;
    if (filtros.status) where.status = filtros.status;

    return Voluntariado.findAll({
      where,
      include: includeAssociations,
      order: [['dataInicio', 'DESC']]
    });
  },

  async buscarPorId(id) {
    const voluntariado = await Voluntariado.findByPk(id, { include: includeAssociations });
    if (!voluntariado) throw new Error('Vinculo de voluntariado nao encontrado');
    return voluntariado;
  },

  async criar(dados) {
    const voluntariado = await Voluntariado.create({ ...dados, status: 'PENDENTE' });

    // Acoes secundÃƒÂ¡rias - nao bloqueiam o cadastro se falharem
    try {
      const area = await AreaVoluntariado.findByPk(dados.areaVoluntariadoId);

      // Se a area for BACKSTAGE, aplica perfil BACKSTAGE somente se o usuario
      // ainda tem o perfil padrao de membro (nunca rebaixa permissoes existentes)
      if (area && area.nome.toUpperCase() === 'BACKSTAGE') {
        const member = await Member.findByPk(dados.memberId, { attributes: ['id', 'userId'] });
        if (member && member.userId) {
          const user = await User.findByPk(member.userId, { attributes: ['id', 'perfilId'] });
          const defaultPerfilId = process.env.DEFAULT_MEMBER_PERFIL_ID || '7d47d03a-a7aa-4907-b8b9-8fcf87bd52dc';
          if (user && user.perfilId === defaultPerfilId) {
            const perfilBackstage = await Perfil.findOne({
              where: { descricao: 'BACKSTAGE' }
            });
            if (perfilBackstage) {
              await User.update(
                { perfilId: perfilBackstage.id },
                { where: { id: member.userId } }
              );
            } else {
              console.warn('[VoluntariadoService] Perfil BACKSTAGE nao encontrado na tabela Perfis');
            }
          }
        }
      }
    } catch (err) {
      console.warn('[VoluntariadoService] Falha em acao secundÃƒÂ¡ria:', err.message);
    }

    return voluntariado;
  },

  async atualizar(id, dados) {
    const voluntariado = await Voluntariado.findByPk(id);
    if (!voluntariado) throw new Error('Vinculo de voluntariado nao encontrado');
    // Nao permite alterar status por este metodo
    const { status, ...resto } = dados;
    Object.assign(voluntariado, resto);
    await voluntariado.save();
    return this.buscarPorId(id);
  },

  async aprovar(id) {
    const voluntariado = await Voluntariado.findByPk(id, {
      include: [{ model: AreaVoluntariado, as: 'area', attributes: ['id', 'nome'] }]
    });
    if (!voluntariado) throw new Error('Vinculo de voluntariado nao encontrado');
    if (voluntariado.status !== 'PENDENTE') {
      throw new Error('Apenas voluntariados pendentes podem ser aprovados');
    }

    voluntariado.status = 'APROVADO';
    await voluntariado.save();

    const nomeArea = voluntariado.area ? voluntariado.area.nome : 'area desconhecida';
    const achievedDate = voluntariado.dataInicio || new Date().toISOString().slice(0, 10);
    const description = `Voluntariado em ${nomeArea}`;

    const existingMilestone = await MemberMilestone.findOne({
      where: {
        memberId: voluntariado.memberId,
        milestoneType: 'VOLUNTARIADO',
        achievedDate,
        description
      }
    });

    if (!existingMilestone) {
      await MemberMilestone.create({
        memberId: voluntariado.memberId,
        milestoneType: 'VOLUNTARIADO',
        achievedDate,
        description,
        createdBy: null
      });
    }

    return this.buscarPorId(id);
  },
  async encerrar(id, dataFim) {
    const voluntariado = await Voluntariado.findByPk(id, {
      include: [{ model: AreaVoluntariado, as: 'area', attributes: ['id', 'nome'] }]
    });
    if (!voluntariado) throw new Error('Vinculo de voluntariado nao encontrado');
    if (voluntariado.status === 'ENCERRADO') {
      throw new Error('Voluntariado ja esta encerrado');
    }

    const dataFimFinal = dataFim || new Date().toISOString().slice(0, 10);
    const nomeArea = voluntariado.area ? voluntariado.area.nome : 'area desconhecida';

    voluntariado.status = 'ENCERRADO';
    voluntariado.dataFim = dataFimFinal;
    await voluntariado.save();

    // Registrar atividade FIM_VOLUNTARIADO no membro
    await MemberActivity.create({
      memberId: voluntariado.memberId,
      activityType: 'FIM_VOLUNTARIADO',
      activityDate: new Date(dataFimFinal),
      points: 0,
      metadata: {
        areaVoluntariadoId: voluntariado.areaVoluntariadoId,
        area: nomeArea,
        observacao: `Encerrou o voluntariado em ${nomeArea}`
      }
    });

    return this.buscarPorId(id);
  },

  async remover(id) {
    const voluntariado = await Voluntariado.findByPk(id);
    if (!voluntariado) throw new Error('Vinculo de voluntariado nao encontrado');
    await voluntariado.destroy();
  }
};

module.exports = VoluntariadoService;
