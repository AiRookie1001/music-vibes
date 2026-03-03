// app/api/lyrics/route.js
import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN

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

async function scrapePage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })
  if (!res.ok) throw new Error(`Page fetch failed: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // ── Extract lyrics ──────────────────────────────────────────────────────
  const containers = $('[data-lyrics-container="true"]')
  if (containers.length === 0) throw new Error('NO_LYRICS')

  let lyrics = ''
  containers.each((_, el) => {
    $(el).find('br').replaceWith('\n')
    lyrics += $(el).text() + '\n\n'
  })
  lyrics = lyrics.replace(/\n{3,}/g, '\n\n').trim()

  // ── Extract translations from the structured JSON Genius embeds ─────────
  // Genius embeds a __NEXT_DATA__ JSON blob with song metadata including translations
  const translations = []
  
  try {
    const scriptContent = $('script#__NEXT_DATA__').text()
    if (scriptContent) {
      const json = JSON.parse(scriptContent)
      // Walk the JSON to find translation_songs array
      const songData = json?.props?.pageProps?.songPage?.song 
        || json?.props?.pageProps?.song
        || null
      
      const transSongs = songData?.translation_songs ?? []
      for (const ts of transSongs) {
        const langName = ts.language_name || ts.title || ''
        const tsUrl    = ts.url || ''
        if (langName && tsUrl && tsUrl.includes('genius.com')) {
          translations.push({ label: langName, url: tsUrl })
        }
      }
    }
  } catch (_) {
    // JSON parse failed — fall back to targeted link scraping below
  }

  // ── Fallback: scrape the Translations dropdown links if JSON failed ──────
  if (translations.length === 0) {
    // Genius renders translation links inside a specific nav section
    // They always follow the pattern: /[artist-name]-[song-title]-[language]-translation-lyrics
    // We extract them from the page URL pattern relative to the current song slug
    const songSlug = url.split('/').pop().replace('-lyrics', '').replace('lyrics', '')
    
    $('a[href]').each((_, el) => {
      const href  = $(el).attr('href') || ''
      const text  = $(el).text().trim()
      // Must be a genius.com lyrics link AND contain translation/romanization
      if (
        href.startsWith('https://genius.com/') &&
        href.endsWith('-lyrics') &&
        (href.includes('-translation-') || href.includes('-romanization-') || href.includes('-romanisation-')) &&
        text.length > 0 && text.length < 60
      ) {
        if (!translations.find(t => t.url === href)) {
          // Clean up label: remove redundant song/artist info if present
          const cleanLabel = text
            .replace(/translation/i, '')
            .replace(/romanization/i, 'Romanized')
            .replace(/romanisation/i, 'Romanized')
            .replace(/\s+/g, ' ')
            .trim()
          translations.push({ label: cleanLabel || text, url: href })
        }
      }
    })
  }

  return { lyrics, translations }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const directUrl = searchParams.get('url')?.trim()

  // Mode 2: direct URL fetch (translation pages)
  if (directUrl) {
    try {
      const { lyrics, translations } = await scrapePage(directUrl)
      return NextResponse.json({ lyrics, translations, geniusUrl: directUrl })
    } catch (err) {
      const msg = err.message === 'NO_LYRICS' ? 'Lyrics not available' : 'Failed to fetch'
      return NextResponse.json({ error: msg }, { status: 404 })
    }
  }

  // Mode 1: search by artist + title
  const artist = searchParams.get('artist')?.trim()
  const title  = searchParams.get('title')?.trim()
  if (!artist || !title) {
    return NextResponse.json({ error: 'Missing artist or title' }, { status: 400 })
  }

  try {
    const query = encodeURIComponent(`${title} ${artist}`)
    const searchRes = await fetch(`https://api.genius.com/search?q=${query}`, {
      headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
      next: { revalidate: 3600 },
    })
    if (!searchRes.ok) return NextResponse.json({ error: 'Genius search failed' }, { status: 502 })

    const searchData = await searchRes.json()
    const hits = searchData?.response?.hits ?? []
    if (hits.length === 0) return NextResponse.json({ error: 'Song not found' }, { status: 404 })

    const results    = hits.map(h => h.result)
    const originals  = results.filter(r => !isTranslation(r.full_title))
    const artistNorm = normalise(artist)
    const titleNorm  = normalise(title)

    let best = null
    // Best: artist + title match, not a translation
    for (const r of originals) {
      if (
        normalise(r.primary_artist?.name ?? '').includes(artistNorm) &&
        normalise(r.title ?? '').includes(titleNorm)
      ) { best = r; break }
    }
    // Fallback: title match only
    if (!best) for (const r of originals) {
      if (normalise(r.title ?? '').includes(titleNorm)) { best = r; break }
    }
    if (!best && originals.length > 0) best = originals[0]
    if (!best) best = results[0]

    let songUrl   = best.url
    let songTitle = best.full_title
    const thumbnail = best.song_art_image_thumbnail_url ?? null

    // If best result IS a translation (no original found), try to follow back to original
    const bestIsTranslation = isTranslation(best.full_title)

    // Use Genius API to get song details including translations list
    // This is more reliable than scraping
    let apiTranslations = []
    try {
      const songId   = best.id
      const detailRes = await fetch(`https://api.genius.com/songs/${songId}?text_format=plain`, {
        headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
        next: { revalidate: 3600 },
      })
      if (detailRes.ok) {
        const detail = await detailRes.json()
        const transSongs = detail?.response?.song?.translation_songs ?? []
        for (const ts of transSongs) {
          const langName = ts.language_name || ''
          const tsUrl    = ts.url || ''
          if (langName && tsUrl) {
            apiTranslations.push({ label: langName, url: tsUrl })
          }
        }
      }
    } catch (_) {}

    // If we landed on a translation page, try to find and use the original
    if (bestIsTranslation) {
      try {
        const songId    = best.id
        const detailRes2 = await fetch(`https://api.genius.com/songs/${songId}?text_format=plain`, {
          headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
        })
        if (detailRes2.ok) {
          const detail2 = await detailRes2.json()
          const origSong = detail2?.response?.song?.translation_of
          if (origSong?.url) {
            songUrl   = origSong.url
            songTitle = origSong.full_title ?? songTitle
          }
        }
      } catch (_) {}
    }

    const { lyrics, translations: scrapedTrans } = await scrapePage(songUrl)

    // Prefer API translations (accurate), fall back to scraped
    const translations = apiTranslations.length > 0 ? apiTranslations : scrapedTrans

    return NextResponse.json({ lyrics, songTitle, geniusUrl: songUrl, thumbnail, translations })

  } catch (err) {
    if (err.message === 'NO_LYRICS') {
      return NextResponse.json({ error: 'Lyrics not available for this song' }, { status: 404 })
    }
    console.error('[lyrics route]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}