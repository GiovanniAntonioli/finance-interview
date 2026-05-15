import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createPortalLink, validatePortalToken, getCustomerPortalData } from './portal.service'
import { hashToken } from '@/lib/token'

const prisma = new PrismaClient()
const TODAY = new Date('2026-05-15')

beforeAll(() => prisma.$connect())
afterAll(() => prisma.$disconnect())

afterEach(async () => {
  await prisma.portalToken.deleteMany({ where: { customerId: { in: ['cus_acme', 'cus_beta', 'cus_test_portal'] } } })
})

describe('portal token — valid access (TEST-06)', () => {
  it('valid token returns portal token record', async () => {
    const { rawToken } = await createPortalLink('cus_acme')
    const token = await validatePortalToken(rawToken)
    expect(token).not.toBeNull()
    expect(token!.customerId).toBe('cus_acme')
    expect(token!.status).toBe('active')
  })

  it('valid token increments accessCount', async () => {
    const { rawToken } = await createPortalLink('cus_acme')
    await validatePortalToken(rawToken)
    const record = await prisma.portalToken.findUnique({ where: { tokenHash: hashToken(rawToken) } })
    expect(record!.accessCount).toBe(1)
  })
})

describe('portal token — expired rejection (TEST-07)', () => {
  it('expired token returns null', async () => {
    await prisma.portalToken.create({
      data: {
        customerId: 'cus_test_portal',
        tokenHash: hashToken('expired-raw-token-abc'),
        status: 'active',
        expiresAt: new Date('2020-01-01'),
        createdBy: 'test',
      },
    })
    const result = await validatePortalToken('expired-raw-token-abc')
    expect(result).toBeNull()
  })
})

describe('portal token — revoked rejection (TEST-08)', () => {
  it('revoked token returns null', async () => {
    await prisma.portalToken.create({
      data: {
        customerId: 'cus_test_portal',
        tokenHash: hashToken('revoked-raw-token-xyz'),
        status: 'revoked',
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: 'test',
      },
    })
    const result = await validatePortalToken('revoked-raw-token-xyz')
    expect(result).toBeNull()
  })
})

describe('customer isolation in portal (TEST-09)', () => {
  it('token of cus_acme does not return invoices of cus_beta', async () => {
    const { rawToken } = await createPortalLink('cus_acme')
    const token = await validatePortalToken(rawToken)
    const { invoices } = await getCustomerPortalData(token!, TODAY)

    const betaInvoices = invoices.filter(() => false)
    const allCustomerIds = new Set(
      await prisma.invoice
        .findMany({ where: { externalId: { in: invoices.map((i) => i.externalId) } }, select: { customerId: true } })
        .then((rows) => rows.map((r) => r.customerId))
    )

    expect(allCustomerIds.has('cus_beta')).toBe(false)
    expect(allCustomerIds.size).toBeLessThanOrEqual(1)
    void betaInvoices
  })

  it('portal only returns open invoices for the customer', async () => {
    const { rawToken } = await createPortalLink('cus_acme')
    const token = await validatePortalToken(rawToken)
    const { invoices } = await getCustomerPortalData(token!, TODAY)

    const dbInvoices = await prisma.invoice.findMany({
      where: { externalId: { in: invoices.map((i) => i.externalId) } },
    })
    for (const inv of dbInvoices) {
      expect(inv.financeStatus).toBe('open')
      expect(inv.customerId).toBe('cus_acme')
    }
  })
})

describe('raw token never stored', () => {
  it('DB stores hash, not raw token', async () => {
    const { rawToken } = await createPortalLink('cus_acme')
    const record = await prisma.portalToken.findFirst({ where: { customerId: 'cus_acme' } })
    expect(record!.tokenHash).not.toBe(rawToken)
    expect(record!.tokenHash).toHaveLength(64)
  })
})
