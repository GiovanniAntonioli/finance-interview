import { prisma } from '@/lib/db'
import type { PortalToken } from '@prisma/client'

export async function createPortalToken(data: {
  customerId: string
  tokenHash: string
  expiresAt: Date
  createdBy: string
}): Promise<PortalToken> {
  return prisma.portalToken.create({ data: { ...data, status: 'active' } })
}

export async function findPortalTokenByHash(tokenHash: string): Promise<PortalToken | null> {
  return prisma.portalToken.findUnique({ where: { tokenHash } })
}

export async function revokeCustomerTokens(customerId: string): Promise<void> {
  await prisma.portalToken.updateMany({
    where: { customerId, status: 'active' },
    data: { status: 'revoked' },
  })
}

export async function touchPortalToken(id: string): Promise<void> {
  await prisma.portalToken.update({
    where: { id },
    data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
  })
}

export async function getActiveTokenForCustomer(customerId: string): Promise<PortalToken | null> {
  return prisma.portalToken.findFirst({
    where: { customerId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
}
