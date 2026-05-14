const { Op } = require('sequelize');
const {
  Celula,
  CelulaMembroVinculo,
  CelulaReuniao,
  CelulaPresenca,
  PreCadastroPresenca,
  Member,
  ApeloDirecionadoCelula
} = require('../models');
const celulaPresencaService = require('../services/celulaPresencaService');
const { now, todayDateOnly } = require('../utils/dateTime');

class CelulaPresencaController {
  // ── Membros vinculados ──────────────────────────────────────────────────────

  async listarMembros(req, res) {
    try {
      const { celulaId } = req.params;
      const vinculos = await CelulaMembroVinculo.findAll({
        where: { celulaId, ativo: true },
        include: [{
          model: Member,
          as: 'membro',
          attributes: ['id', 'fullName', 'preferredName', 'phone', 'whatsapp', 'photoUrl', 'status']
        }],
        order: [['papel', 'ASC'], [{ model: Member, as: 'membro' }, 'fullName', 'ASC']]
      });
      return res.json(vinculos);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async vincularMembro(req, res) {
    try {
      const { celulaId } = req.params;
      const {
        membroId, papel = 'membro', dataEntrada, observacao
      } = req.body;
      if (!membroId) return res.status(400).json({ erro: 'membroId é obrigatório' });

      const existente = await CelulaMembroVinculo.findOne({ where: { celulaId, membroId, ativo: true } });
      if (existente) return res.status(409).json({ erro: 'Membro já vinculado a esta célula' });

      // Verifica se já está ativo em OUTRA célula → gera aviso, não bloqueia
      let aviso = null;
      const vinculoAnterior = await CelulaMembroVinculo.findOne({
        where: { membroId, ativo: true, celulaId: { [Op.ne]: celulaId } },
        include: [{ model: Celula, as: 'celula', attributes: ['id', 'celula', 'lider'] }]
      });
      if (vinculoAnterior) {
        aviso = {
          celulaAnteriorId: vinculoAnterior.celulaId,
          celulaAnteriorNome: vinculoAnterior.celula?.celula || 'outra célula',
          liderAnterior: vinculoAnterior.celula?.lider || null
        };
      }

      const vinculo = await CelulaMembroVinculo.create({
        celulaId,
        membroId,
        papel,
        dataEntrada: dataEntrada || todayDateOnly(),
        origem: 'manual',
        observacao: observacao || null
      });

      // Atualiza celulaId no membro
      await Member.update({ celulaId }, { where: { id: membroId } });

      return res.status(201).json({ ...vinculo.toJSON(), aviso });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async desvincularMembro(req, res) {
    try {
      const { celulaId, membroId } = req.params;
      const vinculo = await CelulaMembroVinculo.findOne({ where: { celulaId, membroId, ativo: true } });
      if (!vinculo) return res.status(404).json({ erro: 'Vínculo não encontrado' });

      const hoje = todayDateOnly();
      const [ano, mes, dia] = hoje.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;

      await vinculo.update({ ativo: false, dataSaida: hoje });

      // Se o vínculo veio de um apelo, atualiza o status do apelo
      if (vinculo.origem === 'apelo') {
        const descricao = `Foi desvinculado da célula no dia ${dataFormatada}`;

        let apelo = null;

        // Tenta pelo apeloId direto
        if (vinculo.apeloId) {
          apelo = await ApeloDirecionadoCelula.findByPk(vinculo.apeloId);
        }

        // Fallback: busca pelo membro (phone/whatsapp) + celula_id
        if (!apelo) {
          const membro = await Member.findByPk(membroId, { attributes: ['whatsapp', 'phone'] });
          const telefone = (membro?.whatsapp || membro?.phone || '').replace(/\D/g, '');
          if (telefone.length >= 8) {
            apelo = await ApeloDirecionadoCelula.findOne({
              where: {
                celula_id: celulaId,
                status: 'CONSOLIDADO_CELULA'
              },
              order: [['createdAt', 'DESC']]
            });
            // Confirma que o telefone bate
            if (apelo) {
              const apeloTel = (apelo.whatsapp || '').replace(/\D/g, '');
              const sufixo = telefone.slice(-9);
              if (!apeloTel.endsWith(sufixo)) apelo = null;
            }
          }
        }

        if (apelo) {
          await apelo.update({
            status: 'CONSOLIDACAO_INTERROMPIDA',
            observacao: apelo.observacao
              ? `${apelo.observacao}\n${descricao}`
              : descricao
          });
        }
      }

      return res.json({ mensagem: 'Membro desvinculado com sucesso' });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  // ── Reuniões ────────────────────────────────────────────────────────────────

  async listarReunioes(req, res) {
    try {
      const { celulaId } = req.params;
      const { status, limit = 20, offset = 0 } = req.query;

      const where = { celulaId };
      if (status) where.status = status;

      const { count, rows } = await CelulaReuniao.findAndCountAll({
        where,
        order: [['data', 'DESC']],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      return res.json({ total: count, reunioes: rows });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async criarReuniaoManual(req, res) {
    try {
      const { celulaId } = req.params;
      const { data, observacoes } = req.body;
      if (!data) return res.status(400).json({ erro: 'data é obrigatória' });

      const celula = await Celula.findByPk(celulaId);
      if (!celula) return res.status(404).json({ erro: 'Célula não encontrada' });

      const reuniao = await CelulaReuniao.create({
        celulaId,
        data: new Date(data),
        status: new Date(data) <= now() ? 'aberta' : 'agendada',
        origem: 'manual',
        observacoes: observacoes || null
      });

      return res.status(201).json(reuniao);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async cancelarReuniao(req, res) {
    try {
      const { reuniaoId } = req.params;
      const { motivo } = req.body;

      const reuniao = await CelulaReuniao.findByPk(reuniaoId);
      if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada' });
      if (reuniao.status === 'encerrada') return res.status(400).json({ erro: 'Reunião já encerrada' });

      await reuniao.update({ status: 'cancelada', motivoCancelamento: motivo || null });
      return res.json(reuniao);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  // ── Presença ────────────────────────────────────────────────────────────────

  async obterPresencaReuniao(req, res) {
    try {
      const { reuniaoId } = req.params;

      const reuniao = await CelulaReuniao.findByPk(reuniaoId);
      if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada' });

      // Membros vinculados à célula
      const vinculos = await CelulaMembroVinculo.findAll({
        where: { celulaId: reuniao.celulaId, ativo: true },
        include: [{ model: Member, as: 'membro', attributes: ['id', 'fullName', 'preferredName', 'photoUrl', 'status'] }]
      });

      const presencasExistentes = await CelulaPresenca.findAll({
        where: { reuniaoId },
        include: [{ model: PreCadastroPresenca, as: 'preCadastro', attributes: ['id', 'nome', 'tipo'] }]
      });

      const presencaMap = {};
      for (const p of presencasExistentes) {
        if (p.membroId) presencaMap[`m_${p.membroId}`] = p;
      }

      const membros = vinculos.map(v => ({
        tipo: 'membro',
        papel: v.papel,
        membroId: v.membroId,
        nome: v.membro?.preferredName || v.membro?.fullName,
        fotoUrl: v.membro?.photoUrl,
        status: v.membro?.status,
        presente: presencaMap[`m_${v.membroId}`]?.presente ?? null,
        presencaId: presencaMap[`m_${v.membroId}`]?.id ?? null
      }));

      const avulsos = presencasExistentes
        .filter(p => p.preCadastroId && !p.membroId)
        .map(p => ({
          tipo: 'avulso',
          preCadastroId: p.preCadastroId,
          nome: p.preCadastro?.nome,
          tipoPessoa: p.preCadastro?.tipo,
          presente: p.presente,
          presencaId: p.id
        }));

      return res.json({ reuniao, membros, avulsos });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async registrarPresenca(req, res) {
    try {
      const { reuniaoId } = req.params;
      const { presencas } = req.body;

      // Busca membroId do usuário logado para gravar quem encerrou
      const encerradaPorId = req.user?.memberId || null;

      await celulaPresencaService.registrarPresenca(reuniaoId, presencas, encerradaPorId);
      return res.json({ mensagem: 'Presença registrada com sucesso' });
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }

  async adicionarPresencaAvulsa(req, res) {
    try {
      const { reuniaoId } = req.params;
      const {
        nome, telefone, whatsapp, tipo
      } = req.body;
      if (!nome) return res.status(400).json({ erro: 'nome é obrigatório' });

      const preCadastro = await celulaPresencaService.adicionarPresencaAvulsa(reuniaoId, {
        nome, telefone, whatsapp, tipo
      });
      return res.status(201).json(preCadastro);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }

  // ── Estatísticas do membro ──────────────────────────────────────────────────

  async estatisticasMembro(req, res) {
    try {
      const { membroId, celulaId } = req.params;
      const stats = await celulaPresencaService.estatisticasMembro(membroId, celulaId);
      if (!stats) return res.status(404).json({ erro: 'Vínculo não encontrado' });
      return res.json(stats);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async excluirReuniao(req, res) {
    try {
      const { reuniaoId } = req.params;
      await celulaPresencaService.excluirReuniao(reuniaoId);
      return res.json({ mensagem: 'Reunião excluída com sucesso' });
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }

  // ── Sugestão e confirmação de reuniões ─────────────────────────────────────

  async sugerirReunioes(req, res) {
    try {
      const { celulaId } = req.params;
      const semanas = parseInt(req.query.semanas, 10) || 8;
      const sugestoes = await celulaPresencaService.sugerirReunioes(celulaId, semanas);
      return res.json(sugestoes);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async confirmarReunioes(req, res) {
    try {
      const { celulaId } = req.params;
      const { datas } = req.body;
      if (!Array.isArray(datas) || !datas.length) return res.status(400).json({ erro: 'datas é obrigatório' });

      const criadas = await celulaPresencaService.criarReunioesDatas(celulaId, datas);
      return res.json({ mensagem: `${criadas} reunião(ões) criada(s)`, criadas });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  async excluirReunioesAgendadas(req, res) {
    try {
      const { celulaId } = req.params;
      const total = await celulaPresencaService.excluirReunioesAgendadas(celulaId);
      return res.json({ mensagem: `${total} reunião(ões) agendada(s) excluída(s)`, total });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  // ── Cadastro rápido de membro + vínculo imediato ───────────────────────────

  async cadastrarEVincularMembro(req, res) {
    try {
      const { celulaId } = req.params;
      const {
        fullName, preferredName, phone, whatsapp, email, gender, birthDate, papel = 'membro'
      } = req.body;
      if (!fullName || !fullName.trim()) return res.status(400).json({ erro: 'Nome completo é obrigatório' });

      const celula = await Celula.findByPk(celulaId);
      if (!celula) return res.status(404).json({ erro: 'Célula não encontrada' });

      const membro = await Member.create({
        fullName: fullName.trim(),
        preferredName: preferredName?.trim() || null,
        phone: phone?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        email: email?.trim() || null,
        gender: gender || null,
        birthDate: birthDate || null,
        status: 'FREQUENTADOR',
        celulaId,
        createdBy: req.user?.id || null
      });

      const vinculo = await CelulaMembroVinculo.create({
        celulaId,
        membroId: membro.id,
        papel,
        dataEntrada: todayDateOnly(),
        origem: 'manual'
      });

      return res.status(201).json({ membro, vinculo });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  // ── Busca de membros não vinculados (candidatos para adicionar) ──────────────

  async transferirMembro(req, res) {
    try {
      const { celulaId, membroId } = req.params;
      const { destinoCelulaId, motivo } = req.body;
      if (!destinoCelulaId) return res.status(400).json({ erro: 'destinoCelulaId é obrigatório' });

      await celulaPresencaService.transferirMembro(membroId, celulaId, destinoCelulaId, motivo || null);
      return res.json({ mensagem: 'Membro transferido com sucesso' });
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }

  async buscarMembrosCandidatos(req, res) {
    try {
      const { celulaId } = req.params;
      const { q = '' } = req.query;

      const vinculos = await CelulaMembroVinculo.findAll({
        where: { celulaId, ativo: true },
        attributes: ['membroId']
      });
      const vinculadosIds = vinculos.map(v => v.membroId);

      const where = {};
      if (vinculadosIds.length) where.id = { [Op.notIn]: vinculadosIds };
      if (q.trim()) {
        where[Op.or] = [
          { fullName: { [Op.iLike]: `%${q.trim()}%` } },
          { preferredName: { [Op.iLike]: `%${q.trim()}%` } }
        ];
      }

      const membros = await Member.findAll({
        where,
        attributes: ['id', 'fullName', 'preferredName', 'phone', 'photoUrl', 'celulaId'],
        include: [{
          model: Celula,
          as: 'celula',
          attributes: ['id', 'celula', 'lider'],
          required: false
        }],
        limit: 20,
        order: [['fullName', 'ASC']]
      });

      return res.json(membros.map(m => ({
        id: m.id,
        fullName: m.fullName,
        preferredName: m.preferredName,
        phone: m.phone,
        photoUrl: m.photoUrl,
        celulaAtual: m.celulaId
          ? { id: m.celulaId, celula: m.celula?.celula || null, lider: m.celula?.lider || null }
          : null
      })));
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }
}

module.exports = new CelulaPresencaController();
