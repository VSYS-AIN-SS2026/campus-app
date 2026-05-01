import type { AuthResponse, Session } from '@supabase/supabase-js'

import { supabase } from './supabase'

export async function signUp(email: string, password: string): Promise<AuthResponse['data']> {
	const { data, error } = await supabase.auth.signUp({ email, password })

	if (error) {
		throw error
	}

	return data
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResponse['data']> {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password })

	if (error) {
		throw error
	}

	return data
}

export async function signOut(): Promise<void> {
	const { error } = await supabase.auth.signOut()

	if (error) {
		throw error
	}
}

export async function getSession(): Promise<Session | null> {
	const { data, error } = await supabase.auth.getSession()

	if (error) {
		throw error
	}

	return data.session
}
