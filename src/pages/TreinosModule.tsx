import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { WorkoutPlan, WorkoutExercise } from '../types'

// ---- Utilitários portados do app de referência (cardioUtils.parseReps / calculateVolumeByGroup) ----
function parseReps(repsStr: string | null): number {
  if (!repsStr) return 0
  const str = String(repsStr).trim()
  const range = str.match(/(\d+)\s*[-–a]+\s*(\d+)/i)
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2)
  const num = str.match(/(\d+)/)
  return num ? Number(num[1]) : 0
}

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Bíceps', 'Tríceps', 'Deltoide Lateral', 'Deltoide Posterior', 'Deltoide Frontal',
  'Trapézio', 'Abdômen', 'Glúteos', 'Quadríceps', 'Posterior de Coxa', 'Panturrilhas', 'Outros',
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-500 text-xs">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const TREINO_SUBTABS_EXTRA = 'Volume'

export function TreinosTab({ studentId, ownerId }: { studentId: string; ownerId: string }) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [activePlanId, setActivePlanId] = useState<string | 'volume' | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const loadPlans = () =>
    supabase
      .from('workout_plans')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setPlans(data ?? [])
        if (!activePlanId && data && data.length > 0) setActivePlanId(data[0].id)
      })

  useEffect(() => {
    loadPlans()
  }, [studentId])

  const createPlan = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const { data } = await supabase
      .from('workout_plans')
      .insert({ student_id: studentId, owner_id: ownerId, name: newName.trim() })
      .select()
      .single()
    setCreating(false)
    setNewName('')
    if (data) setActivePlanId(data.id)
    loadPlans()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlanId(p.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                activePlanId === p.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => setActivePlanId('volume')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              activePlanId === 'volume' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {TREINO_SUBTABS_EXTRA}
          </button>
        </div>
        <form onSubmit={createPlan} className="flex gap-2">
          <input className="input" placeholder="Nome (ex: Treino D)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button disabled={creating} className="btn-primary whitespace-nowrap">
            + Novo
          </button>
        </form>
      </div>

      {activePlanId === 'volume' && <VolumeByGroupTable plans={plans} />}
      {activePlanId && activePlanId !== 'volume' && (
        <PlanEditor key={activePlanId} plan={plans.find((p) => p.id === activePlanId)!} ownerId={ownerId} onPlanChanged={loadPlans} />
      )}
      {plans.length === 0 && <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-5">Nenhum treino criado ainda.</p>}
    </div>
  )
}

function PlanEditor({ plan, ownerId, onPlanChanged }: { plan: WorkoutPlan; ownerId: string; onPlanChanged: () => void }) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [editingMeta, setEditingMeta] = useState(false)
  const [name, setName] = useState(plan.name)
  const [objective, setObjective] = useState(plan.objective ?? '')

  const load = () =>
    supabase
      .from('workout_exercises')
      .select('*')
      .eq('workout_plan_id', plan.id)
      .order('order_index', { ascending: true })
      .then(({ data }) => setExercises((data as WorkoutExercise[]) ?? []))

  useEffect(() => {
    load()
  }, [plan.id])

  const saveMeta = async () => {
    await supabase.from('workout_plans').update({ name, objective }).eq('id', plan.id)
    setEditingMeta(false)
    onPlanChanged()
  }

  const toggleActive = async () => {
    await supabase.from('workout_plans').update({ active: !plan.active }).eq('id', plan.id)
    onPlanChanged()
  }

  const duplicate = async () => {
    const { data: newPlan } = await supabase
      .from('workout_plans')
      .insert({ student_id: plan.student_id, owner_id: ownerId, name: `${plan.name} (cópia)`, objective: plan.objective, phase: plan.phase })
      .select()
      .single()
    if (newPlan) {
      const copies = exercises.map((ex) => ({
        workout_plan_id: newPlan.id,
        owner_id: ownerId,
        exercise_name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        sets: ex.sets,
        reps: ex.reps,
        load_kg: ex.load_kg,
        rest_seconds: ex.rest_seconds,
        target_rpe: ex.target_rpe,
        notes: ex.notes,
        order_index: ex.order_index,
      }))
      if (copies.length) await supabase.from('workout_exercises').insert(copies)
    }
    onPlanChanged()
  }

  const removePlan = async () => {
    if (!confirm(`Excluir "${plan.name}" e todos os seus exercícios?`)) return
    await supabase.from('workout_plans').delete().eq('id', plan.id)
    onPlanChanged()
  }

  const addExercise = async () => {
    await supabase.from('workout_exercises').insert({
      workout_plan_id: plan.id,
      owner_id: ownerId,
      exercise_name: 'Novo exercício',
      order_index: exercises.length,
    })
    load()
  }

  const updateExercise = async (id: string, patch: Partial<WorkoutExercise>) => {
    setExercises((exs) => exs.map((e) => (e.id === id ? { ...e, ...patch } : e)))
    await supabase.from('workout_exercises').update(patch).eq('id', id)
  }

  const removeExercise = async (id: string) => {
    await supabase.from('workout_exercises').delete().eq('id', id)
    load()
  }

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= exercises.length) return
    const a = exercises[index]
    const b = exercises[target]
    const next = [...exercises]
    next[index] = b
    next[target] = a
    setExercises(next)
    await supabase.from('workout_exercises').update({ order_index: target }).eq('id', a.id)
    await supabase.from('workout_exercises').update({ order_index: index }).eq('id', b.id)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        {!editingMeta ? (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-slate-800">{plan.name}</p>
              {plan.objective && <p className="text-sm text-slate-500">{plan.objective}</p>}
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${plan.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {plan.active ? 'ativo' : 'inativo'}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              <button onClick={() => setEditingMeta(true)} className="text-[#731919] font-medium">
                Editar
              </button>
              <button onClick={duplicate} className="text-slate-500">
                Duplicar
              </button>
              <button onClick={toggleActive} className="text-slate-500">
                {plan.active ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={removePlan} className="text-red-600">
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Field label="Nome / Classificação">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Descrição / Objetivo">
              <textarea className="input" rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <button onClick={saveMeta} className="btn-primary">
                Salvar
              </button>
              <button onClick={() => setEditingMeta(false)} className="text-sm text-slate-500">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Exercícios</p>
        <button onClick={addExercise} className="btn-primary text-sm">
          + Adicionar
        </button>
      </div>

      <div className="space-y-3">
        {exercises.length === 0 && <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-5">Nenhum exercício ainda.</p>}
        {exercises.map((ex, i) => (
          <div key={ex.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <span className="bg-red-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{String(i + 1).padStart(2, '0')}</span>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30 text-xs">
                  ▲
                </button>
                <button onClick={() => move(i, 1)} disabled={i === exercises.length - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30 text-xs">
                  ▼
                </button>
              </div>
              <div className="flex-1 grid sm:grid-cols-2 gap-3">
                <Field label="Nome do Exercício">
                  <input className="input" value={ex.exercise_name} onChange={(e) => updateExercise(ex.id, { exercise_name: e.target.value })} />
                </Field>
                <Field label="Grupamento Muscular">
                  <select className="input" value={ex.muscle_group ?? ''} onChange={(e) => updateExercise(ex.id, { muscle_group: e.target.value })}>
                    <option value="">Selecionar</option>
                    {MUSCLE_GROUPS.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Método (cadência/formato)">
                  <input className="input" placeholder="Ex: Cadência 3-1-2" value={ex.cadence ?? ''} onChange={(e) => updateExercise(ex.id, { cadence: e.target.value })} />
                </Field>
                <Field label="Descrição">
                  <input className="input" value={(ex as any).description ?? ''} onChange={(e) => updateExercise(ex.id, { description: e.target.value } as any)} />
                </Field>
                <Field label="Séries">
                  <input className="input" type="number" value={ex.sets ?? ''} onChange={(e) => updateExercise(ex.id, { sets: e.target.value ? Number(e.target.value) : null })} />
                </Field>
                <Field label="Reps">
                  <input className="input" placeholder="Ex: 8-12" value={ex.reps ?? ''} onChange={(e) => updateExercise(ex.id, { reps: e.target.value })} />
                </Field>
                <Field label="Carga">
                  <input className="input" type="number" step="0.5" value={ex.load_kg ?? ''} onChange={(e) => updateExercise(ex.id, { load_kg: e.target.value ? Number(e.target.value) : null })} />
                </Field>
                <Field label="Descanso (s)">
                  <input className="input" type="number" value={ex.rest_seconds ?? ''} onChange={(e) => updateExercise(ex.id, { rest_seconds: e.target.value ? Number(e.target.value) : null })} />
                </Field>
                <Field label="Observações">
                  <input className="input" value={ex.notes ?? ''} onChange={(e) => updateExercise(ex.id, { notes: e.target.value })} />
                </Field>
              </div>
              <button onClick={() => removeExercise(ex.id)} className="text-red-500 text-lg leading-none">
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Volume por grupamento muscular (portado de VolumeByGroupTable.jsx) ----
function VolumeByGroupTable({ plans }: { plans: WorkoutPlan[] }) {
  const [rows, setRows] = useState<{ group: string; exercises: number; sets: number; reps: number; volume: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const activeIds = plans.filter((p) => p.active).map((p) => p.id)
    if (activeIds.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    supabase
      .from('workout_exercises')
      .select('*')
      .in('workout_plan_id', activeIds)
      .then(({ data }) => {
        const groups: Record<string, { exercises: number; sets: number; reps: number; volume: number }> = {}
        ;(data ?? []).forEach((ex: WorkoutExercise) => {
          const mg = ex.muscle_group || 'Outros'
          if (!groups[mg]) groups[mg] = { exercises: 0, sets: 0, reps: 0, volume: 0 }
          const sets = Number(ex.sets) || 0
          const reps = parseReps(ex.reps)
          groups[mg].sets += sets
          groups[mg].reps += sets * reps
          groups[mg].volume += sets * reps
          groups[mg].exercises += 1
        })
        setRows(
          Object.entries(groups)
            .map(([group, v]) => ({ group, ...v }))
            .sort((a, b) => b.volume - a.volume),
        )
        setLoading(false)
      })
  }, [plans])

  const maxVolume = Math.max(...rows.map((r) => r.volume), 1)
  const totalSets = rows.reduce((s, r) => s + r.sets, 0)
  const totalVolume = rows.reduce((s, r) => s + r.volume, 0)

  if (loading) return <p className="text-sm text-slate-500">Carregando...</p>

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-sm font-semibold text-slate-800">Controle de Volume por Grupamento Muscular</p>
      <p className="text-xs text-slate-400 mb-4">Volume = Séries × Repetições. Calculado automaticamente a partir dos treinos ativos.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">Nenhum exercício com grupamento muscular cadastrado nos treinos ativos.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400 px-1 pb-1 border-b border-slate-100">
            <div className="col-span-4">Grupamento</div>
            <div className="col-span-2 text-center">Exercícios</div>
            <div className="col-span-2 text-center">Séries</div>
            <div className="col-span-2 text-center">Reps Total</div>
            <div className="col-span-2 text-center">Volume</div>
          </div>
          {rows.map((r) => (
            <div key={r.group} className="grid grid-cols-12 gap-2 items-center px-1 py-1.5">
              <div className="col-span-4">
                <span className="text-sm font-medium">{r.group}</span>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${(r.volume / maxVolume) * 100}%` }} />
                </div>
              </div>
              <div className="col-span-2 text-center text-sm">{r.exercises}</div>
              <div className="col-span-2 text-center text-sm font-medium">{r.sets}</div>
              <div className="col-span-2 text-center text-sm">{r.reps}</div>
              <div className="col-span-2 text-center text-sm font-bold text-red-700">{r.volume}</div>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-2 items-center px-1 py-2 mt-2 border-t-2 border-slate-200 font-bold text-sm">
            <div className="col-span-4">TOTAL</div>
            <div className="col-span-2 text-center">{rows.length}</div>
            <div className="col-span-2 text-center">{totalSets}</div>
            <div className="col-span-2 text-center">—</div>
            <div className="col-span-2 text-center text-red-700">{totalVolume}</div>
          </div>
        </div>
      )}
    </div>
  )
}
