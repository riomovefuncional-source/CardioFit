import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabaseClient'

type WeightPoint = { date: string; weight: number | null; bodyFat: number | null }
type LoadPoint = { date: string; load: number | null }

export default function EvolutionChart({ studentId }: { studentId: string }) {
  const [weightData, setWeightData] = useState<WeightPoint[]>([])
  const [loadData, setLoadData] = useState<LoadPoint[]>([])

  useEffect(() => {
    supabase
      .from('assessments')
      .select('assessment_date, weight_kg, body_fat_pct')
      .eq('student_id', studentId)
      .order('assessment_date', { ascending: true })
      .then(({ data }) => {
        setWeightData(
          (data ?? []).map((d) => ({
            date: new Date(d.assessment_date).toLocaleDateString('pt-BR'),
            weight: d.weight_kg,
            bodyFat: d.body_fat_pct,
          }))
        )
      })

    supabase
      .from('workout_sessions')
      .select('session_date, session_load')
      .eq('student_id', studentId)
      .order('session_date', { ascending: true })
      .then(({ data }) => {
        setLoadData(
          (data ?? []).map((d) => ({
            date: new Date(d.session_date).toLocaleDateString('pt-BR'),
            load: d.session_load,
          }))
        )
      })
  }, [studentId])

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm font-medium text-slate-700 mb-3">Peso e % de gordura</p>
        {weightData.length === 0 ? (
          <p className="text-sm text-slate-500">Sem avaliações registradas ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#0d9488" name="Peso (kg)" />
              <Line type="monotone" dataKey="bodyFat" stroke="#f59e0b" name="% gordura" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-sm font-medium text-slate-700 mb-3">Carga de treino por sessão (duração × PSE)</p>
        {loadData.length === 0 ? (
          <p className="text-sm text-slate-500">Sem sessões registradas ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={loadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="load" stroke="#2563eb" name="Carga" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
