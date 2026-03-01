import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const API_HOST = "youtube-mp4-mp3-downloader.p.rapidapi.com"
const BASE_URL = `https://${API_HOST}/api/v1`

function getVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export async function POST(request) {
  try {
    // Now accepts title as a required field from the form
    const { youtubeUrl, artist, title } = await request.json()

    if (!youtubeUrl) return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 })
    if (!title?.trim()) return NextResponse.json({ error: 'Song title is required' }, { status: 400 })
    if (!artist?.trim()) return NextResponse.json({ error: 'Artist name is required' }, { status: 400 })

    // 1. Extract video ID
    const videoId = getVideoId(youtubeUrl)
    if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })

    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    // 2. Start conversion
    console.log('Starting MP3 conversion for:', videoId)
    const initRes = await fetch(
      `${BASE_URL}/download?format=mp3&id=${videoId}&audioQuality=256&addInfo=true`,
      {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': API_HOST
        }
      }
    )

    if (!initRes.ok) throw new Error(`Conversion init failed: ${initRes.status}`)
    const initData = await initRes.json()
    if (!initData.success || !initData.progressId) throw new Error('No progressId returned from API')

    const { progressId } = initData
    console.log('Got progressId:', progressId)

    // 3. Poll for completion
    let mp3Url = null
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const pollRes = await fetch(`${BASE_URL}/progress?id=${progressId}`, {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': API_HOST
        }
      })
      const pollData = await pollRes.json()
      console.log(`Poll ${i + 1}:`, pollData.progress)
      if (pollData.finished === true || pollData.progress === 1000) {
        mp3Url = pollData.downloadUrl
        break
      }
    }

    if (!mp3Url) throw new Error('Conversion timed out')

    // 4. Download MP3
    const mp3Res = await fetch(mp3Url)
    if (!mp3Res.ok) throw new Error('Failed to download MP3')
    const mp3Buffer = await mp3Res.arrayBuffer()

    // 5. Upload MP3 to Supabase Storage
    const fileName = `${Date.now()}-${videoId}.mp3`
    const { error: audioError } = await supabase.storage
      .from('audio')
      .upload(fileName, mp3Buffer, { contentType: 'audio/mpeg' })
    if (audioError) throw new Error(`Audio upload failed: ${audioError.message}`)

    const { data: { publicUrl: audioPublicUrl } } = supabase.storage
      .from('audio').getPublicUrl(fileName)

    // 6. Upload thumbnail
    const thumbRes = await fetch(thumbnailUrl)
    const thumbBuffer = await thumbRes.arrayBuffer()
    const thumbFileName = `${Date.now()}-${videoId}.jpg`
    await supabase.storage
      .from('thumbnails')
      .upload(thumbFileName, thumbBuffer, { contentType: 'image/jpeg' })
    const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
      .from('thumbnails').getPublicUrl(thumbFileName)

    // 7. Save to DB — use form title & artist (reliable) not API metadata
    const { data: song, error: dbError } = await supabase
      .from('songs')
      .insert({
        title: title.trim(),
        artist: artist.trim(),
        audio_url: audioPublicUrl,
        thumbnail_url: thumbPublicUrl,
        youtube_url: youtubeUrl
      })
      .select()
      .single()

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`)

    console.log('Song saved:', song.title)
    return NextResponse.json({ success: true, song })

  } catch (err) {
    console.error('add-song error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}