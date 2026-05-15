'use client'
import { useState } from 'react'
import type { DashboardCustomer } from '@/types'

function fmt(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

const BAND_BADGE: Record<string, string> = {
  'current': 'bg-green-100 text-green-700',
  '1-30': 'bg-yellow-100 text-yellow-700',
  '31-60': 'bg-orange-100 text-orange-700',
  '61-90': 'bg-red-100 text-red-700',
  '90+': 'bg-red-200 text-red-900 font-bold',
  'no-due-date': 'bg-gray-100 text-gray-500',
}

interface DecisionModalProps {
  invoiceId: string
  onClose: () => void
  onDone: () => void
}

function DecisionModal({ invoiceId, onClose, onDone }: DecisionModalProps) {
  const [status, setStatus] = useState<'paid' | 'uncollectible' | 'open'>('paid')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!reason.trim()) return alert('Motivo é obrigatório')
    setLoading(true)
    await fetch(`/api/invoices/${invoiceId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextStatus: status, reason, reference }),
    })
    setLoading(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
        <h3 className="text-lg font-semibold">Decisão Financeira</h3>
        <div>
          <label className="text-sm font-medium">Novo Status</label>
          <select className="mt-1 w-full border rounded-lg p-2 text-sm" value={status} onChange={e => setStatus(e.target.value as typeof status)}>
            <option value="paid">Pago</option>
            <option value="uncollectible">Incobrável</option>
            <option value="open">Reabrir</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Motivo *</label>
          <input className="mt-1 w-full border rounded-lg p-2 text-sm" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Pagamento recebido via cheque" />
        </div>
        <div>
          <label className="text-sm font-medium">Referência (opcional)</label>
          <input className="mt-1 w-full border rounded-lg p-2 text-sm" value={reference} onChange={e => setReference(e.target.value)} placeholder="Ex: cheque #8842" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  customers: DashboardCustomer[]
  onRefresh: () => void
}

export function CustomerTable({ customers, onRefresh }: Props) {
  const [modal, setModal] = useState<{ customerId: string } | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  const generateLink = async (customerId: string) => {
    setGenerating(customerId)
    const res = await fetch('/api/portal-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    })
    const data = await res.json()
    if (data.portalUrl) {
      window.open(`${window.location.origin}${data.portalUrl}`, '_blank', 'noreferrer')
    }
    setGenerating(null)
    onRefresh()
  }

  return (
    <>
      {modal && (
        <DecisionModal
          invoiceId={modal.customerId}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); onRefresh() }}
        />
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium text-right">Faturas</th>
              <th className="px-4 py-3 font-medium text-right">Total Aberto</th>
              <th className="px-4 py-3 font-medium text-right">Maior Aging</th>
              <th className="px-4 py-3 font-medium">Portal</th>
              <th className="px-4 py-3 font-medium">Próxima Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((c) => (
              <tr key={c.customerId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.displayName}</td>
                <td className="px-4 py-3 text-gray-500">
                  {c.email || <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">sem email</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{c.openInvoiceCount}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(c.totalOpenCents)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${BAND_BADGE[c.agingBand]}`}>
                    {c.agingBand === 'no-due-date' ? 'sem vencimento' : c.maxAgingDays !== null ? `${c.maxAgingDays}d` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => generateLink(c.customerId)}
                    disabled={generating === c.customerId}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
                  >
                    {generating === c.customerId ? 'Gerando...' : c.portalLinkStatus === 'active' ? 'Renovar' : 'Gerar'}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{c.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
