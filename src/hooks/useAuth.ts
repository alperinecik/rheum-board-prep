import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { login, register, logout } from '../lib/auth'
import type { User } from '../types'

function sessionToUser(authUser: any): User {
  return {
    id: authUser.id,
    username: authUser.user_metadata?.username ?? 'user',
    created_at: authUser.created_at,
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? sessionToUser(session.user) : null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? sessionToUser(session.user) : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = useCallback(async (username: string, pin: string) => {
    setLoading(true)
    setError(null)
    try {
      const u = await login(username, pin)
      setUser(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRegister = useCallback(async (username: string, pin: string) => {
    setLoading(true)
    setError(null)
    try {
      const u = await register(username, pin)
      setUser(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    setUser(null)
  }, [])

  return { user, loading, error, login: handleLogin, register: handleRegister, logout: handleLogout }
}
