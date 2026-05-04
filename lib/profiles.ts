import { supabase } from './supabase'

export interface Profile {
	id: string
	full_name: string | null
	role: string
	created_at: string
	email_verified: boolean
}

export interface UpdateProfileInput {
	full_name?: string | null
}

export async function getMyProfile(): Promise<Profile | null> {
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser()

	if (userError) {
		throw userError
	}

	if (!user) {
		return null
	}

	const { data, error } = await supabase
		.from('profiles')
		.select('id, full_name, role, created_at, email_verified')
		.eq('id', user.id)
		.maybeSingle()

	if (error) {
		throw error
	}

	return data as Profile | null
}

export async function updateMyProfile(input: UpdateProfileInput): Promise<Profile | null> {
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser()

	if (userError) {
		throw userError
	}

	if (!user) {
		return null
	}

	const { data, error } = await supabase
		.from('profiles')
		.update(input)
		.eq('id', user.id)
		.select('id, full_name, role, created_at, email_verified')
		.maybeSingle()

	if (error) {
		throw error
	}

	return data as Profile | null
}

export async function assertUnauthenticatedCannotAccessProfiles(): Promise<void> {
	await supabase.auth.signOut()

	const { data, error } = await supabase.from('profiles').select('id').limit(1)

	if (error) {
		throw error
	}

	if (data && data.length > 0) {
		throw new Error('Unauthenticated access should not return profile rows.')
	}
}
