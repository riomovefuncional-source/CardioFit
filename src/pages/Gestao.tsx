import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import Configuracoes from './Configuracoes'

const ADMIN_ONLY_TABS = ['Professores', 'Permissões', 'Auditoria'] as const
const ALL_TABS = ['Professores', 'Exercícios', 'Permissões', 'Regras', 'Auditoria'] as const
type SubTab = (typeof ALL_TABS)[number]

export default function Gestao() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const visibleTabs = isAdmin ? ALL_TABS : ALL_TABS.filter((t) => !(ADMIN_ONLY_TABS as readonly string[]).includes(t))
  const [tab, setTab] = useState<SubTab>(visibleTabs[0])

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Gestão</h1>
      <p className="text-sm text-slate-500 mb-6">
        {isAdmin ? 'Professores, biblioteca de exercícios, permissões, regras clínicas e auditoria.' : 'Biblioteca de exercícios e regras clínicas dos seus alunos.'}
      </p>

      <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap mb-6 max-w-xl">
        {visibleTabs.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`flex-1 py-1.5 rounded-md text-xs sm:text-sm font-medium min-w-[90px] ${tab === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {tab === 'Professores' && isAdmin && <ProfessoresTab />}
      {tab === 'Exercícios' && <ExerciciosTab />}
      {tab === 'Permissões' && isAdmin && <PermissoesTab />}
      {tab === 'Regras' && <Configuracoes />}
      {tab === 'Auditoria' && isAdmin && <AuditoriaTab />}
    </div>
  )
}

type Professional = {
  id: string
  email: string
  full_name: string
  role: string
  active: boolean
  student_count: number
  last_activity: string | null
}

type AccountRow = {
  id: string
  email: string
  full_name: string
  role: string
  active: boolean
  linked_student_id: string | null
  linked_student_name: string | null
}

function ProfessoresTab() {
  const [rows, setRows] = useState<Professional[]>([])
  const [linkedAccounts, setLinkedAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([supabase.rpc('list_professionals'), supabase.rpc('list_all_accounts')]).then(([profRes, allRes]) => {
      if (profRes.error) setError(profRes.error.message)
      else setRows((profRes.data as Professional[]) ?? [])
      setLinkedAccounts(((allRes.data as AccountRow[]) ?? []).filter((a) => a.linked_student_id))
      setLoading(false)
    })
  }
  useEffect(() => {
    load()
  }, [])

  const toggleActive = async (p: Professional) => {
    const { error } = await supabase.rpc('set_professional_active', { p_user_id: p.id, p_active: !p.active })
    if (!error) load()
  }

  const toggleRole = async (p: Professional) => {
    const nextRole = p.role === 'admin' ? 'professional' : 'admin'
    if (!confirm(`Tornar ${p.full_name} ${nextRole === 'admin' ? 'administrador' : 'professor'}?`)) return
    const { error } = await supabase.rpc('set_professional_role', { p_user_id: p.id, p_role: nextRole })
    if (!error) load()
  }

  const unlink = async (studentId: string) => {
    if (!confirm('Desvincular esta conta do aluno? Ela deixará de conseguir entrar como aluno até ser vinculada de novo.')) return
    await supabase.rpc('unlink_student_account', { p_student_id: studentId })
    load()
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        Não foi possível carregar: {error}. Esta tela só funciona para usuários com papel Admin.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-3">
          Novo professor precisa criar a própria conta na tela de login — não é possível criar login por aqui sem uma chave administrativa do Supabase. Depois de criada a conta, ela aparece automaticamente nesta lista (a não ser que já esteja vinculada a um aluno).
        </div>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {loading && <p className="p-4 text-sm text-slate-500">Carregando...</p>}
          {!loading && rows.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum professor encontrado.</p>}
          {rows.map((p) => (
            <div key={p.id} className="p-3 text-sm flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium">
                  {p.full_name} <span className="text-xs text-slate-400">({p.role === 'admin' ? 'admin' : 'professor'})</span>
                </p>
                <p className="text-xs text-slate-500">{p.email}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{p.student_count} aluno(s)</span>
                <span>{p.last_activity ? `última sessão: ${new Date(p.last_activity).toLocaleDateString('pt-BR')}` : 'sem atividade'}</span>
                <span className={`px-2 py-0.5 rounded-full ${p.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.active ? 'ativo' : 'inativo'}</span>
                <button onClick={() => toggleRole(p)} className="text-slate-600 font-medium">
                  {p.role === 'admin' ? 'Tornar professor' : 'Tornar admin'}
                </button>
                <button onClick={() => toggleActive(p)} className="text-[#731919] font-medium">
                  {p.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800 mb-2">Contas vinculadas como aluno</p>
        <p className="text-xs text-slate-500 mb-2">
          Estas contas criaram login normalmente mas foram vinculadas a um registro de aluno — por isso não aparecem na lista de professores acima.
        </p>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {linkedAccounts.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhuma conta vinculada como aluno ainda.</p>}
          {linkedAccounts.map((a) => (
            <div key={a.id} className="p-3 text-sm flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium">{a.email}</p>
                <p className="text-xs text-slate-500">vinculada ao aluno: {a.linked_student_name}</p>
              </div>
              <button onClick={() => unlink(a.linked_student_id!)} className="text-xs text-red-600 font-medium">
                Desvincular
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

type Exercise = {
  id: string
  name: string
  category: string | null
  modality: string | null
  muscle_group: string | null
  equipment: string | null
  location: string | null
  level: string | null
  objective: string | null
  instructions: string | null
}

const emptyExercise = { name: '', category: '', modality: '', muscle_group: '', equipment: '', location: '', level: '', objective: '', instructions: '' }

function ExerciciosTab() {
  const { session } = useAuth()
  const [items, setItems] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyExercise)
  const [saving, setSaving] = useState(false)

  const load = () => supabase.from('exercises').select('*').order('name').then(({ data }) => setItems((data as Exercise[]) ?? []))
  useEffect(() => {
    load()
  }, [])

  const filtered = items.filter(
    (e) => (locationFilter === 'todos' || e.location === locationFilter) && (search === '' || e.name.toLowerCase().includes(search.toLowerCase())),
  )

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    await supabase.from('exercises').insert({ ...form, owner_id: session.user.id })
    setSaving(false)
    setForm(emptyExercise)
    setShowForm(false)
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Excluir este exercício da biblioteca?')) return
    await supabase.from('exercises').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <input className="input max-w-[220px]" placeholder="Buscar exercício..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input max-w-[160px]" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="todos">Todos os locais</option>
            <option value="academia">Academia</option>
            <option value="casa">Casa</option>
            <option value="ar_livre">Ar livre</option>
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          + Adicionar exercício
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Categoria (força/cardio/mobilidade)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="input" placeholder="Modalidade" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })} />
          <input className="input" placeholder="Grupo muscular" value={form.muscle_group} onChange={(e) => setForm({ ...form, muscle_group: e.target.value })} />
          <input className="input" placeholder="Equipamento" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
          <select className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
            <option value="">Local</option>
            <option value="academia">Academia</option>
            <option value="casa">Casa</option>
            <option value="ar_livre">Ar livre</option>
          </select>
          <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            <option value="">Nível</option>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
          <input className="input" placeholder="Objetivo" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
          <textarea className="input sm:col-span-2" placeholder="Instruções" rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          <button disabled={saving} className="btn-primary sm:col-span-2">
            {saving ? 'Salvando...' : 'Salvar exercício'}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtered.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum exercício na biblioteca ainda.</p>}
        {filtered.map((e) => (
          <div key={e.id} className="p-3 text-sm flex items-center justify-between">
            <div>
              <p className="font-medium">{e.name}</p>
              <p className="text-xs text-slate-500">{[e.category, e.muscle_group, e.equipment, e.location].filter(Boolean).join(' · ')}</p>
            </div>
            <button onClick={() => remove(e.id)} className="text-red-500 text-xs">
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PermissoesTab() {
  const [counts, setCounts] = useState<{ admins: number; professores: number } | null>(null)

  useEffect(() => {
    supabase.rpc('list_professionals').then(({ data }) => {
      if (data) {
        const rows = data as Professional[]
        setCounts({ admins: rows.filter((r) => r.role === 'admin').length, professores: rows.filter((r) => r.role === 'professional').length })
      }
    })
  }, [])

  return (
    <div className="space-y-4">
      {counts && (
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Admins</p>
            <p className="text-2xl font-bold" style={{ color: '#731919' }}>
              {counts.admins}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Professores</p>
            <p className="text-2xl font-bold text-slate-700">{counts.professores}</p>
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="font-semibold text-sm mb-1">Admin</p>
          <p className="text-xs text-slate-500">
            Acesso total: vê todos os alunos de todos os professores, gerencia professores, configura regras e vê a auditoria completa. Aplicado via RLS (bypass de owner_id) — não é só visual.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="font-semibold text-sm mb-1">Professor</p>
          <p className="text-xs text-slate-500">Vê e edita apenas os alunos vinculados ao seu próprio owner_id. Tentar acessar dados de outro professor é bloqueado pelo banco, não só escondido na tela.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="font-semibold text-sm mb-1">Aluno</p>
          <p className="text-xs text-slate-500">
            Login vinculado via students.user_id. Só lê seus próprios dados; não pode alterar avaliações, anamnese ou prescrições feitas pelo profissional. Bloqueado por RLS mesmo trocando o ID na URL.
          </p>
        </div>
      </div>
    </div>
  )
}

type AuditRow = { id: string; entity_table: string; entity_id: string; action: string; old_value: string | null; new_value: string | null; created_at: string }

const ENTITY_LABELS: Record<string, string> = {
  students: 'aluno',
  workout_plans: 'treino',
  workout_exercises: 'exercício',
  assessments: 'avaliação física',
  health_history: 'anamnese',
  medications: 'medicamento',
  workout_sessions: 'sessão de treino',
}

function tryParse(str: string | null) {
  try {
    return str ? JSON.parse(str) : null
  } catch {
    return null
  }
}

function friendlyDescription(r: AuditRow) {
  const label = ENTITY_LABELS[r.entity_table] ?? r.entity_table
  const obj = tryParse(r.new_value) ?? tryParse(r.old_value)
  const name = obj?.full_name ?? obj?.exercise_name ?? obj?.name ?? null

  if (r.action === 'insert') {
    if (r.entity_table === 'students') return `Novo aluno: ${name ?? '(sem nome)'}`
    return `Novo(a) ${label}${name ? `: ${name}` : ''} registrado(a)`
  }
  if (r.action === 'delete') return `${label}${name ? ` (${name})` : ''} excluído(a)`
  return `${label}${name ? ` de ${name}` : ''} atualizado(a)`
}

function diffFields(oldStr: string | null, newStr: string | null) {
  try {
    const oldObj = oldStr ? JSON.parse(oldStr) : {}
    const newObj = newStr ? JSON.parse(newStr) : {}
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
    const diffs: { field: string; before: any; after: any }[] = []
    keys.forEach((k) => {
      if (k === 'updated_at' || k === 'created_at') return
      if (JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k])) diffs.push({ field: k, before: oldObj[k], after: newObj[k] })
    })
    return diffs
  } catch {
    return []
  }
}

function AuditoriaTab() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    supabase
      .from('audit_logs')
      .select('*')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(150)
      .then(({ data }) => {
        setRows((data as AuditRow[]) ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Mudanças relevantes dos últimos 7 dias.</p>
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {loading && <p className="p-4 text-sm text-slate-500">Carregando...</p>}
        {!loading && rows.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhuma mudança nos últimos 7 dias.</p>}
        {rows.map((r) => {
          const diffs = r.action === 'update' ? diffFields(r.old_value, r.new_value) : []
          return (
            <div key={r.id} className="p-3 text-sm">
              <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="w-full flex items-center justify-between text-left">
                <span>{friendlyDescription(r)}</span>
                <span className="text-xs text-slate-400 shrink-0 ml-2">{new Date(r.created_at).toLocaleString('pt-BR')}</span>
              </button>
              {expanded === r.id && (
                <div className="mt-2 text-xs bg-slate-50 rounded-lg p-3 space-y-1">
                  {r.action === 'update' && diffs.length > 0 ? (
                    diffs.map((d) => (
                      <p key={d.field}>
                        <span className="font-medium">{d.field}</span>: <span className="text-red-600">{JSON.stringify(d.before)}</span> → <span className="text-green-600">{JSON.stringify(d.after)}</span>
                      </p>
                    ))
                  ) : (
                    <p className="text-slate-500">{r.action === 'insert' ? 'Registro criado.' : r.action === 'delete' ? 'Registro excluído.' : 'Sem alterações de campo detectadas.'}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
