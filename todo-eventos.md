# TODO - Módulo de Eventos

## Backend - Models (Sequelize/PostgreSQL)

- [x] Criar model Event (eventos com título, descrição, datas)
- [x] Criar model EventBatch (lotes com preços e limites por evento)
- [x] Criar model Coupon (cupons de desconto)
- [x] Criar model FormField (campos personalizados do formulário)
- [x] Criar model Registration (inscrições públicas)
- [x] Criar model RegistrationAttendee (dados dos inscritos)
- [x] Criar model PaymentTransaction (transações Cielo)
- [x] Criar migrations para todas as tabelas
- [x] Definir relacionamentos entre models

## Backend - Controllers

- [x] EventController - CRUD de eventos
- [x] BatchController - gerenciar lotes por evento
- [x] CouponController - gerenciar cupons de desconto
- [x] FormFieldController - gerenciar campos do formulário
- [x] RegistrationController - processar inscrições públicas
- [x] PaymentController - integração com Cielo

## Backend - Services

- [x] EventService - lógica de negócio de eventos
- [x] CouponService - validação e aplicação de cupons
- [x] PaymentService - integração com API Cielo
- [x] OrderCodeService - geração de código único de pedido
- [ ] NotificationService - notificar admin sobre novas inscrições

## Backend - Routes

- [x] /api/admin/events/* - rotas de eventos (admin)
- [x] /api/admin/events/batches - rotas de lotes (admin)
- [x] /api/admin/events/coupons - rotas de cupons (admin)
- [x] /api/admin/events/form-fields - rotas de formulários (admin)
- [x] /api/admin/events/registrations - rotas de inscrições (admin)
- [x] /api/public/events/* - listar eventos públicos
- [x] /api/public/events/register - processar inscrição pública
- [x] /api/webhooks/cielo - webhook para status de pagamento

## Frontend - Páginas Admin

- [x] Dashboard de eventos com estatísticas
- [x] Página de listagem de eventos
- [x] Formulário de criar/editar evento
- [x] Gerenciamento de lotes por evento (dialog)
- [x] Gerenciamento de cupons (página separada)
- [x] Criador visual de formulários dinâmicos
- [x] Visualização de inscrições por evento
- [x] Detalhes de inscrição individual
- [x] Filtros e busca de inscrições

## Frontend - Componentes

- [ ] EventCard - card de evento
- [ ] BatchManager - gerenciar lotes
- [ ] CouponForm - formulário de cupom
- [ ] FormBuilder - construtor de formulários dinâmicos
- [ ] RegistrationTable - tabela de inscrições
- [ ] PaymentStatus - badge de status de pagamento

## Integração Cielo

- [ ] Configurar credenciais Cielo (MerchantId, MerchantKey)
- [ ] Implementar criação de transação
- [ ] Implementar captura de pagamento
- [ ] Implementar webhook para receber status
- [ ] Armazenar logs de transações
- [ ] Tratamento de erros e retries

## Validações e Regras de Negócio

- [ ] Validar disponibilidade de vagas por lote
- [ ] Validar validade de cupons
- [ ] Calcular desconto aplicado
- [ ] Validar campos obrigatórios do formulário
- [ ] Gerar código único de pedido
- [ ] Incrementar contador de inscrições

## Testes

- [ ] Testar criação de evento
- [ ] Testar gerenciamento de lotes
- [ ] Testar aplicação de cupons
- [ ] Testar validação de formulário dinâmico
- [ ] Testar fluxo completo de inscrição
- [ ] Testar integração com Cielo (sandbox)

## Documentação

- [ ] Documentar estrutura de dados
- [ ] Documentar endpoints da API
- [ ] Documentar fluxo de integração Cielo
- [ ] Guia de uso do módulo de eventos

## Menu Lateral

- [x] Adicionar item "Eventos" no menu lateral do dashboard
- [x] Submenu com links para todas as páginas de eventos

## Bugs

- [x] Corrigir erro no EventsDashboard - API retorna objeto ao invés de array
