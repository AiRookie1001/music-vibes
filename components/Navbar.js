'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const navLink = (href, label) => {
    const active = pathname === href
    return (
      <Link href={href} style={{
        color: active ? '#f2f2f2' : '#888',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: active ? '600' : '400',
        letterSpacing: '0.01em',
        transition: 'color 0.15s',
        paddingBottom: '2px',
        borderBottom: active ? '2px solid #ff5500' : '2px solid transparent',
      }}>
        {label}
      </Link>
    )
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
      backgroundColor: 'rgba(14,14,14,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #1e1e1e',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', zIndex: 100
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '6px',
          background: 'linear-gradient(135deg, #ff5500, #ff8c00)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px'
        }}>🎵</div>
        <span style={{ fontWeight: '700', fontSize: '16px', color: '#f2f2f2', letterSpacing: '-0.3px' }}>
          Music Vibes
        </span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        {navLink('/', 'Songs')}
        {navLink('/playlists', 'Playlists')}
        <Link href="/add-song" style={{
          color: '#000',
          backgroundColor: '#ff5500',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: '700',
          padding: '7px 16px',
          borderRadius: '20px',
          letterSpacing: '0.02em',
          transition: 'background-color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ff7733'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ff5500'}
        >
          + Upload
        </Link>
      </div>
    </nav>
  )
}