export type AgingBand = 'current' | '1-30' | '31-60' | '61-90' | '90+' | 'no-due-date'

export type FinanceStatus = 'open' | 'paid' | 'uncollectible'

export type ProviderStatus = 'open' | 'paid' | 'void' | 'uncollectible'

export interface AgingResult {
  agingDays: number | null
  band: AgingBand
}

export type ReminderActionType =
  | 'customer_reminder'
  | 'internal_alert'
  | 'internal_review'

export type ReminderTemplate =
  | 'due_soon'
  | 'past_due'
  | 'escalation'
  | 'high_risk_escalation'
  | 'missing_email_escalation'
  | 'missing_due_date'

export interface ReminderAction {
  type: ReminderActionType
  invoiceExternalId: string
  customerId: string
  customerEmail?: string
  template: ReminderTemplate
  reason: string
  recipient?: string
}

export interface DashboardCustomer {
  customerId: string
  displayName: string
  email: string | null
  openInvoiceCount: number
  totalOpenCents: number
  maxAgingDays: number | null
  agingBand: AgingBand
  portalLinkStatus: 'active' | 'none'
  nextAction: string
}

export interface ARSummary {
  totalOpenCents: number
  breakdown: Record<AgingBand, { count: number; totalCents: number }>
}

export interface PortalInvoice {
  id: string
  externalId: string
  invoiceNumber: string
  dueDate: string | null
  agingDays: number | null
  agingBand: AgingBand
  amountDueCents: number
  hostedInvoiceUrl: string | null
}

export interface FinanceDecision {
  nextStatus: FinanceStatus
  reason: string
  reference?: string
  actor: string
}
