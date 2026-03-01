import './globals.css'
import Navbar from '@/components/Navbar'
import AudioPlayer from '@/components/AudioPlayer'
import { AudioProvider } from '@/context/AudioContext'

export const metadata = {
  title: 'Music Vibes',
  description: 'Your personal music player',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AudioProvider>
          <Navbar />
          <main style={{ paddingBottom: '90px', paddingTop: '60px' }}>
            {children}
          </main>
          <AudioPlayer />
        </AudioProvider>
      </body>
    </html>
  )
}