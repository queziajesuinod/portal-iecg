const CelulaService = require('../services/celulaService');

class CelulaController {
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

      return res.status(201).json(celula);
    } catch (error) {
      console.error('Erro ao criar célula:', error);
      return res.status(400).json({ erro: error.message });
    }
  }

  async listarTodas(req, res) {
    try {
      const celulas = await CelulaService.buscarTodasCelulas();
      return res.status(200).json(celulas);
    } catch (error) {
      return res.status(500).json({ erro: 'Erro ao buscar células' });
    }
  }

  async listar(req, res) {
    try {
      const { celula, campus, campusId, rede, bairro, horario, page = 1, limit = 10 } = req.query;
      const resultado = await CelulaService.buscaComFiltros(
        { celula, campus, campusId, rede, bairro, horario },
        parseInt(page, 10),
        parseInt(limit, 10)
      );
      return res.status(200).json(resultado);
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
      return res.status(200).json(celula);
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
      return res.status(200).json(celula);
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
