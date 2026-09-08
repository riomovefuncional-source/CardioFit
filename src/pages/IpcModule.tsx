import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// ---- Sub-aba "IPC": Índice de Prontidão Cardiovascular ----
// Fórmula portada 1:1 do app de referência (IPCModule) — não é uma invenção nova.
const IPC_SYMPTOM_LIST = [
  { value: 'sem_sintomas', label: 'Sem sintomas', score: 25 },
  { value: 'fadiga_leve', label: 'Fadiga leve', score: 22 },
  { value: 'dispneia_leve', label: 'Dispneia leve', score: 18 },
  { value: 'palpitacoes_leves', label: 'Palpitações leves', score: 18 },
  { value: 'tontura', label: 'Tontura', score: 10 },
  { value: 'dispneia_intensa', label: 'Dispneia intensa', score: 5 },
  { value: 'dor_toracica', label: 'Dor torácica', score: 0 },
  { value: 'sincope', label: 'Síncope', score: 0 },
  { value: 'sudorese_fria', label: 'Sudorese fria', score: 0 },
  { value: 'confusao_mental', label: 'Confusão mental', score: 0 },
]
const IPC_SUSPENSION_SYMPTOMS = ['dor_toracica', 'sincope', 'sudorese_fria', 'confusao_mental', 'dispneia_intensa']

function ipcPaScore(pas: number, pad: number): number | null {
  if (!pas || !pad) return null
  if (pas >= 180 || pad >= 110) return 0
  if (pas >= 160 || pad >= 100) return 10
  if (pas >= 140 || pad >= 90) return 20
  if (pas < 90 || pad < 60) return 10
  return 25
}
function ipcFcScore(fc: number): number | null {
  if (!fc) return null
  if (fc < 50) return 15
  if (fc <= 80) return 20
  if (fc <= 90) return 15
  if (fc <= 100) return 10
  return 0
}
function ipcSpo2Score(spo2: number): number | null {
  if (!spo2) return null
  if (spo2 >= 97) return 20
  if (spo2 >= 95) return 18
  if (spo2 >= 93) return 10
  if (spo2 >= 90) return 5
  return 0
}
function ipcSymptomsScore(symptoms: string[]): number {
  if (!symptoms || symptoms.length === 0) return 25
  const scores = symptoms.map((s) => IPC_SYMPTOM_LIST.find((x) => x.value === s)?.score ?? 25)
  return Math.min(...scores)
}
function ipcSleepScore(hours: number): number | null {
  if (!hours) return null
  if (hours >= 8) return 10
  if (hours >= 7) return 8
  if (hours >= 6) return 6
  if (hours >= 5) return 3
  return 0
}
function ipcClassify(score: number) {
  if (score >= 90) return { label: 'Muito Baixo Risco', color: 'text-emerald-600', msg: 'Paciente apto para realizar o treino conforme planejado.' }
  if (score >= 80) return { label: 'Baixo Risco', color: 'text-green-600', msg: 'Treino permitido com monitoramento habitual.' }
  if (score >= 70) return { label: 'Risco Moderado', color: 'text-amber-600', msg: 'Recomenda-se reduzir intensidade ou volume do treino e monitorar sinais clínicos.' }
  if (score >= 50) return { label: 'Risco Elevado', color: 'text-orange-600', msg: 'Treino apenas leve, priorizando exercícios de baixa intensidade e monitoramento contínuo.' }
  return { label: 'Risco Muito Elevado', color: 'text-red-600', msg: 'Treino contraindicado até reavaliação clínica.' }
}

export function IpcTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [form, setForm] = useState({ pas: '', pad: '', fc: '', spo2: '', sleep: '', symptoms: [] as string[] })
  const [history, setHistory] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const load = () =>
    supabase
      .from('cardio_readiness')
      .select('*')
      .eq('student_id', studentId)
      .order('reading_date', { ascending: false })
      .limit(20)
      .then(({ data }) => setHistory(data ?? []))
  useEffect(() => {
    load()
  }, [studentId])

  const toggleSymptom = (v: string) =>
    setForm((f) => ({ ...f, symptoms: f.symptoms.includes(v) ? f.symptoms.filter((x) => x !== v) : [...f.symptoms, v] }))

  const paScore = ipcPaScore(Number(form.pas), Number(form.pad))
  const fcScore = ipcFcScore(Number(form.fc))
  const spo2Score = ipcSpo2Score(Number(form.spo2))
  const symptomsScore = ipcSymptomsScore(form.symptoms)
  const sleepScore = ipcSleepScore(Number(form.sleep))
  const allFilled = paScore !== null && fcScore !== null && spo2Score !== null && sleepScore !== null
  const ipcScore = allFilled ? (paScore! + fcScore! + spo2Score! + symptomsScore + sleepScore!) : null
  const ipcClass = ipcScore !== null ? ipcClassify(ipcScore) : null

  const suspended =
    Number(form.pas) >= 180 ||
    Number(form.pad) >= 110 ||
    (Number(form.spo2) > 0 && Number(form.spo2) < 90) ||
    form.symptoms.some((s) => IPC_SUSPENSION_SYMPTOMS.includes(s))

  const save = async () => {
    if (!allFilled) return
    setSaving(true)
    await supabase.from('cardio_readiness').insert({
      student_id: studentId,
      owner_id: ownerId,
      blood_pressure_systolic: Number(form.pas),
      blood_pressure_diastolic: Number(form.pad),
      resting_hr: Number(form.fc),
      spo2: Number(form.spo2),
      sleep_hours: Number(form.sleep),
      symptoms: form.symptoms,
      pa_score: paScore,
      fc_score: fcScore,
      spo2_score: spo2Score,
      symptoms_score: symptomsScore,
      sleep_score: sleepScore,
      ipc_score: ipcScore,
      classification: suspended ? 'TREINO SUSPENSO' : ipcClass?.label,
      suspended,
    })
    setSaving(false)
    setForm({ pas: '', pad: '', fc: '', spo2: '', sleep: '', symptoms: [] })
    load()
  }

  const scores = history.map((h) => h.ipc_score).filter((s) => s !== null)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const max = scores.length ? Math.max(...scores) : null
  const min = scores.length ? Math.min(...scores) : null

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Pressão Arterial</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" type="number" placeholder="PAS" value={form.pas} onChange={(e) => setForm({ ...form, pas: e.target.value })} />
            <input className="input" type="number" placeholder="PAD" value={form.pad} onChange={(e) => setForm({ ...form, pad: e.target.value })} />
          </div>
          {paScore !== null && <p className="text-xs text-slate-400">Ref: 90-139 / 60-89 — {paScore}/25 pts</p>}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Frequência Cardíaca de repouso</p>
          <input className="input" type="number" placeholder="bpm" value={form.fc} onChange={(e) => setForm({ ...form, fc: e.target.value })} />
          {fcScore !== null && <p className="text-xs text-slate-400">Ref: 50-80 bpm — {fcScore}/20 pts</p>}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Saturação (SpO2)</p>
          <input className="input" type="number" placeholder="%" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} />
          {spo2Score !== null && <p className="text-xs text-slate-400">Ref: 97-100% — {spo2Score}/20 pts</p>}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Sono</p>
          <input className="input" type="number" step="0.5" placeholder="Horas" value={form.sleep} onChange={(e) => setForm({ ...form, sleep: e.target.value })} />
          {sleepScore !== null && <p className="text-xs text-slate-400">Ref: ≥8h — {sleepScore}/10 pts</p>}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">Sintomas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {IPC_SYMPTOM_LIST.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleSymptom(s.value)}
              className={`px-3 py-2 rounded-lg border text-xs text-left ${
                form.symptoms.includes(s.value) ? 'bg-[#731919] text-white border-[#731919]' : 'border-slate-300 text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {form.symptoms.length > 0 && <p className="text-xs text-slate-400 mt-2">Pior sintoma: {symptomsScore}/25 pts</p>}
      </div>

      {allFilled && (
        <div className={`bg-white border-2 rounded-xl p-6 text-center space-y-2 ${suspended ? 'border-red-500' : 'border-[#C89116]/40'}`}>
          {suspended ? (
            <>
              <p className="text-xl font-bold text-red-600">⚠️ TREINO SUSPENSO</p>
              <p className="text-sm text-red-600 max-w-md mx-auto">Encerrar avaliação e orientar encaminhamento médico conforme protocolo institucional.</p>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Índice de Prontidão Cardiovascular</p>
              <p className={`text-5xl font-bold ${ipcClass!.color}`}>
                {ipcScore}
                <span className="text-2xl font-normal text-slate-400">/100</span>
              </p>
              <p className={`font-semibold ${ipcClass!.color}`}>{ipcClass!.label}</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">{ipcClass!.msg}</p>
              <div className="relative h-3 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 overflow-hidden mt-3">
                <div className="absolute top-0 h-full w-0.5 bg-slate-900" style={{ left: `${ipcScore}%` }} />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3 text-xs">
                {[
                  ['PA', paScore, 25],
                  ['FC', fcScore, 20],
                  ['SpO2', spo2Score, 20],
                  ['Sintomas', symptomsScore, 25],
                  ['Sono', sleepScore, 10],
                ].map(([label, v, m]: any) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-2">
                    <p className="text-slate-400">{label}</p>
                    <p className="font-semibold">
                      {v}/{m}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <button onClick={save} disabled={!allFilled || saving} className="btn-primary w-full">
        {saving ? 'Salvando...' : 'Salvar IPC no Histórico'}
      </button>

      {history.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">Média</p>
            <p className="text-lg font-bold text-[#731919]">{avg}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">Maior</p>
            <p className="text-lg font-bold text-emerald-600">{max}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">Menor</p>
            <p className="text-lg font-bold text-red-600">{min}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {history.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum registro de IPC ainda.</p>}
        {history.map((h) => (
          <div key={h.id} className="p-3 text-sm flex justify-between">
            <span>{new Date(h.reading_date).toLocaleDateString('pt-BR')}</span>
            <span className={h.suspended ? 'text-red-600 font-medium' : 'text-slate-600'}>
              {h.suspended ? 'SUSPENSO' : `${h.ipc_score} — ${h.classification}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}