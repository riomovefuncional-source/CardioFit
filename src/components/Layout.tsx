import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const nav = [
  { to: '/', label: '🏠 Painel', end: true },
  { to: '/alunos', label: '👥 Alunos' },
  { to: '/financeiro', label: '💰 Financeiro' },
  { to: '/presenca', label: '📅 Presença' },
  { to: '/avaliacoes', label: '📋 Avaliação' },
  { to: '/alertas', label: '🔔 Alertas' },
  { to: '/configuracoes', label: '⚙️ Gestão' },
]

export default function Layout() {
  const { signOut, session } = useAuth()

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 shrink-0 flex flex-col text-white" style={{ background: 'linear-gradient(180deg, #731919 0%, #4a1010 100%)' }}>
        <div className="px-5 py-5 border-b border-white/10">
          <span className="text-lg font-bold tracking-wide">CARDIOFIT</span>
          {session?.user.email && (
            <p className="text-xs text-white/60 mt-1 truncate">
              Olá, {session.user.email.split('@')[0]}
            </p>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
              style={({ isActive }) => (isActive ? { boxShadow: 'inset 3px 0 0 #C89116' } : {})}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <button onClick={() => signOut()} className="w-full text-left rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white">
            🚪 Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
