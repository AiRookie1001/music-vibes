'use client'

import { createContext, useContext, useState, useRef, useEffect } from 'react'

const AudioContext = createContext(null)

export function AudioProvider({ children }) {
  const audioRef = useRef(null)
  const [playlist, setPlaylist] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [repeatMode, setRepeatMode] = useState(0) // 0=off 1=one 2=all
  const [shuffle, setShuffle] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [queueOpen, setQueueOpen] = useState(false)
  const [playerExpanded, setPlayerExpanded] = useState(false)

  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateProgress = () => setProgress(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      if (repeatMode === 1) {
        audio.currentTime = 0; audio.play()
      } else {
        const next = getNextIndex()
        if (next !== -1) playSongAtIndex(next)
        else setIsPlaying(false)
      }
    }

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentIndex, repeatMode, shuffle, playlist])

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      // Don't fire if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (currentSong) togglePlay()
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault()
        playNext()
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        playPrev()
      }
      if (e.code === 'ArrowUp') {
        e.preventDefault()
        const newVol = Math.min(1, volume + 0.1)
        setVolume(newVol)
        if (audioRef.current) audioRef.current.volume = newVol
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault()
        const newVol = Math.max(0, volume - 0.1)
        setVolume(newVol)
        if (audioRef.current) audioRef.current.volume = newVol
      }
      if (e.code === 'KeyM') {
        const newVol = volume > 0 ? 0 : 1
        setVolume(newVol)
        if (audioRef.current) audioRef.current.volume = newVol
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentSong, volume, currentIndex, playlist, shuffle, repeatMode])

  function getNextIndex() {
    if (playlist.length === 0) return -1
    if (shuffle) {
      if (playlist.length === 1) return 0
      let next
      do { next = Math.floor(Math.random() * playlist.length) }
      while (next === currentIndex)
      return next
    }
    const next = currentIndex + 1
    if (next >= playlist.length) return repeatMode === 2 ? 0 : -1
    return next
  }

  function getPrevIndex() {
    if (playlist.length === 0) return -1
    const prev = currentIndex - 1
    if (prev < 0) return repeatMode === 2 ? playlist.length - 1 : 0
    return prev
  }

  function playSongAtIndex(index) {
    if (index < 0 || index >= playlist.length) return
    const audio = audioRef.current
    setCurrentIndex(index)
    audio.src = playlist[index].audio_url
    audio.play()
    setIsPlaying(true)
  }

  function playNext() {
    const next = getNextIndex()
    if (next !== -1) playSongAtIndex(next)
  }

  function playPrev() {
    // If more than 3 seconds in, restart current song
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }
    playSongAtIndex(getPrevIndex())
  }

  function togglePlay() {
    const audio = audioRef.current
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.play(); setIsPlaying(true) }
  }

  function seek(time) {
    audioRef.current.currentTime = time
    setProgress(time)
  }

  function cycleRepeat() { setRepeatMode(prev => (prev + 1) % 3) }

  // Upcoming songs in queue (songs after current)
  const upcomingQueue = currentIndex >= 0
    ? playlist.slice(currentIndex + 1)
    : []

  return (
    <AudioContext.Provider value={{
      playlist, setPlaylist,
      currentSong, currentIndex,
      isPlaying, togglePlay,
      playSongAtIndex, playNext, playPrev,
      repeatMode, cycleRepeat,
      shuffle, setShuffle,
      progress, duration, seek,
      volume, setVolume, audioRef,
      queueOpen, setQueueOpen,
      playerExpanded, setPlayerExpanded,
      upcomingQueue,
    }}>
      <audio ref={audioRef} />
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() {
  return useContext(AudioContext)
}