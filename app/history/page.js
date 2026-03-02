'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/context/AudioContext'
import { useAuth } from '@/context/AuthContext'
import styles from './history.module.css'

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { playSongAtIndex, setPlaylist, currentSong, isPlaying, togglePlay } = useAudio()

  useEffect(() => { if (user) loadHistory() }, [user])

  async function loadHistory() {
    const { data } = await supabase
      .from('play_history')
      .select('id, played_at, songs(*)')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(50)
    if (data) setHistory(data.filter(h => h.songs))
    setLoading(false)
  }

  function formatTime(ts) {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>🕐 Recently Played</h1>
        <p className={styles.sub}>{history.length} entries</p>
      </div>

      {loading ? (
        <div className={styles.list}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={styles.skelRow}>
              <div className={styles.skelThumb} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className={styles.skelLine} style={{ width: '60%' }} />
                <div className={styles.skelLine} style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className={styles.empty}>
          <p style={{ fontSize: '40px', marginBottom: 8 }}>🎵</p>
          <p>Nothing played yet. Start listening!</p>
        </div>
      ) : (
        <div className={styles.list}>
          {history.map((entry, i) => {
            const song = entry.songs
            const isActive = currentSong?.id === song.id
            return (
              <div key={entry.id}
                className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
                onClick={() => {
                  const songs = history.map(h => h.songs).filter(Boolean)
                  setPlaylist(songs)
                  if (isActive) togglePlay()
                  else playSongAtIndex(i)
                }}>
                <span className={styles.rowNum}>{i + 1}</span>
                <div className={styles.rowThumbWrap}>
                  <img src={song.thumbnail_url} alt="" className={styles.rowThumb} />
                  {isActive && isPlaying && (
                    <div className={styles.rowPlayingOverlay}>
                      <div className={styles.miniWave}>
                        {[1,2,3].map(j => <div key={j} className={styles.miniWaveBar} style={{ animationDelay: `${j * 0.15}s` }} />)}
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.rowInfo}>
                  <p className={`${styles.rowTitle} ${isActive ? styles.rowTitleActive : ''}`}>{song.title}</p>
                  <p className={styles.rowArtist}>{song.artist}</p>
                </div>
                <div className={styles.rowMeta}>
                  <span className={styles.rowTime}>{formatTime(entry.played_at)}</span>
                  {song.play_count > 0 && (
                    <span className={styles.rowPlays}>{song.play_count} plays</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}