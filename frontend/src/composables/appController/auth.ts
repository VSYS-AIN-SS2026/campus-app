import { onMounted, onUnmounted } from 'vue'
import { magicLinkRedirectTo, supabase, supabaseConfigError } from '../../supabase'
import type { AppControllerState } from './state'

function getTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Development-only auth bypass for local development without Magic Link emails.
 * This function is guarded by environment checks and should never be active in production.
 */
function isAuthBypassEnabled(): boolean {
  // Only enable in development mode with explicit env var
  if (!import.meta.env.DEV) {
    return false
  }
  const bypassEnv = import.meta.env.VITE_AUTH_BYPASS
  return bypassEnv === 'true'
}

/**
 * Log a message only in auth bypass mode
 */
function bypassLog(message: string, ...args: unknown[]) {
  if (isAuthBypassEnabled()) {
    console.log(`[Auth-Bypass] ${message}`, ...args)
  }
}

/**
 * Creates a mock demo user for auth bypass.
 * Uses Demo-User email (alex.beispiel@htwg-konstanz.de) for RPC compatibility.
 */
function createDemoUser(): any {
  return {
    id: 'demo-user-local-dev',
    email: 'alex.beispiel@htwg-konstanz.de',
    user_metadata: {
      first_name: 'Demo',
      last_name: 'User',
      full_name: 'Demo User',
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
  }
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

    // ===================== AUTH-BYPASS-START =====================
    // Development-only bypass: Simulate user login without Magic Link email
    if (isAuthBypassEnabled()) {
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

      // Create demo user with provided name but demo email for RPC compatibility
      const demoUser = createDemoUser()
      demoUser.user_metadata.first_name = normalizedFirstName
      demoUser.user_metadata.last_name = normalizedLastName
      demoUser.user_metadata.full_name = `${normalizedFirstName} ${normalizedLastName}`

      state.currentUser.value = demoUser

      // Log bypass usage
      bypassLog('Demo user logged in:', normalizedFirstName, normalizedLastName)

      state.authSending.value = false
      state.authInfo.value = `Demo-User "${normalizedFirstName} ${normalizedLastName}" geladen (Entwicklungsmodus).`

      // Trigger initial data fetch (with error handling for RLS failures)
      try {
        await deps.fetchInitialData()
      }
      catch (error) {
        console.error('[Auth-Bypass] fetchInitialData error (non-critical):', error)
        // Continue anyway - data loading errors shouldn't block the UI in bypass mode
      }
      return
    }
    // ===================== AUTH-BYPASS-END =====================

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
    // Development-only bypass
    if (isAuthBypassEnabled()) {
      bypassLog('Auth bypass enabled, initializing demo user...')
      const demoUser = createDemoUser()
      state.currentUser.value = demoUser
      state.authLoading.value = false
      try {
        await deps.fetchInitialData()
        bypassLog('Initial data loaded for demo user.')
      }
      catch (error) {
        console.error('[Auth-Bypass] fetchInitialData error (non-critical):', error)
        state.authLoading.value = false
      }
      return
    }

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
      if (state.isWeeklyPreviewMode.value) {
        state.authLoading.value = false
        return
      }

      void initAuth()
    })

    onUnmounted(() => {
      authUnsubscribe?.()
    })
  }

  return {
    bindLifecycle,
    sendMagicLink,
    signOut,
  }
}
