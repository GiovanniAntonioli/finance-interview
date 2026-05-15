import type { ReminderAction } from '@/types'

export interface EmailProvider {
  send(action: ReminderAction): void
}

export class FakeEmailProvider implements EmailProvider {
  readonly sent: ReminderAction[] = []

  send(action: ReminderAction): void {
    this.sent.push(action)
    console.log(`[FakeEmail] ${action.type} → ${action.recipient ?? action.customerEmail} | ${action.reason}`)
  }
}
