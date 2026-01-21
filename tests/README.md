# 🧪 Testes E2E - Sistema de Inscrições

## 📋 Visão Geral

Este diretório contém scripts de teste automatizados para validar o fluxo completo do sistema de inscrições com pagamento.

## 🚀 Scripts Disponíveis

### `e2e-payment-flow.js`

Teste de ponta a ponta do fluxo completo de pagamento PIX, incluindo:

1. ✅ Criação de evento
2. ✅ Criação de lote
3. ✅ Configuração de forma de pagamento PIX
4. ✅ Criação de inscrição
5. ✅ Consulta de dados da inscrição
6. ✅ Simulação de webhook Cielo
7. ✅ Verificação de atualização de status

## 🔧 Pré-requisitos

### 1. Instalar Dependências

```bash
cd /home/ubuntu/portal-iecg
npm install chalk
```

### 2. Obter Token de Autenticação Admin

Você precisa de um token JWT válido de administrador.

**Opção A: Login via API**

```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"sua_senha"}'
```

**Opção B: Extrair do navegador**

1. Faça login no painel admin
2. Abra DevTools (F12) → Application → Cookies
3. Copie o valor do cookie `token`

### 3. Configurar Variáveis de Ambiente

```bash
export ADMIN_TOKEN="seu_token_jwt_aqui"
export API_URL="http://localhost:3005"  # Opcional, padrão é localhost:3005
```

## ▶️ Executar Testes

### Teste Completo

```bash
cd /home/ubuntu/portal-iecg
node tests/e2e-payment-flow.js
```

### Com Variáveis Inline

```bash
ADMIN_TOKEN="seu_token" API_URL="http://localhost:3005" node tests/e2e-payment-flow.js
```

## 📊 Saída Esperada

```
🧪 TESTE E2E - FLUXO DE PAGAMENTO PIX

============================================================

📍 Etapa 1: Criando evento de teste
✅ Evento criado com ID: abc123...

📍 Etapa 2: Criando lote do evento
✅ Lote criado com ID: 1

📍 Etapa 3: Configurando forma de pagamento PIX
✅ Forma de pagamento PIX configurada com ID: 1

📍 Etapa 4: Criando inscrição com pagamento PIX
✅ Inscrição criada com código: ABC123
ℹ️  Status inicial: pending

📍 Etapa 5: Consultando dados da inscrição
✅ Dados da inscrição:
{
  orderCode: 'ABC123',
  paymentStatus: 'pending',
  paymentMethod: 'pix',
  finalPrice: '100.00',
  paymentId: 'payment-id-123',
  pixQrCode: '✅ Gerado'
}

📍 Etapa 6: Simulando webhook da Cielo
ℹ️  Payload do webhook:
{
  "PaymentId": "payment-id-123",
  "ChangeType": 1,
  "MerchantOrderId": "ABC123"
}
✅ Webhook processado com sucesso!
{
  success: true,
  message: 'Webhook processado com sucesso',
  orderCode: 'ABC123',
  status: 'confirmed'
}

📍 Etapa 7: Verificando atualização de status
ℹ️  Status atual: confirmed
✅ Status atualizado corretamente para "confirmed"!

📍 Etapa 8: Limpando dados de teste (opcional)
✅ Evento desativado

============================================================

📊 RELATÓRIO FINAL

Total de etapas: 7
✅ Passou: 7
❌ Falhou: 0

🎉 TODOS OS TESTES PASSARAM!
```

## 🐛 Troubleshooting

### Erro: "ADMIN_TOKEN não configurado"

**Solução:** Configure a variável de ambiente:
```bash
export ADMIN_TOKEN="seu_token_aqui"
```

### Erro: "Erro ao criar evento: Unauthorized"

**Causa:** Token inválido ou expirado

**Solução:** Obtenha um novo token fazendo login novamente

### Erro: "Erro ao processar webhook"

**Possíveis causas:**
- PaymentId não foi gerado (modo mock)
- Credenciais Cielo não configuradas
- Inscrição não encontrada

**Solução:** Verifique os logs do servidor para mais detalhes

### Erro: "Status ainda está pending"

**Causa:** Webhook não atualizou o status

**Possíveis razões:**
1. Credenciais Cielo não configuradas
2. `consultarPagamento` retornou erro
3. Status Cielo não mudou

**Solução:** 
- Configure credenciais Cielo no `.env`
- Verifique logs do servidor
- Execute o webhook manualmente

## 📝 Personalização

### Modificar Dados de Teste

Edite o objeto `testData` no início do script:

```javascript
const testData = {
  event: {
    title: 'Seu Evento Personalizado',
    // ... outros campos
  },
  // ...
};
```

### Adicionar Mais Etapas

```javascript
async function minhaNovaEtapa() {
  log.step(9, 'Minha nova etapa');
  // ... lógica
  return true;
}

// Adicionar ao array de etapas
const etapas = [
  // ... etapas existentes
  minhaNovaEtapa
];
```

## 🔍 Logs Detalhados

Para ver logs mais detalhados do servidor durante o teste:

```bash
# Terminal 1: Servidor com logs
cd /home/ubuntu/portal-iecg
npm start

# Terminal 2: Executar teste
node tests/e2e-payment-flow.js
```

Observe os logs do servidor com emojis:
- 🔔 Webhook recebido
- 📝 Inscrição encontrada
- ✅ Status atualizado

## 📚 Recursos Adicionais

- **Documentação Cielo**: [CIELO_INTEGRATION.md](../CIELO_INTEGRATION.md)
- **API Reference**: Ver rotas em `server/routers/`
- **Models**: Ver estrutura em `server/models/`

## 🤝 Contribuindo

Para adicionar novos testes:

1. Crie um novo arquivo `.js` neste diretório
2. Siga a estrutura do `e2e-payment-flow.js`
3. Use `chalk` para logs coloridos
4. Documente no README

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor
2. Confirme que as credenciais estão corretas
3. Teste manualmente via Postman/Insomnia
4. Abra uma issue no repositório
