import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import EvolutionChart from '../components/EvolutionChart'
import { CalendarioTab } from './CalendarioModule'
import type { Student, WorkoutPlan, WorkoutExercise, WorkoutSession } from '../types'

const ALUNO_TABS = ['Meus Treinos', 'Agenda', 'Check-in', 'Histórico', 'Evolução'] as const
type AlunoTab = (typeof ALUNO_TABS)[number]

export default function AlunoApp({ studentId }: { studentId: string }) {
  const { signOut } = useAuth()
  const [tab, setTab] = useState<AlunoTab>('Meus Treinos')
  const [student, setStudent] = useState<Student | null>(null)

  useEffect(() => {
    supabase.from('students').select('*').eq('id', studentId).single().then(({ data }) => setStudent(data))
  }, [studentId])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-semibold text-slate-900">CardioFit</span>
          <span className="text-slate-400 text-sm ml-2">Área do aluno</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{student?.full_name}</span>
          <button onClick={() => signOut()} className="text-sm text-slate-500 hover:underline">
            Sair
          </button>
        </div>
      </header>
      <nav className="bg-white border-b border-slate-200 px-6 flex gap-1">
        {ALUNO_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-3 text-sm font-medium border-b-2 ${
              tab === t ? 'border-[#731919] text-[#731919]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>
      <main className="p-6 max-w-3xl mx-auto">
        {tab === 'Meus Treinos' && <MeusTreinos studentId={studentId} />}
        {tab === 'Agenda' && student && <CalendarioTab studentId={studentId} ownerId={student.owner_id} readOnly />}
        {tab === 'Check-in' && <CheckinTab studentId={studentId} />}
        {tab === 'Histórico' && <HistoricoTab studentId={studentId} />}
        {tab === 'Evolução' && <EvolutionChart studentId={studentId} />}
      </main>
    </div>
  )
}

function MeusTreinos({ studentId }: { studentId: string }) {
  const [plans, setPlans] = useState<(WorkoutPlan & { workout_exercises: WorkoutExercise[] })[]>([])

  useEffect(() => {
    supabase
      .from('workout_plans')
      .select('*, workout_exercises(*)')
      .eq('student_id', studentId)
      .eq('active', true)
      .then(({ data }) => setPlans((data as any) ?? []))
  }, [studentId])

  if (plans.length === 0) return <p className="text-sm text-slate-500">Nenhum treino ativo liberado ainda pelo seu profissional.</p>

  return (
    <div className="space-y-4">
      {plans.map((p) => (
        <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="font-semibold text-slate-800">{p.name}</p>
          <p className="text-xs text-slate-500 mb-3">{p.objective}</p>
          <div className="divide-y divide-slate-100">
            {(p.workout_exercises ?? [])
              .sort((a, b) => a.order_index - b.order_index)
              .map((ex) => (
                <div key={ex.id} className="py-2 text-sm flex justify-between">
                  <span>{ex.exercise_name}</span>
                  <span className="text-slate-500">
                    {ex.sets ?? '-'}x{ex.reps ?? '-'} · {ex.load_kg ? `${ex.load_kg}kg` : '-'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CheckinTab({ studentId }: { studentId: string }) {
  const [form, setForm] = useState({
    sleep_quality: 3,
    energy_level: 3,
    pain_level: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    spo2: '',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('recovery_checkins').insert({
      student_id: studentId,
      sleep_quality: form.sleep_quality,
      energy_level: form.energy_level,
      pain_level: form.pain_level ? Number(form.pain_level) : null,
      systolic_bp: form.systolic_bp ? Number(form.systolic_bp) : null,
      diastolic_bp: form.diastolic_bp ? Number(form.diastolic_bp) : null,
      heart_rate: form.heart_rate ? Number(form.heart_rate) : null,
      spo2: form.spo2 ? Number(form.spo2) : null,
      origin: 'aluno',
    })
    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600">
        Check-in enviado para o seu profissional.{' '}
        <button className="text-[#731919] underline" onClick={() => setDone(false)}>
          Enviar outro
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-800">Check-in pré-treino</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Qualidade do sono (1-5)">
          <input className="input" type="number" min={1} max={5} value={form.sleep_quality} onChange={(e) => setForm({ ...form, sleep_quality: Number(e.target.value) })} />
        </Field>
        <Field label="Nível de energia (1-5)">
          <input className="input" type="number" min={1} max={5} value={form.energy_level} onChange={(e) => setForm({ ...form, energy_level: Number(e.target.value) })} />
        </Field>
        <Field label="Dor (0-10)">
          <input className="input" type="number" min={0} max={10} value={form.pain_level} onChange={(e) => setForm({ ...form, pain_level: e.target.value })} />
        </Field>
        <Field label="FC">
          <input className="input" type="number" value={form.heart_rate} onChange={(e) => setForm({ ...form, heart_rate: e.target.value })} />
        </Field>
        <Field label="PA sistólica">
          <input className="input" type="number" value={form.systolic_bp} onChange={(e) => setForm({ ...form, systolic_bp: e.target.value })} />
        </Field>
        <Field label="PA diastólica">
          <input className="input" type="number" value={form.diastolic_bp} onChange={(e) => setForm({ ...form, diastolic_bp: e.target.value })} />
        </Field>
        <Field label="SpO2">
          <input className="input" type="number" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} />
        </Field>
      </div>
      <button disabled={saving} className="btn-primary">
        {saving ? 'Enviando...' : 'Enviar check-in'}
      </button>
    </form>
  )
}

function HistoricoTab({ studentId }: { studentId: string }) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  useEffect(() => {
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .then(({ data }) => setSessions(data ?? []))
  }, [studentId])

  return (
    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
      {sessions.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhuma sessão registrada ainda.</p>}
      {sessions.map((s) => (
        <div key={s.id} className="p-4 text-sm flex justify-between">
          <span>{new Date(s.session_date).toLocaleDateString('pt-BR')}</span>
          <span className="text-slate-500">
            {s.duration_minutes ?? '-'}min · PSE {s.rpe ?? '-'}
          </span>
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-500 text-xs">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
