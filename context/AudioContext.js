'use client'

import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const AudioContext = createContext(null)

export function AudioProvider({ children }) {
  const audioRef = useRef(null)
  const sleepTimerRef = useRef(null)

  const [playlist, setPlaylist] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [repeatMode, setRepeatMode] = useState(0)   // 0=off 1=one 2=all
  const [shuffle, setShuffle] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1) // Phase 7
  const [sleepMinutes, setSleepMinutes] = useState(0) // 0 = off
  const [sleepRemaining, setSleepRemaining] = useState(0)
  const [queueOpen, setQueueOpen] = useState(false)
  const [user, setUser] = useState(null)

  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null

  // Track authenticated user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const updateProgress = () => setProgress(audio.currentTime)
    const updateDuration  = () => setDuration(audio.duration)
    const handleEnded = () => {
      if (repeatMode === 1) { audio.currentTime = 0; audio.play() }
      else {
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

  // Sync playback rate to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  // Sleep timer countdown
  useEffect(() => {
    if (sleepMinutes <= 0) { setSleepRemaining(0); return }
    const totalSeconds = sleepMinutes * 60
    setSleepRemaining(totalSeconds)
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const remaining = totalSeconds - elapsed
      if (remaining <= 0) {
        clearInterval(interval)
        setSleepMinutes(0)
        setSleepRemaining(0)
        if (audioRef.current) { audioRef.current.pause() }
        setIsPlaying(false)
      } else {
        setSleepRemaining(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [sleepMinutes])

  // Global keyboard shortcuts
  useEffect(() => {
    const handle = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.code === 'Space') { e.preventDefault(); if (currentSong) togglePlay() }
      if (e.code === 'ArrowRight') { e.preventDefault(); playNext() }
      if (e.code === 'ArrowLeft') { e.preventDefault(); playPrev() }
      if (e.code === 'ArrowUp') { e.preventDefault(); const v = Math.min(1, volume + 0.1); setVolume(v); if (audioRef.current) audioRef.current.volume = v }
      if (e.code === 'ArrowDown') { e.preventDefault(); const v = Math.max(0, volume - 0.1); setVolume(v); if (audioRef.current) audioRef.current.volume = v }
      if (e.code === 'KeyM') { const v = volume > 0 ? 0 : 1; setVolume(v); if (audioRef.current) audioRef.current.volume = v }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [currentSong, volume, currentIndex, playlist, shuffle, repeatMode])

  function getNextIndex() {
    if (!playlist.length) return -1
    if (shuffle) {
      if (playlist.length === 1) return 0
      let next
      do { next = Math.floor(Math.random() * playlist.length) } while (next === currentIndex)
      return next
    }
    const next = currentIndex + 1
    if (next >= playlist.length) return repeatMode === 2 ? 0 : -1
    return next
  }

  function getPrevIndex() {
    if (!playlist.length) return -1
    const prev = currentIndex - 1
    return prev < 0 ? (repeatMode === 2 ? playlist.length - 1 : 0) : prev
  }

  async function logPlay(songId) {
    if (!user || !songId) return
    // Log to play_history
    await supabase.from('play_history').insert({ user_id: user.id, song_id: songId })
    // Increment play_count via RPC
    await supabase.rpc('increment_play_count', { song_id: songId })
  }

  function playSongAtIndex(index) {
    if (index < 0 || index >= playlist.length) return
    const audio = audioRef.current
    const song = playlist[index]
    setCurrentIndex(index)
    audio.src = song.audio_url
    audio.playbackRate = playbackRate
    audio.play()
    setIsPlaying(true)
    logPlay(song.id)
  }

  function playNext() {
    const next = getNextIndex()
    if (next !== -1) playSongAtIndex(next)
  }

  function playPrev() {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0; return
    }
    playSongAtIndex(getPrevIndex())
  }

  function togglePlay() {
    const audio = audioRef.current
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.play(); setIsPlaying(true) }
  }

  function seek(time) { audioRef.current.currentTime = time; setProgress(time) }
  function cycleRepeat() { setRepeatMode(prev => (prev + 1) % 3) }

  // Toggle like on a song — updates DB and syncs playlist state
  async function toggleLike(song) {
    if (!user) return
    const newVal = !song.is_liked
    await supabase.from('songs')
      .update({ is_liked: newVal })
      .eq('id', song.id)
      .eq('user_id', user.id)
    // Update in active playlist so UI refreshes
    setPlaylist(prev => prev.map(s => s.id === song.id ? { ...s, is_liked: newVal } : s))
    return newVal
  }

  const upcomingQueue = currentIndex >= 0 ? playlist.slice(currentIndex + 1) : []

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
      playbackRate, setPlaybackRate,
      sleepMinutes, setSleepMinutes,
      sleepRemaining,
      queueOpen, setQueueOpen,
      upcomingQueue,
      user,
      toggleLike,
    }}>
      <audio ref={audioRef} />
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() { return useContext(AudioContext) }