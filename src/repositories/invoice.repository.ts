import { prisma } from '@/lib/db'
import type { Invoice } from '@prisma/client'

export async function findAllInvoices(): Promise<Invoice[]> {
  return prisma.invoice.findMany({ orderBy: { customerId: 'asc' } })
}

export async function findInvoiceById(id: string): Promise<Invoice | null> {
  return prisma.invoice.findUnique({ where: { id } })
}

export async function findOpenInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
  return prisma.invoice.findMany({
    where: { customerId, financeStatus: 'open' },
    orderBy: { dueDate: 'asc' },
  })
}

export async function updateFinanceStatus(
  id: string,
  financeStatus: string
): Promise<Invoice> {
  return prisma.invoice.update({ where: { id }, data: { financeStatus } })
}
