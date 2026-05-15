import { prisma } from '@/lib/db'
import type { AuditEntry } from '@prisma/client'

export interface CreateAuditEntryInput {
  invoiceId: string
  previousStatus: string
  nextStatus: string
  reason: string
  reference?: string
  actor: string
}

export async function createAuditEntry(input: CreateAuditEntryInput): Promise<AuditEntry> {
  return prisma.auditEntry.create({ data: input })
}

export async function findAuditEntriesByInvoice(invoiceId: string): Promise<AuditEntry[]> {
  return prisma.auditEntry.findMany({
    where: { invoiceId },
    orderBy: { occurredAt: 'desc' },
  })
}
