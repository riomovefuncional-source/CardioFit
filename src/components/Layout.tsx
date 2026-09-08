import { useState } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Overlay mobile */}
      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Topbar mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30 text-white" style={{ background: '#731919' }}>
        <button onClick={() => setMobileOpen(true)} aria-label="Abrir menu" className="text-xl leading-none px-1">
          ☰
        </button>
        <span className="font-bold tracking-wide">CARDIOFIT</span>
        <div className="w-6" />
      </header>

      <aside
        className={`w-64 shrink-0 flex flex-col text-white fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ background: 'linear-gradient(180deg, #731919 0%, #4a1010 100%)' }}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold tracking-wide">CARDIOFIT</span>
            {session?.user.email && <p className="text-xs text-white/60 mt-1 truncate">Olá, {session.user.email.split('@')[0]}</p>}
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-white/70 text-xl leading-none px-1" aria-label="Fechar menu">
            ×
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
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
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  )
}
