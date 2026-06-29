# Cenários de teste — Agente de Boleto (AMAIS)

Roteiro de testes adversariais para validar o comportamento consultivo do bot
(workflow N8N `Zr2SAslJCI1EvdD6`). A ideia é tentar **quebrar** o agente para
garantir que ele não cometa os erros conhecidos quando estiver no ar.

Como usar: rode cada cenário no chat de teste, simulando o cliente. A coluna
**Esperado** descreve o comportamento correto; a coluna **Valida** indica a regra
que está sendo exercitada.

Legenda de status do portal: **Aberta** = dívida sem acordo · **Negociada** = já existe acordo feito.

---

## 1. Continuidade & reutilização de CPF

| # | O cliente faz | Esperado | Valida |
|---|---------------|----------|--------|
| 1 | Faz uma consulta, recebe o boleto, e diz "quero consultar de novo" | NÃO pede o CPF de novo; reutiliza o mesmo e re-consulta o portal | Reutilizar CPF |
| 2 | Gera um boleto, agradece, e logo depois manda "e o outro?" | Reutiliza o CPF e busca de novo, sem pedir o número | Reutilizar CPF |
| 3 | Conversa sobre outro assunto por ~10 mensagens e volta: "deixa, e aquele boleto?" | Ainda tem o CPF em contexto; não pede de novo | Memória / reutilizar CPF |
| 4 | Diz "usa meu outro CPF: 000.000.000-00" | AÍ SIM troca o CPF e consulta com o novo número | Reutilizar CPF (exceção) |

## 2. Dados frescos (nunca presumir)

| # | O cliente faz | Esperado | Valida |
|---|---------------|----------|--------|
| 5 | "já caiu meu pagamento?" logo após pagar | Re-consulta o portal antes de responder; não chuta "provavelmente sim" | Sempre buscar dados frescos |
| 6 | "consulta de novo, acabei de negociar pelo site" | Re-busca; ignora o resultado anterior | Sempre buscar dados frescos |
| 7 | Faz a mesma pergunta duas vezes seguidas | Re-consulta nas duas vezes, não responde de memória | Sempre buscar dados frescos |

## 3. Múltiplas dívidas / negociação

| # | O cliente faz | Esperado | Valida |
|---|---------------|----------|--------|
| 8 | Tem 2 dívidas, ambas **Negociada**: "quais estão em negociação?" | Lista AS DUAS, com nome e status | Panorama completo |
| 9 | Tem 3 dívidas (1 Aberta, 2 Negociada): "o que eu devo?" | Lista todas, separando abertas de negociadas | Panorama completo |
| 10 | "me manda os boletos de todas as negociadas" | Busca cada uma (re-inicia sessão entre elas) e entrega os boletos | Múltiplos boletos negociados |
| 11 | Vê a negociação #1, recebe o boleto, e pede "e a segunda?" | Busca a #2 sem se perder; não acha que só existe a #1 | Panorama completo |
| 12 | "quantas em aberto?" vs depois "quantas negociadas?" | Conta corretamente cada grupo | Panorama completo |

## 4. Referência ambígua / seleção

| # | O cliente faz | Esperado | Valida |
|---|---------------|----------|--------|
| 13 | Refere a instituição pelo nome ("a da Faculdade X") em vez do número | Mapeia para o índice certo | Seleção robusta |
| 14 | Manda um número fora do intervalo ("4" havendo só 2) | Pede para escolher de novo, sem quebrar | Seleção robusta |
| 15 | Muda de ideia no meio ("não, quero a outra") | Re-seleciona, re-consultando o portal | Seleção robusta |

## 5. Regressão dos guardrails existentes

| # | O cliente faz | Esperado | Valida |
|---|---------------|----------|--------|
| 16 | Informa um CPF inexistente e confirma que está correto | Pergunta para confirmar o CPF; confirmado → encaminha ao suporte (`[ATENDENTE]`), nunca diz "humano" | Guardrail CPF |
| 17 | Recebe um boleto de dívida **Negociada** e diz "não me lembro desse acordo" | Acolhe, encaminha ao setor de negociação (`[NEGOCIAR]`), NÃO encerra a sessão | Guardrail Negociada contestada |
| 18 | Demonstra dificuldade financeira / quer parcelar | Mensagem acolhedora + `[NEGOCIAR]` | Handoff de negociação |

## 6. Tom & formato

| # | Verificar | Esperado | Valida |
|---|-----------|----------|--------|
| 19 | Em todas as respostas | Sem pronome neutro; sem bullet points em conversa (só nos dados do boleto) | Tom natural |
| 20 | Ao longo da conversa | Quebras de linha corretas; uso natural do primeiro nome quando disponível | Formatação / personalização |

## 7. Formas de pagamento, valor e coleta (Rodada 2)

| # | O cliente faz | Esperado | Valida |
|---|---------------|----------|--------|
| 21 | Logo na abertura | Bot pede o CPF **com ponto e traço** e dá exemplo (ex: 011.222.333-44) | Mensagem de CPF |
| 22 | Manda o CPF | Antes do resultado aparece uma mensagem curta de "vou buscar, um instante" | Feedback de busca |
| 23 | "Quais as formas de pagamento?" | Só **boleto à vista**, no valor atualizado (com encargos). Nunca oferece parcelamento | Formas de pagamento |
| 24 | "Dá pra parcelar?" / "tira os juros?" | Recusa cordial; se insistir → `[NEGOCIAR]` | Sem parcelamento / handoff |
| 25 | Vê o valor da dívida aberta | É sempre o valor **com juros e multa** (bate com o boleto do portal); nunca um valor "sem juros" | Valor com encargos |
| 26 | Confirma seguir com a negociação | Bot pede **um dado de cada vez**: confirma Nome, depois E-mail (com exemplo), depois Telefone (com exemplo) | Coleta mínima |
| 27 | Durante a coleta | Bot **não** pede endereço, bairro, cidade, UF nem CEP | Coleta mínima |
| 28 | Conclui a negociação de dívida aberta | A linha digitável entregue é a do boleto real (valor cheio) — confira abrindo o boleto no portal | Linha digitável correta |

---

## Notas de implementação relacionadas
- `iniciar_sessao` é uma chamada de **inventário puro**: sempre retorna a lista
  completa de instituições com `status`, sem auto-resolver nem fechar a sessão
  (`routes/sessao.js`).
- Selecionar uma dívida **Negociada** encerra a sessão (ação terminal). Para ver
  o boleto de outra negociada, o agente chama `iniciar_sessao` de novo — o que
  também garante dados sempre atualizados.
- Os sinais `[NEGOCIAR]` / `[ATENDENTE]` ficam na última linha da mensagem e são
  removidos pelos nós de Code antes de chegar ao cliente.
