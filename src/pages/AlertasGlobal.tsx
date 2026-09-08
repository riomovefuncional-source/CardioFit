import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type AlertRow = {
  id: string
  student_id: string
  category: string
  title: string | null
  message: string
  level: 'amarelo' | 'vermelho'
  priority: 'baixa' | 'media' | 'alta'
  status: 'novo' | 'visualizado' | 'resolvido'
  created_at: string
  students: { full_name: string } | null
}

const CATEGORIES = [
  { id: 'cardiovascular', label: 'Cardiovascular' },
  { id: 'treino', label: 'Treino' },
  { id: 'recuperacao', label: 'Recuperação' },
  { id: 'presenca', label: 'Presença' },
  { id: 'avaliacao', label: 'Avaliação' },
  { id: 'financeiro', label: 'Financeiro' },
]

const STATUS_LABELS: Record<string, string> = { novo: 'Novo', visualizado: 'Visualizado', resolvido: 'Resolvido' }
const PRIORITY_COLOR: Record<string, string> = { alta: 'bg-red-100 text-red-700', media: 'bg-amber-100 text-amber-700', baixa: 'bg-slate-100 text-slate-600' }

export default function AlertasGlobal() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [statusFilter, setStatusFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [selected, setSelected] = useState<AlertRow | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () =>
    supabase
      .from('alerts')
      .select('id, student_id, category, title, message, level, priority, status, created_at, students(full_name)')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setAlerts((data as any) ?? [])
        setLoading(false)
      })

  useEffect(() => {
    load()
  }, [])

  const filtered = alerts.filter((a) => (statusFilter === 'todos' || a.status === statusFilter) && (categoryFilter === 'todos' || a.category === categoryFilter))

  const updateStatus = async (id: string, status: AlertRow['status']) => {
    await supabase.from('alerts').update({ status }).eq('id', id)
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    setSelected((s) => (s && s.id === id ? { ...s, status } : s))
  }

  const counts = {
    novo: alerts.filter((a) => a.status === 'novo').length,
    visualizado: alerts.filter((a) => a.status === 'visualizado').length,
    resolvido: alerts.filter((a) => a.status === 'resolvido').length,
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Alertas</h1>
      <p className="text-sm text-slate-500 mb-6">Central de alertas de todos os alunos, por categoria e prioridade.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Novos</p>
          <p className="text-2xl font-bold text-red-600">{counts.novo}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Visualizados</p>
          <p className="text-2xl font-bold text-amber-600">{counts.visualizado}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Resolvidos</p>
          <p className="text-2xl font-bold text-green-600">{counts.resolvido}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {['todos', 'novo', 'visualizado', 'resolvido'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize ${statusFilter === s ? 'text-white border-transparent' : 'border-slate-300 text-slate-600'}`}
            style={statusFilter === s ? { background: '#731919' } : {}}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setCategoryFilter('todos')}
          className={`text-xs px-3 py-1.5 rounded-full border ${categoryFilter === 'todos' ? 'border-[#C89116] bg-[#C89116]/10' : 'border-slate-300 text-slate-600'}`}
        >
          Todas categorias
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id)}
            className={`text-xs px-3 py-1.5 rounded-full border ${categoryFilter === c.id ? 'border-[#C89116] bg-[#C89116]/10' : 'border-slate-300 text-slate-600'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {loading && <p className="p-4 text-sm text-slate-500">Carregando...</p>}
        {!loading && filtered.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum alerta encontrado.</p>}
        {filtered.map((a) => (
          <button key={a.id} onClick={() => setSelected(a)} className="w-full text-left p-3 text-sm flex items-center gap-3 hover:bg-slate-50">
            <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLOR[a.priority]}`}>{a.priority}</span>
            <span className="text-xs text-slate-400 capitalize w-28 shrink-0">{CATEGORIES.find((c) => c.id === a.category)?.label ?? a.category}</span>
            <span className="flex-1 truncate">
              <span className="font-medium">{a.students?.full_name ?? '-'}</span> — {a.title || a.message}
            </span>
            <span className="text-xs text-slate-400 shrink-0">{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                a.status === 'novo' ? 'bg-red-50 text-red-700' : a.status === 'visualizado' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
              }`}
            >
              {STATUS_LABELS[a.status]}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-slate-400 uppercase">{CATEGORIES.find((c) => c.id === selected.category)?.label}</p>
            <p className="text-lg font-semibold">{selected.title || selected.message}</p>
            <p className="text-sm text-slate-600">{selected.message}</p>
            <p className="text-xs text-slate-400">
              Aluno: <span className="font-medium text-slate-700">{selected.students?.full_name}</span> · {new Date(selected.created_at).toLocaleString('pt-BR')}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to={`/alunos/${selected.student_id}`} className="btn-primary text-sm">
                Ver aluno
              </Link>
              {selected.status !== 'visualizado' && selected.status !== 'resolvido' && (
                <button onClick={() => updateStatus(selected.id, 'visualizado')} className="text-sm border border-slate-300 rounded-lg px-4 py-2">
                  Marcar como visualizado
                </button>
              )}
              {selected.status !== 'resolvido' && (
                <button onClick={() => updateStatus(selected.id, 'resolvido')} className="text-sm border border-green-300 text-green-700 rounded-lg px-4 py-2">
                  Resolver alerta
                </button>
              )}
              <button onClick={() => setSelected(null)} className="text-sm text-slate-400 ml-auto">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
