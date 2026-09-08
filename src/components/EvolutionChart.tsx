import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend } from 'recharts'
import { supabase } from '../lib/supabaseClient'

type WeightPoint = { date: string; weight: number | null; bodyFat: number | null }
type SelfWeightPoint = { date: string; selfWeight: number }
type LoadPoint = { date: string; load: number | null }

export default function EvolutionChart({ studentId }: { studentId: string }) {
  const [weightData, setWeightData] = useState<WeightPoint[]>([])
  const [selfWeightData, setSelfWeightData] = useState<SelfWeightPoint[]>([])
  const [loadData, setLoadData] = useState<LoadPoint[]>([])
  const [radarData, setRadarData] = useState<{ metric: string; inicial: number; atual: number }[]>([])

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
      .from('student_weight_logs')
      .select('logged_at, weight_kg')
      .eq('student_id', studentId)
      .order('logged_at', { ascending: true })
      .then(({ data }) => {
        setSelfWeightData((data ?? []).map((d) => ({ date: new Date(d.logged_at).toLocaleDateString('pt-BR'), selfWeight: d.weight_kg })))
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

    // Comparativo inicial x atual — melhor resultado de cada tipo de teste funcional (primeiro vs mais recente)
    supabase
      .from('functional_test_results')
      .select('test_type, test_date, primary_result')
      .eq('student_id', studentId)
      .order('test_date', { ascending: true })
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const byType: Record<string, { primary_result: number | null }[]> = {}
        data.forEach((r) => {
          byType[r.test_type] = byType[r.test_type] ?? []
          byType[r.test_type].push(r)
        })
        const labelMap: Record<string, string> = {
          chair_stand_30s: 'Força (M.I.)',
          grip_strength: 'Força (Preensão)',
          unipedal_stance: 'Equilíbrio',
          tug: 'Mobilidade (TUG)',
        }
        const rows = Object.entries(byType)
          .filter(([type]) => labelMap[type])
          .map(([type, arr]) => ({
            metric: labelMap[type],
            inicial: arr[0]?.primary_result ?? 0,
            atual: arr[arr.length - 1]?.primary_result ?? 0,
          }))
        setRadarData(rows)
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

      {selfWeightData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-medium text-slate-700 mb-3">Peso auto-registrado pelo aluno</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={selfWeightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="selfWeight" stroke="#C89116" name="Peso (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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

      {radarData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-medium text-slate-700 mb-3">Comparativo Inicial × Atual (testes funcionais)</p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <Radar name="Inicial" dataKey="inicial" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
              <Radar name="Atual" dataKey="atual" stroke="#0d9488" fill="#0d9488" fillOpacity={0.3} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
