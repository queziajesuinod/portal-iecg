# Migrations do Banco de Dados

Este diretório contém as migrations do Sequelize para gerenciar mudanças no schema do banco de dados.

## 📋 Como Usar

### **Executar Todas as Migrations Pendentes**

```bash
cd C:\Users\Quezia\Projetos\portal-iecg
npx sequelize-cli db:migrate
```

### **Reverter Última Migration**

```bash
npx sequelize-cli db:migrate:undo
```

### **Reverter Todas as Migrations**

```bash
npx sequelize-cli db:migrate:undo:all
```

### **Ver Status das Migrations**

```bash
npx sequelize-cli db:migrate:status
```

---

## 🆕 Migrations Recentes - Integração Cielo

### **20260121114300-add-pix-columns-to-registrations.js**

**Descrição:** Adiciona colunas para armazenar dados PIX nas inscrições.

**Mudanças:**
- ✅ Adiciona `pixQrCode` (TEXT) - Código PIX copia e cola
- ✅ Adiciona `pixQrCodeBase64` (TEXT) - QR Code em base64

**Executar:**
```bash
npx sequelize-cli db:migrate --name 20260121114300-add-pix-columns-to-registrations.js
```

**Reverter:**
```bash
npx sequelize-cli db:migrate:undo --name 20260121114300-add-pix-columns-to-registrations.js
```

---

### **20260121114400-create-payment-options.js**

**Descrição:** Cria tabela para gerenciar formas de pagamento dos eventos.

**Mudanças:**
- ✅ Cria tabela `PaymentOptions`
- ✅ Campos: tipo, parcelas, juros, status
- ✅ Índices para otimização de queries

**Executar:**
```bash
npx sequelize-cli db:migrate --name 20260121114400-create-payment-options.js
```

**Reverter:**
```bash
npx sequelize-cli db:migrate:undo --name 20260121114400-create-payment-options.js
```

---

## 🔧 Configuração

As migrations usam as configurações do arquivo `server/config/config.json`:

```json
{
  "development": {
    "username": "seu_usuario",
    "password": "sua_senha",
    "database": "dev_iecg",
    "host": "seu_host",
    "dialect": "postgres"
  }
}
```

---

## 📊 Histórico de Migrations

| Data | Migration | Descrição |
|------|-----------|-----------|
| 2026-01-21 | `add-maxPerBuyer-to-events` | Adiciona limite de vagas por comprador |
| 2026-01-21 | `add-pix-columns-to-registrations` | Adiciona colunas PIX |
| 2026-01-21 | `create-payment-options` | Cria tabela de formas de pagamento |

---

## ⚠️ Importante

- **Sempre faça backup** do banco antes de executar migrations em produção
- **Teste as migrations** em ambiente de desenvolvimento primeiro
- **Revise o código** das migrations antes de executar
- **Documente** qualquer migration customizada

---

## 🚀 Criar Nova Migration

```bash
npx sequelize-cli migration:generate --name nome-da-migration
```

Exemplo:
```bash
npx sequelize-cli migration:generate --name add-campo-to-tabela
```

---

## 📖 Referências

- [Documentação Sequelize Migrations](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Sequelize CLI](https://github.com/sequelize/cli)
