import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getDashboardSummary, applyFinanceDecision } from './invoice.service'

const prisma = new PrismaClient()
const TODAY = new Date('2026-05-15')

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('financeStatus vs providerStatus separation (TEST-02)', () => {
  it('invoice paid by finance but open at provider counts only in finance view', async () => {
    const inv = await prisma.invoice.findFirst({ where: { externalId: 'inv_002' } })
    expect(inv).not.toBeNull()
    expect(inv!.providerStatus).toBe('open')
    expect(inv!.financeStatus).toBe('paid')

    const { summary } = await getDashboardSummary(TODAY)
    const openIds = await prisma.invoice.findMany({
      where: { financeStatus: 'open' },
      select: { externalId: true },
    })
    const openExternalIds = openIds.map((i) => i.externalId)
    expect(openExternalIds).not.toContain('inv_002')
    expect(summary.totalOpenCents).toBeGreaterThan(0)
  })
})

describe('customer grouping despite name variations (TEST-03)', () => {
  it('cus_acme with different names appears as one customer in dashboard', async () => {
    const acmeInvoices = await prisma.invoice.findMany({
      where: { customerId: 'cus_acme' },
      select: { customerName: true },
    })
    const names = new Set(acmeInvoices.map((i) => i.customerName))
    expect(names.size).toBeGreaterThan(1)

    const { customers } = await getDashboardSummary(TODAY)
    const acmeEntries = customers.filter((c) => c.customerId === 'cus_acme')
    expect(acmeEntries).toHaveLength(1)
  })
})

describe('finance status transitions (TEST-04)', () => {
  let testInvoiceId: string

  beforeEach(async () => {
    const inv = await prisma.invoice.create({
      data: {
        externalId: `test_${Date.now()}`,
        invoiceNumber: 'TEST-9999',
        customerId: 'cus_test',
        customerName: 'Test Corp',
        customerEmail: 'test@example.com',
        amountDueCents: 10000,
        providerStatus: 'open',
        financeStatus: 'open',
      },
    })
    testInvoiceId = inv.id
  })

  afterEach(async () => {
    await prisma.auditEntry.deleteMany({ where: { invoiceId: testInvoiceId } })
    await prisma.invoice.delete({ where: { id: testInvoiceId } })
  })

  it('open → paid transition updates financeStatus', async () => {
    const { invoice } = await applyFinanceDecision(testInvoiceId, {
      nextStatus: 'paid',
      reason: 'Payment received',
      actor: 'test@filterbuy.com',
    })
    expect(invoice.financeStatus).toBe('paid')
  })

  it('open → uncollectible transition', async () => {
    const { invoice } = await applyFinanceDecision(testInvoiceId, {
      nextStatus: 'uncollectible',
      reason: 'Customer went bankrupt',
      actor: 'test@filterbuy.com',
    })
    expect(invoice.financeStatus).toBe('uncollectible')
  })

  it('paid → open (reopen) transition', async () => {
    await applyFinanceDecision(testInvoiceId, {
      nextStatus: 'paid',
      reason: 'First decision',
      actor: 'test@filterbuy.com',
    })
    const { invoice } = await applyFinanceDecision(testInvoiceId, {
      nextStatus: 'open',
      reason: 'Reopening: payment reversed',
      actor: 'test@filterbuy.com',
    })
    expect(invoice.financeStatus).toBe('open')
  })
})

describe('audit entry creation (TEST-05)', () => {
  let testInvoiceId: string

  beforeEach(async () => {
    const inv = await prisma.invoice.create({
      data: {
        externalId: `audit_${Date.now()}`,
        invoiceNumber: 'AUDIT-9999',
        customerId: 'cus_test',
        customerName: 'Test Corp',
        customerEmail: 'test@example.com',
        amountDueCents: 5000,
        providerStatus: 'open',
        financeStatus: 'open',
      },
    })
    testInvoiceId = inv.id
  })

  afterEach(async () => {
    await prisma.auditEntry.deleteMany({ where: { invoiceId: testInvoiceId } })
    await prisma.invoice.delete({ where: { id: testInvoiceId } })
  })

  it('creates audit entry with all required fields', async () => {
    const { auditEntry } = await applyFinanceDecision(testInvoiceId, {
      nextStatus: 'paid',
      reason: 'Check #1234',
      reference: 'check-1234',
      actor: 'maria@filterbuy.com',
    })

    expect(auditEntry.previousStatus).toBe('open')
    expect(auditEntry.nextStatus).toBe('paid')
    expect(auditEntry.reason).toBe('Check #1234')
    expect(auditEntry.reference).toBe('check-1234')
    expect(auditEntry.actor).toBe('maria@filterbuy.com')
    expect(auditEntry.occurredAt).toBeInstanceOf(Date)
    expect(auditEntry.invoiceId).toBe(testInvoiceId)
  })

  it('rejects decision without reason', async () => {
    await expect(
      applyFinanceDecision(testInvoiceId, {
        nextStatus: 'paid',
        reason: '',
        actor: 'test@filterbuy.com',
      })
    ).rejects.toThrow('reason is required')
  })

  it('previousStatus is correct across chained transitions', async () => {
    await applyFinanceDecision(testInvoiceId, {
      nextStatus: 'paid', reason: 'First', actor: 'a@b.com',
    })
    const { auditEntry } = await applyFinanceDecision(testInvoiceId, {
      nextStatus: 'open', reason: 'Reopened', actor: 'a@b.com',
    })
    expect(auditEntry.previousStatus).toBe('paid')
    expect(auditEntry.nextStatus).toBe('open')
  })
})
