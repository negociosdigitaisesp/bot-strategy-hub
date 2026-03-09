
## Árvore de Decisão — Só o que importa agora

```
1. Exibir o sinal (CALL/PUT) em tempo real na página
   └── Determinística? SIM → WORKER (componente frontend)

2. Conectar via WebSocket no backend existente
   └── Determinística? SIM → WORKER (JS/React consumindo o ws)

3. Atualizar o sinal sem refresh
   └── Determinística? SIM → WORKER (state management)

4. Encaixar no design system do SaaS atual
   └── Precisa de raciocínio? SIM → AGENTE (Antigravity — vê o código existente e replica o estilo)

5. Testar no browser se sinal aparece corretamente
   └── Precisa de raciocínio? SIM → AGENTE (Antigravity — testa sozinho)
```

> **Conclusão**: é praticamente tudo Worker. Um agente só (Antigravity) para encaixar no estilo visual do que já existe e testar.

***

## PROJETO.md

```markdown
# Hacbot Ruso — Página de Sinal (add-on no SaaS existente)

## Contexto
O SaaS já está pronto e funcionando. Essa task é exclusivamente
adicionar UMA página nova ao sistema atual: o dashboard de sinal
em tempo real do VA MOD RU.

**Dono**: Miguel Trader
**Escopo**: Apenas o frontend da página de sinal
**O resto do SaaS**: não toca, não altera, não refatora

---

## O que já existe (não mexer)

- Autenticação de usuários ✅
- Rotas e navegação ✅
- Design system / componentes visuais ✅
- Backend + banco ✅
- WebSocket já exposto no backend ✅

---

## O que será criado

Apenas:
- `pages/Sinal.jsx` (ou equivalente na stack do SaaS)
- Conexão com o WebSocket existente
- Exibição do sinal com o design atual do sistema

---

## Stack do SaaS (preencher antes de começar)

| Item                   | Valor                  |
|------------------------|------------------------|
| Framework frontend     | [React / Vue / HTML?]  |
| Gerenciador de estado  | [Context / Zustand?]   |
| CSS/UI library         | [Tailwind / Shadcn?]   |
| Rota nova              | [/sinal ou /dashboard] |
| Endpoint WebSocket     | [ws://...]             |

---

## Modelo de Sinal que vai chegar do backend

```json
{
  "ativo": "EUR/USD",
  "timeframe": "M1",
  "direcao": "CALL",
  "padrao": 1,
  "confluencias": 4,
  "assertividade": "ALTA",
  "contexto": "Suporte",
  "horario": "11:34:30"
}
```

---

## Regras visuais da página

- Verde (#00C853) para CALL, Vermelho (#D50000) para PUT
- Sinal atualiza sem refresh — WebSocket push
- Layout simples, leitura em menos de 2 segundos
- Mobile-friendly
- Seguir o design system do SaaS existente
```

***

## TASK.md

```markdown
# TASK — Página de Sinal do Hacbot Ruso

## Objetivo
Criar e encaixar a página de sinal no SaaS existente.

## Critérios de Aceite

- [ ] Página acessível na rota definida (ex: /sinal)
- [ ] Conecta ao WebSocket do backend e recebe sinais
- [ ] Exibe CALL em verde e PUT em vermelho
- [ ] Atualiza em tempo real sem refresh
- [ ] Visual consistente com o restante do SaaS
- [ ] Funciona no mobile
- [ ] Sem erros no console do browser

## Etapas

1. Antigravity lê o código existente do SaaS → identifica design system, 
   padrão de componentes e como outras páginas são estruturadas
2. Cria o componente da página replicando o padrão encontrado
3. Conecta ao WebSocket
4. Testa no browser — sinal aparece, atualiza, cores corretas
5. Valida mobile

## Agente por Etapa

| Etapa                        | Agente        |
|------------------------------|---------------|
| Ler e entender o SaaS atual  | Gemini CLI    |
| Criar a página               | Antigravity   |
| Conectar WebSocket           | Codex         |
| Testar no browser            | Antigravity   |
| Ajuste de estilo             | Antigravity   |
```

***

## sou.md

```markdown
# sou.md — Hacbot Ruso (add-on page)

## Regra número 1
Não alterar NADA do que já existe no SaaS. 
Só criar arquivos novos ou acrescentar rotas.

## Estilo
Replicar 100% o padrão visual e de código do SaaS atual.
Se o SaaS usa Tailwind, usa Tailwind. Se usa CSS module, usa CSS module.
Nada de inventar padrão novo.

## Sobre o sinal
- CALL → verde → tom de urgência positiva
- PUT → vermelho → tom de atenção
- Sem sinal ativo → estado neutro (cinza, "Aguardando...")

## O que NUNCA fazer
- ❌ Refatorar código existente
- ❌ Instalar biblioteca nova sem confirmar com Miguel
- ❌ Criar backend, banco ou rota nova no server
- ❌ Alterar autenticação ou rotas existentes
```

***

## Próximo Passo Real

Antes de qualquer agente rodar, você precisa responder **3 perguntas rápidas** sobre o SaaS existente:

1. **Frontend**: React, 
2. **UI/CSS**: Tailwindn, Bootstrap ou CSS 
3. **O WebSocket já está exposto**? Se sim, qual a URL/endpoint?

Com isso a Camada 2 (configurar os agentes) fica pronta em minutos.


