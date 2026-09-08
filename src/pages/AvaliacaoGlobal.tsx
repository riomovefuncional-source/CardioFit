import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type AssessmentRow = { id: string; student_id: string; assessment_date: string; students: { full_name: string } | null }
type StudentRow = { id: string; full_name: string }

export default function AvaliacaoGlobal() {
  const [recent, setRecent] = useState<AssessmentRow[]>([])
  const [pending, setPending] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('assessments').select('id, student_id, assessment_date, students(full_name)').order('assessment_date', { ascending: false }).limit(30),
      supabase.from('students').select('id, full_name').eq('status', 'ativo'),
      supabase.from('assessments').select('student_id'),
    ]).then(([recentRes, studentsRes, allAssessRes]) => {
      setRecent((recentRes.data as any) ?? [])
      const withAssessment = new Set((allAssessRes.data ?? []).map((a: any) => a.student_id))
      setPending(((studentsRes.data as StudentRow[]) ?? []).filter((s) => !withAssessment.has(s.id)))
      setLoading(false)
    })
  }, [])

  const overdue = recent.filter((r) => Date.now() - new Date(r.assessment_date).getTime() > 90 * 86400000)

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Avaliação</h1>
      <p className="text-sm text-slate-500 mb-6">Central de avaliações de todos os alunos.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Avaliações recentes</p>
          <p className="text-2xl font-bold" style={{ color: '#731919' }}>{recent.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Nunca avaliados</p>
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Última avaliação há mais de 90 dias</p>
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Carregando...</p>}

      {!loading && pending.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-800 mb-2">Alunos sem nenhuma avaliação</p>
          <div className="bg-white border border-amber-200 rounded-xl divide-y divide-slate-100">
            {pending.map((s) => (
              <Link key={s.id} to={`/alunos/${s.id}`} className="p-3 text-sm flex justify-between hover:bg-slate-50">
                <span>{s.full_name}</span>
                <span className="text-amber-600 text-xs">Avaliar agora →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-slate-800 mb-2">Avaliações recentes</p>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {!loading && recent.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhuma avaliação registrada ainda.</p>}
          {recent.map((r) => (
            <Link key={r.id} to={`/alunos/${r.student_id}`} className="p-3 text-sm flex justify-between hover:bg-slate-50">
              <span className="font-medium">{r.students?.full_name ?? '-'}</span>
              <span className="text-slate-500">{new Date(r.assessment_date).toLocaleDateString('pt-BR')}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
