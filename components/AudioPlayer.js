'use client'

import { useAudio } from '@/context/AudioContext'
import styles from './AudioPlayer.module.css'

export default function AudioPlayer() {
  const {
    currentSong, isPlaying, togglePlay,
    playNext, playPrev, repeatMode, cycleRepeat,
    shuffle, setShuffle, progress, duration, seek,
    volume, setVolume, audioRef,
    queueOpen, setQueueOpen,
    playerExpanded, setPlayerExpanded,
    upcomingQueue, playSongAtIndex, currentIndex, playlist,
  } = useAudio()

  if (!currentSong) return null

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progressPercent = duration ? (progress / duration) * 100 : 0
  const repeatIcons = ['⟳', '🔂', '🔁']

  return (
    <>
      {/* ── Queue Drawer ── */}
      {queueOpen && (
        <div className={styles.queueOverlay} onClick={() => setQueueOpen(false)}>
          <div className={styles.queueDrawer} onClick={e => e.stopPropagation()}>
            <div className={styles.queueHeader}>
              <h3 className={styles.queueTitle}>Up Next</h3>
              <button className={styles.queueClose} onClick={() => setQueueOpen(false)}>✕</button>
            </div>
            <div className={styles.queueNowPlaying}>
              <span className={styles.queueLabel}>Now Playing</span>
              <div className={styles.queueCurrentRow}>
                <img src={currentSong.thumbnail_url} alt="" className={styles.queueThumb} />
                <div>
                  <div className={styles.queueSongTitle}>{currentSong.title}</div>
                  <div className={styles.queueSongArtist}>{currentSong.artist}</div>
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
                    onClick={() => playSongAtIndex(currentIndex + 1 + i)}
                  >
                    <span className={styles.queueRowNum}>{i + 1}</span>
                    <img src={song.thumbnail_url} alt="" className={styles.queueThumb} />
                    <div className={styles.queueRowInfo}>
                      <div className={styles.queueSongTitle}>{song.title}</div>
                      <div className={styles.queueSongArtist}>{song.artist}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Expanded Player ── */}
      {playerExpanded && (
        <div className={styles.expandedOverlay}>
          <div className={styles.expandedPlayer}>
            <button className={styles.expandedClose} onClick={() => setPlayerExpanded(false)}>
              ↓
            </button>
            <div className={styles.expandedArt}>
              <img src={currentSong.thumbnail_url} alt={currentSong.title} className={styles.expandedImg} />
            </div>
            <div className={styles.expandedInfo}>
              <div className={styles.expandedTitle}>{currentSong.title}</div>
              <div className={styles.expandedArtist}>{currentSong.artist}</div>
            </div>
            <div className={styles.expandedProgress}>
              <div
                className={styles.expandedProgressBar}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  seek((e.clientX - rect.left) / rect.width * duration)
                }}
              >
                <div className={styles.expandedProgressFill} style={{ width: `${progressPercent}%` }} />
                <div className={styles.expandedProgressThumb} style={{ left: `${progressPercent}%` }} />
              </div>
              <div className={styles.expandedTimes}>
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            <div className={styles.expandedControls}>
              <button
                className={`${styles.expandedIconBtn} ${shuffle ? styles.activeIcon : ''}`}
                onClick={() => setShuffle(!shuffle)}
              >⇄</button>
              <button className={styles.expandedIconBtn} onClick={playPrev}>⏮</button>
              <button className={styles.expandedPlayBtn} onClick={togglePlay}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button className={styles.expandedIconBtn} onClick={playNext}>⏭</button>
              <button
                className={`${styles.expandedIconBtn} ${repeatMode > 0 ? styles.activeIcon : ''}`}
                onClick={cycleRepeat}
              >{repeatIcons[repeatMode]}</button>
            </div>
            <div className={styles.expandedVolume}>
              <span>🔇</span>
              <input
                type="range" min={0} max={1} step={0.01} value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setVolume(v)
                  if (audioRef.current) audioRef.current.volume = v
                }}
                className={styles.expandedVolumeSlider}
              />
              <span>🔊</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Mini Player Bar ── */}
      <div className={styles.player}>
        {/* Progress bar */}
        <div
          className={styles.progressBar}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            seek((e.clientX - rect.left) / rect.width * duration)
          }}
        >
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Song info — clicking expands on mobile */}
        <div className={styles.songInfo} onClick={() => setPlayerExpanded(true)}>
          <div className={styles.thumbWrap}>
            <img src={currentSong.thumbnail_url || ''} alt="" className={styles.thumb} />
            {isPlaying && <div className={styles.thumbBorder} />}
          </div>
          <div className={styles.songText}>
            <div className={styles.songTitle}>{currentSong.title}</div>
            <div className={styles.songArtist}>{currentSong.artist}</div>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button className={`${styles.iconBtn} ${shuffle ? styles.active : ''}`}
            onClick={() => setShuffle(!shuffle)} title="Shuffle (S)">⇄</button>
          <button className={styles.iconBtn} onClick={playPrev} title="Previous (←)">⏮</button>
          <button className={styles.playBtn} onClick={togglePlay} title="Play/Pause (Space)">
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className={styles.iconBtn} onClick={playNext} title="Next (→)">⏭</button>
          <button className={`${styles.iconBtn} ${repeatMode > 0 ? styles.active : ''}`}
            onClick={cycleRepeat} title="Repeat">{repeatIcons[repeatMode]}</button>
        </div>

        {/* Right side */}
        <div className={styles.volumeSection}>
          <button
            className={`${styles.iconBtn} ${queueOpen ? styles.active : ''}`}
            onClick={() => setQueueOpen(!queueOpen)}
            title="Queue"
            style={{ fontSize: '16px' }}
          >☰</button>
          <span className={styles.time}>{formatTime(progress)} / {formatTime(duration)}</span>
          <span style={{ fontSize: '16px' }}>🔊</span>
          <input
            type="range" min={0} max={1} step={0.01} value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              setVolume(v)
              if (audioRef.current) audioRef.current.volume = v
            }}
            className={styles.volumeSlider}
          />
        </div>
      </div>
    </>
  )
}