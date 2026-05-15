import { calculateAging } from './aging'
import type { ReminderAction, ReminderTemplate } from '@/types'

interface InvoiceInput {
  externalId: string
  customerId: string
  customerEmail: string | null
  financeStatus: string
  dueDate: Date | null
}

const AR_TEAM = 'ar-team@filterbuy.com'

export function generateReminderActions(
  invoices: InvoiceInput[],
  today: Date
): ReminderAction[] {
  const actions: ReminderAction[] = []

  for (const inv of invoices) {
    if (inv.financeStatus !== 'open') continue

    const { agingDays, band } = calculateAging(inv.dueDate, today)

    if (band === 'no-due-date') {
      actions.push({
        type: 'internal_review',
        invoiceExternalId: inv.externalId,
        customerId: inv.customerId,
        template: 'missing_due_date',
        reason: `Invoice ${inv.externalId} has no due date — requires manual review`,
        recipient: AR_TEAM,
      })
      continue
    }

    const hasEmail = !!inv.customerEmail

    if (!hasEmail && agingDays! > 0) {
      actions.push({
        type: 'internal_alert',
        invoiceExternalId: inv.externalId,
        customerId: inv.customerId,
        template: 'missing_email_escalation',
        reason: `Invoice ${inv.externalId} is ${agingDays} day(s) overdue but customer has no email address`,
        recipient: AR_TEAM,
      })
      continue
    }

    if (agingDays! >= 90) {
      actions.push(buildAction('internal_alert', 'high_risk_escalation', inv, agingDays!, AR_TEAM))
    } else if (agingDays! >= 31) {
      if (hasEmail) actions.push(buildAction('customer_reminder', 'escalation', inv, agingDays!))
    } else if (agingDays! >= 1) {
      if (hasEmail) actions.push(buildAction('customer_reminder', 'past_due', inv, agingDays!))
    } else if (agingDays! >= -7) {
      if (hasEmail) actions.push(buildAction('customer_reminder', 'due_soon', inv, agingDays!))
    }
  }

  return actions
}

function buildAction(
  type: ReminderAction['type'],
  template: ReminderTemplate,
  inv: InvoiceInput,
  agingDays: number,
  recipient?: string
): ReminderAction {
  const daysLabel = agingDays <= 0
    ? `due in ${Math.abs(agingDays)} day(s)`
    : `${agingDays} day(s) overdue`

  return {
    type,
    invoiceExternalId: inv.externalId,
    customerId: inv.customerId,
    ...(inv.customerEmail ? { customerEmail: inv.customerEmail } : {}),
    template,
    reason: `Invoice ${inv.externalId} is ${daysLabel}`,
    ...(recipient ? { recipient } : {}),
  }
}
