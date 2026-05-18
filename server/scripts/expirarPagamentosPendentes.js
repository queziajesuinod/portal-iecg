/* eslint-disable no-console */
const { Op } = require('sequelize');
const {
  sequelize,
  Registration,
  RegistrationPayment
} = require('../models');

const isDryRun = process.argv.includes('--dry-run');
const MINUTOS = parseInt(process.argv.find(a => a.startsWith('--minutos='))?.split('=')[1] || '15', 10);

function calcularStatusDerivado(registration, payments) {
  if (['cancelled', 'refunded'].includes(registration.paymentStatus)) {
    return registration.paymentStatus;
  }

  const precoFinal = Math.max(0, Number(registration.finalPrice || 0));
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalPago = confirmedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remaining = Math.max(0, precoFinal - totalPago);

  const hasPending = payments.some(p => ['pending', 'authorized'].includes(p.status));
  const hasDenied = payments.some(p => p.status === 'denied');
  const hasExpired = payments.some(p => p.status === 'expired');

  if (precoFinal <= 0 || remaining <= 0) return 'confirmed';
  if (hasPending) return totalPago > 0 ? 'partial' : 'pending';
  if (hasDenied && totalPago <= 0) return 'denied';
  if (hasExpired && totalPago <= 0) return 'expired';
  if (totalPago > 0) return 'partial';
  return 'pending';
}

async function run() {
  const limite = new Date(Date.now() - MINUTOS * 60 * 1000);

  console.log(`Buscando pagamentos ONLINE pendentes criados antes de ${limite.toISOString()} (>${MINUTOS} min)...`);

  const pagamentos = await RegistrationPayment.findAll({
    where: {
      status: 'pending',
      channel: 'ONLINE',
      createdAt: { [Op.lt]: limite }
    },
    include: [
      {
        model: Registration,
        as: 'registration',
        attributes: ['id', 'orderCode', 'paymentStatus', 'finalPrice'],
        required: true,
        where: {
          paymentStatus: { [Op.notIn]: ['cancelled', 'refunded'] }
        }
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  const registrationIds = [...new Set(pagamentos.map(p => p.registrationId))];

  console.log(`Pagamentos a expirar: ${pagamentos.length}`);
  console.log(`Inscrições afetadas: ${registrationIds.length}`);

  if (!pagamentos.length) {
    console.log('Nenhum pagamento encontrado. Encerrando.');
    return;
  }

  if (isDryRun) {
    for (const p of pagamentos) {
      console.log(`  [DRY-RUN] ${p.id} | método: ${p.method} | inscrição: ${p.registration.orderCode} | criado: ${p.createdAt.toISOString()}`);
    }
    console.log('Dry-run ativo. Nenhuma alteração aplicada.');
    return;
  }

  let pagamentosExpirados = 0;
  let registracoesAtualizadas = 0;

  for (const pagamento of pagamentos) {
    pagamento.status = 'expired';
    await pagamento.save();
    pagamentosExpirados += 1;
    console.log(`  Expirado: ${pagamento.id} | ${pagamento.method} | inscrição: ${pagamento.registration.orderCode}`);
  }

  // Recalcular paymentStatus de cada inscrição afetada
  for (const registrationId of registrationIds) {
    const registration = await Registration.findByPk(registrationId, {
      attributes: ['id', 'orderCode', 'paymentStatus', 'finalPrice']
    });
    if (!registration) continue;

    const todosOsPagamentos = await RegistrationPayment.findAll({
      where: { registrationId },
      attributes: ['status', 'amount', 'taxa']
    });

    const novoStatus = calcularStatusDerivado(registration, todosOsPagamentos);

    if (novoStatus !== registration.paymentStatus) {
      console.log(`  Inscrição ${registration.orderCode}: ${registration.paymentStatus} → ${novoStatus}`);
      registration.paymentStatus = novoStatus;
      await registration.save();
      registracoesAtualizadas += 1;
    }
  }

  console.log('\nConcluído:');
  console.log(`  Pagamentos expirados : ${pagamentosExpirados}`);
  console.log(`  Inscrições atualizadas: ${registracoesAtualizadas}`);
}

run()
  .catch((error) => {
    console.error('Erro ao expirar pagamentos pendentes:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
