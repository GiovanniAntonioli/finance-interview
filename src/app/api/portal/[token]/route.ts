import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken, getCustomerPortalData } from '@/services/portal.service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params
  const todayParam = req.nextUrl.searchParams.get('today')
  const today = todayParam ? new Date(todayParam) : new Date()

  const portalToken = await validatePortalToken(rawToken)
  if (!portalToken) {
    return NextResponse.json({ error: 'Invalid, expired, or revoked token' }, { status: 401 })
  }

  const data = await getCustomerPortalData(portalToken, today)
  return NextResponse.json(data)
}
