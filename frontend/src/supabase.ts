import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabaseConfigError = !supabaseUrl || !supabaseKey
  ? 'Supabase ist lokal nicht konfiguriert. Lege frontend/.env.local mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY an.'
  : null

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseKey)
