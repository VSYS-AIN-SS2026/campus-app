import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL=https://yemmuitnxoyhxdsbfcfb.supabase.co
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_wU2P-p7BOib7lfTnuWjFSQ_7nekKIa4

export const supabase = createClient(supabaseUrl, supabaseKey)
