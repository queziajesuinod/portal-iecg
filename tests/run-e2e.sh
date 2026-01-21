#!/bin/bash

# Script para executar testes E2E facilmente

echo "🧪 Preparando ambiente de teste..."

# Verificar se o servidor está rodando
if ! curl -s http://localhost:3005/api/health > /dev/null 2>&1; then
    echo "❌ Servidor não está rodando em http://localhost:3005"
    echo "💡 Inicie o servidor primeiro: npm start"
    exit 1
fi

echo "✅ Servidor está rodando"

# Verificar token
if [ -z "$ADMIN_TOKEN" ]; then
    echo ""
    echo "⚠️  ADMIN_TOKEN não configurado!"
    echo ""
    echo "Para obter o token:"
    echo "1. Faça login no painel admin"
    echo "2. Abra DevTools (F12) → Application → Cookies"
    echo "3. Copie o valor do cookie 'token'"
    echo ""
    echo "Depois execute:"
    echo "  export ADMIN_TOKEN=\"seu_token_aqui\""
    echo "  ./tests/run-e2e.sh"
    echo ""
    exit 1
fi

echo "✅ Token configurado"
echo ""

# Executar teste
node tests/e2e-payment-flow.js

# Capturar código de saída
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Testes concluídos com sucesso!"
else
    echo "❌ Testes falharam (código: $EXIT_CODE)"
fi

exit $EXIT_CODE
