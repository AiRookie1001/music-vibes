'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import styles from './profile.module.css'

export default function ProfilePage() {
  const router = useRouter()
  const { user, displayName, avatarUrl, initials, email, updateDisplayName, signOut } = useAuth()

  const [stats, setStats] = useState({ songs: 0, playlists: 0, liked: 0, totalPlays: 0 })
  const [topSongs, setTopSongs] = useState([])
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    if (user) { loadStats(); setNameInput(displayName) }
  }, [user])

  async function loadStats() {
    const [
      { count: songs },
      { count: playlists },
      { count: liked },
    ] = await Promise.all([
      supabase.from('songs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('playlists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('songs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_liked', true),
    ])

    // Sum total plays
    const { data: playCounts } = await supabase
      .from('songs').select('play_count').eq('user_id', user.id)
    const totalPlays = playCounts?.reduce((sum, s) => sum + (s.play_count || 0), 0) ?? 0

    setStats({ songs: songs ?? 0, playlists: playlists ?? 0, liked: liked ?? 0, totalPlays })

    // Top 5 most played
    const { data: top } = await supabase
      .from('songs').select('id, title, artist, thumbnail_url, play_count')
      .eq('user_id', user.id)
      .order('play_count', { ascending: false })
      .limit(5)
    if (top) setTopSongs(top.filter(s => s.play_count > 0))
  }

  async function handleSaveName() {
    if (!nameInput.trim() || nameInput.trim() === displayName) {
      setEditingName(false); return
    }
    setSaving(true)
    const { error } = await updateDisplayName(nameInput.trim())
    setSaving(false)
    if (error) { setSaveMsg('Failed to save'); setTimeout(() => setSaveMsg(''), 3000) }
    else { setSaveMsg('Saved!'); setEditingName(false); setTimeout(() => setSaveMsg(''), 2000) }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  if (!user) return (
    <div style={{ padding: 40, color: 'var(--text-3)' }}>Loading...</div>
  )

  const provider = user.app_metadata?.provider ?? 'email'
  const providerLabel = { google: 'Google', github: 'GitHub', email: 'Email / Password' }[provider] ?? provider
  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className={styles.page}>

      {/* ── Hero / Avatar ── */}
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <div className={styles.avatarWrap}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" className={styles.avatarImg} />
              : <div className={styles.avatarFallback}>{initials}</div>
            }
            <div className={styles.providerBadge} title={`Signed in with ${providerLabel}`}>
              {provider === 'google' && (
                <svg width="12" height="12" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {provider === 'github' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              )}
              {provider === 'email' && <span style={{ fontSize: 9 }}>✉️</span>}
            </div>
          </div>

          {/* Name editing */}
          {editingName ? (
            <div className={styles.nameEdit}>
              <input
                className={styles.nameInput}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                autoFocus
                maxLength={40}
              />
              <button className={styles.saveBtn} onClick={handleSaveName} disabled={saving}>
                {saving ? '...' : 'Save'}
              </button>
              <button className={styles.cancelBtn} onClick={() => setEditingName(false)}>Cancel</button>
            </div>
          ) : (
            <div className={styles.nameRow}>
              <h1 className={styles.displayName}>{displayName}</h1>
              <button className={styles.editBtn} onClick={() => setEditingName(true)} title="Edit name">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          )}

          {saveMsg && <p className={styles.saveMsg}>{saveMsg}</p>}

          <p className={styles.emailText}>{email}</p>
          <p className={styles.joinText}>Member since {joinDate} · via {providerLabel}</p>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Songs', value: stats.songs, icon: '🎵', href: '/' },
          { label: 'Playlists', value: stats.playlists, icon: '📂', href: '/playlists' },
          { label: 'Liked', value: stats.liked, icon: '❤️', href: '/liked' },
          { label: 'Total Plays', value: stats.totalPlays, icon: '▶', href: '/history' },
        ].map(({ label, value, icon, href }) => (
          <a key={label} href={href} className={styles.statCard}>
            <span className={styles.statIcon}>{icon}</span>
            <span className={styles.statValue}>{value.toLocaleString()}</span>
            <span className={styles.statLabel}>{label}</span>
          </a>
        ))}
      </div>

      {/* ── Top played ── */}
      {topSongs.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Most Played</h2>
          <div className={styles.topList}>
            {topSongs.map((song, i) => (
              <div key={song.id} className={styles.topRow}>
                <span className={styles.topNum}>{i + 1}</span>
                <img src={song.thumbnail_url} alt="" className={styles.topThumb} />
                <div className={styles.topInfo}>
                  <p className={styles.topTitle}>{song.title}</p>
                  <p className={styles.topArtist}>{song.artist}</p>
                </div>
                <span className={styles.topPlays}>{song.play_count} plays</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sign out ── */}
      <div className={styles.footer}>
        <button className={styles.signOutBtn} onClick={handleSignOut}>Sign Out</button>
      </div>
    </div>
  )
}