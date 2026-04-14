'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'Portal IECG — API',
    version: '1.0.0',
    description:
      'Documentação das APIs do Portal IECG. Para usar endpoints protegidos, faça login em **POST /auth/login**, copie o token retornado e clique em **Authorize** (cadeado) no topo da página.',
  },
  servers: [{ url: '', description: 'Servidor atual' }],

  // ── Esquema de autenticação ─────────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido via POST /auth/login',
      },
    },
    schemas: {
      // ── Genéricos ───────────────────────────────────────────────────────────
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Mensagem de erro' },
        },
      },
      UUID: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },

      // ── Autenticação ────────────────────────────────────────────────────────
      LoginRequest: {
        type: 'object',
        required: ['login', 'password'],
        properties: {
          login: { type: 'string', example: 'admin@iecg.com.br' },
          password: { type: 'string', example: 'senha123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT — use no campo Authorize acima' },
          user: { type: 'object' },
        },
      },

      // ── Evento ──────────────────────────────────────────────────────────────
      Event: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          title: { type: 'string', example: 'Acampamento 2026' },
          description: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          location: { type: 'string' },
          eventType: { type: 'string', enum: ['ACAMP', 'ENCONTRO', 'CONFERENCIA'] },
          maxRegistrations: { type: 'integer', nullable: true },
          maxPerBuyer: { type: 'integer', nullable: true },
          requiresPayment: { type: 'boolean' },
          isActive: { type: 'boolean' },
          imageUrl: { type: 'string' },
        },
      },
      EventInput: {
        type: 'object',
        required: ['title', 'startDate', 'endDate', 'eventType'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          location: { type: 'string' },
          eventType: { type: 'string', enum: ['ACAMP', 'ENCONTRO', 'CONFERENCIA'] },
          maxRegistrations: { type: 'integer', nullable: true },
          maxPerBuyer: { type: 'integer', nullable: true },
          requiresPayment: { type: 'boolean', default: true },
          registrationPaymentMode: { type: 'string', enum: ['SINGLE', 'BALANCE_DUE'] },
          minDepositAmount: { type: 'number', nullable: true },
          isActive: { type: 'boolean', default: true },
        },
      },

      // ── Lote ────────────────────────────────────────────────────────────────
      Batch: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          eventId: { $ref: '#/components/schemas/UUID' },
          name: { type: 'string', example: 'Lote 1' },
          price: { type: 'number', example: 150.00 },
          maxQuantity: { type: 'integer', nullable: true },
          currentQuantity: { type: 'integer' },
          startDate: { type: 'string', format: 'date-time', nullable: true },
          endDate: { type: 'string', format: 'date-time', nullable: true },
          isActive: { type: 'boolean' },
        },
      },

      // ── Cupom ───────────────────────────────────────────────────────────────
      Coupon: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          code: { type: 'string', example: 'PROMO10' },
          discountType: { type: 'string', enum: ['percentage', 'fixed'] },
          discountValue: { type: 'number' },
          maxUses: { type: 'integer', nullable: true },
          currentUses: { type: 'integer' },
          validFrom: { type: 'string', format: 'date-time', nullable: true },
          validUntil: { type: 'string', format: 'date-time', nullable: true },
          isActive: { type: 'boolean' },
        },
      },

      // ── Campo de formulário ─────────────────────────────────────────────────
      FormField: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          eventId: { $ref: '#/components/schemas/UUID' },
          fieldType: { type: 'string', enum: ['text','email','phone','cpf','number','date','textarea','select','radio','checkbox','file'] },
          fieldLabel: { type: 'string', example: 'Data de Nascimento' },
          fieldName: { type: 'string', example: 'dataNascimento' },
          isRequired: { type: 'boolean' },
          section: { type: 'string', enum: ['buyer', 'attendee'] },
          options: { type: 'array', items: { type: 'string' }, nullable: true },
        },
      },

      // ── Regra de bloqueio ───────────────────────────────────────────────────
      RegistrationRule: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          eventId: { $ref: '#/components/schemas/UUID' },
          fieldKey: { type: 'string', example: 'dataNascimento' },
          operator: { type: 'string', enum: ['eq','neq','gt','gte','lt','lte','in','not_in','contains','age_gte','age_lte','age_gt','age_lt'] },
          value: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'array', items: { type: 'string' } }] },
          errorMessage: { type: 'string' },
          appliesTo: { type: 'string', enum: ['buyer', 'attendee'] },
          ruleGroup: { type: 'integer' },
          isActive: { type: 'boolean' },
        },
      },
      RegistrationRuleInput: {
        type: 'object',
        required: ['eventId', 'fieldKey', 'operator', 'value', 'errorMessage'],
        properties: {
          eventId: { $ref: '#/components/schemas/UUID' },
          formFieldId: { $ref: '#/components/schemas/UUID' },
          fieldKey: { type: 'string', example: 'dataNascimento' },
          operator: { type: 'string', enum: ['eq','neq','gt','gte','lt','lte','in','not_in','contains','age_gte','age_lte','age_gt','age_lt'], example: 'age_gte' },
          value: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'array', items: { type: 'string' } }], example: 15 },
          errorMessage: { type: 'string', example: 'Este evento é para maiores de 15 anos' },
          appliesTo: { type: 'string', enum: ['buyer', 'attendee'], default: 'attendee' },
          ruleGroup: { type: 'integer', default: 1 },
        },
      },

      // ── Inscrição ───────────────────────────────────────────────────────────
      Registration: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          orderCode: { type: 'string', example: 'REG-20260121-A3B5C7' },
          eventId: { $ref: '#/components/schemas/UUID' },
          quantity: { type: 'integer' },
          finalPrice: { type: 'number' },
          paymentStatus: { type: 'string', enum: ['pending','authorized','partial','confirmed','denied','expired','cancelled','refunded'] },
          buyerData: { type: 'object' },
        },
      },
      RegistrationInput: {
        type: 'object',
        required: ['eventId', 'quantity', 'buyerData', 'attendeesData'],
        properties: {
          eventId: { $ref: '#/components/schemas/UUID' },
          quantity: { type: 'integer', example: 1 },
          couponCode: { type: 'string', nullable: true },
          paymentOptionId: { $ref: '#/components/schemas/UUID' },
          buyerData: { type: 'object', description: 'Dados do comprador conforme campos do formulário' },
          attendeesData: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                batchId: { $ref: '#/components/schemas/UUID' },
                data: { type: 'object', description: 'Dados do inscrito conforme campos do formulário' },
              },
            },
          },
          paymentData: { type: 'object', nullable: true },
        },
      },

      // ── Membro ──────────────────────────────────────────────────────────────
      Member: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          nome: { type: 'string' },
          email: { type: 'string' },
          telefone: { type: 'string' },
          dataNascimento: { type: 'string', format: 'date' },
          estadoCivil: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },

      // ── Voluntariado ────────────────────────────────────────────────────────
      AreaVoluntariado: {
        type: 'object',
        properties: {
          id: { $ref: '#/components/schemas/UUID' },
          nome: { type: 'string' },
          descricao: { type: 'string' },
          ativo: { type: 'boolean' },
        },
      },
    },
  },

  // ── Segurança global (aplica BearerAuth em todos os endpoints por padrão) ──
  security: [{ BearerAuth: [] }],

  // ── Tags (agrupamento na UI) ────────────────────────────────────────────────
  tags: [
    { name: 'Auth', description: 'Autenticação — obtenha o token aqui' },
    { name: 'Eventos (Público)', description: 'Endpoints públicos de eventos e inscrições' },
    { name: 'Eventos (Admin)', description: 'Gestão de eventos' },
    { name: 'Lotes', description: 'Lotes de preço dos eventos' },
    { name: 'Cupons', description: 'Cupons de desconto' },
    { name: 'Campos do Formulário', description: 'Campos personalizados do formulário de inscrição' },
    { name: 'Regras de Bloqueio', description: 'Restrições de perfil para inscrição' },
    { name: 'Inscrições (Admin)', description: 'Gestão de inscrições e pagamentos' },
    { name: 'Check-in', description: 'Agendamentos, estações e check-ins' },
    { name: 'Hospedagem', description: 'Configuração e alocação de hospedagem' },
    { name: 'Times', description: 'Configuração e alocação de times' },
    { name: 'Membros', description: 'Gestão de membros da igreja' },
    { name: 'Usuários', description: 'Gestão de usuários do sistema' },
    { name: 'Voluntariado', description: 'Áreas e vínculos de voluntariado' },
    { name: 'Financeiro', description: 'Registros financeiros e despesas' },
  ],

  // ── Paths ──────────────────────────────────────────────────────────────────
  paths: {

    // ═══════════════════════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════════════════════
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Fazer login e obter o JWT',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Token gerado com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          401: { description: 'Credenciais inválidas' },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS — PÚBLICO
    // ═══════════════════════════════════════════════════════════════
    '/api/public/events': {
      get: { tags: ['Eventos (Público)'], summary: 'Listar eventos ativos', security: [], responses: { 200: { description: 'Lista de eventos' } } },
    },
    '/api/public/events/{id}': {
      get: { tags: ['Eventos (Público)'], summary: 'Buscar evento por ID', security: [], parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Evento encontrado' }, 404: { description: 'Não encontrado' } } },
    },
    '/api/public/events/{eventId}/batches': {
      get: { tags: ['Eventos (Público)'], summary: 'Listar lotes de um evento', security: [], parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Lista de lotes' } } },
    },
    '/api/public/events/{eventId}/form-fields': {
      get: { tags: ['Eventos (Público)'], summary: 'Listar campos do formulário', security: [], parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Campos' } } },
    },
    '/api/public/events/{eventId}/payment-options': {
      get: { tags: ['Eventos (Público)'], summary: 'Listar formas de pagamento', security: [], parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Formas de pagamento' } } },
    },
    '/api/public/events/coupons/validate': {
      post: { tags: ['Eventos (Público)'], summary: 'Validar cupom de desconto', security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' }, eventId: { $ref: '#/components/schemas/UUID' }, quantity: { type: 'integer' }, totalPrice: { type: 'number' } } } } } }, responses: { 200: { description: 'Resultado da validação' } } },
    },
    '/api/public/events/register': {
      post: {
        tags: ['Eventos (Público)'],
        summary: 'Processar inscrição em um evento',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationInput' } } } },
        responses: {
          201: { description: 'Inscrição criada com sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/Registration' } } } },
          400: { description: 'Dados inválidos ou bloqueio de regra', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/public/events/registrations/{orderCode}': {
      get: { tags: ['Eventos (Público)'], summary: 'Consultar inscrição por código', security: [], parameters: [{ name: 'orderCode', in: 'path', required: true, schema: { type: 'string', example: 'REG-20260121-A3B5C7' } }], responses: { 200: { description: 'Inscrição encontrada' }, 404: { description: 'Não encontrada' } } },
    },
    '/api/public/events/registrations/{orderCode}/status': {
      get: { tags: ['Eventos (Público)'], summary: 'Verificar status de pagamento', security: [], parameters: [{ name: 'orderCode', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Status atual' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // EVENTOS — ADMIN
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/events': {
      get: { tags: ['Eventos (Admin)'], summary: 'Listar todos os eventos', responses: { 200: { description: 'Lista de eventos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Event' } } } } } } },
      post: { tags: ['Eventos (Admin)'], summary: 'Criar novo evento', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EventInput' } } } }, responses: { 201: { description: 'Evento criado' }, 400: { description: 'Dados inválidos' } } },
    },
    '/api/admin/events/stats': {
      get: { tags: ['Eventos (Admin)'], summary: 'Estatísticas gerais', responses: { 200: { description: 'Estatísticas' } } },
    },
    '/api/admin/events/{id}': {
      get: { tags: ['Eventos (Admin)'], summary: 'Buscar evento por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Evento' }, 404: { description: 'Não encontrado' } } },
      put: { tags: ['Eventos (Admin)'], summary: 'Atualizar evento', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EventInput' } } } }, responses: { 200: { description: 'Evento atualizado' } } },
      delete: { tags: ['Eventos (Admin)'], summary: 'Remover evento', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 204: { description: 'Removido' } } },
    },
    '/api/admin/events/{id}/duplicate': {
      post: { tags: ['Eventos (Admin)'], summary: 'Duplicar evento', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 201: { description: 'Evento duplicado' } } },
    },
    '/api/admin/events/{eventId}/tickets-summary': {
      get: { tags: ['Eventos (Admin)'], summary: 'Resumo de ingressos do evento', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Resumo' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // LOTES
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/events/{eventId}/batches': {
      get: { tags: ['Lotes'], summary: 'Listar lotes do evento', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Lista de lotes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Batch' } } } } } } },
    },
    '/api/admin/events/batches': {
      post: { tags: ['Lotes'], summary: 'Criar lote', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Batch' } } } }, responses: { 201: { description: 'Lote criado' } } },
    },
    '/api/admin/events/batches/{id}': {
      get: { tags: ['Lotes'], summary: 'Buscar lote por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Lote' } } },
      put: { tags: ['Lotes'], summary: 'Atualizar lote', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Batch' } } } }, responses: { 200: { description: 'Lote atualizado' } } },
      delete: { tags: ['Lotes'], summary: 'Remover lote', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 204: { description: 'Removido' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // CUPONS
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/events/coupons': {
      get: { tags: ['Cupons'], summary: 'Listar cupons', responses: { 200: { description: 'Lista de cupons', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Coupon' } } } } } } },
      post: { tags: ['Cupons'], summary: 'Criar cupom', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Coupon' } } } }, responses: { 201: { description: 'Cupom criado' } } },
    },
    '/api/admin/events/coupons/{id}': {
      get: { tags: ['Cupons'], summary: 'Buscar cupom por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Cupom' } } },
      put: { tags: ['Cupons'], summary: 'Atualizar cupom', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Coupon' } } } }, responses: { 200: { description: 'Cupom atualizado' } } },
      delete: { tags: ['Cupons'], summary: 'Remover cupom', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 204: { description: 'Removido' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // CAMPOS DE FORMULÁRIO
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/events/{eventId}/form-fields': {
      get: { tags: ['Campos do Formulário'], summary: 'Listar campos do evento', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Campos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FormField' } } } } } } },
    },
    '/api/admin/events/form-fields': {
      post: { tags: ['Campos do Formulário'], summary: 'Criar campo', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FormField' } } } }, responses: { 201: { description: 'Campo criado' } } },
    },
    '/api/admin/events/form-fields/batch': {
      post: { tags: ['Campos do Formulário'], summary: 'Criar múltiplos campos em lote', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { eventId: { $ref: '#/components/schemas/UUID' }, campos: { type: 'array', items: { $ref: '#/components/schemas/FormField' } } } } } } }, responses: { 201: { description: 'Campos criados' } } },
    },
    '/api/admin/events/form-fields/{id}': {
      get: { tags: ['Campos do Formulário'], summary: 'Buscar campo por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Campo' } } },
      put: { tags: ['Campos do Formulário'], summary: 'Atualizar campo', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FormField' } } } }, responses: { 200: { description: 'Campo atualizado' } } },
      delete: { tags: ['Campos do Formulário'], summary: 'Remover campo', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 204: { description: 'Removido' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // REGRAS DE BLOQUEIO
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/events/{eventId}/registration-rules': {
      get: { tags: ['Regras de Bloqueio'], summary: 'Listar regras de bloqueio do evento', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Regras', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/RegistrationRule' } } } } } } },
    },
    '/api/admin/events/registration-rules': {
      post: {
        tags: ['Regras de Bloqueio'],
        summary: 'Criar regra de bloqueio',
        description: 'Operadores especiais de idade (`age_gte`, `age_lte`, `age_gt`, `age_lt`) calculam a idade em anos a partir do campo de data de nascimento informado.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationRuleInput' } } } },
        responses: { 201: { description: 'Regra criada', content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationRule' } } } }, 400: { description: 'Dados inválidos' } },
      },
    },
    '/api/admin/events/registration-rules/{id}': {
      put: { tags: ['Regras de Bloqueio'], summary: 'Atualizar regra', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrationRuleInput' } } } }, responses: { 200: { description: 'Regra atualizada' } } },
      delete: { tags: ['Regras de Bloqueio'], summary: 'Remover regra', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 204: { description: 'Removida' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // INSCRIÇÕES — ADMIN
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/events/registrations': {
      get: { tags: ['Inscrições (Admin)'], summary: 'Listar todas as inscrições', responses: { 200: { description: 'Lista de inscrições' } } },
    },
    '/api/admin/events/{eventId}/registrations': {
      get: { tags: ['Inscrições (Admin)'], summary: 'Listar inscrições de um evento', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Inscrições com paginação' } } },
    },
    '/api/admin/events/{eventId}/registration-attendees/confirmed': {
      get: { tags: ['Inscrições (Admin)'], summary: 'Listar inscritos confirmados', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Inscritos confirmados' } } },
    },
    '/api/admin/events/registrations/{id}': {
      get: { tags: ['Inscrições (Admin)'], summary: 'Buscar inscrição por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Inscrição' } } },
    },
    '/api/admin/events/registrations/{id}/cancel': {
      post: { tags: ['Inscrições (Admin)'], summary: 'Cancelar inscrição', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Inscrição cancelada' } } },
    },
    '/api/admin/events/registrations/{id}/cancel-info': {
      get: { tags: ['Inscrições (Admin)'], summary: 'Obter informações de cancelamento', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Informações de cancelamento' } } },
    },
    '/api/admin/events/registrations/{id}/recalculate-status': {
      post: { tags: ['Inscrições (Admin)'], summary: 'Recalcular status de pagamento', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Status recalculado' } } },
    },
    '/api/admin/events/registrations/{id}/payments': {
      post: { tags: ['Inscrições (Admin)'], summary: 'Registrar pagamento online', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 201: { description: 'Pagamento registrado' } } },
    },
    '/api/admin/events/registrations/{id}/payments/offline': {
      post: { tags: ['Inscrições (Admin)'], summary: 'Registrar pagamento offline', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { amount: { type: 'number' }, method: { type: 'string', enum: ['cash','pix','transfer','boleto','pos','manual'] }, notes: { type: 'string' } } } } } }, responses: { 201: { description: 'Pagamento offline registrado' } } },
    },
    '/api/admin/events/registrations/{id}/payments/{paymentId}/offline': {
      put: { tags: ['Inscrições (Admin)'], summary: 'Atualizar pagamento offline', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }, { name: 'paymentId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Pagamento atualizado' } } },
    },
    '/api/admin/events/registrations/{id}/payments/{paymentId}': {
      delete: { tags: ['Inscrições (Admin)'], summary: 'Remover pagamento', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }, { name: 'paymentId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 204: { description: 'Removido' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // CHECK-IN
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/checkin/schedules': {
      post: { tags: ['Check-in'], summary: 'Criar agendamento de check-in', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 201: { description: 'Agendamento criado' } } },
    },
    '/api/admin/checkin/events/{eventId}/schedules': {
      get: { tags: ['Check-in'], summary: 'Listar agendamentos do evento', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Agendamentos' } } },
    },
    '/api/admin/checkin/stations': {
      post: { tags: ['Check-in'], summary: 'Criar estação de check-in', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 201: { description: 'Estação criada' } } },
    },
    '/api/admin/checkin/events/{eventId}/stations': {
      get: { tags: ['Check-in'], summary: 'Listar estações do evento', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Estações' } } },
    },
    '/api/admin/checkin/manual': {
      post: { tags: ['Check-in'], summary: 'Realizar check-in manual', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { orderCode: { type: 'string' }, eventId: { $ref: '#/components/schemas/UUID' }, stationId: { $ref: '#/components/schemas/UUID' } } } } } }, responses: { 200: { description: 'Check-in realizado' } } },
    },
    '/api/admin/checkin/events/{eventId}/list': {
      get: { tags: ['Check-in'], summary: 'Listar check-ins do evento', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Check-ins' } } },
    },
    '/api/admin/checkin/events/{eventId}/stats': {
      get: { tags: ['Check-in'], summary: 'Estatísticas de check-in', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Estatísticas' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // HOSPEDAGEM
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/events/{eventId}/housing/config': {
      get: { tags: ['Hospedagem'], summary: 'Obter configuração de hospedagem', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Configuração' } } },
      post: { tags: ['Hospedagem'], summary: 'Salvar configuração de hospedagem', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Configuração salva' } } },
    },
    '/api/admin/events/{eventId}/housing/generate': {
      post: { tags: ['Hospedagem'], summary: 'Gerar alocação de hospedagem (IA)', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Alocação gerada' } } },
    },
    '/api/admin/events/{eventId}/housing/allocation': {
      get: { tags: ['Hospedagem'], summary: 'Obter alocação de hospedagem', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Alocação' } } },
      put: { tags: ['Hospedagem'], summary: 'Salvar alocação de hospedagem', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Alocação salva' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMES
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/events/{eventId}/teams/config': {
      get: { tags: ['Times'], summary: 'Obter configuração de times', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Configuração' } } },
      post: { tags: ['Times'], summary: 'Salvar configuração de times', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Configuração salva' } } },
    },
    '/api/admin/events/{eventId}/teams/generate': {
      post: { tags: ['Times'], summary: 'Gerar times (IA)', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Times gerados' } } },
    },
    '/api/admin/events/{eventId}/teams/allocation': {
      get: { tags: ['Times'], summary: 'Obter alocação de times', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Alocação' } } },
      put: { tags: ['Times'], summary: 'Salvar alocação de times', parameters: [{ name: 'eventId', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Alocação salva' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // MEMBROS
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/members': {
      get: { tags: ['Membros'], summary: 'Listar membros', parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Lista de membros' } } },
      post: { tags: ['Membros'], summary: 'Cadastrar membro', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Member' } } } }, responses: { 201: { description: 'Membro criado' } } },
    },
    '/api/admin/members/stats': {
      get: { tags: ['Membros'], summary: 'Estatísticas de membros', responses: { 200: { description: 'Estatísticas' } } },
    },
    '/api/admin/members/me': {
      get: { tags: ['Membros'], summary: 'Perfil do membro autenticado', responses: { 200: { description: 'Perfil' } } },
    },
    '/api/admin/members/{id}': {
      get: { tags: ['Membros'], summary: 'Buscar membro por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Membro' } } },
      put: { tags: ['Membros'], summary: 'Atualizar membro', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Member' } } } }, responses: { 200: { description: 'Membro atualizado' } } },
      delete: { tags: ['Membros'], summary: 'Remover membro', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 204: { description: 'Removido' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // USUÁRIOS
    // ═══════════════════════════════════════════════════════════════
    '/users': {
      get: { tags: ['Usuários'], summary: 'Listar usuários', responses: { 200: { description: 'Lista de usuários' } } },
      post: { tags: ['Usuários'], summary: 'Criar usuário', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 201: { description: 'Usuário criado' } } },
    },
    '/users/{id}': {
      get: { tags: ['Usuários'], summary: 'Buscar usuário por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Usuário' } } },
      put: { tags: ['Usuários'], summary: 'Atualizar usuário', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Usuário atualizado' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // VOLUNTARIADO
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/voluntariado/areas': {
      get: { tags: ['Voluntariado'], summary: 'Listar áreas de voluntariado', responses: { 200: { description: 'Áreas', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AreaVoluntariado' } } } } } } },
      post: { tags: ['Voluntariado'], summary: 'Criar área de voluntariado', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AreaVoluntariado' } } } }, responses: { 201: { description: 'Área criada' } } },
    },
    '/api/admin/voluntariado/areas/{id}': {
      get: { tags: ['Voluntariado'], summary: 'Buscar área por ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Área' } } },
      put: { tags: ['Voluntariado'], summary: 'Atualizar área', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AreaVoluntariado' } } } }, responses: { 200: { description: 'Área atualizada' } } },
    },
    '/api/admin/voluntariado': {
      get: { tags: ['Voluntariado'], summary: 'Listar voluntariados', responses: { 200: { description: 'Vínculos de voluntariado' } } },
      post: { tags: ['Voluntariado'], summary: 'Criar vínculo de voluntariado', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { memberId: { $ref: '#/components/schemas/UUID' }, areaId: { $ref: '#/components/schemas/UUID' } } } } } }, responses: { 201: { description: 'Vínculo criado' } } },
    },
    '/api/admin/voluntariado/{id}/aprovar': {
      patch: { tags: ['Voluntariado'], summary: 'Aprovar voluntariado', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Aprovado' } } },
    },
    '/api/admin/voluntariado/{id}/encerrar': {
      patch: { tags: ['Voluntariado'], summary: 'Encerrar voluntariado', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 200: { description: 'Encerrado' } } },
    },

    // ═══════════════════════════════════════════════════════════════
    // FINANCEIRO
    // ═══════════════════════════════════════════════════════════════
    '/api/admin/financial/records': {
      get: { tags: ['Financeiro'], summary: 'Listar registros financeiros', responses: { 200: { description: 'Registros' } } },
    },
    '/api/admin/financial/fee-config': {
      get: { tags: ['Financeiro'], summary: 'Obter configuração de taxas', responses: { 200: { description: 'Configuração de taxas' } } },
      put: { tags: ['Financeiro'], summary: 'Atualizar configuração de taxas', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Configuração atualizada' } } },
    },
    '/api/admin/financial/expenses': {
      post: { tags: ['Financeiro'], summary: 'Registrar despesa', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { description: { type: 'string' }, amount: { type: 'number' }, date: { type: 'string', format: 'date' }, eventId: { $ref: '#/components/schemas/UUID' } } } } } }, responses: { 201: { description: 'Despesa criada' } } },
    },
    '/api/admin/financial/expenses/{id}': {
      put: { tags: ['Financeiro'], summary: 'Atualizar despesa', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Despesa atualizada' } } },
      delete: { tags: ['Financeiro'], summary: 'Remover despesa', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/UUID' } }], responses: { 204: { description: 'Removida' } } },
    },
  },
};

const swaggerSpec = swaggerJsdoc({ definition, apis: [] });

module.exports = swaggerSpec;
