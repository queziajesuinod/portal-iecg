const { Registration } = require('../models');

/**
 * Gera código único de pedido
 * Formato: REG-YYYYMMDD-XXXXXX
 * Exemplo: REG-20260121-A3B5C7
 */
function gerarCodigoBase() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Gerar 6 caracteres alfanuméricos aleatórios
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let uniqueId = '';
  for (let i = 0; i < 6; i += 1) {
    uniqueId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `REG-${year}${month}${day}-${uniqueId}`;
}

/**
 * Gera código único garantindo que não existe no banco
 */
async function gerarCodigoUnico() {
  let tentativas = 0;
  const maxTentativas = 10;
  
  while (tentativas < maxTentativas) {
    const codigo = gerarCodigoBase();
    
    // Verificar se código já existe
    // eslint-disable-next-line no-await-in-loop
    const existe = await Registration.findOne({
      where: { orderCode: codigo }
    });
    
    if (!existe) {
      return codigo;
    }
    
    tentativas += 1;
  }
  
  throw new Error('Não foi possível gerar código único após múltiplas tentativas');
}

/**
 * Valida formato do código de pedido
 */
function validarFormato(codigo) {
  const pattern = /^REG-\d{8}-[A-Z0-9]{6}$/;
  return pattern.test(codigo);
}

module.exports = {
  gerarCodigoUnico,
  validarFormato
};
