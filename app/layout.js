import './globals.css'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'
import AudioPlayer from '@/components/AudioPlayer'
import { AudioProvider } from '@/context/AudioContext'
import { AuthProvider } from '@/context/AuthContext'

export const metadata = {
  title: 'Music Vibes',
  description: 'Your personal music universe',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <AudioProvider>
            <Navbar />
            <main style={{ paddingTop: 'var(--nav-h)', paddingBottom: 'var(--player-h)' }}>
              {children}
            </main>
            <AudioPlayer />
            <MobileNav />
          </AudioProvider>
        </AuthProvider>
      </body>
    </html>
  )
}