# Módulo de Eventos - Portal IECG

## 📋 Visão Geral

Sistema completo de gerenciamento de eventos com inscrições online, formulários dinâmicos, sistema de lotes, cupons de desconto e integração com gateway de pagamento Cielo.

---

## ✅ O que foi Implementado

### 🗄️ **Banco de Dados** (PostgreSQL)

**7 Tabelas Criadas:**

1. **Events** - Eventos com título, descrição, datas, local, imagem
2. **EventBatches** - Lotes com preços diferentes por evento
3. **Coupons** - Cupons de desconto (porcentagem ou valor fixo)
4. **FormFields** - Campos personalizados do formulário
5. **Registrations** - Inscrições com código único de pedido
6. **RegistrationAttendees** - Dados dos inscritos (repete conforme quantidade)
7. **PaymentTransactions** - Log completo de transações Cielo

**Migrations:**
- ✅ Migration completa executada
- ✅ Relacionamentos configurados com CASCADE
- ✅ Schema dinâmico (dev_iecg / iecg)

---

### 🔧 **Backend** (Node.js + Express + Sequelize)

#### **Services** (7 arquivos)

1. **eventService.js**
   - CRUD completo de eventos
   - Listagem pública de eventos ativos
   - Validações de negócio

2. **batchService.js**
   - Gerenciamento de lotes
   - Verificação de disponibilidade
   - Controle de vagas e datas

3. **couponService.js**
   - CRUD de cupons
   - Validação de cupons
   - Cálculo de descontos
   - Controle de uso

4. **formFieldService.js**
   - Criador de campos dinâmicos
   - Validação de dados do formulário
   - Suporte a múltiplos tipos de campo

5. **orderCodeService.js**
   - Geração de código único
   - Formato: REG-YYYYMMDD-XXXXXX
   - Garantia de unicidade

6. **paymentService.js**
   - Integração completa com API Cielo
   - Criação de transação
   - Captura de pagamento
   - Cancelamento/reembolso
   - Consulta de status
   - Conversão real ↔ centavos

7. **registrationService.js**
   - Processamento completo de inscrições
   - Fluxo end-to-end
   - Gerenciamento de inscrições (admin)

#### **Controllers** (5 arquivos)

1. **eventController.js** - CRUD de eventos
2. **batchController.js** - Gerenciamento de lotes
3. **couponController.js** - Gerenciamento de cupons
4. **formFieldController.js** - Gerenciamento de formulários
5. **registrationController.js** - Processamento de inscrições

#### **Routes** (2 arquivos)

1. **eventRoutes.js** - Rotas administrativas (protegidas)
2. **publicEventRoutes.js** - Rotas públicas (sem autenticação)

---

## 🛣️ **API Endpoints**

### **Rotas Administrativas** (requer autenticação JWT)

Base URL: `/api/admin/events`

#### Eventos
```
GET    /api/admin/events                    - Listar todos os eventos
POST   /api/admin/events                    - Criar novo evento
GET    /api/admin/events/:id                - Buscar evento por ID
PUT    /api/admin/events/:id                - Atualizar evento
DELETE /api/admin/events/:id                - Deletar evento
```

#### Lotes
```
GET    /api/admin/events/:eventId/batches   - Listar lotes do evento
GET    /api/admin/events/batches/:id        - Buscar lote por ID
POST   /api/admin/events/batches            - Criar novo lote
PUT    /api/admin/events/batches/:id        - Atualizar lote
DELETE /api/admin/events/batches/:id        - Deletar lote
```

#### Cupons
```
GET    /api/admin/events/coupons            - Listar todos os cupons
GET    /api/admin/events/coupons/:id        - Buscar cupom por ID
POST   /api/admin/events/coupons            - Criar novo cupom
PUT    /api/admin/events/coupons/:id        - Atualizar cupom
DELETE /api/admin/events/coupons/:id        - Deletar cupom
```

#### Formulários
```
GET    /api/admin/events/:eventId/form-fields  - Listar campos do evento
GET    /api/admin/events/form-fields/:id       - Buscar campo por ID
POST   /api/admin/events/form-fields           - Criar novo campo
POST   /api/admin/events/form-fields/batch     - Criar múltiplos campos
PUT    /api/admin/events/form-fields/:id       - Atualizar campo
DELETE /api/admin/events/form-fields/:id       - Deletar campo
```

#### Inscrições (Admin)
```
GET    /api/admin/events/registrations              - Listar todas as inscrições
GET    /api/admin/events/:eventId/registrations     - Inscrições por evento
GET    /api/admin/events/registrations/:id          - Buscar inscrição por ID
POST   /api/admin/events/registrations/:id/cancel   - Cancelar inscrição
```

---

### **Rotas Públicas** (sem autenticação)

Base URL: `/api/public/events`

```
GET    /api/public/events                           - Listar eventos ativos
GET    /api/public/events/:id                       - Detalhes do evento
POST   /api/public/events/coupons/validate          - Validar cupom
GET    /api/public/events/batches/check-availability - Verificar disponibilidade
POST   /api/public/events/register                  - Processar inscrição
GET    /api/public/events/registrations/:orderCode  - Consultar inscrição
```

---

## 🔥 **Funcionalidades Implementadas**

### **Fluxo Completo de Inscrição Pública**

1. ✅ Validação de evento e lote
2. ✅ Verificação de disponibilidade de vagas
3. ✅ Aplicação de cupom de desconto
4. ✅ Validação de formulários (comprador + inscritos)
5. ✅ Geração de código único de pedido
6. ✅ Processamento de pagamento via Cielo
7. ✅ Registro no banco de dados
8. ✅ Captura automática do pagamento
9. ✅ Atualização de contadores (lotes, evento, cupom)
10. ✅ Log completo de transações

### **Sistema de Lotes**

- ✅ Múltiplos lotes por evento
- ✅ Preços diferentes por lote
- ✅ Limite de vagas configurável
- ✅ Datas de início e fim de venda
- ✅ Ordem de exibição
- ✅ Ativação/desativação

### **Sistema de Cupons**

- ✅ Cupons globais ou específicos por evento
- ✅ Desconto em porcentagem ou valor fixo
- ✅ Limite de uso configurável
- ✅ Validade temporal
- ✅ Controle de uso
- ✅ Validação completa

### **Formulários Dinâmicos**

- ✅ Campos personalizáveis por evento
- ✅ Separação: dados do comprador vs dados dos inscritos
- ✅ Tipos suportados: text, email, phone, number, textarea, select, checkbox, radio, date, cpf, file
- ✅ Campos obrigatórios configuráveis
- ✅ Validação automática
- ✅ Ordem de exibição

### **Integração Cielo**

- ✅ Criação de transação
- ✅ Captura de pagamento
- ✅ Cancelamento/reembolso
- ✅ Consulta de status
- ✅ Mapeamento de status
- ✅ Log completo de transações
- ✅ Suporte a sandbox e produção

---

## ⚙️ **Configuração**

### **1. Variáveis de Ambiente**

Copie `.env.example` para `.env` e configure:

```bash
# Banco de Dados
DB_USER=root
DB_PASS=sua_senha
DB_NAME=iecg_bd
DB_HOST=localhost
DB_PORT=5432
DB_SCHEMA=dev_iecg

# JWT
JWT_SECRET=sua_chave_secreta

# Cielo
CIELO_MERCHANT_ID=seu_merchant_id
CIELO_MERCHANT_KEY=sua_merchant_key
CIELO_ENVIRONMENT=sandbox  # ou 'production'
```

### **2. Credenciais Cielo Sandbox**

Para testes, cadastre-se em:
https://cadastrosandbox.cieloecommerce.cielo.com.br/

Você receberá:
- MerchantId
- MerchantKey

### **3. Instalar Dependências**

```bash
cd /home/ubuntu/portal-iecg
npm install
```

### **4. Executar Migrations**

```bash
node run-essential-migrations.js
```

### **5. Iniciar Servidor**

```bash
npm start
```

Servidor rodará em: `http://localhost:3005`

---

## 📊 **Estrutura de Dados**

### **Formulário em 2 Partes**

1. **Dados do Comprador** (`section: 'buyer'`)
   - Preenchido 1 vez
   - Informações de quem está comprando

2. **Dados dos Inscritos** (`section: 'attendee'`)
   - Repete conforme quantidade de inscrições
   - Ex: 3 inscrições = preencher 3 vezes

### **Código de Pedido**

Formato: `REG-YYYYMMDD-XXXXXX`

Exemplo: `REG-20260121-A3B5C7`

- REG = Prefixo fixo
- YYYYMMDD = Data da inscrição
- XXXXXX = 6 caracteres alfanuméricos aleatórios

---

## 🔐 **Autenticação**

As rotas administrativas requerem autenticação JWT.

**Header necessário:**
```
Authorization: Bearer {token}
```

O token é obtido através do endpoint de login existente no sistema.

---

## 📝 **Exemplo de Uso**

### **1. Criar Evento**

```bash
POST /api/admin/events
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Conferência IECG 2026",
  "description": "Grande conferência anual",
  "startDate": "2026-06-15T09:00:00Z",
  "endDate": "2026-06-17T18:00:00Z",
  "location": "Centro de Convenções",
  "maxRegistrations": 500
}
```

### **2. Criar Lote**

```bash
POST /api/admin/events/batches
Authorization: Bearer {token}
Content-Type: application/json

{
  "eventId": "uuid-do-evento",
  "name": "Lote 1 - Early Bird",
  "price": 150.00,
  "maxQuantity": 100,
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-03-31T23:59:59Z",
  "order": 1
}
```

### **3. Criar Cupom**

```bash
POST /api/admin/events/coupons
Authorization: Bearer {token}
Content-Type: application/json

{
  "eventId": "uuid-do-evento",
  "code": "PROMO2026",
  "discountType": "percentage",
  "discountValue": 20,
  "maxUses": 50,
  "validUntil": "2026-05-31T23:59:59Z"
}
```

### **4. Criar Campos do Formulário**

```bash
POST /api/admin/events/form-fields/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "eventId": "uuid-do-evento",
  "campos": [
    {
      "fieldType": "text",
      "fieldLabel": "Nome Completo",
      "fieldName": "nome",
      "isRequired": true,
      "section": "buyer",
      "order": 1
    },
    {
      "fieldType": "email",
      "fieldLabel": "E-mail",
      "fieldName": "email",
      "isRequired": true,
      "section": "buyer",
      "order": 2
    },
    {
      "fieldType": "text",
      "fieldLabel": "Nome do Participante",
      "fieldName": "nome_participante",
      "isRequired": true,
      "section": "attendee",
      "order": 1
    }
  ]
}
```

### **5. Processar Inscrição (Público)**

```bash
POST /api/public/events/register
Content-Type: application/json

{
  "eventId": "uuid-do-evento",
  "batchId": "uuid-do-lote",
  "couponCode": "PROMO2026",
  "quantity": 2,
  "buyerData": {
    "nome": "João Silva",
    "email": "joao@example.com"
  },
  "attendeesData": [
    {
      "nome_participante": "Maria Silva"
    },
    {
      "nome_participante": "Pedro Silva"
    }
  ],
  "paymentData": {
    "cardNumber": "4111111111111111",
    "holder": "JOAO SILVA",
    "expirationDate": "12/2028",
    "securityCode": "123",
    "brand": "Visa"
  }
}
```

---

## 🚧 **Próximos Passos**

### **Frontend Administrativo** (a desenvolver)

- [ ] Dashboard de eventos com estatísticas
- [ ] Página de listagem de eventos
- [ ] Formulário de criar/editar evento
- [ ] Gerenciamento de lotes por evento
- [ ] Gerenciamento de cupons
- [ ] Criador visual de formulários dinâmicos
- [ ] Visualização de inscrições por evento
- [ ] Detalhes de inscrição individual
- [ ] Filtros e busca de inscrições

### **Frontend Público** (start-iecg-form)

- [ ] Listagem de eventos disponíveis
- [ ] Página de detalhes do evento
- [ ] Seleção de lote
- [ ] Aplicação de cupom
- [ ] Formulário do comprador
- [ ] Formulário dos inscritos (dinâmico)
- [ ] Integração com Cielo (formulário de pagamento)
- [ ] Página de confirmação com código de pedido

### **Melhorias Futuras**

- [ ] Webhook Cielo para atualização de status
- [ ] Notificação por email ao admin
- [ ] Notificação por email ao comprador
- [ ] Exportação de inscrições (CSV/Excel)
- [ ] Relatórios e estatísticas
- [ ] QR Code para check-in
- [ ] Certificados digitais

---

## 📞 **Suporte**

Para dúvidas ou problemas:
1. Verifique a documentação da API Cielo: https://developercielo.github.io/
2. Consulte os logs do servidor
3. Verifique as transações no painel Cielo

---

## 📄 **Licença**

Propriedade de IECG - Todos os direitos reservados.
