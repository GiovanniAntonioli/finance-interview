# AR Collections Portal — Design de Arquitetura

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| ORM | Prisma |
| Banco | PostgreSQL 16 |
| Estilo | Tailwind CSS |
| Testes | Jest + ts-jest (unit/integration) |
| Infra | Docker Compose (app + postgres) |

## Estrutura de Rotas (App Router)

```
app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Redirect → /dashboard
├── dashboard/
│   ├── page.tsx                  # Dashboard interno AR (AR-03)
│   └── _components/
│       ├── ARSummary.tsx         # Total AR + breakdown aging
│       └── CustomerTable.tsx     # Tabela de clientes
├── portal/
│   └── [token]/
│       └── page.tsx              # Portal público do cliente (AR-06)
└── api/
    ├── invoices/
    │   ├── route.ts              # GET /api/invoices (list)
    │   └── [id]/
    │       └── status/
    │           └── route.ts      # POST /api/invoices/[id]/status (AR-04)
    ├── dashboard/
    │   └── route.ts              # GET /api/dashboard (summary + customers)
    ├── portal-tokens/
    │   └── route.ts              # POST /api/portal-tokens (gerar token, AR-05)
    ├── portal/
    │   └── [token]/
    │       └── route.ts          # GET /api/portal/[token] (validar token, AR-06)
    └── reminders/
        └── route.ts              # GET /api/reminders?today=YYYY-MM-DD (AR-07)
```

## Schema Prisma

```prisma
model Invoice {
  id                String   @id @default(cuid())
  externalId        String   @unique
  invoiceNumber     String
  customerId        String
  customerName      String
  customerEmail     String?
  amountDueCents    Int
  amountPaidCents   Int      @default(0)
  providerStatus    String
  financeStatus     String   @default("open")
  invoiceDate       DateTime?
  dueDate           DateTime?
  hostedInvoiceUrl  String?
  paymentReference  String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  auditEntries      AuditEntry[]

  @@index([customerId])
  @@index([financeStatus])
}

model AuditEntry {
  id               String   @id @default(cuid())
  invoiceId        String
  invoice          Invoice  @relation(fields: [invoiceId], references: [id])
  previousStatus   String
  nextStatus       String
  reason           String
  reference        String?
  actor            String
  occurredAt       DateTime @default(now())

  @@index([invoiceId])
}

model PortalToken {
  id             String   @id @default(cuid())
  customerId     String
  tokenHash      String   @unique   // SHA-256 do token bruto — nunca armazenar bruto
  status         String   @default("active")  // active | revoked | expired
  expiresAt      DateTime
  accessCount    Int      @default(0)
  lastAccessedAt DateTime?
  createdBy      String
  createdAt      DateTime @default(now())

  @@index([customerId])
  @@index([tokenHash])
}

model CollectionEvent {
  id                  String   @id @default(cuid())
  eventId             String   @unique
  type                String
  invoiceExternalId   String?
  customerId          String?
  payload             Json
  occurredAt          DateTime

  @@index([customerId])
  @@index([invoiceExternalId])
}
```

## Camadas de Domínio

```
src/
├── lib/
│   ├── aging.ts              # Função pura: calculateAging(dueDate, today) → AgingResult
│   ├── reminder-engine.ts    # Função pura: generateReminderActions(invoices, today) → Action[]
│   ├── token-service.ts      # generateToken(), hashToken(), validateToken()
│   └── db.ts                 # Prisma client singleton
├── services/
│   ├── invoice-service.ts    # getInvoices, getDashboardSummary, applyFinanceDecision
│   ├── portal-service.ts     # createPortalToken, getCustomerPortalData
│   └── customer-service.ts   # resolveCustomerIdentity, groupByCustomer
└── types/
    └── index.ts              # AgingBand, FinanceStatus, ReminderAction, etc.
```

## Decisões de Design

### Identidade do Cliente
`customerId` é o identificador estável. Todas as queries de agrupamento usam `customerId`.
`customerName` para exibição usa o nome da fatura mais recente por `customerId`.

### null dueDate
Faturas sem `dueDate` recebem `agingBand = "no-due-date"`. São exibidas no dashboard com badge
amarelo. O motor de lembretes gera `internal_review` para elas — nunca `customer_reminder`.
Decisão de produto: tratar como "a revisar", não como "em atraso".

### null customerEmail
Campo `customerEmail` pode ser null. O motor bloqueia qualquer lembrete ao cliente e dispara
`internal_alert` para `ar-team@filterbuy.com`.

### Token de Portal
- Geração: `crypto.randomBytes(32)` → base64url → token bruto (64 chars)
- Hash: `crypto.createHash('sha256').update(rawToken).digest('hex')`
- Armazenamento: apenas hash na tabela `PortalToken`
- Retorno: token bruto retornado UMA VEZ na resposta POST
- Expiração: 30 dias por padrão
- Revogação: ao criar novo token para cliente, anterior é marcado `revoked`

### Separação de Status
`providerStatus` = campo somente-leitura, preservado do fixture/provedor.
`financeStatus` = campo mutável pela aplicação. Apenas `financeStatus = "open"` conta como AR cobrável.

### Motor de Lembretes
Função pura que recebe `invoices[]` + `today: Date` e retorna `Action[]`. Não tem efeitos
colaterais, não envia e-mails. `EmailProvider` é uma interface com implementação fake que apenas
faz log. Facilita substituição futura por SendGrid/SES.

### Cadência de Lembretes
| Condição | Tipo de Ação | Template |
|---|---|---|
| vence em ≤ 7 dias (agingDays entre -7 e 0) | customer_reminder | due_soon |
| 1-30 dias em atraso | customer_reminder | past_due |
| 31-89 dias em atraso | customer_reminder | escalation |
| 90+ dias em atraso | internal_alert | high_risk_escalation |
| null dueDate | internal_review | missing_due_date |
| null email + em atraso | internal_alert | missing_email_escalation |

### Seed de Fixtures
Script `prisma/seed.ts` lê `datasets/invoices.json` e `datasets/collection_events.json`.
Usa `upsert` para ser idempotente. Importa `collection_events` como `CollectionEvent` preservando
payload completo em JSON.

## Diagrama de Fluxo — Finance Decision

```
POST /api/invoices/[id]/status
  │
  ├─ Validar: body tem reason? → 400 se não
  ├─ Buscar Invoice por id
  ├─ Validar transição (open→paid ok, paid→uncollectible? ok, etc.)
  ├─ Criar AuditEntry { previousStatus, nextStatus, reason, reference?, actor, occurredAt }
  ├─ Atualizar Invoice.financeStatus
  └─ Retornar { invoice, auditEntry }
```

## Diagrama de Fluxo — Portal Token

```
POST /api/portal-tokens { customerId }
  │
  ├─ Gerar rawToken = crypto.randomBytes(32).toString('base64url')
  ├─ Calcular tokenHash = sha256(rawToken)
  ├─ Revogar tokens ativos anteriores do customerId
  ├─ Inserir PortalToken { customerId, tokenHash, status: 'active', expiresAt: now+30d }
  └─ Retornar { portalUrl: '/portal/[rawToken]', expiresAt }

GET /portal/[token]  (ou GET /api/portal/[token])
  │
  ├─ Hash do token recebido
  ├─ Buscar PortalToken por tokenHash
  ├─ Verificar status = 'active' → 401 se não
  ├─ Verificar expiresAt > now → 401 se expirado
  ├─ Atualizar accessCount + lastAccessedAt
  ├─ Buscar invoices WHERE customerId = token.customerId AND financeStatus = 'open'
  └─ Retornar dados do cliente + lista de faturas
```
