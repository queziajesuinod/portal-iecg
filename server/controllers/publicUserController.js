const { getUserWithSpouse, updateUser } = require('../services/users');

class PublicUserController {
  async getLeaderById(req, res) {
    try {
      const result = await getUserWithSpouse(req.params.id);
      if (!result) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      const { user, spouse } = result;
      return res.status(200).json({
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
          estado_civil: user.estado_civil,
          profissao: user.profissao,
          batizado: user.batizado,
          encontro: user.encontro,
          escolas: user.escolas,
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
  } catch (error) {
    console.error('Erro ao buscar líder público:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

  async updateLeaderById(req, res) {
    const allowedFields = ['endereco', 'bairro', 'numero', 'cep', 'telefone'];
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
        cep: user.cep
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
