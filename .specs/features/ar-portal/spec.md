# AR Collections Portal — Especificação de Requisitos

## Problem Statement

O time financeiro da Filterbuy precisa de uma ferramenta interna para visualizar AR em aberto,
tomar decisões sobre faturas (pagar, write-off, reabrir), gerar links de acesso para clientes e
automatizar lembretes. Hoje tudo é manual, sem auditoria e sem portal de autoatendimento.

## Goals

- [ ] Carregar 180 faturas dos fixtures e exibi-las com aging correto (hoje = 2026-05-15)
- [ ] Permitir decisões financeiras rastreáveis com histórico de auditoria imutável
- [ ] Gerar tokens de portal seguros (hasheados, escopados, com expiração)
- [ ] Expor portal público onde cliente vê apenas suas próprias faturas abertas
- [ ] Produzir ações de lembrete/escalonamento determinísticas a partir de uma data

## Out of Scope

| Feature | Reason |
|---|---|
| Autenticação interna (login) | Spec não exige; ferramenta interna simples |
| Envio real de e-mails | Motor gera ações; despache é responsabilidade do chamador |
| Importação automática/webhook do provedor | Dados vêm de fixtures |
| Paginação do dashboard (MVP) | 180 registros; paginação é P3 |
| Multi-idioma | Exercício em PT-BR/EN; sem i18n |

---

## User Stories

### P1: AR-01 — Ingestão de Fixtures ⭐ MVP

**User Story**: Como desenvolvedor/operações, quero carregar os fixtures `invoices.json` e
`collection_events.json` no banco para que o sistema tenha dados reais com os quais trabalhar.

**Why P1**: Sem dados, nada mais funciona.

**Acceptance Criteria**:

1. WHEN `npm run seed` é executado THEN sistema SHALL inserir 180 faturas preservando todos os campos fonte incluindo ambiguidades (null dueDate, null email)
2. WHEN fatura tem `customerId` como identificador estável THEN sistema SHALL usar `customerId` — não `customerName` — como chave de agrupamento
3. WHEN fixture tem `financeStatus` já definido (ex: "paid") THEN sistema SHALL preservar esse status sem limpar ou normalizar
4. WHEN `collection_events.json` é carregado THEN sistema SHALL registrar eventos de auditoria históricos e tokens de portal de fixture

**Independent Test**: `docker-compose up && npm run seed` → query no banco mostra 180 invoices; `cus_acme` aparece com nomes diferentes mas mesmo `customerId`

---

### P1: AR-02 — Cálculo de Aging ⭐ MVP

**User Story**: Como sistema, quero calcular aging de forma determinística para qualquer data
fornecida para que o dashboard e o motor de lembretes sejam consistentes e testáveis.

**Why P1**: Aging é a base do dashboard, das faixas e dos lembretes.

**Acceptance Criteria**:

1. WHEN `dueDate` existe e `today - dueDate > 0` THEN sistema SHALL calcular `agingDays = today - dueDate` (em dias inteiros)
2. WHEN `agingDays <= 0` THEN sistema SHALL classificar como faixa `"current"`
3. WHEN `agingDays` entre 1 e 30 THEN sistema SHALL classificar como `"1-30"`
4. WHEN `agingDays` entre 31 e 60 THEN sistema SHALL classificar como `"31-60"`
5. WHEN `agingDays` entre 61 e 90 THEN sistema SHALL classificar como `"61-90"`
6. WHEN `agingDays > 90` THEN sistema SHALL classificar como `"90+"`
7. WHEN `dueDate` é `null` THEN sistema SHALL classificar como `"no-due-date"` e exibir no dashboard com indicador visual distinto — não trava e não assume atraso

**Independent Test**: Função pura `calculateAging(dueDate, today)` com hoje=2026-05-15: inv_001 (due 2026-04-01) → 44 dias, faixa "31-60"; inv_020 (due 2025-12-20) → 147 dias, faixa "90+"; inv_005 (due 2026-05-22) → -7 dias, faixa "current"

---

### P1: AR-03 — Dashboard Interno de AR ⭐ MVP

**User Story**: Como usuário financeiro, quero ver um dashboard de AR agrupado por cliente com
totais, aging e próxima ação recomendada para priorizar cobranças eficientemente.

**Why P1**: É o produto central da ferramenta.

**Acceptance Criteria**:

1. WHEN dashboard é aberto THEN sistema SHALL exibir total de AR em aberto (soma de `amountDueCents` onde `financeStatus = "open"`)
2. WHEN dashboard é aberto THEN sistema SHALL exibir breakdown de AR por faixa de aging
3. WHEN dashboard mostra tabela de clientes THEN sistema SHALL agrupar por `customerId` (não `customerName`) e exibir: cliente, email, qtd faturas abertas, valor total aberto, maior aging, status do link do portal, próxima ação
4. WHEN cliente tem múltiplas variações de nome THEN sistema SHALL exibir o nome mais recente ou mais frequente — mas agrupar pelo `customerId`
5. WHEN fatura tem `financeStatus != "open"` THEN sistema SHALL excluí-la do AR cobrável
6. WHEN cliente não tem email THEN sistema SHALL indicar "sem email" no dashboard

**Independent Test**: Dashboard exibe cus_acme com faturas inv_001, inv_019, inv_043... (open ones); inv_002 (paid) não aparece no AR total

---

### P1: AR-04 — Decisões Financeiras com Auditoria ⭐ MVP

**User Story**: Como usuário financeiro, quero marcar faturas como pagas, incobráveis ou
reabertas com um motivo obrigatório para que haja rastreabilidade completa de cada decisão.

**Why P1**: Sem auditoria, o sistema não tem valor em produção.

**Acceptance Criteria**:

1. WHEN usuário marca fatura como paga THEN sistema SHALL: atualizar `financeStatus` para "paid", criar entrada de auditoria com (previousStatus, nextStatus="paid", reason, reference?, actor, timestamp)
2. WHEN usuário marca fatura como incobrável THEN sistema SHALL: atualizar `financeStatus` para "uncollectible", criar entrada de auditoria completa
3. WHEN usuário reabre fatura THEN sistema SHALL: atualizar `financeStatus` para "open", criar entrada de auditoria completa
4. WHEN transição é submetida sem motivo THEN sistema SHALL rejeitar com erro de validação
5. WHEN transição é criada THEN sistema SHALL registrar `actor` (pode ser hardcoded "finance-user@filterbuy.com" no MVP)
6. WHEN auditoria é criada THEN sistema SHALL preservar `previousStatus` corretamente mesmo em transições encadeadas

**Independent Test**: POST para marcar inv_001 como paid com reason → banco tem nova audit_entry; GET invoice → financeStatus=paid; segunda decisão (reabrir) → nova audit_entry com previousStatus=paid

---

### P1: AR-05 — Tokens de Portal Seguros ⭐ MVP

**User Story**: Como usuário financeiro, quero gerar um link de portal para um cliente para que
ele possa acessar suas próprias faturas sem ver dados de outros clientes.

**Why P1**: Requisito de segurança fundamental — token mal implementado vaza dados.

**Acceptance Criteria**:

1. WHEN usuário gera token para cliente THEN sistema SHALL: gerar token aleatório criptográfico, armazenar APENAS o hash SHA-256 no banco, retornar token bruto UMA VEZ ao criador
2. WHEN token é gerado THEN sistema SHALL associar ao `customerId` e definir `expiresAt` (ex: 30 dias)
3. WHEN token existe ativo para cliente THEN sistema SHALL permitir criar novo e marcar anterior como inativo (ou revogado)
4. WHEN usuário acessa portal com token válido THEN sistema SHALL incrementar `accessCount` e atualizar `lastAccessedAt`
5. WHEN token expirado é usado THEN sistema SHALL retornar 401
6. WHEN token revogado/inativo é usado THEN sistema SHALL retornar 401
7. WHEN token de cliente A é usado para acessar rota de cliente B THEN sistema SHALL retornar 403
8. NEVER armazenar token bruto em repouso — apenas hash

**Independent Test**: Gerar token → receber raw token → usar no portal → ver faturas do cliente correto; tentar token expirado → 401; tentar raw token de outro cliente → não retorna faturas do cliente errado

---

### P1: AR-06 — Portal Público do Cliente ⭐ MVP

**User Story**: Como cliente, quero acessar um portal via link único para ver minhas faturas em
aberto e o total que devo sem precisar de login.

**Why P1**: Entregável obrigatório da spec.

**Acceptance Criteria**:

1. WHEN cliente acessa `/portal/[token]` com token válido THEN sistema SHALL exibir: nome do cliente, saldo total em aberto, lista de faturas abertas
2. WHEN lista de faturas é exibida THEN sistema SHALL mostrar: número da fatura, data de vencimento, aging, valor devido, link de pagamento do provedor (quando disponível)
3. WHEN fatura tem `financeStatus != "open"` THEN sistema SHALL excluí-la do portal (paid, uncollectible, void, refunded)
4. WHEN token pertence ao cliente A THEN sistema SHALL exibir APENAS faturas com `customerId = cliente_A` — nunca de outro cliente
5. WHEN portal é renderizado THEN sistema SHALL não exibir chrome do dashboard interno (nav, sidebar, menus administrativos)

**Independent Test**: Token de cus_acme → portal mostra faturas open de cus_acme; inv_002 (paid) não aparece; nenhuma fatura de cus_beta vaza

---

### P1: AR-07 — Motor de Lembretes e Escalonamento ⭐ MVP

**User Story**: Como sistema/usuário financeiro, quero executar o motor de lembretes com uma
data "hoje" fornecida e receber a lista de ações a tomar para que a cadência de cobrança seja
consistente e auditável.

**Why P1**: Requisito obrigatório da spec.

**Acceptance Criteria**:

1. WHEN fatura tem `financeStatus = "open"` e vence em 7 dias THEN motor SHALL gerar ação `"upcoming_due"` com template `"due_soon"`
2. WHEN fatura tem `financeStatus = "open"` e `agingDays` entre 1 e 30 THEN motor SHALL gerar ação `"customer_reminder"` com template `"past_due"`
3. WHEN fatura tem `financeStatus = "open"` e `agingDays` entre 31 e 89 THEN motor SHALL gerar ação `"customer_reminder"` com template `"escalation"`
4. WHEN fatura tem `financeStatus = "open"` e `agingDays >= 90` THEN motor SHALL gerar ação `"internal_alert"` com `type = "high_risk_escalation"`
5. WHEN cliente não tem email THEN motor SHALL bloquear lembretes ao cliente e gerar `"internal_alert"` com `recipient = "ar-team@filterbuy.com"` e reason explicando ausência de email
6. WHEN fatura tem `dueDate = null` THEN motor SHALL gerar `"internal_review"` — não lembrete ao cliente
7. WHEN fatura tem `financeStatus != "open"` THEN motor SHALL não gerar nenhuma ação
8. WHEN motor é chamado THEN motor SHALL aceitar `today` como parâmetro e ser determinístico

**Independent Test**: Motor com today=2026-05-15 → inv_001 (44 dias) → `customer_reminder/escalation`; inv_003 (cus_beta, sem email, 94 dias) → `internal_alert` SEM customer_reminder; inv_004 (null dueDate) → `internal_review`

---

### P1: AR-08 — Testes Obrigatórios ⭐ MVP

**User Story**: Como avaliador, quero que todos os 13 cenários de teste obrigatórios da spec
estejam implementados para validar corretude e segurança.

**Why P1**: Critério explícito de avaliação.

**Acceptance Criteria**: Ver seção "Testes Obrigatórios" — todos os 13 itens devem ter teste automatizado passando.

---

### P2: AR-09 — Entregáveis de Documentação

**User Story**: Como avaliador, quero README.md e AI_WORKLOG.md para entender arquitetura e
como a IA foi usada.

**Acceptance Criteria**:

1. WHEN `README.md` é lido THEN deve conter: setup, arquitetura, trade-offs, como rodar verificação
2. WHEN `AI_WORKLOG.md` é lido THEN deve documentar: ferramentas, prompts, outputs, aceites, rejeições, verificações, riscos

---

## Edge Cases

- WHEN cliente tem variações de nome ("Acme HVAC", "ACME HVAC LLC") THEN sistema SHALL agrupar por `customerId`, não `customerName`
- WHEN `dueDate` é null THEN aging não deve lançar exceção — classificar como `"no-due-date"`
- WHEN `customerEmail` é null THEN dashboard SHALL indicar, motor SHALL bloquear lembrete ao cliente
- WHEN `amountPaidCents > 0` mas `financeStatus = "open"` THEN fatura ainda conta como AR aberto (pagamento parcial do provedor)
- WHEN token é acessado após expiração THEN sistema SHALL retornar 401, não dados vazios
- WHEN mesmo cliente tem múltiplos tokens ativos THEN apenas o mais recente (ou todos válidos) devem funcionar — decisão: revogar anterior ao gerar novo

---

## Testes Obrigatórios (13 cenários)

| ID | Cenário | Prioridade |
|---|---|---|
| TEST-01 | Limites das faixas de aging (current/1-30/31-60/61-90/90+) | P1 |
| TEST-02 | financeStatus vs providerStatus — fatura paid pelo finance mas open no provider | P1 |
| TEST-03 | Agrupamento de clientes com variações de nome | P1 |
| TEST-04 | Transições de financeStatus (open→paid, open→uncollectible, paid→open) | P1 |
| TEST-05 | Criação de entradas de auditoria (campos obrigatórios presentes) | P1 |
| TEST-06 | Acesso com token de portal válido | P1 |
| TEST-07 | Rejeição de token de portal expirado (401) | P1 |
| TEST-08 | Rejeição de token revogado/inativo (401) | P1 |
| TEST-09 | Isolamento de cliente no portal (token de A não vê faturas de B) | P1 |
| TEST-10 | Elegibilidade para lembrete (só financeStatus=open) | P1 |
| TEST-11 | Comportamento com email ausente (bloqueia cliente, gera alerta interno) | P1 |
| TEST-12 | Comportamento com dueDate ausente (gera internal_review, não lembrete) | P1 |
| TEST-13 | Faturas pagas excluídas do AR e dos lembretes | P1 |

---

## Requirement Traceability

| Req ID | Story | Fase | Status |
|---|---|---|---|
| AR-01 | Ingestão de Fixtures | Design | Pending |
| AR-02 | Cálculo de Aging | Design | Pending |
| AR-03 | Dashboard Interno | Design | Pending |
| AR-04 | Decisões Financeiras + Auditoria | Design | Pending |
| AR-05 | Tokens de Portal Seguros | Design | Pending |
| AR-06 | Portal Público do Cliente | Design | Pending |
| AR-07 | Motor de Lembretes | Design | Pending |
| AR-08 | Testes Obrigatórios (13) | Design | Pending |
| AR-09 | Documentação | - | Pending |
