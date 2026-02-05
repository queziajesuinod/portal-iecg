# Módulo de Check-in e Notificações - Portal IECG

## 🎯 Objetivo

Sistema completo de gerenciamento de check-in e notificações para eventos, permitindo controle de presença e comunicação com participantes via WhatsApp.

---

## ✨ Funcionalidades

### Check-in
- ✅ Check-in manual por staff
- ✅ Check-in automático via QR Code
- ✅ Check-in automático via NFC
- ✅ Gerenciamento de agendamentos (períodos)
- ✅ Gerenciamento de estações (pontos de check-in)
- ✅ Validação de duplicidade
- ✅ Relatórios e estatísticas

### Notificações
- ✅ Envio via WhatsApp (Evolution API)
- ✅ Sistema de templates com variáveis
- ✅ Grupos de destinatários
- ✅ Envio individual e em massa
- ✅ Rastreamento de entrega e leitura
- ✅ Histórico completo

---

## 🚀 Início Rápido

### 1. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o `.env` e configure:

```bash
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_api_key
EVOLUTION_INSTANCE_NAME=iecg-events
FRONTEND_URL=http://localhost:3000
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Executar Migrations

```bash
npx sequelize-cli db:migrate
```

### 4. Iniciar Servidor

```bash
npm start
```

---

## 📖 Documentação

- **[Guia de Implementação](../GUIA_IMPLEMENTACAO.md)** - Guia completo de uso e configuração
- **[Resumo Técnico](../RESUMO_TECNICO.md)** - Arquitetura e detalhes técnicos

---

## 🔌 Endpoints Principais

### Check-in

```
POST   /api/admin/checkin/schedules          # Criar agendamento
GET    /api/admin/checkin/events/:id/stats   # Estatísticas
POST   /api/admin/checkin/manual             # Check-in manual
POST   /api/public/checkin/qrcode            # Check-in via QR Code
```

### Notificações

```
POST   /api/admin/notifications/templates    # Criar template
POST   /api/admin/notifications/send         # Enviar notificação
GET    /api/admin/notifications/events/:id/list  # Histórico
```

---

## 🎨 Interface Administrativa

### Check-in

Acesse: `/eventos/:eventId/checkin`

**Funcionalidades:**
- Check-in manual com busca por código
- Gerenciamento de agendamentos
- Gerenciamento de estações
- Listagem de check-ins com filtros
- Dashboard de estatísticas

### Notificações

Acesse: `/eventos/:eventId/notificacoes`

**Funcionalidades:**
- Envio de notificações
- Gerenciamento de grupos
- Gerenciamento de templates
- Histórico de envios
- Dashboard de estatísticas

---

## 🔧 Configuração da Evolution API

### 1. Instalar Evolution API

Siga a documentação oficial: https://doc.evolution-api.com/

### 2. Criar Instância

```bash
# Via API
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SUA-API-KEY" \
  -d '{"instanceName": "iecg-events"}'
```

### 3. Conectar WhatsApp

```bash
# Obter QR Code
curl http://localhost:8080/instance/connect/iecg-events \
  -H "apikey: SUA-API-KEY"
```

Escaneie o QR Code com o WhatsApp Business.

### 4. Configurar Webhook

Configure o webhook para receber atualizações de status:

```
URL: http://seu-dominio.com/api/webhooks/notifications/evolution
```

---

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas

- `EventCheckInSchedules` - Agendamentos de check-in
- `EventCheckInStations` - Estações/pontos de check-in
- `EventCheckIns` - Registros de check-ins
- `EventNotificationGroups` - Grupos de destinatários
- `EventNotificationGroupMembers` - Membros dos grupos
- `EventNotificationTemplates` - Templates de mensagens
- `EventNotifications` - Histórico de notificações

---

## 🧪 Testes

### Testar Check-in

```bash
# Validar código de inscrição
curl http://localhost:3005/api/public/checkin/validate/REG-20260204-XXXXXX

# Realizar check-in via QR Code
curl -X POST http://localhost:3005/api/public/checkin/qrcode \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": "REG-20260204-XXXXXX",
    "scheduleId": "uuid-agendamento"
  }'
```

### Testar Notificações

```bash
# Criar template
curl -X POST http://localhost:3005/api/admin/notifications/templates \
  -H "Authorization: Bearer SEU-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste",
    "type": "custom",
    "channel": "whatsapp",
    "message": "Olá {{nome}}! Teste de notificação."
  }'

# Enviar notificação
curl -X POST http://localhost:3005/api/admin/notifications/send \
  -H "Authorization: Bearer SEU-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "registrationId": "uuid-inscricao",
    "templateId": "uuid-template",
    "channel": "whatsapp"
  }'
```

---

## 🎯 Casos de Uso

### Exemplo 1: Evento de 2 Dias

**Configuração:**

1. Criar agendamentos:
   - "Dia 1 - Manhã" (08:00 - 12:00)
   - "Dia 1 - Tarde" (13:00 - 18:00)
   - "Dia 2 - Manhã" (08:00 - 12:00)
   - "Dia 2 - Tarde" (13:00 - 18:00)

2. Criar estações:
   - "Entrada Principal"
   - "Entrada VIP"

3. Criar grupos de notificação por agendamento

**Uso:**

- Staff realiza check-in manual no balcão
- Participantes fazem check-in via QR Code
- Sistema adiciona automaticamente aos grupos
- Envio de notificações específicas por período

### Exemplo 2: Notificação de Lembrete

**Template:**

```
Olá {{nome}}! 👋

Lembrete: O evento {{evento}} acontece amanhã!

📅 Data: {{data}} às {{hora}}
📍 Local: {{local}}
🎫 Seu código: {{codigo}}

Não esqueça de fazer o check-in na entrada!

Nos vemos lá! 🎉
```

**Envio:**

- Selecionar grupo "Todos os Inscritos"
- Selecionar template "Lembrete"
- Enviar

---

## 🔒 Segurança

- ✅ Rotas administrativas protegidas com JWT
- ✅ Validação de dados no backend
- ✅ Prevenção de SQL injection (Sequelize ORM)
- ✅ Validação de duplicidade de check-in
- ✅ Logs de auditoria

---

## 📈 Performance

### Otimizações Implementadas

- Índices no banco de dados
- Eager loading de relacionamentos
- Validações antes de queries
- Paginação em listagens

### Recomendações Futuras

- Implementar cache com Redis
- Fila de processamento para envios em massa
- Rate limiting em endpoints públicos

---

## 🐛 Troubleshooting

### Problema: Notificações não estão sendo enviadas

**Soluções:**
1. Verificar se Evolution API está rodando
2. Verificar se instância está conectada
3. Verificar formato do telefone (deve incluir código do país)
4. Verificar logs do servidor

### Problema: Check-in duplicado

**Causa:** Sistema valida duplicidade por `registrationId + scheduleId`

**Solução:** Verificar se o agendamento está correto

### Problema: Erro nas migrations

**Solução:**
```bash
# Reverter migrations
npx sequelize-cli db:migrate:undo:all

# Executar novamente
npx sequelize-cli db:migrate
```

---

## 📝 Changelog

### v1.0.0 (04/02/2026)

**Adicionado:**
- Sistema completo de check-in
- Sistema completo de notificações
- Integração com Evolution API
- Interface administrativa
- Migrations e models
- Documentação completa

---

## 🤝 Contribuindo

Este é um projeto proprietário do Portal IECG.

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a documentação
2. Verifique os logs do servidor
3. Entre em contato com a equipe de desenvolvimento

---

## 📄 Licença

Proprietário - Portal IECG © 2026

---

**Desenvolvido com ❤️ para Portal IECG**
