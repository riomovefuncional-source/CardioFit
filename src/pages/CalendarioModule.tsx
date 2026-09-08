import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { WorkoutPlan, WorkoutSession } from '../types'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function CalendarioTab({ studentId, ownerId, readOnly = false }: { studentId: string; ownerId: string; readOnly?: boolean }) {
  const [month, setMonth] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [scheduling, setScheduling] = useState(false)

  const load = () => {
    const monthStart = fmtDate(month)
    const nextMonth = fmtDate(new Date(month.getFullYear(), month.getMonth() + 1, 1))
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('student_id', studentId)
      .gte('session_date', monthStart)
      .lt('session_date', nextMonth)
      .then(({ data }) => setSessions((data as WorkoutSession[]) ?? []))
    supabase.from('workout_plans').select('*').eq('student_id', studentId).eq('active', true).then(({ data }) => setPlans(data ?? []))
  }

  useEffect(() => {
    load()
    setSelectedDay(null)
  }, [studentId, month])

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const firstWeekday = month.getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))

  const sessionForDay = (d: Date) => sessions.find((s) => s.session_date === fmtDate(d))

  const countByPlan: Record<string, number> = {}
  sessions.forEach((s) => {
    const p = plans.find((p) => p.id === s.workout_plan_id)
    if (p) countByPlan[p.name] = (countByPlan[p.name] ?? 0) + 1
  })
  const restDays = daysInMonth - sessions.length

  const scheduleWorkout = async (planId: string) => {
    if (!selectedDay) return
    setScheduling(true)
    await supabase.from('workout_sessions').insert({
      student_id: studentId,
      owner_id: ownerId,
      workout_plan_id: planId,
      session_date: fmtDate(selectedDay),
    })
    setScheduling(false)
    setSelectedDay(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {plans.slice(0, 3).map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">{p.name}</p>
            <p className="text-2xl font-bold text-[#731919]">{countByPlan[p.name] ?? 0}x</p>
          </div>
        ))}
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">Descanso</p>
          <p className="text-2xl font-bold text-slate-400">{restDays}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-800 capitalize">
            {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="w-7 h-7 rounded-md hover:bg-slate-100">
              ‹
            </button>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="w-7 h-7 rounded-md hover:bg-slate-100">
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const s = sessionForDay(day)
            const plan = s ? plans.find((p) => p.id === s.workout_plan_id) : null
            const isToday = fmtDate(day) === fmtDate(new Date())
            const isSelected = selectedDay && fmtDate(selectedDay) === fmtDate(day)
            return (
              <button
                key={day.toISOString()}
                onClick={() => !readOnly && setSelectedDay(isSelected ? null : day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs ${
                  isSelected ? 'ring-2 ring-[#731919]' : ''
                } ${isToday ? 'font-bold' : ''} ${plan ? 'bg-[#731919] text-white' : s ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
              >
                <span>{day.getDate()}</span>
                {plan && <span className="text-[9px] font-bold leading-none">{plan.name.slice(0, 6)}</span>}
              </button>
            )
          })}
        </div>

        {selectedDay && (
          <div className="mt-4 p-3 bg-slate-50 rounded-xl">
            <p className="text-sm font-medium mb-2">{selectedDay.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
            {sessionForDay(selectedDay) ? (
              <p className="text-sm text-slate-600">
                {plans.find((p) => p.id === sessionForDay(selectedDay)!.workout_plan_id)?.name ?? 'Sessão'} · PSE: {sessionForDay(selectedDay)!.rpe ?? '—'}
              </p>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-2">Agendar treino:</p>
                <div className="flex gap-2 flex-wrap">
                  {plans.map((p) => (
                    <button key={p.id} disabled={scheduling} onClick={() => scheduleWorkout(p.id)} className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-100">
                      + {p.name}
                    </button>
                  ))}
                  {plans.length === 0 && <p className="text-xs text-slate-400">Nenhum treino ativo para agendar.</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
