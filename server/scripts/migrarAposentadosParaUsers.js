const crypto = require('crypto');
const bcrypt = require('bcryptjs');


const { Aposentado, User, sequelize } = require('../models');

function hashSHA256WithSalt(password, salt) {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}
async function migrarAposentadosParaUsers() {
  const aposentados = await Aposentado.findAll({ where: { userId: null } });

  for (const ap of aposentados) {
    const transaction = await sequelize.transaction();

    try {
      const senhaOriginal = ap.cpf ? ap.cpf : 'senha123';
      
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashSHA256WithSalt(senhaOriginal, salt);
          
      const novoUser = await User.create({
        name: ap.nome,
        salt: salt,
        email: 'teste@iecg.com.br',
        username: ap.cpf || ap.nome.toLowerCase().replace(/\s/g, '_'),
        image: ap.foto || null,
        passwordHash,
        perfilId: '251b1ad9-4a77-47f2-9a2e-b2c978dda534',
        data_nascimento: ap.data_nascimento,
        endereco: ap.endereco,
        telefone: ap.telefones,
        estado_civil: ap.estado_civil,
        nome_esposo: ap.nome_esposo,
        profissao: ap.profissao,
        frequenta_celula: ap.frequenta_celula,
        batizado: ap.batizado,
        encontro: ap.encontro,
        escolas: ap.escolas,
        cpf: ap.cpf

      }, { transaction });

      await ap.update({ userId: novoUser.id }, { transaction });

      await transaction.commit();
      console.log(`✔ Aposentado ${ap.id} → User ${novoUser.id}`);
    } catch (err) {
      await transaction.rollback();
      console.error(`❌ Erro ao migrar aposentado ${ap.id}: ${err.message}`);
    }
  }

  console.log('✅ Migração concluída.');
}

migrarAposentadosParaUsers();
