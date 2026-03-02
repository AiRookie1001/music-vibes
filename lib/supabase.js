import { createBrowserClient } from '@supabase/ssr'

// This is the client-side Supabase client used in all 'use client' components.
// It reads the session cookie automatically via the SSR package.

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)