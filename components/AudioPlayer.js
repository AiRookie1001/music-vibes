'use client'

import { useState, useEffect, useRef } from 'react'
import { useAudio } from '@/context/AudioContext'
import LyricsPanel from '@/components/LyricsPanel'
import SleepTimer from '@/components/Sleeptimer'
import { formatDuration } from '@/lib/formatDuration'
import styles from './AudioPlayer.module.css'

function WaveIcon() {
  return (
    <div className={styles.wave}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={styles.waveBar} style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  )
}

export default function AudioPlayer() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    playNext,
    playPrev,
    repeatMode,
    cycleRepeat,
    shuffle,
    setShuffle,
    progress,
    duration,
    seek,
    volume,
    setVolume,
    audioRef,
    queueOpen,
    setQueueOpen,
    upcomingQueue,
    playSongAtIndex,
    currentIndex,
  } = useAudio()

  const [expanded, setExpanded] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)

  // ══════════════════════════════════════════════════
  // SHARED SLEEP TIMER STATE
  // Both the desktop bar and expanded player use the same state
  // ══════════════════════════════════════════════════
  const [sleepRemaining, setSleepRemaining] = useState(null) // seconds left, null = inactive
  const sleepIntervalRef = useRef(null)

  // Countdown effect - runs when sleepRemaining changes
  useEffect(() => {
    // Clear any existing interval
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current)
      sleepIntervalRef.current = null
    }

    // If no timer set, do nothing
    if (sleepRemaining === null) return

    // Start countdown
    sleepIntervalRef.current = setInterval(() => {
      setSleepRemaining((prev) => {
        if (prev === null) return null

        if (prev <= 1) {
          // Timer ended - pause playback
          clearInterval(sleepIntervalRef.current)
          sleepIntervalRef.current = null

          if (isPlaying) {
            togglePlay()
          }

          return null
        }

        return prev - 1
      })
    }, 1000)

    // Cleanup on unmount or when sleepRemaining changes
    return () => {
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current)
        sleepIntervalRef.current = null
      }
    }
  }, [sleepRemaining !== null]) // Only re-run when timer starts/stops, not every second

  // Don't render if no song
  if (!currentSong) return null

  // Format time helper
  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const pct = duration ? (progress / duration) * 100 : 0
  const repeatIcons = ['⟳', '🔂', '🔁']

  // Seek on click
  const seekClick = (e, el) => {
    const rect = el.getBoundingClientRect()
    seek(((e.clientX - rect.left) / rect.width) * duration)
  }

  // Volume change handler
  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (audioRef.current) {
      audioRef.current.volume = v
    }
  }

  return (
    <>
      {/* ══════════════════════════════
          QUEUE DRAWER
      ══════════════════════════════ */}
      {queueOpen && (
        <div className={styles.queueOverlay} onClick={() => setQueueOpen(false)}>
          <div className={styles.queueDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.queueHead}>
              <h3 className={styles.queueTitle}>Up Next</h3>
              <button className={styles.queueClose} onClick={() => setQueueOpen(false)}>
                ✕
              </button>
            </div>

            <div className={styles.queueNow}>
              <span className={styles.queueNowLabel}>Now Playing</span>
              <div className={styles.queueRow}>
                <img src={currentSong.thumbnail_url} alt="" className={styles.queueThumb} />
                <div>
                  <p className={styles.queueSongTitle}>{currentSong.title}</p>
                  <p className={styles.queueSongArtist}>{currentSong.artist}</p>
                </div>
              </div>
            </div>

            <div className={styles.queueList}>
              {upcomingQueue.length === 0 ? (
                <p className={styles.queueEmpty}>No more songs in queue</p>
              ) : (
                upcomingQueue.map((song, i) => (
                  <div
                    key={song.id}
                    className={styles.queueRow}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      playSongAtIndex(currentIndex + 1 + i)
                      setQueueOpen(false)
                    }}
                  >
                    <span className={styles.queueNum}>{i + 1}</span>
                    <img src={song.thumbnail_url} alt="" className={styles.queueThumb} />
                    <div className={styles.queueRowInfo}>
                      <p className={styles.queueSongTitle}>{song.title}</p>
                      <p className={styles.queueSongArtist}>{song.artist}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          EXPANDED PLAYER (full screen)
      ══════════════════════════════════════════════════ */}
      {expanded && (
        <div className={styles.expanded}>
          {/* Blurred background */}
          <div
            className={styles.expandedBg}
            style={{ backgroundImage: `url(${currentSong.thumbnail_url})` }}
          />
          <div className={styles.expandedScrim} />

          {/* Desktop split wrapper */}
          <div
            className={`${styles.expandedInner} ${
              lyricsOpen ? styles.expandedInnerSplit : styles.expandedInnerCenter
            }`}
          >
            {/* LEFT COLUMN */}
            <div
              className={`${styles.expandedLeft} ${
                lyricsOpen ? styles.expandedLeftNarrow : styles.expandedLeftWide
              }`}
            >
              {/* Header row */}
              <div className={styles.expandedHeader}>
                <button className={styles.expandedDown} onClick={() => setExpanded(false)}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </button>
                <span className={styles.expandedHeaderLabel}>Now Playing</span>
                <div style={{ width: 36 }} />
              </div>

              {/* Album art */}
              <div className={styles.expandedArt}>
                <img
                  src={currentSong.thumbnail_url}
                  alt=""
                  className={styles.expandedArtImg}
                />
                {isPlaying && <WaveIcon />}
              </div>

              {/* Song info */}
              <div className={styles.expandedInfo}>
                <div className={styles.expandedInfoText}>
                  <p className={styles.expandedTitle}>{currentSong.title}</p>
                  <p className={styles.expandedArtist}>{currentSong.artist}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className={styles.expandedProgressWrap}>
                <div
                  className={styles.expandedProgressTrack}
                  onClick={(e) => seekClick(e, e.currentTarget)}
                >
                  <div className={styles.expandedProgressFill} style={{ width: `${pct}%` }} />
                  <div className={styles.expandedProgressThumb} style={{ left: `${pct}%` }} />
                </div>
                <div className={styles.expandedTimes}>
                  <span>{fmt(progress)}</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>

              {/* Transport controls */}
              <div className={styles.expandedControls}>
                <button
                  className={`${styles.exBtn} ${shuffle ? styles.exBtnActive : ''}`}
                  onClick={() => setShuffle(!shuffle)}
                >
                  ⇄
                </button>
                <button className={styles.exBtn} onClick={playPrev}>
                  ⏮
                </button>
                <button className={styles.exPlayBtn} onClick={togglePlay}>
                  {isPlaying ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>
                <button className={styles.exBtn} onClick={playNext}>
                  ⏭
                </button>
                <button
                  className={`${styles.exBtn} ${repeatMode > 0 ? styles.exBtnActive : ''}`}
                  onClick={cycleRepeat}
                >
                  {repeatIcons[repeatMode]}
                </button>
              </div>

              {/* Lyrics + Sleep Timer action row */}
              <div className={styles.expandedActions}>
                <button
                  className={`${styles.expandedActionBtn} ${
                    lyricsOpen ? styles.expandedActionBtnActive : ''
                  }`}
                  onClick={() => setLyricsOpen((prev) => !prev)}
                >
                  <span className={styles.expandedActionIcon}>🎤</span>
                  <span className={styles.expandedActionLabel}>Lyrics</span>
                </button>

                <div className={styles.expandedActionDivider} />

                <div className={styles.expandedSleepWrap}>
                  {/* SHARED sleep timer - uses lifted state */}
                  <SleepTimer
                    sleepRemaining={sleepRemaining}
                    setSleepRemaining={setSleepRemaining}
                  />
                </div>
              </div>

              {/* Volume */}
              <div className={styles.expandedVol}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                </svg>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={handleVolumeChange}
                  className={styles.volSlider}
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                  <path d="M15.54,8.46a5,5,0,0,1,0,7.07" />
                  <path d="M19.07,4.93a10,10,0,0,1,0,14.14" />
                </svg>
              </div>
            </div>

            {/* RIGHT COLUMN — desktop inline lyrics */}
            {lyricsOpen && (
              <div className={styles.expandedRight}>
                <LyricsPanel
                  artist={currentSong?.artist || ''}
                  title={currentSong?.title || ''}
                  isOpen={lyricsOpen}
                  onClose={() => setLyricsOpen(false)}
                  mode="inline"
                />
              </div>
            )}
          </div>

          {/* MOBILE overlay lyrics */}
          {lyricsOpen && (
            <div className={styles.mobileOnlyLyrics}>
              <LyricsPanel
                artist={currentSong?.artist || ''}
                title={currentSong?.title || ''}
                isOpen={lyricsOpen}
                onClose={() => setLyricsOpen(false)}
                mode="overlay"
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          DESKTOP PLAYER BAR
      ══════════════════════════════ */}
      <div className={styles.bar}>
        <div className={styles.progressLine} onClick={(e) => seekClick(e, e.currentTarget)}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>

        {/* Left */}
        <div className={styles.barLeft} onClick={() => setExpanded(true)}>
          <div className={styles.barThumbWrap}>
            <img src={currentSong.thumbnail_url} alt="" className={styles.barThumb} />
            {isPlaying && <div className={styles.barThumbRing} />}
          </div>
          <div className={styles.barInfo}>
            <p className={styles.barTitle}>{currentSong.title}</p>
            <p className={styles.barArtist}>{currentSong.artist}</p>
          </div>
          <button
            className={`${styles.lyricsBtn} ${lyricsOpen ? styles.lyricsBtnActive : ''}`}
            title="Lyrics"
            onClick={(e) => {
              e.stopPropagation()
              if (!lyricsOpen) {
                setExpanded(true)
                setLyricsOpen(true)
              } else {
                setLyricsOpen(false)
              }
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            {currentSong.duration_seconds ? (
              <span>{formatDuration(currentSong.duration_seconds)}</span>
            ) : (
              <span>Lyrics</span>
            )}
          </button>
        </div>

        {/* Center */}
        <div className={styles.barCenter}>
          <button
            className={`${styles.ctrl} ${shuffle ? styles.ctrlActive : ''}`}
            onClick={() => setShuffle(!shuffle)}
            title="Shuffle"
          >
            ⇄
          </button>
          <button className={styles.ctrl} onClick={playPrev} title="Prev">
            ⏮
          </button>
          <button className={styles.ctrlPlay} onClick={togglePlay} title="Play/Pause">
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
          <button className={styles.ctrl} onClick={playNext} title="Next">
            ⏭
          </button>
          <button
            className={`${styles.ctrl} ${repeatMode > 0 ? styles.ctrlActive : ''}`}
            onClick={cycleRepeat}
          >
            {repeatIcons[repeatMode]}
          </button>
        </div>

        {/* Right */}
        <div className={styles.barRight}>
          <span className={styles.barTime}>
            {fmt(progress)} / {fmt(duration)}
          </span>

          {/* SHARED sleep timer - same state as expanded player */}
          <SleepTimer
            sleepRemaining={sleepRemaining}
            setSleepRemaining={setSleepRemaining}
          />

          <button
            className={`${styles.ctrl} ${queueOpen ? styles.ctrlActive : ''}`}
            onClick={() => setQueueOpen(!queueOpen)}
            title="Queue"
            style={{ fontSize: '16px' }}
          >
            ☰
          </button>

          <div className={styles.volRow}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: 'var(--text-3)' }}
            >
              <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
              <path d="M15.54,8.46a5,5,0,0,1,0,7.07" />
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              className={styles.volSlider}
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          MOBILE MINI PLAYER PILL
      ══════════════════════════════ */}
      <div className={styles.mobileMini} onClick={() => setExpanded(true)}>
        <div className={styles.miniThumbWrap}>
          <img src={currentSong.thumbnail_url} alt="" className={styles.miniThumb} />
          {isPlaying && <div className={styles.miniThumbRing} />}
        </div>

        <div className={styles.miniInfo}>
          <p className={styles.miniTitle}>{currentSong.title}</p>
          <p className={styles.miniArtist}>{currentSong.artist}</p>
        </div>

        <div className={styles.miniProgress}>
          <div className={styles.miniProgressFill} style={{ width: `${pct}%` }} />
        </div>

        <button
          className={styles.miniPlayBtn}
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <button
          className={styles.miniNextBtn}
          onClick={(e) => {
            e.stopPropagation()
            playNext()
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,4 15,12 5,20" />
            <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </>
  )
}