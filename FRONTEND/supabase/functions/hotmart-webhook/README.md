# Hotmart Webhook Edge Function

## 📋 Descrição

Esta Edge Function processa automaticamente os webhooks da Hotmart quando uma venda é aprovada, atualizando o perfil do usuário no Supabase com o plano correto e data de expiração.

## 🔐 Segurança

A função verifica o header `x-hotmart-hottok` para autenticar requests da Hotmart.

## 📦 Mapeamento de Produtos

| Produto | Offer Code | Duração | Plano |
|---------|-----------|---------|-------|
| Mensual | `c1pgsg6o` | 1 mês | pro |
| Anual | `zouponhf` | 1 ano | pro |
| Vitalicio | `5v9syrd5` | Vitalicio (2099-12-31) | pro |

## 🚀 Deploy

### 1. Configurar variáveis de ambiente

```bash
# Definir o segredo Hotmart (você deve obter isso do painel Hotmart)
supabase secrets set HOTMART_SECRET="seu_token_secreto_hotmart"

# Verificar que as outras variáveis estão configuradas
supabase secrets list
```

### 2. Deploy da função

```bash
cd d:\NEW MILLION\bot-strategy-hub
supabase functions deploy hotmart-webhook
```

### 3. URL do Webhook

Após o deploy, a URL será:
```
https://xwclmxjeombwabfdvyij.supabase.co/functions/v1/hotmart-webhook
```

### 4. Configurar no Painel Hotmart

1. Acesse: https://app.hotmart.com/
2. Vá em **Ferramentas** → **Webhooks**
3. Adicione a URL do webhook
4. Selecione os eventos: `PURCHASE_COMPLETE` e `PURCHASE_APPROVED`
5. Configure o token de segurança (x-hotmart-hottok)

## 🧪 Testar Localmente

```bash
# Servir a função localmente
supabase functions serve hotmart-webhook --env-file ./supabase/.env.local

# Em outro terminal, testar com curl
curl -X POST http://localhost:54321/functions/v1/hotmart-webhook \
  -H "Content-Type: application/json" \
  -H "x-hotmart-hottok: seu_token_secreto" \
  -d '{
    "event": "PURCHASE_APPROVED",
    "data": {
      "buyer": {
        "email": "teste@example.com",
        "name": "João Silva"
      },
      "product": {
        "id": "123",
        "name": "Million Bots Pro"
      },
      "purchase": {
        "order_id": "ORDER123",
        "status": "approved",
        "offer": {
          "code": "c1pgsg6o"
        }
      }
    }
  }'
```

## 📊 Estrutura do Webhook Hotmart

A Hotmart enviará um payload JSON como este:

```json
{
  "event": "PURCHASE_APPROVED",
  "data": {
    "buyer": {
      "email": "cliente@email.com",
      "name": "Nome do Cliente"
    },
    "product": {
      "id": "product_id",
      "name": "Nome do Produto"
    },
    "purchase": {
      "order_id": "HP123456789",
      "status": "approved",
      "offer": {
        "code": "c1pgsg6o"
      }
    }
  }
}
```

## ⚙️ Lógica de Negócio

1. **Verificação de Segurança**: Valida o header `x-hotmart-hottok`
2. **Identificação**: Extrai email e offer code do payload
3. **Mapeamento**: Identifica o plano baseado no offer code
4. **Cálculo de Expiração**: 
   - Mensual: +1 mês
   - Anual: +1 ano
   - Vitalicio: 2099-12-31
5. **Busca de Usuário**: Procura na tabela `profiles` ou via `auth.admin`
6. **Atualização**: Atualiza `plan_type`, `expiration_date`, e `subscription_status`

## 📝 Resposta

### Sucesso (200)
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "user_id": "uuid",
  "email": "cliente@email.com",
  "plan": "Mensual",
  "expiration_date": "2026-02-14",
  "updated_profile": { ... }
}
```

### Erro (401 - Não autorizado)
```json
{
  "error": "Unauthorized: Invalid token"
}
```

### Erro (404 - Usuário não encontrado)
```json
{
  "error": "User not found",
  "email": "cliente@email.com",
  "suggestion": "User must sign up first"
}
```

## 🔍 Logs

Você pode visualizar os logs da função com:

```bash
supabase functions logs hotmart-webhook
```

## ⚠️ Importante

- O usuário **deve estar cadastrado** no sistema antes de fazer a compra
- Se o email não for encontrado, a função retornará erro 404
- Todos os eventos são logados para debugging
- Recomendado: Criar usuários automaticamente se não existirem (implementação futura)

## 🛠️ Manutenção

Para adicionar novos produtos, edite o objeto `PRODUCT_MAPPING` em `index.ts`:

```typescript
const PRODUCT_MAPPING: Record<string, { name: string; duration: string }> = {
    "c1pgsg6o": { name: "Mensual", duration: "1month" },
    "zouponhf": { name: "Anual", duration: "1year" },
    "5v9syrd5": { name: "Vitalicio", duration: "lifetime" },
    // Adicione novos produtos aqui
};
```
