'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './Login.module.css'

// ─────────────────────────────────────────────────────────────
// useSearchParams() requires a Suspense boundary in Next.js 15.
// We split the actual form into LoginForm and wrap it below.
// ─────────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/'

  const [mode, setMode]       = useState('login')  // 'login' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(null)      // null | 'google' | 'github' | 'email'
  const [error, setError]     = useState('')
  const [info, setInfo]       = useState('')

  // ── OAuth ────────────────────────────────────────────────
  async function handleOAuth(provider) {
    setLoading(provider)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    })
    if (error) { setError(error.message); setLoading(null) }
  }

  // ── Email / Password ─────────────────────────────────────
  async function handleEmailAuth() {
    const trimEmail = email.trim()
    const trimPass  = password.trim()

    if (!trimEmail || !trimPass) { setError('Both fields are required'); return }
    if (trimPass.length < 6)     { setError('Password must be at least 6 characters'); return }

    setLoading('email'); setError(''); setInfo('')

    if (mode === 'signup') {
      const { data, error: err } = await supabase.auth.signUp({ email: trimEmail, password: trimPass })
      if (err) { setError(err.message); setLoading(null); return }

      // Email confirmations disabled → session returned immediately
      if (data.session) { router.push(nextPath); return }

      // Email confirmations enabled → show message, switch to login
      setInfo('Account created! Check your email to confirm, then sign in.')
      setMode('login')
      setLoading(null)

    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: trimEmail, password: trimPass })
      if (err) {
        const msg = err.message.toLowerCase()
        setError(
          msg.includes('invalid') || msg.includes('credentials')
            ? 'Incorrect email or password.'
            : err.message
        )
        setLoading(null)
        return
      }
      router.push(nextPath)
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError(''); setInfo('')
  }

  return (
    <div className={styles.card}>

      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="6" cy="18" r="3" stroke="white" strokeWidth="2"/>
            <circle cx="18" cy="16" r="3" stroke="white" strokeWidth="2"/>
          </svg>
        </div>
        <span className={styles.logoText}>vibes</span>
      </div>

      <h1 className={styles.heading}>
        {mode === 'login' ? 'Welcome back' : 'Create account'}
      </h1>
      <p className={styles.sub}>
        {mode === 'login' ? 'Sign in to your music library' : 'Start uploading your music'}
      </p>

      {/* OAuth */}
      <div className={styles.oauthBtns}>
        <button
          className={`${styles.oauthBtn} ${loading === 'google' ? styles.oauthLoading : ''}`}
          onClick={() => handleOAuth('google')}
          disabled={!!loading}
        >
          {loading === 'google' ? <span className={styles.spinner} /> : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>

        <button
          className={`${styles.oauthBtn} ${loading === 'github' ? styles.oauthLoading : ''}`}
          onClick={() => handleOAuth('github')}
          disabled={!!loading}
        >
          {loading === 'github' ? <span className={styles.spinner} /> : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          )}
          Continue with GitHub
        </button>
      </div>

      <div className={styles.divider}><span>or</span></div>

      {/* Email / Password */}
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            className={styles.input}
            disabled={!!loading}
            autoComplete="email"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <input
            type="password"
            placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            className={styles.input}
            disabled={!!loading}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {info  && <p className={styles.successMsg}>{info}</p>}

      <button className={styles.submitBtn} onClick={handleEmailAuth} disabled={!!loading}>
        {loading === 'email' && <span className={styles.spinner} />}
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>

      <p className={styles.switchMode}>
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button className={styles.switchBtn} onClick={switchMode}>
          {mode === 'login' ? 'Sign up free' : 'Sign in'}
        </button>
      </p>

      {mode === 'signup' && (
        <p className={styles.testingHint}>
          No real email needed — any format works for testing.
        </p>
      )}
    </div>
  )
}

// ── Page wrapper — Suspense required for useSearchParams in Next.js 15 ──
export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <Suspense fallback={
        <div className={styles.card} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <span style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading…</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}