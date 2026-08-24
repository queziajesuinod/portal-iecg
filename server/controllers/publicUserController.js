const { getUserWithSpouse, findUserWithSpouseByContact } = require('../services/users');

// ATENÇÃO: esta resposta é servida por rotas PÚBLICAS (sem autenticação). Nunca exponha
// aqui identificadores sensíveis (CPF, data de nascimento) — são vetores de roubo de
// identidade e enumeração (LGPD). Campos de endereço permanecem porque o formulário
// público de atualização de célula depende deles para pré-preencher os dados do líder.
const buildLeaderResponse = ({ user, spouse }) => ({
  leader: {
    id: user.id,
    name: user.name,
    email: user.email,
    telefone: user.telefone,
    image: user.image,
    username: user.username,
    perfilId: user.perfilId,
    endereco: user.endereco,
    bairro: user.bairro,
    numero: user.numero,
    cep: user.cep,
    escolaridade: user.escolaridade,
    estado_civil: user.estado_civil,
    profissao: user.profissao,
    batizado: user.batizado,
    encontro: user.encontro,
    escolas: user.escolas,
    nome_esposo: user.nome_esposo,
    is_lider_celula: user.is_lider_celula
  },
  spouse: spouse
    ? {
      id: spouse.id,
      name: spouse.name,
      email: spouse.email,
      telefone: spouse.telefone,
      image: spouse.image,
      estado_civil: spouse.estado_civil,
      profissao: spouse.profissao
    }
    : null
});

class PublicUserController {
  async getLeaderById(req, res) {
    try {
      const result = await getUserWithSpouse(req.params.id);
      if (!result) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      const { user, spouse } = result;
      return res.status(200).json(buildLeaderResponse({ user, spouse }));
    } catch (error) {
      console.error('Erro ao buscar líder público:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  async searchByContact(req, res) {
    try {
      const { email, telefone } = req.query;
      if (!email && !telefone) {
        return res.status(400).json({ message: 'Informe email ou telefone do líder.' });
      }
      const result = await findUserWithSpouseByContact({ email, telefone });
      if (!result || !result.user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      return res.status(200).json(buildLeaderResponse(result));
    } catch (error) {
      console.error('Erro ao buscar usuário por contato público:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  async updateLeaderById(req, res) {
    // DESATIVADO: este endpoint permitia edição anônima de qualquer usuário por ID (IDOR de
    // escrita). Nenhum front-end o utiliza (atualizações de líder passam por
    // POST /public/celulas/leader). Mantido como 403 para não reintroduzir a falha.
    return res.status(403).json({ message: 'Operação não permitida.' });
  }
}

module.exports = new PublicUserController();
