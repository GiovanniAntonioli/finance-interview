'use client'
import { useEffect, useState, useCallback } from 'react'
import { ARSummaryCard } from './_components/ARSummary'
import { CustomerTable } from './_components/CustomerTable'
import type { ARSummary, DashboardCustomer } from '@/types'

const DEFAULT_TODAY = '2026-05-15'

export default function DashboardPage() {
  const [today, setToday] = useState(DEFAULT_TODAY)
  const [data, setData] = useState<{ summary: ARSummary; customers: DashboardCustomer[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/dashboard?today=${today}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AR Collections Portal</h1>
          <p className="text-sm text-gray-500">Dashboard Interno — Contas a Receber</p>
        </div>
        <div className="flex items-center gap-2 mr-24">
          <label className="text-sm font-medium text-gray-900">Data base:</label>
          <input
            type="date"
            value={today}
            onChange={e => setToday(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm text-gray-900 font-medium"
          />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : data ? (
          <>
            <ARSummaryCard summary={data.summary} />
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">Clientes com AR em Aberto</h2>
              <CustomerTable customers={data.customers} onRefresh={load} />
            </div>
          </>
        ) : (
          <p className="text-red-500 text-sm">Erro ao carregar dados.</p>
        )}
      </main>
    </div>
  )
}
