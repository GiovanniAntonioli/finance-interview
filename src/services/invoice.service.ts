import { calculateAging } from '@/domain/aging'
import {
  findAllInvoices,
  findInvoiceById,
  updateFinanceStatus,
} from '@/repositories/invoice.repository'
import { createAuditEntry } from '@/repositories/audit.repository'
import { getCustomerSummaries } from '@/repositories/customer.repository'
import { getActiveTokenForCustomer } from '@/repositories/portal-token.repository'
import type { ARSummary, AgingBand, DashboardCustomer, FinanceDecision } from '@/types'
import type { AuditEntry, Invoice } from '@prisma/client'

const DEFAULT_ACTOR = 'finance-user@filterbuy.com'

export async function getDashboardSummary(
  today: Date
): Promise<{ summary: ARSummary; customers: DashboardCustomer[] }> {
  const [invoices, customers] = await Promise.all([
    findAllInvoices(),
    getCustomerSummaries(),
  ])

  const emptyBands = (): ARSummary['breakdown'] => ({
    current: { count: 0, totalCents: 0 },
    '1-30': { count: 0, totalCents: 0 },
    '31-60': { count: 0, totalCents: 0 },
    '61-90': { count: 0, totalCents: 0 },
    '90+': { count: 0, totalCents: 0 },
    'no-due-date': { count: 0, totalCents: 0 },
  })

  const summary: ARSummary = { totalOpenCents: 0, breakdown: emptyBands() }

  type CustomerAgg = {
    openCents: number
    openCount: number
    maxAgingDays: number | null
    worstBand: AgingBand
  }
  const agg = new Map<string, CustomerAgg>()

  for (const inv of invoices) {
    if (inv.financeStatus !== 'open') continue

    const { agingDays, band } = calculateAging(inv.dueDate, today)
    const cents = inv.amountDueCents - inv.amountPaidCents

    summary.totalOpenCents += cents
    summary.breakdown[band].count++
    summary.breakdown[band].totalCents += cents

    const prev = agg.get(inv.customerId)
    const prevDays = prev?.maxAgingDays ?? null
    const newMaxDays =
      agingDays === null
        ? prevDays
        : prevDays === null
        ? agingDays
        : Math.max(prevDays, agingDays)

    agg.set(inv.customerId, {
      openCents: (prev?.openCents ?? 0) + cents,
      openCount: (prev?.openCount ?? 0) + 1,
      maxAgingDays: newMaxDays,
      worstBand: worstBand(prev?.worstBand ?? 'current', band),
    })
  }

  const tokenMap = new Map<string, 'active' | 'none'>()
  await Promise.all(
    customers.map(async (c) => {
      const token = await getActiveTokenForCustomer(c.customerId)
      tokenMap.set(c.customerId, token ? 'active' : 'none')
    })
  )

  const dashboardCustomers: DashboardCustomer[] = customers
    .filter((c) => agg.has(c.customerId))
    .map((c) => {
      const a = agg.get(c.customerId)!
      return {
        customerId: c.customerId,
        displayName: c.displayName,
        email: c.email,
        openInvoiceCount: a.openCount,
        totalOpenCents: a.openCents,
        maxAgingDays: a.maxAgingDays,
        agingBand: a.worstBand,
        portalLinkStatus: tokenMap.get(c.customerId) ?? 'none',
        nextAction: recommendedAction(a.worstBand, c.email),
      }
    })
    .sort((a, b) => b.totalOpenCents - a.totalOpenCents)

  return { summary, customers: dashboardCustomers }
}

export async function applyFinanceDecision(
  invoiceId: string,
  decision: FinanceDecision
): Promise<{ invoice: Invoice; auditEntry: AuditEntry }> {
  if (!decision.reason?.trim()) throw new Error('reason is required')

  const invoice = await findInvoiceById(invoiceId)
  if (!invoice) throw new Error('Invoice not found')

  const auditEntry = await createAuditEntry({
    invoiceId: invoice.id,
    previousStatus: invoice.financeStatus,
    nextStatus: decision.nextStatus,
    reason: decision.reason,
    reference: decision.reference,
    actor: decision.actor ?? DEFAULT_ACTOR,
  })

  const updated = await updateFinanceStatus(invoice.id, decision.nextStatus)
  return { invoice: updated, auditEntry }
}

function worstBand(a: AgingBand, b: AgingBand): AgingBand {
  const rank: Record<AgingBand, number> = {
    'current': 0,
    'no-due-date': 1,
    '1-30': 2,
    '31-60': 3,
    '61-90': 4,
    '90+': 5,
  }
  return rank[a] >= rank[b] ? a : b
}

function recommendedAction(band: AgingBand, email: string | null): string {
  if (!email) return 'Internal alert: no email'
  switch (band) {
    case 'current': return 'Monitor'
    case 'no-due-date': return 'Review: missing due date'
    case '1-30': return 'Send past-due reminder'
    case '31-60': return 'Send escalation'
    case '61-90': return 'Escalate to manager'
    case '90+': return 'High-risk: legal/write-off review'
  }
}
