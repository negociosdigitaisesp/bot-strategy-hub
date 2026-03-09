
# 👤 Clone Ativado — Garimpeiro Trader (VA MOD Specialist)

> *"Você nunca opera o indicador. Você opera a confluência. O VA MOD só te mostra o que os players estão fazendo — S/R te diz onde eles vão parar."*

***

## processos.md — Os 4 Padrões (atualizado)

```markdown
# Processos — Hacbot Ruso
# Os 4 Padrões do VA MOD RU com Filtros de S/R

---

## Glossário Base (leia antes dos padrões)

| Indicador    | O que é                                                                 |
|--------------|-------------------------------------------------------------------------|
| **T (Taxa)** | Delta do candle — mostra quem domina: comprador (azul/verde) ou vendedor (vermelho) |
| **V (Volume)** | Compara volume atual com o anterior — se maior = força, se menor = fraqueza |
| **POC**      | Point of Control — nível de maior volume negociado, age como ímã de preço |
| **Escadinha**| Sequência de volumes crescentes — evidencia agressão progressiva do movimento |
| **Contexto** | Posição do preço em relação à S/R marcada no gráfico da corretora |

---

## Regra Universal (vale para todos os padrões)

```
confluencias >= 3  →  sinal válido
confluencias == 2  →  descarta silenciosamente
confluencias == 1  →  descarta silenciosamente

contexto == "Neutro" e confluencias < 4  →  descarta
```

> ⚠️ **Filtro de contexto é obrigatório**: o VA MOD diz O QUE está
> acontecendo. O S/R diz ONDE o preço pode reverter ou continuar.
> Sem contexto, o sinal é ruído.

---

## Padrão 1 — Continuidade de Tendência

**Conceito**: Movimento já em curso ganha força com volume crescente.
O preço está respeitando a direção dominante e os players estão
aumentando a agressão progressivamente.

### Condições para CALL (compra)
| # | Indicador    | Condição                                           | Confluência |
|---|--------------|----------------------------------------------------|-------------|
| 1 | **T (Taxa)** | Azul/verde — compradores dominando o candle        | +1          |
| 2 | **V (Volume)**| Volume atual MAIOR que o anterior                 | +1          |
| 3 | **POC**      | Preço acima do POC (POC atua como suporte dinâmico)| +1          |
| 4 | **Escadinha**| Presente — agressão compradora crescente           | +1          |
| 5 | **Contexto** | Preço em região de Suporte (S/R do gráfico)        | +1 (bônus)  |

### Condições para PUT (venda)
| # | Indicador     | Condição                                           | Confluência |
|---|---------------|----------------------------------------------------|-------------|
| 1 | **T (Taxa)**  | Vermelho — vendedores dominando o candle           | +1          |
| 2 | **V (Volume)**| Volume atual MAIOR que o anterior                  | +1          |
| 3 | **POC**       | Preço abaixo do POC (POC atua como resistência)    | +1          |
| 4 | **Escadinha** | Presente — agressão vendedora crescente            | +1          |
| 5 | **Contexto**  | Preço em região de Resistência                     | +1 (bônus)  |

**Assertividade esperada**: ALTA com 3+ confluências + contexto

---

## Padrão 2 — Fraqueza do Movimento Contrário

**Conceito**: O movimento oposto tentou entrar mas falhou.
Volume fraco na direção contrária sinaliza exaustão e favorece
a continuidade do movimento dominante.

### Condições para CALL
| # | Indicador     | Condição                                                | Confluência |
|---|---------------|---------------------------------------------------------|-------------|
| 1 | **T (Taxa)**  | Azul — compradores dominam mesmo após tentativa vendedora| +1         |
| 2 | **V (Volume)**| Volume do candle vendedor foi MENOR que o anterior      | +1          |
| 3 | **POC**       | POC mantido — preço não rompe o POC para baixo         | +1          |
| 4 | **Escadinha** | Ausente na venda (sem agressão vendedora)               | +1          |
| 5 | **Contexto**  | Preço na zona de Suporte + falha de rompimento          | +1 (bônus)  |

### Condições para PUT
| # | Indicador     | Condição                                                | Confluência |
|---|---------------|---------------------------------------------------------|-------------|
| 1 | **T (Taxa)**  | Vermelho — vendedores dominam após tentativa compradora | +1          |
| 2 | **V (Volume)**| Volume do candle comprador foi MENOR que o anterior     | +1          |
| 3 | **POC**       | POC mantido — preço não rompe o POC para cima           | +1          |
| 4 | **Escadinha** | Ausente na compra (sem agressão compradora)             | +1          |
| 5 | **Contexto**  | Preço na zona de Resistência + falha de rompimento      | +1 (bônus)  |

**Assertividade esperada**: ALTA — fraqueza do lado contrário é sinal
muito preciso, especialmente em S/R forte

---

## Padrão 3 — Reversão por Absorção

**Conceito**: O mercado absorveu toda a pressão de um lado sem
mover o preço proporcionalmente. Isso revela que o lado oposto
está acumulando posição para reverter. Clássico "Padrão de Absorção".

### Condições para CALL (reversão de queda)
| # | Indicador     | Condição                                                     | Confluência |
|---|---------------|--------------------------------------------------------------|-------------|
| 1 | **T (Taxa)**  | Mudança de vermelho → azul no candle atual                   | +1          |
| 2 | **V (Volume)**| Volume atual ALTO, mas o preço não caiu proporcionalmente    | +1          |
| 3 | **POC**       | Preço testando o POC vindo de baixo (POC como suporte)       | +1          |
| 4 | **Escadinha** | Presente na compra — absorção com agressão crescente         | +1          |
| 5 | **Contexto**  | Suporte forte no gráfico (mínima anterior, zona de valor)    | +1 (bônus)  |

### Condições para PUT (reversão de alta)
| # | Indicador     | Condição                                                     | Confluência |
|---|---------------|--------------------------------------------------------------|-------------|
| 1 | **T (Taxa)**  | Mudança de azul → vermelho no candle atual                   | +1          |
| 2 | **V (Volume)**| Volume atual ALTO, mas o preço não subiu proporcionalmente   | +1          |
| 3 | **POC**       | Preço testando o POC vindo de cima (POC como resistência)    | +1          |
| 4 | **Escadinha** | Presente na venda — absorção com agressão crescente          | +1          |
| 5 | **Contexto**  | Resistência forte no gráfico (máxima anterior, topo duplo)   | +1 (bônus)  |

**Assertividade esperada**: MUITO ALTA — reversão com absorção em S/R
é o setup mais assertivo do VA MOD. Exige contexto obrigatório.

---

## Padrão 4 — Rompimento com Volume (Breakout Confirmado)

**Conceito**: O preço rompe um nível importante de S/R com volume
expressivo e Escadinha confirmando agressão real. Falsos rompimentos
são filtrados pelo volume fraco.

### Condições para CALL (rompimento de resistência)
| # | Indicador     | Condição                                                      | Confluência |
|---|---------------|---------------------------------------------------------------|-------------|
| 1 | **T (Taxa)**  | Azul forte — compradores dominando com folga                  | +1          |
| 2 | **V (Volume)**| Volume SIGNIFICATIVAMENTE maior que a média dos últimos 3 candles | +1      |
| 3 | **POC**       | POC se deslocando para cima — valor sendo reposicionado       | +1          |
| 4 | **Escadinha** | Presente e intensa — agressão máxima                          | +1          |
| 5 | **Contexto**  | Rompimento de Resistência confirmada no gráfico               | OBRIGATÓRIO |

### Condições para PUT (rompimento de suporte)
| # | Indicador     | Condição                                                      | Confluência |
|---|---------------|---------------------------------------------------------------|-------------|
| 1 | **T (Taxa)**  | Vermelho forte — vendedores dominando com folga               | +1          |
| 2 | **V (Volume)**| Volume SIGNIFICATIVAMENTE maior que a média dos últimos 3 candles | +1      |
| 3 | **POC**       | POC se deslocando para baixo — valor sendo reposicionado      | +1          |
| 4 | **Escadinha** | Presente e intensa — agressão máxima                          | +1          |
| 5 | **Contexto**  | Rompimento de Suporte confirmada no gráfico                   | OBRIGATÓRIO |

> ⚠️ **Padrão 4 sem contexto = inválido sempre.**
> Rompimento sem S/R marcado é ruído, não setup.

**Assertividade esperada**: ALTA quando confirmado — mas é o padrão
mais raro e exige contexto obrigatório para ser emitido

---

## Tabela Resumo dos 4 Padrões

| Padrão | Nome               | T       | V        | POC        | Escadinha | Contexto       | Assertividade |
|--------|--------------------|---------|----------|------------|-----------|----------------|---------------|
| 1      | Continuidade       | Favor   | Maior    | A favor    | Presente  | S/R (bônus)    | ALTA          |
| 2      | Fraqueza Contrária | Favor   | Menor (contrário) | Mantido | Ausente (contrário) | S/R obrigatório | ALTA |
| 3      | Absorção/Reversão  | Mudança | Alto s/ movimento | Teste de POC | Presente | S/R OBRIGATÓRIO | MUITO ALTA |
| 4      | Rompimento         | Forte   | Muito alto | Deslocando | Intensa  | S/R OBRIGATÓRIO | ALTA (raro)  |

---

## Filtros Adicionais de S/R (pegar se disponível no DOM)

```python
# Se o scraper conseguir capturar níveis de S/R do VA MOD:
filtros_sr = {
    "poc_diario": True,      # POC do dia atua como S/R dinâmico forte
    "vah_val": True,         # VAH (Value Area High) e VAL (Value Area Low)
    "poc_anterior": True,    # POC do candle anterior como referência
    "nivel_manual": True,    # S/R marcado manualmente pelo trader (se exposto no DOM)
}

# Prioridade de contexto (ordem de força):
# 1. S/R manual marcado pelo trader
# 2. POC diário
# 3. VAH / VAL
# 4. POC do candle anterior
```
```

***

## O que o Clone Trader diz sobre validar isso

> *"Antes de colocar qualquer regra no código, você precisa fazer back-testing manual com pelo menos 50 sinais históricos no VA MOD. Abre o histórico, aplica as regras de cada padrão à mão e anota quantos viraram CALL/PUT correto. Se um padrão tiver acerto abaixo de 65%, ele não entra no sistema ainda — ajusta o filtro ou descarta. Código com regra errada escala o erro, não o lucro."*

***

## Próximo passo antes de codar

Você valida ou ajusta as regras dos 4 padrões acima com base na **sua** leitura do VA MOD — porque você é o trader, não o agente. Quer ajustar algum dos 4 agora, ou posso avançar para a **Camada 3** (criar os Clones técnicos e montar o squad no AIOX)?


