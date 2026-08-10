/**
 * Diagnóstico da Evolution API (WhatsApp).
 *
 * Verifica a conexão de cada instância configurada e, opcionalmente, envia uma
 * mensagem de teste — útil para descobrir por que uma notificação não está saindo
 * (ex.: instância desconectada).
 *
 * Uso:
 *   node server/scripts/checkEvolution.js
 *       → lista o status de conexão de todas as instâncias.
 *
 *   node server/scripts/checkEvolution.js 5567999998888
 *       → também envia uma mensagem de teste pela instância padrão.
 *
 *   node server/scripts/checkEvolution.js 5567999998888 START_IECG
 *       → envia o teste por uma instância específica.
 */
require('dotenv').config();

const evolutionApiService = require('../services/evolutionApiService');

function mascarar(valor) {
  if (!valor) return '(não definido)';
  const s = String(valor);
  if (s.length <= 6) return '***';
  return `${s.slice(0, 3)}***${s.slice(-2)}`;
}

// Extrai todas as instâncias reais dos pools (chave:inst1,inst2;...).
function instanciasDosPools(raw) {
  const instancias = new Set();
  if (!raw) return instancias;
  raw.split(';').forEach((entry) => {
    const idx = entry.indexOf(':');
    if (idx === -1) return;
    entry.slice(idx + 1).split(',').map((s) => s.trim()).filter(Boolean)
      .forEach((i) => instancias.add(i));
  });
  return instancias;
}

async function main() {
  const url = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'iecg-events';
  const pools = process.env.EVOLUTION_INSTANCE_POOLS || '';

  console.log('=== Configuração Evolution API ===');
  console.log('URL:              ', url);
  console.log('API Key:          ', mascarar(process.env.EVOLUTION_API_KEY));
  console.log('Instância padrão: ', instanceName);
  console.log('Pools:            ', pools || '(nenhum)');
  console.log('');

  const instancias = new Set([instanceName, ...instanciasDosPools(pools)]);

  console.log('=== Status de conexão por instância ===');
  const resultados = [];
  for (const instancia of instancias) {
    // eslint-disable-next-line no-await-in-loop
    const status = await evolutionApiService.verificarStatus(instancia);
    resultados.push(status);
    const marca = status.conectado ? '✅ CONECTADA' : '❌ DESCONECTADA';
    const detalhe = status.conectado
      ? `estado=${status.estado}`
      : `estado=${status.estado || '-'} erro=${status.erro || '-'}${status.httpStatus ? ` http=${status.httpStatus}` : ''}`;
    console.log(`  ${instancia.padEnd(14)} ${marca}  (${detalhe})`);
  }
  console.log('');

  const conectadas = resultados.filter((r) => r.conectado).map((r) => r.instancia);
  if (conectadas.length === 0) {
    console.log('⚠️  Nenhuma instância conectada. Reconecte no painel da Evolution (leia o QR Code).');
  } else {
    console.log(`Instâncias conectadas: ${conectadas.join(', ')}`);
  }

  // Envio de teste (opcional)
  const telefone = process.argv[2];
  const instanciaTeste = process.argv[3] || instanceName;
  if (telefone) {
    console.log('');
    console.log(`=== Enviando mensagem de teste para ${telefone} via "${instanciaTeste}" ===`);
    const envio = await evolutionApiService.enviarMensagemTexto(
      telefone,
      '✅ Teste de conexão do Portal IECG com a Evolution API. Se você recebeu isto, o WhatsApp está funcionando.',
      instanciaTeste
    );
    if (envio.sucesso) {
      console.log(`  ✅ Enviado. externalId=${envio.externalId || '-'}`);
    } else {
      console.log(`  ❌ Falha: ${envio.erro}`);
    }
  } else {
    console.log('');
    console.log('Dica: passe um número para testar o envio, ex.: node server/scripts/checkEvolution.js 5567999998888');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro no diagnóstico:', err.message);
    process.exit(1);
  });
