'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './Playlists.module.css'

export default function PlaylistsPage() {
  const router = useRouter()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPlaylists() }, [])

  async function loadPlaylists() {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { console.error(error); setLoading(false); return }

    const withCounts = await Promise.all(
      data.map(async (pl) => {
        const { count } = await supabase
          .from('playlist_songs')
          .select('*', { count: 'exact', head: true })
          .eq('playlist_id', pl.id)

        // Use first song thumbnail as cover if no cover_image set
        const { data: firstSong } = await supabase
          .from('playlist_songs')
          .select('songs(thumbnail_url)')
          .eq('playlist_id', pl.id)
          .order('order', { ascending: true })
          .limit(1)
          .single()

        const fallbackThumb = firstSong?.songs?.thumbnail_url || null
        return { ...pl, songCount: count || 0, fallbackThumb }
      })
    )

    setPlaylists(withCounts)
    setLoading(false)
  }

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Playlists</h1>
      </div>
      <div className={styles.grid}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonCover} />
            <div className={styles.skeletonLine} style={{ width: '70%' }} />
            <div className={styles.skeletonLine} style={{ width: '40%' }} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Playlists</h1>
          <p className={styles.sub}>{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.newBtn} onClick={() => router.push('/playlists/create')}>
          + New Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎶</div>
          <h2 className={styles.emptyTitle}>No playlists yet</h2>
          <p className={styles.emptySub}>Create your first playlist to organise your music</p>
          <button className={styles.newBtn} onClick={() => router.push('/playlists/create')}>
            + Create Playlist
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {playlists.map(pl => (
            <div key={pl.id} className={styles.card} onClick={() => router.push(`/playlists/${pl.id}`)}>
              <div className={styles.cover}>
                {pl.cover_image || pl.fallbackThumb ? (
                  <img src={pl.cover_image || pl.fallbackThumb} alt={pl.title} className={styles.coverImg} />
                ) : (
                  <div className={styles.coverPlaceholder}>🎵</div>
                )}
                <div className={styles.playOverlay}>▶</div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{pl.title}</div>
                <div className={styles.cardSub}>{pl.songCount} song{pl.songCount !== 1 ? 's' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}