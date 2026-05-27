import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const configuredRedirectUrl = import.meta.env.VITE_MAGIC_LINK_REDIRECT_URL?.trim()

// In development: dynamisch die aktuelle URL nutzen (localhost, 127.0.0.1, etc.)
// In production: explizite URL verwenden oder window.location.origin fallback
const inferredRedirectUrl =
  import.meta.env.DEV
    ? window.location.origin
    : window.location.origin

export const magicLinkRedirectTo = configuredRedirectUrl || inferredRedirectUrl

export const supabaseConfigError = !supabaseUrl || !supabaseKey
  ? 'Supabase ist lokal nicht konfiguriert. Lege frontend/.env.local mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY an.'
  : null

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
