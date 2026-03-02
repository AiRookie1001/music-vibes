'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/context/AudioContext'
import { useAuth } from '@/context/AuthContext'
import AddToPlaylist from '@/components/AddToPlaylist'
import EditSongModal from '@/components/EditSongModal'
import styles from './Home.module.css'

const GENRES = ['All', 'Hip-Hop', 'Pop', 'R&B', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Lo-fi', 'Afrobeats', 'Latin', 'Country', 'Other']

export default function Home() {
  const router = useRouter()
  const { user, isAdmin } = useAuth()

  const [songs, setSongs]         = useState([])
  const [likedIds, setLikedIds]   = useState(new Set())
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const [editSong, setEditSong]   = useState(null)

  // Hero
  const [heroIndex, setHeroIndex]     = useState(0)
  const [heroBg, setHeroBg]           = useState('')
  const [heroVisible, setHeroVisible] = useState(true)
  const heroTimerRef = useRef(null)

  const { playSongAtIndex, setPlaylist, currentSong, isPlaying, togglePlay } = useAudio()

  useEffect(() => { loadSongs() }, [])
  useEffect(() => {
    if (user) loadLikedIds()
    else setLikedIds(new Set())
  }, [user])

  // Hero auto-rotate every 6s
  useEffect(() => {
    if (songs.length < 2) return
    heroTimerRef.current = setInterval(() => {
      setHeroVisible(false)
      setTimeout(() => {
        setHeroIndex(prev => (prev + 1) % Math.min(songs.length, 5))
        setHeroVisible(true)
      }, 400)
    }, 6000)
    return () => clearInterval(heroTimerRef.current)
  }, [songs])

  useEffect(() => {
    if (songs[heroIndex]) setHeroBg(songs[heroIndex].thumbnail_url || '')
  }, [heroIndex, songs])

  async function loadSongs() {
    const { data, error } = await supabase
      .from('songs').select('*').order('created_at', { ascending: false })
    if (!error && data) { setSongs(data); setPlaylist(data) }
    setLoading(false)
  }

  async function loadLikedIds() {
    const { data } = await supabase
      .from('liked_songs').select('song_id').eq('user_id', user.id)
    if (data) setLikedIds(new Set(data.map(r => r.song_id)))
  }

  function handleHeroPlay() {
    const song = songs[heroIndex]
    if (!song) return
    if (currentSong?.id === song.id) togglePlay()
    else { setPlaylist(songs); playSongAtIndex(heroIndex) }
  }

  function goHero(i) {
    setHeroVisible(false)
    setTimeout(() => { setHeroIndex(i); setHeroVisible(true) }, 300)
    clearInterval(heroTimerRef.current)
  }

  async function handleLike(e, song) {
    e.stopPropagation()
    if (!user) { router.push('/login?next=/'); return }
    const isLiked = likedIds.has(song.id)
    setLikedIds(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(song.id) : next.add(song.id)
      return next
    })
    if (isLiked) {
      await supabase.from('liked_songs').delete().eq('user_id', user.id).eq('song_id', song.id)
    } else {
      await supabase.from('liked_songs').insert({ user_id: user.id, song_id: song.id })
    }
  }

  async function deleteSong(e, song) {
    e.stopPropagation()
    if (!isAdmin || !confirm(`Delete "${song.title}"?`)) return
    await supabase.from('songs').delete().eq('id', song.id)
    setSongs(prev => prev.filter(s => s.id !== song.id))
  }

  function handleSongClick(song) {
    const list = getFiltered()
    const idx  = list.findIndex(s => s.id === song.id)
    if (currentSong?.id === song.id) togglePlay()
    else { setPlaylist(list); playSongAtIndex(idx) }
  }

  function getFiltered() {
    return songs.filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !search
        || s.title.toLowerCase().includes(q)
        || s.artist.toLowerCase().includes(q)
      const matchGenre = activeGenre === 'All'
        || (s.tags && s.tags.includes(activeGenre))
        || s.genre === activeGenre
      return matchSearch && matchGenre
    })
  }

  const fmt = s => (!s || s <= 0)
    ? '' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const filtered      = getFiltered()
  const heroSong      = songs[heroIndex]
  const isHeroPlaying = currentSong?.id === heroSong?.id && isPlaying

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.heroSkeleton} />
      <div className={styles.grid} style={{ padding: '24px 40px' }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className={styles.skeleton}>
            <div className={styles.skelCover} />
            <div className={styles.skelInfo}>
              <div className={styles.skelLine} style={{ width: '70%' }} />
              <div className={styles.skelLine} style={{ width: '45%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={styles.page}>

      {/* ══ HERO ══ */}
      {songs.length > 0 && (
        <section className={styles.hero}>
          <div className={styles.heroBg}
            style={{ backgroundImage: `url(${heroBg})` }}
            key={heroIndex} />
          <div className={styles.heroScrim} />

          <div className={`${styles.heroContent} ${heroVisible ? styles.heroIn : styles.heroOut}`}>
            <div className={styles.heroArt}>
              <img src={heroSong?.thumbnail_url || '/placeholder.jpg'} alt="" className={styles.heroImg} />
              {isHeroPlaying && <div className={styles.heroPlayingRing} />}
            </div>
            <div className={styles.heroInfo}>
              <p className={styles.heroLabel}>
                {currentSong?.id === heroSong?.id ? '▶ Now Playing' : 'Featured'}
              </p>
              <h1 className={styles.heroTitle}>{heroSong?.title}</h1>
              <p className={styles.heroArtist}>{heroSong?.artist}</p>
              <button className={styles.heroPlayBtn} onClick={handleHeroPlay}>
                {isHeroPlaying ? (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pause</>
                ) : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Play Now</>
                )}
              </button>
            </div>
          </div>

          {songs.length > 1 && (
            <div className={styles.heroDots}>
              {Array.from({ length: Math.min(songs.length, 5) }).map((_, i) => (
                <button key={i}
                  className={`${styles.dot} ${i === heroIndex ? styles.dotActive : ''}`}
                  onClick={() => goHero(i)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ══ HEADER + SEARCH ══ */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.sectionTitle}>All Music</h2>
          <p className={styles.sectionSub}>{filtered.length} of {songs.length} tracks</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.searchWrap}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" className={styles.searchIcon}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search songs…"
              value={search} onChange={e => setSearch(e.target.value)}
              className={styles.search} />
          </div>
        </div>
      </div>

      {/* Genre chips */}
      {songs.length > 0 && (
        <div className={styles.genreStrip}>
          {GENRES.map(g => (
            <button key={g}
              className={`${styles.genreChip} ${activeGenre === g ? styles.genreChipActive : ''}`}
              onClick={() => setActiveGenre(g)}>{g}</button>
          ))}
        </div>
      )}

      {/* Empty states */}
      {songs.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyIcon}>🎵</p>
          <h2 className={styles.emptyTitle}>No music yet</h2>
          <p className={styles.emptyText}>{user ? 'Upload the first song' : 'Sign in to upload music'}</p>
          <a href={user ? '/add-song' : '/login'} className={styles.emptyBtn}>
            {user ? 'Upload music →' : 'Sign in →'}
          </a>
        </div>
      )}
      {songs.length > 0 && filtered.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>No songs match your search</p>
          <button className={styles.emptyBtn} onClick={() => { setSearch(''); setActiveGenre('All') }}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            Clear filters
          </button>
        </div>
      )}

      {/* ══ SONG GRID ══ */}
      {filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map(song => {
            const isActive = currentSong?.id === song.id
            const isLiked  = likedIds.has(song.id)
            return (
              <div key={song.id}
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                onClick={() => handleSongClick(song)}>

                <div className={styles.thumb}>
                  <img src={song.thumbnail_url || '/placeholder.jpg'} alt={song.title} className={styles.thumbImg} />
                  <div className={`${styles.thumbOverlay} ${isActive ? styles.thumbOverlayOn : ''}`}>
                    <div className={styles.playBtn}>
                      {isActive && isPlaying
                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>}
                    </div>
                  </div>
                  {song.duration_seconds > 0 && <div className={styles.durationBadge}>{fmt(song.duration_seconds)}</div>}
                  {isActive && isPlaying && <div className={styles.badge}>LIVE</div>}

                  <div className={styles.topActions} onClick={e => { e.stopPropagation(); e.preventDefault() }}>
                    {user && <AddToPlaylist song={song} />}
                    {isAdmin && (
                      <>
                        <button onClick={e => { e.stopPropagation(); setEditSong(song) }} title="Edit" className={styles.actionBtn}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={e => deleteSong(e, song)} title="Delete" className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.info}>
                  <div className={styles.infoText}>
                    <p className={`${styles.songTitle} ${isActive ? styles.songTitleActive : ''}`}>{song.title}</p>
                    <p className={styles.songArtist}>{song.artist}</p>
                    {song.tags?.length > 0 && <p className={styles.genreTag}>{song.tags[0]}</p>}
                  </div>
                  <button
                    className={`${styles.likeBtn} ${isLiked ? styles.likeBtnActive : ''}`}
                    onClick={e => handleLike(e, song)}
                    title={!user ? 'Sign in to like' : isLiked ? 'Unlike' : 'Like'}>
                    <svg width="16" height="16" viewBox="0 0 24 24"
                      fill={isLiked ? '#ff4466' : 'none'}
                      stroke={isLiked ? '#ff4466' : 'currentColor'} strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editSong && isAdmin && (
        <EditSongModal song={editSong} onClose={() => setEditSong(null)}
          onSaved={updated => { setSongs(prev => prev.map(s => s.id === updated.id ? updated : s)); setEditSong(null) }} />
      )}
    </div>
  )
}