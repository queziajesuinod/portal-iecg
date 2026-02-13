'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    console.log('🚀 Iniciando migração de Users para Members...');
    
    // Função auxiliar para determinar status do membro
    const determineStatus = (user) => {
      if (user.batizado && user.frequenta_celula) {
        return 'MEMBRO';
      } else if (user.batizado) {
        return 'CONGREGADO';
      } else {
        return 'VISITANTE';
      }
    };
    
    // Função auxiliar para mapear estado civil
    const mapMaritalStatus = (estadoCivil) => {
      const mapping = {
        'SOLTEIRO': 'SOLTEIRO',
        'CASADO': 'CASADO',
        'DIVORCIADO': 'DIVORCIADO',
        'VIUVO': 'VIUVO',
        'UNIAO_ESTAVEL': 'UNIAO_ESTAVEL'
      };
      return mapping[estadoCivil] || null;
    };
    
    // Buscar todos os usuários
    const [users] = await queryInterface.sequelize.query(`
      SELECT * FROM ${schema}."Users"
      ORDER BY "createdAt" ASC
    `);
    
    console.log(`📊 Encontrados ${users.length} usuários para migrar`);
    
    let migratedCount = 0;
    
    // Migrar cada usuário para Member
    for (const user of users) {
      try {
        // Construir observações consolidadas
        const notes = [];
        if (user.profissao) notes.push(`Profissão: ${user.profissao}`);
        if (user.escolaridade) notes.push(`Escolaridade: ${user.escolaridade}`);
        if (user.escolas) notes.push(`Escolas: ${user.escolas}`);
        if (user.is_lider_celula) notes.push('Líder de Célula');
        if (user.encontro) notes.push('Participou do Encontro');
        
        const notesText = notes.length > 0 ? notes.join('\\n') : null;
        
        // Determinar status
        const status = determineStatus(user);
        
        // Inserir Member
        await queryInterface.sequelize.query(`
          INSERT INTO ${schema}."Members" (
            id,
            "userId",
            "fullName",
            email,
            cpf,
            "birthDate",
            "maritalStatus",
            phone,
            whatsapp,
            "zipCode",
            street,
            number,
            neighborhood,
            status,
            "statusChangeDate",
            notes,
            "baptismDate",
            "membershipDate",
            "createdAt",
            "updatedAt"
          ) VALUES (
            gen_random_uuid(),
            :userId,
            :fullName,
            :email,
            :cpf,
            :birthDate,
            :maritalStatus,
            :phone,
            :whatsapp,
            :zipCode,
            :street,
            :number,
            :neighborhood,
            :status,
            :statusChangeDate,
            :notes,
            :baptismDate,
            :membershipDate,
            :createdAt,
            :updatedAt
          )
          RETURNING id
        `, {
          replacements: {
            userId: user.id,
            fullName: user.name || 'Nome não informado',
            email: user.email,
            cpf: user.cpf,
            birthDate: user.data_nascimento,
            maritalStatus: mapMaritalStatus(user.estado_civil),
            phone: user.telefone,
            whatsapp: user.telefone, // Assumir que telefone é WhatsApp
            zipCode: user.cep,
            street: user.endereco,
            number: user.numero,
            neighborhood: user.bairro,
            status: status,
            statusChangeDate: user.createdAt,
            notes: notesText,
            baptismDate: user.batizado ? user.createdAt : null,
            membershipDate: status === 'MEMBRO' ? user.createdAt : null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          type: Sequelize.QueryTypes.INSERT
        });
        
        migratedCount++;
        
        if (migratedCount % 100 === 0) {
          console.log(`✅ Migrados ${migratedCount}/${users.length} usuários...`);
        }
      } catch (error) {
        console.error(`❌ Erro ao migrar usuário ${user.id} (${user.name}):`, error.message);
      }
    }
    
    console.log(`✅ Migração concluída: ${migratedCount}/${users.length} usuários migrados com sucesso`);
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev_iecg';
    
    console.log('🔄 Revertendo migração de Members...');
    
    // Deletar todos os Members que foram criados pela migração
    await queryInterface.sequelize.query(`
      DELETE FROM ${schema}."Members"
      WHERE "userId" IS NOT NULL
    `);
    
    console.log('✅ Migração revertida com sucesso');
  }
};
