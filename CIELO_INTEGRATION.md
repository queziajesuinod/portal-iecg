# Integração Cielo - Guia de Configuração

## 📋 Pré-requisitos

1. Conta ativa na Cielo
2. Credenciais de API (MerchantId e MerchantKey)
3. Acesso ao painel da Cielo

## 🔑 Obtendo Credenciais

### Ambiente Sandbox (Testes)

1. Acesse: https://cadastrosandbox.cieloecommerce.cielo.com.br/
2. Crie uma conta de testes
3. Anote suas credenciais:
   - **MerchantId**: Identificador único da loja
   - **MerchantKey**: Chave de acesso à API

### Ambiente Produção

1. Acesse: https://www.cielo.com.br/
2. Entre em contato com o comercial
3. Após aprovação, obtenha as credenciais de produção

## ⚙️ Configuração no Projeto

### 1. Adicionar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env`:

```env
CIELO_MERCHANT_ID=seu_merchant_id_aqui
CIELO_MERCHANT_KEY=sua_merchant_key_aqui
CIELO_ENVIRONMENT=sandbox
```

**Valores de `CIELO_ENVIRONMENT`:**
- `sandbox`: Para testes (padrão)
- `production`: Para ambiente de produção

### 2. Reiniciar o Servidor

Após configurar as variáveis, reinicie o servidor:

```bash
npm start
```

## 💳 Métodos de Pagamento Suportados

### 1. Cartão de Crédito

- ✅ Parcelamento (até 12x)
- ✅ Juros configuráveis (percentual ou fixo)
- ✅ Autorização e captura automática
- ✅ Suporte a múltiplas bandeiras (Visa, Master, Elo, Amex, etc.)

### 2. PIX

- ✅ Geração de QR Code
- ✅ Pagamento instantâneo
- ✅ Notificação automática via webhook

### 3. Boleto (Em desenvolvimento)

- ⏳ Geração de boleto bancário
- ⏳ Vencimento configurável

## 🧪 Cartões de Teste (Sandbox)

Use estes cartões para testar no ambiente sandbox:

| Bandeira | Número | CVV | Validade | Resultado |
|----------|--------|-----|----------|-----------|
| Visa | 4024 0071 5376 3191 | 123 | 12/2030 | Autorizado |
| Master | 5404 4348 7889 9123 | 123 | 12/2030 | Autorizado |
| Elo | 6362 9704 9000 0016 | 123 | 12/2030 | Autorizado |

## 📊 Status de Pagamento

| Código | Status | Descrição |
|--------|--------|-----------|
| 0 | NotFinished | Pagamento não finalizado |
| 1 | Authorized | Pagamento autorizado |
| 2 | PaymentConfirmed | Pagamento confirmado |
| 3 | Denied | Pagamento negado |
| 10 | Voided | Pagamento cancelado |
| 11 | Refunded | Pagamento estornado |
| 12 | Pending | Aguardando retorno |
| 13 | Aborted | Pagamento abortado |

## 🔔 Webhook (Notificações)

### O que é?

O webhook permite que a Cielo notifique automaticamente seu servidor quando o status de um pagamento mudar. Isso é **essencial para PIX**, pois o pagamento é confirmado após o cliente pagar.

### Configuração

#### 1. Endpoint já implementado

O endpoint `POST /api/webhooks/cielo` já está implementado e pronto para uso.

**URL do webhook:**
```
https://seu-dominio.com/api/webhooks/cielo
```

#### 2. Configurar no Painel Cielo

1. Acesse o painel da Cielo (sandbox ou produção)
2. Vá em **Configurações** → **Webhook/Notificações**
3. Adicione a URL do webhook:
   - **Sandbox**: `https://seu-dominio.com/api/webhooks/cielo`
   - **Produção**: `https://seu-dominio.com/api/webhooks/cielo`
4. Selecione os eventos:
   - ☑️ Mudança de status de pagamento
   - ☑️ Pagamento confirmado
   - ☑️ Pagamento cancelado
5. Salve as configurações

#### 3. Testar Webhook

Após configurar, teste fazendo um pagamento PIX:

1. Crie uma inscrição com PIX
2. Pague o PIX (em sandbox, simule o pagamento)
3. Verifique os logs do servidor:
   ```
   🔔 [WEBHOOK CIELO] Notificação recebida
   📝 [WEBHOOK CIELO] Inscrição encontrada: ABC123
   ✅ [WEBHOOK CIELO] Status atualizado: pending → confirmed
   ```
4. O status da inscrição deve mudar automaticamente

### Como Funciona

1. **Cliente paga PIX** → Cielo detecta pagamento
2. **Cielo envia webhook** → `POST /api/webhooks/cielo`
3. **Servidor recebe** → Busca inscrição pelo `PaymentId`
4. **Consulta Cielo** → Confirma status atual
5. **Atualiza banco** → Muda `paymentStatus` para `confirmed`
6. **Frontend atualiza** → Polling detecta mudança
7. **Usuário é notificado** → "Pagamento confirmado!"

### Logs do Webhook

O webhook gera logs detalhados para facilitar debug:

```
🔔 [WEBHOOK CIELO] Notificação recebida: { PaymentId: "...", ChangeType: 1 }
📝 [WEBHOOK CIELO] Inscrição encontrada: ABC123
📊 [WEBHOOK CIELO] Status atual: pending
🔄 [WEBHOOK CIELO] Tipo de mudança: 1
✅ [WEBHOOK CIELO] Status na Cielo: 2
🔄 [WEBHOOK CIELO] Novo status mapeado: confirmed
✅ [WEBHOOK CIELO] Status atualizado: pending → confirmed
📧 [WEBHOOK CIELO] Transação registrada
```

### Segurança

- O webhook **NÃO requer autenticação** (Cielo não envia token)
- Validação feita consultando a Cielo diretamente
- Apenas atualiza status se confirmar com a API Cielo
- Logs detalhados para auditoria

## 📖 Documentação Oficial

- **API Reference**: https://developercielo.github.io/manual/cielo-ecommerce
- **Sandbox**: https://cadastrosandbox.cieloecommerce.cielo.com.br/
- **Suporte**: https://www.cielo.com.br/atendimento/

## 🚨 Troubleshooting

### Erro: "Credenciais Cielo não configuradas"

**Solução**: Verifique se as variáveis `CIELO_MERCHANT_ID` e `CIELO_MERCHANT_KEY` estão definidas no `.env`

### Erro: "Payment denied" (código 3)

**Possíveis causas**:
- Cartão inválido ou expirado
- Saldo insuficiente (em produção)
- Dados incorretos (CVV, validade)

### PIX não gera QR Code

**Solução**: 
- Verifique se está usando o ambiente correto (sandbox ou production)
- Confirme que o PIX está habilitado na sua conta Cielo

## 📞 Suporte

Para dúvidas sobre a integração Cielo:
- Email: cieloecommerce@cielo.com.br
- Telefone: 4002-5472 (capitais e regiões metropolitanas)
- Telefone: 0800 570 8472 (demais localidades)
