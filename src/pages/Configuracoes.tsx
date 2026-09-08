import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

type Rule = {
  id: string
  name: string
  field_name: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  threshold: number
  unit: string | null
  severity: 'amarelo' | 'vermelho'
  message: string
  recommended_action: string | null
  active: boolean
  version: number
}

const FIELD_OPTIONS = [
  { value: 'systolic_bp', label: 'Pressão arterial sistólica', unit: 'mmHg' },
  { value: 'diastolic_bp', label: 'Pressão arterial diastólica', unit: 'mmHg' },
  { value: 'heart_rate', label: 'Frequência cardíaca', unit: 'bpm' },
  { value: 'spo2', label: 'SpO2', unit: '%' },
  { value: 'sleep_quality', label: 'Qualidade do sono (1-5)', unit: '' },
  { value: 'energy_level', label: 'Nível de energia (1-5)', unit: '' },
  { value: 'pain_level', label: 'Nível de dor (0-10)', unit: '' },
  { value: 'fatigue_level', label: 'Nível de fadiga (1-5)', unit: '' },
]

const OPERATOR_LABELS: Record<string, string> = {
  gt: 'maior que',
  gte: 'maior ou igual a',
  lt: 'menor que',
  lte: 'menor ou igual a',
  eq: 'igual a',
}

const emptyForm = {
  name: '',
  field_name: 'spo2',
  operator: 'lt' as Rule['operator'],
  threshold: '',
  severity: 'vermelho' as Rule['severity'],
  message: '',
  recommended_action: '',
}

export default function Configuracoes() {
  const { session } = useAuth()
  const ownerId = session?.user.id
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clinical_safety_rules')
      .select('*')
      .order('severity', { ascending: false })
      .order('name')
    setRules((data as Rule[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (rule: Rule) => {
    setForm({
      name: rule.name,
      field_name: rule.field_name,
      operator: rule.operator,
      threshold: String(rule.threshold),
      severity: rule.severity,
      message: rule.message,
      recommended_action: rule.recommended_action ?? '',
    })
    setEditingId(rule.id)
    setShowForm(true)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!ownerId) return
    if (!form.name || !form.threshold || !form.message) return
    setSaving(true)
    const payload = {
      name: form.name,
      field_name: form.field_name,
      operator: form.operator,
      threshold: Number(form.threshold),
      unit: FIELD_OPTIONS.find((f) => f.value === form.field_name)?.unit || null,
      severity: form.severity,
      message: form.message,
      recommended_action: form.recommended_action || null,
    }
    if (editingId) {
      const current = rules.find((r) => r.id === editingId)
      await supabase
        .from('clinical_safety_rules')
        .update({ ...payload, version: (current?.version ?? 1) + 1 })
        .eq('id', editingId)
    } else {
      await supabase.from('clinical_safety_rules').insert({ ...payload, owner_id: ownerId, active: true })
    }
    setSaving(false)
    resetForm()
    load()
  }

  const toggleActive = async (rule: Rule) => {
    await supabase.from('clinical_safety_rules').update({ active: !rule.active }).eq('id', rule.id)
    load()
  }

  const seedDefaults = async () => {
    if (!ownerId) return
    setSeeding(true)
    const defaults = [
      {
        name: 'SpO2 crítica',
        field_name: 'spo2',
        operator: 'lt',
        threshold: 92,
        unit: '%',
        severity: 'vermelho',
        message: 'SpO2 abaixo de 92%. Interromper a sessão e avaliar imediatamente.',
        recommended_action: 'Não iniciar/interromper o treino e realizar avaliação conforme protocolo profissional.',
      },
      {
        name: 'SpO2 em atenção',
        field_name: 'spo2',
        operator: 'lt',
        threshold: 95,
        unit: '%',
        severity: 'amarelo',
        message: 'SpO2 abaixo de 95%. Reavaliar antes de prosseguir.',
        recommended_action: 'Reavaliar sinais vitais e considerar ajuste de intensidade.',
      },
      {
        name: 'PA sistólica muito elevada',
        field_name: 'systolic_bp',
        operator: 'gte',
        threshold: 180,
        unit: 'mmHg',
        severity: 'vermelho',
        message: 'Pressão arterial sistólica ≥ 180 mmHg. Interromper ou não iniciar a sessão.',
        recommended_action: 'Não iniciar/interromper o treino e realizar avaliação conforme protocolo profissional.',
      },
      {
        name: 'FC de repouso muito elevada',
        field_name: 'heart_rate',
        operator: 'gt',
        threshold: 120,
        unit: 'bpm',
        severity: 'amarelo',
        message: 'Frequência cardíaca de repouso acima de 120 bpm. Atenção antes de iniciar.',
        recommended_action: 'Reavaliar antes de iniciar a sessão.',
      },
      {
        name: 'Dor relevante relatada',
        field_name: 'pain_level',
        operator: 'gte',
        threshold: 7,
        unit: '',
        severity: 'vermelho',
        message: 'Nível de dor relatado ≥ 7/10.',
        recommended_action: 'Não iniciar/interromper e realizar avaliação apropriada.',
      },
    ]
    await supabase.from('clinical_safety_rules').insert(defaults.map((d) => ({ ...d, owner_id: ownerId, active: true })))
    setSeeding(false)
    load()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-500">
            Regras de alerta de segurança — apoio à decisão do profissional, não substituem avaliação clínica ou médica.
          </p>
        </div>
        <div className="flex gap-2">
          {rules.length === 0 && !loading && (
            <button
              onClick={seedDefaults}
              disabled={seeding}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {seeding ? 'Criando...' : 'Usar regras sugeridas'}
            </button>
          )}
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="rounded-lg bg-[#731919] px-3 py-2 text-sm font-medium text-white hover:bg-[#731919]"
          >
            + Nova regra
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-medium text-slate-800">{editingId ? 'Editar regra' : 'Nova regra'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Nome da regra</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: SpO2 crítica"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Indicador monitorado</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.field_name}
                onChange={(e) => setForm({ ...form, field_name: e.target.value })}
              >
                {FIELD_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Condição</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value as Rule['operator'] })}
              >
                {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Valor limite</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Severidade</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as Rule['severity'] })}
              >
                <option value="amarelo">Amarelo — atenção/reavaliação</option>
                <option value="vermelho">Vermelho — interromper/não iniciar</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Mensagem exibida no alerta</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Ex.: SpO2 abaixo de 92%. Interromper a sessão e avaliar imediatamente."
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Ação recomendada (opcional)</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.recommended_action}
              onChange={(e) => setForm({ ...form, recommended_action: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#731919] px-4 py-2 text-sm font-medium text-white hover:bg-[#731919]"
            >
              {saving ? 'Salvando...' : 'Salvar regra'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Regra</th>
              <th className="text-left px-4 py-2">Condição</th>
              <th className="text-left px-4 py-2">Severidade</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && rules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma regra cadastrada ainda — sem regras, nenhum alerta é gerado.
                </td>
              </tr>
            )}
            {rules.map((rule) => {
              const field = FIELD_OPTIONS.find((f) => f.value === rule.field_name)
              return (
                <tr key={rule.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{rule.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {field?.label ?? rule.field_name} {OPERATOR_LABELS[rule.operator]} {rule.threshold}
                    {rule.unit ? ` ${rule.unit}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        rule.severity === 'vermelho' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(rule)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        rule.active ? 'bg-[#C89116]/20 text-[#731919]' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {rule.active ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(rule)} className="text-xs font-medium text-[#731919] hover:underline">
                      Editar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
