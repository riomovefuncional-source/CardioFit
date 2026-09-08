import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import type { Student } from '../types'

export default function Students() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('*')
      .order('full_name', { ascending: true })
    setStudents(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!session?.user.id) return
    setSaving(true)
    const { error } = await supabase
      .from('students')
      .insert({ full_name: name, owner_id: session.user.id })
    setSaving(false)
    if (!error) {
      setName('')
      setShowForm(false)
      load()
    }
  }

  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Alunos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-[#731919] text-white px-4 py-2 text-sm font-medium hover:bg-[#731919]"
        >
          {showForm ? 'Cancelar' : '+ Novo aluno'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-3">
          <input
            type="text"
            required
            placeholder="Nome completo do aluno"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C89116]/100"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#731919] text-white px-4 py-2 text-sm font-medium hover:bg-[#731919] disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}

      <input
        type="text"
        placeholder="Buscar aluno..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C89116]/100"
      />

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhum aluno cadastrado ainda.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {filtered.map((s) => (
            <Link
              key={s.id}
              to={`/alunos/${s.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{s.full_name}</p>
                <p className="text-xs text-slate-500">
                  Desde {new Date(s.entry_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  s.status === 'ativo'
                    ? 'bg-emerald-50 text-emerald-700'
                    : s.status === 'pausado'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
