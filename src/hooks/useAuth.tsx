import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type Role = 'admin' | 'professional'

type AuthContextType = {
  session: Session | null
  loading: boolean
  role: Role | null
  linkedStudentId: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  role: null,
  linkedStudentId: null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<Role | null>(null)
  const [linkedStudentId, setLinkedStudentId] = useState<string | null>(null)

  const loadProfileContext = async (userId: string) => {
    const [{ data: profile }, { data: student }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
      supabase.from('students').select('id').eq('user_id', userId).maybeSingle(),
    ])
    setRole((profile?.role as Role) ?? null)
    setLinkedStudentId(student?.id ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user.id) await loadProfileContext(data.session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user.id) loadProfileContext(newSession.user.id)
      else {
        setRole(null)
        setLinkedStudentId(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, role, linkedStudentId, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
