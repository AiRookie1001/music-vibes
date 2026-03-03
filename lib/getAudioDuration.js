// lib/getAudioDuration.js
// Call this BEFORE uploading to Supabase storage.
// Returns duration in whole seconds, or null on failure.

export function getAudioDuration(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const audio = new Audio()
      audio.preload = 'metadata'
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(Math.round(audio.duration))
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      audio.src = url
    })
  }
  
  // Usage in your upload component:
  //
  // import { getAudioDuration } from '@/lib/getAudioDuration'
  //
  // const duration = await getAudioDuration(audioFile)
  //
  // await supabase.from('songs').insert({
  //   title,
  //   artist,
  //   audio_url,
  //   thumbnail_url,
  //   duration_seconds: duration,   // ← add this
  // })