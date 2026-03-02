// 'use client'

// import { useState, useEffect, useRef } from 'react'
// import { useRouter } from 'next/navigation'
// import { supabase } from '@/lib/supabase'
// import { useAuth } from '@/context/AuthContext'

// export default function AddToPlaylist({ song }) {
//   const router = useRouter()
//   const { user, displayName } = useAuth()
//   const [open, setOpen]       = useState(false)
//   const [playlists, setPlaylists] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [added, setAdded]     = useState({})          // playlistId → 'added' | 'already'
//   const [newTitle, setNewTitle] = useState('')
//   const [creating, setCreating] = useState(false)
//   const ref = useRef(null)

//   // Close on outside click
//   useEffect(() => {
//     const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
//     if (open) document.addEventListener('mousedown', handler)
//     return () => document.removeEventListener('mousedown', handler)
//   }, [open])

//   async function openDropdown(e) {
//     e.stopPropagation()
//     e.preventDefault()

//     // Guest → send to login
//     if (!user) { router.push('/login?next=/'); return }

//     if (open) { setOpen(false); return }

//     setOpen(true)
//     setLoading(true)
//     // Only show playlists owned by this user
//     const { data } = await supabase
//       .from('playlists')
//       .select('id, title')
//       .eq('user_id', user.id)
//       .order('created_at', { ascending: false })
//     setPlaylists(data || [])
//     setLoading(false)
//   }

//   async function addToPlaylist(playlistId) {
//     // Check duplicate
//     const { count } = await supabase
//       .from('playlist_songs')
//       .select('*', { count: 'exact', head: true })
//       .eq('playlist_id', playlistId)
//       .eq('song_id', song.id)

//     if (count > 0) {
//       setAdded(prev => ({ ...prev, [playlistId]: 'already' }))
//       return
//     }

//     // Get current max order
//     const { count: total } = await supabase
//       .from('playlist_songs')
//       .select('*', { count: 'exact', head: true })
//       .eq('playlist_id', playlistId)

//     const { error } = await supabase.from('playlist_songs').insert({
//       playlist_id: playlistId,
//       song_id: song.id,
//       order: (total || 0) + 1,
//     })

//     if (!error) {
//       setAdded(prev => ({ ...prev, [playlistId]: 'added' }))
//       setTimeout(() => setOpen(false), 800)
//     }
//   }

//   async function createAndAdd() {
//     if (!newTitle.trim() || !user) return
//     setCreating(true)

//     const { data: pl, error } = await supabase
//       .from('playlists')
//       .insert({
//         title: newTitle.trim(),
//         user_id: user.id,
//         is_public: true,
//         creator_name: displayName,
//       })
//       .select()
//       .single()

//     if (pl && !error) {
//       setPlaylists(prev => [pl, ...prev])
//       await addToPlaylist(pl.id)
//       setNewTitle('')
//     }
//     setCreating(false)
//   }

//   const btnStyle = {
//     background: 'rgba(0,0,0,0.65)',
//     border: '1px solid rgba(255,255,255,0.15)',
//     borderRadius: '6px',
//     color: '#fff',
//     cursor: 'pointer',
//     width: '28px', height: '28px',
//     fontSize: '18px', fontWeight: '300',
//     display: 'flex', alignItems: 'center', justifyContent: 'center',
//     backdropFilter: 'blur(4px)',
//     transition: 'background 0.15s',
//     flexShrink: 0,
//   }

//   return (
//     <div ref={ref} style={{ position: 'relative' }}>
//       <button onClick={openDropdown} title="Add to playlist" style={btnStyle}>+</button>

//       {open && (
//         <div
//           onClick={e => e.stopPropagation()}
//           style={{
//             position: 'absolute',
//             top: '36px', right: 0,
//             backgroundColor: '#1e1e1e',
//             border: '1px solid #2e2e2e',
//             borderRadius: '10px',
//             width: '220px',
//             zIndex: 400,
//             boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
//             overflow: 'hidden',
//           }}
//         >
//           {/* Header */}
//           <div style={{ padding: '10px 14px', borderBottom: '1px solid #2a2a2a' }}>
//             <p style={{ fontSize: '11px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
//               Add to Playlist
//             </p>
//           </div>

//           {/* Quick-create */}
//           <div style={{ padding: '8px', borderBottom: '1px solid #2a2a2a', display: 'flex', gap: '6px' }}>
//             <input
//               type="text"
//               placeholder="New playlist…"
//               value={newTitle}
//               onChange={e => setNewTitle(e.target.value)}
//               onKeyDown={e => e.key === 'Enter' && createAndAdd()}
//               style={{
//                 flex: 1, padding: '7px 10px',
//                 backgroundColor: '#111',
//                 border: '1px solid #333', borderRadius: '6px',
//                 color: '#f2f2f2', fontSize: '12px', outline: 'none',
//               }}
//             />
//             <button
//               onClick={createAndAdd}
//               disabled={!newTitle.trim() || creating}
//               style={{
//                 padding: '7px 10px',
//                 backgroundColor: '#ff5500', border: 'none',
//                 borderRadius: '6px', color: '#fff',
//                 fontSize: '13px', fontWeight: '700',
//                 cursor: !newTitle.trim() ? 'not-allowed' : 'pointer',
//                 opacity: !newTitle.trim() ? 0.4 : 1,
//               }}
//             >+</button>
//           </div>

//           {/* Existing playlists */}
//           <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
//             {loading ? (
//               <p style={{ padding: '14px', color: '#555', fontSize: '12px', textAlign: 'center' }}>Loading…</p>
//             ) : playlists.length === 0 ? (
//               <p style={{ padding: '14px', color: '#555', fontSize: '12px', textAlign: 'center' }}>No playlists yet</p>
//             ) : playlists.map(pl => {
//               const state = added[pl.id]
//               return (
//                 <button
//                   key={pl.id}
//                   onClick={() => addToPlaylist(pl.id)}
//                   style={{
//                     width: '100%', padding: '10px 14px',
//                     background: 'none', border: 'none',
//                     cursor: state === 'already' ? 'default' : 'pointer',
//                     textAlign: 'left',
//                     color: state === 'added' ? '#69db7c' : state === 'already' ? '#555' : '#f2f2f2',
//                     fontSize: '13px',
//                     display: 'flex', justifyContent: 'space-between', alignItems: 'center',
//                     transition: 'background 0.1s',
//                   }}
//                   onMouseEnter={e => { if (state !== 'already') e.currentTarget.style.backgroundColor = '#2a2a2a' }}
//                   onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
//                 >
//                   <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//                     {pl.title}
//                   </span>
//                   <span style={{ fontSize: '11px', color: state === 'added' ? '#69db7c' : '#555', flexShrink: 0, marginLeft: 8 }}>
//                     {state === 'added' ? '✓ Added' : state === 'already' ? 'Already in' : ''}
//                   </span>
//                 </button>
//               )
//             })}
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom' // 1. Import createPortal
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function AddToPlaylist({ song }) {
  const router = useRouter()
  const { user, displayName } = useAuth()
  const [open, setOpen] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState({})
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  
  // 2. Track position of the button
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = e => {
      // If clicking outside the dropdown AND the button, close it
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && 
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function openDropdown(e) {
    e.stopPropagation()
    if (!user) { router.push('/login?next=/'); return }
    if (open) { setOpen(false); return }

    // 3. Calculate exactly where the button is on the screen
    const rect = buttonRef.current.getBoundingClientRect()
    setCoords({
      top: rect.bottom + window.scrollY, // Position right below the button
      left: rect.right - 220 + window.scrollX // Align right edge with button
    })

    setOpen(true)
    setLoading(true)
    const { data } = await supabase
      .from('playlists')
      .select('id, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPlaylists(data || [])
    setLoading(false)
  }

  // ... (Keep your addToPlaylist and createAndAdd functions the same)
  async function addToPlaylist(playlistId) {
    const { count } = await supabase.from('playlist_songs').select('*', { count: 'exact', head: true }).eq('playlist_id', playlistId).eq('song_id', song.id)
    if (count > 0) { setAdded(prev => ({ ...prev, [playlistId]: 'already' })); return }
    const { count: total } = await supabase.from('playlist_songs').select('*', { count: 'exact', head: true }).eq('playlist_id', playlistId)
    const { error } = await supabase.from('playlist_songs').insert({ playlist_id: playlistId, song_id: song.id, order: (total || 0) + 1 })
    if (!error) { setAdded(prev => ({ ...prev, [playlistId]: 'added' })); setTimeout(() => setOpen(false), 800) }
  }

  async function createAndAdd() {
    if (!newTitle.trim() || !user) return
    setCreating(true)
    const { data: pl, error } = await supabase.from('playlists').insert({ title: newTitle.trim(), user_id: user.id, is_public: true, creator_name: displayName }).select().single()
    if (pl && !error) { setPlaylists(prev => [pl, ...prev]); await addToPlaylist(pl.id); setNewTitle('') }
    setCreating(false)
  }

  const btnStyle = {
    background: 'rgba(0,0,0,0.65)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    width: '28px', height: '28px',
    fontSize: '18px', fontWeight: '300',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    transition: 'background 0.15s',
  }

  return (
    <>
      {/* The trigger button stays in the card */}
      <button 
        ref={buttonRef} 
        onClick={openDropdown} 
        style={btnStyle}
      >+</button>

      {/* 4. The Dropdown is rendered into a Portal (end of body) */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: `${coords.top + 8}px`, // 8px gap
            left: `${coords.left}px`,
            backgroundColor: '#1e1e1e',
            border: '1px solid #2e2e2e',
            borderRadius: '10px',
            width: '220px',
            zIndex: 9999, // Ensure it's above everything
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #2a2a2a' }}>
            <p style={{ fontSize: '11px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Add to Playlist
            </p>
          </div>

          <div style={{ padding: '8px', borderBottom: '1px solid #2a2a2a', display: 'flex', gap: '6px' }}>
            <input
              type="text" placeholder="New playlist…" value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createAndAdd()}
              style={{ flex: 1, padding: '7px 10px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: '#f2f2f2', fontSize: '12px', outline: 'none' }}
            />
            <button onClick={createAndAdd} disabled={!newTitle.trim() || creating} style={{ padding: '7px 10px', backgroundColor: '#ff5500', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>+</button>
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ padding: '14px', color: '#555', fontSize: '12px', textAlign: 'center' }}>Loading…</p>
            ) : playlists.length === 0 ? (
              <p style={{ padding: '14px', color: '#555', fontSize: '12px', textAlign: 'center' }}>No playlists yet</p>
            ) : playlists.map(pl => {
              const state = added[pl.id]
              return (
                <button
                  key={pl.id}
                  onClick={() => addToPlaylist(pl.id)}
                  style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: state === 'added' ? '#69db7c' : '#f2f2f2', fontSize: '13px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                >
                  {pl.title}
                  <span style={{ fontSize: '11px', color: '#555' }}>{state === 'added' ? '✓' : ''}</span>
                </button>
              )
            })}
          </div>
        </div>,
        document.body // This sends it to the body tag
      )}
    </>
  )
}