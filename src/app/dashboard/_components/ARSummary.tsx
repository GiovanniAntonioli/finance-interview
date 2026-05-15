'use client'
import type { ARSummary } from '@/types'

const BAND_LABELS: Record<string, string> = {
  'current': 'Atual',
  '1-30': '1–30 dias',
  '31-60': '31–60 dias',
  '61-90': '61–90 dias',
  '90+': '90+ dias',
  'no-due-date': 'Sem vencimento',
}

const BAND_COLOR: Record<string, string> = {
  'current': 'bg-green-100 text-green-800',
  '1-30': 'bg-yellow-100 text-yellow-800',
  '31-60': 'bg-orange-100 text-orange-800',
  '61-90': 'bg-red-100 text-red-800',
  '90+': 'bg-red-200 text-red-900 font-bold',
  'no-due-date': 'bg-gray-100 text-gray-600',
}

function fmt(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function ARSummaryCard({ summary }: { summary: ARSummary }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Total AR em Aberto</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{fmt(summary.totalOpenCents)}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(summary.breakdown).map(([band, { count, totalCents }]) => (
          <div key={band} className={`rounded-lg p-3 text-center ${BAND_COLOR[band]}`}>
            <p className="text-xs font-medium">{BAND_LABELS[band]}</p>
            <p className="text-lg font-bold mt-1">{count}</p>
            <p className="text-xs mt-0.5">{fmt(totalCents)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
