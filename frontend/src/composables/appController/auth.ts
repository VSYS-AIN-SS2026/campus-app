import { onMounted, onUnmounted } from 'vue'
import { authBypassEnabled, magicLinkRedirectTo, supabase, supabaseConfigError } from '../../supabase'
import type { AppControllerState } from './state'

function getTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function createAuthController(
  state: AppControllerState,
  deps: { fetchInitialData: () => Promise<void> }
) {
  const pendingMagicLinkNamesStorageKey = 'pendingMagicLinkNamesByEmail'
  let authUnsubscribe: (() => void) | null = null

  function readPendingMagicLinkNames() {
    const rawValue = localStorage.getItem(pendingMagicLinkNamesStorageKey)

    if (!rawValue) {
      return {} as Record<string, { firstName: string; lastName: string }>
    }

    try {
      const parsedValue = JSON.parse(rawValue) as unknown

      if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        localStorage.removeItem(pendingMagicLinkNamesStorageKey)
        return {} as Record<string, { firstName: string; lastName: string }>
      }

      return parsedValue as Record<string, { firstName: string; lastName: string }>
    }
    catch {
      localStorage.removeItem(pendingMagicLinkNamesStorageKey)
      return {} as Record<string, { firstName: string; lastName: string }>
    }
  }

  function persistPendingMagicLinkName(email: string, firstName: string, lastName: string) {
    const pendingNames = readPendingMagicLinkNames()
    pendingNames[email] = { firstName, lastName }
    localStorage.setItem(pendingMagicLinkNamesStorageKey, JSON.stringify(pendingNames))
  }

  function popPendingMagicLinkName(email: string) {
    const pendingNames = readPendingMagicLinkNames()
    const pendingName = pendingNames[email]

    if (!pendingName) {
      return null
    }

    delete pendingNames[email]

    if (Object.keys(pendingNames).length) {
      localStorage.setItem(pendingMagicLinkNamesStorageKey, JSON.stringify(pendingNames))
    }
    else {
      localStorage.removeItem(pendingMagicLinkNamesStorageKey)
    }

    return pendingName
  }

  function getFullNameFromMetadata(metadata: Record<string, unknown> | null | undefined) {
    if (!metadata) {
      return ''
    }

    const firstName = getTrimmedString(metadata.first_name) || getTrimmedString(metadata.given_name)
    const lastName = getTrimmedString(metadata.last_name) || getTrimmedString(metadata.family_name)

    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }

    return firstName || lastName || getTrimmedString(metadata.full_name) || getTrimmedString(metadata.name)
  }

  async function syncMissingAuthMetadataName(user: any) {
    if (!supabase) {
      return user
    }

    const metadataName = getFullNameFromMetadata(user.user_metadata as Record<string, unknown> | undefined)

    if (metadataName) {
      return user
    }

    const normalizedEmail = user.email?.trim().toLowerCase()

    if (!normalizedEmail) {
      return user
    }

    const pendingName = popPendingMagicLinkName(normalizedEmail)

    if (!pendingName) {
      return user
    }

    const fullName = `${pendingName.firstName} ${pendingName.lastName}`.trim()
    const { data, error } = await supabase.auth.updateUser({
      data: {
        first_name: pendingName.firstName,
        last_name: pendingName.lastName,
        full_name: fullName,
      },
    })

    if (error) {
      persistPendingMagicLinkName(normalizedEmail, pendingName.firstName, pendingName.lastName)
      return user
    }

    return data.user ?? user
  }

  async function sendMagicLink() {
    state.authError.value = null
    state.authInfo.value = null

    if (!supabase) {
      state.authError.value = supabaseConfigError
      return
    }

    const normalizedEmail = state.authEmail.value.trim().toLowerCase()

    if (!normalizedEmail) {
      state.authError.value = 'Bitte gib eine E-Mail-Adresse ein.'
      return
    }

    const normalizedFirstName = state.authFirstName.value.trim()
    const normalizedLastName = state.authLastName.value.trim()

    if (!normalizedFirstName) {
      state.authError.value = 'Bitte gib deinen Vornamen ein.'
      return
    }

    if (!normalizedLastName) {
      state.authError.value = 'Bitte gib deinen Nachnamen ein.'
      return
    }

    state.authSending.value = true

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: magicLinkRedirectTo,
        shouldCreateUser: true,
        data: {
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          full_name: `${normalizedFirstName} ${normalizedLastName}`,
        },
      },
    })

    state.authSending.value = false

    if (error) {
      const details = [error.message, error.code, error.status?.toString()].filter(Boolean).join(' | ')
      state.authError.value = details
        ? `Magic-Link konnte nicht versendet werden: ${details}`
        : 'Magic-Link konnte nicht versendet werden: Unbekannter Supabase-Fehler.'
      return
    }

    persistPendingMagicLinkName(normalizedEmail, normalizedFirstName, normalizedLastName)
    state.authInfo.value = `Magic-Link versendet an ${normalizedEmail}. Öffne die E-Mail und klicke auf den Link.`
  }

  // Development-only: continue as the demo user without a magic link. The
  // *_demo_user_* RPCs are granted to `anon` and key off this fixed e-mail,
  // so the app loads demo data exactly like a normal session would.
  async function continueAsDemoUser() {
    if (!authBypassEnabled) {
      return
    }

    const firstName = state.authFirstName.value.trim() || 'Alex'
    const lastName = state.authLastName.value.trim() || 'Beispiel'

    state.authError.value = null
    state.authInfo.value = null
    state.currentUser.value = {
      id: 'demo-user',
      email: 'alex.beispiel@htwg-konstanz.de',
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      },
    }
    state.authLoading.value = false
    state.loadedUserId.value = null
    await deps.fetchInitialData()
  }

  async function signOut() {
    state.authError.value = null
    state.authInfo.value = null

    if (!supabase) {
      return
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      state.authError.value = 'Abmelden ist fehlgeschlagen.'
      return
    }

    state.currentUser.value = null
    state.resetAppState()
  }

  async function initAuth() {
    if (!supabase) {
      state.authLoading.value = false
      state.authError.value = supabaseConfigError
      return
    }

    const { data, error } = await supabase.auth.getSession()

    if (error) {
      state.authError.value = 'Session konnte nicht geladen werden.'
      state.authLoading.value = false
      return
    }

    const sessionUser = data.session?.user ?? null
    state.currentUser.value = sessionUser ? await syncMissingAuthMetadataName(sessionUser) : null
    state.authLoading.value = false

    if (state.currentUser.value) {
      await deps.fetchInitialData()
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        state.currentUser.value = session?.user ?? null
        state.authError.value = null

        if (state.currentUser.value) {
          state.currentUser.value = await syncMissingAuthMetadataName(state.currentUser.value)
          state.loadedUserId.value = null
          await deps.fetchInitialData()
          return
        }

        state.resetAppState()
      })()
    })

    authUnsubscribe = () => {
      listener.subscription.unsubscribe()
    }
  }

  function bindLifecycle() {
    onMounted(() => {
      void initAuth()
    })

    onUnmounted(() => {
      authUnsubscribe?.()
    })
  }

  return {
    bindLifecycle,
    sendMagicLink,
    continueAsDemoUser,
    signOut,
  }
}
