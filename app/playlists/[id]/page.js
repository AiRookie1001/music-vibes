'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/context/AudioContext'
import styles from './PlaylistDetail.module.css'

export default function PlaylistDetail() {
  const router = useRouter()
  const { id } = useParams()
  const { playSongAtIndex, setPlaylist, currentSong, isPlaying, togglePlay } = useAudio()

  const [playlist, setPlaylistData] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => { if (id) loadPlaylist() }, [id])

  async function loadPlaylist() {
    const { data: pl, error: plErr } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .single()

    if (plErr) { console.error(plErr); setLoading(false); return }
    setPlaylistData(pl)

    const { data: ps, error: psErr } = await supabase
      .from('playlist_songs')
      .select('id, order, songs(*)')
      .eq('playlist_id', id)
      .order('order', { ascending: true })

    if (!psErr && ps) {
      setSongs(ps.map(row => ({ ...row.songs, playlistSongId: row.id, order: row.order })))
    }
    setLoading(false)
  }

  function handlePlayAll() {
    if (songs.length === 0) return
    setPlaylist(songs)
    playSongAtIndex(0)
  }

  function handleSongClick(index) {
    const song = songs[index]
    if (currentSong?.id === song.id) {
      togglePlay()
    } else {
      setPlaylist(songs)
      playSongAtIndex(index)
    }
  }

  async function handleRemoveSong(playlistSongId, e) {
    e.stopPropagation()
    setRemovingId(playlistSongId)
    await supabase.from('playlist_songs').delete().eq('id', playlistSongId)
    setSongs(prev => prev.filter(s => s.playlistSongId !== playlistSongId))
    setRemovingId(null)
  }

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.heroSkeleton} />
      <div className={styles.listSkeleton}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={styles.rowSkeleton} />
        ))}
      </div>
    </div>
  )

  if (!playlist) return (
    <div className={styles.page}>
      <p style={{ color: '#555' }}>Playlist not found.</p>
      <button className={styles.backBtn} onClick={() => router.push('/playlists')}>← Back</button>
    </div>
  )

  const coverSrc = playlist.cover_image || songs[0]?.thumbnail_url || null

  return (
    <div className={styles.page}>

      {/* Hero section */}
      <div className={styles.hero}>
        <div className={styles.heroCover}>
          {coverSrc ? (
            <img src={coverSrc} alt={playlist.title} className={styles.heroCoverImg} />
          ) : (
            <div className={styles.heroCoverPlaceholder}>🎵</div>
          )}
        </div>
        <div className={styles.heroInfo}>
          <p className={styles.heroLabel}>Playlist</p>
          <h1 className={styles.heroTitle}>{playlist.title}</h1>
          <p className={styles.heroMeta}>{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
          <div className={styles.heroActions}>
            <button
              className={styles.playAllBtn}
              onClick={handlePlayAll}
              disabled={songs.length === 0}
            >
              ▶ Play All
            </button>
            <button className={styles.backBtn} onClick={() => router.push('/playlists')}>
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Song list */}
      {songs.length === 0 ? (
        <div className={styles.emptySongs}>
          <p>No songs in this playlist yet.</p>
          <p style={{ color: '#444', fontSize: '13px', marginTop: '6px' }}>
            Go to <a href="/" style={{ color: '#ff5500' }}>Songs</a> and add some using the + button.
          </p>
        </div>
      ) : (
        <div className={styles.songList}>
          {songs.map((song, index) => {
            const isActive = currentSong?.id === song.id
            const isHovered = hoveredId === song.id

            return (
              <div
                key={song.playlistSongId}
                className={`${styles.songRow} ${isActive ? styles.activeRow : ''}`}
                onClick={() => handleSongClick(index)}
                onMouseEnter={() => setHoveredId(song.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className={styles.rowIndex}>
                  {isActive && isPlaying ? <span className={styles.playingDot}>▶</span> : index + 1}
                </div>
                <img src={song.thumbnail_url || ''} alt="" className={styles.rowThumb} />
                <div className={styles.rowInfo}>
                  <div className={`${styles.rowTitle} ${isActive ? styles.activeText : ''}`}>{song.title}</div>
                  <div className={styles.rowArtist}>{song.artist}</div>
                </div>
                <button
                  className={styles.removeBtn}
                  style={{ opacity: isHovered ? 1 : 0 }}
                  onClick={(e) => handleRemoveSong(song.playlistSongId, e)}
                  disabled={removingId === song.playlistSongId}
                  title="Remove from playlist"
                >
                  {removingId === song.playlistSongId ? '...' : '✕'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}