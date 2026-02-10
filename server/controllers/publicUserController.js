const { getUserWithSpouse, updateUser, findUserWithSpouseByContact } = require('../services/users');

const buildLeaderResponse = ({ user, spouse }) => ({
  leader: {
    id: user.id,
    name: user.name,
    email: user.email,
    telefone: user.telefone,
    image: user.image,
    username: user.username,
    perfilId: user.perfilId,
    data_nascimento: user.data_nascimento,
    cpf: user.cpf,
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
        cpf: spouse.cpf,
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
    const allowedFields = ['endereco', 'bairro', 'numero', 'cep', 'telefone', 'escolaridade', 'nome_esposo'];
    const payload = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    });

    if (!Object.keys(payload).length) {
      return res.status(400).json({ message: 'Nenhum campo permitido informado.' });
    }

    try {
      const user = await updateUser(req.params.id, payload);
      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        telefone: user.telefone,
        endereco: user.endereco,
        bairro: user.bairro,
        numero: user.numero,
        cep: user.cep,
        escolaridade: user.escolaridade,
        nome_esposo: user.nome_esposo
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário público:', error);
      const isNotFound = /não encontrado/i.test(error.message);
      return res.status(isNotFound ? 404 : 500).json({
        message: isNotFound ? 'Usuário não encontrado' : 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new PublicUserController();
