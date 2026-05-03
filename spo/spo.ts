import { supabase } from "../lib/supabase"

const { data, error } = await supabase
    .from('students')
    .select('*')

if (error) {
    console.error('Error fetching students:', error)
} else {
    console.log('Students:', data)
}