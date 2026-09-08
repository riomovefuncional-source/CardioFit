import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

const PERIODS = [
  { id: 'hoje', label: 'Hoje', days: 1 },
  { id: '7d', label: '7 dias', days: 7 },
  { id: '30d', label: '30 dias', days: 30 },
  { id: '3m', label: '3 meses', days: 90 },
  { id: '6m', label: '6 meses', days: 180 },
  { id: '12m', label: '12 meses', days: 365 },
] as const

function pctChange(curr: number, prev: number): string | null {
  if (prev === 0) return curr > 0 ? '+100%' : null
  const pct = Math.round(((curr - prev) / prev) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

function KpiCard({ label, value, delta, href, accent }: { label: string; value: string; delta: string | null; href: string; accent?: boolean }) {
  return (
    <Link to={href} className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${accent ? 'border-[#C89116]' : 'border-slate-200'}`}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {delta && <p className={`text-xs mt-1 ${delta.startsWith('+') ? 'text-green-600' : delta.startsWith('-') ? 'text-red-600' : 'text-slate-400'}`}>{delta} vs. período anterior</p>}
    </Link>
  )
}

type Attention = { student_id: string; name: string; reason: string; date: string; severity: 'alta' | 'media' }

export default function Dashboard() {
  const { session } = useAuth()
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('30d')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<{
    activeStudents: number
    newStudents: number
    newStudentsPrev: number
    sessions: number
    sessionsPrev: number
    attendancePct: number
    attendancePctPrev: number
    revenue: number
    revenuePrev: number
    readiness: number | null
    readinessPrev: number | null
    openAlerts: number
  } | null>(null)
  const [attention, setAttention] = useState<Attention[]>([])
  const [highlight, setHighlight] = useState<
    { id: string; name: string; status: string; attendancePct: number | null; lastSession: string | null; rpe: number | null }[]
  >([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [period])

  const load = async () => {
    setLoading(true)
    const days = PERIODS.find((p) => p.id === period)!.days
    const now = new Date()
    const start = new Date(now.getTime() - days * 86400000)
    const prevStart = new Date(start.getTime() - days * 86400000)
    const iso = (d: Date) => d.toISOString()

    const [
      { count: activeStudents },
      { count: newStudents },
      { count: newStudentsPrev },
      { data: sessions },
      { data: sessionsPrev },
      { data: attendance },
      { data: attendancePrev },
      { data: payments },
      { data: paymentsPrev },
      { data: readiness },
      { data: readinessPrev },
      { count: openAlerts },
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
      supabase.from('students').select('*', { count: 'exact', head: true }).gte('created_at', iso(start)),
      supabase.from('students').select('*', { count: 'exact', head: true }).gte('created_at', iso(prevStart)).lt('created_at', iso(start)),
      supabase.from('workout_sessions').select('id').gte('session_date', iso(start).slice(0, 10)),
      supabase.from('workout_sessions').select('id').gte('session_date', iso(prevStart).slice(0, 10)).lt('session_date', iso(start).slice(0, 10)),
      supabase.from('attendance').select('status').gte('attendance_date', iso(start).slice(0, 10)),
      supabase.from('attendance').select('status').gte('attendance_date', iso(prevStart).slice(0, 10)).lt('attendance_date', iso(start).slice(0, 10)),
      supabase.from('payments').select('amount').eq('status', 'pago').gte('date', iso(start).slice(0, 10)),
      supabase.from('payments').select('amount').eq('status', 'pago').gte('date', iso(prevStart).slice(0, 10)).lt('date', iso(start).slice(0, 10)),
      supabase.from('cardio_readiness').select('ipc_score').gte('reading_date', iso(start).slice(0, 10)).not('ipc_score', 'is', null),
      supabase.from('cardio_readiness').select('ipc_score').gte('reading_date', iso(prevStart).slice(0, 10)).lt('reading_date', iso(start).slice(0, 10)).not('ipc_score', 'is', null),
      supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'novo'),
    ])

    const attPct = (rows: any[] | null) => (rows && rows.length ? Math.round((rows.filter((r) => r.status === 'presente').length / rows.length) * 100) : 0)
    const avg = (rows: any[] | null) => (rows && rows.length ? Math.round(rows.reduce((s, r) => s + (r.ipc_score ?? 0), 0) / rows.length) : null)
    const sum = (rows: any[] | null) => (rows ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)

    setKpis({
      activeStudents: activeStudents ?? 0,
      newStudents: newStudents ?? 0,
      newStudentsPrev: newStudentsPrev ?? 0,
      sessions: sessions?.length ?? 0,
      sessionsPrev: sessionsPrev?.length ?? 0,
      attendancePct: attPct(attendance),
      attendancePctPrev: attPct(attendancePrev),
      revenue: sum(payments),
      revenuePrev: sum(paymentsPrev),
      readiness: avg(readiness),
      readinessPrev: avg(readinessPrev),
      openAlerts: openAlerts ?? 0,
    })

    await loadAttention(start)
    await loadHighlight(start)
    setLoading(false)
  }

  const loadAttention = async (start: Date) => {
    const items: Attention[] = []
    const cutoff = start.toISOString().slice(0, 10)

    const { data: students } = await supabase.from('students').select('id, name').eq('status', 'ativo')
    const { data: lastSessions } = await supabase.from('workout_sessions').select('student_id, session_date').order('session_date', { ascending: false })
    const lastByStudent = new Map<string, string>()
    ;(lastSessions ?? []).forEach((s) => {
      if (!lastByStudent.has(s.student_id)) lastByStudent.set(s.student_id, s.session_date)
    })
    ;(students ?? []).forEach((s) => {
      const last = lastByStudent.get(s.id)
      if (!last || last < cutoff) {
        items.push({ student_id: s.id, name: s.name, reason: last ? 'Sem treinar há mais de um período' : 'Nunca registrou sessão', date: last ?? '-', severity: 'media' })
      }
    })

    const { data: overdue } = await supabase.from('payments').select('contract_id, date, student_contracts(student_id, students(id, name))').eq('status', 'atrasado')
    ;(overdue ?? []).forEach((p: any) => {
      const s = p.student_contracts?.students
      if (s) items.push({ student_id: s.id, name: s.name, reason: 'Pagamento em atraso', date: p.date, severity: 'alta' })
    })

    const { data: openAlertsData } = await supabase.from('alerts').select('student_id, message, created_at, students(name)').eq('status', 'novo').eq('category', 'cardiovascular').limit(20)
    ;(openAlertsData ?? []).forEach((a: any) => {
      items.push({ student_id: a.student_id, name: a.students?.name ?? '-', reason: `Alerta cardiovascular: ${a.message}`, date: a.created_at, severity: 'alta' })
    })

    setAttention(items.slice(0, 15))
  }

  const loadHighlight = async (start: Date) => {
    const { data: students } = await supabase.from('students').select('id, name, status').limit(50)
    const cutoff = start.toISOString().slice(0, 10)
    const rows = await Promise.all(
      (students ?? []).map(async (s) => {
        const [{ data: att }, { data: sess }] = await Promise.all([
          supabase.from('attendance').select('status').eq('student_id', s.id).gte('attendance_date', cutoff),
          supabase.from('workout_sessions').select('session_date, rpe').eq('student_id', s.id).order('session_date', { ascending: false }).limit(1),
        ])
        const attendancePct = att && att.length ? Math.round((att.filter((a) => a.status === 'presente').length / att.length) * 100) : null
        return { id: s.id, name: s.name, status: s.status, attendancePct, lastSession: sess?.[0]?.session_date ?? null, rpe: sess?.[0]?.rpe ?? null }
      }),
    )
    setHighlight(rows)
  }

  const filteredHighlight = highlight.filter((h) => h.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá{session?.user.email ? `, ${session.user.email.split('@')[0]}` : ''}</h1>
          <p className="text-sm text-slate-500">Visão geral da sua operação</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${period === p.id ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !kpis ? (
        <p className="text-slate-500 text-sm">Carregando indicadores...</p>
      ) : (
        <>
          <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #731919 0%, #4a1010 100%)' }}>
            <p className="text-sm text-white/70 uppercase tracking-wide">Seu período está evoluindo</p>
            <p className="text-3xl font-bold mt-1">{pctChange(kpis.sessions, kpis.sessionsPrev) ?? '—'} em sessões</p>
            <p className="text-sm text-white/70 mt-2">
              {kpis.sessions} sessões · {kpis.attendancePct}% de presença · R$ {kpis.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em receita · {kpis.activeStudents} alunos ativos
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <KpiCard label="Alunos ativos" value={String(kpis.activeStudents)} delta={pctChange(kpis.newStudents, kpis.newStudentsPrev)} href="/alunos" />
            <KpiCard label="Sessões" value={String(kpis.sessions)} delta={pctChange(kpis.sessions, kpis.sessionsPrev)} href="/presenca" />
            <KpiCard label="Presença" value={`${kpis.attendancePct}%`} delta={pctChange(kpis.attendancePct, kpis.attendancePctPrev)} href="/presenca" />
            <KpiCard label="Receita" value={`R$ ${kpis.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} delta={pctChange(kpis.revenue, kpis.revenuePrev)} href="/financeiro" />
            <KpiCard
              label="Readiness"
              value={kpis.readiness !== null ? String(kpis.readiness) : '—'}
              delta={kpis.readiness !== null && kpis.readinessPrev !== null ? pctChange(kpis.readiness, kpis.readinessPrev) : null}
              href="/alunos"
            />
            <KpiCard label="Alertas" value={String(kpis.openAlerts)} delta={null} href="/alertas" accent={kpis.openAlerts > 0} />
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Precisa de atenção</h2>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {attention.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum ponto de atenção identificado neste período. 🎉</p>}
              {attention.map((a, i) => (
                <div key={i} className="p-3 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.reason}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.severity === 'alta' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{a.severity}</span>
                    <span className="text-xs text-slate-400">{a.date !== '-' ? new Date(a.date).toLocaleDateString('pt-BR') : '-'}</span>
                    <Link to={`/alunos/${a.student_id}`} className="text-xs font-medium" style={{ color: '#731919' }}>
                      Ver aluno →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-800">Alunos em destaque</h2>
              <input className="input max-w-[220px]" placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="p-3">Aluno</th>
                    <th className="p-3">Presença</th>
                    <th className="p-3">Último treino</th>
                    <th className="p-3">RPE</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHighlight.map((h) => (
                    <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-3">
                        <Link to={`/alunos/${h.id}`} className="font-medium" style={{ color: '#731919' }}>
                          {h.name}
                        </Link>
                      </td>
                      <td className="p-3">{h.attendancePct !== null ? `${h.attendancePct}%` : '—'}</td>
                      <td className="p-3">{h.lastSession ? new Date(h.lastSession).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="p-3">{h.rpe ?? '—'}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${h.status === 'ativo' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{h.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
