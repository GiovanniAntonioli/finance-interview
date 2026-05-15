import { NextRequest, NextResponse } from 'next/server'
import { applyFinanceDecision } from '@/services/invoice.service'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)

  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const { nextStatus, reason, reference } = body
  const validStatuses = ['paid', 'uncollectible', 'open']

  if (!nextStatus || !validStatuses.includes(nextStatus)) {
    return NextResponse.json({ error: `nextStatus must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  }

  try {
    const result = await applyFinanceDecision(id, {
      nextStatus,
      reason,
      reference,
      actor: 'finance-user@filterbuy.com',
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Invoice not found') return NextResponse.json({ error: message }, { status: 404 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
