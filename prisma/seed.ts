import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface InvoiceFixture {
  externalId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerEmail: string | null
  amountDueCents: number
  amountPaidCents: number
  providerStatus: string
  financeStatus: string
  invoiceDate: string | null
  dueDate: string | null
  hostedInvoiceUrl?: string | null
  paymentReference?: string | null
}

interface CollectionEventFixture {
  eventId: string
  type: string
  invoiceExternalId?: string | null
  customerId?: string | null
  occurredAt: string
  [key: string]: unknown
}

async function main() {
  const datasetsDir = path.join(__dirname, '..', 'datasets')

  const invoices: InvoiceFixture[] = JSON.parse(
    fs.readFileSync(path.join(datasetsDir, 'invoices.json'), 'utf-8')
  )

  const events: CollectionEventFixture[] = JSON.parse(
    fs.readFileSync(path.join(datasetsDir, 'collection_events.json'), 'utf-8')
  )

  console.log(`Seeding ${invoices.length} invoices...`)

  for (const inv of invoices) {
    await prisma.invoice.upsert({
      where: { externalId: inv.externalId },
      update: {},
      create: {
        externalId: inv.externalId,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customerName,
        customerEmail: inv.customerEmail ?? null,
        amountDueCents: inv.amountDueCents,
        amountPaidCents: inv.amountPaidCents ?? 0,
        providerStatus: inv.providerStatus,
        financeStatus: inv.financeStatus,
        invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate) : null,
        dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
        hostedInvoiceUrl: inv.hostedInvoiceUrl ?? null,
        paymentReference: inv.paymentReference ?? null,
      },
    })
  }

  console.log(`Seeding ${events.length} collection events...`)

  for (const evt of events) {
    const { eventId, type, invoiceExternalId, customerId, occurredAt, createdAt, ...rest } = evt
    const rawDate = occurredAt ?? createdAt
    const occurredAtDate = rawDate ? new Date(rawDate as string) : new Date()
    await prisma.collectionEvent.upsert({
      where: { eventId },
      update: {},
      create: {
        eventId,
        type,
        invoiceExternalId: (invoiceExternalId as string) ?? null,
        customerId: (customerId as string) ?? null,
        occurredAt: occurredAtDate,
        payload: rest as object,
      },
    })
  }

  const invoiceCount = await prisma.invoice.count()
  const eventCount = await prisma.collectionEvent.count()
  console.log(`Done. DB has ${invoiceCount} invoices, ${eventCount} collection events.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
