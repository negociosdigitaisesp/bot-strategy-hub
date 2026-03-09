# PRD_FRONTEND.md — Execution Bridge & Dashboard

**Projeto:** Black Bots [Secret] / Ecossistema Million Bots
**Papel da IA:** Arquiteto Front-end Sênior (React / Next.js / TypeScript)

---

> ⚠️ **INSTRUÇÃO DE CONTEXTO ESTREITO PARA A IA**
> Leia este documento inteiramente antes de propor qualquer código.
> Este não é um app web tradicional. É um **Terminal HFT (High Frequency Trading) Client-Side**. Latência e gestão de estado são críticos. **NUNCA** coloque lógicas de disparo de ordem em rotas de backend (Server-side).

---

## 1. Visão Geral da Arquitetura (A Sua Camada)

O sistema opera em 3 camadas. Você é responsável **APENAS pela Camada C**:

- **Camada A (Offline):** Oráculo que acha os padrões e salva no banco.
- **Camada B (VPS):** Sniper que vigia o relógio e manda um `INSERT` pro Supabase no segundo `:50`.
- 👉 **CAMADA C (Você):** Ouve o Supabase via Realtime, mostra a interface para o cliente e dispara a ordem diretamente do navegador do cliente para a corretora (Deriv).

---

## 2. Regras Absolutas de Desenvolvimento (Anti-Vibe Coding)

⛔ **ZERO SERVER-SIDE TRADING:** As ordens para a API da Deriv (`wss://ws.binaryws.com`) **DEVEM OBRIGATORIAMENTE** partir do Client-Side (Navegador do usuário). O token da Deriv do cliente fica no `localStorage` ou state local. Isso protege a VPS do admin contra Rate Limits e usa o IP residencial do cliente.

⛔ **ISOLAMENTO DE BANCO:** Não misture as tabelas do Oracle Quant com o sistema legado do Million Bots.

✅ **LATÊNCIA ZERO:** Use `@supabase/supabase-js` para assinar o canal de `INSERT`. A reação do front-end ao sinal deve ocorrer em **< 50ms**.

✅ **TRATAMENTO DE ERROS DE WS:** Se o WebSocket da Deriv cair no meio de uma série de Gale, o front-end deve tentar reconectar em loop quase instantâneo para não perder o timing da próxima entrada.

---

## 3. Produto e Experiência do Usuário (UX "Glass-Box")

O cliente final não escolhe "Ativo: R_100, Estratégia: V1". O Front-end mascara a complexidade através de **Personas de Bots**. O código TS deve mapear os sinais recebidos para os bots ativados pelo usuário.

### As Personas (Bots)

- **ORACLE QUANTUM:** Filtra apenas sinais puros de horário (V1/V4) nos ativos de volatilidade. Promessa: Sinais raros, altíssima assertividade.
- **BUG DERIV:** Filtra sinais de MHI/Quebra de cor (V2). Promessa: Maior volume.
- **EFEITO MIDAS:** Filtra ativos Crash/Boom (Drift). Promessa: Agressividade.

### Transparência Total (O Diferencial)

Ao clicar em um Bot, a UI deve renderizar a tabela consumindo os dados da tabela `hft_oracle_results`. O cliente deve ver a **matemática crua**:

> Ex: `R_100 | 14:30 | N=30 | Win 1ª: 20 | Win G1: 8 | Hit: 1 | WR: 96%`

---

## 4. O Motor de Execução e Gestão de Risco (O Cérebro do Client)

A lógica financeira real mora no arquivo TypeScript de execução (ex: `ExecutionBridge.ts`).

### 4.1. O Fluxo do Tempo (Cronograma de Entrada)

1. **Segundo `:50`:** Supabase emite evento `INSERT` com `status PRE_SIGNAL`.
2. O Front-end capta o sinal, verifica se o Bot correspondente está **"ON"** na UI do usuário.
3. **Check de Risco Global:** O TS verifica o Stop Loss e Take Profit diário do cliente. Se a meta bateu, ignora o sinal silenciosamente.
4. Se liberado, a UI mostra: `"Preparando entrada…"`. Abre o WebSocket com a Deriv.
5. **Segundo `:00`:** O Front-end envia o payload de `BUY` para a Deriv com a Stake Inicial.

### 4.2. O Motor de Martingale 2 (Local)

> A VPS **NÃO** manda sinal de Gale. É o TypeScript do cliente que gerencia o ciclo.

1. Espera a expiração (ex: 1 minuto).
2. Lê o resultado do contrato via Deriv WS.
3. Se **WIN** → Toca som de vitória, salva lucro no state local, encerra ciclo.
4. Se **LOSS** → O TypeScript calcula `Stake * 2.2` e dispara o **Gale 1** imediatamente no segundo `:00` da nova vela.
5. Se **LOSS no G1** → Calcula `Stake * 5.0` e dispara o **Gale 2** imediatamente.
6. Se **LOSS no G2** → Registra o HIT, aplica o prejuízo no daily loss.

---

## 5. Contrato de Dados (Schema Cache)

A IA deve usar este mapeamento para tipar as interfaces TS.

### Tabela Base de Inteligência: `public.hft_oracle_results`

> Usada para popular o visual do Dashboard Glass-box.

```sql
CREATE TABLE public.hft_oracle_results (
  id             bigserial    not null primary key,
  strategy_id    text         null unique,
  ativo          text         not null,
  estrategia     text         not null,
  win_rate       numeric      not null,
  n_amostral     integer      not null,
  ev_real        numeric      not null,
  edge_vs_be     numeric      not null,
  status         text         not null, -- 'APROVADO', 'CONDICIONAL'
  win_rate_gale1 numeric      null,
  ev_gale1       numeric      null,
  config_otimizada jsonb      null,     -- Detalhes da variacao
  sizing_override  numeric    null,     -- 1.0 ou 0.5
  last_update    timestamp    default now()
);
