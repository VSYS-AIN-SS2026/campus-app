import { supabase } from '../../../../lib/supabase'
import type { StudyProgram } from '../types/studyProgram.types'

export async function getStudyPrograms(): Promise<StudyProgram[]> {
    if (!supabase) {
        throw new Error(
            'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.'
        )
    }

    const { data, error } = await supabase
        .from('study_programs')
        .select('id, faculty_id, code, name, created_at')
        .order('name', { ascending: true })
        .order('code', { ascending: true })

    if (error) {
        console.error('Error fetching study programs:', error)
        throw new Error(error.message)
    }

    return (data ?? []) as StudyProgram[]
}
