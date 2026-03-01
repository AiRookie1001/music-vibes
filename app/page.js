'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/context/AudioContext'
import styles from './Home.module.css'

export default function Home() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)
  const [playlists, setPlaylists] = useState([])
  const [openMenuId, setOpenMenuId] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSong, setEditingSong] = useState(null) // { id, title, artist }
  const [editValues, setEditValues] = useState({ title: '', artist: '' })
  const [deletingId, setDeletingId] = useState(null)
  const menuRef = useRef(null)

  const { playSongAtIndex, setPlaylist, currentSong, isPlaying, togglePlay } = useAudio()

  useEffect(() => { loadSongs(); loadPlaylists() }, [])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadSongs() {
    const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
    if (!error) { setSongs(data); setPlaylist(data) }
    setLoading(false)
  }

  async function loadPlaylists() {
    const { data } = await supabase.from('playlists').select('id, title').order('created_at', { ascending: false })
    if (data) setPlaylists(data)
  }

  // Filtered songs based on search
  const filteredSongs = songs.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.artist.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleSongClick(song, index) {
    if (openMenuId) { setOpenMenuId(null); return }
    if (currentSong?.id === song.id) togglePlay()
    else {
      // Play within filtered context if searching, else full playlist
      const playlistToUse = searchQuery ? filteredSongs : songs
      const actualIndex = playlistToUse.findIndex(s => s.id === song.id)
      setPlaylist(playlistToUse)
      playSongAtIndex(actualIndex)
    }
  }

  function toggleMenu(e, songId) {
    e.stopPropagation()
    setOpenMenuId(prev => prev === songId ? null : songId)
  }

  async function addToPlaylist(e, song, playlistId) {
    e.stopPropagation()
    setAddingTo(playlistId)

    const { data: existing } = await supabase
      .from('playlist_songs').select('id')
      .eq('playlist_id', playlistId).eq('song_id', song.id).single()

    if (existing) {
      showToast('Already in this playlist')
      setAddingTo(null); setOpenMenuId(null); return
    }

    const { data: last } = await supabase
      .from('playlist_songs').select('order')
      .eq('playlist_id', playlistId).order('order', { ascending: false }).limit(1).single()

    await supabase.from('playlist_songs').insert({
      playlist_id: playlistId, song_id: song.id, order: last ? (last.order || 0) + 1 : 1
    })

    setAddingTo(null); setOpenMenuId(null)
    const pl = playlists.find(p => p.id === playlistId)
    showToast(`Added to "${pl?.title}"`)
  }

  async function deleteSong(e, song) {
    e.stopPropagation()
    if (!confirm(`Delete "${song.title}"? This cannot be undone.`)) return
    setDeletingId(song.id)

    // Remove from playlist_songs first
    await supabase.from('playlist_songs').delete().eq('song_id', song.id)

    // Delete audio + thumbnail from storage
    const audioFileName = song.audio_url?.split('/audio/')[1]
    const thumbFileName = song.thumbnail_url?.split('/thumbnails/')[1]
    if (audioFileName) await supabase.storage.from('audio').remove([audioFileName])
    if (thumbFileName) await supabase.storage.from('thumbnails').remove([thumbFileName])

    // Delete from DB
    await supabase.from('songs').delete().eq('id', song.id)

    setSongs(prev => prev.filter(s => s.id !== song.id))
    setDeletingId(null)
    setOpenMenuId(null)
    showToast(`"${song.title}" deleted`)
  }

  function startEdit(e, song) {
    e.stopPropagation()
    setEditingSong(song)
    setEditValues({ title: song.title, artist: song.artist })
    setOpenMenuId(null)
  }

  async function saveEdit() {
    if (!editValues.title.trim() || !editValues.artist.trim()) return
    const { error } = await supabase
      .from('songs')
      .update({ title: editValues.title.trim(), artist: editValues.artist.trim() })
      .eq('id', editingSong.id)

    if (!error) {
      setSongs(prev => prev.map(s =>
        s.id === editingSong.id
          ? { ...s, title: editValues.title.trim(), artist: editValues.artist.trim() }
          : s
      ))
      showToast('Song updated')
    }
    setEditingSong(null)
  }

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  if (loading) return (
    <div className={styles.page}>
      <h1 className={styles.heading}>All Songs</h1>
      <div className={styles.grid}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonCover} />
            <div className={styles.skeletonLine} style={{ width: '75%' }} />
            <div className={styles.skeletonLine} style={{ width: '45%' }} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={styles.page} ref={menuRef}>

      {/* Edit Modal */}
      {editingSong && (
        <div className={styles.modalOverlay} onClick={() => setEditingSong(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Edit Song</h3>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Title</label>
              <input
                className={styles.modalInput}
                value={editValues.title}
                onChange={e => setEditValues(v => ({ ...v, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                autoFocus
              />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Artist</label>
              <input
                className={styles.modalInput}
                value={editValues.artist}
                onChange={e => setEditValues(v => ({ ...v, artist: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setEditingSong(null)}>Cancel</button>
              <button className={styles.modalSave} onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>All Songs</h1>
          <p className={styles.sub}>{songs.length} tracks</p>
        </div>
        {/* Search bar */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search songs or artists..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button className={styles.searchClear} onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {filteredSongs.length === 0 && searchQuery ? (
        <div className={styles.noResults}>
          <p>No songs found for "<strong>{searchQuery}</strong>"</p>
        </div>
      ) : songs.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎵</div>
          <h2>No songs yet</h2>
          <p className={styles.emptySub}>Add your first song from YouTube</p>
          <a href="/add-song" className={styles.emptyBtn}>+ Upload a song</a>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredSongs.map((song, index) => {
            const isActive = currentSong?.id === song.id
            const isHovered = hoveredId === song.id
            const menuOpen = openMenuId === song.id

            return (
              <div
                key={song.id}
                className={`${styles.card} ${isActive ? styles.activeCard : ''} ${deletingId === song.id ? styles.deletingCard : ''}`}
                onClick={() => handleSongClick(song, index)}
                onMouseEnter={() => setHoveredId(song.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className={styles.cover}>
                  <img src={song.thumbnail_url || ''} alt={song.title} className={styles.coverImg} />
                  <div className={`${styles.playOverlay} ${isHovered || isActive ? styles.overlayVisible : ''}`}>
                    <div className={styles.playCircle}>
                      {isActive && isPlaying ? '⏸' : '▶'}
                    </div>
                  </div>
                  {isActive && isPlaying && <div className={styles.playingBadge}>▶ PLAYING</div>}
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardText}>
                    <div className={`${styles.cardTitle} ${isActive ? styles.activeTitle : ''}`}>{song.title}</div>
                    <div className={styles.cardArtist}>{song.artist}</div>
                  </div>

                  {/* Options button */}
                  <div className={styles.menuWrap}>
                    <button
                      className={`${styles.menuBtn} ${isHovered || menuOpen ? styles.menuBtnVisible : ''}`}
                      onClick={(e) => toggleMenu(e, song.id)}
                      title="Options"
                    >⋮</button>

                    {menuOpen && (
                      <div className={styles.dropdown} onClick={e => e.stopPropagation()}>
                        {/* Add to playlist submenu header */}
                        <p className={styles.dropdownLabel}>Add to playlist</p>
                        {playlists.length === 0 ? (
                          <a href="/playlists/create" className={styles.dropdownItem} style={{ color: '#ff5500' }}>
                            + Create a playlist
                          </a>
                        ) : (
                          playlists.map(pl => (
                            <button key={pl.id} className={styles.dropdownItem}
                              onClick={(e) => addToPlaylist(e, song, pl.id)}
                              disabled={addingTo === pl.id}>
                              {addingTo === pl.id ? '⏳' : '🎵'} {pl.title}
                            </button>
                          ))
                        )}
                        <div className={styles.dropdownDivider} />
                        <button className={styles.dropdownItem} onClick={(e) => startEdit(e, song)}>
                          ✏️ Edit details
                        </button>
                        <button
                          className={`${styles.dropdownItem} ${styles.deleteItem}`}
                          onClick={(e) => deleteSong(e, song)}
                          disabled={deletingId === song.id}
                        >
                          {deletingId === song.id ? '⏳ Deleting...' : '🗑️ Delete song'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toastMsg && <div className={styles.toast}>{toastMsg}</div>}
    </div>
  )
}