import { validatePortalToken, getCustomerPortalData } from '@/services/portal.service'

const TODAY = new Date('2026-05-15')

function fmt(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

const BAND_LABEL: Record<string, string> = {
  'current': 'No prazo',
  '1-30': '1–30 dias em atraso',
  '31-60': '31–60 dias em atraso',
  '61-90': '61–90 dias em atraso',
  '90+': '90+ dias em atraso',
  'no-due-date': 'Sem vencimento',
}

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params
  const portalToken = await validatePortalToken(rawToken)

  if (!portalToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-sm">
          <p className="text-2xl mb-2">🔒</p>
          <h1 className="text-lg font-semibold text-gray-900">Link inválido ou expirado</h1>
          <p className="text-sm text-gray-500 mt-2">Solicite um novo link ao time financeiro.</p>
        </div>
      </div>
    )
  }

  const { customer, invoices } = await getCustomerPortalData(portalToken, TODAY)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Portal de Cobranças</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{customer.displayName}</h1>
          <p className="text-sm text-gray-500 mt-1">{customer.email ?? 'Email não disponível'}</p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Saldo Total em Aberto</p>
            <p className="text-3xl font-bold text-red-600">{fmt(customer.totalOpenCents)}</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500 text-sm">
            Nenhuma fatura em aberto.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Fatura</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.dueDate ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${inv.agingBand === 'current' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {BAND_LABEL[inv.agingBand]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(inv.amountDueCents)}</td>
                    <td className="px-4 py-3 text-right">
                      {inv.hostedInvoiceUrl ? (
                        <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                          Pagar
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
