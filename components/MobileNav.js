'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import styles from './MobileNav.module.css'

export default function MobileNav() {
  const path = usePathname()
  const { user, avatarUrl, initials } = useAuth()

  // ── Tabs always visible ──────────────────────────────────
  const baseTabs = [
    {
      key: 'discover',
      href: '/',
      label: 'Discover',
      active: path === '/',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      ),
    },
    {
      key: 'playlists',
      href: '/playlists',
      label: 'Playlists',
      active: path.startsWith('/playlists'),
      icon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6"  x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6"  x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      ),
    },
    // Centre upload button — always /add-song.
    // proxy.js intercepts and redirects guests to /login?next=/add-song
    {
      key: 'upload',
      href: '/add-song',
      label: null,
      active: path === '/add-song',
      isUpload: true,
      icon: () => (
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff5500, #ff8c00)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(255,85,0,0.45)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      ),
    },
  ]

  // ── Tabs only for logged-in users ────────────────────────
  const authTabs = [
    {
      key: 'liked',
      href: '/liked',
      label: 'Liked',
      active: path === '/liked',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill={active ? '#ff5500' : 'none'}
          stroke={active ? '#ff5500' : 'currentColor'}
          strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
    },
    {
      key: 'profile',
      href: '/profile',
      label: 'Profile',
      active: path === '/profile',
      icon: () => avatarUrl
        ? <img src={avatarUrl} alt="" style={{
            width: 26, height: 26, borderRadius: '50%', objectFit: 'cover',
            border: path === '/profile' ? '2px solid var(--accent)' : '2px solid transparent',
          }} />
        : <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: path === '/profile'
              ? 'linear-gradient(135deg,#ff5500,#ff8c00)'
              : '#333',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: '800', color: '#fff',
          }}>{initials}</div>,
    },
  ]

  // ── Guest sign-in tab ────────────────────────────────────
  const guestSignInTab = {
    key: 'signin',           // unique key — NOT 'upload' or '/login'
    href: '/login',
    label: 'Sign In',
    active: path === '/login',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24"
        fill="none"
        stroke={active ? 'var(--accent)' : 'currentColor'}
        strokeWidth="2">
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
        <polyline points="10,17 15,12 10,7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
    ),
  }

  const tabs = user
    ? [...baseTabs, ...authTabs]
    : [...baseTabs, guestSignInTab]

  return (
    <nav className={styles.nav}>
      {tabs.map(tab => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`${styles.tab} ${tab.active ? styles.activeTab : ''} ${tab.isUpload ? styles.uploadTab : ''}`}
        >
          <div className={styles.icon}>{tab.icon(tab.active)}</div>
          {tab.label && <span className={styles.label}>{tab.label}</span>}
        </Link>
      ))}
    </nav>
  )
}