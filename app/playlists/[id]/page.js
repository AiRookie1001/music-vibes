'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAudio } from '@/context/AudioContext'
import { formatDuration } from '@/lib/formatDuration'
import styles from './PlaylistDetail.module.css'

// dnd-kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Sortable Song Row ────────────────────────────────────────────────────────

function SortableSongRow({ song, index, isActive, isPlaying, isHovered, removingId, onHoverEnter, onHoverLeave, onClick, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.playlistSongId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.songRow} ${isActive ? styles.activeRow : ''} ${isDragging ? styles.draggingRow : ''}`}
      onClick={onClick}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {/* Drag handle */}
      <div
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        title="Drag to reorder"
      >
        ⠿
      </div>

      <div className={styles.rowIndex}>
        {isActive && isPlaying
          ? <span className={styles.playingDot}>▶</span>
          : index + 1}
      </div>

      <img src={song.thumbnail_url || ''} alt="" className={styles.rowThumb} />

      <div className={styles.rowInfo}>
        <div className={`${styles.rowTitle} ${isActive ? styles.activeText : ''}`}>
          {song.title}
        </div>
        <div className={styles.rowArtist}>{song.artist}</div>
      </div>

      <div className={styles.rowDuration}>
        {formatDuration(song.duration_seconds)}
      </div>

      <button
        className={styles.removeBtn}
        style={{ opacity: isHovered ? 1 : 0 }}
        onClick={onRemove}
        disabled={removingId === song.playlistSongId}
        title="Remove from playlist"
      >
        {removingId === song.playlistSongId ? '...' : '✕'}
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlaylistDetail() {
  const router = useRouter()
  const { id } = useParams()
  const { playSongAtIndex, setPlaylist, currentSong, isPlaying, togglePlay } = useAudio()

  const [playlist, setPlaylistData] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [activeId, setActiveId] = useState(null) // dnd active drag id
  const [isPublic, setIsPublic] = useState(false)
  const [togglingVisibility, setTogglingVisibility] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => { if (id) loadPlaylist() }, [id])

  async function loadPlaylist() {
    const { data: pl, error: plErr } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .single()

    if (plErr) { console.error(plErr); setLoading(false); return }
    setPlaylistData(pl)
    setIsPublic(pl.is_public ?? false)

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

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const oldIndex = songs.findIndex(s => s.playlistSongId === active.id)
    const newIndex = songs.findIndex(s => s.playlistSongId === over.id)
    const reordered = arrayMove(songs, oldIndex, newIndex)

    // Optimistic update
    setSongs(reordered)

    // Persist new order to Supabase
    const updates = reordered.map((song, index) => ({
      id: song.playlistSongId,
      playlist_id: id,
      song_id: song.id,
      order: index,
    }))

    // Upsert all rows with new order values
    const { error } = await supabase
      .from('playlist_songs')
      .upsert(updates, { onConflict: 'id' })

    if (error) {
      console.error('Failed to save order:', error)
      // Revert on failure
      loadPlaylist()
    }
  }

  // ── Playback ──────────────────────────────────────────────────────────────

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

  async function handleToggleVisibility() {
    const next = !isPublic
    setIsPublic(next) // optimistic
    setTogglingVisibility(true)
    const { error } = await supabase
      .from('playlists')
      .update({ is_public: next })
      .eq('id', id)
    if (error) {
      console.error('Failed to update visibility:', error)
      setIsPublic(!next) // revert
    }
    setTogglingVisibility(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.heroSkeleton} />
      <div className={styles.listSkeleton}>
        {[...Array(5)].map((_, i) => <div key={i} className={styles.rowSkeleton} />)}
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
  const activeSong = activeId ? songs.find(s => s.playlistSongId === activeId) : null

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration_seconds || 0), 0)

  return (
    <div className={styles.page}>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroCover}>
          {coverSrc
            ? <img src={coverSrc} alt={playlist.title} className={styles.heroCoverImg} />
            : <div className={styles.heroCoverPlaceholder}>🎵</div>}
        </div>
        <div className={styles.heroInfo}>
          <p className={styles.heroLabel}>Playlist</p>
          <h1 className={styles.heroTitle}>{playlist.title}</h1>
          <p className={styles.heroMeta}>
            {songs.length} song{songs.length !== 1 ? 's' : ''}
            {totalDuration > 0 && (
              <span style={{ marginLeft: '8px', color: '#666' }}>
                · {formatDuration(totalDuration)}
              </span>
            )}
          </p>
          <div className={styles.heroActions}>
            <button className={styles.playAllBtn} onClick={handlePlayAll} disabled={songs.length === 0}>
              ▶ Play All
            </button>
            <button
              className={`${styles.visibilityBtn} ${isPublic ? styles.visibilityPublic : styles.visibilityPrivate}`}
              onClick={handleToggleVisibility}
              disabled={togglingVisibility}
              title={isPublic ? 'Public — click to make private' : 'Private — click to make public'}
            >
              {isPublic ? '🌐 Public' : '🔒 Private'}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={songs.map(s => s.playlistSongId)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.songList}>
              {songs.map((song, index) => (
                <SortableSongRow
                  key={song.playlistSongId}
                  song={song}
                  index={index}
                  isActive={currentSong?.id === song.id}
                  isPlaying={isPlaying}
                  isHovered={hoveredId === song.id}
                  removingId={removingId}
                  onHoverEnter={() => setHoveredId(song.id)}
                  onHoverLeave={() => setHoveredId(null)}
                  onClick={() => handleSongClick(index)}
                  onRemove={(e) => handleRemoveSong(song.playlistSongId, e)}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag overlay — ghost card while dragging */}
          <DragOverlay>
            {activeSong && (
              <div className={`${styles.songRow} ${styles.overlayRow}`}>
                <div className={styles.dragHandle}>⠿</div>
                <div className={styles.rowIndex}>·</div>
                <img src={activeSong.thumbnail_url || ''} alt="" className={styles.rowThumb} />
                <div className={styles.rowInfo}>
                  <div className={styles.rowTitle}>{activeSong.title}</div>
                  <div className={styles.rowArtist}>{activeSong.artist}</div>
                </div>
                <div className={styles.rowDuration}>{formatDuration(activeSong.duration_seconds)}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}