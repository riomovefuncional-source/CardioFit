import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CardioTest } from '../types'

// ---------------- CARDIO (Teste Ergométrico) ----------------
const CARDIO_SUBTABS = ['Teste Erg.', 'Prescrição', 'Inteligente', 'Exames'] as const
type CardioSubTab = (typeof CARDIO_SUBTABS)[number]

const emptyTest = {
  test_date: new Date().toISOString().slice(0, 10),
  protocol: 'Bruce',
  total_time_minutes: '',
  borg_max: '',
  hr_rest: '',
  hr_peak: '',
  sbp_rest: '',
  sbp_peak: '',
  met_max: '',
  vo2_peak: '',
  hr_ischemia: '',
  hr_angina: '',
  hr_arrhythmia: '',
  hr_limitation: '',
  stop_reason: '',
}

export function CardioTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [sub, setSub] = useState<CardioSubTab>('Teste Erg.')
  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap">
        {CARDIO_SUBTABS.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium min-w-[90px] ${
              sub === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {sub === 'Teste Erg.' ? (
        <TesteErgometrico studentId={studentId} ownerId={ownerId} />
      ) : (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-5">
          "{sub}" ainda não foi implementado nesta rodada — só o Teste Ergométrico foi detalhado o suficiente na referência para construir de verdade. Me diga o que essa aba deve conter e eu implemento.
        </p>
      )}
    </div>
  )
}

function TesteErgometrico({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [form, setForm] = useState(emptyTest)
  const [history, setHistory] = useState<CardioTest[]>([])
  const [saving, setSaving] = useState(false)

  const load = () =>
    supabase
      .from('cardio_tests')
      .select('*')
      .eq('student_id', studentId)
      .order('test_date', { ascending: false })
      .then(({ data }) => setHistory((data as CardioTest[]) ?? []))

  useEffect(() => {
    load()
  }, [studentId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const num = (v: string) => (v ? Number(v) : null)
    await supabase.from('cardio_tests').insert({
      student_id: studentId,
      owner_id: ownerId,
      test_date: form.test_date,
      protocol: form.protocol,
      total_time_minutes: num(form.total_time_minutes),
      borg_max: num(form.borg_max),
      hr_rest: num(form.hr_rest),
      hr_peak: num(form.hr_peak),
      sbp_rest: num(form.sbp_rest),
      sbp_peak: num(form.sbp_peak),
      met_max: num(form.met_max),
      vo2_peak: num(form.vo2_peak),
      hr_ischemia: num(form.hr_ischemia),
      hr_angina: num(form.hr_angina),
      hr_arrhythmia: num(form.hr_arrhythmia),
      hr_limitation: num(form.hr_limitation),
      stop_reason: form.stop_reason || null,
    })
    setSaving(false)
    setForm(emptyTest)
    load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-800">Teste Ergométrico</p>
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Data">
            <input type="date" className="input" value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })} />
          </Field>
          <Field label="Protocolo">
            <select className="input" value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
              {['Bruce', 'Naughton', 'Ramp', 'Balke', 'Cornell', 'Outro'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Tempo Total (min)">
            <input className="input" type="number" step="0.1" value={form.total_time_minutes} onChange={(e) => setForm({ ...form, total_time_minutes: e.target.value })} />
          </Field>
          <Field label="Borg Máximo (0-10)">
            <input className="input" type="number" min={0} max={10} value={form.borg_max} onChange={(e) => setForm({ ...form, borg_max: e.target.value })} />
          </Field>
        </div>

        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide pt-2">Parâmetros Fisiológicos</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="FC Repouso (bpm)">
            <input className="input" type="number" value={form.hr_rest} onChange={(e) => setForm({ ...form, hr_rest: e.target.value })} />
          </Field>
          <Field label="FC Pico (bpm)">
            <input className="input" type="number" value={form.hr_peak} onChange={(e) => setForm({ ...form, hr_peak: e.target.value })} />
          </Field>
          <Field label="PAS Repouso (mmHg)">
            <input className="input" type="number" value={form.sbp_rest} onChange={(e) => setForm({ ...form, sbp_rest: e.target.value })} />
          </Field>
          <Field label="PAS Pico (mmHg)">
            <input className="input" type="number" value={form.sbp_peak} onChange={(e) => setForm({ ...form, sbp_peak: e.target.value })} />
          </Field>
          <Field label="MET Máximo">
            <input className="input" type="number" step="0.1" value={form.met_max} onChange={(e) => setForm({ ...form, met_max: e.target.value })} />
          </Field>
          <Field label="VO2 Pico (ml/kg/min)">
            <input className="input" type="number" step="0.1" value={form.vo2_peak} onChange={(e) => setForm({ ...form, vo2_peak: e.target.value })} />
          </Field>
        </div>

        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide pt-2">FC de Eventos (bpm)</p>
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Isquemia">
            <input className="input" type="number" value={form.hr_ischemia} onChange={(e) => setForm({ ...form, hr_ischemia: e.target.value })} />
          </Field>
          <Field label="Angina">
            <input className="input" type="number" value={form.hr_angina} onChange={(e) => setForm({ ...form, hr_angina: e.target.value })} />
          </Field>
          <Field label="Arritmia">
            <input className="input" type="number" value={form.hr_arrhythmia} onChange={(e) => setForm({ ...form, hr_arrhythmia: e.target.value })} />
          </Field>
          <Field label="Limitação">
            <input className="input" type="number" value={form.hr_limitation} onChange={(e) => setForm({ ...form, hr_limitation: e.target.value })} />
          </Field>
        </div>

        <Field label="Motivo da Interrupção">
          <textarea className="input" rows={2} placeholder="Ex: Fadiga, dispneia, dor..." value={form.stop_reason} onChange={(e) => setForm({ ...form, stop_reason: e.target.value })} />
        </Field>

        <button disabled={saving} className="btn-primary w-full">
          {saving ? 'Salvando...' : 'Salvar Teste'}
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">Histórico de Testes</p>
        <div className="divide-y divide-slate-100">
          {history.length === 0 && <p className="text-sm text-slate-500 py-2">Nenhum teste registrado.</p>}
          {history.map((t) => (
            <div key={t.id} className="py-2 text-sm flex flex-wrap justify-between gap-2">
              <span>{new Date(t.test_date).toLocaleDateString('pt-BR')}</span>
              <span className="text-slate-500">
                FC: {t.hr_rest ?? '-'}→{t.hr_peak ?? '-'} bpm · VO2: {t.vo2_peak ?? '-'} · MET: {t.met_max ?? '-'}
              </span>
              <span className="text-slate-400">{t.protocol}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------- PERIODIZAÇÃO ----------------
const MODELS = [
  { id: 'linear', name: 'Linear', desc: 'Progressão gradual e constante de carga a cada semana' },
  { id: 'ondulatoria', name: 'Ondulatória', desc: 'Volume e intensidade variam a cada sessão/semana' },
  { id: 'bissemanal', name: 'Bissemanal', desc: 'Dois microciclos por semana com ênfases diferentes' },
] as const

function epley1RM(load: number, reps: number) {
  if (!load || !reps) return null
  return Math.round(load * (1 + reps / 30) * 10) / 10
}

const PERIOD_TABLES: Record<string, { period: string; sets: number; reps: string; intensity: number; pse: string; focus?: string }[]> = {
  linear: [
    { period: '1', sets: 2, reps: '8-10', intensity: 60, pse: '4-5' },
    { period: '2', sets: 2, reps: '8-10', intensity: 65, pse: '5' },
    { period: '3', sets: 2, reps: '6-8', intensity: 70, pse: '5-6' },
    { period: '4', sets: 2, reps: '6-8', intensity: 75, pse: '6' },
  ],
  ondulatoria: [
    { period: 'Dia 1', sets: 2, reps: '8-10', intensity: 60, pse: '4-5', focus: 'Volume' },
    { period: 'Dia 2', sets: 2, reps: '6-8', intensity: 70, pse: '5-6', focus: 'Intensidade' },
    { period: 'Dia 3', sets: 2, reps: '10-12', intensity: 55, pse: '4', focus: 'Resistência' },
  ],
  bissemanal: [
    { period: 'S1-S2', sets: 2, reps: '8-10', intensity: 55, pse: '3-4' },
    { period: 'S3-S4', sets: 2, reps: '8-10', intensity: 62, pse: '4-5' },
    { period: 'S5-S6', sets: 2, reps: '6-8', intensity: 68, pse: '5' },
    { period: 'S7-S8', sets: 2, reps: '6-8', intensity: 72, pse: '5-6' },
  ],
}

export function PeriodizacaoTab({ studentId: _studentId }: { studentId: string }) {
  const [model, setModel] = useState<(typeof MODELS)[number]['id']>('linear')
  const [calcLoad, setCalcLoad] = useState('')
  const [calcReps, setCalcReps] = useState('')
  const [pse, setPse] = useState('')
  const [hrMax, setHrMax] = useState('')
  const [sbp, setSbp] = useState('')
  const [dbp, setDbp] = useState('')

  const oneRM = epley1RM(Number(calcLoad), Number(calcReps))
  const activeModel = MODELS.find((m) => m.id === model)!

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-800 mb-3">Modelo de Periodização</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`text-left rounded-lg border p-3 text-sm ${
                model === m.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">{activeModel.desc}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-800 mb-3">Calculadora de Carga</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Carga (kg)">
            <input className="input" type="number" placeholder="Ex: 20" value={calcLoad} onChange={(e) => setCalcLoad(e.target.value)} />
          </Field>
          <Field label="Reps realizadas">
            <input className="input" type="number" placeholder="10" value={calcReps} onChange={(e) => setCalcReps(e.target.value)} />
          </Field>
          <Field label="1RM Estimado (Epley)">
            <input className="input bg-slate-50" disabled value={oneRM ?? '—'} />
          </Field>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
        <p className="text-sm font-semibold text-slate-800 mb-3">Tabela — {activeModel.name}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 text-xs">
              <th className="pb-2">Período</th>
              <th>Séries</th>
              <th>Reps</th>
              <th>Intensidade</th>
              <th>PSE alvo</th>
              <th>Carga alvo</th>
              {model === 'ondulatoria' && <th>Foco</th>}
            </tr>
          </thead>
          <tbody>
            {PERIOD_TABLES[model].map((row) => (
              <tr key={row.period} className="border-t border-slate-100">
                <td className="py-2">{row.period}</td>
                <td>{row.sets}</td>
                <td>{row.reps}</td>
                <td>
                  <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">{row.intensity}%</span>
                </td>
                <td>{row.pse}</td>
                <td>{oneRM ? Math.round((oneRM * row.intensity) / 100) : '—'}</td>
                {model === 'ondulatoria' && <td className="text-xs text-slate-400">{row.focus ?? '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-800 mb-3">Distribuição da Sessão</p>
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="PSE">
            <input className="input" placeholder="0-10" value={pse} onChange={(e) => setPse(e.target.value)} />
          </Field>
          <Field label="FC Máx (bpm)">
            <input className="input" value={hrMax} onChange={(e) => setHrMax(e.target.value)} />
          </Field>
          <Field label="PAS Final (mmHg)">
            <input className="input" placeholder="Ex: 130" value={sbp} onChange={(e) => setSbp(e.target.value)} />
          </Field>
          <Field label="PAD Final (mmHg)">
            <input className="input" placeholder="Ex: 85" value={dbp} onChange={(e) => setDbp(e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Volume total estimado, intensidade máxima recomendada e PSE médio dependem do histórico de sessões — ligar a essa tabela é o próximo passo natural (já temos os dados em workout_sessions).
        </p>
      </div>
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
