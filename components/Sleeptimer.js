'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './Sleeptimer.module.css'

const PRESETS = [
  { label: '5 min', seconds: 5 * 60 },
  { label: '15 min', seconds: 15 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
  { label: '2 hours', seconds: 120 * 60 },
]

export default function SleepTimer({ sleepRemaining, setSleepRemaining }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ bottom: 0, left: 0 })
  const btnRef = useRef(null)
  const dropdownRef = useRef(null)

  const active = sleepRemaining !== null

  // Close on outside click
  useEffect(() => {
    if (!open) return

    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggleOpen(e) {
    e.stopPropagation()

    if (open) {
      setOpen(false)
      return
    }

    // Position dropdown above the button
    const rect = btnRef.current.getBoundingClientRect()
    setCoords({
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left + rect.width / 2 - 104, // center 208px dropdown
    })
    setOpen(true)
  }

  function selectPreset(seconds) {
    setSleepRemaining(seconds)
    setOpen(false)
  }

  function cancelTimer() {
    setSleepRemaining(null)
    setOpen(false)
  }

  const fmt = (s) => {
    if (s === null || s === undefined) return ''
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <>
      {/* Trigger button */}
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className={`${styles.timerBtn} ${active ? styles.timerBtnActive : ''}`}
        title={active ? `Sleep in ${fmt(sleepRemaining)}` : 'Sleep Timer'}
      >
        <span className={styles.icon}>🌙</span>
        {active && <span className={styles.countdown}>{fmt(sleepRemaining)}</span>}
      </button>

      {/* Portal dropdown */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            onClick={(e) => e.stopPropagation()}
            className={styles.portal}
            style={{
              bottom: `${coords.bottom}px`,
              left: `${Math.max(8, Math.min(coords.left, window.innerWidth - 216))}px`,
            }}
          >
            {/* Header */}
            <div className={styles.portalHeader}>
              <span className={styles.portalTitle}>Sleep Timer</span>
              {active && (
                <span className={styles.portalCountdown}>{fmt(sleepRemaining)} left</span>
              )}
            </div>

            {/* Presets */}
            <div className={styles.presets}>
              {PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => selectPreset(p.seconds)}
                  className={`${styles.presetBtn} ${
                    sleepRemaining === p.seconds ? styles.presetActive : ''
                  }`}
                >
                  <span>{p.label}</span>
                  {sleepRemaining === p.seconds && <span>✓</span>}
                </button>
              ))}
            </div>

            {/* Cancel */}
            {active && (
              <div className={styles.cancelWrap}>
                <button onClick={cancelTimer} className={styles.cancelBtn}>
                  Cancel Timer
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  )
}