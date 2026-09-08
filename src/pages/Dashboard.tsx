import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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

const NEW_ACTIONS = [
  { id: 'aluno', label: 'Novo aluno', needsStudent: false },
  { id: 'avaliacao', label: 'Nova avaliação', needsStudent: true, tab: 'Avaliações' },
  { id: 'treino', label: 'Criar treino', needsStudent: true, tab: 'Treinos' },
  { id: 'sessao', label: 'Registrar sessão', needsStudent: true, tab: 'Sessão' },
  { id: 'presenca', label: 'Registrar presença', needsStudent: true, tab: 'Presença' },
  { id: 'pagamento', label: 'Registrar pagamento', needsStudent: true, tab: 'Financeiro' },
] as const

function NovaAcaoButton() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([])

  const pick = async (action: (typeof NEW_ACTIONS)[number]) => {
    setOpen(false)
    if (action.id === 'aluno') {
      navigate('/alunos?new=1')
      return
    }
    if (students.length === 0) {
      const { data } = await supabase.from('students').select('id, full_name').eq('status', 'ativo').order('full_name')
      setStudents(data ?? [])
    }
    setPendingTab(action.tab)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-primary">
        + Nova ação
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
          {NEW_ACTIONS.map((a) => (
            <button key={a.id} onClick={() => pick(a)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">
              {a.label}
            </button>
          ))}
        </div>
      )}
      {pendingTab && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setPendingTab(null)}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-800 mb-3">Selecione o aluno</p>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {students.length === 0 && <p className="text-sm text-slate-500">Nenhum aluno ativo.</p>}
              {students.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/alunos/${s.id}?tab=${encodeURIComponent(pendingTab)}`)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50"
                >
                  {s.full_name}
                </button>
              ))}
            </div>
            <button onClick={() => setPendingTab(null)} className="text-xs text-slate-400 mt-3">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const METRICS = [
  { id: 'sessions', label: 'Sessões' },
  { id: 'attendance', label: 'Presença' },
  { id: 'revenue', label: 'Receita' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'load', label: 'Carga de treino' },
] as const

function EvolutionChartSection({ period }: { period: (typeof PERIODS)[number]['id'] }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]['id']>('sessions')
  const [data, setData] = useState<{ label: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, period])

  const load = async () => {
    setLoading(true)
    const days = PERIODS.find((p) => p.id === period)!.days
    const buckets = Math.min(days <= 7 ? days : days <= 30 ? 10 : 12, 30)
    const bucketDays = Math.max(1, Math.round(days / buckets))
    const now = new Date()
    const points: { label: string; value: number }[] = []

    for (let i = buckets - 1; i >= 0; i--) {
      const bucketEnd = new Date(now.getTime() - i * bucketDays * 86400000)
      const bucketStart = new Date(bucketEnd.getTime() - bucketDays * 86400000)
      const startStr = bucketStart.toISOString().slice(0, 10)
      const endStr = bucketEnd.toISOString().slice(0, 10)
      let value = 0

      if (metric === 'sessions') {
        const { count } = await supabase.from('workout_sessions').select('*', { count: 'exact', head: true }).gte('session_date', startStr).lt('session_date', endStr)
        value = count ?? 0
      } else if (metric === 'attendance') {
        const { data: rows } = await supabase.from('attendance').select('status').gte('attendance_date', startStr).lt('attendance_date', endStr)
        value = rows && rows.length ? Math.round((rows.filter((r) => r.status === 'presente').length / rows.length) * 100) : 0
      } else if (metric === 'revenue') {
        const { data: rows } = await supabase.from('payments').select('amount').eq('status', 'pago').gte('date', startStr).lt('date', endStr)
        value = (rows ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
      } else if (metric === 'readiness') {
        const { data: rows } = await supabase.from('cardio_readiness').select('ipc_score').gte('reading_date', startStr).lt('reading_date', endStr).not('ipc_score', 'is', null)
        value = rows && rows.length ? Math.round(rows.reduce((s, r) => s + (r.ipc_score ?? 0), 0) / rows.length) : 0
      } else if (metric === 'load') {
        const { data: rows } = await supabase.from('workout_sessions').select('session_load').gte('session_date', startStr).lt('session_date', endStr).not('session_load', 'is', null)
        value = rows && rows.length ? Math.round(rows.reduce((s, r) => s + (r.session_load ?? 0), 0) / rows.length) : 0
      }

      points.push({ label: bucketEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value })
    }
    setData(points)
    setLoading(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="text-lg font-semibold text-slate-800">Evolução</h2>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap">
          {METRICS.map((m) => (
            <button key={m.id} onClick={() => setMetric(m.id)} className={`px-3 py-1 rounded-md text-xs font-medium ${metric === m.id ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500 py-10 text-center">Carregando...</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#731919" strokeWidth={2} dot={{ r: 3 }} name={METRICS.find((m) => m.id === metric)?.label} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function MonthlyPerformance() {
  const [rows, setRows] = useState<{ label: string; curr: string; prev: string }[] | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const iso = (d: Date) => d.toISOString().slice(0, 10)

    const fetchMonth = async (start: Date, end: Date) => {
      const s = iso(start)
      const e = iso(end)
      const [{ count: newStudents }, { count: activeStudents }, { data: sessions }, { data: attendance }, { count: assessments }, { data: payments }, { data: overdue }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).gte('created_at', s).lt('created_at', e),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('workout_sessions').select('rpe, duration_minutes, session_load').gte('session_date', s).lt('session_date', e),
        supabase.from('attendance').select('status').gte('attendance_date', s).lt('attendance_date', e),
        supabase.from('assessments').select('*', { count: 'exact', head: true }).gte('assessment_date', s).lt('assessment_date', e),
        supabase.from('payments').select('amount').eq('status', 'pago').gte('date', s).lt('date', e),
        supabase.from('payments').select('amount').eq('status', 'atrasado').gte('date', s).lt('date', e),
      ])
      const concluded = (sessions ?? []).filter((sess) => sess.rpe !== null && sess.duration_minutes !== null).length
      const attPct = attendance && attendance.length ? Math.round((attendance.filter((a) => a.status === 'presente').length / attendance.length) * 100) : 0
      const avgLoad = sessions && sessions.length ? Math.round((sessions.filter((s) => s.session_load).reduce((a, s) => a + (s.session_load ?? 0), 0) / Math.max(1, sessions.filter((s) => s.session_load).length))) : 0
      const revenue = (payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)
      const inadimplencia = (overdue ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)
      return {
        novosAlunos: newStudents ?? 0,
        alunosAtivos: activeStudents ?? 0,
        sessoes: sessions?.length ?? 0,
        treinosConcluidos: concluded,
        presenca: `${attPct}%`,
        avaliacoes: assessments ?? 0,
        receita: `R$ ${revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
        inadimplencia: `R$ ${inadimplencia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
        cargaMedia: avgLoad,
      }
    }

    const [curr, prev] = await Promise.all([fetchMonth(monthStart, now), fetchMonth(prevMonthStart, monthStart)])

    setRows([
      { label: 'Novos alunos', curr: String(curr.novosAlunos), prev: String(prev.novosAlunos) },
      { label: 'Alunos ativos', curr: String(curr.alunosAtivos), prev: String(prev.alunosAtivos) },
      { label: 'Sessões', curr: String(curr.sessoes), prev: String(prev.sessoes) },
      { label: 'Treinos concluídos', curr: String(curr.treinosConcluidos), prev: String(prev.treinosConcluidos) },
      { label: 'Presença', curr: curr.presenca, prev: prev.presenca },
      { label: 'Avaliações', curr: String(curr.avaliacoes), prev: String(prev.avaliacoes) },
      { label: 'Receita', curr: curr.receita, prev: prev.receita },
      { label: 'Inadimplência', curr: curr.inadimplencia, prev: prev.inadimplencia },
      { label: 'Carga média', curr: String(curr.cargaMedia), prev: String(prev.cargaMedia) },
    ])
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Desempenho do mês</h2>
      {!rows ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {rows.map((r) => (
            <div key={r.label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">{r.label}</p>
              <p className="text-lg font-bold text-slate-800">{r.curr}</p>
              <p className="text-[11px] text-slate-400">mês anterior: {r.prev}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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

    const { data: students } = await supabase.from('students').select('id, full_name').eq('status', 'ativo')
    const { data: lastSessions } = await supabase.from('workout_sessions').select('student_id, session_date').order('session_date', { ascending: false })
    const lastByStudent = new Map<string, string>()
    ;(lastSessions ?? []).forEach((s) => {
      if (!lastByStudent.has(s.student_id)) lastByStudent.set(s.student_id, s.session_date)
    })
    ;(students ?? []).forEach((s) => {
      const last = lastByStudent.get(s.id)
      if (!last || last < cutoff) {
        items.push({ student_id: s.id, name: s.full_name, reason: last ? 'Sem treinar há mais de um período' : 'Nunca registrou sessão', date: last ?? '-', severity: 'media' })
      }
    })

    const { data: overdue } = await supabase.from('payments').select('contract_id, date, student_contracts(student_id, students(id, full_name))').eq('status', 'atrasado')
    ;(overdue ?? []).forEach((p: any) => {
      const s = p.student_contracts?.students
      if (s) items.push({ student_id: s.id, name: s.full_name, reason: 'Pagamento em atraso', date: p.date, severity: 'alta' })
    })

    const { data: openAlertsData } = await supabase.from('alerts').select('student_id, message, created_at, students(full_name)').eq('status', 'novo').eq('category', 'cardiovascular').limit(20)
    ;(openAlertsData ?? []).forEach((a: any) => {
      items.push({ student_id: a.student_id, name: a.students?.full_name ?? '-', reason: `Alerta cardiovascular: ${a.message}`, date: a.created_at, severity: 'alta' })
    })

    setAttention(items.slice(0, 15))
  }

  const loadHighlight = async (start: Date) => {
    const { data: students } = await supabase.from('students').select('id, full_name, status').limit(50)
    const cutoff = start.toISOString().slice(0, 10)
    const rows = await Promise.all(
      (students ?? []).map(async (s) => {
        const [{ data: att }, { data: sess }] = await Promise.all([
          supabase.from('attendance').select('status').eq('student_id', s.id).gte('attendance_date', cutoff),
          supabase.from('workout_sessions').select('session_date, rpe').eq('student_id', s.id).order('session_date', { ascending: false }).limit(1),
        ])
        const attendancePct = att && att.length ? Math.round((att.filter((a) => a.status === 'presente').length / att.length) * 100) : null
        return { id: s.id, name: s.full_name, status: s.status, attendancePct, lastSession: sess?.[0]?.session_date ?? null, rpe: sess?.[0]?.rpe ?? null }
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
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${period === p.id ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <NovaAcaoButton />
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

          <EvolutionChartSection period={period} />
          <MonthlyPerformance />

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
