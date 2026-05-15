# AR Collections Portal

Internal AR collections tool for Filterbuy. Allows the finance team to monitor open receivables, generate secure customer payment links, make finance decisions on invoices, and run a reminder/escalation engine.

## Stack

- **Next.js 15** (App Router) — server and client components
- **TypeScript** (strict mode)
- **Prisma 6** + **PostgreSQL 16**
- **Tailwind CSS 4**
- **Jest** + **ts-jest** — unit and integration tests
- **Docker Compose** — app + database

## Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 20+

### Running with Docker Compose

```bash
cp .env.example .env
docker-compose up --build
```

The app will be available at `http://localhost:3000`.

### Running locally (without Docker)

```bash
cp .env.example .env
# Edit .env with your local PostgreSQL connection string

npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

### Environment variables

```
DATABASE_URL=postgresql://finance:finance@localhost:5432/finance_db
```

## Seeding the database

```bash
npm run seed
```

Loads `datasets/invoices.json` (180 invoices) and `datasets/collection_events.json` (80 events) into the database.

## Running tests

```bash
npm test
```

Tests cover all 13 required scenarios from the spec: aging bucket boundaries, finance status transitions, audit trail, portal token security, customer isolation, reminder eligibility, missing email/due date behavior, and paid invoice exclusion.

## Architecture

```
src/
  domain/          # Pure business logic (no I/O)
    aging.ts       # Aging calculation and band classification
    reminder-engine.ts  # Reminder/escalation action generator
  repositories/    # Database access (Prisma)
    invoice.repository.ts
    audit.repository.ts
    customer.repository.ts
    portal-token.repository.ts
  services/        # Orchestration layer
    invoice.service.ts   # Dashboard summary + finance decisions
    portal.service.ts    # Token generation and validation
  app/
    api/           # HTTP endpoints
      dashboard/
      invoices/[id]/status/
      portal-tokens/
      portal/[token]/
      reminders/
    dashboard/     # Internal finance UI
    portal/[token]/ # Public customer portal
  types/           # Shared TypeScript types
  lib/
    db.ts          # Prisma singleton
    token.ts       # Token generation and hashing
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard?today=YYYY-MM-DD` | AR summary + customer table |
| POST | `/api/invoices/:id/status` | Apply finance decision |
| POST | `/api/portal-tokens` | Generate customer portal link |
| GET | `/api/portal/:token?today=YYYY-MM-DD` | Customer portal data |
| GET | `/api/reminders?today=YYYY-MM-DD` | Reminder and escalation actions |

## Key Design Decisions

### Stable customer identity
Customers are grouped by `customerId`, not `customerName`. The fixture includes name variations for the same customer (e.g. "Acme HVAC" and "ACME HVAC LLC" share `cus_acme`). The repository deduplicates by `customerId` and prefers the most recent non-empty email across all invoices.

### Two status fields
`providerStatus` is read-only synced data from the external provider. `financeStatus` is Filterbuy's internal decision. Only `financeStatus = "open"` invoices count as collectible AR.

### Portal token security
Raw tokens are never stored. Only a SHA-256 hash is persisted. The raw token is returned once via the API and immediately opened in the customer's browser. Previous tokens are revoked on regeneration.

### Invoices without dueDate
These fall into the `no-due-date` band. They are excluded from aging calculations and do not generate customer reminders. The reminder engine generates an `internal_review / missing_due_date` action for manual review by the AR team.

### Deterministic dates
All aging and reminder logic accepts a `today: Date` parameter — `new Date()` is never called internally. This makes every calculation testable and reproducible with `2026-05-15` as the demo date.

### Reminder engine vs dashboard
The reminder engine (`/api/reminders`) generates per-invoice actions for automated consumption (e.g. a daily cron job that would send emails). The dashboard "Next Action" column uses an equivalent inline function to show a per-customer recommendation without calling the engine endpoint.

## Reminder Engine Behavior

| Condition | Action |
|-----------|--------|
| Due in ≤ 7 days, has email | `customer_reminder / due_soon` |
| 1–30 days overdue, has email | `customer_reminder / past_due` |
| 31–89 days overdue, has email | `customer_reminder / escalation` |
| 90+ days overdue (always) | `internal_alert / high_risk_escalation` |
| 90+ days overdue, has email | + `customer_reminder / escalation` |
| Overdue, no email | `internal_alert / missing_email_escalation` |
| No due date | `internal_review / missing_due_date` |
| Paid or uncollectible | no action |

## Verification

```bash
# 1. Seed and start
npm run seed
npm run dev

# 2. Dashboard (use date picker to change "today")
open http://localhost:3000/dashboard

# 3. Reminder engine
curl "http://localhost:3000/api/reminders?today=2026-05-15"

# 4. Run tests
npm test
```

## What I would do next

- Connect the reminder engine to a real email provider (SendGrid, Resend) behind a feature flag
- Add pagination and filtering to the customer table
- Add webhook ingestion to sync `providerStatus` in real time
- Per-invoice finance decisions instead of per-customer modal
- Role-based access control for the internal dashboard
