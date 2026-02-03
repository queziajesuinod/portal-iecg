require('dotenv').config();
const crypto = require('crypto');
const uuid = require('uuid');
const {
  Permissao, Perfil, User, sequelize
} = require('../models');

const PERMISSOES = [
  { nome: 'MIA_LISTAR', descricao: 'Listar registros do MIA' },
  { nome: 'MIA_CADASTRAR', descricao: 'Cadastrar registros do MIA' },
  { nome: 'CELULA_LISTAR', descricao: 'Listar celulas' },
  { nome: 'CELULA_CADASTRAR', descricao: 'Cadastrar celulas' },
  { nome: 'EVENTOS_LISTAR', descricao: 'Acessar o módulo de eventos (listagem)' },
  { nome: 'EVENTS_ACESS', descricao: 'Acessar o módulo de eventos (API)' },
  { nome: 'ADMIN_PERFIS', descricao: 'Gerenciar perfis e permissoes' },
  { nome: 'ADMIN_USUARIOS', descricao: 'Cadastrar usuarios' },
  { nome: 'ADMIN_FULL_ACCESS', descricao: 'Acesso total ao menu e rotas' },
];

const ADMIN_PERFIL_DESCRICAO = 'Administrador';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@iecg.com';
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

async function run() {
  try {
    await sequelize.authenticate();

    // Cria permissoes basicas
    const permissoes = [];
    for (const perm of PERMISSOES) {
      const [p] = await Permissao.findOrCreate({
        where: { nome: perm.nome },
        defaults: { id: uuid.v4(), ...perm },
      });
      permissoes.push(p);
    }

    // Cria perfil admin
    const [perfil] = await Perfil.findOrCreate({
      where: { descricao: ADMIN_PERFIL_DESCRICAO },
      defaults: { id: uuid.v4(), descricao: ADMIN_PERFIL_DESCRICAO },
    });
    await perfil.setPermissoes(permissoes);

    // Cria usuario admin
    const existingUser = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (!existingUser) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashSHA256WithSalt(ADMIN_PASSWORD, salt);
      await User.create({
        id: uuid.v4(),
        name: 'Administrador',
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        salt,
        passwordHash,
        perfilId: perfil.id,
        active: true,
      });
      console.log(`Usuario admin criado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      console.log(`Usuario admin ja existe: ${ADMIN_EMAIL}`);
    }

    console.log('Seed concluido com sucesso.');
  } catch (err) {
    console.error('Erro ao executar seed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
