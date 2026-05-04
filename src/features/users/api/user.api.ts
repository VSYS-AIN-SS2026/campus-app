import { supabase } from '../../../../lib/supabase'
import type { UserProfile } from '../types/user.types'

export const DEMO_USER_EMAIL = 'alex.beispiel@htwg-konstanz.de'
export const DEMO_USER_NAME = 'Alex Beispiel'

function ensureSupabase() {
    if (!supabase) {
        throw new Error(
            'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.'
        )
    }

    return supabase
}

export async function getDemoUserProfile(): Promise<UserProfile | null> {
    const client = ensureSupabase()

    const { data, error } = await client
        .rpc('get_demo_user_profile')
        .maybeSingle()

    if (error) {
        console.error('Error fetching demo user profile:', error)
        throw new Error('User profile could not be loaded.')
    }

    return (data ?? null) as UserProfile | null
}

export async function upsertDemoUserProfileSelection({
    studyProgramId,
    spoId,
}: {
    studyProgramId: string | null
    spoId: string | null
}): Promise<UserProfile> {
    const client = ensureSupabase()

    const { data, error } = await client
        .rpc('save_demo_user_profile_selection', {
            selected_spo_id: spoId,
            selected_study_program_id: studyProgramId,
        })
        .single()

    if (error) {
        console.error('Error saving demo user profile selection:', error)
        throw new Error('User profile could not be saved.')
    }

    return data as UserProfile
}
