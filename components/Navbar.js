'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import styles from './Navbar.module.css'

export default function Navbar() {
  const path   = usePathname()
  const router = useRouter()
  const { user, displayName, avatarUrl, initials, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const fn = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    router.push('/')   // stay on home (public) after sign-out
  }

  return (
    <nav className={styles.nav}>

      {/* Logo */}
      <Link href="/" className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
            <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <span className={styles.logoText}>vibes</span>
      </Link>

      {/* Nav links — always visible */}
      <div className={styles.links}>
        <Link href="/"         className={`${styles.link} ${path === '/' ? styles.active : ''}`}>Discover</Link>
        <Link href="/playlists" className={`${styles.link} ${path.startsWith('/playlists') ? styles.active : ''}`}>Playlists</Link>
        {/* These pages are useful only when logged in; hide for guests */}
        {user && (
          <>
            <Link href="/liked"   className={`${styles.link} ${path === '/liked'   ? styles.active : ''}`}>Liked</Link>
            <Link href="/history" className={`${styles.link} ${path === '/history' ? styles.active : ''}`}>History</Link>
          </>
        )}
      </div>

      {/* Right side */}
      <div className={styles.right}>

        {user ? (
          <>
            {/* Upload button — logged-in users */}
            <Link href="/add-song" className={styles.uploadBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Upload
            </Link>

            {/* Avatar + dropdown */}
            <div className={styles.userWrap} ref={menuRef}>
              <button
                className={styles.avatar}
                onClick={() => setMenuOpen(p => !p)}
                title="Account"
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className={styles.avatarImg} />
                  : <span className={styles.avatarInitials}>{initials}</span>
                }
              </button>

              {menuOpen && (
                <div className={styles.userMenu}>
                  <div className={styles.userMenuTop}>
                    <div className={styles.userMenuAvatar}>
                      {avatarUrl
                        ? <img src={avatarUrl} alt="" className={styles.avatarImg} />
                        : <span className={styles.avatarInitials}>{initials}</span>
                      }
                    </div>
                    <div>
                      <p className={styles.userMenuName}>{displayName}</p>
                      <p className={styles.userMenuEmail}>{user.email}</p>
                    </div>
                  </div>

                  <div className={styles.menuDivider} />

                  <Link href="/profile" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                    Profile & Stats
                  </Link>
                  <Link href="/liked" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    Liked Songs
                  </Link>
                  <Link href="/history" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                    </svg>
                    Recently Played
                  </Link>

                  <div className={styles.menuDivider} />

                  <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleSignOut}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                      <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Guest: sign in button */
          <Link href="/login" className={styles.signInBtn}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}