const CelulaService = require('../services/celulaService');

const serializeCelula = (celula) => {
  if (!celula) {
    return null;
  }
  const payload = celula.toJSON ? celula.toJSON() : celula;
  const leader = payload.liderRef || null;
  payload.leaderUser = leader
    ? {
        id: leader.id,
        name: leader.name,
        email: leader.email,
        telefone: leader.telefone,
        username: leader.username,
        isLeader: leader.is_lider_celula
      }
    : null;
  return payload;
};

class CelulaController {
  async buscarPorLeaderContact(req, res) {
    try {
      const { email, telefone } = req.query;
      if (!email && !telefone) {
        return res.status(400).json({ erro: 'Informe email ou telefone do líder.' });
      }

      const leader = await CelulaService.buscarPorContatoLeader({ email, telefone });
      if (!leader) {
        return res.status(404).json({ erro: 'Líder não encontrado' });
      }

      const celulas = (leader.lideranca || []).map((celula) => {
        const payload = celula.toJSON ? celula.toJSON() : celula;
        payload.liderRef = leader;
        return serializeCelula(payload);
      });

      const spouse = leader.conjuge ? {
        id: leader.conjuge.id,
        name: leader.conjuge.name,
        email: leader.conjuge.email,
        telefone: leader.conjuge.telefone,
        username: leader.conjuge.username,
        image: leader.conjuge.image,
        endereco: leader.conjuge.endereco,
        bairro: leader.conjuge.bairro,
        numero: leader.conjuge.numero,
        cep: leader.conjuge.cep
      } : null;

      return res.status(200).json({
        leader: {
          id: leader.id,
          name: leader.name,
          email: leader.email,
          telefone: leader.telefone,
          username: leader.username,
          isLeader: leader.is_lider_celula,
          data_nascimento: leader.data_nascimento,
          cpf: leader.cpf,
          estado_civil: leader.estado_civil,
          profissao: leader.profissao,
          batizado: leader.batizado,
          encontro: leader.encontro,
          escolas: leader.escolas,
          image: leader.image,
          conjuge_id: leader.conjuge_id,
          perfilId: leader.perfilId,
          active: leader.active,
          endereco: leader.endereco,
          bairro: leader.bairro,
          numero: leader.numero,
          cep: leader.cep,
          spouse
        },
        celulas
      });
    } catch (error) {
      console.error('Erro ao buscar líder por contato:', error);
      return res.status(500).json({ erro: 'Falha ao buscar líder' });
    }
  }

  async criar(req, res) {
    try {
      console.log('Dados recebidos no corpo da requisição:', req.body);

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ erro: 'Dados inválidos ou ausentes' });
      }

      // Remove o campo 'id' do corpo da requisição, caso esteja presente
      if (req.body.id) {
        delete req.body.id;
      }

      const celula = await CelulaService.criarCelula(req.body);
      console.log('Célula criada com sucesso:', celula);

      return res.status(201).json(serializeCelula(celula));
    } catch (error) {
      console.error('Erro ao criar célula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTodas(req, res) {
    try {
      const celulas = await CelulaService.buscarTodasCelulas();
      return res.status(200).json(celulas.map(serializeCelula));
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao buscar células' });
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
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const resultado = await CelulaService.buscaPaginada(page, limit);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao listar células:', error);
      return res.status(500).json({ erro: 'Erro ao buscar células' });
    }
  }


  async buscarPorId(req, res) {
    try {
      if (!req.params.id) {
        return res.status(400).json({ erro: 'ID da célula é obrigatório' });
      }

      const celula = await CelulaService.buscarCelulaPorId(req.params.id);
      return res.status(200).json(serializeCelula(celula));
    } catch (error) {
      console.error('Erro ao buscar célula por ID:', error);
      return res.status(404).json({ erro: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      if (!req.params.id) {
        return res.status(400).json({ erro: 'ID da célula é obrigatório' });
      }

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ erro: 'Dados para atualização são obrigatórios' });
      }

      const celula = await CelulaService.atualizarCelula(req.params.id, req.body);
      return res.status(200).json(serializeCelula(celula));
    } catch (error) {
      console.error('Erro ao atualizar célula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async deletar(req, res) {
    try {
      if (!req.params.id) {
        return res.status(400).json({ erro: 'ID da célula é obrigatório' });
      }

      const resposta = await CelulaService.deletarCelula(req.params.id);
      return res.status(200).json(resposta);
    } catch (error) {
      console.error('Erro ao deletar célula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }
}

module.exports = new CelulaController();
