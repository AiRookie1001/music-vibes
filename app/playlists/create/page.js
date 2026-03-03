'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import styles from './CreatePlaylist.module.css'

export default function CreatePlaylistPage() {
  const router = useRouter()
  const { user, displayName } = useAuth()

  const [title, setTitle]     = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError]     = useState('')

  // Redirect guests
  if (!user) {
    router.push('/login?next=/playlists/create')
    return null
  }

  async function handleCreate() {
    if (!title.trim()) { setError('Please enter a playlist name'); return }
    setCreating(true)
    setError('')

    const { data, error: err } = await supabase
      .from('playlists')
      .insert({
        title:        title.trim(),
        user_id:      user.id,
        is_public:    isPublic,
        creator_name: displayName,
      })
      .select()
      .single()

    if (err) { setError(err.message); setCreating(false); return }
    router.push(`/playlists/${data.id}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Back link */}
        <button className={styles.backBtn} onClick={() => router.push('/playlists')}>
          ← Back to Playlists
        </button>

        <h1 className={styles.title}>Create a Playlist</h1>
        <p className={styles.sub}>Give your playlist a name and set its visibility.</p>

        {/* Cover art placeholder */}
        <div className={styles.coverPreview}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </div>

        {/* Playlist name */}
        <label className={styles.label}>PLAYLIST NAME <span className={styles.required}>*</span></label>
        <input
          autoFocus
          type="text"
          placeholder="e.g. Late Night Vibes"
          value={title}
          onChange={e => { setTitle(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className={styles.input}
        />

        {/* Public / Private toggle */}
        <label className={styles.label} style={{ marginTop: 24 }}>VISIBILITY</label>
        <div className={styles.toggleWrap}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${isPublic ? styles.toggleBtnActive : ''}`}
            onClick={() => setIsPublic(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Public
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${!isPublic ? styles.toggleBtnActive : ''}`}
            onClick={() => setIsPublic(false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Private
          </button>
        </div>

        {/* Hint text */}
        <p className={styles.hint}>
          {isPublic
            ? '🌍 Anyone can discover and listen to this playlist.'
            : '🔒 Only you can see this playlist.'}
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.createBtn}
          onClick={handleCreate}
          disabled={!title.trim() || creating}
        >
          {creating ? 'Creating…' : 'Create Playlist'}
        </button>

      </div>
    </div>
  )
}