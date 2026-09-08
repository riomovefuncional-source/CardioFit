import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Row = {
  id: string
  attendance_date: string
  status: string
  student_id: string
  students: { full_name: string } | null
}

export default function PresencaGlobal() {
  const [rows, setRows] = useState<Row[]>([])
  const [statusFilter, setStatusFilter] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('attendance')
      .select('id, attendance_date, status, student_id, students(full_name)')
      .order('attendance_date', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setRows((data as any) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = statusFilter === 'todos' ? rows : rows.filter((r) => r.status === statusFilter)
  const total = rows.length
  const presentes = rows.filter((r) => r.status === 'presente').length
  const faltas = rows.filter((r) => r.status === 'ausente').length
  const freq = total ? Math.round((presentes / total) * 100) : 0

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Presença</h1>
      <p className="text-sm text-slate-500 mb-6">Frequência e controle de faltas de todos os alunos.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Presença média</p>
          <p className="text-2xl font-bold" style={{ color: '#731919' }}>{freq}%</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Presenças</p>
          <p className="text-2xl font-bold text-green-600">{presentes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Faltas</p>
          <p className="text-2xl font-bold text-red-600">{faltas}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Sessões</p>
          <p className="text-2xl font-bold text-slate-700">{total}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['todos', 'presente', 'ausente', 'cancelado', 'reposicao'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize ${
              statusFilter === s ? 'text-white border-transparent' : 'border-slate-300 text-slate-600'
            }`}
            style={statusFilter === s ? { background: '#731919' } : {}}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {loading && <p className="p-4 text-sm text-slate-500">Carregando...</p>}
        {!loading && filtered.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum registro de presença ainda.</p>}
        {filtered.map((r) => (
          <Link key={r.id} to={`/alunos/${r.student_id}`} className="p-3 text-sm flex justify-between hover:bg-slate-50">
            <span className="font-medium">{r.students?.full_name ?? '-'}</span>
            <span>{new Date(r.attendance_date).toLocaleDateString('pt-BR')}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                r.status === 'presente' ? 'bg-green-50 text-green-700' : r.status === 'ausente' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {r.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
