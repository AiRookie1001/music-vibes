'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Animated waveform bars shown while converting
function WaveAnimation() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '40px' }}>
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <div key={i} style={{
          width: '4px',
          borderRadius: '2px',
          backgroundColor: '#ff5500',
          animation: `wave 1.1s ease-in-out infinite`,
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { height: 8px; opacity: 0.4; }
          50% { height: 32px; opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// Cycling status messages so it feels alive
const LOADING_MESSAGES = [
  '🔗 Fetching video info...',
  '🎵 Starting MP3 conversion...',
  '⚙️ Converting audio...',
  '📦 Compressing file...',
  '☁️ Uploading to storage...',
  '🖼️ Saving thumbnail...',
  '💾 Saving to library...',
  '✨ Almost done...',
]

function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 4000)

    const dotTimer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    return () => { clearInterval(msgTimer); clearInterval(dotTimer) }
  }, [])

  return (
    <div style={{
      padding: '28px 24px', borderRadius: '12px',
      backgroundColor: '#141414', border: '1px solid #2a2a2a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    }}>
      <WaveAnimation />
      <div>
        <p style={{
          fontSize: '14px', color: '#f2f2f2', fontWeight: '600',
          textAlign: 'center', marginBottom: '6px',
        }}>
          {LOADING_MESSAGES[msgIndex]}{dots}
        </p>
        <p style={{ fontSize: '12px', color: '#444', textAlign: 'center' }}>
          This usually takes 20–40 seconds
        </p>
      </div>

      {/* Fake progress bar that fills slowly */}
      <div style={{ width: '100%', height: '3px', backgroundColor: '#222', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #ff5500, #ff8c00)',
          borderRadius: '2px',
          animation: 'fillbar 35s linear forwards',
        }} />
      </div>
      <style>{`
        @keyframes fillbar {
          0%   { width: 0%; }
          30%  { width: 35%; }
          60%  { width: 65%; }
          85%  { width: 85%; }
          100% { width: 92%; }
        }
      `}</style>
    </div>
  )
}

export default function AddSong() {
  const router = useRouter()
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [artist, setArtist] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [touched, setTouched] = useState({ url: false, title: false, artist: false })

  const isValidYt = youtubeUrl.trim().match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/
  )
  const errors = {
    url: !youtubeUrl.trim() ? 'YouTube URL is required' : !isValidYt ? 'Enter a valid YouTube URL' : null,
    title: !title.trim() ? 'Song title is required' : null,
    artist: !artist.trim() ? 'Artist name is required' : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const handleSubmit = async () => {
    setTouched({ url: true, title: true, artist: true })
    if (hasErrors) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/add-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, artist, title })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      setStatus('success')
      setTimeout(() => router.push('/'), 1800)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  const inputStyle = (fieldKey) => ({
    width: '100%', padding: '12px 16px',
    backgroundColor: '#181818',
    border: `1px solid ${touched[fieldKey] && errors[fieldKey] ? '#ff4444' : '#2e2e2e'}`,
    borderRadius: '8px', color: '#f2f2f2',
    fontSize: '14px', outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'border-color 0.15s',
  })

  const labelStyle = {
    fontSize: '12px', color: '#888', display: 'block',
    marginBottom: '8px', textTransform: 'uppercase',
    letterSpacing: '0.08em', fontWeight: '600',
  }

  const fieldError = (key) => touched[key] && errors[key] ? (
    <p style={{ fontSize: '11px', color: '#ff4444', marginTop: '6px' }}>{errors[key]}</p>
  ) : null

  if (status === 'success') return (
    <div style={{ padding: '40px 28px', maxWidth: '520px' }}>
      <div style={{
        padding: '32px 24px', borderRadius: '12px',
        backgroundColor: '#101e10', border: '1px solid rgba(105,219,124,0.2)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#69db7c', marginBottom: '6px' }}>
          Song added!
        </h2>
        <p style={{ color: '#555', fontSize: '13px' }}>Redirecting to your library...</p>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '40px 28px', maxWidth: '520px' }}>
      <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '6px' }}>
        Upload a Song
      </h1>
      <p style={{ color: '#555', fontSize: '14px', marginBottom: '36px' }}>
        Paste a YouTube URL — we'll convert it to MP3 automatically.
      </p>

      {status === 'loading' ? (
        <LoadingState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* YouTube URL */}
          <div>
            <label style={labelStyle}>
              YouTube URL <span style={{ color: '#ff5500' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, url: true }))}
              style={inputStyle('url')}
              onFocus={e => e.target.style.borderColor = '#ff5500'}
              onBlur2={e => e.target.style.borderColor = touched.url && errors.url ? '#ff4444' : '#2e2e2e'}
            />
            {fieldError('url')}
          </div>

          {/* Song Title */}
          <div>
            <label style={labelStyle}>
              Song Title <span style={{ color: '#ff5500' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Blinding Lights"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, title: true }))}
              style={inputStyle('title')}
              onFocus={e => e.target.style.borderColor = '#ff5500'}
            />
            {fieldError('title')}
          </div>

          {/* Artist */}
          <div>
            <label style={labelStyle}>
              Artist Name <span style={{ color: '#ff5500' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. The Weeknd"
              value={artist}
              onChange={e => setArtist(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, artist: true }))}
              style={inputStyle('artist')}
              onFocus={e => e.target.style.borderColor = '#ff5500'}
            />
            {fieldError('artist')}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            style={{
              padding: '13px',
              backgroundColor: hasErrors && Object.values(touched).some(Boolean) ? '#222' : '#ff5500',
              border: 'none', borderRadius: '8px',
              color: hasErrors && Object.values(touched).some(Boolean) ? '#555' : '#fff',
              fontWeight: '700', fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              letterSpacing: '0.02em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!hasErrors) e.currentTarget.style.backgroundColor = '#ff7733' }}
            onMouseLeave={e => { if (!hasErrors) e.currentTarget.style.backgroundColor = '#ff5500' }}
          >
            + Upload Song
          </button>

          {/* API error */}
          {status === 'error' && (
            <div style={{
              padding: '14px 16px', borderRadius: '8px', fontSize: '13px',
              backgroundColor: '#1e1010', color: '#ff6b6b',
              border: '1px solid rgba(255,107,107,0.2)',
            }}>
              ❌ {errorMsg}
            </div>
          )}

          {/* Supported formats tip */}
          <div style={{
            padding: '14px 16px', borderRadius: '8px',
            backgroundColor: '#141414', border: '1px solid #1e1e1e',
          }}>
            <p style={{ fontSize: '11px', color: '#444', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Supported URLs
            </p>
            {['youtube.com/watch?v=...', 'youtu.be/...', 'youtube.com/shorts/...'].map(ex => (
              <p key={ex} style={{ fontSize: '12px', color: '#3a3a3a', fontFamily: 'DM Mono, monospace', marginTop: '4px' }}>
                ✓ {ex}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}