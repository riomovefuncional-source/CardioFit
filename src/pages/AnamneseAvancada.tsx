import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import type { CardiacDiagnosis, SymptomRecord, PainRecord, Habits, Medication, Attendance, FunctionalTestResult, HealthHistory } from '../types'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-500 text-xs">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-800">
        {icon} {title}
      </p>
      {children}
    </div>
  )
}

// ================= ANAMNESE ESTRUTURADA =================
const ANAMNESE_TABS = ['Cardíaco', 'Osteoarticular', 'Medicamentos', 'Hábitos'] as const
type AnamneseTab = (typeof ANAMNESE_TABS)[number]

export function AnamneseTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [sub, setSub] = useState<AnamneseTab>('Cardíaco')
  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap">
        {ANAMNESE_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium min-w-[100px] ${
              sub === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {sub === 'Cardíaco' && <CardiacoSection studentId={studentId} ownerId={ownerId} />}
      {sub === 'Osteoarticular' && <OsteoarticularSection studentId={studentId} ownerId={ownerId} />}
      {sub === 'Medicamentos' && <MedicamentosSection studentId={studentId} ownerId={ownerId} />}
      {sub === 'Hábitos' && <HabitosSection studentId={studentId} ownerId={ownerId} />}
    </div>
  )
}

const SYMPTOM_LIST = ['Dor', 'Dispneia', 'Fadiga', 'Tontura', 'Palpitação', 'Síncope/pré-síncope', 'Edema', 'Dor torácica', 'Cansaço aos esforços']
const RISK_FACTORS = ['Hipertensão', 'Diabetes', 'Dislipidemia', 'Obesidade', 'Sedentarismo', 'Tabagismo', 'Histórico familiar', 'Doença cardiovascular', 'Estresse']

function CardiacoSection({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [diagnoses, setDiagnoses] = useState<CardiacDiagnosis[]>([])
  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([])
  const [riskFactors, setRiskFactors] = useState<string[]>([])
  const [showDiagForm, setShowDiagForm] = useState(false)
  const [diagForm, setDiagForm] = useState({ diagnosis: '', diagnosis_date: '', history: '', severity: '', treatment: '', notes: '' })
  const [expandedSymptom, setExpandedSymptom] = useState<string | null>(null)
  const [symptomForm, setSymptomForm] = useState({ frequency: '', intensity: '', situation: '', notes: '' })

  const load = () => {
    supabase.from('cardiac_diagnoses').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).then(({ data }) => setDiagnoses((data as CardiacDiagnosis[]) ?? []))
    supabase
      .from('symptom_records')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSymptoms((data as SymptomRecord[]) ?? []))
    supabase.from('health_history').select('risk_factors').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => setRiskFactors(data?.risk_factors ?? []))
  }
  useEffect(() => { load() }, [studentId])

  const saveDiagnosis = async (e: FormEvent) => {
    e.preventDefault()
    if (!diagForm.diagnosis) return
    await supabase.from('cardiac_diagnoses').insert({ ...diagForm, diagnosis_date: diagForm.diagnosis_date || null, student_id: studentId, owner_id: ownerId })
    setDiagForm({ diagnosis: '', diagnosis_date: '', history: '', severity: '', treatment: '', notes: '' })
    setShowDiagForm(false)
    load()
  }

  const latestFor = (s: string) => symptoms.find((x) => x.symptom === s)

  const saveSymptom = async (symptom: string, present: boolean) => {
    await supabase.from('symptom_records').insert({
      student_id: studentId,
      owner_id: ownerId,
      symptom,
      present,
      frequency: symptomForm.frequency || null,
      intensity: symptomForm.intensity || null,
      situation: symptomForm.situation || null,
      notes: symptomForm.notes || null,
    })
    setExpandedSymptom(null)
    setSymptomForm({ frequency: '', intensity: '', situation: '', notes: '' })
    load()
  }

  const toggleRiskFactor = async (rf: string) => {
    const next = riskFactors.includes(rf) ? riskFactors.filter((x) => x !== rf) : [...riskFactors, rf]
    setRiskFactors(next)
    await supabase.from('health_history').insert({ student_id: studentId, owner_id: ownerId, risk_factors: next })
  }

  return (
    <div className="space-y-4">
      <Section icon="🫀" title="Diagnósticos Cardiológicos">
        <div className="space-y-2">
          {diagnoses.length === 0 && <p className="text-sm text-slate-400">Nenhum diagnóstico registrado.</p>}
          {diagnoses.map((d) => (
            <div key={d.id} className="border border-slate-100 rounded-lg p-3 text-sm">
              <p className="font-medium">{d.diagnosis} {d.severity && <span className="text-xs text-slate-400">— {d.severity}</span>}</p>
              <p className="text-xs text-slate-500">{d.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString('pt-BR') : ''} {d.treatment && `· Tratamento: ${d.treatment}`}</p>
              {d.notes && <p className="text-xs text-slate-400 mt-1">{d.notes}</p>}
            </div>
          ))}
        </div>
        {!showDiagForm ? (
          <button type="button" onClick={() => setShowDiagForm(true)} className="text-xs text-[#731919] font-medium">
            + Adicionar diagnóstico
          </button>
        ) : (
          <form onSubmit={saveDiagnosis} className="grid sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <Field label="Diagnóstico">
              <input className="input" value={diagForm.diagnosis} onChange={(e) => setDiagForm({ ...diagForm, diagnosis: e.target.value })} />
            </Field>
            <Field label="Data do diagnóstico">
              <input type="date" className="input" value={diagForm.diagnosis_date} onChange={(e) => setDiagForm({ ...diagForm, diagnosis_date: e.target.value })} />
            </Field>
            <Field label="Gravidade/estágio">
              <input className="input" value={diagForm.severity} onChange={(e) => setDiagForm({ ...diagForm, severity: e.target.value })} />
            </Field>
            <Field label="Tratamento">
              <input className="input" value={diagForm.treatment} onChange={(e) => setDiagForm({ ...diagForm, treatment: e.target.value })} />
            </Field>
            <Field label="Histórico">
              <textarea className="input" rows={2} value={diagForm.history} onChange={(e) => setDiagForm({ ...diagForm, history: e.target.value })} />
            </Field>
            <Field label="Observações">
              <textarea className="input" rows={2} value={diagForm.notes} onChange={(e) => setDiagForm({ ...diagForm, notes: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary">Salvar</button>
              <button type="button" onClick={() => setShowDiagForm(false)} className="text-sm text-slate-500">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Section>

      <Section icon="⚠️" title="Sintomas Atuais">
        <div className="space-y-2">
          {SYMPTOM_LIST.map((s) => {
            const last = latestFor(s)
            return (
              <div key={s} className="border border-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setExpandedSymptom(expandedSymptom === s ? null : s)}
                  className="w-full flex items-center justify-between p-3 text-sm"
                >
                  <span>{s}</span>
                  <span className={`text-xs ${last?.present ? 'text-amber-600' : 'text-slate-400'}`}>
                    {last ? (last.present ? 'Presente' : 'Ausente') : 'Não avaliado'} ▾
                  </span>
                </button>
                {expandedSymptom === s && (
                  <div className="p-3 border-t border-slate-100 space-y-2">
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Field label="Frequência">
                        <input className="input" value={symptomForm.frequency} onChange={(e) => setSymptomForm({ ...symptomForm, frequency: e.target.value })} />
                      </Field>
                      <Field label="Intensidade">
                        <input className="input" value={symptomForm.intensity} onChange={(e) => setSymptomForm({ ...symptomForm, intensity: e.target.value })} />
                      </Field>
                      <Field label="Situação">
                        <input className="input" value={symptomForm.situation} onChange={(e) => setSymptomForm({ ...symptomForm, situation: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Observações">
                      <input className="input" value={symptomForm.notes} onChange={(e) => setSymptomForm({ ...symptomForm, notes: e.target.value })} />
                    </Field>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveSymptom(s, true)} className="text-xs bg-amber-600 text-white rounded-full px-3 py-1">
                        Registrar como presente
                      </button>
                      <button type="button" onClick={() => saveSymptom(s, false)} className="text-xs border border-slate-300 rounded-full px-3 py-1">
                        Registrar como ausente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section icon="🎯" title="Fatores de Risco">
        <div className="flex flex-wrap gap-2">
          {RISK_FACTORS.map((rf) => (
            <button
              key={rf}
              type="button"
              onClick={() => toggleRiskFactor(rf)}
              className={`text-xs px-2 py-1 rounded-full border ${
                riskFactors.includes(rf) ? 'bg-red-600 text-white border-red-600' : 'border-slate-300 text-slate-600'
              }`}
            >
              {rf}
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

const BODY_REGIONS = ['Ombro', 'Cotovelo', 'Punho/Mão', 'Coluna Cervical', 'Coluna Torácica', 'Coluna Lombar', 'Quadril', 'Joelho', 'Tornozelo/Pé']

function OsteoarticularSection({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [hh, setHh] = useState<Partial<HealthHistory>>({ affected_regions: [] })
  const [painRecords, setPainRecords] = useState<PainRecord[]>([])
  const [showPainForm, setShowPainForm] = useState(false)
  const [painForm, setPainForm] = useState({
    location: '',
    side: '',
    intensity: '',
    pain_type: '',
    onset: '',
    duration: '',
    frequency: '',
    worsens_with: '',
    improves_with: '',
    pain_during_exercise: false,
    pain_after_exercise: false,
    notes: '',
  })

  const load = () => {
    supabase
      .from('health_history')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHh(data ?? { affected_regions: [] }))
    supabase
      .from('pain_records')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPainRecords((data as PainRecord[]) ?? []))
  }
  useEffect(() => { load() }, [studentId])

  const saveHistoricoGeral = async () => {
    await supabase.from('health_history').insert({ ...hh, student_id: studentId, owner_id: ownerId })
    load()
  }

  const toggleRegion = (r: string) => {
    const list = hh.affected_regions ?? []
    setHh({ ...hh, affected_regions: list.includes(r) ? list.filter((x) => x !== r) : [...list, r] })
  }

  const savePain = async (e: FormEvent) => {
    e.preventDefault()
    await supabase.from('pain_records').insert({
      ...painForm,
      intensity: painForm.intensity ? Number(painForm.intensity) : null,
      student_id: studentId,
      owner_id: ownerId,
    })
    setShowPainForm(false)
    setPainForm({
      location: '',
      side: '',
      intensity: '',
      pain_type: '',
      onset: '',
      duration: '',
      frequency: '',
      worsens_with: '',
      improves_with: '',
      pain_during_exercise: false,
      pain_after_exercise: false,
      notes: '',
    })
    load()
  }

  return (
    <div className="space-y-4">
      <Section icon="📝" title="Histórico Geral de Saúde">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Cirurgias">
            <textarea className="input" rows={2} value={hh.surgeries_history ?? ''} onChange={(e) => setHh({ ...hh, surgeries_history: e.target.value })} />
          </Field>
          <Field label="Internações">
            <textarea className="input" rows={2} value={hh.hospitalizations ?? ''} onChange={(e) => setHh({ ...hh, hospitalizations: e.target.value })} />
          </Field>
          <Field label="Doenças prévias">
            <textarea className="input" rows={2} value={hh.prior_illnesses ?? ''} onChange={(e) => setHh({ ...hh, prior_illnesses: e.target.value })} />
          </Field>
          <Field label="Doenças respiratórias">
            <textarea className="input" rows={2} value={hh.respiratory_diseases ?? ''} onChange={(e) => setHh({ ...hh, respiratory_diseases: e.target.value })} />
          </Field>
          <Field label="Lesões / limitações musculoesqueléticas">
            <textarea className="input" rows={2} value={hh.musculoskeletal_notes ?? ''} onChange={(e) => setHh({ ...hh, musculoskeletal_notes: e.target.value })} />
          </Field>
          <Field label="Histórico familiar">
            <textarea className="input" rows={2} value={hh.family_history ?? ''} onChange={(e) => setHh({ ...hh, family_history: e.target.value })} />
          </Field>
        </div>
        <button onClick={saveHistoricoGeral} className="btn-primary">
          Salvar histórico geral
        </button>
      </Section>

      <Section icon="🦴" title="Regiões Afetadas">
        <div className="flex flex-wrap gap-2">
          {BODY_REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleRegion(r)}
              className={`text-xs px-2 py-1 rounded-full border ${
                hh.affected_regions?.includes(r) ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-300 text-slate-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <button onClick={saveHistoricoGeral} className="text-xs text-[#731919] font-medium">
          Salvar seleção de regiões
        </button>
      </Section>

      <Section icon="📍" title="Caracterização da Dor">
        <div className="space-y-2">
          {painRecords.length === 0 && <p className="text-sm text-slate-400">Nenhum registro de dor.</p>}
          {painRecords.map((p) => (
            <div key={p.id} className="border border-slate-100 rounded-lg p-3 text-sm">
              <p className="font-medium">
                {p.location} {p.side && `(${p.side})`} — intensidade {p.intensity ?? '-'}/10
              </p>
              <p className="text-xs text-slate-500">
                {p.pain_type} · início: {p.onset || '-'} · duração: {p.duration || '-'}
              </p>
            </div>
          ))}
        </div>
        {!showPainForm ? (
          <button type="button" onClick={() => setShowPainForm(true)} className="text-xs text-[#731919] font-medium">
            + Registrar dor
          </button>
        ) : (
          <form onSubmit={savePain} className="grid sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <Field label="Localização">
              <input className="input" value={painForm.location} onChange={(e) => setPainForm({ ...painForm, location: e.target.value })} />
            </Field>
            <Field label="Lado">
              <input className="input" value={painForm.side} onChange={(e) => setPainForm({ ...painForm, side: e.target.value })} />
            </Field>
            <Field label="Intensidade (0-10)">
              <input className="input" type="number" min={0} max={10} value={painForm.intensity} onChange={(e) => setPainForm({ ...painForm, intensity: e.target.value })} />
            </Field>
            <Field label="Tipo">
              <input className="input" value={painForm.pain_type} onChange={(e) => setPainForm({ ...painForm, pain_type: e.target.value })} />
            </Field>
            <Field label="Início">
              <input className="input" value={painForm.onset} onChange={(e) => setPainForm({ ...painForm, onset: e.target.value })} />
            </Field>
            <Field label="Duração">
              <input className="input" value={painForm.duration} onChange={(e) => setPainForm({ ...painForm, duration: e.target.value })} />
            </Field>
            <Field label="Frequência">
              <input className="input" value={painForm.frequency} onChange={(e) => setPainForm({ ...painForm, frequency: e.target.value })} />
            </Field>
            <Field label="Piora com">
              <input className="input" value={painForm.worsens_with} onChange={(e) => setPainForm({ ...painForm, worsens_with: e.target.value })} />
            </Field>
            <Field label="Melhora com">
              <input className="input" value={painForm.improves_with} onChange={(e) => setPainForm({ ...painForm, improves_with: e.target.value })} />
            </Field>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={painForm.pain_during_exercise} onChange={(e) => setPainForm({ ...painForm, pain_during_exercise: e.target.checked })} />
                Dor durante exercício
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={painForm.pain_after_exercise} onChange={(e) => setPainForm({ ...painForm, pain_after_exercise: e.target.checked })} />
                Dor após exercício
              </label>
            </div>
            <Field label="Observações">
              <textarea className="input" rows={2} value={painForm.notes} onChange={(e) => setPainForm({ ...painForm, notes: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary">Salvar</button>
              <button type="button" onClick={() => setShowPainForm(false)} className="text-sm text-slate-500">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Section>
    </div>
  )
}

function MedicamentosSection({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [meds, setMeds] = useState<Medication[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    drug_class: '',
    dose: '',
    frequency: '',
    schedule_time: '',
    purpose: '',
    start_date: '',
    end_date: '',
    notes: '',
  })

  const load = () =>
    supabase
      .from('medications')
      .select('*')
      .eq('student_id', studentId)
      .order('active', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => setMeds((data as Medication[]) ?? []))
  useEffect(() => { load() }, [studentId])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    await supabase.from('medications').insert({
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      student_id: studentId,
      owner_id: ownerId,
      active: true,
    })
    setShowForm(false)
    setForm({ name: '', drug_class: '', dose: '', frequency: '', schedule_time: '', purpose: '', start_date: '', end_date: '', notes: '' })
    load()
  }

  const toggleActive = async (m: Medication) => {
    await supabase.from('medications').update({ active: !m.active }).eq('id', m.id)
    load()
  }

  return (
    <Section icon="💊" title="Classes de Medicamentos em Uso">
      <div className="space-y-2">
        {meds.length === 0 && <p className="text-sm text-slate-400">Nenhum medicamento registrado.</p>}
        {meds.map((m) => (
          <div key={m.id} className={`border rounded-lg p-3 text-sm flex justify-between items-start ${m.active ? 'border-slate-100' : 'border-slate-100 opacity-50'}`}>
            <div>
              <p className="font-medium">
                {m.name} <span className="text-xs text-slate-400">({m.drug_class})</span>
              </p>
              <p className="text-xs text-slate-500">
                {m.dose} · {m.frequency} {m.schedule_time && `· ${m.schedule_time}`}
              </p>
              {m.purpose && <p className="text-xs text-slate-400">Indicação: {m.purpose}</p>}
            </div>
            <button onClick={() => toggleActive(m)} className="text-xs text-[#731919] whitespace-nowrap">
              {m.active ? 'Marcar inativo' : 'Reativar'}
            </button>
          </div>
        ))}
      </div>
      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)} className="text-xs text-[#731919] font-medium">
          + Adicionar medicamento
        </button>
      ) : (
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          <Field label="Nome do medicamento">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Classe farmacológica">
            <input className="input" value={form.drug_class} onChange={(e) => setForm({ ...form, drug_class: e.target.value })} />
          </Field>
          <Field label="Dose">
            <input className="input" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
          </Field>
          <Field label="Frequência">
            <input className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
          </Field>
          <Field label="Horário">
            <input className="input" value={form.schedule_time} onChange={(e) => setForm({ ...form, schedule_time: e.target.value })} />
          </Field>
          <Field label="Indicação">
            <input className="input" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </Field>
          <Field label="Início">
            <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </Field>
          <Field label="Término">
            <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </Field>
          <Field label="Observações">
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary">Salvar</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Section>
  )
}

function HabitosSection({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [form, setForm] = useState<Partial<Habits>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('habits')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setForm(data ?? {}))
  }, [studentId])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('habits').insert({ ...form, student_id: studentId, owner_id: ownerId })
    setSaving(false)
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Section icon="🏃" title="Atividade Física">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nível de atividade">
            <select className="input" value={form.activity_level ?? ''} onChange={(e) => setForm({ ...form, activity_level: e.target.value })}>
              <option value="">Selecionar</option>
              <option>Sedentário</option>
              <option>Leve</option>
              <option>Moderado</option>
              <option>Intenso</option>
            </select>
          </Field>
          <Field label="Frequência semanal">
            <input className="input" placeholder="Ex: 3x/semana" value={form.weekly_frequency ?? ''} onChange={(e) => setForm({ ...form, weekly_frequency: e.target.value })} />
          </Field>
        </div>
        <Field label="Tipo de atividade praticada">
          <input className="input" placeholder="Caminhada, natação, musculação..." value={form.activity_type ?? ''} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} />
        </Field>
      </Section>

      <Section icon="🌙" title="Hábitos Gerais">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Tabagismo">
            <input className="input" placeholder="Não fumante, ex-fumante, fumante..." value={form.smoking ?? ''} onChange={(e) => setForm({ ...form, smoking: e.target.value })} />
          </Field>
          <Field label="Álcool">
            <input className="input" placeholder="Não usa, ocasional, frequente..." value={form.alcohol ?? ''} onChange={(e) => setForm({ ...form, alcohol: e.target.value })} />
          </Field>
          <Field label="Qualidade do sono">
            <input className="input" placeholder="Boa, regular, ruim..." value={form.sleep_quality ?? ''} onChange={(e) => setForm({ ...form, sleep_quality: e.target.value })} />
          </Field>
          <Field label="Nível de estresse">
            <input className="input" placeholder="Baixo, moderado, alto..." value={form.stress_level ?? ''} onChange={(e) => setForm({ ...form, stress_level: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section icon="🎯" title="Preferências de Treino">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ambiente preferido">
            <select className="input" value={form.preferred_environment ?? ''} onChange={(e) => setForm({ ...form, preferred_environment: e.target.value })}>
              <option value="">Selecionar</option>
              <option>Academia</option>
              <option>Casa</option>
              <option>Ar livre</option>
            </select>
          </Field>
          <Field label="Horário preferido">
            <input className="input" placeholder="Manhã, tarde, noite" value={form.preferred_time ?? ''} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} />
          </Field>
        </div>
        <Field label="Tolerância ao esforço">
          <input className="input" placeholder="Como o aluno lida com o esforço físico" value={form.effort_tolerance ?? ''} onChange={(e) => setForm({ ...form, effort_tolerance: e.target.value })} />
        </Field>
      </Section>

      <button disabled={saving} className="btn-primary">
        {saving ? 'Salvando...' : 'Salvar hábitos'}
      </button>
    </form>
  )
}

// ================= PRESENÇA / CALENDÁRIO =================
export function PresencaTab({ studentId }: { studentId: string }) {
  const { session } = useAuth()
  const [records, setRecords] = useState<Attendance[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<Attendance['status']>('presente')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () =>
    supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false })
      .then(({ data }) => setRecords((data as Attendance[]) ?? []))
  useEffect(() => { load() }, [studentId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    await supabase.from('attendance').insert({
      student_id: studentId,
      attendance_date: date,
      status,
      recorded_by: session.user.id,
      origin: 'profissional',
      notes: notes || null,
    })
    setSaving(false)
    setNotes('')
    load()
  }

  const total = records.length
  const presentes = records.filter((r) => r.status === 'presente').length
  const ausentes = records.filter((r) => r.status === 'ausente').length
  const freq = total ? Math.round((presentes / total) * 100) : 0
  const last30 = records.filter((r) => Date.now() - new Date(r.attendance_date).getTime() <= 30 * 86400000)
  const thisWeek = records.filter((r) => Date.now() - new Date(r.attendance_date).getTime() <= 7 * 86400000)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">Frequência</p>
          <p className="text-xl font-semibold">{freq}%</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">Presenças</p>
          <p className="text-xl font-semibold text-green-600">{presentes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">Faltas</p>
          <p className="text-xl font-semibold text-red-600">{ausentes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">Últimos 30 dias</p>
          <p className="text-xl font-semibold">{last30.length}</p>
        </div>
      </div>
      <p className="text-xs text-slate-400">Esta semana: {thisWeek.length} registro(s) · Último treino: {records[0] ? new Date(records[0].attendance_date).toLocaleDateString('pt-BR') : '-'}</p>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Registrar presença</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Data">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Attendance['status'])}>
              <option value="presente">Presente</option>
              <option value="ausente">Ausente</option>
              <option value="cancelado">Cancelado</option>
              <option value="reposicao">Reposição</option>
            </select>
          </Field>
          <Field label="Observações">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <button disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Registrar'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {records.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum registro de presença ainda.</p>}
        {records.map((r) => (
          <div key={r.id} className="p-3 text-sm flex justify-between">
            <span>{new Date(r.attendance_date).toLocaleDateString('pt-BR')}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                r.status === 'presente' ? 'bg-green-50 text-green-700' : r.status === 'ausente' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {r.status}
            </span>
            <span className="text-slate-400 text-xs">{r.origin === 'aluno' ? 'registrado pelo aluno' : 'registrado pelo profissional'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ================= TESTES FUNCIONAIS =================
const TEST_TYPES = [
  { id: 'chair_stand_30s', label: 'Sentar e Levantar (30s)' },
  { id: 'grip_strength', label: 'Preensão Manual (Dinamometria)' },
  { id: 'unipedal_stance', label: 'Equilíbrio Unipodal' },
  { id: 'tug', label: 'Timed Up and Go (TUG)' },
] as const

const CHAIR_STAND_REFERENCE = [
  { range: '60-64 anos', h: '14-19', m: '12-17' },
  { range: '65-69 anos', h: '12-18', m: '11-16' },
  { range: '70-74 anos', h: '12-17', m: '10-15' },
  { range: '75+ anos', h: '11-17', m: '9-15' },
]

export function TestesFuncionaisTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [testType, setTestType] = useState<(typeof TEST_TYPES)[number]['id']>('chair_stand_30s')
  const [history, setHistory] = useState<FunctionalTestResult[]>([])

  const load = () =>
    supabase
      .from('functional_test_results')
      .select('*')
      .eq('student_id', studentId)
      .eq('test_type', testType)
      .order('test_date', { ascending: false })
      .then(({ data }) => setHistory((data as FunctionalTestResult[]) ?? []))
  useEffect(() => { load() }, [studentId, testType])

  const previous = history[0] ?? null

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap">
        {TEST_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTestType(t.id)}
            className={`flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium min-w-[140px] ${
              testType === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {testType === 'chair_stand_30s' && <ChairStandForm studentId={studentId} ownerId={ownerId} previous={previous} onSaved={load} />}
      {testType === 'grip_strength' && <GripStrengthForm studentId={studentId} ownerId={ownerId} previous={previous} onSaved={load} />}
      {testType === 'unipedal_stance' && <UnipedalStanceForm studentId={studentId} ownerId={ownerId} previous={previous} onSaved={load} />}
      {testType === 'tug' && <TugForm studentId={studentId} ownerId={ownerId} previous={previous} onSaved={load} />}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">Histórico</p>
        <div className="divide-y divide-slate-100">
          {history.length === 0 && <p className="text-sm text-slate-500 py-2">Nenhum teste registrado ainda.</p>}
          {history.map((h) => (
            <div key={h.id} className="py-2 text-sm flex justify-between">
              <span>{new Date(h.test_date).toLocaleDateString('pt-BR')}</span>
              <span className="text-slate-500">
                {h.primary_result ?? '-'} {h.primary_unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ComparisonNote({ previous, current, higherIsBetter = true }: { previous: number | null; current: number | null; higherIsBetter?: boolean }) {
  if (previous === null || current === null) return null
  const diff = current - previous
  const pct = previous !== 0 ? (diff / previous) * 100 : 0
  const improved = higherIsBetter ? diff > 0 : diff < 0
  return (
    <p className={`text-xs rounded-lg px-3 py-2 ${improved ? 'bg-green-50 text-green-700' : diff === 0 ? 'bg-slate-50 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>
      Anterior: {previous} → Atual: {current} · Diferença: {diff > 0 ? '+' : ''}
      {diff.toFixed(1)} ({pct > 0 ? '+' : ''}
      {pct.toFixed(1)}%) — {improved ? 'evolução' : diff === 0 ? 'sem mudança' : 'atenção: piora em relação à avaliação anterior'}
    </p>
  )
}

function ChairStandForm({ studentId, ownerId, previous, onSaved }: { studentId: string; ownerId: string; previous: FunctionalTestResult | null; onSaved: () => void }) {
  const [reps, setReps] = useState('')
  const [usedArms, setUsedArms] = useState(false)
  const [neededSupport, setNeededSupport] = useState(false)
  const [interrupted, setInterrupted] = useState(false)
  const [symptoms, setSymptoms] = useState('')
  const [pse, setPse] = useState('')
  const [dyspnea, setDyspnea] = useState('')
  const [hrPre, setHrPre] = useState('')
  const [hrPost, setHrPost] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('functional_test_results').insert({
      student_id: studentId,
      owner_id: ownerId,
      test_type: 'chair_stand_30s',
      primary_result: reps ? Number(reps) : null,
      primary_unit: 'repetições',
      parameters: { usedArms, neededSupport, interrupted, symptoms, pse, dyspnea, hrPre, hrPost },
      notes: notes || null,
    })
    setSaving(false)
    setReps('')
    setNotes('')
    onSaved()
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-800">🪑 Teste de Sentar e Levantar da Cadeira — 30 segundos</p>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Repetições completas em 30s">
          <input className="input" type="number" value={reps} onChange={(e) => setReps(e.target.value)} required />
        </Field>
        <Field label="PSE ao final (0-10)">
          <input className="input" type="number" min={0} max={10} value={pse} onChange={(e) => setPse(e.target.value)} />
        </Field>
        <Field label="Dispneia ao final">
          <input className="input" value={dyspnea} onChange={(e) => setDyspnea(e.target.value)} />
        </Field>
        <Field label="FC pré">
          <input className="input" type="number" value={hrPre} onChange={(e) => setHrPre(e.target.value)} />
        </Field>
        <Field label="FC pós">
          <input className="input" type="number" value={hrPost} onChange={(e) => setHrPost(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={usedArms} onChange={(e) => setUsedArms(e.target.checked)} /> Usou os braços
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={neededSupport} onChange={(e) => setNeededSupport(e.target.checked)} /> Precisou de apoio
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={interrupted} onChange={(e) => setInterrupted(e.target.checked)} /> Teste interrompido
        </label>
      </div>
      <Field label="Sintomas durante o teste">
        <input className="input" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
      </Field>
      <Field label="Observações">
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <ComparisonNote previous={previous?.primary_result ?? null} current={reps ? Number(reps) : null} />

      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
        <p className="font-medium text-slate-600 mb-1">Referência — Rikli & Jones, Senior Fitness Test / 30-Second Chair Stand (por faixa etária)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CHAIR_STAND_REFERENCE.map((r) => (
            <div key={r.range}>
              <p className="font-medium">{r.range}</p>
              <p>
                H: {r.h} / M: {r.m}
              </p>
            </div>
          ))}
        </div>
      </div>

      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Salvando...' : 'Salvar Teste'}
      </button>
    </form>
  )
}

function GripStrengthForm({ studentId, ownerId, previous, onSaved }: { studentId: string; ownerId: string; previous: FunctionalTestResult | null; onSaved: () => void }) {
  const [right, setRight] = useState({ t1: '', t2: '', t3: '' })
  const [left, setLeft] = useState({ t1: '', t2: '', t3: '' })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const bestOf = (v: { t1: string; t2: string; t3: string }) => {
    const nums = [v.t1, v.t2, v.t3].filter(Boolean).map(Number)
    return nums.length ? Math.max(...nums) : null
  }
  const bestRight = bestOf(right)
  const bestLeft = bestOf(left)
  const best = bestRight !== null && bestLeft !== null ? Math.max(bestRight, bestLeft) : bestRight ?? bestLeft
  const asymAbs = bestRight !== null && bestLeft !== null ? Math.abs(bestRight - bestLeft) : null
  const asymPct = asymAbs !== null && best ? (asymAbs / Math.max(bestRight!, bestLeft!)) * 100 : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('functional_test_results').insert({
      student_id: studentId,
      owner_id: ownerId,
      test_type: 'grip_strength',
      primary_result: best,
      primary_unit: 'kgf',
      parameters: { right, left, bestRight, bestLeft, asymAbs, asymPct },
      notes: notes || null,
    })
    setSaving(false)
    setNotes('')
    onSaved()
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-800">✊ Força de Preensão Manual — Dinamometria</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-slate-600 mb-2">Direita (kgf)</p>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="T1" value={right.t1} onChange={(e) => setRight({ ...right, t1: e.target.value })} />
            <input className="input" placeholder="T2" value={right.t2} onChange={(e) => setRight({ ...right, t2: e.target.value })} />
            <input className="input" placeholder="T3" value={right.t3} onChange={(e) => setRight({ ...right, t3: e.target.value })} />
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-600 mb-2">Esquerda (kgf)</p>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="T1" value={left.t1} onChange={(e) => setLeft({ ...left, t1: e.target.value })} />
            <input className="input" placeholder="T2" value={left.t2} onChange={(e) => setLeft({ ...left, t2: e.target.value })} />
            <input className="input" placeholder="T3" value={left.t3} onChange={(e) => setLeft({ ...left, t3: e.target.value })} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-slate-50 rounded-lg p-3">
        <div>
          <p className="text-xs text-slate-500">Melhor D</p>
          <p className="font-semibold">{bestRight ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Melhor E</p>
          <p className="font-semibold">{bestLeft ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Assimetria abs.</p>
          <p className="font-semibold">{asymAbs?.toFixed(1) ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Assimetria %</p>
          <p className="font-semibold">{asymPct?.toFixed(1) ?? '—'}%</p>
        </div>
      </div>
      <Field label="Observações">
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <ComparisonNote previous={previous?.primary_result ?? null} current={best} />
      <p className="text-xs text-slate-400">
        Referências: Schlüssel et al. (2008); EWGSOP2. Classificação de sarcopenia não é aplicada automaticamente — cabe ao profissional interpretar conforme o contexto clínico.
      </p>
      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Salvando...' : 'Salvar Teste'}
      </button>
    </form>
  )
}

function UnipedalStanceForm({ studentId, ownerId, previous, onSaved }: { studentId: string; ownerId: string; previous: FunctionalTestResult | null; onSaved: () => void }) {
  const [right, setRight] = useState({ t1: '', t2: '', t3: '' })
  const [left, setLeft] = useState({ t1: '', t2: '', t3: '' })
  const [flags, setFlags] = useState({ armsMoved: false, lostBalance: false, pain: false, dizziness: false, fear: false })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const cap = (n: number) => Math.min(n, 45)
  const bestOf = (v: { t1: string; t2: string; t3: string }) => {
    const nums = [v.t1, v.t2, v.t3].filter(Boolean).map(Number)
    return nums.length ? cap(Math.max(...nums)) : null
  }
  const bestRight = bestOf(right)
  const bestLeft = bestOf(left)
  const best = bestRight !== null && bestLeft !== null ? Math.max(bestRight, bestLeft) : bestRight ?? bestLeft
  const asymAbs = bestRight !== null && bestLeft !== null ? Math.abs(bestRight - bestLeft) : null
  const asymPct = asymAbs !== null && bestRight !== null && bestLeft !== null && Math.max(bestRight, bestLeft) > 0 ? (asymAbs / Math.max(bestRight, bestLeft)) * 100 : null
  const ceiling = best !== null && best >= 45

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('functional_test_results').insert({
      student_id: studentId,
      owner_id: ownerId,
      test_type: 'unipedal_stance',
      primary_result: best,
      primary_unit: 'segundos',
      parameters: { right, left, bestRight, bestLeft, asymAbs, asymPct, ceiling, ...flags },
      notes: notes || null,
    })
    setSaving(false)
    setNotes('')
    onSaved()
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-800">⚖️ Equilíbrio Estático — Apoio Unipodal (olhos abertos, teto de 45s)</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-slate-600 mb-2">Perna direita (s)</p>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="T1" value={right.t1} onChange={(e) => setRight({ ...right, t1: e.target.value })} />
            <input className="input" placeholder="T2" value={right.t2} onChange={(e) => setRight({ ...right, t2: e.target.value })} />
            <input className="input" placeholder="T3" value={right.t3} onChange={(e) => setRight({ ...right, t3: e.target.value })} />
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-600 mb-2">Perna esquerda (s)</p>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="T1" value={left.t1} onChange={(e) => setLeft({ ...left, t1: e.target.value })} />
            <input className="input" placeholder="T2" value={left.t2} onChange={(e) => setLeft({ ...left, t2: e.target.value })} />
            <input className="input" placeholder="T3" value={left.t3} onChange={(e) => setLeft({ ...left, t3: e.target.value })} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {(
          [
            ['armsMoved', 'Alteração excessiva dos braços'],
            ['lostBalance', 'Perda de equilíbrio'],
            ['pain', 'Dor'],
            ['dizziness', 'Tontura'],
            ['fear', 'Medo/insegurança'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1">
            <input type="checkbox" checked={flags[key]} onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })} />
            {label}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-slate-50 rounded-lg p-3">
        <div>
          <p className="text-xs text-slate-500">Melhor D</p>
          <p className="font-semibold">{bestRight ?? '—'}s</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Melhor E</p>
          <p className="font-semibold">{bestLeft ?? '—'}s</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Assimetria</p>
          <p className="font-semibold">
            {asymAbs?.toFixed(1) ?? '—'}s ({asymPct?.toFixed(0) ?? '—'}%)
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Teto (45s)</p>
          <p className="font-semibold">{ceiling ? 'Atingido' : 'Não atingiu'}</p>
        </div>
      </div>
      <Field label="Observações">
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <ComparisonNote previous={previous?.primary_result ?? null} current={best} />
      <p className="text-xs text-slate-400">Referência: Springer BA, Marin R, Cyhan T, Roberts H, Gill NW. Normative Values for the Unipedal Stance Test with Eyes Open and Closed. Journal of Geriatric Physical Therapy. 2007;30(1):8-15.</p>
      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Salvando...' : 'Salvar Teste'}
      </button>
    </form>
  )
}

function TugForm({ studentId, ownerId, previous, onSaved }: { studentId: string; ownerId: string; previous: FunctionalTestResult | null; onSaved: () => void }) {
  const [t1, setT1] = useState('')
  const [t2, setT2] = useState('')
  const [assistiveDevice, setAssistiveDevice] = useState(false)
  const [armSupport, setArmSupport] = useState(false)
  const [instability, setInstability] = useState(false)
  const [lostBalance, setLostBalance] = useState(false)
  const [symptoms, setSymptoms] = useState('')
  const [pse, setPse] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const best = [t1, t2].filter(Boolean).map(Number).length ? Math.min(...[t1, t2].filter(Boolean).map(Number)) : null

  const interpretation =
    best === null
      ? null
      : best < 10
        ? { text: 'Normal', tone: 'ok' as const }
        : best <= 14
          ? { text: 'Risco moderado', tone: 'amarelo' as const }
          : { text: 'Alto risco de queda', tone: 'vermelho' as const }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('functional_test_results').insert({
      student_id: studentId,
      owner_id: ownerId,
      test_type: 'tug',
      primary_result: best,
      primary_unit: 'segundos',
      parameters: { t1, t2, assistiveDevice, armSupport, instability, lostBalance, symptoms, pse },
      notes: notes || null,
    })
    setSaving(false)
    setT1('')
    setT2('')
    setNotes('')
    onSaved()
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-800">🚶 Timed Up and Go (TUG)</p>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Tentativa 1 (s)">
          <input className="input" type="number" step="0.1" value={t1} onChange={(e) => setT1(e.target.value)} />
        </Field>
        <Field label="Tentativa 2 (s)">
          <input className="input" type="number" step="0.1" value={t2} onChange={(e) => setT2(e.target.value)} />
        </Field>
        <Field label="Melhor tempo">
          <input className="input bg-slate-50" disabled value={best ?? '—'} />
        </Field>
        <Field label="PSE">
          <input className="input" type="number" min={0} max={10} value={pse} onChange={(e) => setPse(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {(
          [
            [assistiveDevice, setAssistiveDevice, 'Uso de dispositivo auxiliar'],
            [armSupport, setArmSupport, 'Apoio dos braços'],
            [instability, setInstability, 'Instabilidade'],
            [lostBalance, setLostBalance, 'Perda de equilíbrio'],
          ] as const
        ).map(([val, setter, label], i) => (
          <label key={i} className="flex items-center gap-1">
            <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)} />
            {label}
          </label>
        ))}
      </div>
      <Field label="Sintomas">
        <input className="input" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
      </Field>
      <Field label="Observações">
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {interpretation && (
        <p
          className={`text-xs rounded-lg px-3 py-2 ${
            interpretation.tone === 'ok' ? 'bg-green-50 text-green-700' : interpretation.tone === 'amarelo' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {interpretation.text} — a interpretação deve considerar idade, população, protocolo e contexto clínico; não é um diagnóstico automático.
        </p>
      )}

      <ComparisonNote previous={previous?.primary_result ?? null} current={best} higherIsBetter={false} />
      <p className="text-xs text-slate-400">Referência: CDC STEADI / literatura científica específica do TUG.</p>

      <button disabled={saving} className="btn-primary w-full">
        {saving ? 'Salvando...' : 'Salvar Teste'}
      </button>
    </form>
  )
}
