# Testes E2E

## `e2e-payment-flow.js`

Teste de ponta a ponta do fluxo Pix, cobrindo:

1. criacao de evento
2. criacao de lote
3. configuracao de forma de pagamento Pix
4. criacao de inscricao
5. consulta da inscricao com `paymentId`, `pixTransactionId` e `pixEndToEndId`
6. simulacao de webhook Cielo
7. verificacao final do status e dos identificadores Pix

## Pre-requisitos

- servidor da aplicacao em execucao
- token admin valido
- banco e credenciais da Cielo configurados
- Pix novo configurado com `CIELO_PIX_PROVIDER=Cielo2`

## Como executar

PowerShell:

```powershell
$env:ADMIN_TOKEN="seu_token"
$env:API_URL="http://localhost:3005"
node tests/e2e-payment-flow.js
```

## O que observar

Na consulta da inscricao e na verificacao final, o teste imprime:

- `paymentId`
- `pixTransactionId`
- `pixEndToEndId`
- status do pagamento

No fluxo novo da Cielo, o pagamento pode permanecer `pending` por algum tempo. O teste aceita esse estado quando os identificadores Pix ja tiverem sido persistidos.

## Troubleshooting

- Se o webhook falhar, verifique os logs do servidor e as credenciais Cielo.
- Se o status continuar `pending` sem `pixTransactionId` nem `pixEndToEndId`, revise a resposta retornada pela Cielo em `providerPayload`.
- Se o teste nao autenticar, gere um novo `ADMIN_TOKEN`.
