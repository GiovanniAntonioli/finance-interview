import { generateReminderActions } from './reminder-engine'

const TODAY = new Date('2026-05-15')

const base = {
  customerId: 'cus_test',
  customerEmail: 'test@example.com',
  financeStatus: 'open',
}

describe('reminder eligibility (TEST-10)', () => {
  it('non-open invoice generates no action', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2026-04-01'), financeStatus: 'paid' }],
      TODAY
    )
    expect(actions).toHaveLength(0)
  })

  it('open invoice generates action', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2026-04-01'), financeStatus: 'open' }],
      TODAY
    )
    expect(actions.length).toBeGreaterThan(0)
  })

  it('uncollectible invoice generates no action', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2026-04-01'), financeStatus: 'uncollectible' }],
      TODAY
    )
    expect(actions).toHaveLength(0)
  })
})

describe('paid invoices excluded from reminders (TEST-13)', () => {
  it('paid invoice with old due date generates no reminder', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_paid', dueDate: new Date('2025-12-01'), financeStatus: 'paid' }],
      TODAY
    )
    expect(actions).toHaveLength(0)
  })
})

describe('missing email behavior (TEST-11)', () => {
  it('overdue invoice with no email generates internal_alert, not customer_reminder', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_003', customerId: 'cus_beta', customerEmail: null, dueDate: new Date('2026-02-10') }],
      TODAY
    )
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('internal_alert')
    expect(actions[0].template).toBe('missing_email_escalation')
    expect(actions[0].recipient).toBe('ar-team@filterbuy.com')
    expect(actions[0].customerEmail).toBeUndefined()
  })

  it('current invoice with no email does not generate any action', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', customerEmail: null, dueDate: new Date('2026-05-22') }],
      TODAY
    )
    expect(actions).toHaveLength(0)
  })
})

describe('missing dueDate behavior (TEST-12)', () => {
  it('null dueDate generates internal_review, not customer_reminder', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_004', dueDate: null }],
      TODAY
    )
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('internal_review')
    expect(actions[0].template).toBe('missing_due_date')
  })
})

describe('reminder cadence', () => {
  it('due in 7 days → due_soon', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2026-05-22') }],
      TODAY
    )
    expect(actions[0].template).toBe('due_soon')
    expect(actions[0].type).toBe('customer_reminder')
  })

  it('1 day overdue → past_due', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2026-05-14') }],
      TODAY
    )
    expect(actions[0].template).toBe('past_due')
  })

  it('30 days overdue → past_due', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2026-04-15') }],
      TODAY
    )
    expect(actions[0].template).toBe('past_due')
  })

  it('31 days overdue → escalation', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2026-04-14') }],
      TODAY
    )
    expect(actions[0].template).toBe('escalation')
    expect(actions[0].type).toBe('customer_reminder')
  })

  it('inv_001: 44 days overdue → escalation', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_001', dueDate: new Date('2026-04-01') }],
      TODAY
    )
    expect(actions[0].template).toBe('escalation')
  })

  it('90+ days overdue → internal_alert high_risk', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2025-12-20') }],
      TODAY
    )
    expect(actions[0].type).toBe('internal_alert')
    expect(actions[0].template).toBe('high_risk_escalation')
    expect(actions[0].recipient).toBe('ar-team@filterbuy.com')
  })

  it('due today → due_soon (agingDays=0, within 7-day window)', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2026-05-15') }],
      TODAY
    )
    expect(actions[0].template).toBe('due_soon')
  })

  it('due in 8 days (beyond window) → no action', () => {
    const actions = generateReminderActions(
      [{ ...base, externalId: 'inv_x', dueDate: new Date('2026-05-23') }],
      TODAY
    )
    expect(actions).toHaveLength(0)
  })
})
