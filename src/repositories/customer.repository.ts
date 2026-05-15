import { prisma } from '@/lib/db'

export interface CustomerSummary {
  customerId: string
  displayName: string
  email: string | null
}

export async function getCustomerSummaries(): Promise<CustomerSummary[]> {
  const rows = await prisma.invoice.findMany({
    select: { customerId: true, customerName: true, customerEmail: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const seen = new Map<string, CustomerSummary>()
  for (const r of rows) {
    if (!seen.has(r.customerId)) {
      seen.set(r.customerId, {
        customerId: r.customerId,
        displayName: r.customerName,
        email: r.customerEmail,
      })
    }
  }
  return Array.from(seen.values())
}
