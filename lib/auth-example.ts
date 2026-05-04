import { getSession, signInWithPassword, signOut, signUp } from './auth'
import { getMyProfile, updateMyProfile } from './profiles'

export async function runAuthFlowExample(email: string, password: string): Promise<void> {
	await signUp(email, password)
	await signInWithPassword(email, password)

	const session = await getSession()
	if (!session) {
		throw new Error('No active session after sign-in.')
	}

	const profile = await getMyProfile()
	if (!profile) {
		throw new Error('Profile not found. Check trigger migration and DB state.')
	}

	await updateMyProfile({ full_name: profile.full_name ?? 'New User' })
	await signOut()
}
