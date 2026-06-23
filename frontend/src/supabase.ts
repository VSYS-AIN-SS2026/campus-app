import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const configuredRedirectUrl = import.meta.env.VITE_MAGIC_LINK_REDIRECT_URL?.trim()

// Use the explicitly configured redirect URL when provided, otherwise fall back
// to the current origin (works for localhost, 127.0.0.1 and production alike).
export const magicLinkRedirectTo = configuredRedirectUrl || window.location.origin

// Development-only login bypass. Set VITE_AUTH_BYPASS=true in frontend/.env.local
// to skip the magic link and continue as the demo user. The `import.meta.env.DEV`
// guard ensures this is dead code (tree-shaken away) in production builds.
export const authBypassEnabled =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true'

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
