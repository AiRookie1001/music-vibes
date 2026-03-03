'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './LyricsPanel.module.css'

// ─── Sub-components defined OUTSIDE main component ───────────────────────────
// Critical: if defined inside, they re-create on every render → scroll resets + blinking

function StateBox({ loading, error }) {
  if (loading) return (
    <div className={styles.stateBox}>
      <div className={styles.spinner} />
      <p>Fetching lyrics…</p>
    </div>
  )
  if (error) return (
    <div className={styles.stateBox}>
      <span className={styles.stateIcon}>🎵</span>
      <p>{error}</p>
    </div>
  )
  return null
}

function LyricsBody({ lyrics, loading, error, geniusUrl, label, artist, title }) {
  return (
    <div className={styles.panelInner}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderText}>
          <p className={styles.panelLabel}>{label}</p>
          <p className={styles.panelSong}>{title}</p>
          <p className={styles.panelArtist}>{artist}</p>
        </div>
        {geniusUrl && (
          <a href={geniusUrl} target="_blank" rel="noopener noreferrer"
            className={styles.geniusLink} title="View on Genius">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15,3 21,3 21,9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Genius
          </a>
        )}
      </div>
      <div className={styles.lyricsScroll}>
        <StateBox loading={loading} error={!loading ? error : null} />
        {lyrics && !loading && <pre className={styles.lyricsText}>{lyrics}</pre>}
      </div>
    </div>
  )
}

function LanguagePills({ translations, activeUrl, onSelect }) {
  if (!translations || translations.length === 0) return null
  return (
    <div className={styles.pills}>
      <span className={styles.pillsLabel}>Translations</span>
      <div className={styles.pillsList}>
        {translations.map(t => (
          <button
            key={t.url}
            className={`${styles.pill} ${activeUrl === t.url ? styles.pillActive : ''}`}
            onClick={() => onSelect(t)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LyricsPanel({ artist, title, isOpen, onClose, mode = 'overlay' }) {
  const [lyrics, setLyrics]             = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [geniusUrl, setGeniusUrl]       = useState(null)
  const [translations, setTranslations] = useState([])
  const [lastFetched, setLastFetched]   = useState(null)

  // Translation panel
  const [activeTrans, setActiveTrans]   = useState(null)
  const [transLyrics, setTransLyrics]   = useState(null)
  const [transLoading, setTransLoading] = useState(false)
  const [transError, setTransError]     = useState(null)

  // Mobile: which view is showing
  const [mobileView, setMobileView]     = useState('original')

  // Reset everything when song changes
  useEffect(() => {
    setLastFetched(null)
    setLyrics(null); setError(null); setGeniusUrl(null); setTranslations([])
    setActiveTrans(null); setTransLyrics(null); setTransError(null)
    setMobileView('original')
  }, [artist, title])

  // Fetch original lyrics when panel opens
  useEffect(() => {
    if (!isOpen || !artist || !title) return
    const key = `${artist}||${title}`
    if (key === lastFetched) return

    setLoading(true)
    setLyrics(null); setError(null)
    setLastFetched(key)

    fetch(`/api/lyrics?${new URLSearchParams({ artist, title })}`)
      .then(r => r.json())
      .then(data => {
        if (data.lyrics) {
          setLyrics(data.lyrics)
          setGeniusUrl(data.geniusUrl ?? null)
          setTranslations(data.translations ?? [])
        } else {
          setError(data.error || 'Lyrics not found.')
        }
      })
      .catch(() => setError('Could not load lyrics.'))
      .finally(() => setLoading(false))
  }, [isOpen, artist, title])

  // Fetch a translation by its Genius URL
  const fetchTranslation = useCallback((trans) => {
    // Toggle off
    if (activeTrans?.url === trans.url) {
      setActiveTrans(null); setTransLyrics(null); setTransError(null)
      return
    }
    setActiveTrans(trans)
    setTransLyrics(null); setTransError(null); setTransLoading(true)

    fetch(`/api/lyrics?${new URLSearchParams({ url: trans.url })}`)
      .then(r => r.json())
      .then(data => {
        if (data.lyrics) setTransLyrics(data.lyrics)
        else setTransError(data.error || 'Translation not available.')
      })
      .catch(() => setTransError('Could not load translation.'))
      .finally(() => setTransLoading(false))
  }, [activeTrans])

  if (!isOpen) return null

  // ── INLINE mode (desktop) ─────────────────────────────────────────────────
  if (mode === 'inline') {
    return (
      <div className={styles.inlineWrapper}>
        <button className={styles.inlineClose} onClick={onClose}>✕</button>

        {translations.length > 0 && (
          <div className={styles.inlinePills}>
            <LanguagePills
              translations={translations}
              activeUrl={activeTrans?.url ?? null}
              onSelect={fetchTranslation}
            />
          </div>
        )}

        <div className={`${styles.panelsRow} ${activeTrans ? styles.panelsRowSplit : ''}`}>
          <div className={styles.panel}>
            <LyricsBody
              lyrics={lyrics} loading={loading} error={error}
              geniusUrl={geniusUrl} label="Lyrics"
              artist={artist} title={title}
            />
          </div>

          {activeTrans && (
            <div className={`${styles.panel} ${styles.transPanel}`}>
              <LyricsBody
                lyrics={transLyrics} loading={transLoading} error={transError}
                geniusUrl={activeTrans.url} label={activeTrans.label}
                artist={artist} title={title}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── OVERLAY mode (mobile) ─────────────────────────────────────────────────
  const showOriginal     = mobileView === 'original'
  const activeMobileTrans = translations.find(t => t.url === mobileView)

  function handleMobilePillSelect(trans) {
    // Fetch if not already loaded for this translation
    if (activeTrans?.url !== trans.url) {
      setActiveTrans(trans)
      setTransLyrics(null); setTransError(null); setTransLoading(true)
      fetch(`/api/lyrics?${new URLSearchParams({ url: trans.url })}`)
        .then(r => r.json())
        .then(data => {
          if (data.lyrics) setTransLyrics(data.lyrics)
          else setTransError(data.error || 'Not available.')
        })
        .catch(() => setTransError('Could not load.'))
        .finally(() => setTransLoading(false))
    }
    setMobileView(trans.url)
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.overlaySheet} onClick={e => e.stopPropagation()}>

        <div className={styles.overlayHeader}>
          {!showOriginal && (
            <button className={styles.overlayBack}
              onClick={() => setMobileView('original')}>← Back</button>
          )}
          <div className={styles.overlayHeaderText}>
            <p className={styles.panelLabel}>
              {showOriginal ? 'Lyrics' : (activeMobileTrans?.label ?? 'Translation')}
            </p>
            <p className={styles.panelSong}>{title}</p>
          </div>
          <div className={styles.overlayHeaderRight}>
            {geniusUrl && showOriginal && (
              <a href={geniusUrl} target="_blank" rel="noopener noreferrer"
                className={styles.geniusLink}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15,3 21,3 21,9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {showOriginal && translations.length > 0 && (
          <LanguagePills
            translations={translations}
            activeUrl={mobileView !== 'original' ? mobileView : null}
            onSelect={handleMobilePillSelect}
          />
        )}

        <div className={styles.overlayBody}>
          {showOriginal ? (
            <>
              <StateBox loading={loading} error={!loading ? error : null} />
              {lyrics && !loading && <pre className={styles.lyricsText}>{lyrics}</pre>}
            </>
          ) : (
            <>
              <StateBox loading={transLoading} error={!transLoading ? transError : null} />
              {transLyrics && !transLoading && <pre className={styles.lyricsText}>{transLyrics}</pre>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}