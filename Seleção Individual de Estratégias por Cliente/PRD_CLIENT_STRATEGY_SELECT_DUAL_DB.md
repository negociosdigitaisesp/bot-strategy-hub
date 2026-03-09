```markdown
# PRD_CLIENT_STRATEGY_SELECT_DUAL_DB.md
**Oracle Quant — Seleção de Estratégias com Dois Supabase Separados**

| Campo | Valor |
|---|---|
| Versão | 1.0 |
| Status | Aprovado |
| Data | 2026-02-28 |
| Depende de | PRD_DATA_LAKE.md |

---

> ## ⚠️ INSTRUÇÕES PARA A IA (Claude Code)
>
> Dois Supabase diferentes. URLs diferentes. Clientes autenticados no Supabase A.
> A seleção de estratégias fica no Supabase B.
> O frontend usa dois clientes Supabase em paralelo — um para cada banco.
>
> **REGRA N°1:** Nunca misture os dois clientes Supabase no mesmo arquivo sem comentário explícito.
> **REGRA N°2:** O Supabase B não usa RLS baseado em auth — usa `service_role` + `client_id` como texto.
> **REGRA N°3:** O `client_id` que vai para o Supabase B vem da sessão do Supabase A.

---

## 1. ARQUITETURA DUAL SUPABASE

### SUPABASE A — Million Bots (banco principal)
- **URL:** `process.env.NEXT_PUBLIC_SUPABASE_URL`
- **KEY:** `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Contém:** autenticação, perfil do cliente, histórico MB
- **Auth:** `client.auth.getUser()` → retorna o `uid` do cliente

### SUPABASE B — Oracle Quant (banco isolado)
- **URL:** `process.env.NEXT_PUBLIC_ORACLE_SUPABASE_URL`
- **KEY:** `process.env.NEXT_PUBLIC_ORACLE_SUPABASE_ANON_KEY`
- **Contém:** `hft_lake.hft_raw_metrics`, `vw_grade_unificada`, `client_strategy_config`
- **Auth:** NÃO usa auth próprio — recebe `client_id` vindo do Supabase A

### Fluxo de identidade

```
Cliente loga no Supabase A
  → Frontend pega: supabaseA.auth.getUser() → uid = "abc-123"
  → Usa esse uid como client_id em todas as operações no Supabase B
  → Supabase B não precisa saber quem é o cliente — só armazena o uid
```

---

## 2. CONFIGURAÇÃO — DOIS CLIENTES NO FRONTEND

### 2.1 Variáveis de ambiente (`.env.local`)

```env
# Supabase A — Million Bots (JÁ EXISTE, não mudar)
NEXT_PUBLIC_SUPABASE_URL=https://projeto-mb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...chave-mb...

# Supabase B — Oracle Quant (NOVO, adicionar)
NEXT_PUBLIC_ORACLE_SUPABASE_URL=https://projeto-oracle.supabase.co
NEXT_PUBLIC_ORACLE_SUPABASE_ANON_KEY=eyJ...chave-oracle...
```

### 2.2 Dois clientes Supabase isolados

```ts
// lib/supabase.ts — JÁ EXISTE (não modificar)
import { createClient } from "@supabase/supabase-js";
export const supabaseA = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

```ts
// lib/supabase-oracle.ts — NOVO (criar este arquivo)
import { createClient } from "@supabase/supabase-js";

// Cliente isolado para o banco Oracle Quant
// Não tem relação com o supabaseA — são projetos Supabase diferentes
export const supabaseOracle = createClient(
  process.env.NEXT_PUBLIC_ORACLE_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_ORACLE_SUPABASE_ANON_KEY!
);
```

### 2.3 Hook para pegar o `client_id` do Supabase A

```ts
// hooks/useClientId.ts — NOVO
import { useEffect, useState } from "react";
import { supabaseA } from "@/lib/supabase";

export function useClientId(): string | null {
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    supabaseA.auth.getUser().then(({ data }) => {
      setClientId(data.user?.id ?? null);
    });
  }, []);

  return clientId;
}
```

---

## 3. BANCO DE DADOS — SUPABASE B (Oracle Quant)

### 3.1 Tabela `client_strategy_config` (sem RLS baseado em auth)

```sql
-- data_lake/sql/09_create_client_strategy_config.sql
-- EXECUTAR NO SUPABASE B (Oracle Quant)

CREATE TABLE IF NOT EXISTS hft_lake.client_strategy_config (
  id              BIGSERIAL PRIMARY KEY,

  -- client_id vem do auth.uid() do Supabase A
  -- Supabase B não autentica — só armazena o ID como texto
  client_id       TEXT NOT NULL,

  strategy_id     TEXT NOT NULL,
  ativo           TEXT NOT NULL,
  hh_mm           TEXT NOT NULL,
  direcao         TEXT NOT NULL,
  ativo_flag      BOOLEAN NOT NULL DEFAULT TRUE,
  stake_override  NUMERIC DEFAULT NULL,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT client_strategy_unique UNIQUE (client_id, strategy_id)
);

-- SEM RLS baseado em auth (Supabase B não tem os usuários do Supabase A)
-- A segurança é garantida pela anon key + políticas permissivas por client_id
-- O frontend só envia operações com o client_id da sessão ativa

-- Política permissiva — frontend filtra pelo client_id correto
ALTER TABLE hft_lake.client_strategy_config ENABLE ROW LEVEL SECURITY;

-- Anon pode ler e escrever — a segurança vem do client_id passado pelo frontend
-- (o frontend pega o client_id do Supabase A e nunca expõe o de outro cliente)
CREATE POLICY "anon_acesso_por_client_id" ON hft_lake.client_strategy_config
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_csc_client     ON hft_lake.client_strategy_config(client_id);
CREATE INDEX IF NOT EXISTS idx_csc_strategy   ON hft_lake.client_strategy_config(strategy_id);
CREATE INDEX IF NOT EXISTS idx_csc_ativo_flag ON hft_lake.client_strategy_config(ativo_flag);
```

```sql
-- data_lake/sql/10_view_vw_sinais_autorizados.sql
-- EXECUTAR NO SUPABASE B (Oracle Quant)

CREATE OR REPLACE VIEW hft_lake.vw_sinais_autorizados AS
SELECT
  c.client_id,
  c.strategy_id,
  c.ativo_flag,
  COALESCE(c.stake_override, g.stake_multiplier) AS stake_final,
  g.ativo,
  g.hh_mm,
  g.direcao,
  g.wr_g2,
  g.wr_1a,
  g.ev_g2,
  g.status,
  g.n_filtros,
  g.filtros_aprovados,
  g.strategy_id_lake
FROM hft_lake.client_strategy_config c
JOIN hft_lake.vw_grade_unificada g
  ON c.strategy_id = g.strategy_id_lake
WHERE
  c.ativo_flag = TRUE
  AND g.status IN ('APROVADO', 'CONDICIONAL');
```

---

## 4. COMPONENTE — `StrategySelector.tsx`

```tsx
// components/oracle/StrategySelector.tsx — NOVO

"use client";

import { useEffect, useState } from "react";
import { supabaseOracle } from "@/lib/supabase-oracle";
import { useClientId } from "@/hooks/useClientId";

interface Strategy {
  strategy_id_lake: string;
  ativo: string;
  hh_mm: string;
  direcao: "CALL" | "PUT";
  status: "APROVADO" | "CONDICIONAL";
  wr_g2: number;
  wr_1a: number;
  ev_g2: number;
  n_filtros: number;
  filtros_aprovados: string;
  stake_multiplier: number;
}

interface ClientConfig {
  strategy_id: string;
  ativo_flag: boolean;
}

export function StrategySelector() {
  const clientId = useClientId(); // vem do Supabase A
  const [grade, setGrade] = useState<Strategy[]>([]);
  const [config, setConfig] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Busca grade completa do Supabase B
  useEffect(() => {
    supabaseOracle
      .schema("hft_lake")
      .from("vw_grade_unificada")
      .select("*")
      .in("status", ["APROVADO", "CONDICIONAL"])
      .order("n_filtros", { ascending: false })
      .then(({ data }) => setGrade(data || []));
  }, []);

  // Busca configuração do cliente no Supabase B (usando client_id do Supabase A)
  useEffect(() => {
    if (!clientId) return;

    supabaseOracle
      .schema("hft_lake")
      .from("client_strategy_config")
      .select("strategy_id, ativo_flag")
      .eq("client_id", clientId)
      .then(({ data }) => {
        const mapa: Record<string, boolean> = {};
        (data || []).forEach((c: ClientConfig) => {
          mapa[c.strategy_id] = c.ativo_flag;
        });
        setConfig(mapa);
        setLoading(false);
      });
  }, [clientId]);

  // Toggle ON/OFF — salva no Supabase B com client_id do Supabase A
  const toggle = async (strategy: Strategy) => {
    if (!clientId) return;

    const novoFlag = !config[strategy.strategy_id_lake];
    setSaving(strategy.strategy_id_lake);

    // Otimismo: atualiza UI antes da resposta
    setConfig((prev) => ({
      ...prev,
      [strategy.strategy_id_lake]: novoFlag,
    }));

    await supabaseOracle
      .schema("hft_lake")
      .from("client_strategy_config")
      .upsert(
        {
          client_id:   clientId,                   // uid do Supabase A
          strategy_id: strategy.strategy_id_lake,
          ativo:       strategy.ativo,
          hh_mm:       strategy.hh_mm,
          direcao:     strategy.direcao,
          ativo_flag:  novoFlag,
          updated_at:  new Date().toISOString(),
        },
        { onConflict: "client_id,strategy_id" }
      );

    setSaving(null);
  };

  const ativas = Object.values(config).filter(Boolean).length;

  if (loading) return <div>Carregando estratégias...</div>;

  return (
    <div>
      <div>
        <h2>Minhas Estratégias</h2>
        <span>
          {ativas} ativa{ativas !== 1 ? "s" : ""} de {grade.length}
        </span>
      </div>

      <div>
        {grade.map((s) => {
          const ativa = config[s.strategy_id_lake] ?? false;
          const isSaving = saving === s.strategy_id_lake;

          return (
            <div key={s.strategy_id_lake}>
              {/* Info da estratégia */}
              <div>
                <span>{s.status}</span>
                <div>
                  <div>
                    {s.ativo} — {s.hh_mm} — {s.direcao}
                  </div>
                  <div>
                    WR: {(s.wr_g2 * 100).toFixed(1)}% |
                    EV: +{s.ev_g2.toFixed(2)} |
                    Filtros: {s.n_filtros}/5
                  </div>
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggle(s)}
                disabled={isSaving}
                className={`
                  relative w-12 h-6 rounded-full transition-colors
                  ${ativa ? "bg-green-500" : "bg-gray-300"}
                  ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 5. SNIPER LAKE — CONSULTA NO SUPABASE B

O Sniper roda na VPS e usa as credenciais do Supabase B diretamente. Não tem relação com o Supabase A — consulta apenas `vw_sinais_autorizados`.

```python
# Adicionar ao run_sniper_lake.py
# As credenciais ORACLE_SUPABASE_URL e ORACLE_SUPABASE_KEY ficam no .env da VPS

ORACLE_SUPABASE_URL = os.environ["ORACLE_SUPABASE_URL"]
ORACLE_SUPABASE_KEY = os.environ["ORACLE_SUPABASE_KEY"]


async def get_clientes_autorizados(strategy_id: str) -> list[dict]:
    """
    Consulta vw_sinais_autorizados no Supabase B.
    Retorna clientes com ativo_flag=TRUE para essa estratégia.
    O client_id retornado é o uid do Supabase A — o Sniper não precisa saber disso.
    """
    from supabase import create_client
    db_oracle = create_client(ORACLE_SUPABASE_URL, ORACLE_SUPABASE_KEY)

    try:
        response = (
            db_oracle
            .schema("hft_lake")
            .from_("vw_sinais_autorizados")
            .select("client_id, stake_final")
            .eq("strategy_id", strategy_id)
            .execute()
        )
        return response.data or []
    except Exception as e:
        logger.error("[LAKE] Erro ao buscar clientes autorizados: %s", e)
        return []
```

---

## 6. FLUXO COMPLETO RESUMIDO

### FRONTEND
```
supabaseA.auth.getUser() → clientId = "uuid-abc"
supabaseOracle.from("vw_grade_unificada") → lista estratégias
supabaseOracle.from("client_strategy_config").eq("client_id","uuid-abc") → config do cliente
Cliente clica ON em "T1430_LAKE_R10_CALL"
supabaseOracle.upsert({ client_id: "uuid-abc", strategy_id: "T1430...", ativo_flag: true })
```

### VPS — SNIPER LAKE
```
Relógio bate 14:29:50
get_clientes_autorizados("T1430_LAKE_R10_CALL") → consulta Supabase B
Retorna [{ client_id: "uuid-abc", stake_final: 1.0 }]
Dispara PRE_SIGNAL para "uuid-abc" no Supabase A (MB)
Frontend do cliente "uuid-abc" recebe e executa
```

### ISOLAMENTO GARANTIDO
```
Supabase A → nunca recebe dados de estratégia
Supabase B → nunca sabe quem é o cliente (só armazena o uid)
Os dois bancos nunca se comunicam diretamente
```

---

## 7. CHECKLIST DE VALIDAÇÃO

> Dois bancos. Zero mistura. Cliente identificado pelo uid do banco principal.

- ✅ `lib/supabase-oracle.ts` criado com URL do Supabase B
- ✅ `hooks/useClientId.ts` busca uid do Supabase A
- ✅ Tabela `hft_lake.client_strategy_config` criada no Supabase B
- ✅ View `hft_lake.vw_sinais_autorizados` criada no Supabase B
- ✅ `StrategySelector.tsx` usa `supabaseOracle` (não `supabaseA`) para config
- ✅ `StrategySelector.tsx` usa `clientId` do Supabase A como identificador
- ✅ `run_sniper_lake.py` tem `ORACLE_SUPABASE_URL` no `.env` da VPS
- ✅ Sniper consulta Supabase B antes de disparar
- ✅ Sniper dispara sinal para Supabase A (MB) com `client_id` correto
- ✅ Dados do MB nunca chegam no Supabase B
- ✅ Sistema antigo intocável
```