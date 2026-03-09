
## 📁 ARQUITETURA

```
hacbot-ruso/
├── backend/
│   ├── config.py                  ← seletores DOM + env vars (preencher na etapa 1)
│   ├── database.py                ← conexão PostgreSQL (SaaS existente)
│   ├── scraper/
│   │   └── vamod_scraper.py       ← Playwright lendo T, V, POC, Escadinha, H, L, C
│   ├── engine/
│   │   ├── padroes.py             ← lógica dos 4 padrões + filtro confluências
│   │   └── sr_engine.py           ← S/R interno (Pivot Points + Fractais)
│   └── api/
│       ├── main.py                ← FastAPI app + background task do scraper
│       └── websocket.py           ← rooms isolados por user_id
│
├── frontend/
│   └── pages/
│       └── Sinal.jsx              ← única página nova (ou equivalente do SaaS)
│           └── components/
│               └── SinalCard.jsx  ← componente do sinal (CALL / PUT)
│
├── tests/
│   ├── test_padroes.py            ← testa os 4 padrões + filtros
│   ├── test_sr.py                 ← testa Pivot Points + Fractais + clustering
│   └── test_websocket.py          ← testa latência + isolamento por user
│
├── clones/
│   ├── clone_backend.md           ← DNA do engenheiro Python
│   ├── clone_sr.md                ← DNA do quant trader
│   ├── clone_frontend.md          ← DNA do UI minimalista
│   └── clone_qa.md                ← DNA do QA com mentalidade de trader
│
├── .mcp.json                      ← conecta Gemini CLI, Codex e Antigravity
├── .env.example                   ← variáveis de ambiente documentadas
├── requirements.txt
│
└── docs/
    ├── PROJETO.md
    ├── TASK.md
    ├── sou.md
    ├── brandbook.md
    ├── processos.md
    └── taxonomia.md
```

### Fluxo de dados (arquitetura viva)

```
VA MOD RU (browser)
        │
        ▼
vamod_scraper.py          ← Playwright (mesma instância, event-driven)
  coleta por tick:
  T, V, POC, Escadinha
  preço, High, Low, Close
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
sr_engine.py                            padroes.py
calcula S/R interno:                    detecta padrão 1, 2, 3 ou 4
Pivot Points + Fractais                 conta confluências
retorna tipo + força                    aplica filtro de SR
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
              sinal válido? (confluências >= 3 + contexto)
                   │               │
                  SIM              NÃO
                   │               │
                   ▼            descarta
           websocket.py         silencioso
      broadcast room user_id
                   │
                   ▼
          frontend /sinal
      SinalCard exibe: CALL ou PUT
      (todo o resto fica no backend)
```

***

## 📄 TASK.md

```markdown
# TASK — Hacbot Ruso · Página de Sinal em Tempo Real

## Objetivo
Adicionar a página de sinal do VA MOD RU ao SaaS existente.
Frontend exibe APENAS CALL ou PUT.
Todo processamento (padrões + S/R) acontece no backend.

---

## Escopo Fechado

### ✅ Será feito nesta task
- config.py com seletores DOM do VA MOD
- sr_engine.py — S/R 100% interno (Pivot Points + Fractais)
- vamod_scraper.py — Playwright lendo indicadores + OHLC
- padroes.py — 4 padrões com filtro de S/R
- main.py + websocket.py — FastAPI + rooms por user_id
- Sinal.jsx — página nova no SaaS (apenas 1 arquivo)

### ❌ Não entra nesta task
- Histórico de sinais
- API externa de S/R
- Múltiplos ativos simultâneos
- Deploy em VPS
- Qualquer alteração em arquivos existentes do SaaS

---

## Critérios de Aceite (Definition of Done)

### Backend
- [ ] Playwright abre VA MOD RU e lê os indicadores
      sem abrir nova instância por tick
- [ ] Scraper coleta: T, V, POC, Escadinha,
      preço atual, High, Low, Close
- [ ] sr_engine só emite contexto com >= 20 candles de histórico
- [ ] sr_engine retorna: tipo (SUPORTE/RESISTÊNCIA/NEUTRO),
      força (FORTE/FRACO), distância percentual, toques
- [ ] padroes.py detecta corretamente os 4 padrões
- [ ] Padrão com < 3 confluências → descarte silencioso
- [ ] Padrão 3 sem SR confirmado → descarte
- [ ] Padrão 4 sem SR confirmado → descarte obrigatório
- [ ] FastAPI sobe em localhost:8000 sem erro
- [ ] WebSocket emite sinal em < 500ms após detecção
- [ ] Rooms isolados: user A nunca recebe sinal de user B

### Frontend
- [ ] Página acessível na rota /sinal (ou equivalente do SaaS)
- [ ] Estado inicial: "Aguardando setup..."
- [ ] CALL → verde #00C853
- [ ] PUT  → vermelho #D50000
- [ ] Atualiza sem refresh de página
- [ ] Reconecta em < 3s se WebSocket cair
- [ ] Indicador de conexão discreto visível
- [ ] Funciona em mobile (mínimo 375px)
- [ ] Visual consistente com o SaaS existente
- [ ] Zero erros no console do browser

### Testes
- [ ] test_padroes.py: 4 padrões com 3+ confluências → emite
- [ ] test_padroes.py: qualquer padrão com 2 confluências → descarta
- [ ] test_padroes.py: padrão 3 e 4 sem SR → descartam
- [ ] test_sr.py: Pivot Points calculados corretamente
- [ ] test_sr.py: Fractal detectado em janela de 5 candles
- [ ] test_sr.py: clustering agrupa níveis com diff < 0.15%
- [ ] test_websocket.py: latência < 500ms confirmada
- [ ] test_websocket.py: isolamento por user_id confirmado

---

## Etapas em Ordem

| # | Etapa               | Executor         | Clone       | Blocker           |
|---|---------------------|------------------|-------------|-------------------|
| 1 | Mapeamento DOM      | Gemini + Miguel  | —           | ⛔ tudo depende disso |
| 2 | sr_engine.py        | Codex            | Clone SR    | Etapa 1           |
| 3 | vamod_scraper.py    | Codex            | Clone Backend| Etapa 1          |
| 4 | padroes.py          | Codex            | Clone Backend| Etapas 2 e 3     |
| 5 | main.py + ws        | Claude Code      | Clone Backend| Etapa 4          |
| 6 | Sinal.jsx           | Antigravity      | Clone Frontend| Etapa 5         |
| 7 | Quality Gate        | Miguel (humano)  | Clone QA    | Etapa 6           |

---

## Lógica Central das Etapas

### Etapa 2 — sr_engine.py
```python
# Pivot Point Clássico
PP  = (High + Low + Close) / 3
R1  = (2 * PP) - Low
S1  = (2 * PP) - High
R2  = PP + (High - Low)
S2  = PP - (High - Low)

# Fractal de 5 candles
fractal_high = candle[1].high > max(candles[2][3][4].high)
fractal_low  = candle[1].low  < min(candles[2][3][4].low)

# Clustering: agrupa níveis com diferença < 0.15%
# Output obrigatório:
{
  "nivel_proximo": float,
  "tipo": "SUPORTE" | "RESISTENCIA" | "NEUTRO",
  "forca": "FORTE" | "FRACO",
  "distancia_pct": float,
  "toques": int
}
```

### Etapa 3 — vamod_scraper.py
```python
# Output por tick:
{
  "t": str,           # indicador T
  "v": str,           # indicador V
  "poc": float,       # nível do POC
  "escadinha": bool,  # presente ou não
  "preco": float,
  "high": float,
  "low": float,
  "close": float,
  "timestamp": str
}
```

### Etapa 4 — padroes.py
```python
# Filtro universal
if confluencias < 3:
    return None  # silencioso

if padrao in [3][4] and sr.tipo == "NEUTRO":
    return None  # silencioso

# Output se válido:
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
```

### Etapa 6 — Antigravity testa sozinho
```
1. Lê componentes do SaaS → identifica padrão visual
2. Cria Sinal.jsx replicando o padrão
3. Conecta ws://localhost:8000/ws/{user_id}
4. Abre browser → valida "Aguardando..." visível
5. Simula CALL via WS → valida verde + texto
6. Simula PUT via WS  → valida vermelho + texto
7. Derruba WS forçadamente → valida reconexão < 3s
8. Testa mobile 375px
9. Screenshot de cada etapa como artifact
```

---

## Blocker Atual
> ⛔ Etapa 1 é o único desbloqueador real.
> Abrir VA MOD RU no DevTools e mapear os seletores
> de T, V, POC, Escadinha, preço, H, L, C.
> Nenhum agente começa sem o config.py preenchido.
```

***


## Estilo Frontend

```jsx
// ✅ Correto — segue o padrão do SaaS existente
// Antes de criar qualquer componente:
// 1. Leia 3 componentes existentes do SaaS
// 2. Identifique: naming, CSS, estrutura de props
// 3. Replique o padrão encontrado

// Cores imutáveis:
const COR_CALL = '#00C853'   // verde — nunca muda
const COR_PUT  = '#D50000'   // vermelho — nunca muda
const COR_NEUTRO = '#9E9E9E' // aguardando — nunca muda
```

**Regras:**
- Segue o framework do SaaS existente (React, Vue, HTML — o que tiver)
- Segue o CSS do SaaS existente (Tailwind, CSS module — o que tiver)
- Mobile-first: pensa em 375px antes de 1440px
- WebSocket: reconexão automática em 3s, sempre
- Polling: proibido — só push via WebSocket
- Sem biblioteca de UI nova sem aprovação de Miguel

---

## Estilo de Testes

```python
# ✅ Cada teste tem nome que descreve o comportamento
def test_padrao_1_call_com_3_confluencias_emite_sinal():
    ...

def test_padrao_1_com_2_confluencias_descarta_silencioso():
    ...

def test_padrao_4_sem_sr_descarta_obrigatorio():
    ...
```

**Regras:**
- Nome do teste descreve o comportamento esperado (não o método)
- Arrange → Act → Assert: sempre essa estrutura
- Um assert por teste — se precisar de dois, são dois testes
- Sem mock de regra de negócio — testa a lógica real
- test_padroes.py e test_sr.py devem passar antes de qualquer PR

---

## Padrão de Log

```python
import logging
log = logging.getLogger(__name__)

# Níveis obrigatórios:
log.debug("sinal descartado: confluencias=2, padrao=1")   # fluxo normal descartado
log.info("sinal emitido: CALL padrao=3 confluencias=4")   # sinal válido emitido
log.warning("seletor DOM vazio: %s", SELETOR_T)           # algo errado mas recuperável
log.error("scraper falhou: %s", str(e), exc_info=True)    # erro com stack trace
```

---

## Padrão de Commit

```
feat: adiciona sr_engine com pivot points e fractais
fix: corrige clustering de níveis com diff < 0.15%
test: adiciona teste de isolamento websocket por user_id
docs: atualiza taxonomia com definição de fractal
refactor: quebra detectar_padrao em funções menores
```

---

## O que NUNCA fazer

- ❌ Alterar arquivo existente do SaaS sem aprovação
- ❌ Instalar biblioteca nova sem listar e aguardar ok
- ❌ Hardcode de URL, seletor ou credencial
- ❌ Abrir nova instância Playwright por tick
- ❌ Fazer polling no frontend
- ❌ Enviar sinal sem validar confluencias >= 3
- ❌ Enviar padrão 3 ou 4 sem SR confirmado
- ❌ Capturar Exception sem log e re-raise
- ❌ Função com mais de 40 linhas
- ❌ PR sem testes passando

---

## Checklist antes de qualquer PR

- [ ] pytest -v rodando sem falha
- [ ] Nenhum arquivo existente do SaaS alterado
- [ ] Nenhum hardcode no código
- [ ] Log estruturado em todas as funções críticas
- [ ] TASK.md atualizado se algo mudou no escopo
```

***

## Status Final de todos os documentos

| Arquivo | Local no projeto | Status |
|---|---|---|
| `PROJETO.md` | `/docs/PROJETO.md` | ✅ |
| `TASK.md` | `/docs/TASK.md` | ✅ |
| `sou.md` | `/docs/sou.md` | ✅ |
| `brandbook.md` | `/docs/brandbook.md` | ✅ |
| `processos.md` | `/docs/processos.md` | ✅ |
| `taxonomia.md` | `/docs/taxonomia.md` | ✅ |
| `clone_backend.md` | `/clones/clone_backend.md` | ✅ |
| `clone_sr.md` | `/clones/clone_sr.md` | ✅ |
| `clone_frontend.md` | `/clones/clone_frontend.md` | ✅ |
| `clone_qa.md` | `/clones/clone_qa.md` | ✅ |

Pronto para a **Camada 4** — montar o squad no AIOX e rodar a primeira task. O único desbloqueador real continua sendo o mapeamento dos seletores DOM do VA MOD RU.

nao vou usar open claw

Entendido. O `sou.md` atualizado — sem qualquer referência ao Open Claw:

***

## 📄 sou.md

```markdown
# sou.md — Hacbot Ruso
# Identidade e Estilo do Time de Agentes

---

## Quem somos
Time de agentes construindo a página de sinal do Hacbot Ruso.
SaaS de Miguel Trader. Público: traders BR do VA MOD RU.
Missão: entregar CALL ou PUT na tela. Nada mais, nada menos.

---

## Regra Número 1
Não alteramos NADA do que já existe no SaaS.
Só criamos arquivos novos ou adicionamos rotas.
Qualquer dúvida sobre o que já existe → lê antes de mudar.

---

## Princípios de Código

- **Simplicidade acima de tudo**
  Se existe solução mais simples, usa ela.
  Nenhuma abstração antes de ter 3 casos que a justifiquem.

- **Falha ruidosa, nunca silenciosa**
  Erros sempre logados com: timestamp, função, input, mensagem.
  Exception genérica sem log = bug escondido = proibido.

- **Zero dependência nova sem aprovação**
  Antes de instalar qualquer biblioteca, lista no requirements.txt
  e aguarda confirmação de Miguel.

- **Configuração em .env, nunca no código**
  URL do VA MOD, seletores DOM, credenciais:
  tudo em config.py lendo do .env.
  Hardcode = pull request rejeitado.

---

## Estilo Python

```python
# ✅ Correto
def detectar_padrao(dados: dict, sr: dict) -> dict | None:
    """Detecta padrão VA MOD e retorna sinal ou None."""
    confluencias = contar_confluencias(dados, sr)
    if confluencias < 3:
        return None
    ...

# ❌ Errado
def detectarPadrao(d, s):
    c = conta(d, s)
    if c < 3: return
```

**Regras:**
- snake_case em tudo (variáveis, funções, arquivos)
- Type hints obrigatórios em todas as funções
- Docstring curta em funções com regra de negócio
- Máximo 40 linhas por função — se passar, quebra em duas
- f-strings apenas — proibido .format() e concatenação com +
- return None explícito quando a função pode não retornar valor

---

## Estilo Frontend

```jsx
// Antes de criar qualquer componente:
// 1. Leia 3 componentes existentes do SaaS
// 2. Identifique: naming, CSS, estrutura de props
// 3. Replique o padrão encontrado

// Cores imutáveis:
const COR_CALL   = '#00C853'   // verde — nunca muda
const COR_PUT    = '#D50000'   // vermelho — nunca muda
const COR_NEUTRO = '#9E9E9E'   // aguardando — nunca muda
```

**Regras:**
- Segue o framework do SaaS existente (React, Vue, HTML — o que tiver)
- Segue o CSS do SaaS existente (Tailwind, CSS module — o que tiver)
- Mobile-first: pensa em 375px antes de 1440px
- WebSocket: reconexão automática em 3s, sempre
- Polling: proibido — só push via WebSocket
- Sem biblioteca de UI nova sem aprovação de Miguel

---

## Estilo de Testes

```python
# ✅ Nome do teste descreve o comportamento
def test_padrao_1_call_com_3_confluencias_emite_sinal():
    ...

def test_padrao_1_com_2_confluencias_descarta_silencioso():
    ...

def test_padrao_4_sem_sr_descarta_obrigatorio():
    ...
```

**Regras:**
- Nome do teste descreve o comportamento esperado
- Arrange → Act → Assert: sempre essa estrutura
- Um assert por teste
- Sem mock de regra de negócio — testa a lógica real
- test_padroes.py e test_sr.py devem passar antes de qualquer PR

---

## Padrão de Log

```python
import logging
log = logging.getLogger(__name__)

log.debug("sinal descartado: confluencias=2, padrao=1")
log.info("sinal emitido: CALL padrao=3 confluencias=4")
log.warning("seletor DOM vazio: %s", SELETOR_T)
log.error("scraper falhou: %s", str(e), exc_info=True)
```

---

## Padrão de Commit

```
feat: adiciona sr_engine com pivot points e fractais
fix: corrige clustering de níveis com diff < 0.15%
test: adiciona teste de isolamento websocket por user_id
docs: atualiza taxonomia com definição de fractal
refactor: quebra detectar_padrao em funções menores
```

---

## O que NUNCA fazer

- ❌ Alterar arquivo existente do SaaS sem aprovação
- ❌ Instalar biblioteca nova sem listar e aguardar ok
- ❌ Hardcode de URL, seletor ou credencial
- ❌ Abrir nova instância Playwright por tick
- ❌ Fazer polling no frontend
- ❌ Enviar sinal sem validar confluencias >= 3
- ❌ Enviar padrão 3 ou 4 sem SR confirmado
- ❌ Capturar Exception sem log e re-raise
- ❌ Função com mais de 40 linhas
- ❌ PR sem testes passando

---

## Checklist antes de qualquer PR

- [ ] pytest -v rodando sem falha
- [ ] Nenhum arquivo existente do SaaS alterado
- [ ] Nenhum hardcode no código
- [ ] Log estruturado em todas as funções críticas
- [ ] TASK.md atualizado se algo mudou no escopo
```

Atualizado. Quer avançar para o `.mcp.json` e o `config.py`?


