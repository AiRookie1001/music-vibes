'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)   // row from profiles table
  const [loading, setLoading] = useState(true)

  // Load profile row from DB for a given user
  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null
      setUser(u)
      if (u) loadProfile(u.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadProfile(u.id)
      else { setProfile(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Mark loading done once we have both user + profile (or no user)
  useEffect(() => {
    if (!user || profile !== null) setLoading(false)
  }, [user, profile])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateDisplayName(name) {
    if (!user) return { error: new Error('Not logged in') }
    // Update auth metadata
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: name } })
    if (error) return { error }
    // Update profiles table
    await supabase.from('profiles').update({ display_name: name }).eq('id', user.id)
    setUser(data.user)
    setProfile(prev => prev ? { ...prev, display_name: name } : prev)
    return { error: null }
  }

  // Derived values — profile table takes priority over auth metadata
  const displayName =
    profile?.display_name
    ?? user?.user_metadata?.full_name
    ?? user?.user_metadata?.name
    ?? user?.email?.split('@')[0]
    ?? 'Anonymous'

  const avatarUrl =
    profile?.avatar_url
    ?? user?.user_metadata?.avatar_url
    ?? null

  const email    = user?.email ?? ''
  const initials = displayName.slice(0, 2).toUpperCase()
  const isAdmin  = profile?.role === 'admin'
  const role     = profile?.role ?? 'guest'

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signOut,
      updateDisplayName,
      avatarUrl,
      displayName,
      email,
      initials,
      isAdmin,
      role,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}