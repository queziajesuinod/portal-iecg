const { sign } = require('jsonwebtoken');
const { User, Perfil, Permissao } = require('../models');
const crypto = require('crypto');
const dotenv = require('dotenv');
const fs = require('fs');
const env = dotenv.parse(fs.readFileSync('.env'));

class AuthService {
  async login(dto) {
    // Buscar usuário pelo e-mail para obter o salt
    const usuario = await User.findOne({
      attributes: ['id', 'name', 'username', 'passwordHash', 'salt', 'perfilId'],
      where: { email: dto.email },
      include: [{
        model: Perfil,
        include: [{ model: Permissao, as: 'permissoes', through: { attributes: [] } }]
      }]
    });

    if (!usuario) {
      throw new Error('Usuário não cadastrado');
    }

    // Gerar o hash da senha enviada com o salt do usuário
    if (!dto?.password || typeof dto.password !== 'string') {
      throw new Error('Senha invalida');
    }

    if (!usuario.salt || !usuario.passwordHash) {
      throw new Error('Usuario sem senha configurada. Atualize a senha no admin.');
    }

    // Gerar o hash da senha enviada com o salt do usuario
    const hash = hashSHA256WithSalt(dto.password, usuario.salt);

    // Verificar se o hash gerado é igual ao armazenado
    if (hash !== usuario.passwordHash) {
      throw new Error('Usuário ou senha inválido');
    }

    // Gerar token com userId e perfilId
    const accessToken = sign(
      {
        userId: usuario.id,
        perfilId: usuario.perfilId,
        email: dto.email,
        username: usuario.username,
        nome: usuario.name
      },
      env.JWT_SECRET,
      { expiresIn: '60m' }
    );

    const permissoesNomes = usuario.Perfil?.permissoes?.map((p) => p.nome) || [];

    return { accessToken, permissoes: permissoesNomes };
  }
}

// Função para gerar hash SHA256 com salt
function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

module.exports = AuthService;
