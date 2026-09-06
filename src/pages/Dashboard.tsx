import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Stats = {
  totalStudents: number
  activeStudents: number
  sessionsToday: number
  openAlerts: number
  pendingPayments: number
  overduePayments: number
}

function Card({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-300 transition-colors">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  )
  return href ? <Link to={href}>{content}</Link> : content
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [
        { count: totalStudents },
        { count: activeStudents },
        { count: sessionsToday },
        { count: openAlerts },
        { count: pendingPayments },
        { count: overduePayments },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase
          .from('workout_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('session_date', todayStart.toISOString()),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('resolved', false),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'atrasado'),
      ])

      setStats({
        totalStudents: totalStudents ?? 0,
        activeStudents: activeStudents ?? 0,
        sessionsToday: sessionsToday ?? 0,
        openAlerts: openAlerts ?? 0,
        pendingPayments: pendingPayments ?? 0,
        overduePayments: overduePayments ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Dashboard</h1>

      {loading || !stats ? (
        <p className="text-slate-500 text-sm">Carregando indicadores...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card label="Alunos (total)" value={stats.totalStudents} href="/alunos" />
          <Card label="Alunos ativos" value={stats.activeStudents} href="/alunos" />
          <Card label="Sessões hoje" value={stats.sessionsToday} />
          <Card label="Alertas em aberto" value={stats.openAlerts} />
          <Card label="Pagamentos pendentes" value={stats.pendingPayments} href="/financeiro" />
          <Card label="Pagamentos em atraso" value={stats.overduePayments} href="/financeiro" />
        </div>
      )}
    </div>
  )
}
