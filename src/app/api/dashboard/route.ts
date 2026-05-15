import { NextRequest, NextResponse } from 'next/server'
import { getDashboardSummary } from '@/services/invoice.service'

export async function GET(req: NextRequest) {
  const todayParam = req.nextUrl.searchParams.get('today')
  const today = todayParam ? new Date(todayParam) : new Date()

  if (isNaN(today.getTime())) {
    return NextResponse.json({ error: 'Invalid today date' }, { status: 400 })
  }

  const data = await getDashboardSummary(today)
  return NextResponse.json(data)
}
