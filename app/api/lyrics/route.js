// app/api/lyrics/route.js
// Strategy:
//   1. Supabase cache  → instant return if lyrics already fetched before (any user)
//   2. Genius API      → song search, translation list, original-song follow
//   3. ScraperAPI      → proxy the Genius page fetch (bypasses 403 on Vercel)
//   4. cheerio         → scrape lyrics from proxied HTML
//   5. Save to cache   → stored in songs.lyrics so next request is instant from DB

export const maxDuration = 30

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const GENIUS_TOKEN     = process.env.GENIUS_ACCESS_TOKEN
const SCRAPER_API_KEY  = process.env.SCRAPER_API_KEY

// Service role client — needed to write lyrics back to DB server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SKIP_PATTERNS = [
  /translation/i, /translated/i,
  /romanized/i,   /romanised/i,
  /english version/i, /english lyrics/i,
  /\(english\)/i,
]
function isTranslation(title) {
  return SKIP_PATTERNS.some(p => p.test(title))
}
const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()

// ── Scrape a Genius page via ScraperAPI proxy ─────────────────────────────────
async function scrapeGeniusPage(geniusUrl) {
  const proxiedUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(geniusUrl)}`
  const res = await fetch(proxiedUrl, { signal: AbortSignal.timeout(25000) })
  if (!res.ok) throw new Error(`ScraperAPI fetch failed: ${res.status}`)

  const html = await res.text()
  const $    = cheerio.load(html)

  const containers = $('[data-lyrics-container="true"]')
  if (containers.length === 0) throw new Error('NO_LYRICS')

  let lyrics = ''
  containers.each((_, el) => {
    $(el).find('br').replaceWith('\n')
    lyrics += $(el).text() + '\n\n'
  })
  return lyrics.replace(/\n{3,}/g, '\n\n').trim()
}

// ── Genius API: song detail (translations + original follow) ──────────────────
async function getGeniusSongDetail(songId) {
  try {
    const res = await fetch(`https://api.genius.com/songs/${songId}?text_format=plain`, {
      headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.response?.song ?? null
  } catch {
    return null
  }
}

// ═════════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const directUrl = searchParams.get('url')?.trim()

  // ── Mode 2: translation by direct Genius URL ──────────────────────────────
  if (directUrl) {
    try {
      const lyrics = await scrapeGeniusPage(directUrl)
      return NextResponse.json({ lyrics, translations: [], geniusUrl: directUrl })
    } catch {
      return NextResponse.json({ error: 'Lyrics not available for this translation' }, { status: 404 })
    }
  }

  // ── Mode 1: search by artist + title ─────────────────────────────────────
  const artist = searchParams.get('artist')?.trim()
  const title  = searchParams.get('title')?.trim()
  if (!artist || !title) {
    return NextResponse.json({ error: 'Missing artist or title' }, { status: 400 })
  }

  try {
    // ── Step 1: Check Supabase cache first ───────────────────────────────────
    const { data: cached } = await supabase
      .from('songs')
      .select('lyrics')
      .ilike('title', title)
      .ilike('artist', `%${artist}%`)
      .not('lyrics', 'is', null)
      .maybeSingle()

    if (cached?.lyrics) {
      return NextResponse.json({ lyrics: cached.lyrics, translations: [], fromCache: true })
    }

    // ── Step 2: Search Genius API ─────────────────────────────────────────────
    const query     = encodeURIComponent(`${title} ${artist}`)
    const searchRes = await fetch(`https://api.genius.com/search?q=${query}`, {
      headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!searchRes.ok) return NextResponse.json({ error: 'Genius search failed' }, { status: 502 })

    const hits = (await searchRes.json())?.response?.hits ?? []
    if (hits.length === 0) return NextResponse.json({ error: 'Song not found on Genius' }, { status: 404 })

    // ── Step 3: Pick best result ──────────────────────────────────────────────
    const results    = hits.map(h => h.result)
    const originals  = results.filter(r => !isTranslation(r.full_title))
    const artistNorm = normalise(artist)
    const titleNorm  = normalise(title)

    let best = null
    for (const r of originals) {
      if (
        normalise(r.primary_artist?.name ?? '').includes(artistNorm) &&
        normalise(r.title ?? '').includes(titleNorm)
      ) { best = r; break }
    }
    if (!best) for (const r of originals) {
      if (normalise(r.title ?? '').includes(titleNorm)) { best = r; break }
    }
    if (!best && originals.length > 0) best = originals[0]
    if (!best) best = results[0]

    let songUrl   = best.url
    let songTitle = best.full_title

    // ── Step 4: Get translations + follow back to original if needed ──────────
    const detail       = await getGeniusSongDetail(best.id)
    const translations = (detail?.translation_songs ?? [])
      .filter(ts => ts.url && ts.language_name)
      .map(ts => ({ label: ts.language_name, url: ts.url }))

    if (isTranslation(best.full_title) && detail?.translation_of?.url) {
      songUrl   = detail.translation_of.url
      songTitle = detail.translation_of.full_title ?? songTitle
    }

    // ── Step 5: Scrape lyrics via ScraperAPI ──────────────────────────────────
    const lyrics = await scrapeGeniusPage(songUrl)

    // ── Step 6: Save to Supabase cache ────────────────────────────────────────
    // Fire-and-forget — don't await, don't block the response
    supabase
      .from('songs')
      .update({ lyrics })
      .ilike('title', title)
      .ilike('artist', `%${artist}%`)
      .then(() => {}) // silence unhandled promise warning

    return NextResponse.json({ lyrics, songTitle, geniusUrl: songUrl, translations })

  } catch (err) {
    if (err.message === 'NO_LYRICS') {
      return NextResponse.json({ error: 'Lyrics not available for this song' }, { status: 404 })
    }
    console.error('[lyrics route]', err.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}