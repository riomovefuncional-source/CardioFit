import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import type {
  Student,
  HealthHistory,
  Assessment,
  WorkoutPlan,
  WorkoutSession,
  RecoveryCheckin,
  Alert as AlertRow,
  StudentContract,
  Payment,
} from '../types'
import { PAIN_REGIONS } from '../types'
import EvolutionChart from '../components/EvolutionChart'

const TABS = [
  'Geral',
  'Saúde',
  'Avaliações',
  'Treinos',
  'Sessões',
  'Evolução',
  'Financeiro',
  'Alertas',
] as const
type Tab = (typeof TABS)[number]

const SYMPTOM_OPTIONS = [
  'dor torácica',
  'dispneia',
  'tontura',
  'síncope',
  'palpitação',
  'fadiga',
  'edema',
  'intolerância ao exercício',
]

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [tab, setTab] = useState<Tab>('Geral')

  useEffect(() => {
    if (!id) return
    supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setStudent(data))
  }, [id])

  if (!id || !session) return null

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">
        {student?.full_name ?? 'Carregando...'}
      </h1>
      <p className="text-sm text-slate-500 mb-6">Perfil do aluno</p>

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
              tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Geral' && student && <GeralTab student={student} ownerId={session.user.id} onUpdate={setStudent} />}
      {tab === 'Saúde' && <SaudeTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Avaliações' && <AvaliacoesTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Treinos' && <TreinosTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Sessões' && <SessoesTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Evolução' && <EvolutionChart studentId={id} />}
      {tab === 'Financeiro' && <FinanceiroTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Alertas' && <AlertasTab studentId={id} />}
    </div>
  )
}

// ---------------- GERAL ----------------
function GeralTab({
  student,
  ownerId,
  onUpdate,
}: {
  student: Student
  ownerId: string
  onUpdate: (s: Student) => void
}) {
  const [form, setForm] = useState(student)
  const [saving, setSaving] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('students')
      .update({
        full_name: form.full_name,
        birth_date: form.birth_date || null,
        sex: form.sex,
        phone: form.phone,
        email: form.email,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        occupation: form.occupation,
        notes: form.notes,
        status: form.status,
      })
      .eq('id', student.id)
      .eq('owner_id', ownerId)
      .select()
      .single()
    setSaving(false)
    if (!error && data) onUpdate(data)
  }

  return (
    <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 max-w-lg">
      <Field label="Nome completo">
        <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data de nascimento">
          <input type="date" className="input" value={form.birth_date ?? ''} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
        </Field>
        <Field label="Sexo">
          <select className="input" value={form.sex ?? ''} onChange={(e) => setForm({ ...form, sex: e.target.value as Student['sex'] })}>
            <option value="">-</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="outro">Outro</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Telefone">
          <input className="input" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="E-mail">
          <input className="input" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Contato de emergência">
          <input className="input" value={form.emergency_contact_name ?? ''} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
        </Field>
        <Field label="Telefone de emergência">
          <input className="input" value={form.emergency_contact_phone ?? ''} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
        </Field>
      </div>
      <Field label="Profissão">
        <input className="input" value={form.occupation ?? ''} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
      </Field>
      <Field label="Status">
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Student['status'] })}>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="inativo">Inativo</option>
        </select>
      </Field>
      <Field label="Observações">
        <textarea className="input" rows={3} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
      <button disabled={saving} className="btn-primary">
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}

// ---------------- SAÚDE (Anamnese) ----------------
function SaudeTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [history, setHistory] = useState<HealthHistory | null>(null)
  const [form, setForm] = useState<Partial<HealthHistory>>({ symptoms: [], risk_factors: [] })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('health_history')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setHistory(data)
    if (data) setForm(data)
  }

  useEffect(() => {
    load()
  }, [studentId])

  const toggleSymptom = (s: string) => {
    const list = form.symptoms ?? []
    setForm({ ...form, symptoms: list.includes(s) ? list.filter((x) => x !== s) : [...list, s] })
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    // Cada gravação cria uma nova versão da anamnese — histórico nunca é sobrescrito.
    const { error } = await supabase.from('health_history').insert({
      ...form,
      student_id: studentId,
      owner_id: ownerId,
    })
    setSaving(false)
    if (!error) load()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 max-w-lg">
        <p className="text-xs text-slate-500">
          Cada vez que você salva, uma nova versão da anamnese é registrada — o histórico anterior é preservado.
        </p>
        <Field label="Diagnóstico cardiovascular">
          <input
            className="input"
            value={form.cardiovascular_diagnosis ?? ''}
            onChange={(e) => setForm({ ...form, cardiovascular_diagnosis: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['history_infarction', 'Histórico de infarto'],
            ['heart_failure', 'Insuficiência cardíaca'],
            ['hypertension', 'Hipertensão'],
            ['arrhythmia', 'Arritmias'],
            ['coronary_artery_disease', 'Doença arterial coronariana'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean((form as any)[key])}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
        <Field label="Sintomas">
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => toggleSymptom(s)}
                className={`text-xs px-2 py-1 rounded-full border ${
                  form.symptoms?.includes(s)
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Histórico familiar">
          <input className="input" value={form.family_history ?? ''} onChange={(e) => setForm({ ...form, family_history: e.target.value })} />
        </Field>
        <Field label="Cirurgias / limitações musculoesqueléticas">
          <textarea className="input" rows={2} value={form.musculoskeletal_notes ?? ''} onChange={(e) => setForm({ ...form, musculoskeletal_notes: e.target.value })} />
        </Field>
        <button disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : history ? 'Salvar nova versão' : 'Salvar anamnese'}
        </button>
      </form>
    </div>
  )
}

// ---------------- AVALIAÇÕES ----------------
function AvaliacoesTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [items, setItems] = useState<Assessment[]>([])
  const [form, setForm] = useState({ weight_kg: '', height_cm: '', body_fat_pct: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('assessments')
      .select('*')
      .eq('student_id', studentId)
      .order('assessment_date', { ascending: false })
    setItems(data ?? [])
  }

  useEffect(() => {
    load()
  }, [studentId])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('assessments').insert({
      student_id: studentId,
      owner_id: ownerId,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      body_fat_pct: form.body_fat_pct ? Number(form.body_fat_pct) : null,
      notes: form.notes || null,
    })
    setSaving(false)
    if (!error) {
      setForm({ weight_kg: '', height_cm: '', body_fat_pct: '', notes: '' })
      load()
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap gap-3 items-end max-w-2xl">
        <Field label="Peso (kg)">
          <input className="input w-24" type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
        </Field>
        <Field label="Altura (cm)">
          <input className="input w-24" type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} />
        </Field>
        <Field label="% Gordura">
          <input className="input w-24" type="number" step="0.1" value={form.body_fat_pct} onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })} />
        </Field>
        <Field label="Observações">
          <input className="input w-48" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <button disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Registrar avaliação'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {items.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhuma avaliação registrada.</p>}
        {items.map((a) => (
          <div key={a.id} className="p-4 text-sm flex justify-between">
            <span>{new Date(a.assessment_date).toLocaleDateString('pt-BR')}</span>
            <span className="text-slate-600">
              {a.weight_kg ?? '-'}kg · {a.height_cm ?? '-'}cm · IMC {a.bmi ?? '-'} · {a.body_fat_pct ?? '-'}% gordura
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------- TREINOS ----------------
function TreinosTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false } as any)
    setPlans(data ?? [])
  }

  useEffect(() => {
    load()
  }, [studentId])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('workout_plans').insert({
      student_id: studentId,
      owner_id: ownerId,
      name,
    })
    setSaving(false)
    if (!error) {
      setName('')
      load()
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3">
        <input
          className="input flex-1"
          placeholder="Nome do treino (ex: Treino A)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Criar treino'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {plans.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum treino criado ainda.</p>}
        {plans.map((p) => (
          <div key={p.id} className="p-4 text-sm flex justify-between items-center">
            <span className="font-medium text-slate-900">{p.name}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${p.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {p.active ? 'ativo' : 'inativo'}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Exercícios de cada treino (séries, repetições, carga, RPE) ficam na tabela workout_exercises — próxima iteração da interface.
      </p>
    </div>
  )
}

// ---------------- SESSÕES (pré-treino → sessão → pós-treino) ----------------
const PRE_SCALE_FIELDS = [
  ['sleep_quality', 'Qualidade do sono'],
  ['energy_level', 'Nível de energia'],
  ['disposition', 'Disposição para treinar'],
  ['stress_level', 'Estresse'],
] as const

function ScalePicker({ value, onChange, max = 5 }: { value: number | null; onChange: (v: number) => void; max?: number }) {
  const options = Array.from({ length: max + (max === 5 ? 0 : 1) }, (_, i) => (max === 5 ? i + 1 : i))
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={`h-7 w-7 rounded-md text-xs font-medium border ${
            value === n ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function evaluateAlertsAgainst(
  studentId: string,
  ownerId: string,
  sourceTable: string,
  sourceId: string,
  vitals: Record<string, number | null>,
) {
  return supabase
    .from('clinical_safety_rules')
    .select('*')
    .eq('active', true)
    .then(async ({ data: rules }) => {
      if (!rules) return
      for (const rule of rules) {
        const value = vitals[rule.field_name]
        if (value === null || value === undefined) continue
        const triggered =
          (rule.operator === 'gt' && value > rule.threshold) ||
          (rule.operator === 'gte' && value >= rule.threshold) ||
          (rule.operator === 'lt' && value < rule.threshold) ||
          (rule.operator === 'lte' && value <= rule.threshold) ||
          (rule.operator === 'eq' && value === rule.threshold)
        if (triggered) {
          await supabase.from('alerts').insert({
            student_id: studentId,
            owner_id: ownerId,
            source_table: sourceTable,
            source_id: sourceId,
            rule_id: rule.id,
            level: rule.severity,
            message: rule.message,
          })
        }
      }
    })
}

const emptyPre = {
  sleep_hours: '',
  sleep_quality: null as number | null,
  energy_level: null as number | null,
  disposition: null as number | null,
  stress_level: null as number | null,
  pain_level: '',
  pain_regions: [] as string[],
  systolic_bp: '',
  diastolic_bp: '',
  heart_rate: '',
  spo2: '',
  vo2_initial: '',
}

const emptyPost = {
  duration_minutes: '',
  rpe: 5,
  heart_rate_post: '',
  heart_rate_max: '',
  systolic_bp_post: '',
  diastolic_bp_post: '',
  spo2_post: '',
  vo2_final: '',
  recovery_perception: null as number | null,
  feedback: '',
  symptoms: [] as string[],
  notes: '',
}

function SessoesTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [pre, setPre] = useState(emptyPre)
  const [savingPre, setSavingPre] = useState(false)
  const [finalizingId, setFinalizingId] = useState<string | null>(null)
  const [post, setPost] = useState(emptyPost)
  const [savingPost, setSavingPost] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
    setSessions(data ?? [])
  }

  useEffect(() => {
    load()
  }, [studentId])

  const togglePainRegion = (region: string) =>
    setPre((p) => ({
      ...p,
      pain_regions: p.pain_regions.includes(region) ? p.pain_regions.filter((r) => r !== region) : [...p.pain_regions, region],
    }))

  const toggleSessionSymptom = (s: string) =>
    setPost((p) => ({
      ...p,
      symptoms: p.symptoms.includes(s) ? p.symptoms.filter((x) => x !== s) : [...p.symptoms, s],
    }))

  const startSession = async (e: FormEvent) => {
    e.preventDefault()
    setSavingPre(true)

    const vitals = {
      systolic_bp: pre.systolic_bp ? Number(pre.systolic_bp) : null,
      diastolic_bp: pre.diastolic_bp ? Number(pre.diastolic_bp) : null,
      heart_rate: pre.heart_rate ? Number(pre.heart_rate) : null,
      spo2: pre.spo2 ? Number(pre.spo2) : null,
      sleep_quality: pre.sleep_quality,
      energy_level: pre.energy_level,
      pain_level: pre.pain_level ? Number(pre.pain_level) : null,
      fatigue_level: null as number | null,
    }

    const { data: checkinRow, error } = await supabase
      .from('recovery_checkins')
      .insert({
        student_id: studentId,
        owner_id: ownerId,
        sleep_hours: pre.sleep_hours ? Number(pre.sleep_hours) : null,
        disposition: pre.disposition,
        stress_level: pre.stress_level,
        pain_regions: pre.pain_regions,
        vo2_initial: pre.vo2_initial ? Number(pre.vo2_initial) : null,
        ...vitals,
      })
      .select()
      .single()

    if (!error && checkinRow) {
      await evaluateAlertsAgainst(studentId, ownerId, 'recovery_checkins', checkinRow.id, vitals)

      await supabase.from('workout_sessions').insert({
        student_id: studentId,
        owner_id: ownerId,
        recovery_checkin_id: checkinRow.id,
        heart_rate_pre: vitals.heart_rate,
        systolic_bp_pre: vitals.systolic_bp,
        diastolic_bp_pre: vitals.diastolic_bp,
        spo2_pre: vitals.spo2,
        vo2_initial: pre.vo2_initial ? Number(pre.vo2_initial) : null,
      })
    }

    setSavingPre(false)
    setPre(emptyPre)
    load()
  }

  const openFinalize = (id: string) => {
    setFinalizingId(id)
    setPost(emptyPost)
  }

  const finalizeSession = async (e: FormEvent) => {
    e.preventDefault()
    if (!finalizingId) return
    setSavingPost(true)

    const vitals = {
      heart_rate: post.heart_rate_post ? Number(post.heart_rate_post) : null,
      systolic_bp: post.systolic_bp_post ? Number(post.systolic_bp_post) : null,
      diastolic_bp: post.diastolic_bp_post ? Number(post.diastolic_bp_post) : null,
      spo2: post.spo2_post ? Number(post.spo2_post) : null,
    }

    const { error } = await supabase
      .from('workout_sessions')
      .update({
        duration_minutes: post.duration_minutes ? Number(post.duration_minutes) : null,
        rpe: post.rpe,
        heart_rate_post: vitals.heart_rate,
        heart_rate_max: post.heart_rate_max ? Number(post.heart_rate_max) : null,
        systolic_bp_post: vitals.systolic_bp,
        diastolic_bp_post: vitals.diastolic_bp,
        spo2_post: vitals.spo2,
        vo2_final: post.vo2_final ? Number(post.vo2_final) : null,
        recovery_perception: post.recovery_perception,
        feedback: post.feedback || null,
        symptoms: post.symptoms,
        notes: post.notes || null,
      })
      .eq('id', finalizingId)

    if (!error) {
      await evaluateAlertsAgainst(studentId, ownerId, 'workout_sessions', finalizingId, vitals)
    }

    setSavingPost(false)
    setFinalizingId(null)
    load()
  }

  return (
    <div className="space-y-6">
      {/* PRÉ-TREINO */}
      <form onSubmit={startSession} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-800">Monitoramento de Recuperação e Controle de Carga (pré-treino)</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Horas de sono">
            <input className="input" type="number" step="0.5" value={pre.sleep_hours} onChange={(e) => setPre({ ...pre, sleep_hours: e.target.value })} />
          </Field>
          <Field label="Intensidade da dor (0-10)">
            <input className="input" type="number" min={0} max={10} value={pre.pain_level} onChange={(e) => setPre({ ...pre, pain_level: e.target.value })} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {PRE_SCALE_FIELDS.map(([key, label]) => (
            <Field key={key} label={`${label} (1-5)`}>
              <ScalePicker value={(pre as any)[key]} onChange={(v) => setPre({ ...pre, [key]: v })} />
            </Field>
          ))}
        </div>
        <Field label="Regiões com dor">
          <div className="flex flex-wrap gap-2">
            {PAIN_REGIONS.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => togglePainRegion(r)}
                className={`text-xs px-2 py-1 rounded-full border ${
                  pre.pain_regions.includes(r) ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-300 text-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="PA sistólica (pré)">
            <input className="input" type="number" value={pre.systolic_bp} onChange={(e) => setPre({ ...pre, systolic_bp: e.target.value })} />
          </Field>
          <Field label="PA diastólica (pré)">
            <input className="input" type="number" value={pre.diastolic_bp} onChange={(e) => setPre({ ...pre, diastolic_bp: e.target.value })} />
          </Field>
          <Field label="FC (pré)">
            <input className="input" type="number" value={pre.heart_rate} onChange={(e) => setPre({ ...pre, heart_rate: e.target.value })} />
          </Field>
          <Field label="SpO2 (pré)">
            <input className="input" type="number" value={pre.spo2} onChange={(e) => setPre({ ...pre, spo2: e.target.value })} />
          </Field>
          <Field label="Duplo Produto (pré)">
            <input className="input bg-slate-50" disabled value={pre.heart_rate && pre.systolic_bp ? Number(pre.heart_rate) * Number(pre.systolic_bp) : ''} />
          </Field>
          <Field label="VO2 inicial">
            <input className="input" type="number" step="0.1" value={pre.vo2_initial} onChange={(e) => setPre({ ...pre, vo2_initial: e.target.value })} />
          </Field>
        </div>
        <button disabled={savingPre} className="btn-primary">
          {savingPre ? 'Salvando...' : 'Iniciar sessão (registrar pré-treino)'}
        </button>
      </form>

      {/* FINALIZAR SESSÃO (registro da sessão + pós-treino) */}
      {finalizingId && (
        <form onSubmit={finalizeSession} className="bg-white border border-teal-300 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-800">Registro da sessão e monitoramento pós-treino</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Duração (min)">
              <input className="input" type="number" value={post.duration_minutes} onChange={(e) => setPost({ ...post, duration_minutes: e.target.value })} />
            </Field>
            <Field label="FC máxima">
              <input className="input" type="number" value={post.heart_rate_max} onChange={(e) => setPost({ ...post, heart_rate_max: e.target.value })} />
            </Field>
            <Field label="VO2 final">
              <input className="input" type="number" step="0.1" value={post.vo2_final} onChange={(e) => setPost({ ...post, vo2_final: e.target.value })} />
            </Field>
          </div>
          <Field label="PSE (0-10)">
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 11 }, (_, n) => n).map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setPost({ ...post, rpe: n })}
                  className={`h-8 w-8 rounded-md text-xs font-semibold border ${
                    post.rpe === n
                      ? n <= 3
                        ? 'bg-green-600 text-white border-green-600'
                        : n <= 6
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-red-600 text-white border-red-600'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="PA sistólica (pós)">
              <input className="input" type="number" value={post.systolic_bp_post} onChange={(e) => setPost({ ...post, systolic_bp_post: e.target.value })} />
            </Field>
            <Field label="PA diastólica (pós)">
              <input className="input" type="number" value={post.diastolic_bp_post} onChange={(e) => setPost({ ...post, diastolic_bp_post: e.target.value })} />
            </Field>
            <Field label="FC (pós)">
              <input className="input" type="number" value={post.heart_rate_post} onChange={(e) => setPost({ ...post, heart_rate_post: e.target.value })} />
            </Field>
            <Field label="SpO2 (pós)">
              <input className="input" type="number" value={post.spo2_post} onChange={(e) => setPost({ ...post, spo2_post: e.target.value })} />
            </Field>
            <Field label="Duplo Produto (pós)">
              <input
                className="input bg-slate-50"
                disabled
                value={post.heart_rate_post && post.systolic_bp_post ? Number(post.heart_rate_post) * Number(post.systolic_bp_post) : ''}
              />
            </Field>
            <Field label="Percepção de recuperação (1-5)">
              <ScalePicker value={post.recovery_perception} onChange={(v) => setPost({ ...post, recovery_perception: v })} />
            </Field>
          </div>
          <Field label="Sintomas / intercorrências">
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleSessionSymptom(s)}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    post.symptoms.includes(s) ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-300 text-slate-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Feedback do aluno">
            <textarea className="input" rows={2} value={post.feedback} onChange={(e) => setPost({ ...post, feedback: e.target.value })} />
          </Field>
          <Field label="Observações / cargas">
            <textarea className="input" rows={2} value={post.notes} onChange={(e) => setPost({ ...post, notes: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <button disabled={savingPost} className="btn-primary">
              {savingPost ? 'Salvando...' : 'Finalizar sessão'}
            </button>
            <button type="button" onClick={() => setFinalizingId(null)} className="text-sm text-slate-500 hover:underline">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* HISTÓRICO */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {sessions.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhuma sessão registrada.</p>}
        {sessions.map((s) => {
          const emAndamento = s.rpe === null
          return (
            <div key={s.id} className="p-4 text-sm flex items-center justify-between gap-3">
              <div>
                <span className="block">{new Date(s.session_date).toLocaleString('pt-BR')}</span>
                <span className="text-slate-500 text-xs">
                  {emAndamento
                    ? `Pré-treino registrado — FC ${s.heart_rate_pre ?? '-'} · PA ${s.systolic_bp_pre ?? '-'}/${s.diastolic_bp_pre ?? '-'} · SpO2 ${s.spo2_pre ?? '-'}%`
                    : `${s.duration_minutes ?? '-'}min · PSE ${s.rpe ?? '-'} · carga ${s.session_load ?? '-'} · DP pré/pós ${s.double_product_pre ?? '-'}/${s.double_product_post ?? '-'}`}
                </span>
              </div>
              {emAndamento && (
                <button onClick={() => openFinalize(s.id)} className="text-xs font-medium text-teal-700 hover:underline shrink-0">
                  Finalizar sessão →
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------- FINANCEIRO ----------------
function FinanceiroTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [contract, setContract] = useState<StudentContract | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [form, setForm] = useState({ agreed_value: '', due_day: '', periodicity: 'mensal' })
  const [saving, setSaving] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDue, setPayDue] = useState('')

  const load = async () => {
    const { data: c } = await supabase
      .from('student_contracts')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'ativo')
      .order('created_at', { ascending: false } as any)
      .limit(1)
      .maybeSingle()
    setContract(c)
    if (c) {
      const { data: p } = await supabase
        .from('payments')
        .select('*')
        .eq('contract_id', c.id)
        .order('due_date', { ascending: false })
      setPayments(p ?? [])
    }
  }

  useEffect(() => {
    load()
  }, [studentId])

  const createContract = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('student_contracts').insert({
      student_id: studentId,
      owner_id: ownerId,
      agreed_value: Number(form.agreed_value),
      due_day: form.due_day ? Number(form.due_day) : null,
      periodicity: form.periodicity,
    })
    setSaving(false)
    load()
  }

  const addPayment = async (e: FormEvent) => {
    e.preventDefault()
    if (!contract) return
    setSaving(true)
    await supabase.from('payments').insert({
      contract_id: contract.id,
      student_id: studentId,
      owner_id: ownerId,
      amount: Number(payAmount),
      due_date: payDue,
      status: 'pendente',
    })
    setSaving(false)
    setPayAmount('')
    setPayDue('')
    load()
  }

  const markPaid = async (paymentId: string) => {
    await supabase
      .from('payments')
      .update({ status: 'pago', paid_date: new Date().toISOString().slice(0, 10) })
      .eq('id', paymentId)
    load()
  }

  if (!contract) {
    return (
      <form onSubmit={createContract} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 max-w-md">
        <p className="text-sm text-slate-600">Este aluno ainda não tem contrato. O valor definido aqui é a fonte oficial de cobrança — não é afetado por mudanças em planos padrão.</p>
        <Field label="Valor acordado (R$)">
          <input className="input" type="number" step="0.01" required value={form.agreed_value} onChange={(e) => setForm({ ...form, agreed_value: e.target.value })} />
        </Field>
        <Field label="Dia de vencimento">
          <input className="input" type="number" min="1" max="31" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} />
        </Field>
        <Field label="Periodicidade">
          <select className="input" value={form.periodicity} onChange={(e) => setForm({ ...form, periodicity: e.target.value })}>
            <option value="semanal">Semanal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
            <option value="personalizada">Personalizada</option>
          </select>
        </Field>
        <button disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Criar contrato'}
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm text-slate-500">Valor acordado</p>
        <p className="text-xl font-semibold text-slate-900">
          R$ {contract.agreed_value.toFixed(2)} · vencimento dia {contract.due_day ?? '-'} · {contract.periodicity}
        </p>
      </div>

      <form onSubmit={addPayment} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <Field label="Valor (R$)">
          <input className="input w-32" type="number" step="0.01" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
        </Field>
        <Field label="Vencimento">
          <input className="input" type="date" required value={payDue} onChange={(e) => setPayDue(e.target.value)} />
        </Field>
        <button disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Lançar cobrança'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {payments.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhuma cobrança lançada.</p>}
        {payments.map((p) => (
          <div key={p.id} className="p-4 text-sm flex justify-between items-center">
            <span>
              R$ {p.amount.toFixed(2)} · venc. {new Date(p.due_date).toLocaleDateString('pt-BR')}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  p.status === 'pago' ? 'bg-emerald-50 text-emerald-700' : p.status === 'atrasado' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {p.status}
              </span>
              {p.status !== 'pago' && (
                <button onClick={() => markPaid(p.id)} className="text-xs text-teal-700 hover:underline">
                  marcar pago
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------- ALERTAS ----------------
function AlertasTab({ studentId }: { studentId: string }) {
  const [alerts, setAlerts] = useState<AlertRow[]>([])

  useEffect(() => {
    supabase
      .from('alerts')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAlerts(data ?? []))
  }, [studentId])

  const resolve = async (id: string) => {
    await supabase.from('alerts').update({ resolved: true }).eq('id', id)
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)))
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 max-w-lg">
        Estes indicadores são ferramentas de apoio à decisão do profissional — não substituem avaliação clínica.
      </p>
      {alerts.length === 0 && <p className="text-sm text-slate-500">Nenhum alerta registrado.</p>}
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`rounded-xl border p-4 flex justify-between items-center ${
            a.level === 'vermelho' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
          } ${a.resolved ? 'opacity-50' : ''}`}
        >
          <div>
            <p className="text-sm font-medium text-slate-900">{a.message}</p>
            <p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString('pt-BR')}</p>
          </div>
          {!a.resolved && (
            <button onClick={() => resolve(a.id)} className="text-xs text-teal-700 hover:underline">
              marcar resolvido
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------- helpers ----------------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  )
}

// re-used checkin type import kept for future check-in history view
export type { RecoveryCheckin }
