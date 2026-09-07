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
  'Sessão',
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

      {tab === 'Geral' && student && (
        <div className="space-y-6">
          <GeralTab student={student} ownerId={session.user.id} onUpdate={setStudent} />
          <LinkAccountCard student={student} />
        </div>
      )}
      {tab === 'Saúde' && <SaudeTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Avaliações' && <AvaliacoesTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Treinos' && <TreinosTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Sessão' && <SessoesTab studentId={id} ownerId={session.user.id} />}
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

// ---------------- VÍNCULO DE CONTA (login do aluno) ----------------
function LinkAccountCard({ student }: { student: Student }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'ok'>('idle')
  const [message, setMessage] = useState('')

  const link = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const { error } = await supabase.rpc('link_student_account', { p_student_id: student.id, p_email: email })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    } else {
      setStatus('ok')
      setMessage('Conta vinculada. O aluno já pode entrar com esse e-mail e senha.')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-lg space-y-3">
      <p className="text-sm font-semibold text-slate-800">Acesso do aluno ao app</p>
      <p className="text-xs text-slate-500">
        {student.user_id
          ? 'Este aluno já possui uma conta vinculada.'
          : 'O aluno precisa primeiro criar a própria conta na tela de login (mesmo formulário do profissional). Depois, informe o e-mail usado por ele aqui para liberar o acesso.'}
      </p>
      {!student.user_id && (
        <form onSubmit={link} className="flex gap-2">
          <input
            className="input flex-1"
            type="email"
            placeholder="email-do-aluno@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button disabled={status === 'saving'} className="btn-primary whitespace-nowrap">
            {status === 'saving' ? 'Vinculando...' : 'Vincular'}
          </button>
        </form>
      )}
      {message && <p className={`text-xs ${status === 'error' ? 'text-red-600' : 'text-teal-700'}`}>{message}</p>}
    </div>
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

// ---------------- SESSÃO (Sessão / Recuperação / IPC) ----------------
const PAIN_REGIONS_SESSION = PAIN_REGIONS

function ScalePicker({ value, onChange, max = 5 }: { value: number | null; onChange: (v: number) => void; max?: number }) {
  const options = Array.from({ length: max + 1 }, (_, i) => i).filter((n) => (max === 5 ? n >= 1 : true))
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={`h-9 flex-1 min-w-[44px] rounded-lg text-sm font-medium border ${
            value === n ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

const PSE_LABELS = [
  ['😴', 'Repouso'],
  ['😌', 'Muito leve'],
  ['🙂', 'Leve'],
  ['😊', 'Moderado'],
  ['😐', 'Moderado+'],
  ['😕', 'Forte'],
  ['🙁', 'Forte+'],
  ['😟', 'Muito forte'],
  ['😫', 'Muito forte+'],
  ['🥵', 'Extremo'],
  ['💀', 'Máximo'],
] as const

function PseScale({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-11 gap-1 text-center">
      {PSE_LABELS.map(([emoji, label], n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={`flex flex-col items-center gap-0.5 rounded-lg py-2 border ${
            value === n ? 'border-teal-600 bg-teal-50' : 'border-transparent hover:bg-slate-50'
          }`}
        >
          <span className="text-lg">{emoji}</span>
          <span className="text-[10px] font-semibold">{n}</span>
          <span className="text-[9px] text-slate-500 leading-tight hidden sm:block">{label}</span>
        </button>
      ))}
    </div>
  )
}

async function evaluateAlertsAgainst(
  studentId: string,
  ownerId: string,
  sourceTable: string,
  sourceId: string,
  vitals: Record<string, number | null>,
) {
  const { data: rules } = await supabase.from('clinical_safety_rules').select('*').eq('active', true)
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
}

// Duplo Produto = FC x PAS · MVO2 = (DP x 0,0014) - 6,3
function doubleProduct(hr: string, sbp: string) {
  if (!hr || !sbp) return null
  return Number(hr) * Number(sbp)
}
function mvo2(dp: number | null) {
  if (dp === null) return null
  return Math.round((dp * 0.0014 - 6.3) * 10) / 10
}

const SESSAO_SUBTABS = ['Sessão', 'Recuperação', 'IPC'] as const
type SessaoSubTab = (typeof SESSAO_SUBTABS)[number]

function SessoesTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [sub, setSub] = useState<SessaoSubTab>('Sessão')
  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
        {SESSAO_SUBTABS.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${
              sub === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {sub === 'Sessão' && <SessaoForm studentId={studentId} ownerId={ownerId} />}
      {sub === 'Recuperação' && <RecuperacaoModule studentId={studentId} ownerId={ownerId} />}
      {sub === 'IPC' && <IpcTab studentId={studentId} />}
    </div>
  )
}

// ---- Sub-aba "Sessão": registro completo pré/pós numa única tela ----
const emptySessao = {
  workout_plan_id: '',
  session_date: new Date().toISOString().slice(0, 10),
  systolic_bp_pre: '',
  diastolic_bp_pre: '',
  heart_rate_pre: '',
  heart_rate_post: '',
  heart_rate_max: '',
  spo2_pre: '',
  spo2_post: '',
  duration_minutes: '',
  rpe: 5,
  feedback: '',
  notes: '',
}

function SessaoForm({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [form, setForm] = useState(emptySessao)
  const [rules, setRules] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    supabase.from('workout_plans').select('*').eq('student_id', studentId).eq('active', true).then(({ data }) => setPlans(data ?? []))
    supabase
      .from('clinical_safety_rules')
      .select('*')
      .eq('active', true)
      .in('field_name', ['systolic_bp', 'diastolic_bp'])
      .then(({ data }) => setRules(data ?? []))
  }, [studentId])

  const bpNote = () => {
    if (!form.systolic_bp_pre && !form.diastolic_bp_pre) {
      return { text: 'Informe a pressão arterial acima para receber a classificação e orientação de segurança.', tone: 'neutral' as const }
    }
    const vitals = { systolic_bp: Number(form.systolic_bp_pre) || null, diastolic_bp: Number(form.diastolic_bp_pre) || null }
    let worst: any = null
    for (const r of rules) {
      const v = vitals[r.field_name as 'systolic_bp' | 'diastolic_bp']
      if (v === null) continue
      const triggered =
        (r.operator === 'gt' && v > r.threshold) ||
        (r.operator === 'gte' && v >= r.threshold) ||
        (r.operator === 'lt' && v < r.threshold) ||
        (r.operator === 'lte' && v <= r.threshold) ||
        (r.operator === 'eq' && v === r.threshold)
      if (triggered && (!worst || (r.severity === 'vermelho' && worst.severity !== 'vermelho'))) worst = r
    }
    if (worst) return { text: worst.message, tone: worst.severity as 'amarelo' | 'vermelho' }
    return { text: 'Dentro dos parâmetros configurados.', tone: 'ok' as const }
  }

  const dpPre = doubleProduct(form.heart_rate_pre, form.systolic_bp_pre)
  const dpPost = doubleProduct(form.heart_rate_post, form.systolic_bp_pre)
  const vo2i = mvo2(dpPre)
  const vo2f = mvo2(dpPost)
  const note = bpNote()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const vitalsPre = {
      systolic_bp: form.systolic_bp_pre ? Number(form.systolic_bp_pre) : null,
      diastolic_bp: form.diastolic_bp_pre ? Number(form.diastolic_bp_pre) : null,
      heart_rate: form.heart_rate_pre ? Number(form.heart_rate_pre) : null,
      spo2: form.spo2_pre ? Number(form.spo2_pre) : null,
    }
    const vitalsPost = {
      heart_rate: form.heart_rate_post ? Number(form.heart_rate_post) : null,
      spo2: form.spo2_post ? Number(form.spo2_post) : null,
    }
    const { data: row, error } = await supabase
      .from('workout_sessions')
      .insert({
        student_id: studentId,
        owner_id: ownerId,
        workout_plan_id: form.workout_plan_id || null,
        session_date: form.session_date,
        heart_rate_pre: vitalsPre.heart_rate,
        systolic_bp_pre: vitalsPre.systolic_bp,
        diastolic_bp_pre: vitalsPre.diastolic_bp,
        spo2_pre: vitalsPre.spo2,
        heart_rate_post: vitalsPost.heart_rate,
        spo2_post: vitalsPost.spo2,
        heart_rate_max: form.heart_rate_max ? Number(form.heart_rate_max) : null,
        vo2_initial: vo2i,
        vo2_final: vo2f,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        rpe: form.rpe,
        feedback: form.feedback || null,
        notes: form.notes || null,
      })
      .select()
      .single()

    if (!error && row) {
      await evaluateAlertsAgainst(studentId, ownerId, 'workout_sessions', row.id, vitalsPre)
      await evaluateAlertsAgainst(studentId, ownerId, 'workout_sessions', row.id, vitalsPost)
      setSavedMsg('Sessão registrada.')
      setForm(emptySessao)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid sm:grid-cols-2 gap-4">
        <Field label="Treino">
          <select className="input" value={form.workout_plan_id} onChange={(e) => setForm({ ...form, workout_plan_id: e.target.value })}>
            <option value="">Selecione o treino</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data">
          <input type="date" className="input" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
        </Field>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Pressão Arterial Pré-Treino (mmHg)</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Sistólica (PAS)">
            <input className="input" type="number" value={form.systolic_bp_pre} onChange={(e) => setForm({ ...form, systolic_bp_pre: e.target.value })} />
          </Field>
          <Field label="Diastólica (PAD)">
            <input className="input" type="number" value={form.diastolic_bp_pre} onChange={(e) => setForm({ ...form, diastolic_bp_pre: e.target.value })} />
          </Field>
        </div>
        <p
          className={`text-xs rounded-lg px-3 py-2 ${
            note.tone === 'vermelho'
              ? 'bg-red-50 text-red-700'
              : note.tone === 'amarelo'
                ? 'bg-amber-50 text-amber-700'
                : note.tone === 'ok'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-slate-50 text-slate-500'
          }`}
        >
          {note.text}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Frequência Cardíaca (bpm)</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Pré-treino">
            <input className="input" type="number" value={form.heart_rate_pre} onChange={(e) => setForm({ ...form, heart_rate_pre: e.target.value })} />
          </Field>
          <Field label="Pós-treino">
            <input className="input" type="number" value={form.heart_rate_post} onChange={(e) => setForm({ ...form, heart_rate_post: e.target.value })} />
          </Field>
          <Field label="FC Máxima">
            <input className="input" type="number" value={form.heart_rate_max} onChange={(e) => setForm({ ...form, heart_rate_max: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Saturação (SpO2) · Duplo Produto · MVO2</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="SpO2 Pré (%)">
            <input className="input" type="number" value={form.spo2_pre} onChange={(e) => setForm({ ...form, spo2_pre: e.target.value })} />
          </Field>
          <Field label="SpO2 Pós (%)">
            <input className="input" type="number" value={form.spo2_post} onChange={(e) => setForm({ ...form, spo2_post: e.target.value })} />
          </Field>
          <Field label="Duplo Produto Pré">
            <input className="input bg-slate-50" disabled value={dpPre ?? 'auto'} />
          </Field>
          <Field label="Duplo Produto Pós">
            <input className="input bg-slate-50" disabled value={dpPost ?? 'auto'} />
          </Field>
          <Field label="MVO2 Inicial (ml/min/kg)">
            <input className="input bg-slate-50" disabled value={vo2i ?? 'auto'} />
          </Field>
          <Field label="MVO2 Final (ml/min/kg)">
            <input className="input bg-slate-50" disabled value={vo2f ?? 'auto'} />
          </Field>
        </div>
        <p className="text-[11px] text-slate-400">DP = FC × PAS · MVO2 = (DP × 0,0014) − 6,3 — calculados automaticamente.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <Field label="Duração (minutos)">
          <input className="input max-w-[160px]" type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
        </Field>
        <div>
          <p className="text-sm text-slate-600 mb-2">PSE — Percepção Subjetiva de Esforço</p>
          <PseScale value={form.rpe} onChange={(v) => setForm({ ...form, rpe: v })} />
        </div>
        <Field label="Feedback do Treino">
          <textarea className="input" rows={2} placeholder="Como se sentiu? Dores, desconfortos, intercorrências..." value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
        </Field>
        <Field label="Observações / Cargas">
          <textarea className="input" rows={2} placeholder="Cargas utilizadas, ajustes, anotações para próxima sessão..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>

      {savedMsg && <p className="text-sm text-teal-700">{savedMsg}</p>}
      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Salvando...' : 'Registrar Sessão'}
      </button>
    </form>
  )
}

// ---- Sub-aba "Recuperação": Pré-Treino / Pós-Treino / Volume / Dashboard ----
const RECUP_SUBTABS = ['Pré-Treino', 'Pós-Treino', 'Volume', 'Dashboard'] as const
type RecupSubTab = (typeof RECUP_SUBTABS)[number]

function RecuperacaoModule({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [sub, setSub] = useState<RecupSubTab>('Pré-Treino')
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-800">Monitoramento de Recuperação e Controle de Carga</p>
        <p className="text-xs text-slate-500">Check-in pré-treino, registro pós-treino, controle de volume e dashboard</p>
      </div>
      <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap">
        {RECUP_SUBTABS.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium min-w-[80px] ${
              sub === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {sub === 'Pré-Treino' && <PreTreinoCheckin studentId={studentId} ownerId={ownerId} />}
      {sub === 'Pós-Treino' && <PosTreinoCheckin studentId={studentId} ownerId={ownerId} />}
      {sub === 'Volume' && <VolumeTab studentId={studentId} />}
      {sub === 'Dashboard' && <RecuperacaoDashboard studentId={studentId} />}
    </div>
  )
}

const emptyPreCheckin = {
  sleep_hours: '',
  sleep_quality: null as number | null,
  energy_level: null as number | null,
  disposition: null as number | null,
  stress_level: null as number | null,
  pain_level: '',
  pain_regions: [] as string[],
}

function PreTreinoCheckin({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [form, setForm] = useState(emptyPreCheckin)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const toggleRegion = (r: string) =>
    setForm((f) => ({ ...f, pain_regions: f.pain_regions.includes(r) ? f.pain_regions.filter((x) => x !== r) : [...f.pain_regions, r] }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const vitals = { pain_level: form.pain_level ? Number(form.pain_level) : null }
    const { data: row, error } = await supabase
      .from('recovery_checkins')
      .insert({
        student_id: studentId,
        owner_id: ownerId,
        sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
        sleep_quality: form.sleep_quality,
        energy_level: form.energy_level,
        disposition: form.disposition,
        stress_level: form.stress_level,
        pain_level: vitals.pain_level,
        pain_regions: form.pain_regions,
      })
      .select()
      .single()
    if (!error && row) {
      await evaluateAlertsAgainst(studentId, ownerId, 'recovery_checkins', row.id, vitals)
      setSavedMsg('Check-in pré-treino salvo.')
      setForm(emptyPreCheckin)
    }
    setSaving(false)
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
            <select
              className="input"
              value={form.sleep_quality ?? ''}
              onChange={(e) => setForm({ ...form, sleep_quality: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Selecionar</option>
              <option value="1">1 — muito ruim</option>
              <option value="2">2 — ruim</option>
              <option value="3">3 — razoável</option>
              <option value="4">4 — boa</option>
              <option value="5">5 — ótima</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-800">Energia · Disposição · Estresse</p>
        <div>
          <p className="text-sm text-slate-700">Nível de Energia</p>
          <p className="text-xs text-slate-400 mb-1">1 = exausto · 5 = muito energizado</p>
          <ScalePicker value={form.energy_level} onChange={(v) => setForm({ ...form, energy_level: v })} />
        </div>
        <div>
          <p className="text-sm text-slate-700">Disposição para Treinar</p>
          <p className="text-xs text-slate-400 mb-1">1 = sem vontade · 5 = muito motivado</p>
          <ScalePicker value={form.disposition} onChange={(v) => setForm({ ...form, disposition: v })} />
        </div>
        <div>
          <p className="text-sm text-slate-700">Estresse</p>
          <p className="text-xs text-slate-400 mb-1">1 = relaxado · 5 = muito estressado</p>
          <ScalePicker value={form.stress_level} onChange={(v) => setForm({ ...form, stress_level: v })} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Dor Articular</p>
        <Field label="Intensidade da dor (0-10)">
          <input className="input" type="number" min={0} max={10} placeholder="0 = sem dor" value={form.pain_level} onChange={(e) => setForm({ ...form, pain_level: e.target.value })} />
        </Field>
        <Field label="Regiões com dor">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAIN_REGIONS_SESSION.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => toggleRegion(r)}
                className={`text-xs px-2 py-2 rounded-lg border ${
                  form.pain_regions.includes(r) ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-300 text-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {savedMsg && <p className="text-sm text-teal-700">{savedMsg}</p>}
      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Salvando...' : 'Salvar Check-in Pré-Treino'}
      </button>
    </form>
  )
}

function PosTreinoCheckin({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [openSession, setOpenSession] = useState<WorkoutSession | null>(null)
  const [form, setForm] = useState({
    post_heart_rate: '',
    post_systolic_bp: '',
    post_diastolic_bp: '',
    post_spo2: '',
    heart_rate_max: '',
    rpe: 5,
    recovery_perception: null as number | null,
    symptoms: [] as string[],
    feedback: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setOpenSession(data))
  }, [studentId, savedMsg])

  const toggleSymptom = (s: string) =>
    setForm((f) => ({ ...f, symptoms: f.symptoms.includes(s) ? f.symptoms.filter((x) => x !== s) : [...f.symptoms, s] }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!openSession) return
    setSaving(true)
    const vitals = {
      heart_rate: form.post_heart_rate ? Number(form.post_heart_rate) : null,
      systolic_bp: form.post_systolic_bp ? Number(form.post_systolic_bp) : null,
      diastolic_bp: form.post_diastolic_bp ? Number(form.post_diastolic_bp) : null,
      spo2: form.post_spo2 ? Number(form.post_spo2) : null,
    }
    const { error } = await supabase
      .from('workout_sessions')
      .update({
        heart_rate_post: vitals.heart_rate,
        systolic_bp_post: vitals.systolic_bp,
        diastolic_bp_post: vitals.diastolic_bp,
        spo2_post: vitals.spo2,
        heart_rate_max: form.heart_rate_max ? Number(form.heart_rate_max) : null,
        recovery_perception: form.recovery_perception,
        rpe: form.rpe,
        symptoms: form.symptoms,
        feedback: form.feedback || openSession.feedback || null,
        notes: [openSession.notes, form.notes].filter(Boolean).join(' — ') || null,
      })
      .eq('id', openSession.id)
    if (!error) {
      await evaluateAlertsAgainst(studentId, ownerId, 'workout_sessions', openSession.id, vitals)
      setSavedMsg('Pós-treino registrado.')
    }
    setSaving(false)
  }

  if (!openSession) {
    return <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-5">Nenhuma sessão registrada ainda para lançar o pós-treino.</p>
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-800">
        Pós-treino — sessão de {new Date(openSession.session_date).toLocaleDateString('pt-BR')}
      </p>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="FC pós">
          <input className="input" type="number" value={form.post_heart_rate} onChange={(e) => setForm({ ...form, post_heart_rate: e.target.value })} />
        </Field>
        <Field label="FC máxima">
          <input className="input" type="number" value={form.heart_rate_max} onChange={(e) => setForm({ ...form, heart_rate_max: e.target.value })} />
        </Field>
        <Field label="SpO2 pós">
          <input className="input" type="number" value={form.post_spo2} onChange={(e) => setForm({ ...form, post_spo2: e.target.value })} />
        </Field>
        <Field label="PA sistólica pós">
          <input className="input" type="number" value={form.post_systolic_bp} onChange={(e) => setForm({ ...form, post_systolic_bp: e.target.value })} />
        </Field>
        <Field label="PA diastólica pós">
          <input className="input" type="number" value={form.post_diastolic_bp} onChange={(e) => setForm({ ...form, post_diastolic_bp: e.target.value })} />
        </Field>
        <Field label="Percepção de recuperação (1-5)">
          <ScalePicker value={form.recovery_perception} onChange={(v) => setForm({ ...form, recovery_perception: v })} />
        </Field>
      </div>
      <div>
        <p className="text-sm text-slate-600 mb-2">PSE</p>
        <PseScale value={form.rpe} onChange={(v) => setForm({ ...form, rpe: v })} />
      </div>
      <Field label="Sintomas / intercorrências">
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => toggleSymptom(s)}
              className={`text-xs px-2 py-1 rounded-full border ${
                form.symptoms.includes(s) ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-300 text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Feedback">
        <textarea className="input" rows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
      </Field>
      <Field label="Observações">
        <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
      {savedMsg && <p className="text-sm text-teal-700">{savedMsg}</p>}
      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Salvando...' : 'Salvar Pós-Treino'}
      </button>
    </form>
  )
}

function VolumeTab({ studentId }: { studentId: string }) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  useEffect(() => {
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .limit(10)
      .then(({ data }) => setSessions(data ?? []))
  }, [studentId])

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weeklyLoad = sessions.filter((s) => new Date(s.session_date).getTime() >= weekAgo).reduce((acc, s) => acc + (s.session_load ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-xs text-slate-500">Carga semanal (últimos 7 dias)</p>
        <p className="text-2xl font-semibold text-slate-800">{weeklyLoad}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {sessions.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhuma sessão registrada.</p>}
        {sessions.map((s) => (
          <div key={s.id} className="p-3 text-sm flex justify-between">
            <span>{new Date(s.session_date).toLocaleDateString('pt-BR')}</span>
            <span className="text-slate-500">
              {s.duration_minutes ?? '-'}min · PSE {s.rpe ?? '-'} · carga {s.session_load ?? '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecuperacaoDashboard({ studentId }: { studentId: string }) {
  const [checkins, setCheckins] = useState<RecoveryCheckin[]>([])
  useEffect(() => {
    supabase
      .from('recovery_checkins')
      .select('*')
      .eq('student_id', studentId)
      .order('checkin_at', { ascending: false })
      .limit(7)
      .then(({ data }) => setCheckins((data as RecoveryCheckin[]) ?? []))
  }, [studentId])

  const avg = (key: keyof RecoveryCheckin) => {
    const vals = checkins.map((c) => c[key]).filter((v): v is number => typeof v === 'number')
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-'
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Energia média</p>
          <p className="text-xl font-semibold">{avg('energy_level')}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Sono médio</p>
          <p className="text-xl font-semibold">{avg('sleep_quality')}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Dor média</p>
          <p className="text-xl font-semibold">{avg('pain_level')}</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {checkins.length === 0 && <p className="p-4 text-sm text-slate-500">Sem check-ins registrados ainda.</p>}
        {checkins.map((c) => (
          <div key={c.id} className="p-3 text-sm flex justify-between">
            <span>{new Date(c.checkin_at).toLocaleDateString('pt-BR')}</span>
            <span className="text-slate-500">
              sono {c.sleep_quality ?? '-'} · energia {c.energy_level ?? '-'} · dor {c.pain_level ?? '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Sub-aba "IPC": Índice de Prontidão Cardiovascular (interno, apoio à decisão) ----
function IpcTab({ studentId }: { studentId: string }) {
  const [last, setLast] = useState<RecoveryCheckin | null>(null)
  useEffect(() => {
    supabase
      .from('recovery_checkins')
      .select('*')
      .eq('student_id', studentId)
      .order('checkin_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLast(data as RecoveryCheckin | null))
  }, [studentId])

  if (!last) {
    return <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-5">Sem check-in de recuperação recente para calcular o índice.</p>
  }

  // Heurística interna simples e transparente — nunca um escore clínico validado.
  let score = 50
  if (last.sleep_quality) score += (last.sleep_quality - 3) * 8
  if (last.energy_level) score += (last.energy_level - 3) * 8
  if (last.disposition) score += (last.disposition - 3) * 6
  if (last.stress_level) score -= (last.stress_level - 3) * 6
  if (last.pain_level !== null && last.pain_level !== undefined) score -= last.pain_level * 3
  if (last.spo2 !== null && last.spo2 !== undefined && last.spo2 < 95) score -= (95 - last.spo2) * 4
  score = Math.max(0, Math.min(100, Math.round(score)))
  const level = score >= 70 ? 'verde' : score >= 40 ? 'amarelo' : 'vermelho'
  const color = level === 'verde' ? 'text-green-600' : level === 'amarelo' ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-2">
      <p className="text-xs text-slate-500">Índice interno de prontidão (apoio à decisão)</p>
      <p className={`text-5xl font-bold ${color}`}>{score}</p>
      <p className={`text-sm font-medium ${color}`}>{level.toUpperCase()}</p>
      <p className="text-xs text-slate-400 max-w-sm mx-auto">
        Calculado a partir do último check-in de recuperação. Não é um escore clínico validado nem substitui avaliação médica ou decisão profissional.
      </p>
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
