import { NextRequest, NextResponse } from 'next/server'
import { createPortalLink } from '@/services/portal.service'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  if (!body?.customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
  }

  const result = await createPortalLink(body.customerId)
  return NextResponse.json(result)
}
