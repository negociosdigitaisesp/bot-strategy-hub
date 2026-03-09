agora preciso do task.md

Aqui está o `TASK.md` completo e atualizado com tudo que foi definido nas 3 camadas:

***

## TASK.md

```markdown
# TASK — Hacbot Ruso · Página de Sinal em Tempo Real

## Objetivo
Adicionar a página de sinal do VA MOD RU ao SaaS existente.
O frontend exibe APENAS CALL ou PUT.
Todo o processamento (padrões + S/R) acontece no backend.

---

## Escopo Fechado

### ✅ Será feito
- sr_engine.py → detecção de S/R interna via Pivot Points + Fractais
- padroes.py → lógica dos 4 padrões com filtro de S/R
- vamod_scraper.py → Playwright lendo T, V, POC, Escadinha + preço/H/L/C
- websocket.py → room isolado por user_id
- Página de sinal no SaaS (1 componente/página nova)

### ❌ Não será feito nesta task
- Histórico de sinais
- API externa de S/R (100% interno)
- Múltiplos ativos simultâneos (começa com 1)
- Deploy em VPS (valida local primeiro)
- Alteração de qualquer arquivo existente do SaaS

---

## Critérios de Aceite (Definition of Done)

### Backend
- [ ] Playwright abre o VA MOD RU e lê T, V, POC, Escadinha
      a cada tick sem abrir nova instância por leitura
- [ ] scraper também coleta: preço atual, High, Low, Close
      (necessário para o sr_engine calcular S/R)
- [ ] sr_engine calcula Pivot Points + Fractais com histórico
      mínimo de 20 candles antes de emitir contexto
- [ ] sr_engine retorna tipo (SUPORTE/RESISTÊNCIA/NEUTRO),
      força (FORTE/FRACO) e distância percentual
- [ ] padroes.py detecta corretamente os 4 padrões
- [ ] Padrão com < 3 confluências → descartado silenciosamente
- [ ] Padrão 3 sem S/R confirmado → descartado
- [ ] Padrão 4 sem S/R confirmado → descartado (obrigatório)
- [ ] FastAPI sobe em localhost:8000 sem erro
- [ ] WebSocket emite sinal em < 500ms após detecção
- [ ] Rooms isolados: user A não recebe sinal do user B

### Frontend
- [ ] Página acessível na rota /sinal (ou equivalente do SaaS)
- [ ] Exibe estado "Aguardando..." ao abrir
- [ ] Sinal CALL aparece em verde (#00C853)
- [ ] Sinal PUT aparece em vermelho (#D50000)
- [ ] Sinal atualiza sem refresh de página
- [ ] Reconecta automaticamente em < 3s se WebSocket cair
- [ ] Indicador de status de conexão visível discretamente
- [ ] Funciona em mobile (375px mínimo)
- [ ] Visual consistente com o design system do SaaS existente
- [ ] Zero erros no console do browser

### Testes
- [ ] test_padroes.py: todos os 4 padrões com 3+ confluências → emite
- [ ] test_padroes.py: todos os padrões com 2 confluências → descarta
- [ ] test_sr.py: Pivot Points calculados corretamente
- [ ] test_sr.py: Fractal detectado em janela de 5 candles
- [ ] test_sr.py: clustering agrupa níveis com diferença < 0.15%
- [ ] test_websocket.py: latência < 500ms
- [ ] test_websocket.py: isolamento por user_id confirmado

---

## Etapas em Ordem de Execução

### Etapa 1 — Mapeamento do DOM (humano + Gemini)
```
Responsável: Gemini CLI + Miguel
Ação: Abrir VA MOD RU com DevTools → inspecionar e mapear:
  - Seletor CSS/XPath do indicador T
  - Seletor CSS/XPath do indicador V
  - Seletor CSS/XPath do POC
  - Seletor CSS/XPath da Escadinha
  - Seletor do preço atual, High, Low, Close do candle
Output: config.py com VAMOD_SELECTORS preenchido
Blocker: nada começa sem isso
```

### Etapa 2 — sr_engine.py (Clone SR + Codex)
```
Responsável: Clone SR → Codex executa
Input: config.py com seletores prontos
Lógica a implementar:

  # Pivot Point Clássico
  PP  = (High + Low + Close) / 3
  R1  = (2 * PP) - Low
  S1  = (2 * PP) - High
  R2  = PP + (High - Low)
  S2  = PP - (High - Low)

  # Fractal de 5 candles
  fractal_high = candle[1].high > max(candle[0..1].high, candle[3..4].high)
  fractal_low  = candle[1].low  < min(candle[0..1].low,  candle[3..4].low)

  # Clustering
  agrupa niveis com diferença < 0.15% → zona única

  # Output obrigatório
  {
    "nivel_proximo": float,
    "tipo": "SUPORTE" | "RESISTENCIA" | "NEUTRO",
    "forca": "FORTE" | "FRACO",
    "distancia_pct": float,
    "toques": int
  }

Teste imediato: test_sr.py deve passar antes da etapa 3
```

### Etapa 3 — vamod_scraper.py (Clone Backend + Codex)
```
Responsável: Clone Backend → Codex executa
Input: config.py com seletores mapeados na etapa 1
Regras:
  - Reutiliza a mesma instância Playwright (não recria por tick)
  - Coleta: T, V, POC, Escadinha, preço, High, Low, Close
  - Se DOM retornar vazio → loga em WARNING, não crasha
  - Se seletor quebrar → loga seletor específico + HTML atual
  - Frequência: a cada tick do VA MOD (evento de mudança no DOM)
Output: dicionário padronizado por tick
  {
    "t": str,          # valor do indicador T
    "v": str,          # valor do indicador V
    "poc": float,      # nível do POC
    "escadinha": bool, # presente ou não
    "preco": float,
    "high": float,
    "low": float,
    "close": float,
    "timestamp": str
  }
```

### Etapa 4 — padroes.py (Clone Backend + Codex)
```
Responsável: Clone Backend → Codex executa
Input: dicionário do scraper + output do sr_engine
Lógica:
  Padrão 1 — Continuidade
  Padrão 2 — Fraqueza Contrária
  Padrão 3 — Absorção/Reversão (exige SR confirmado)
  Padrão 4 — Rompimento       (exige SR obrigatório)

Filtro universal:
  if confluencias < 3: return None
  if padrao in [2][3] and sr.tipo == "NEUTRO": return None

Output se válido:
  {
    "ativo": str,
    "timeframe": "M1",
    "direcao": "CALL" | "PUT",
    "padrao": int,
    "confluencias": int,
    "assertividade": "ALTA" | "MUITO ALTA",
    "contexto": str,
    "horario": str
  }

Output se inválido: None (silencioso)
Teste imediato: test_padroes.py deve passar antes da etapa 5
```

### Etapa 5 — main.py + websocket.py (Clone Backend + Claude Code)
```
Responsável: Clone Backend → Claude Code orquestra
Input: padroes.py retornando sinal válido
Lógica:
  - FastAPI inicia o loop do scraper como background task
  - A cada sinal válido → broadcast para room do user_id
  - Room vazio → não faz nada
  - WebSocket path: ws://localhost:8000/ws/{user_id}
  - Reconexão automática: cliente tenta a cada 3s
Teste: test_websocket.py valida latência e isolamento
```

### Etapa 6 — Página de Sinal (Clone Frontend + Antigravity)
```
Responsável: Clone Frontend → Antigravity executa e testa
Input: websocket rodando + design system do SaaS existente

Antigravity faz em sequência:
  1. Lê os componentes existentes do SaaS → identifica padrão visual
  2. Cria a página replicando o padrão encontrado
  3. Conecta ao WebSocket ws://localhost:8000/ws/{user_id}
  4. Implementa estados: aguardando / call / put / reconectando / erro
  5. Abre o browser → navega até /sinal
  6. Valida: estado inicial "Aguardando..." visível
  7. Simula recebimento de sinal CALL via WebSocket
  8. Valida: cor verde + texto "CALL" apareceram
  9. Simula sinal PUT
  10. Valida: cor vermelha + texto "PUT" apareceram
  11. Derruba o WebSocket forçadamente
  12. Valida: reconexão em < 3s
  13. Testa em viewport 375px (mobile)
  14. Tira screenshot de cada etapa como artifact

Entrega: página funcionando + screenshots de evidência
```

### Etapa 7 — Quality Gate (humano — Miguel)
```
Responsável: Miguel
Checklist:
  - Todos os testes unitários passando (pytest -v)
  - Screenshots do Antigravity aprovadas
  - Sinal CALL aparece verde na sua tela
  - Sinal PUT aparece vermelho na sua tela
  - Latência parece instantânea visualmente
  - Mobile ok no próprio celular

Aprovado → fecha a task → avança para histórico de sinais
Reprovado → abre issue específica para o Clone responsável
```

---

## Agente por Etapa (resumo)

| Etapa | Agente Executor | Clone Consultado |
|-------|-----------------|------------------|
| 1 — DOM mapping   | Gemini CLI      | —                |
| 2 — sr_engine.py  | Codex           | Clone SR         |
| 3 — scraper.py    | Codex           | Clone Backend    |
| 4 — padroes.py    | Codex           | Clone Backend    |
| 5 — main.py + ws  | Claude Code     | Clone Backend    |
| 6 — Página sinal  | Antigravity     | Clone Frontend   |
| 7 — Quality Gate  | Miguel (humano) | Clone QA         |

---

## Estrutura Final de Arquivos desta Task

```
hacbot-ruso/
├── backend/
│   ├── config.py               ← seletores + env vars
│   ├── scraper/
│   │   └── vamod_scraper.py
│   ├── engine/
│   │   ├── padroes.py
│   │   └── sr_engine.py        ← S/R interno
│   └── api/
│       ├── main.py
│       └── websocket.py
├── frontend/
│   └── pages/
│       └── Sinal.jsx           ← (ou equivalente do SaaS)
├── tests/
│   ├── test_padroes.py
│   ├── test_sr.py
│   └── test_websocket.py
├── clones/
│   ├── clone_backend.md
│   ├── clone_sr.md
│   ├── clone_frontend.md
│   └── clone_qa.md
└── .mcp.json                   ← Gemini, Codex, Antigravity conectados
```

---

## Blocker Atual

> ⛔ A Etapa 1 (mapeamento do DOM) é o único blocker real.
> Nenhum agente consegue escrever o scraper sem os seletores reais
> do VA MOD RU. Tudo mais já está definido e pronto pra rodar.
```

***

Todos os documentos das 3 camadas estão prontos agora:

| Arquivo | Status |
|---|---|
| `PROJETO.md` | ✅ |
| `brandbook.md` | ✅ |
| `processos.md` (com os 4 padrões) | ✅ |
| `taxonomia.md` | ✅ |
| `clone_backend.md` | ✅ |
| `clone_sr.md` | ✅ |
| `clone_frontend.md` | ✅ |
| `clone_qa.md` | ✅ |
| `sou.md` | ✅ |
| `TASK.md` | ✅ |

O único próximo passo humano é a **Etapa 1** — abrir o VA MOD RU no DevTools e mapear os seletores. Quer fazer isso agora?

Citações:
[1] AIOX Squad: Ele pagou R$60K por isso. A IA fez em 3 horas. https://www.youtube.com/watch?v=WZPyIbxjNHc
[2] Alan Nicolas - YouTube https://www.youtube.com/channel/UCS8o8k_cwOFKg7Qn-j218IA/videos
[3] AIOX Squad: Construa seu Exército de IA e Escale seus Lucros em até 10x https://www.youtube.com/watch?v=pqtLLYyztc8

