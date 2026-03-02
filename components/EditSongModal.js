'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function EditSongModal({ song, onClose, onSaved }) {
  const [title, setTitle] = useState(song.title)
  const [artist, setArtist] = useState(song.artist)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!title.trim() || !artist.trim()) { setError('Both fields are required'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('songs')
      .update({ title: title.trim(), artist: artist.trim() })
      .eq('id', song.id)
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    onSaved(data)
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', backgroundColor: '#111',
    border: '1px solid #333', borderRadius: '8px', color: '#f2f2f2',
    fontSize: '14px', outline: 'none', fontFamily: 'DM Sans, sans-serif',
    marginBottom: '14px',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '28px',
        width: '100%', maxWidth: '400px', border: '1px solid #2e2e2e',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Edit Song</h2>

        <label style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>Title</label>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#ff5500'}
          onBlur={e => e.target.style.borderColor = '#333'}
        />

        <label style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>Artist</label>
        <input
          type="text"
          value={artist}
          onChange={e => setArtist(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#ff5500'}
          onBlur={e => e.target.style.borderColor = '#333'}
        />

        {error && <p style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', backgroundColor: '#222', border: '1px solid #333',
              borderRadius: '8px', color: '#aaa', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              flex: 1, padding: '10px', backgroundColor: '#ff5500', border: 'none',
              borderRadius: '8px', color: '#fff', fontWeight: '700', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', opacity: saving ? 0.6 : 1,
            }}
          >{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}