import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import type {
  Student,
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
import { CardioTab, PeriodizacaoTab } from './CardioPeriodizacao'
import { AnamneseTab, PresencaTab, TestesFuncionaisTab } from './AnamneseAvancada'
import { IpcTab } from './IpcModule'
import { TreinosTab } from './TreinosModule'
import { CalendarioTab } from './CalendarioModule'

const TABS = [
  'Geral',
  'Saúde',
  'Avaliações',
  'Treinos',
  'Sessão',
  'Cardio',
  'Periodização',
  'Calendário',
  'Presença',
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
  const [searchParams] = useSearchParams()
  const { session } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const initialTab = (searchParams.get('tab') as Tab) ?? 'Geral'
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab) ? initialTab : 'Geral')

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
    <div className="p-4 sm:p-8 max-w-4xl">
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
              tab === t ? 'border-[#731919] text-[#731919]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Geral' && student && (
        <div className="space-y-6">
          <GeralTab student={student} ownerId={session.user.id} onUpdate={setStudent} />
          <LinkAccountCard student={student} onUpdate={setStudent} />
        </div>
      )}
      {tab === 'Saúde' && <AnamneseTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Avaliações' && <AvaliacoesTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Treinos' && <TreinosTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Sessão' && <SessoesTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Cardio' && <CardioTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Periodização' && <PeriodizacaoTab studentId={id} />}
      {tab === 'Calendário' && <CalendarioTab studentId={id} ownerId={session.user.id} />}
      {tab === 'Presença' && <PresencaTab studentId={id} />}
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
function LinkAccountCard({ student, onUpdate }: { student: Student; onUpdate: (s: Student) => void }) {
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
      onUpdate({ ...student, user_id: 'linked' })
    }
  }

  const unlink = async () => {
    if (!confirm('Desvincular esta conta do aluno?')) return
    const { error } = await supabase.rpc('unlink_student_account', { p_student_id: student.id })
    if (!error) onUpdate({ ...student, user_id: null })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-lg space-y-3">
      <p className="text-sm font-semibold text-slate-800">Acesso do aluno ao app</p>
      <p className="text-xs text-slate-500">
        {student.user_id
          ? 'Este aluno já possui uma conta vinculada.'
          : 'O aluno precisa primeiro criar a própria conta na tela de login (mesmo formulário do profissional). Depois, informe o e-mail usado por ele aqui para liberar o acesso.'}
      </p>
      {student.user_id && (
        <button onClick={unlink} className="text-xs text-red-600 font-medium">
          Desvincular conta
        </button>
      )}
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
      {message && <p className={`text-xs ${status === 'error' ? 'text-red-600' : 'text-[#731919]'}`}>{message}</p>}
    </div>
  )
}

// ---------------- AVALIAÇÕES (Avaliação Física / Testes Funcionais) ----------------
const AVAL_SUBTABS = ['Avaliação', 'Testes Funcionais'] as const
function AvaliacoesTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [sub, setSub] = useState<(typeof AVAL_SUBTABS)[number]>('Avaliação')
  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
        {AVAL_SUBTABS.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${sub === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {s}
          </button>
        ))}
      </div>
      {sub === 'Avaliação' && <AvaliacaoFisicaTab studentId={studentId} ownerId={ownerId} />}
      {sub === 'Testes Funcionais' && <TestesFuncionaisTab studentId={studentId} ownerId={ownerId} />}
    </div>
  )
}

// ---- Fórmulas portadas do app de referência (PhysicalAssessmentTab) ----
function calcBMR(weight: number, height: number, age: number, sex: 'M' | 'F') {
  if (!weight || !height || !age || !sex) return null
  if (sex === 'M') return Math.round(88.36 + 13.4 * weight + 4.8 * height - 5.7 * age)
  return Math.round(447.6 + 9.2 * weight + 3.1 * height - 4.3 * age)
}
function calcPredictedVO2(age: number, sex: 'M' | 'F') {
  if (!age || !sex) return null
  if (sex === 'M') return Math.round((57.8 - 0.445 * age) * 10) / 10
  return Math.round((41.2 - 0.343 * age) * 10) / 10
}
function calcAge(birthDate: string | null) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const n = new Date()
  let age = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--
  return age
}
function calcPollock3(sex: 'M' | 'F', age: number, sf: { chest: number; abdomen: number; thigh: number; triceps: number; suprailiac: number }) {
  let sum: number, density: number
  if (sex === 'M') {
    sum = sf.chest + sf.abdomen + sf.thigh
    density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age
  } else {
    sum = sf.triceps + sf.suprailiac + sf.thigh
    density = 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age
  }
  const fat = (4.95 / density - 4.5) * 100
  return { sum: Math.round(sum * 10) / 10, density: Math.round(density * 10000) / 10000, fat: Math.round(fat * 10) / 10 }
}
function calcPollock7(
  sex: 'M' | 'F',
  age: number,
  sf: { chest: number; axillar: number; triceps: number; subscapular: number; abdomen: number; suprailiac: number; thigh: number },
) {
  const sum = sf.chest + sf.axillar + sf.triceps + sf.subscapular + sf.abdomen + sf.suprailiac + sf.thigh
  let density: number
  if (sex === 'M') density = 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age
  else density = 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age
  const fat = (4.95 / density - 4.5) * 100
  return { sum: Math.round(sum * 10) / 10, density: Math.round(density * 10000) / 10000, fat: Math.round(fat * 10) / 10 }
}

const emptySF3 = { chest: '', abdomen: '', thigh: '', triceps: '', suprailiac: '' }
const emptySF7 = { chest: '', axillar: '', triceps: '', subscapular: '', abdomen: '', suprailiac: '', thigh: '' }

function AvaliacaoFisicaTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [items, setItems] = useState<Assessment[]>([])
  const [student, setStudent] = useState<Student | null>(null)
  const [form, setForm] = useState({ weight_kg: '', height_cm: '', notes: '' })
  const [sf3, setSf3] = useState(emptySF3)
  const [sf7, setSf7] = useState(emptySF7)
  const [protocol, setProtocol] = useState<'3' | '7'>('3')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('assessments').select('*').eq('student_id', studentId).order('assessment_date', { ascending: false })
    setItems((data as Assessment[]) ?? [])
  }
  useEffect(() => {
    load()
    supabase.from('students').select('*').eq('id', studentId).single().then(({ data }) => setStudent(data))
  }, [studentId])

  const sex: 'M' | 'F' | null = student?.sex === 'M' || student?.sex === 'F' ? student.sex : null
  const age = calcAge(student?.birth_date ?? null)
  const weight = Number(form.weight_kg) || 0
  const height = Number(form.height_cm) || 0

  const bmr = sex && age ? calcBMR(weight, height, age, sex) : null
  const predictedVo2 = sex && age ? calcPredictedVO2(age, sex) : null

  const sf3nums = { chest: Number(sf3.chest) || 0, abdomen: Number(sf3.abdomen) || 0, thigh: Number(sf3.thigh) || 0, triceps: Number(sf3.triceps) || 0, suprailiac: Number(sf3.suprailiac) || 0 }
  const sf7nums = {
    chest: Number(sf7.chest) || 0,
    axillar: Number(sf7.axillar) || 0,
    triceps: Number(sf7.triceps) || 0,
    subscapular: Number(sf7.subscapular) || 0,
    abdomen: Number(sf7.abdomen) || 0,
    suprailiac: Number(sf7.suprailiac) || 0,
    thigh: Number(sf7.thigh) || 0,
  }
  const res3 = sex && age ? calcPollock3(sex, age, sf3nums) : null
  const res7 = sex && age ? calcPollock7(sex, age, sf7nums) : null
  const activeRes = protocol === '3' ? res3 : res7
  const fatMass = activeRes && weight ? Math.round((activeRes.fat / 100) * weight * 10) / 10 : null
  const leanMass = fatMass !== null && weight ? Math.round((weight - fatMass) * 10) / 10 : null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('assessments').insert({
      student_id: studentId,
      owner_id: ownerId,
      weight_kg: weight || null,
      height_cm: height || null,
      body_fat_pct: activeRes?.fat ?? null,
      lean_mass_kg: leanMass,
      basal_energy_expenditure: bmr,
      vo2_estimated: predictedVo2,
      skinfolds: protocol === '3' ? sf3nums : sf7nums,
      notes: form.notes || null,
    })
    setSaving(false)
    if (!error) {
      setForm({ weight_kg: '', height_cm: '', notes: '' })
      setSf3(emptySF3)
      setSf7(emptySF7)
      load()
    }
  }

  return (
    <div className="space-y-6">
      {!sex && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Defina o sexo do aluno na aba Geral para calcular BMR, VO2 previsto e % de gordura automaticamente.</p>}
      <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Field label="Peso (kg)">
            <input className="input w-28" type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
          </Field>
          <Field label="Altura (cm)">
            <input className="input w-28" type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} />
          </Field>
        </div>

        {(bmr || predictedVo2) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Gasto Energético Basal</p>
              <p className="text-xl font-bold text-[#731919]">{bmr ?? '—'}</p>
              <p className="text-xs text-slate-400">kcal/dia (Harris-Benedict)</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wide">VO2 Previsto</p>
              <p className="text-xl font-bold text-[#731919]">{predictedVo2 ?? '—'}</p>
              <p className="text-xs text-slate-400">ml/kg/min</p>
            </div>
          </div>
        )}

        <div>
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1 max-w-xs mb-3">
            {(['3', '7'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProtocol(p)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium ${protocol === p ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
              >
                {p} Dobras Pollock
              </button>
            ))}
          </div>
          {protocol === '3' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(sex === 'F'
                ? [
                    ['triceps', 'Tríceps'],
                    ['suprailiac', 'Supra-ilíaca'],
                    ['thigh', 'Coxa'],
                  ]
                : [
                    ['chest', 'Peito'],
                    ['abdomen', 'Abdômen'],
                    ['thigh', 'Coxa'],
                  ]
              ).map(([k, l]) => (
                <Field key={k} label={`${l} (mm)`}>
                  <input className="input" type="number" step="0.1" value={(sf3 as any)[k]} onChange={(e) => setSf3({ ...sf3, [k]: e.target.value })} />
                </Field>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['chest', 'Peito'],
                ['axillar', 'Axilar'],
                ['triceps', 'Tríceps'],
                ['subscapular', 'Subescapular'],
                ['abdomen', 'Abdômen'],
                ['suprailiac', 'Supra-ilíaca'],
                ['thigh', 'Coxa'],
              ].map(([k, l]) => (
                <Field key={k} label={`${l} (mm)`}>
                  <input className="input" type="number" step="0.1" value={(sf7 as any)[k]} onChange={(e) => setSf7({ ...sf7, [k]: e.target.value })} />
                </Field>
              ))}
            </div>
          )}
          {activeRes && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {[
                ['Σ Dobras', `${activeRes.sum} mm`],
                ['% Gordura', `${activeRes.fat}%`],
                ['Massa Gorda', fatMass ? `${fatMass} kg` : '—'],
                ['Massa Magra', leanMass ? `${leanMass} kg` : '—'],
              ].map(([l, v]) => (
                <div key={l} className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="font-bold text-sm">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Field label="Observações">
          <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <button disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar avaliação'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {items.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhuma avaliação registrada.</p>}
        {items.map((a) => (
          <div key={a.id} className="p-4 text-sm flex justify-between">
            <span>{new Date(a.assessment_date).toLocaleDateString('pt-BR')}</span>
            <span className="text-slate-600">
              {a.weight_kg ?? '-'}kg · {a.height_cm ?? '-'}cm · IMC {a.bmi ?? '-'} · {a.body_fat_pct ?? '-'}% gordura · {a.lean_mass_kg ?? '-'}kg magra
            </span>
          </div>
        ))}
      </div>
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
            value === n ? 'bg-[#731919] text-white border-[#731919]' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
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
  ['😤', 'Forte'],
  ['😓', 'Forte+'],
  ['😰', 'Muito forte'],
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
            value === n ? 'border-[#731919] bg-[#C89116]/10' : 'border-transparent hover:bg-slate-50'
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
        category: 'cardiovascular',
        title: rule.name,
        priority: rule.severity === 'vermelho' ? 'alta' : 'media',
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
      {sub === 'IPC' && <IpcTab studentId={studentId} ownerId={ownerId} />}
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

// ---- Classificação de PA portada do app de referência (BPAlert.jsx) ----
function classifySystolic(v: number) {
  if (!v) return null
  if (v < 120) return { label: 'Normal', stage: 0 }
  if (v <= 139) return { label: 'Pré-hipertensão', stage: 1 }
  if (v <= 159) return { label: 'Estágio 1', stage: 2 }
  if (v <= 179) return { label: 'Estágio 2', stage: 3 }
  return { label: 'Estágio 3', stage: 4 }
}
function classifyDiastolic(v: number) {
  if (!v) return null
  if (v < 80) return { label: 'Normal', stage: 0 }
  if (v <= 89) return { label: 'Pré-hipertensão', stage: 1 }
  if (v <= 99) return { label: 'Estágio 1', stage: 2 }
  if (v <= 109) return { label: 'Estágio 2', stage: 3 }
  return { label: 'Estágio 3', stage: 4 }
}
function trainingClearance(maxStage: number) {
  if (maxStage <= 0) return { text: 'Liberado para treino', tone: 'ok' as const }
  if (maxStage === 1) return { text: 'Liberado com atenção — monitorar durante o treino', tone: 'amarelo' as const }
  if (maxStage === 2) return { text: 'Liberado com restrição — reduzir intensidade, monitorar FC e sintomas', tone: 'amarelo' as const }
  if (maxStage === 3) return { text: 'Não recomendado — aguardar normalização antes de iniciar', tone: 'vermelho' as const }
  return { text: 'Contraindicado — não iniciar sessão', tone: 'vermelho' as const }
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
  const sysClass = classifySystolic(Number(form.systolic_bp_pre))
  const diaClass = classifyDiastolic(Number(form.diastolic_bp_pre))
  const clearance = sysClass || diaClass ? trainingClearance(Math.max(sysClass?.stage ?? 0, diaClass?.stage ?? 0)) : null

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
        {(sysClass || diaClass) && (
          <div className="grid sm:grid-cols-2 gap-2">
            {sysClass && (
              <div className="text-xs rounded-lg px-3 py-2 bg-slate-50">
                <p className="font-semibold text-slate-700">Sistólica: {form.systolic_bp_pre} mmHg</p>
                <p className="text-slate-500">{sysClass.label}</p>
              </div>
            )}
            {diaClass && (
              <div className="text-xs rounded-lg px-3 py-2 bg-slate-50">
                <p className="font-semibold text-slate-700">Diastólica: {form.diastolic_bp_pre} mmHg</p>
                <p className="text-slate-500">{diaClass.label}</p>
              </div>
            )}
          </div>
        )}
        {clearance && (
          <p
            className={`text-xs rounded-lg px-3 py-2 font-medium ${
              clearance.tone === 'vermelho' ? 'bg-red-50 text-red-700' : clearance.tone === 'amarelo' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {clearance.text}
          </p>
        )}
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

      {savedMsg && <p className="text-sm text-[#731919]">{savedMsg}</p>}
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
  const [history, setHistory] = useState<any[]>([])

  const loadHistory = () =>
    supabase
      .from('recovery_checkins')
      .select('*')
      .eq('student_id', studentId)
      .order('checkin_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory(data ?? []))

  useEffect(() => {
    loadHistory()
  }, [studentId])

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
        origin: 'profissional',
      })
      .select()
      .single()
    if (!error && row) {
      await evaluateAlertsAgainst(studentId, ownerId, 'recovery_checkins', row.id, vitals)
      setSavedMsg('Check-in pré-treino salvo.')
      setForm(emptyPreCheckin)
      loadHistory()
    }
    setSaving(false)
  }

  return (
    <>
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

      {savedMsg && <p className="text-sm text-[#731919]">{savedMsg}</p>}
      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Salvando...' : 'Salvar Check-in Pré-Treino'}
      </button>
    </form>

    <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
      <p className="text-sm font-semibold text-slate-800 mb-2">Check-ins recentes</p>
      <div className="divide-y divide-slate-100">
        {history.length === 0 && <p className="text-sm text-slate-500 py-2">Nenhum check-in registrado ainda.</p>}
        {history.map((h) => (
          <div key={h.id} className="py-2 text-sm flex flex-wrap justify-between gap-2">
            <span className="text-slate-500">{new Date(h.checkin_at).toLocaleString('pt-BR')}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${h.origin === 'aluno' ? 'bg-[#C89116]/10 text-[#731919]' : 'bg-slate-100 text-slate-600'}`}
            >
              {h.origin === 'aluno' ? 'enviado pelo aluno' : 'registrado pelo profissional'}
            </span>
            <span className="text-slate-500 text-xs">
              sono {h.sleep_quality ?? '-'} · energia {h.energy_level ?? '-'} · dor {h.pain_level ?? '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
    </>
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
                form.symptoms.includes(s) ? 'bg-[#731919] text-white border-[#731919]' : 'border-slate-300 text-slate-600'
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
      {savedMsg && <p className="text-sm text-[#731919]">{savedMsg}</p>}
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
                <button onClick={() => markPaid(p.id)} className="text-xs text-[#731919] hover:underline">
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
            <button onClick={() => resolve(a.id)} className="text-xs text-[#731919] hover:underline">
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
