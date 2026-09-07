import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import StudentProfile from './pages/StudentProfile'
import Financeiro from './pages/Financeiro'
import Configuracoes from './pages/Configuracoes'
import AlunoApp from './pages/AlunoApp'
import PresencaGlobal from './pages/PresencaGlobal'
import AvaliacaoGlobal from './pages/AvaliacaoGlobal'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Carregando...</div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Routed() {
  const { session, loading, linkedStudentId } = useAuth()

  if (!loading && session && linkedStudentId) {
    // Usuário logado é um aluno vinculado — área simplificada, sem acesso ao painel profissional.
    return <AlunoApp studentId={linkedStudentId} />
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/alunos" element={<Students />} />
        <Route path="/alunos/:id" element={<StudentProfile />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/presenca" element={<PresencaGlobal />} />
        <Route path="/avaliacoes" element={<AvaliacaoGlobal />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </HashRouter>
  )
}
