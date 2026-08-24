const { sign } = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const dotenv = require('dotenv');
const fs = require('fs');
const { User, Perfil } = require('../models');
const { buildPermissionInclude, extractPermissionNames } = require('./permissionResolver');
const { verifyPassword, hashPassword, needsRehash } = require('./passwordService');
const { sendPasswordResetEmail } = require('./userAccountEmailService');
const env = dotenv.parse(fs.readFileSync('.env'));

// Gera senha temporária legível (sem caracteres ambíguos: O/0/I/l/1).
function gerarSenhaTemporaria(tamanho = 10) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < tamanho; i += 1) {
    senha += alfabeto[crypto.randomInt(0, alfabeto.length)];
  }
  return senha;
}

class AuthService {
  async login(dto) {
    // Buscar usuário pelo e-mail
    const usuario = await User.findOne({
      attributes: ['id', 'name', 'username', 'passwordHash', 'salt', 'perfilId'],
      where: { email: dto.email },
      include: [
        ...buildPermissionInclude(),
        {
          model: Perfil,
          as: 'perfis',
          attributes: ['descricao'],
          through: { attributes: [] },
          required: false
        }
      ]
    });

    if (!usuario) {
      throw new Error('Usuário não cadastrado');
    }

    if (!dto?.password || typeof dto.password !== 'string') {
      throw new Error('Senha invalida');
    }

    if (!usuario.passwordHash) {
      throw new Error('Usuario sem senha configurada. Atualize a senha no admin.');
    }

    // Verifica a senha (suporta bcrypt e o legado SHA-256+salt)
    const senhaValida = await verifyPassword(dto.password, {
      passwordHash: usuario.passwordHash,
      salt: usuario.salt
    });
    if (!senhaValida) {
      throw new Error('Usuário ou senha inválido');
    }

    // Migração transparente: se a senha ainda estava no formato legado, re-hash para bcrypt.
    if (needsRehash(usuario.passwordHash)) {
      try {
        const novoHash = await hashPassword(dto.password);
        await User.update({ passwordHash: novoHash }, { where: { id: usuario.id } });
      } catch (rehashErr) {
        console.warn('[auth] Falha ao migrar senha para bcrypt (login não bloqueado):', rehashErr.message);
      }
    }

    // Coletar todas as descrições de perfis (legado + many-to-many, sem duplicatas)
    const perfisDescricoes = Array.from(new Set([
      ...(usuario.Perfil?.descricao ? [usuario.Perfil.descricao] : []),
      ...(usuario.perfis?.map((p) => p.descricao).filter(Boolean) || [])
    ]));

    // Gerar token com userId e lista de perfis
    const accessToken = sign(
      {
        userId: usuario.id,
        perfis: perfisDescricoes,
        email: dto.email,
        username: usuario.username,
        nome: usuario.name
      },
      env.JWT_SECRET,
      { expiresIn: '60m' }
    );

    const permissoesNomes = extractPermissionNames(usuario);

    return { accessToken, permissoes: permissoesNomes };
  }

  /**
   * Fluxo "Esqueci a senha": recebe um e-mail, gera uma senha temporária,
   * grava em bcrypt e envia por e-mail. Retorna SEMPRE uma mensagem genérica
   * (não revela se o e-mail existe) para evitar enumeração de contas.
   */
  async forgotPassword(emailRaw) {
    const email = String(emailRaw || '').trim().toLowerCase();
    const resultadoGenerico = {
      message: 'Se o e-mail estiver cadastrado, enviaremos uma nova senha em instantes.'
    };
    if (!email) {
      return resultadoGenerico;
    }

    const usuario = await User.findOne({
      attributes: ['id', 'name', 'email', 'username', 'telefone'],
      where: { email: { [Op.iLike]: email } }
    });
    if (!usuario || !usuario.email) {
      return resultadoGenerico;
    }

    const novaSenha = gerarSenhaTemporaria();
    const passwordHash = await hashPassword(novaSenha);
    await User.update({ passwordHash }, { where: { id: usuario.id } });

    // Envio não bloqueia a resposta genérica; sendPasswordResetEmail nunca lança.
    const envio = await sendPasswordResetEmail(
      {
        name: usuario.name,
        email: usuario.email,
        username: usuario.username,
        telefone: usuario.telefone
      },
      novaSenha
    );

    if (envio && envio.sent) {
      console.log(`[forgotPassword] Nova senha enviada para userId=${usuario.id} (${usuario.email}) — messageId=${envio.messageId}`);
    } else {
      console.error(`[forgotPassword] Senha redefinida para userId=${usuario.id} (${usuario.email}) mas o e-mail NÃO foi enviado — motivo=${envio && envio.reason}${envio && envio.error ? ` erro=${envio.error}` : ''}`);
    }

    return resultadoGenerico;
  }
}

module.exports = AuthService;
