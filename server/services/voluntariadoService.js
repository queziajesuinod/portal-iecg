'use strict';
const { Voluntariado, AreaVoluntariado, Member, MemberActivity, MemberMilestone, Perfil, User } = require('../models');

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
  }
];

const VoluntariadoService = {
  async listar(filtros = {}) {
    const where = {};
    if (filtros.memberId) where.memberId = filtros.memberId;
    if (filtros.areaVoluntariadoId) where.areaVoluntariadoId = filtros.areaVoluntariadoId;
    if (filtros.status) where.status = filtros.status;

    return Voluntariado.findAll({
      where,
      include: includeAssociations,
      order: [['dataInicio', 'DESC']]
    });
  },

  async buscarPorId(id) {
    const voluntariado = await Voluntariado.findByPk(id, { include: includeAssociations });
    if (!voluntariado) throw new Error('Vínculo de voluntariado não encontrado');
    return voluntariado;
  },

  async criar(dados) {
    const voluntariado = await Voluntariado.create({ ...dados, status: 'PENDENTE' });

    // Ações secundárias — não bloqueiam o cadastro se falharem
    try {
      const area = await AreaVoluntariado.findByPk(dados.areaVoluntariadoId);
      const nomeArea = area ? area.nome : 'área desconhecida';

      // Marco de voluntariado no membro
      await MemberMilestone.create({
        memberId: dados.memberId,
        milestoneType: 'VOLUNTARIADO',
        achievedDate: dados.dataInicio,
        description: `Voluntariado em ${nomeArea}`,
        createdBy: dados.createdBy || null
      });

      // Se a área for BACKSTAGE, atualiza o perfil do usuário vinculado ao membro
      if (area && area.nome.toUpperCase() === 'BACKSTAGE') {
        const member = await Member.findByPk(dados.memberId, { attributes: ['id', 'userId'] });
        if (member && member.userId) {
          const perfilBackstage = await Perfil.findOne({
            where: { descricao: 'BACKSTAGE' }
          });
          if (perfilBackstage) {
            await User.update(
              { perfilId: perfilBackstage.id },
              { where: { id: member.userId } }
            );
          } else {
            console.warn('[VoluntariadoService] Perfil BACKSTAGE não encontrado na tabela Perfis');
          }
        }
      }
    } catch (err) {
      console.warn('[VoluntariadoService] Falha em ação secundária:', err.message);
    }

    return voluntariado;
  },

  async atualizar(id, dados) {
    const voluntariado = await Voluntariado.findByPk(id);
    if (!voluntariado) throw new Error('Vínculo de voluntariado não encontrado');
    // Não permite alterar status por este método
    const { status, ...resto } = dados;
    Object.assign(voluntariado, resto);
    await voluntariado.save();
    return this.buscarPorId(id);
  },

  async aprovar(id) {
    const voluntariado = await Voluntariado.findByPk(id);
    if (!voluntariado) throw new Error('Vínculo de voluntariado não encontrado');
    if (voluntariado.status !== 'PENDENTE') {
      throw new Error('Apenas voluntariados pendentes podem ser aprovados');
    }
    voluntariado.status = 'APROVADO';
    await voluntariado.save();
    return this.buscarPorId(id);
  },

  async encerrar(id, dataFim) {
    const voluntariado = await Voluntariado.findByPk(id, {
      include: [{ model: AreaVoluntariado, as: 'area', attributes: ['id', 'nome'] }]
    });
    if (!voluntariado) throw new Error('Vínculo de voluntariado não encontrado');
    if (voluntariado.status === 'ENCERRADO') {
      throw new Error('Voluntariado já está encerrado');
    }

    const dataFimFinal = dataFim || new Date().toISOString().slice(0, 10);
    const nomeArea = voluntariado.area ? voluntariado.area.nome : 'área desconhecida';

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
    if (!voluntariado) throw new Error('Vínculo de voluntariado não encontrado');
    await voluntariado.destroy();
  }
};

module.exports = VoluntariadoService;
