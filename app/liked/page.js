'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/context/AudioContext'
import { useAuth } from '@/context/AuthContext'
import styles from './liked.module.css'

export default function LikedPage() {
  const [songs, setSongs]   = useState([])
  const [loading, setLoading] = useState(true)
  const { user }            = useAuth()
  const { playSongAtIndex, setPlaylist, currentSong, isPlaying, togglePlay } = useAudio()

  useEffect(() => { if (user) loadLiked() }, [user])

  async function loadLiked() {
    // Join liked_songs → songs
    const { data } = await supabase
      .from('liked_songs')
      .select('song_id, songs(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      const songList = data.map(row => row.songs).filter(Boolean)
      setSongs(songList)
      setPlaylist(songList)
    }
    setLoading(false)
  }

  async function handleUnlike(e, song) {
    e.stopPropagation()
    await supabase.from('liked_songs')
      .delete()
      .eq('user_id', user.id)
      .eq('song_id', song.id)
    setSongs(prev => prev.filter(s => s.id !== song.id))
  }

  function playAll() {
    if (songs.length > 0) { setPlaylist(songs); playSongAtIndex(0) }
  }

  const fmt = s => (!s || s <= 0)
    ? ''
    : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>❤️ Liked Songs</h1>
          <p className={styles.sub}>{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
        </div>
        {songs.length > 0 && (
          <button className={styles.playAllBtn} onClick={playAll}>▶ Play All</button>
        )}
      </div>

      {loading ? (
        <div className={styles.list}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.skelRow}>
              <div className={styles.skelThumb} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className={styles.skelLine} style={{ width: '60%' }} />
                <div className={styles.skelLine} style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className={styles.empty}>
          <p style={{ fontSize: '40px', marginBottom: 8 }}>💔</p>
          <p>No liked songs yet. Tap the heart on any song!</p>
        </div>
      ) : (
        <div className={styles.list}>
          {songs.map((song, i) => {
            const isActive = currentSong?.id === song.id
            return (
              <div key={song.id}
                className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
                onClick={() => {
                  if (isActive) togglePlay()
                  else { setPlaylist(songs); playSongAtIndex(i) }
                }}>
                <span className={styles.rowNum}>{i + 1}</span>
                <img src={song.thumbnail_url} alt="" className={styles.rowThumb} />
                <div className={styles.rowInfo}>
                  <p className={`${styles.rowTitle} ${isActive ? styles.rowTitleActive : ''}`}>{song.title}</p>
                  <p className={styles.rowArtist}>{song.artist}</p>
                </div>
                {song.duration_seconds > 0 && (
                  <span className={styles.rowDuration}>{fmt(song.duration_seconds)}</span>
                )}
                <button
                  onClick={e => handleUnlike(e, song)}
                  className={styles.unlikeBtn}
                  title="Remove from liked">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4466" stroke="#ff4466" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}