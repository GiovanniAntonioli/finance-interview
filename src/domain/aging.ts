import type { AgingBand, AgingResult } from '@/types'

export function calculateAging(dueDate: Date | null, today: Date): AgingResult {
  if (!dueDate) return { agingDays: null, band: 'no-due-date' }

  const ms = today.getTime() - dueDate.getTime()
  const agingDays = Math.floor(ms / (1000 * 60 * 60 * 24))

  let band: AgingBand
  if (agingDays <= 0) band = 'current'
  else if (agingDays <= 30) band = '1-30'
  else if (agingDays <= 60) band = '31-60'
  else if (agingDays <= 90) band = '61-90'
  else band = '90+'

  return { agingDays, band }
}
