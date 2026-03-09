# 📂 Briefing do Sistema: Black Bots [Secret]
**Ecossistema Million Bots**

---

## 1. Visão Geral do Produto

É um motor institucional de opções binárias (Índices Sintéticos da Deriv) focado puramente em **Probabilidade Temporal** e **Recorrência de Ciclos**.

Indicadores técnicos tradicionais (RSI, Médias) foram abandonados. O mercado é tratado como um algoritmo que repete padrões baseados no relógio. Se o R_100 fechou verde às 14:30 em 28 dos últimos 30 dias, uma entrada é agendada para o mesmo horário no dia seguinte. A ferramenta de cobertura de variância é o **Martingale 2**, usado sob rigorosa prova estatística (Win Rate G2 > 88%).

---

## 2. Arquitetura de 3 Camadas (Separação de Risco)

O sistema foi desenhado para latência quase zero e segurança máxima (IP do cliente protegido).

### Camada A — O Oráculo (PC Local do Admin)

- Roda uma vez ao dia, offline
- Baixa 400.000 velas (30 dias) de todos os ativos
- Minera, agrupa por horário (HH:MM) e testa as variações (V1 a V7)
- **Output:** Atualiza o banco Supabase (`oracle_results`) com a grade horária e gera um `config.json`

### Camada B — O Sniper (VPS 24/7)

- Robô "burro" e extremamente rápido
- Lê a agenda do `config.json` e fica em standby
- No segundo `:50` do minuto anterior ao horário agendado, dispara um aviso para a nuvem
- **Output:** Faz um `INSERT` na tabela `signals` do Supabase

### Camada C — O Executor (Front-end do Cliente / Million Bots)

- Ouve o Supabase via WebSocket Realtime
- Quando o sinal chega, o próprio navegador do cliente usa o token da Deriv salvo localmente para disparar a ordem
- O IP do cliente é sempre preservado

---

## 3. Produto e Experiência do Usuário (UX)

O cliente final não escolhe ativos soltos ou estratégias complexas. O front-end mascara a complexidade estatística através de **"Personas de Bots"**:

- **ORACLE QUANTUM** — Entradas puras de horário (V1/V4) nos ativos de volatilidade; sinais raros, altíssima assertividade
- **BUG DERIV** — Quebra de sequências de cores (MHI - V2); maior volume de entradas
- **EFEITO MIDAS** — Agressivo, focado na recuperação de Crash/Boom

A UI do front-end apenas mapeia qual `variacao` ou `ativo` pertence a qual botão ativado pelo cliente.

---

## 4. Responsabilidades do Front-end (TypeScript/React)

O código client-side é o verdadeiro responsável pelo dinheiro. Ele tem **3 funções críticas inegociáveis**:

### 4.1 Escuta de Latência Zero

- Usar `@supabase/supabase-js` assinando o canal de `INSERT` da tabela `hft_quant.signals`
- Ao receber o sinal, processar em **menos de 50ms**

### 4.2 Ponte de Execução e IP Local

- A ordem para a Deriv (`wss://ws.binaryws.com`) **DEVE** partir do navegador do cliente
- Isso evita Rate Limits na VPS do administrador e garante que a operação saia do IP residencial do usuário

### 4.3 Motor de Gale e Gestão de Risco Local

- A VPS envia apenas o gatilho da 1ª entrada
- O front-end executa a 1ª ordem e aguarda 1 minuto
- Se a Deriv retornar `LOSS` → calcula nova stake (`×2.2`) e dispara **Gale 1**
- Se `LOSS` novamente → dispara **Gale 2** (`×5.0`)
- **Stop Loss / Take Profit:** antes de qualquer disparo, o front-end checa as variáveis globais da conta; se a meta foi atingida, o sinal do Supabase é ignorado

---

## 5. Contrato de Dados (Supabase Schema)

**Tabela:** `signals` — Evento de `INSERT` capturado pelo front-end via Realtime

### Ação do Front-end ao receber `PRE_SIGNAL` no segundo `:50`

1. Preparar a conexão com a Deriv
2. Exibir alerta visual: `"Preparando entrada…"`
3. Agendar a ordem exata para o segundo `:00`

---

## 6. Regras Absolutas de Desenvolvimento

⛔ **NUNCA** coloque a lógica de disparo de ordens financeiras no lado do servidor (VPS) para os clientes.

⛔ **NUNCA** misture as tabelas do Oracle Quant com o banco de dados antigo do Million Bots. Use separação lógica no código.

✅ **Tratamento de Erros:** Se o WebSocket da Deriv cair no lado do cliente durante um Gale, o front-end deve tentar reconectar imediatamente e resgatar a cotação para não perder a série.
