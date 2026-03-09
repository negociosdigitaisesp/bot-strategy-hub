# Implementação: Integração Backend Catalogador Deriv
## Dual Supabase — Oracle Quant + Million Bots

---

## Squad Ativo
- **@INTEGRATOR_EXPERT** — Schema e integração A↔B
- **@SHIELD_AGENT** — Proteção de I/O (clientId UUID, RLS, validação)
- **@DEBUG_SENTINEL** — Monitoramento de erros de conexão

---

## Arquitetura Dual Supabase

```
Supabase A (Million Bots)          Supabase B (Oracle Quant)
─────────────────────────          ─────────────────────────
auth, perfil, histórico MB         hft_lake.hft_raw_metrics
src/lib/supabaseClient.ts          hft_lake.vw_grade_unificada
VITE_SUPABASE_URL                  hft_lake.client_strategy_config
VITE_SUPABASE_ANON_KEY             hft_lake.vw_sinais_autorizados
                                   src/lib/supabase-oracle.ts
                                   VITE_ORACLE_SUPABASE_URL
                                   VITE_ORACLE_SUPABASE_ANON_KEY
```

---

## Fluxo de Identidade

```
1. Usuário loga no Supabase A
2. useClientId() → supabase.auth.getUser() → uid = "uuid-abc"
3. @SHIELD_AGENT valida formato UUID v4
4. uid usado como client_id em TODAS as operações no Supabase B
5. Supabase B armazena o uid mas nunca autentica o usuário
```

---

## Arquivos Criados

### Frontend (src/)
| Arquivo | Papel | Squad |
|---------|-------|-------|
| `src/lib/supabase-oracle.ts` | Cliente Supabase B isolado | INTEGRATOR_EXPERT |
| `src/hooks/useClientId.ts` | UID do Supabase A como client_id | SHIELD_AGENT |
| `src/components/oracle/StrategySelector.tsx` | UI de seleção de estratégias | INTEGRATOR_EXPERT |

### SQL (sql/)
| Arquivo | Executar em | Descrição |
|---------|-------------|-----------|
| `sql/00_banco_completo_supabase_b_oracle.sql` | Supabase B | Banco completo (01→10) |
| `sql/09_create_client_strategy_config.sql` | Supabase B | Só a tabela de config |
| `sql/10_view_vw_sinais_autorizados.sql` | Supabase B | Só a view do Sniper |

---

## Passos para Ativar

### 1. Configurar variáveis de ambiente (.env.local)

```env
# Supabase A — Million Bots (JÁ EXISTE — não mudar)
VITE_SUPABASE_URL=https://seu-projeto-mb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...chave-mb...

# Supabase B — Oracle Quant (NOVO — adicionar)
VITE_ORACLE_SUPABASE_URL=https://seu-projeto-oracle.supabase.co
VITE_ORACLE_SUPABASE_ANON_KEY=eyJ...chave-oracle...
```

### 2. Executar SQL no Supabase B

Abrir SQL Editor no painel do Supabase B (Oracle Quant) e executar:
```
sql/00_banco_completo_supabase_b_oracle.sql
```

Ou executar em ordem individual:
```
banco de dados.md → scripts 01-08 (schema + views FV1-FV5 + grade unificada)
sql/09_create_client_strategy_config.sql
sql/10_view_vw_sinais_autorizados.sql
```

### 3. Usar o componente no frontend

```tsx
// Em qualquer página/componente protegido por auth
import { StrategySelector } from '@/components/oracle/StrategySelector'

export function MinhasEstrategias() {
  return <StrategySelector />
}
```

---

## Regras Absolutas (PRD)

| # | Regra | Agent |
|---|-------|-------|
| 1 | Nunca misture supabase (A) com supabaseOracle (B) sem comentário explícito | INTEGRATOR_EXPERT |
| 2 | Supabase B não usa RLS baseado em auth — usa client_id como TEXT | SHIELD_AGENT |
| 3 | O client_id que vai para Supabase B vem SEMPRE da sessão do Supabase A | SHIELD_AGENT |
| 4 | Supabase A nunca recebe dados de estratégia | INTEGRATOR_EXPERT |
| 5 | Supabase B nunca sabe quem é o cliente — só armazena o uid | INTEGRATOR_EXPERT |

---

## Checklist de Validação

- [ ] Variáveis `VITE_ORACLE_SUPABASE_URL` e `VITE_ORACLE_SUPABASE_ANON_KEY` adicionadas ao `.env.local`
- [ ] SQL executado no Supabase B — schema `hft_lake` criado
- [ ] `hft_raw_metrics` populada pelo Oráculo (Camada A)
- [ ] `vw_grade_unificada` retorna dados com `strategy_id_lake`
- [ ] `client_strategy_config` aceita upsert via anon key
- [ ] `vw_sinais_autorizados` acessível pelo Sniper na VPS
- [ ] `StrategySelector` renderiza a grade sem erros no console
- [ ] Toggle ON/OFF persiste no Supabase B

---

## Monitoramento de Erros (@DEBUG_SENTINEL)

Prefixos de log no console:
```
[ORACLE]          — supabase-oracle.ts: inicialização e conexão
[useClientId]     — hook de identidade
[StrategySelector][GRADE]   — busca da grade
[StrategySelector][CONFIG]  — busca da config do cliente
[StrategySelector][TOGGLE]  — upsert de toggle
```
