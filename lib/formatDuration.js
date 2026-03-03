// lib/formatDuration.js

/**
 * Converts seconds to "m:ss" format.
 * e.g. 207 → "3:27"
 *      65  → "1:05"
 *      null → "--:--"
 */
export function formatDuration(seconds) {
    if (seconds == null || isNaN(seconds)) return '--:--'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }