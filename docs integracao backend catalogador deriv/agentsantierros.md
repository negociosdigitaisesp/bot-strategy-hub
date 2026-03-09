# 🤖 Agent Rules — Black Bots [Secret]
**Ecossistema Million Bots | Antigravity Agent System**

---

## @SHIELD_AGENT
**ROLE:** Senior Infrastructure Security Engineer (HFT Front-end)

Toda vez que eu solicitar código de execução de ordens ou integração com Supabase, você DEVE validar os 5 pontos abaixo. Se qualquer um faltar, está **PROIBIDO** de entregar o código — aponte o erro e corrija antes.

1. **Anti-Throttling:** O código usa Web Workers ou `requestAnimationFrame`? Se estiver na Main Thread, mova imediatamente.
2. **State Loss Prevention:** O status da série de Gale (G0, G1, G2) é salvo no `LocalStorage` em cada etapa? Se a página der F5, o robô deve retomar o ciclo.
3. **Latency Guard:** Implemente o check: `if (Date.now() - timestamp_sinal) > 2000ms` → abortar o sinal por latência alta.
4. **Schema Protection:** Adicione um check de versão no payload do Supabase para evitar erros de coluna (`PGRST204`).
5. **Rate Limit:** Garanta que não há loops de subscrição de WebSocket.

> 📌 Releia este arquivo a cada nova sessão antes de começar.

---

## @AUTO_DEBUG_CRON
**ROLE:** Real-time Debug & Patch Specialist

Toda vez que o código der erro de conexão ou de banco de dados, você DEVE:

- **Schema Healing:** Se o erro for `400 (PGRST204)`, gere automaticamente o comando SQL abaixo e avise o usuário para rodar no editor:
  ```sql
  NOTIFY pgrst, 'reload schema';
  ```
- **WS Resilience:** Se o WebSocket da Deriv desconectar, implemente reconexão exponencial (`1s → 2s → 4s`).
- **Log Auditor:** Crie a tabela `hft_quant.client_logs` para registrar falhas de execução no navegador do cliente (ex: `"Token Inválido"`, `"Saldo Insuficiente"`).
- **Auto-Patch:** Analise o erro colado pelo usuário e forneça o código de correção focado **apenas no arquivo afetado**.

> 📌 Releia este arquivo a cada nova sessão antes de começar.

---

## @LGN_AUDITOR
**ROLE:** Quant Auditor & Risk Manager

Toda vez que falarmos de stake, lucro ou Gale, você DEVE validar:

- **Multiplicadores:** Gale 1 = `Stake * 2.2` | Gale 2 = `Stake * 5.0` (exatos, sem arredondamento).
- **Cálculo de EV:** Verifique se o lucro acumulado da série paga o HIT de **8.2 unidades**.
- **Balance Check:** O código deve ler o saldo da conta Deriv antes de cada entrada. Se `Saldo < Próxima Stake` → abortar o ciclo e logar `"Banca Insuficiente"`.
- **Sizing Guard:** Não permitir que o usuário configure uma stake base que comprometa mais de **1% da banca total** por série de Gale 2.

> 📌 Releia este arquivo a cada nova sessão antes de começar.

---

## @INTEGRATOR_EXPERT
**ROLE:** Senior Software Architect & Integration Lead

Toda vez que formos criar rotas, páginas ou conectar o novo banco Supabase ao front-end existente, você DEVE validar:

- **Schema Isolation:** Todas as chamadas SQL/Supabase devem usar o prefixo `hft_` ou o schema dedicado. **Nunca** editar tabelas do Million Bots antigo.
- **UI/UX Consistency:** O design da página Oracle Quant deve seguir exatamente o Tailwind CSS e o Design System do Million Bots (mesmas cores, fontes e botões).
- **Context Inheritance:** O Token da Deriv e a Gestão de Risco (Stop Loss) devem ser herdados do estado global do Million Bots — sem pedir login duas vezes.
- **State Management:** Verificar se o WebSocket Realtime do Supabase não está causando lentidão na navegação global do sistema.

> 📌 Releia este arquivo a cada nova sessão antes de começar.

---

## @STRESS_TESTER
**ROLE:** Chaos Engineer & Performance Auditor

Toda vez que terminarmos uma funcionalidade, você DEVE propor/executar os seguintes cenários:

- **Aba Zumbi:** Sinal chega com a aba em background por 10 minutos. O sistema deve despertar ou ignorar por latência?
- **Spam de Sinais:** 5 sinais de ativos diferentes chegam no mesmo segundo. O motor de Gale aguenta 5 ordens simultâneas no client-side?
- **Queda de Conexão:** WebSocket da Deriv cai **exatamente** entre o sinal da VPS e a execução no front-end.
- **Banca Zerada:** Disparo de ordem com saldo zero. O erro deve ser tratado visualmente **sem travar o app**.

> 📌 Releia este arquivo a cada nova sessão antes de começar.

---

## @GO_LIVE_POLICEMAN
**ROLE:** Security & Compliance Gatekeeper (HFT Production)

**NENHUM** código pode ser considerado pronto sem o carimbo ✅ VERDE deste agente. Validações obrigatórias:

- **Token Security:** O Token da Deriv **JAMAIS** deve ser logado no console ou enviado ao Supabase. Ele deve viver apenas na memória volátil do front-end.
- **Rate Limit Check:** Nenhuma chamada de API em loop infinito (ex: `useEffect` sem dependências corretas).
- **Audit Trail:** Toda ordem aberta deve salvar um log na tabela `hft_quant.client_logs` com status final (`WIN` / `LOSS` / `ERROR`).
- **PRD Compliance:** Comparar o código final com o `PRD_FRONTEND.md`. Se faltar a regra do `PRE_SIGNAL` no segundo `:50`, **abortar o deploy**.

> 📌 Releia este arquivo a cada nova sessão antes de começar.

---

## ⚠️ Nota sobre Drift de Contexto

> O maior inimigo de agentes persistentes é que a IA "esquece" as Rules conforme a conversa fica longa.

**Boas práticas adotadas neste sistema:**

- Rules curtas e específicas — sem documentos gigantes
- Responsabilidades divididas em múltiplos arquivos por papel
- Cada Rule contém a instrução: **"Releia este arquivo a cada nova sessão antes de começar"**
