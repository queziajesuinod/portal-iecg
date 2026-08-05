// Tradução dos ReturnCode da Cielo para uma descrição literal em português.
// Usada no histórico de transações para explicar o motivo de uma negativa.
// Fonte: tabela ABECS + "Outros Códigos" da Cielo
// (https://docs.cielo.com.br/ecommerce-cielo/page/abecs).
// Onde um código tem significados diferentes por bandeira, adotamos a
// interpretação mais comum/generica; a ReturnMessage original da Cielo continua
// como fallback quando o código não está mapeado.
/** @type {Record<string, string>} */
const CIELO_RETURN_CODE_MESSAGES = {
  '00': 'Transação autorizada com sucesso',
  '002': 'Credenciais inválidas',
  '003': 'Transação inexistente',
  '01': 'Não autorizada. Entre em contato com o emissor do cartão',
  '02': 'Não autorizada (transação referida pelo emissor)',
  '03': 'Comerciante inválido',
  '04': 'Não autorizada. Cartão retido pelo emissor',
  '05': 'Não autorizada pelo emissor do cartão',
  '06': 'Erro no cartão. Consultar o emissor',
  '07': 'Fraude confirmada. Cartão retido pelo emissor',
  '09': 'Cancelamento parcial efetuado com sucesso',
  11: 'Transação autorizada com sucesso',
  12: 'Transação inválida',
  13: 'Valor da transação inválido',
  14: 'Número do cartão inválido',
  15: 'Emissor do cartão não localizado (BIN incorreto)',
  19: 'Refaça a transação (problema no adquirente)',
  21: 'Cancelamento não efetuado',
  22: 'Parcelamento inválido',
  23: 'Valor da parcela inválido',
  24: 'Quantidade de parcelas inválida',
  30: 'Erro no formato da mensagem',
  38: 'Excedidas as tentativas de senha',
  39: 'Transação de crédito não permitida',
  41: 'Cartão perdido. Cartão retido pelo emissor',
  43: 'Cartão roubado. Cartão retido pelo emissor',
  46: 'Conta encerrada',
  51: 'Saldo ou limite insuficiente',
  52: 'Conta corrente inválida',
  53: 'Conta poupança inválida',
  54: 'Cartão vencido ou data de expiração inválida',
  55: 'Senha inválida',
  56: 'Cartão não pertence ao emissor',
  57: 'Transação não permitida para o cartão',
  58: 'Transação não permitida para o estabelecimento',
  59: 'Suspeita de fraude',
  60: 'Transação não autorizada',
  61: 'Valor excede o limite permitido',
  62: 'Cartão bloqueado ou com restrição',
  63: 'Violação de segurança',
  64: 'Valor da transação inválido',
  65: 'Quantidade de transações excedida',
  66: 'Não cumprimento das leis anti-lavagem de dinheiro',
  67: 'Cartão bloqueado para compras hoje',
  70: 'Limite excedido ou sem saldo',
  72: 'Cancelamento não efetuado',
  73: 'Saque não disponível',
  74: 'Senha vencida',
  75: 'Excedidas as tentativas de senha',
  76: 'Conta destino inválida ou reversão inválida',
  77: 'Dados do cartão inconsistentes',
  78: 'Cartão novo sem desbloqueio pelo portador',
  79: 'Transação não permitida para o cartão',
  80: 'Divergência na data de transação/pagamento',
  81: 'Bloqueio de função para o portador',
  82: 'Cartão inválido (erro no criptograma ou CVV)',
  83: 'Senha vencida ou suspeita de fraude',
  85: 'Falha na operação',
  86: 'Senha inválida',
  88: 'Senha vencida',
  89: 'Erro na transação',
  90: 'Falha na operação',
  91: 'Emissor do cartão temporariamente fora do ar',
  92: 'Emissor do cartão não localizado',
  93: 'Transação negada por infração de lei',
  94: 'Transação duplicada',
  96: 'Falha do sistema',
  97: 'Valor não permitido para essa transação',
  98: 'Sistema ou comunicação indisponível',
  99: 'Emissor temporariamente indisponível',
  100: 'Não autorizada (genérica)',
  101: 'Cartão vencido ou data de expiração inválida',
  102: 'Suspeita de fraude',
  106: 'Excedidas as tentativas de senha',
  109: 'Comerciante inválido',
  110: 'Valor da transação inválido',
  115: 'Erro no cartão',
  116: 'Saldo ou limite insuficiente',
  117: 'Senha inválida',
  121: 'Saldo ou limite insuficiente',
  122: 'Número do cartão não pertence ao emissor',
  180: 'Senha vencida',
  181: 'Erro no formato da mensagem',
  200: 'Transação não permitida para o cartão',
  475: 'Tempo de cancelamento excedido (timeout)',
  911: 'Falha do sistema',
  912: 'Emissor do cartão fora do ar',
  999: 'Sistema ou comunicação indisponível',
  '5C': 'Transação não suportada ou bloqueada pelo emissor',
  '6P': 'Falha na validação de identidade',
  AA: 'Tempo de resposta excedido',
  AB: 'Função incorreta (débito)',
  AC: 'Função incorreta (crédito)',
  AF: 'Falha na operação',
  AG: 'Falha na operação',
  AH: 'Cartão de crédito usado como débito',
  AI: 'Autenticação não realizada',
  AJ: 'Transação de crédito ou débito inválida',
  AV: 'Dados inválidos',
  BD: 'Falha na operação',
  BL: 'Limite diário excedido',
  BM: 'Cartão inválido',
  BN: 'Cartão ou conta bloqueado',
  BO: 'Falha na operação',
  BP: 'Conta corrente inexistente',
  BP171: 'Rejeitada por risco de fraude',
  BP176: 'Transação não permitida',
  BP900: 'Falha na operação',
  BP901: 'Falha na operação',
  BP902: 'Aguarde a resposta da operação anterior',
  BP903: 'Falha no cancelamento',
  BP904: 'Falha na consulta',
  BR: 'Conta encerrada',
  C1: 'Cartão não pode processar transações de débito',
  C2: 'Transação não permitida',
  C3: 'Período inválido para este tipo de transação',
  CF: 'Falha na validação dos dados',
  CG: 'Falha na validação dos dados',
  DF: 'Falha no cartão ou cartão inválido',
  DM: 'Limite excedido ou sem saldo',
  DQ: 'Falha na validação dos dados',
  DS: 'Transação não permitida para o cartão',
  EB: 'Número de parcelas maior que o permitido',
  EE: 'Valor da parcela inferior ao mínimo permitido',
  EK: 'Transação não permitida para o cartão',
  FC: 'Ligue para o emissor do cartão',
  FE: 'Divergência na data de transação/pagamento',
  FF: 'Cancelamento aprovado',
  FG: 'Ligue para a Amex',
  FM: 'Utilizar o chip do cartão',
  GA: 'Aguarde contato com o emissor',
  GD: 'Transação não permitida',
  GF: 'Transação negada',
  GK: 'Bloqueio temporário por ataque de força bruta',
  GT: 'Ataque de força bruta',
  HJ: 'Código da operação inválido',
  IA: 'Indicador da operação inválido',
  KA: 'Falha na validação dos dados',
  KB: 'Opção selecionada incorreta',
  KE: 'Falha na validação dos dados',
  N0: 'Forçar STIP',
  N3: 'Saque não disponível',
  N4: 'Valor excede o limite permitido',
  N7: 'Violação de segurança',
  N8: 'Divergência de valor na pré-autorização',
  NR: 'Transação não permitida',
  B1: 'Surcharge (tarifa adicional) não suportado',
  B2: 'Surcharge (tarifa adicional) não suportado pela rede de débito',
  R0: 'Suspensão de pagamento recorrente para um serviço',
  R1: 'Suspensão de pagamento recorrente para todos os serviços',
  R2: 'Transação não qualificada para recorrência',
  R3: 'Suspensão de todas as ordens de autorização recorrente',
  P5: 'Troca de senha ou desbloqueio',
  P6: 'Nova senha não aceita',
  RP: 'Transação não permitida',
  SC: 'Transação não permitida',
  U3: 'Falha na validação dos dados'
};

/**
 * Normaliza o código para a chave usada na tabela: string maiúscula, sem
 * espaços, e com zero à esquerda em códigos numéricos de 1 dígito ("5" -> "05").
 */
function normalizarCodigo(returnCode) {
  if (returnCode === null || returnCode === undefined) {
    return null;
  }
  const raw = String(returnCode).trim().toUpperCase();
  if (!raw) {
    return null;
  }
  if (/^\d$/.test(raw)) {
    return `0${raw}`;
  }
  return raw;
}

/**
 * Retorna a descrição literal de um ReturnCode da Cielo.
 * Se o código não estiver mapeado, cai na mensagem original da Cielo
 * (fallbackMessage) e, por fim, em null.
 */
export function getCieloReturnCodeMessage(returnCode, fallbackMessage = null) {
  const key = normalizarCodigo(returnCode);
  const traducao = key ? CIELO_RETURN_CODE_MESSAGES[key] : null;
  if (traducao) {
    return traducao;
  }
  if (fallbackMessage && String(fallbackMessage).trim()) {
    return String(fallbackMessage).trim();
  }
  return null;
}

export { CIELO_RETURN_CODE_MESSAGES };
