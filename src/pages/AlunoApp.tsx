import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import EvolutionChart from '../components/EvolutionChart'
import { CalendarioTab } from './CalendarioModule'
import type { Student, WorkoutPlan, WorkoutExercise, WorkoutSession } from '../types'

const ALUNO_TABS = ['Meus Treinos', 'Agenda', 'Check-in', 'Checkout', 'Peso', 'Histórico', 'Evolução'] as const
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
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
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
      <nav className="bg-white border-b border-slate-200 px-3 sm:px-6 flex gap-1 overflow-x-auto">
        {ALUNO_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap shrink-0 ${
              tab === t ? 'border-[#731919] text-[#731919]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>
      <main className="p-4 sm:p-6 max-w-3xl mx-auto">
        {tab === 'Meus Treinos' && <MeusTreinos studentId={studentId} />}
        {tab === 'Agenda' && student && <CalendarioTab studentId={studentId} ownerId={student.owner_id} readOnly />}
        {tab === 'Check-in' && <CheckinTab studentId={studentId} />}
        {tab === 'Checkout' && <CheckoutTab studentId={studentId} />}
        {tab === 'Peso' && <PesoTab studentId={studentId} />}
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

const PAIN_REGIONS_ALUNO = ['Joelho', 'Quadril', 'Lombar', 'Ombro', 'Punho', 'Cotovelo', 'Tornozelo', 'Pescoço']

function ScaleButtons({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={`h-9 flex-1 rounded-lg text-sm font-medium border ${value === n ? 'bg-[#731919] text-white border-[#731919]' : 'border-slate-300 text-slate-600'}`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function CheckinTab({ studentId }: { studentId: string }) {
  const [form, setForm] = useState({
    sleep_hours: '',
    sleep_quality: 3,
    energy_level: 3,
    disposition: 3,
    stress_level: 3,
    pain_level: '',
    pain_regions: [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const toggleRegion = (r: string) =>
    setForm((f) => ({ ...f, pain_regions: f.pain_regions.includes(r) ? f.pain_regions.filter((x) => x !== r) : [...f.pain_regions, r] }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('recovery_checkins').insert({
      student_id: studentId,
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      sleep_quality: form.sleep_quality,
      energy_level: form.energy_level,
      disposition: form.disposition,
      stress_level: form.stress_level,
      pain_level: form.pain_level ? Number(form.pain_level) : null,
      pain_regions: form.pain_regions,
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
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Sono</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Horas de sono">
            <input className="input" type="number" step="0.5" placeholder="Ex: 7.5" value={form.sleep_hours} onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })} />
          </Field>
          <Field label="Qualidade do sono">
            <select className="input" value={form.sleep_quality} onChange={(e) => setForm({ ...form, sleep_quality: Number(e.target.value) })}>
              <option value={1}>1 — muito ruim</option>
              <option value={2}>2 — ruim</option>
              <option value={3}>3 — razoável</option>
              <option value={4}>4 — boa</option>
              <option value={5}>5 — ótima</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-800">Energia · Disposição · Estresse</p>
        <div>
          <p className="text-sm text-slate-700">Nível de Energia</p>
          <p className="text-xs text-slate-400 mb-1">1 = exausto · 5 = muito energizado</p>
          <ScaleButtons value={form.energy_level} onChange={(v) => setForm({ ...form, energy_level: v })} />
        </div>
        <div>
          <p className="text-sm text-slate-700">Disposição para Treinar</p>
          <p className="text-xs text-slate-400 mb-1">1 = sem vontade · 5 = muito motivado</p>
          <ScaleButtons value={form.disposition} onChange={(v) => setForm({ ...form, disposition: v })} />
        </div>
        <div>
          <p className="text-sm text-slate-700">Estresse</p>
          <p className="text-xs text-slate-400 mb-1">1 = relaxado · 5 = muito estressado</p>
          <ScaleButtons value={form.stress_level} onChange={(v) => setForm({ ...form, stress_level: v })} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Dor Articular</p>
        <Field label="Intensidade da dor (0-10)">
          <input className="input" type="number" min={0} max={10} placeholder="0 = sem dor" value={form.pain_level} onChange={(e) => setForm({ ...form, pain_level: e.target.value })} />
        </Field>
        <Field label="Regiões com dor">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAIN_REGIONS_ALUNO.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => toggleRegion(r)}
                className={`text-xs px-2 py-2 rounded-lg border ${form.pain_regions.includes(r) ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-300 text-slate-600'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Enviando...' : 'Salvar Check-in Pré-Treino'}
      </button>
    </form>
  )
}

const SYMPTOM_OPTIONS_ALUNO = ['dor torácica', 'dispneia', 'tontura', 'síncope', 'palpitação', 'fadiga', 'edema', 'intolerância ao exercício']

function CheckoutTab({ studentId }: { studentId: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pse, setPse] = useState(5)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [feedback, setFeedback] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase
      .from('workout_sessions')
      .select('id')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSessionId(data?.id ?? null))
  }, [studentId])

  const toggleSymptom = (s: string) => setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!sessionId) return
    setSaving(true)
    await supabase.from('session_feedback').insert({
      session_id: sessionId,
      student_id: studentId,
      perceived_effort: pse,
      symptoms,
      feedback,
      notes,
    })
    setSaving(false)
    setDone(true)
  }

  if (!sessionId) {
    return <p className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-500">Nenhuma sessão registrada ainda para dar seu feedback.</p>
  }

  if (done) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600">
        Feedback enviado para o seu profissional.{' '}
        <button className="text-[#731919] underline" onClick={() => setDone(false)}>
          Enviar outro
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-800">Como foi seu treino?</p>
      <div>
        <p className="text-sm text-slate-700 mb-1">PSE — Percepção Subjetiva de Esforço (0-10)</p>
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, n) => n).map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setPse(n)}
              className={`h-9 rounded-lg text-xs font-semibold border ${pse === n ? 'bg-[#731919] text-white border-[#731919]' : 'border-slate-300 text-slate-600'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <Field label="Sintomas / intercorrências">
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS_ALUNO.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => toggleSymptom(s)}
              className={`text-xs px-2 py-1 rounded-full border ${symptoms.includes(s) ? 'bg-[#731919] text-white border-[#731919]' : 'border-slate-300 text-slate-600'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Feedback do treino">
        <textarea className="input" rows={2} placeholder="Como se sentiu?" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </Field>
      <Field label="Observações">
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Enviando...' : 'Concluir treino'}
      </button>
    </form>
  )
}

function PesoTab({ studentId }: { studentId: string }) {
  const [weight, setWeight] = useState('')
  const [logs, setLogs] = useState<{ id: string; weight_kg: number; logged_at: string }[]>([])
  const [saving, setSaving] = useState(false)

  const load = () =>
    supabase
      .from('student_weight_logs')
      .select('id, weight_kg, logged_at')
      .eq('student_id', studentId)
      .order('logged_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setLogs(data ?? []))

  useEffect(() => {
    load()
  }, [studentId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('student_weight_logs').insert({ student_id: studentId, weight_kg: Number(weight) })
    setSaving(false)
    setWeight('')
    load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 flex items-end gap-3">
        <Field label="Peso de hoje (kg)">
          <input className="input" type="number" step="0.1" required value={weight} onChange={(e) => setWeight(e.target.value)} />
        </Field>
        <button disabled={saving} className="btn-primary whitespace-nowrap">
          {saving ? 'Salvando...' : 'Registrar peso'}
        </button>
      </form>
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {logs.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum peso registrado ainda.</p>}
        {logs.map((l) => (
          <div key={l.id} className="p-3 text-sm flex justify-between">
            <span>{new Date(l.logged_at).toLocaleDateString('pt-BR')}</span>
            <span className="font-medium">{l.weight_kg} kg</span>
          </div>
        ))}
      </div>
    </div>
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
