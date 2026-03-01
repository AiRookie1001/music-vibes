'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './CreatePlaylist.module.css'

export default function CreatePlaylist() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [touched, setTouched] = useState(false)

  const hasError = touched && !title.trim()

  const handleCreate = async () => {
    setTouched(true)
    if (!title.trim()) return

    setStatus('loading')

    const { data, error } = await supabase
      .from('playlists')
      .insert({ title: title.trim() })
      .select()
      .single()

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    setStatus('success')
    // Go straight to the new playlist's detail page
    setTimeout(() => router.push(`/playlists/${data.id}`), 800)
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => router.push('/playlists')}>
        ← Back to Playlists
      </button>

      <h1 className={styles.heading}>Create a Playlist</h1>
      <p className={styles.sub}>Give your playlist a name and start adding songs.</p>

      <div className={styles.form}>

        {/* Cover preview — just a nice visual placeholder */}
        <div className={styles.coverPreview}>
          <span className={styles.coverIcon}>🎵</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Playlist Name <span className={styles.req}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Late Night Vibes"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className={`${styles.input} ${hasError ? styles.inputError : ''}`}
            autoFocus
          />
          {hasError && <p className={styles.errorText}>Playlist name is required</p>}
        </div>

        <button
          className={styles.submitBtn}
          onClick={handleCreate}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '⏳ Creating...' :
           status === 'success' ? '✅ Created!' :
           'Create Playlist'}
        </button>

        {status === 'error' && (
          <p className={styles.apiError}>❌ {errorMsg}</p>
        )}
      </div>
    </div>
  )
}