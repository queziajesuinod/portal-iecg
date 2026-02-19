const CelulaService = require('../services/celulaService');

const serializeCelula = (celula) => {
  if (!celula) {
    return null;
  }
  const payload = celula.toJSON ? celula.toJSON() : celula;
  const leader = payload.liderRef || null;
  const leaderMember = payload.liderMemberRef || null;

  payload.leaderUser = leaderMember
    ? {
      id: leaderMember.userId || leaderMember.id,
      name: leaderMember.fullName,
      email: leaderMember.email,
      telefone: leaderMember.phone || leaderMember.whatsapp,
      username: null,
      isLeader: true
    }
    : (leader
      ? {
        id: leader.id,
        name: leader.name,
        email: leader.email,
        telefone: leader.telefone,
        username: leader.username,
        isLeader: leader.is_lider_celula
      }
      : null);

  payload.leaderMember = leaderMember
    ? {
      id: leaderMember.id,
      fullName: leaderMember.fullName,
      userId: leaderMember.userId,
      email: leaderMember.email,
      phone: leaderMember.phone || leaderMember.whatsapp,
      photoUrl: leaderMember.photoUrl
    }
    : null;

  return payload;
};

class CelulaController {
  async buscarPorLeaderContact(req, res) {
    try {
      const { email, telefone } = req.query;
      if (!email && !telefone) {
        return res.status(400).json({ erro: 'Informe email ou telefone do lider.' });
      }

      const leader = await CelulaService.buscarPorContatoLeader({ email, telefone });
      if (!leader) {
        return res.status(404).json({ erro: 'Lider nao encontrado' });
      }

      const celulas = (leader.liderancaCelulas || []).map((celula) => {
        const payload = celula.toJSON ? celula.toJSON() : celula;
        payload.liderMemberRef = leader;
        return serializeCelula(payload);
      });

      const spouse = leader.spouse ? {
        id: leader.spouse.id,
        name: leader.spouse.fullName,
        email: leader.spouse.email,
        telefone: leader.spouse.phone || leader.spouse.whatsapp,
        image: leader.spouse.photoUrl,
        endereco: leader.spouse.street,
        bairro: leader.spouse.neighborhood,
        numero: leader.spouse.number,
        cep: leader.spouse.zipCode
      } : null;

      return res.status(200).json({
        leader: {
          id: leader.id,
          name: leader.fullName,
          email: leader.email,
          telefone: leader.phone || leader.whatsapp,
          username: null,
          isLeader: celulas.length > 0,
          data_nascimento: leader.birthDate,
          cpf: leader.cpf,
          estado_civil: leader.maritalStatus,
          profissao: null,
          batizado: null,
          encontro: null,
          escolas: null,
          image: leader.photoUrl,
          conjuge_id: leader.spouseMemberId || null,
          perfilId: null,
          active: !['INATIVO', 'MIA', 'TRANSFERIDO', 'FALECIDO'].includes(leader.status),
          endereco: leader.street,
          bairro: leader.neighborhood,
          numero: leader.number,
          cep: leader.zipCode,
          escolaridade: null,
          nome_esposo: spouse?.name || null,
          userId: leader.userId,
          spouse
        },
        celulas
      });
    } catch (error) {
      console.error('Erro ao buscar lider por contato:', error);
      return res.status(500).json({ erro: 'Falha ao buscar lider' });
    }
  }

  async criar(req, res) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ erro: 'Dados invalidos ou ausentes' });
      }

      if (req.body.id) {
        delete req.body.id;
      }

      const celula = await CelulaService.criarCelula(req.body);
      return res.status(201).json(serializeCelula(celula));
    } catch (error) {
      console.error('Erro ao criar celula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTodas(req, res) {
    try {
      const celulas = await CelulaService.buscarTodasCelulas();
      return res.status(200).json(celulas.map(serializeCelula));
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao buscar celulas' });
    }
  }

  async listar(req, res) {
    try {
      const {
        celula,
        campus,
        campusId,
        rede,
        bairro,
        horario,
        ativo,
        lider,
        dia,
        pastor_geracao,
        page = 1,
        limit = 10
      } = req.query;
      const resultado = await CelulaService.buscaComFiltros(
        {
          celula,
          campus,
          campusId,
          rede,
          bairro,
          horario,
          ativo,
          lider,
          dia,
          pastor_geracao
        },
        parseInt(page, 10),
        parseInt(limit, 10)
      );
      return res.status(200).json({
        ...resultado,
        registros: resultado.registros.map(serializeCelula)
      });
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao listar celulas', detalhe: error.message });
    }
  }

  async listarPaginado(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const resultado = await CelulaService.buscaPaginada(page, limit);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao listar celulas:', error);
      return res.status(500).json({ erro: 'Erro ao buscar celulas' });
    }
  }

  async buscarPorId(req, res) {
    try {
      if (!req.params.id) {
        return res.status(400).json({ erro: 'ID da celula e obrigatorio' });
      }

      const celula = await CelulaService.buscarCelulaPorId(req.params.id);
      return res.status(200).json(serializeCelula(celula));
    } catch (error) {
      console.error('Erro ao buscar celula por ID:', error);
      return res.status(404).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      if (!req.params.id) {
        return res.status(400).json({ erro: 'ID da celula e obrigatorio' });
      }

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ erro: 'Dados para atualizacao sao obrigatorios' });
      }

      const celula = await CelulaService.atualizarCelula(req.params.id, req.body);
      return res.status(200).json(serializeCelula(celula));
    } catch (error) {
      console.error('Erro ao atualizar celula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletar(req, res) {
    try {
      if (!req.params.id) {
        return res.status(400).json({ erro: 'ID da celula e obrigatorio' });
      }

      const resposta = await CelulaService.deletarCelula(req.params.id);
      return res.status(200).json(resposta);
    } catch (error) {
      console.error('Erro ao deletar celula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new CelulaController();
