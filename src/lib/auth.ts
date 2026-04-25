import { supabase } from './supabase'
import type { User } from '../types'

function toUser(authUser: { id: string; user_metadata: Record<string, string>; created_at: string }): User {
  return {
    id: authUser.id,
    username: authUser.user_metadata?.username ?? 'user',
    created_at: authUser.created_at,
  }
}

export async function login(username: string, pin: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${username.toLowerCase().trim()}@rheum.app`,
    password: pin.trim(),
  })
  if (error || !data.user) throw new Error('Invalid username or PIN')
  return toUser(data.user)
}

export async function register(username: string, pin: string): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email: `${username.toLowerCase().trim()}@rheum.app`,
    password: pin.trim(),
    options: { data: { username: username.toLowerCase().trim() } },
  })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Could not create account')
  return toUser(data.user)
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}
