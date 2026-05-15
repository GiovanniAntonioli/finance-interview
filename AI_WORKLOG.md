# AI Worklog

Documents how AI agents were used throughout this project.

## Tools and Agents

- **Claude Code (claude-sonnet-4-6)** — primary execution agent for the entire build
- **TLC skill** — used at the start to analyze the spec and produce a structured execution plan with 18 atomic tasks

## Execution Flow

### Phase 1 — Planning
The TLC skill analyzed `README.pt-BR.md` and produced:
- `.specs/project/PROJECT.md` — project context and goals
- `.specs/project/ROADMAP.md` — feature roadmap
- `.specs/project/STATE.md` — current state tracking
- `.specs/features/ar-portal/spec.md` — 8 user stories, 13 required test scenarios
- `.specs/features/ar-portal/design.md` — architecture, schema, domain layers, token flow
- `.specs/features/ar-portal/tasks.md` — 18 atomic tasks with dependencies

### Phase 2 — Implementation
Claude Code executed all 18 tasks sequentially, building:
- Prisma schema and seed script
- Domain layer (aging engine, reminder engine)
- Repository layer (invoice, audit, customer, portal token)
- Service layer (invoice service, portal service)
- API routes (dashboard, invoices, portal-tokens, portal, reminders)
- UI (dashboard page, customer table, AR summary cards, public portal)
- Docker setup (Dockerfile, docker-compose.yml)
- Test suite (4 test files covering all 13 required scenarios)

### Phase 3 — Verification and Fixes
The agent used a browser to validate the UI and caught several issues post-implementation.

## Accepted AI Suggestions

- Domain-driven layering: `domain/ → repositories/ → services/ → app/api/` — clean separation that made testing straightforward
- SHA-256 token hashing with one-time raw token exposure — correct security pattern
- `customerId` as stable identity key (not `customerName`) — caught the fixture name variation problem early
- `no-due-date` as an explicit aging band instead of treating null as overdue — deliberate product decision
- Deterministic `today` parameter threading through all domain functions — made tests reliable
- Downgrading from Prisma v7 to v6 when v7 had breaking API changes — pragmatic fix
- Using `tsx` instead of `ts-node` for the seed script — resolved module resolution errors

## Rejected AI Suggestions

- **Prisma v7 generator config** (`provider = "prisma-client"` with custom output path) — reverted after it caused runtime errors; kept standard `prisma-client-js`
- **Finance decision modal per-customer** — the AI implemented decisions at the customer level (one modal for the whole customer), but the spec implies per-invoice decisions. Not fixed due to time constraints; documented as a known gap in "what I would do next"
- **Auto-opening portal link after generation** — initial implementation stored the URL in local React state, which was lost on re-render when the parent component showed a loading state. Replaced with `window.open()` to open the portal immediately in a new tab

## Bugs Found and Fixed During Verification

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Table numbers invisible | Tailwind default text color too light | Added `text-gray-900` to table cells |
| Date picker off screen | No horizontal constraint | Added `mr-24` margin |
| Aging showed "-37d (no-due-date)" | `maxAgingDays` from one invoice mixed with `agingBand` from another | Show "sem vencimento" when band is `no-due-date` |
| Portal link button stayed "Renovar" after generation | Local `portalLinks` state reset on component unmount during loading | Replaced with `window.open()` |
| Nova Facilities showed no email badge but "Internal alert: no email" in next action | One invoice had `customerEmail: ""` (empty string); `??` operator doesn't catch empty string | Changed `??` to `\|\|` in display; repository now picks first non-empty email across all customer invoices |

## Verification Steps

- Ran `npm test` — all tests pass
- Manually tested dashboard with date picker at `2026-05-15`
- Validated customer grouping (cus_acme appears once despite name variations in fixture)
- Tested portal link generation — opens in new tab, scoped to correct customer
- Tested finance decision modal — requires reason, creates audit entry, updates status
- Called `/api/reminders?today=2026-05-15` and validated count against SQL query on the database (153 actions, consistent with 157 open invoices minus 4 `due_soon` invoices with no email)
- Tested expired/invalid portal token — returns "Link inválido ou expirado" page

## Remaining Risks

- Finance decision modal operates at the customer level, not per-invoice — a customer with multiple open invoices will have all of them affected or the decision is ambiguous
- No authentication on the internal dashboard — any user with the URL can access it
- `collection_events` are loaded into the database but not consumed by any current feature
- Portal token expiry is set at creation time but the exact TTL is hardcoded in the service — should be configurable
