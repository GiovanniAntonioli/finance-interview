import { generateRawToken, hashToken } from '@/lib/token'
import {
  createPortalToken,
  findPortalTokenByHash,
  revokeCustomerTokens,
  touchPortalToken,
} from '@/repositories/portal-token.repository'
import { findOpenInvoicesByCustomer } from '@/repositories/invoice.repository'
import { getCustomerSummaries } from '@/repositories/customer.repository'
import { calculateAging } from '@/domain/aging'
import type { PortalInvoice } from '@/types'
import type { PortalToken } from '@prisma/client'

const TOKEN_TTL_DAYS = 30
const DEFAULT_CREATOR = 'finance-user@filterbuy.com'

export async function createPortalLink(
  customerId: string,
  createdBy = DEFAULT_CREATOR
): Promise<{ rawToken: string; portalUrl: string; expiresAt: Date }> {
  await revokeCustomerTokens(customerId)

  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

  await createPortalToken({ customerId, tokenHash, expiresAt, createdBy })

  return { rawToken, portalUrl: `/portal/${rawToken}`, expiresAt }
}

export async function validatePortalToken(rawToken: string): Promise<PortalToken | null> {
  const tokenHash = hashToken(rawToken)
  const token = await findPortalTokenByHash(tokenHash)

  if (!token) return null
  if (token.status !== 'active') return null
  if (token.expiresAt < new Date()) return null

  await touchPortalToken(token.id)
  return token
}

export async function getCustomerPortalData(
  token: PortalToken,
  today: Date
): Promise<{ customer: { customerId: string; displayName: string; email: string | null; totalOpenCents: number }; invoices: PortalInvoice[] }> {
  const { customerId } = token

  const [invoices, customers] = await Promise.all([
    findOpenInvoicesByCustomer(customerId),
    getCustomerSummaries(),
  ])

  const customer = customers.find((c) => c.customerId === customerId)

  const portalInvoices: PortalInvoice[] = invoices.map((inv) => {
    const { agingDays, band } = calculateAging(inv.dueDate, today)
    return {
      id: inv.id,
      externalId: inv.externalId,
      invoiceNumber: inv.invoiceNumber,
      dueDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : null,
      agingDays,
      agingBand: band,
      amountDueCents: inv.amountDueCents - inv.amountPaidCents,
      hostedInvoiceUrl: inv.hostedInvoiceUrl,
    }
  })

  const totalOpenCents = portalInvoices.reduce((sum, i) => sum + i.amountDueCents, 0)

  return {
    customer: {
      customerId,
      displayName: customer?.displayName ?? customerId,
      email: customer?.email ?? null,
      totalOpenCents,
    },
    invoices: portalInvoices,
  }
}
