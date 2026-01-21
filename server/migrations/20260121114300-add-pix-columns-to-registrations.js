'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn({ tableName: 'Registrations', schema: 'dev_iecg' }, 'pixQrCode', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Código PIX copia e cola para pagamento'
    });

    await queryInterface.addColumn({ tableName: 'Registrations', schema: 'dev_iecg' }, 'pixQrCodeBase64', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'QR Code PIX em formato base64 para exibição'
    });

    console.log('✅ Colunas PIX adicionadas à tabela Registrations');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn({ tableName: 'Registrations', schema: 'dev_iecg' }, 'pixQrCode');
    await queryInterface.removeColumn({ tableName: 'Registrations', schema: 'dev_iecg' }, 'pixQrCodeBase64');
    console.log('✅ Colunas PIX removidas da tabela Registrations');
  }
};
