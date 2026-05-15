# AI-Native Greenfield Build: AR Collections Portal

## Context

You are building a greenfield AR Collections Portal for Filterbuy.

Filterbuy receives invoice data from an external provider. Some customers are overdue. Accounting needs a lightweight internal tool to see open AR, generate secure customer payment links, and automate collection reminders.

This is not a request to build a full finance platform. Build a trustworthy first production slice.

## Interview Format

This exercise starts live with the interview team. Use the live session to clarify requirements, set up your AI execution loop, make early implementation progress, and explain your decisions as you work.

After the call, you will have up to 2 additional hours to finish, verify, and package your submission.

## Operational Setup

Do your work in a fork under your own GitHub profile or organization. This is the repository we will evaluate.

1. Fork this repository into your own GitHub account.
2. Clone your fork, not the original Filterbuy repository:

   ```bash
   git clone git@github.com:<your-github-user-or-org>/finance-interview.git
   cd finance-interview
   ```

3. Confirm `origin` points to your fork:

   ```bash
   git remote -v
   ```

   Expected shape:

   ```text
   origin  git@github.com:<your-github-user-or-org>/finance-interview.git (fetch)
   origin  git@github.com:<your-github-user-or-org>/finance-interview.git (push)
   ```

4. Build your solution in that cloned fork.
5. Commit all work products and push them to your fork.
6. Give the interview team access to your fork for evaluation. If your fork is private, add the requested Filterbuy reviewers as collaborators or grant access to the requested GitHub team.

Do not push your implementation to the original Filterbuy exercise repository.

Commit everything material that AI produces for the project, not only the final app code. This includes AI-generated specs, implementation plans, review notes, prompt/context files, test plans, and any other artifacts that influenced your solution. If you reject an AI-generated artifact, keep the relevant summary or excerpt in `AI_WORKLOG.md` and explain why.

## Your Job

Build a working AR collections system that can:

1. Load invoice data from the provided JSON fixtures.
2. Show an internal AR dashboard grouped by customer.
3. Compute aging days and aging buckets.
4. Preserve separate provider status and finance status.
5. Allow finance users to mark invoices as paid, uncollectible, or reopened.
6. Record an audit trail for finance decisions.
7. Generate secure customer portal links.
8. Expose a public customer portal page where a customer can view only their own eligible invoices.
9. Generate reminder and escalation actions based on due dates and aging days.
10. Include meaningful tests.

## Required Deliverables

Your submission must include:

- A working app.
- A working `docker-compose.yml` that can run the app and any required services from a clean checkout.
- Tests.
- A project `README.md` explaining setup, architecture, tradeoffs, and how to run verification.
- `AI_WORKLOG.md` documenting how you used AI agents.
- A short walkthrough of what you built and what you would do next.

This starter repo intentionally contains only instructions and datasets. You choose the stack.

## Fixtures

Use these fixtures as your starting data:

- `datasets/invoices.json`
- `datasets/collection_events.json`

You may transform the data into your chosen database schema during ingestion, but preserve the source fields and ambiguity. Do not silently clean away the edge cases.

Use `2026-05-15` as the default deterministic "today" for tests and demo data unless your app explicitly allows another date to be supplied.

## Core Business Rules

### Aging

Compute aging from `dueDate` to the supplied "today" date.

Required aging buckets:

- `current`: due today or in the future
- `1-30`: 1 to 30 days overdue
- `31-60`: 31 to 60 days overdue
- `61-90`: 61 to 90 days overdue
- `90+`: more than 90 days overdue

Invoices with no `dueDate` should not crash the system. Make a deliberate product decision for how they appear in the dashboard and reminder engine, then document it.

### Status Separation

`providerStatus` is the external provider's source state. Treat it as read-only synced data.

`financeStatus` is Filterbuy's internal business decision. It may differ from provider status.

Only invoices with `financeStatus = "open"` count as collectible open AR and reminder candidates.

### Finance Decisions

Support these decisions:

- Mark paid
- Mark uncollectible
- Reopen

Each transition must:

- Require a reason.
- Accept an optional reference, such as a check number or support ticket.
- Create an audit trail entry with previous status, next status, reason, reference, actor, and timestamp.

### Internal AR Dashboard

Minimum useful dashboard:

- Total open AR.
- Aging breakdown.
- Customer table with:
  - customer
  - email
  - open invoice count
  - total open amount
  - oldest aging days
  - portal link status
  - recommended next action

Grouping should use stable customer identity, not only display name. The fixture includes same-customer name variation.

### Secure Portal Links

Finance users must be able to generate a customer portal link.

Expected design:

- Generate a random token.
- Store only a token hash.
- Expire tokens.
- Scope tokens to a specific customer ID.
- Allow revocation or inactive status.
- Track access count and last accessed time.

Never store raw tokens at rest. Never expose invoices for another customer through the portal.

### Public Customer Portal

The public portal page should:

- Have no internal dashboard chrome.
- Show customer name.
- Show total open balance.
- List that customer's open invoices.
- Show invoice number, due date, aging, amount due, and provider payment link when available.
- Exclude paid, uncollectible, void, refunded, or other ineligible invoices.
- Never show invoices belonging to another customer.

### Reminder and Escalation Engine

Build a script, worker, service method, or UI action that accepts a supplied "today" date and returns actions to take. Do not send real emails.

Design a clean boundary, such as:

- `EmailProvider`
- fake or in-memory implementation
- action log
- tests

Example actions:

```json
[
  {
    "type": "customer_reminder",
    "invoiceExternalId": "inv_001",
    "customerId": "cus_acme",
    "customerEmail": "ap@acme.example",
    "template": "past_due",
    "reason": "Invoice is 44 days overdue"
  },
  {
    "type": "internal_alert",
    "customerId": "cus_beta",
    "recipient": "ar-team@filterbuy.com",
    "reason": "Customer has invoice 90+ days overdue and no email"
  }
]
```

Suggested behavior:

- Upcoming due reminder: invoice due in 7 days.
- Past due reminder: invoice is 1 to 30 days overdue.
- Escalation: invoice is 31 or more days overdue.
- High-risk escalation: invoice is more than 90 days overdue.
- Missing customer email should block customer reminders and produce an internal alert.
- Paid and uncollectible invoices should not produce reminder actions.
- Missing due date should produce an internal review action, not a customer reminder.

You may adjust cadence if you document the rules and test them.

## AI-Native Requirement

Do not approach this as a normal coding exercise.

We expect you to create an AI execution loop:

- Have one agent inspect the requirements and produce a system plan.
- Have another generate an initial implementation.
- Have another generate tests and edge cases.
- Have another review the diff for correctness and security.
- Use a browser agent or preview to validate the UI.
- Document where you accepted or rejected AI output.

You are allowed to move fast. You are not allowed to be gullible.

Keep `AI_WORKLOG.md` with:

- tools and agents used
- prompts or task instructions
- important outputs
- accepted suggestions
- rejected suggestions
- verification steps
- remaining risks

Good AI usage looks like operating an execution team, not asking autocomplete to fill files.

## Required Tests

Include tests for:

- Aging bucket boundaries.
- Finance status versus provider status.
- Customer grouping despite name variation.
- Finance status transitions.
- Audit entry creation.
- Valid portal token access.
- Expired portal token rejection.
- Revoked or inactive portal token rejection.
- Portal customer isolation.
- Reminder eligibility.
- Missing email behavior.
- Missing due date behavior.
- Paid invoices excluded from AR and reminders.

## Important Invariants

Preserve these invariants:

- Only `financeStatus = "open"` invoices count as collectible AR.
- Provider status is source data, not the finance decision.
- Finance decisions require audit trail.
- Finance decisions require a reason.
- Portal tokens are hashed at rest.
- Portal tokens are scoped to one customer.
- Expired or revoked tokens fail.
- Public portal cannot leak another customer's invoices.
- Missing customer email blocks customer reminders and may trigger internal alert.
- Aging and reminders are deterministic based on a supplied date.
