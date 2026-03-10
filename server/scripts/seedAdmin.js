require('dotenv').config();
const crypto = require('crypto');
const uuid = require('uuid');
const {
  Permissao, Perfil, User, BoardJournal, BoardJournalMember, sequelize
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
  { nome: 'DIARIO_BORDO_ADMIN', descricao: 'Gerenciar o modulo Diario de Bordo' },
  { nome: 'DIARIO_BORDO_MANAGER', descricao: 'Gerenciar o diario atribuido como gestor' },
  { nome: 'ADMIN_FULL_ACCESS', descricao: 'Acesso total ao menu e rotas' },
];

const ADMIN_PERFIL_DESCRICAO = 'Administrador';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@iecg.com';
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const DEFAULT_JOURNAL_NAME = process.env.SEED_BOARD_JOURNAL_NAME || 'Diario Principal';
const DEFAULT_JOURNAL_DESCRIPTION = process.env.SEED_BOARD_JOURNAL_DESCRIPTION
  || 'Diario de Bordo padrao para iniciar desafios, badges e rankings.';
const DEFAULT_JOURNAL_INSTRUCTIONS = process.env.SEED_BOARD_JOURNAL_INSTRUCTIONS
  || 'Leia as instrucoes do diario, solicite entrada quando necessario e conclua os desafios aprovados pela gestao.';
const DEFAULT_JOURNAL_COVER = process.env.SEED_BOARD_JOURNAL_COVER || null;

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
    let adminUser = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (!adminUser) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashSHA256WithSalt(ADMIN_PASSWORD, salt);
      adminUser = await User.create({
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

    const [journal, createdJournal] = await BoardJournal.findOrCreate({
      where: { name: DEFAULT_JOURNAL_NAME },
      defaults: {
        id: uuid.v4(),
        name: DEFAULT_JOURNAL_NAME,
        description: DEFAULT_JOURNAL_DESCRIPTION,
        instructions: DEFAULT_JOURNAL_INSTRUCTIONS,
        coverImageUrl: DEFAULT_JOURNAL_COVER,
        isActive: true,
        createdBy: adminUser.id
      }
    });

    if (createdJournal) {
      console.log(`Diario padrao criado: ${journal.name}`);
    } else {
      console.log(`Diario padrao ja existe: ${journal.name}`);
    }

    const [membership, createdMembership] = await BoardJournalMember.findOrCreate({
      where: { journalId: journal.id, userId: adminUser.id },
      defaults: {
        id: uuid.v4(),
        journalId: journal.id,
        userId: adminUser.id,
        status: 'approved',
        requestedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: adminUser.id,
        note: 'Criador/admin do diario padrao'
      }
    });

    if (!createdMembership && membership.status !== 'approved') {
      await membership.update({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: adminUser.id,
        note: 'Admin aprovado automaticamente no diario padrao'
      });
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

