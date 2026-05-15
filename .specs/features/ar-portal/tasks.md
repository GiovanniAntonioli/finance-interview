# AR Collections Portal — Tasks

**Design**: `.specs/features/ar-portal/design.md`
**Status**: Approved

---

## Execution Plan

### Fase 1: Foundation (Sequencial)

```
T1 → T2 → T3 → T4
```

### Fase 2: Domínio Puro (Paralelo)

```
T4 ──┬─→ T5 [P] (aging engine)
     ├─→ T6 [P] (tipos + constantes)
     └─→ T7 [P] (reminder engine)
```

### Fase 3: Serviços + API (Sequencial por dependência)

```
T5, T6, T7 completos, então:

T8 (invoice service) → T9 (dashboard API) → T10 (finance decisions API)

T11 (token service) → T12 (portal tokens API)

T8 + T11 → T13 (portal data API)
```

### Fase 4: UI (Paralelo)

```
T9, T10, T12, T13 completos, então:

     ┌─→ T14 [P] (dashboard page)
T9 ──┤
     └─→ T15 [P] (portal público page)
```

### Fase 5: Motor de Lembretes

```
T7 → T16 (reminder API endpoint)
```

### Fase 6: Testes + Docs (Paralelo)

```
     ┌─→ T17 [P] (test suite completa)
All ─┤
     └─→ T18 [P] (README + AI_WORKLOG)
```

---

## Task Breakdown

### T1: Inicializar Projeto Next.js

**What**: Criar projeto Next.js 15 com TypeScript, Tailwind CSS, Prisma e estrutura de pastas `src/lib`, `src/services`, `src/types`
**Where**: `/` (raiz do repositório)
**Depends on**: None
**Reuses**: N/A (greenfield)
**Requirement**: AR-01

**Done when**:
- [ ] `npm run dev` sobe sem erros na porta 3000
- [ ] Tailwind CSS configurado e funcional
- [ ] Prisma instalado com `schema.prisma` inicial
- [ ] Pastas `src/lib/`, `src/services/`, `src/types/` criadas
- [ ] `tsconfig.json` com path aliases (`@/lib/...`, `@/services/...`)
- [ ] Jest + ts-jest configurados: `npm test` roda sem erros (zero testes por enquanto)

**Tests**: none (estrutura, sem lógica)
**Gate**: build (`npm run build` sem erros de type)

**Commit**: `chore: initialize Next.js 15 project with TypeScript, Tailwind, Prisma, Jest`

---

### T2: Definir Schema Prisma + Migrations

**What**: Definir modelos `Invoice`, `AuditEntry`, `PortalToken`, `CollectionEvent` no `schema.prisma` e gerar migration inicial
**Where**: `prisma/schema.prisma`, `prisma/migrations/`
**Depends on**: T1
**Reuses**: Design em `.specs/features/ar-portal/design.md` — seção Schema Prisma
**Requirement**: AR-01, AR-04, AR-05

**Done when**:
- [ ] Todos os 4 modelos definidos com campos, tipos e índices conforme design
- [ ] `npx prisma migrate dev --name init` executa sem erros
- [ ] `npx prisma generate` gera cliente sem erros
- [ ] `PortalToken.tokenHash` tem constraint `@unique`
- [ ] Campos nullable (`dueDate`, `customerEmail`, `hostedInvoiceUrl`) definidos como opcionais

**Tests**: none
**Gate**: build (`npx prisma validate`)

**Commit**: `feat(db): define Prisma schema with Invoice, AuditEntry, PortalToken, CollectionEvent`

---

### T3: Docker Compose (app + postgres)

**What**: Criar `docker-compose.yml` com serviços `app` (Next.js) e `postgres` (PostgreSQL 16) e `Dockerfile` multi-stage para a aplicação
**Where**: `docker-compose.yml`, `Dockerfile`, `.env.example`
**Depends on**: T2
**Reuses**: N/A
**Requirement**: AR-01

**Done when**:
- [ ] `docker-compose up` sobe ambos os serviços sem erro
- [ ] App na porta 3000 responde com status 200
- [ ] Banco postgres acessível pela app via `DATABASE_URL` de variável de ambiente
- [ ] `.env.example` documenta todas as variáveis necessárias
- [ ] `docker-compose up --build` funciona a partir de checkout limpo (sem cache)

**Tests**: none
**Gate**: build (docker build sem erros)

**Commit**: `feat(infra): add Dockerfile and docker-compose with app + postgres`

---

### T4: Seed Script dos Fixtures

**What**: Criar `prisma/seed.ts` que lê `datasets/invoices.json` e `datasets/collection_events.json` e faz upsert idempotente no banco
**Where**: `prisma/seed.ts`, `datasets/` (readonly)
**Depends on**: T2 (schema), T3 (banco disponível)
**Reuses**: Schema Prisma de T2
**Requirement**: AR-01

**Done when**:
- [ ] `npm run seed` (ou `npx prisma db seed`) insere 180 faturas
- [ ] Seed é idempotente: rodar duas vezes não duplica registros (usa upsert por `externalId`)
- [ ] Campos null preservados: `dueDate=null`, `customerEmail=null` inseridos como null (não string "null")
- [ ] `financeStatus` dos fixtures preservado (ex: inv_002 fica "paid")
- [ ] `collection_events.json` inserido como `CollectionEvent` com `payload` em JSON
- [ ] Query `SELECT COUNT(*) FROM "Invoice"` retorna 180 após seed

**Tests**: unit (1 teste: seed idempotência — roda seed 2x, conta = 180)
**Gate**: quick (`npm test -- --testPathPattern=seed`)

**Commit**: `feat(seed): load fixtures from invoices.json and collection_events.json`

---

### T5: Aging Engine — Função Pura [P]

**What**: Criar `src/lib/aging.ts` com função `calculateAging(dueDate: Date | null, today: Date): AgingResult` e tipo `AgingBand`
**Where**: `src/lib/aging.ts`, `src/lib/aging.test.ts`
**Depends on**: T1
**Reuses**: N/A
**Requirement**: AR-02

**Done when**:
- [ ] `AgingBand` type: `"current" | "1-30" | "31-60" | "61-90" | "90+" | "no-due-date"`
- [ ] `AgingResult` type: `{ agingDays: number | null, band: AgingBand }`
- [ ] `dueDate=null` → `{ agingDays: null, band: "no-due-date" }`
- [ ] Limites das faixas corretos (TEST-01 coberto):
  - today=2026-05-15, due=2026-05-15 → agingDays=0, "current"
  - due=2026-05-22 → agingDays=-7, "current"
  - due=2026-04-15 → agingDays=30, "1-30"
  - due=2026-04-14 → agingDays=31, "31-60"
  - due=2026-03-16 → agingDays=60, "31-60"
  - due=2026-03-15 → agingDays=61, "61-90"
  - due=2026-02-14 → agingDays=90, "61-90"
  - due=2026-02-13 → agingDays=91, "90+"
  - due=2025-12-20 → agingDays=147, "90+"
- [ ] `npm test -- --testPathPattern=aging` → todos passam

**Tests**: unit
**Gate**: quick (`npm test -- --testPathPattern=aging`)

**Commit**: `feat(aging): implement deterministic aging calculator with band classification`

---

### T6: Tipos de Domínio + Constantes [P]

**What**: Criar `src/types/index.ts` com todos os tipos compartilhados: `FinanceStatus`, `ProviderStatus`, `ReminderAction`, `DashboardCustomer`, `ARSummary`, `PortalInvoice`
**Where**: `src/types/index.ts`
**Depends on**: T1
**Reuses**: Tipos do design
**Requirement**: AR-03, AR-04, AR-05, AR-06, AR-07

**Done when**:
- [ ] `FinanceStatus = "open" | "paid" | "uncollectible"`
- [ ] `ReminderAction` type com campos: `type`, `invoiceExternalId?`, `customerId`, `customerEmail?`, `template`, `reason`, `recipient?`
- [ ] `DashboardCustomer` type: `customerId`, `displayName`, `email`, `openInvoiceCount`, `totalOpenCents`, `maxAgingDays`, `agingBand`, `portalLinkStatus`, `nextAction`
- [ ] `ARSummary` type: `totalOpenCents`, `breakdown` (por `AgingBand`)
- [ ] Build sem erros de TypeScript

**Tests**: none (tipos puros)
**Gate**: build

**Commit**: `feat(types): define domain types for AR portal`

---

### T7: Reminder Engine — Função Pura [P]

**What**: Criar `src/lib/reminder-engine.ts` com `generateReminderActions(invoices, today): ReminderAction[]` e interface `EmailProvider` com implementação fake
**Where**: `src/lib/reminder-engine.ts`, `src/lib/reminder-engine.test.ts`
**Depends on**: T1, T5 (usa calculateAging internamente)
**Reuses**: `AgingBand` de T5
**Requirement**: AR-07

**Done when**:
- [ ] Interface `EmailProvider { send(action: ReminderAction): void }` exportada
- [ ] Classe `FakeEmailProvider` que imprime log — implementa `EmailProvider`
- [ ] `generateReminderActions` é função pura (sem I/O, sem efeito colateral)
- [ ] Cadência implementada (conforme design.md tabela de cadência):
  - agingDays entre -7 e 0 → `customer_reminder/due_soon`
  - 1-30 → `customer_reminder/past_due`
  - 31-89 → `customer_reminder/escalation`
  - 90+ → `internal_alert/high_risk_escalation`
  - null dueDate → `internal_review/missing_due_date`
  - null email + qualquer atraso → bloqueia customer e gera `internal_alert/missing_email_escalation`
- [ ] `financeStatus != "open"` → sem ação gerada (TEST-13 coberto)
- [ ] Testes cobrem TEST-10, TEST-11, TEST-12:
  - TEST-10: fatura open vs non-open → elegibilidade
  - TEST-11: null email → bloqueia customer_reminder, gera internal_alert
  - TEST-12: null dueDate → internal_review, não customer_reminder
- [ ] `npm test -- --testPathPattern=reminder` → todos passam

**Tests**: unit
**Gate**: quick (`npm test -- --testPathPattern=reminder`)

**Commit**: `feat(reminder): implement deterministic reminder engine with EmailProvider interface`

---

### T8: Invoice Service

**What**: Criar `src/services/invoice-service.ts` com `getInvoices()`, `getDashboardSummary(today)`, `applyFinanceDecision(invoiceId, decision)`
**Where**: `src/services/invoice-service.ts`, `src/services/invoice-service.test.ts`
**Depends on**: T2 (schema), T5 (aging), T6 (tipos)
**Reuses**: `calculateAging` de T5, tipos de T6
**Requirement**: AR-03, AR-04

**Done when**:
- [ ] `getInvoices(filters?)` retorna faturas com `agingDays` e `agingBand` calculados
- [ ] `getDashboardSummary(today)` retorna `ARSummary` + `DashboardCustomer[]` agrupados por `customerId`
  - Usa nome mais recente por `customerId` para `displayName`
  - Calcula `totalOpenCents` apenas de `financeStatus = "open"`
  - `nextAction` baseado na faixa de aging mais crítica do cliente
- [ ] `applyFinanceDecision(id, { nextStatus, reason, reference?, actor })`:
  - Valida que `reason` não é vazio
  - Cria `AuditEntry` com `previousStatus`
  - Atualiza `financeStatus`
  - Retorna `{ invoice, auditEntry }`
- [ ] Testes de integração cobrem TEST-02, TEST-03, TEST-04, TEST-05:
  - TEST-02: financeStatus=paid vs providerStatus=open contados separadamente
  - TEST-03: cus_acme com "Acme HVAC" e "ACME HVAC LLC" agrupados em 1 entrada
  - TEST-04: open→paid, open→uncollectible, uncollectible→open transitions
  - TEST-05: AuditEntry tem previousStatus, nextStatus, reason, actor, occurredAt
- [ ] `npm test -- --testPathPattern=invoice-service` → todos passam

**Tests**: integration (hit real test database)
**Gate**: full (`npm test`)

**Commit**: `feat(services): implement invoice service with aging, dashboard summary, finance decisions`

---

### T9: Dashboard API Route

**What**: Criar `app/api/dashboard/route.ts` → `GET /api/dashboard?today=YYYY-MM-DD`
**Where**: `app/api/dashboard/route.ts`
**Depends on**: T8
**Reuses**: `getDashboardSummary` de T8
**Requirement**: AR-03

**Done when**:
- [ ] `GET /api/dashboard` retorna `{ summary: ARSummary, customers: DashboardCustomer[] }`
- [ ] Parâmetro `today` opcional (default: data atual do servidor)
- [ ] Resposta em JSON com status 200
- [ ] `today=2026-05-15` retorna dados corretos dos fixtures

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add dashboard route with AR summary and customer breakdown`

---

### T10: Finance Decisions API Route

**What**: Criar `app/api/invoices/[id]/status/route.ts` → `POST /api/invoices/[id]/status`
**Where**: `app/api/invoices/[id]/status/route.ts`
**Depends on**: T8
**Reuses**: `applyFinanceDecision` de T8
**Requirement**: AR-04

**Done when**:
- [ ] `POST` com `{ nextStatus, reason, reference? }` atualiza fatura e cria audit entry
- [ ] `reason` vazio → 400 com mensagem de erro
- [ ] `nextStatus` inválido → 400
- [ ] Fatura não encontrada → 404
- [ ] Resposta 200 com `{ invoice, auditEntry }`
- [ ] `actor` hardcoded como `"finance-user@filterbuy.com"` no MVP

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add finance decision endpoint with audit trail`

---

### T11: Token Service

**What**: Criar `src/lib/token-service.ts` com `generatePortalToken(customerId)`, `hashToken(raw)`, `validateToken(raw)`, `revokeExistingTokens(customerId)`
**Where**: `src/lib/token-service.ts`, `src/lib/token-service.test.ts`
**Depends on**: T2 (schema)
**Reuses**: `crypto` (Node built-in)
**Requirement**: AR-05

**Done when**:
- [ ] `generatePortalToken(customerId)` retorna `{ rawToken: string, expiresAt: Date }`
  - Usa `crypto.randomBytes(32).toString('base64url')`
  - Chama `hashToken` internamente e persiste APENAS o hash
  - Revoga tokens ativos anteriores do customerId
  - `expiresAt = now + 30 dias`
- [ ] `hashToken(raw)` → `crypto.createHash('sha256').update(raw).digest('hex')`
- [ ] `validateToken(raw)` → busca por hash, retorna `PortalToken | null`
  - Retorna null se `status != 'active'` ou `expiresAt < now`
  - Incrementa `accessCount`, atualiza `lastAccessedAt` quando válido
- [ ] Testes cobrem TEST-06, TEST-07, TEST-08:
  - TEST-06: token válido → validateToken retorna PortalToken
  - TEST-07: token expirado → validateToken retorna null
  - TEST-08: token revogado → validateToken retorna null
- [ ] Nunca armazena rawToken em nenhuma coluna do banco
- [ ] `npm test -- --testPathPattern=token-service` → todos passam

**Tests**: unit
**Gate**: quick (`npm test -- --testPathPattern=token-service`)

**Commit**: `feat(tokens): implement secure portal token service with SHA-256 hashing`

---

### T12: Portal Tokens API Route

**What**: Criar `app/api/portal-tokens/route.ts` → `POST /api/portal-tokens`
**Where**: `app/api/portal-tokens/route.ts`
**Depends on**: T11
**Reuses**: `generatePortalToken` de T11
**Requirement**: AR-05

**Done when**:
- [ ] `POST { customerId }` → gera token e retorna `{ portalUrl, expiresAt }`
- [ ] `portalUrl` usa o rawToken: `/portal/${rawToken}`
- [ ] `customerId` ausente → 400
- [ ] rawToken retornado UMA VEZ na resposta (nunca persiste no banco)
- [ ] Tokens anteriores do cliente são revogados automaticamente

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add portal token generation endpoint`

---

### T13: Portal Data API Route

**What**: Criar `app/api/portal/[token]/route.ts` → `GET /api/portal/[token]`
**Where**: `app/api/portal/[token]/route.ts`, `src/services/portal-service.ts`
**Depends on**: T8 (invoice service), T11 (token service)
**Reuses**: `validateToken` de T11, `getInvoices` de T8
**Requirement**: AR-06

**Done when**:
- [ ] Token inválido/expirado/revogado → 401
- [ ] Token válido → retorna `{ customer: { customerId, displayName, email, totalOpenCents }, invoices: PortalInvoice[] }`
- [ ] `invoices` contém APENAS faturas com `financeStatus = "open"` do `customerId` do token
- [ ] `PortalInvoice` inclui: `invoiceNumber`, `dueDate`, `agingDays`, `agingBand`, `amountDueCents`, `hostedInvoiceUrl?`
- [ ] Testes cobrem TEST-09: token de cus_acme não retorna faturas de cus_beta
- [ ] `npm test -- --testPathPattern=portal` → TEST-09 passa

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add portal data route with customer scoping and token validation`

---

### T14: Dashboard Page (UI) [P]

**What**: Criar `app/dashboard/page.tsx` com componentes `ARSummary` e `CustomerTable` consumindo `/api/dashboard`
**Where**: `app/dashboard/page.tsx`, `app/dashboard/_components/ARSummary.tsx`, `app/dashboard/_components/CustomerTable.tsx`
**Depends on**: T9, T10, T12
**Reuses**: Tipos de T6
**Requirement**: AR-03

**Done when**:
- [ ] Dashboard exibe total de AR em aberto em reais (centavos ÷ 100)
- [ ] Breakdown de aging por faixa com contagem e valor
- [ ] Tabela de clientes com colunas: Cliente, Email, Qtd Faturas, Total Aberto, Maior Aging, Link Portal, Próxima Ação
- [ ] Clientes sem email mostram badge "sem email"
- [ ] Faturas `no-due-date` mostram badge visual distinto (amarelo)
- [ ] Botão "Gerar Link" por cliente chama POST /api/portal-tokens e exibe URL
- [ ] Ações de status (botões Pago/Incobrável/Reabrir) abre modal com campo `reason` obrigatório
- [ ] `npm run build` sem erros de TypeScript

**Tests**: none (UI — verificação manual)
**Gate**: build

**Commit**: `feat(ui): implement internal AR dashboard with aging breakdown and customer table`

---

### T15: Portal Público Page [P]

**What**: Criar `app/portal/[token]/page.tsx` como Server Component que exibe faturas do cliente
**Where**: `app/portal/[token]/page.tsx`
**Depends on**: T13
**Reuses**: `PortalInvoice` tipo de T6
**Requirement**: AR-06

**Done when**:
- [ ] Token inválido → página de erro "Link inválido ou expirado" sem expor detalhes
- [ ] Token válido → exibe: nome do cliente, total em aberto, lista de faturas
- [ ] Lista de faturas mostra: número, data de vencimento, aging, valor devido, botão "Pagar" (link para `hostedInvoiceUrl` quando disponível)
- [ ] Sem chrome interno (sem nav, sem sidebar administrativa)
- [ ] Faturas pagas/incobráveis não aparecem
- [ ] `npm run build` sem erros

**Tests**: none (UI — verificação manual)
**Gate**: build

**Commit**: `feat(ui): implement public customer portal page`

---

### T16: Reminders API Route

**What**: Criar `app/api/reminders/route.ts` → `GET /api/reminders?today=YYYY-MM-DD` e expor via UI no dashboard
**Where**: `app/api/reminders/route.ts`
**Depends on**: T7 (reminder engine), T8 (invoice service)
**Reuses**: `generateReminderActions` de T7
**Requirement**: AR-07

**Done when**:
- [ ] `GET /api/reminders?today=2026-05-15` retorna array de `ReminderAction[]`
- [ ] Busca apenas faturas com `financeStatus = "open"` antes de passar ao engine
- [ ] `today` inválido → 400
- [ ] Resposta determinística: mesmo `today` = mesmas ações
- [ ] Dashboard tem seção "Preview de Lembretes" com campo de data e botão "Gerar"

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add reminders endpoint with deterministic action generation`

---

### T17: Test Suite Completa — 13 Cenários [P]

**What**: Criar `src/__tests__/required-scenarios.test.ts` com todos os 13 testes obrigatórios explicitamente nomeados
**Where**: `src/__tests__/required-scenarios.test.ts`
**Depends on**: T5, T7, T8, T11, T13 (todos os serviços implementados)
**Reuses**: Todos os serviços e funções puras
**Requirement**: AR-08

**Done when**:
- [ ] TEST-01: `describe("aging band limits")` — cobre todos os 6 limites de faixa
- [ ] TEST-02: `describe("financeStatus vs providerStatus separation")` — fatura paid no finance, open no provider: não conta no AR
- [ ] TEST-03: `describe("customer grouping despite name variations")` — cus_acme com 2 nomes → 1 entrada no dashboard
- [ ] TEST-04: `describe("finance status transitions")` — open→paid, open→uncollectible, paid→open
- [ ] TEST-05: `describe("audit entry creation")` — campos obrigatórios presentes e corretos
- [ ] TEST-06: `describe("portal token - valid access")` — token válido retorna dados do cliente
- [ ] TEST-07: `describe("portal token - expired rejection")` — token expirado → null/401
- [ ] TEST-08: `describe("portal token - revoked rejection")` — token revogado → null/401
- [ ] TEST-09: `describe("portal customer isolation")` — token de A não retorna faturas de B
- [ ] TEST-10: `describe("reminder eligibility")` — apenas financeStatus=open gera ação
- [ ] TEST-11: `describe("missing email behavior")` — bloqueia customer_reminder, gera internal_alert
- [ ] TEST-12: `describe("missing dueDate behavior")` — gera internal_review, não customer_reminder
- [ ] TEST-13: `describe("paid invoices excluded from AR and reminders")` — financeStatus=paid → fora do AR e fora dos lembretes
- [ ] `npm test` → todos os 13 describes com pelo menos 1 assertion cada passam

**Tests**: unit + integration
**Gate**: full (`npm test`)

**Commit**: `test: implement all 13 required test scenarios`

---

### T18: Documentação [P]

**What**: Criar `README.md` do projeto com setup/arquitetura/trade-offs e `AI_WORKLOG.md` documentando uso de IA
**Where**: `README.md`, `AI_WORKLOG.md`
**Depends on**: Todos os outros tasks (documentar o que foi construído)
**Reuses**: `.specs/` para referência
**Requirement**: AR-09

**Done when**:
- [ ] `README.md` contém:
  - Seção Setup (clone, env vars, `docker-compose up`, seed, verificação)
  - Seção Arquitetura (stack, estrutura de rotas, schema do banco)
  - Seção Trade-offs (decisões tomadas com justificativa)
  - Seção Verificação (`npm test`, endpoints a testar manualmente)
- [ ] `AI_WORKLOG.md` contém:
  - Ferramentas e agentes usados (Claude Code, TLC skill)
  - Prompts/instruções principais
  - Outputs aceitos e rejeitados
  - Etapas de verificação
  - Riscos remanescentes
- [ ] Todos os artefatos `.specs/` commitados junto

**Tests**: none
**Gate**: none (documentação)

**Commit**: `docs: add README with setup/architecture/tradeoffs and AI_WORKLOG`

---

## Parallel Execution Map

```
Phase 1 (Sequential — Foundation):
  T1 ──→ T2 ──→ T3 ──→ T4

Phase 2 (Parallel — Domínio Puro, sem DB):
  T1 complete, então:
    ├── T5 [P]  (aging engine)
    ├── T6 [P]  (tipos)
    └── T7 [P]  (reminder engine)

Phase 3 (Sequencial por grupo):
  T5+T6 → T8 (invoice service)
  T8 → T9 (dashboard API)
  T8 → T10 (finance decisions API)
  T2 → T11 (token service)
  T11 → T12 (portal tokens API)
  T8+T11 → T13 (portal data API)

Phase 4 (Parallel — UI):
  T9+T10+T12 completos, então:
    ├── T14 [P]  (dashboard page)
    └── T15 [P]  (portal page)

Phase 5 (Sequential):
  T7+T8 → T16 (reminders API)

Phase 6 (Parallel — docs e testes finais):
  All complete, então:
    ├── T17 [P]  (test suite completa)
    └── T18 [P]  (README + AI_WORKLOG)
```

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Init Next.js | 1 setup (config files) | ✅ Granular |
| T2: Schema Prisma | 1 schema file + migration | ✅ Granular |
| T3: Docker Compose | 1 docker-compose.yml + Dockerfile | ✅ Granular |
| T4: Seed Script | 1 seed.ts | ✅ Granular |
| T5: Aging Engine | 1 função pura + testes | ✅ Granular |
| T6: Tipos | 1 types/index.ts | ✅ Granular |
| T7: Reminder Engine | 1 função pura + interface + testes | ✅ Granular |
| T8: Invoice Service | 1 service (3 métodos coesos) + testes integração | ✅ Granular |
| T9: Dashboard API | 1 route handler | ✅ Granular |
| T10: Finance Decisions API | 1 route handler | ✅ Granular |
| T11: Token Service | 1 lib (3 funções coesas) + testes | ✅ Granular |
| T12: Portal Tokens API | 1 route handler | ✅ Granular |
| T13: Portal Data API | 1 route handler + 1 service | ✅ Granular |
| T14: Dashboard Page | 1 page + 2 componentes coesos | ✅ Granular |
| T15: Portal Page | 1 page | ✅ Granular |
| T16: Reminders API | 1 route handler | ✅ Granular |
| T17: Test Suite | 1 test file (13 describes) | ✅ Granular |
| T18: Documentação | README + AI_WORKLOG | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Mostra | Status |
|---|---|---|---|
| T1 | None | Início | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T2, T3 | T2+T3→T4 | ✅ |
| T5 | T1 | T1→T5[P] | ✅ |
| T6 | T1 | T1→T6[P] | ✅ |
| T7 | T1, T5 | T1+T5→T7[P] | ✅ |
| T8 | T2, T5, T6 | T5+T6→T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |
| T10 | T8 | T8→T10 | ✅ |
| T11 | T2 | T2→T11 | ✅ |
| T12 | T11 | T11→T12 | ✅ |
| T13 | T8, T11 | T8+T11→T13 | ✅ |
| T14 | T9, T10, T12 | T9+T10+T12→T14[P] | ✅ |
| T15 | T13 | T13→T15[P] | ✅ |
| T16 | T7, T8 | T7+T8→T16 | ✅ |
| T17 | T5, T7, T8, T11, T13 | All→T17[P] | ✅ |
| T18 | All | All→T18[P] | ✅ |

---

## Test Co-location Validation

| Task | Camada Criada | Requer | Task Diz | Status |
|---|---|---|---|---|
| T1 | Setup/config | none | none | ✅ |
| T2 | Schema DB | none | none | ✅ |
| T3 | Infra Docker | none | none | ✅ |
| T4 | Seed script | unit (idempotência) | unit | ✅ |
| T5 | Lib pura | unit | unit | ✅ |
| T6 | Tipos | none | none | ✅ |
| T7 | Lib pura | unit | unit | ✅ |
| T8 | Service (DB) | integration | integration | ✅ |
| T9 | API route | integration | integration | ✅ |
| T10 | API route | integration | integration | ✅ |
| T11 | Token service | unit | unit | ✅ |
| T12 | API route | integration | integration | ✅ |
| T13 | API route + service | integration | integration | ✅ |
| T14 | UI page | none (manual) | none | ✅ |
| T15 | UI page | none (manual) | none | ✅ |
| T16 | API route | integration | integration | ✅ |
| T17 | Test suite | unit+integration | unit+integration | ✅ |
| T18 | Docs | none | none | ✅ |
