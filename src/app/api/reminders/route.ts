import { NextRequest, NextResponse } from 'next/server'
import { findAllInvoices } from '@/repositories/invoice.repository'
import { generateReminderActions } from '@/domain/reminder-engine'

export async function GET(req: NextRequest) {
  const todayParam = req.nextUrl.searchParams.get('today')
  const today = todayParam ? new Date(todayParam) : new Date()

  if (isNaN(today.getTime())) {
    return NextResponse.json({ error: 'Invalid today date' }, { status: 400 })
  }

  const invoices = await findAllInvoices()
  const actions = generateReminderActions(invoices, today)
  return NextResponse.json({ today: today.toISOString().split('T')[0], count: actions.length, actions })
}
