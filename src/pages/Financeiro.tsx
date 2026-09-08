import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Row = {
  id: string
  amount: number
  due_date: string
  status: string
  students: { full_name: string } | null
}

export default function Financeiro() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('payments')
      .select('id, amount, due_date, status, students(full_name)')
      .order('due_date', { ascending: true })
      .then(({ data }) => {
        setRows((data as any) ?? [])
        setLoading(false)
      })
  }, [])

  const totals = rows.reduce(
    (acc, r) => {
      if (r.status === 'pago') acc.received += r.amount
      else acc.pending += r.amount
      return acc
    },
    { received: 0, pending: 0 }
  )

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Financeiro</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Recebido</p>
          <p className="text-2xl font-semibold text-emerald-700">R$ {totals.received.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">A receber</p>
          <p className="text-2xl font-semibold text-amber-700">R$ {totals.pending.toFixed(2)}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma cobrança lançada ainda.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.id} className="p-4 text-sm flex justify-between">
              <span>{r.students?.full_name ?? '—'}</span>
              <span className="text-slate-600">
                R$ {r.amount.toFixed(2)} · venc. {new Date(r.due_date).toLocaleDateString('pt-BR')}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full h-fit ${
                  r.status === 'pago' ? 'bg-emerald-50 text-emerald-700' : r.status === 'atrasado' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
