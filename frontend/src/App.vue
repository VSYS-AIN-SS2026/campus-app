<script setup lang="ts">
import type { User } from '@supabase/supabase-js'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { magicLinkRedirectTo, supabase, supabaseConfigError } from './supabase'
import SpoSelector from './components/SpoSelector.vue'
import ModuleList from './components/ModuleList.vue'
import ModuleDrawer from './components/ModuleDrawer.vue'
import type {
  Category,
  ModuleEntry,
  ModuleCategory,
  ModuleHandbook,
  ModuleStatus,
  Spo,
  StudyProgram,
  UserProfile,
} from './types'

type ModuleStatusRow = {
  module_id: string
  status: ModuleStatus
  updated_at: string
}

type ModuleCategoryRow = {
  module_id: string
  category_id: string
  name: string
  color: string
  type: string
}

type ThemeMode = 'light' | 'dark'

let activeModuleRequestId = 0

const THEME_STORAGE_KEY = 'themeMode'

function getInitialThemeMode(): ThemeMode {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return 'light'
}

function applyThemeMode(themeMode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', themeMode)
}

function getStudyProgramLabel(program: StudyProgram) {
  return program.name ? `${program.code} - ${program.name}` : program.code
}

function getSpoLabel(spo: Spo) {
  return spo.valid_from ? `${spo.version_name} · gültig ab ${spo.valid_from}` : spo.version_name
}

function getUniqueSposForStudyProgram(spos: Spo[], studyProgramId: string | null) {
  if (!studyProgramId) {
    return []
  }

  const uniqueSpos = new Map<string, Spo>()

  for (const spo of spos) {
    if (spo.study_program_id !== studyProgramId) {
      continue
    }

    const key = `${spo.version_name.trim().toLowerCase()}::${spo.valid_from ?? ''}`
    const existingSpo = uniqueSpos.get(key)

    if (!existingSpo) {
      uniqueSpos.set(key, spo)
    }
  }

  return Array.from(uniqueSpos.values())
}

function beginModuleRequest() {
  activeModuleRequestId += 1
  return activeModuleRequestId
}

function isActiveModuleRequest(requestId: number) {
  return requestId === activeModuleRequestId
}

// --- raw data from DB ---
const studyPrograms = ref<StudyProgram[]>([])
const allSpos = ref<Spo[]>([])
const allHandbooks = ref<ModuleHandbook[]>([])
const allCategories = ref<Category[]>([])
const demoUserProfile = ref<UserProfile | null>(null)

// --- selection state ---
const selectedStudyProgramId = ref<string | null>(localStorage.getItem('selectedStudyProgramId') || null)
const selectedSpoId = ref<string | null>(localStorage.getItem('selectedSpoId') || null)

// --- modules ---
const modules = ref<ModuleEntry[]>([])
const selectedModule = ref<ModuleEntry | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const moduleStatusError = ref<string | null>(null)
const categoryError = ref<string | null>(null)
const savingModuleId = ref<string | null>(null)
const savingCategoryModuleId = ref<string | null>(null)
const profileError = ref<string | null>(null)
const profileInfo = ref<string | null>(null)
const profileSaving = ref(false)
const restoringProfileSelection = ref(false)
const authLoading = ref(true)
const authSending = ref(false)
const authEmail = ref('')
const authFirstName = ref('')
const authLastName = ref('')
const authError = ref<string | null>(null)
const authInfo = ref<string | null>(null)
const currentUser = ref<User | null>(null)
const loadedUserId = ref<string | null>(null)
const pendingMagicLinkNamesStorageKey = 'pendingMagicLinkNamesByEmail'

let authUnsubscribe: (() => void) | null = null

// --- dropdown items ---
const studyProgramItems = computed(() =>
  studyPrograms.value.map(program => ({ id: program.id, label: getStudyProgramLabel(program) }))
)

const availableSpos = computed(() => getUniqueSposForStudyProgram(allSpos.value, selectedStudyProgramId.value))

const spoItems = computed(() =>
  availableSpos.value.map(spo => ({ id: spo.id, label: getSpoLabel(spo) }))
)

const savedStudyProgram = computed(() =>
  studyPrograms.value.find(program => program.id === demoUserProfile.value?.study_program_id) ?? null
)

const savedSpo = computed(() =>
  allSpos.value.find(spo => spo.id === demoUserProfile.value?.spo_id) ?? null
)

const selectionDirty = computed(() =>
  (selectedStudyProgramId.value ?? null) !== (demoUserProfile.value?.study_program_id ?? null)
  || (selectedSpoId.value ?? null) !== (demoUserProfile.value?.spo_id ?? null)
)
const canEditModuleStatuses = computed(() =>
  !selectionDirty.value && !!demoUserProfile.value?.spo_id
)
const currentUserEmail = computed(() => currentUser.value?.email ?? '')
function getTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readPendingMagicLinkNames() {
  const rawValue = localStorage.getItem(pendingMagicLinkNamesStorageKey)

  if (!rawValue) {
    return {} as Record<string, { firstName: string, lastName: string }>
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      localStorage.removeItem(pendingMagicLinkNamesStorageKey)
      return {} as Record<string, { firstName: string, lastName: string }>
    }

    return parsedValue as Record<string, { firstName: string, lastName: string }>
  }
  catch {
    localStorage.removeItem(pendingMagicLinkNamesStorageKey)
    return {} as Record<string, { firstName: string, lastName: string }>
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

async function syncMissingAuthMetadataName(user: User) {
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
  const { data, error: updateError } = await supabase.auth.updateUser({
    data: {
      first_name: pendingName.firstName,
      last_name: pendingName.lastName,
      full_name: fullName,
    },
  })

  if (updateError) {
    persistPendingMagicLinkName(normalizedEmail, pendingName.firstName, pendingName.lastName)
    return user
  }

  return data.user ?? user
}

const currentUserFullName = computed(() => {
  const metadataName = getFullNameFromMetadata(currentUser.value?.user_metadata as Record<string, unknown> | undefined)

  if (metadataName) {
    return metadataName
  }

  const identityName = getFullNameFromMetadata(
    currentUser.value?.identities?.[0]?.identity_data as Record<string, unknown> | undefined
  )

  return identityName
})
const profileName = computed(() =>
  currentUserFullName.value || demoUserProfile.value?.full_name?.trim() || currentUserEmail.value || 'Student'
)

function clearSelectionMessages() {
  profileError.value = null
  profileInfo.value = null
}

function resetAppState() {
  studyPrograms.value = []
  allSpos.value = []
  allHandbooks.value = []
  demoUserProfile.value = null
  modules.value = []
  selectedModule.value = null
  loading.value = false
  error.value = null
  moduleStatusError.value = null
  profileError.value = null
  profileInfo.value = null
  profileSaving.value = false
  savingModuleId.value = null
  loadedUserId.value = null
}

async function sendMagicLink() {
  authError.value = null
  authInfo.value = null

  if (!supabase) {
    authError.value = supabaseConfigError
    return
  }

  const normalizedEmail = authEmail.value.trim().toLowerCase()

  if (!normalizedEmail) {
    authError.value = 'Bitte gib eine E-Mail-Adresse ein.'
    return
  }

  const normalizedFirstName = authFirstName.value.trim()
  const normalizedLastName = authLastName.value.trim()

  if (!normalizedFirstName) {
    authError.value = 'Bitte gib deinen Vornamen ein.'
    return
  }

  if (!normalizedLastName) {
    authError.value = 'Bitte gib deinen Nachnamen ein.'
    return
  }

  authSending.value = true

  const { error: err } = await supabase.auth.signInWithOtp({
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

  authSending.value = false

  if (err) {
    const details = [err.message, err.code, err.status?.toString()].filter(Boolean).join(' | ')
    authError.value = details
      ? `Magic-Link konnte nicht versendet werden: ${details}`
      : 'Magic-Link konnte nicht versendet werden: Unbekannter Supabase-Fehler.'
    return
  }

  persistPendingMagicLinkName(normalizedEmail, normalizedFirstName, normalizedLastName)
  authInfo.value = `Magic-Link versendet an ${normalizedEmail}. Öffne die E-Mail und klicke auf den Link.`
}

async function signOut() {
  authError.value = null
  authInfo.value = null

  if (!supabase) {
    return
  }

  const { error: err } = await supabase.auth.signOut()

  if (err) {
    authError.value = 'Abmelden ist fehlgeschlagen.'
    return
  }

  currentUser.value = null
  resetAppState()
}

function setModuleStatus(moduleId: string, status: ModuleStatus) {
  const module = modules.value.find(entry => entry.id === moduleId)
  if (!module) return
  module.module_status = status
}

function setModuleCategories(moduleId: string, categories: Category[]) {
  const module = modules.value.find(entry => entry.id === moduleId)
  if (!module) return
  module.categories = categories
}

function applyModuleStatuses(statusRows: ModuleStatusRow[]) {
  const statusMap = new Map(statusRows.map(row => [row.module_id, row.status]))

  for (const module of modules.value) {
    module.module_status = statusMap.get(module.id) ?? 'offen'
  }
}

function applyModuleCategories(categoryRows: ModuleCategoryRow[]) {
  const categoryMap = new Map<string, Category[]>()

  for (const row of categoryRows) {
    const categories = categoryMap.get(row.module_id) ?? []
    categories.push({
      id: row.category_id,
      name: row.name,
      color: row.color,
      type: row.type,
    })
    categoryMap.set(row.module_id, categories)
  }

  for (const module of modules.value) {
    module.categories = categoryMap.get(module.id) ?? []
  }
}

async function fetchModuleStatuses(moduleIds: string[], requestId: number) {
  moduleStatusError.value = null

  if (!supabase) {
    moduleStatusError.value = supabaseConfigError
    return
  }

  if (!moduleIds.length || !isActiveModuleRequest(requestId)) {
    return
  }

  const { data, error: err } = await supabase.rpc('get_demo_user_module_statuses', {
    selected_module_ids: moduleIds,
  })

  if (!isActiveModuleRequest(requestId)) {
    return
  }

  if (err) {
    moduleStatusError.value = 'Der Modulstatus konnte nicht geladen werden.'
    return
  }

  applyModuleStatuses((data ?? []) as ModuleStatusRow[])
}

async function fetchModuleCategories(moduleIds: string[], requestId: number) {
  categoryError.value = null

  if (!supabase) {
    categoryError.value = supabaseConfigError
    return
  }

  if (!moduleIds.length || !isActiveModuleRequest(requestId)) {
    return
  }

  const { data, error: err } = await supabase.rpc('get_module_categories', {
    selected_module_ids: moduleIds,
  })

  if (!isActiveModuleRequest(requestId)) {
    return
  }

  if (err) {
    categoryError.value = 'Die Modulkategorien konnten nicht geladen werden.'
    return
  }

  applyModuleCategories((data ?? []) as ModuleCategoryRow[])
}

async function saveModuleStatus(moduleId: string, status: ModuleStatus) {
  if (!supabase) {
    moduleStatusError.value = supabaseConfigError
    return
  }

  if (!canEditModuleStatuses.value) {
    moduleStatusError.value = 'Speichere zuerst Studiengang und SPO im Demo-Profil, bevor du Modulstatus änderst.'
    return
  }

  if (savingModuleId.value) {
    return
  }

  const currentModule = modules.value.find(entry => entry.id === moduleId)
  if (!currentModule || currentModule.module_status === status) {
    return
  }

  const previousStatus = currentModule.module_status
  moduleStatusError.value = null
  savingModuleId.value = moduleId
  setModuleStatus(moduleId, status)

  const { data, error: err } = await supabase
    .rpc('save_demo_user_module_status', {
      selected_module_id: moduleId,
      selected_status: status,
    })
    .single()

  savingModuleId.value = null

  if (err) {
    setModuleStatus(moduleId, previousStatus)
    moduleStatusError.value = 'Der Modulstatus konnte nicht gespeichert werden.'
    return
  }

  const savedStatus = (data ?? null) as ModuleStatusRow | null

  if (savedStatus?.status) {
    setModuleStatus(moduleId, savedStatus.status)
  }
}

async function saveModuleCategories(moduleId: string, categoryIds: string[]) {
  if (!supabase) {
    categoryError.value = supabaseConfigError
    return
  }

  if (!canEditModuleStatuses.value) {
    categoryError.value = 'Speichere zuerst Studiengang und SPO im Demo-Profil, bevor du Modulkategorien änderst.'
    return
  }

  if (savingCategoryModuleId.value) {
    return
  }

  const currentModule = modules.value.find(entry => entry.id === moduleId)
  if (!currentModule) {
    return
  }

  const previousCategories = currentModule.categories
  const optimisticCategories = allCategories.value.filter(category => categoryIds.includes(category.id))

  categoryError.value = null
  savingCategoryModuleId.value = moduleId
  setModuleCategories(moduleId, optimisticCategories)

  const { data, error: err } = await supabase.rpc('save_module_categories', {
    selected_module_id: moduleId,
    selected_category_ids: categoryIds,
  })

  savingCategoryModuleId.value = null

  if (err) {
    setModuleCategories(moduleId, previousCategories)
    categoryError.value = 'Die Modulkategorien konnten nicht gespeichert werden.'
    return
  }

  setModuleCategories(moduleId, ((data ?? []) as ModuleCategoryRow[]).map(row => ({
    id: row.category_id,
    name: row.name,
    color: row.color,
    type: row.type,
  })))
}

async function saveStudyProfileSelection() {
  clearSelectionMessages()

  if (!supabase) {
    profileError.value = supabaseConfigError
    return
  }

  if (!selectedStudyProgramId.value) {
    profileError.value = 'Bitte wähle zuerst einen Studiengang aus.'
    return
  }

  profileSaving.value = true

  const { data, error: err } = await supabase
    .rpc('save_demo_user_profile_selection', {
      selected_study_program_id: selectedStudyProgramId.value,
      selected_spo_id: selectedSpoId.value,
    })
    .single()

  profileSaving.value = false

  if (err) {
    profileError.value = 'Studiengang und SPO konnten nicht gespeichert werden.'
    return
  }

  demoUserProfile.value = (data ?? null) as UserProfile | null
  profileInfo.value = 'Studiengang und SPO wurden im Demo-Profil gespeichert.'
}

async function fetchInitialData() {
  if (!currentUser.value) {
    return
  }

  if (loadedUserId.value === currentUser.value.id) {
    return
  }
  loading.value = true
  error.value = null
  profileError.value = null

  if (!supabase) {
    loading.value = false
    error.value = supabaseConfigError
    return
  }

  const [spRes, spoRes, hbRes, categoryRes, profileRes] = await Promise.all([
    supabase.from('study_programs').select('id, faculty_id, code, name').order('name').order('code'),
    supabase
      .from('spos')
      .select('id, study_program_id, version_name, valid_from')
      .order('study_program_id')
      .order('valid_from', { ascending: false, nullsFirst: false })
      .order('version_name'),
    supabase.from('module_handbooks').select('id, spo_id, code').order('code'),
    supabase.from('categories').select('id, name, color, type').order('type').order('name'),
    supabase.rpc('get_demo_user_profile').maybeSingle(),
  ])

  loading.value = false

  if (spRes.error) { error.value = spRes.error.message; return }
  if (spoRes.error) { error.value = spoRes.error.message; return }
  if (hbRes.error) { error.value = hbRes.error.message; return }
  if (categoryRes.error) { categoryError.value = categoryRes.error.message }

  studyPrograms.value = (spRes.data ?? []) as StudyProgram[]
  allSpos.value = (spoRes.data ?? []) as Spo[]
  allHandbooks.value = (hbRes.data ?? []) as ModuleHandbook[]
  allCategories.value = (categoryRes.data ?? []) as Category[]

  if (profileRes.error) {
    profileError.value = 'Das Demo-Profil konnte nicht geladen werden.'
  } else {
    demoUserProfile.value = (profileRes.data ?? null) as UserProfile | null
  }

  restoringProfileSelection.value = true

  if (demoUserProfile.value?.study_program_id) {
    selectedStudyProgramId.value = demoUserProfile.value.study_program_id
  }

  if (demoUserProfile.value?.spo_id) {
    selectedSpoId.value = demoUserProfile.value.spo_id
  }

  if (
    selectedStudyProgramId.value
    && !studyPrograms.value.some(program => program.id === selectedStudyProgramId.value)
  ) {
    selectedStudyProgramId.value = null
  }

  if (
    selectedSpoId.value
    && !allSpos.value.some(
      spo => spo.id === selectedSpoId.value && spo.study_program_id === selectedStudyProgramId.value
    )
  ) {
    selectedSpoId.value = null
  }

  restoringProfileSelection.value = false

  if (selectedSpoId.value) {
    await fetchModulesForSpo(selectedSpoId.value, beginModuleRequest())
  }

  loadedUserId.value = currentUser.value.id
}

function shouldReplaceModule(existingModule: ModuleEntry, nextModule: ModuleEntry) {
  if (existingModule.recommended_semester == null && nextModule.recommended_semester != null) {
    return true
  }

  if (
    existingModule.recommended_semester != null
    && nextModule.recommended_semester != null
    && nextModule.recommended_semester < existingModule.recommended_semester
  ) {
    return true
  }

  return false
}

async function fetchModules(handbookIds: string[], requestId: number) {
  loading.value = true
  error.value = null
  moduleStatusError.value = null

  if (!supabase) {
    loading.value = false
    error.value = supabaseConfigError
    return
  }

  const { data, error: err } = await supabase
    .from('module_handbook_entries')
    .select(`
      recommended_semester,
      modules!module_handbook_entries_module_id_fkey (
        id, code, name, coordinator, start_semester, version, details,
        is_mandatory, is_specialization, specialization_name, language,
        courses (*)
      )
    `)
    .in('handbook_id', handbookIds)
    .order('recommended_semester', { nullsFirst: false })

  if (!isActiveModuleRequest(requestId)) {
    return
  }

  if (err) {
    loading.value = false
    error.value = err.message
    return
  }

  const uniqueModules = new Map<string, ModuleEntry>()

  for (const row of data as any[]) {
    const module = {
      ...row.modules,
      recommended_semester: row.recommended_semester,
      categories: [],
      courses: row.modules?.courses ?? [],
      module_status: 'offen',
    } as ModuleEntry

    const existingModule = uniqueModules.get(module.id)

    if (!existingModule || shouldReplaceModule(existingModule, module)) {
      uniqueModules.set(module.id, module)
    }
  }

  modules.value = Array.from(uniqueModules.values())

  const moduleIds = modules.value.map(module => module.id)

  await Promise.all([
    fetchModuleStatuses(moduleIds, requestId),
    fetchModuleCategories(moduleIds, requestId),
  ])

  if (!isActiveModuleRequest(requestId)) {
    return
  }

  loading.value = false
}

async function fetchModulesForSpo(spoId: string, requestId: number) {
  const matchingHandbooks = allHandbooks.value.filter(handbook => handbook.spo_id === spoId)

  if (!matchingHandbooks.length) {
    modules.value = []
    error.value = 'Zur ausgewählten SPO wurde kein Modulhandbuch gefunden.'
    loading.value = false
    return
  }

  await fetchModules(matchingHandbooks.map(handbook => handbook.id), requestId)
}

// when study program changes, reset handbook selection
watch(selectedStudyProgramId, (id) => {
  localStorage.setItem('selectedStudyProgramId', id ?? '')
  clearSelectionMessages()

  if (!selectedSpoId.value) {
    return
  }

  const selectedSpoIsAvailable = allSpos.value.some(
    spo => spo.id === selectedSpoId.value && spo.study_program_id === id
  )

  if (!selectedSpoIsAvailable) {
    selectedSpoId.value = null
  }
})

watch(selectedSpoId, (id) => {
  const requestId = beginModuleRequest()

  localStorage.setItem('selectedSpoId', id ?? '')
  modules.value = []
  selectedModule.value = null
  moduleStatusError.value = null
  error.value = null
  clearSelectionMessages()

  if (restoringProfileSelection.value) {
    return
  }

  if (id) {
    fetchModulesForSpo(id, requestId)
  }
  else {
    loading.value = false
    moduleStatusError.value = null
  }
})

async function initAuth() {
  authError.value = null
  authInfo.value = null

  if (!supabase) {
    authLoading.value = false
    authError.value = supabaseConfigError
    return
  }

  const { data, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    authError.value = 'Session konnte nicht geladen werden.'
    authLoading.value = false
    return
  }

  const sessionUser = data.session?.user ?? null
  currentUser.value = sessionUser ? await syncMissingAuthMetadataName(sessionUser) : null
  authLoading.value = false

  if (currentUser.value) {
    void fetchInitialData()
  }

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    void (async () => {
      currentUser.value = session?.user ?? null
      authError.value = null

      if (currentUser.value) {
        currentUser.value = await syncMissingAuthMetadataName(currentUser.value)
        loadedUserId.value = null
        await fetchInitialData()
        return
      }

      resetAppState()
    })()
  })

  authUnsubscribe = () => {
    listener.subscription.unsubscribe()
  }
}

onMounted(() => {
  void initAuth()
})

onUnmounted(() => {
  authUnsubscribe?.()
})
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <img src="/favicon.ico" alt="HTWG Logo" class="brand-logo" />
          <span class="brand-name">Campus App</span>
        </div>
        <div class="header-actions">
          <span v-if="currentUser" class="session-email">{{ currentUserEmail }}</span>
          <button
            v-if="currentUser"
            type="button"
            class="ghost-button"
            @click="signOut"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <template v-if="authLoading">
        <div class="loading-state">
          <div class="spinner" />
          <p>Session wird geladen…</p>
        </div>
      </template>

      <template v-else-if="!currentUser">
        <section class="auth-card">
          <span class="panel-eyebrow">Registrierung & Login</span>
          <h1 class="page-title">Anmelden per Magic Link</h1>
          <p class="page-subtitle">
            Gib deine E-Mail-Adresse ein – wir schicken dir einen Link zum Einloggen.
          </p>

          <form class="auth-form" @submit.prevent="sendMagicLink">
            <label class="meta-label" for="magic-link-first-name">Vorname</label>
            <input
              id="magic-link-first-name"
              v-model="authFirstName"
              class="auth-input"
              type="text"
              autocomplete="given-name"
              placeholder="Vorname"
              required
            >
            <label class="meta-label" for="magic-link-last-name">Nachname</label>
            <input
              id="magic-link-last-name"
              v-model="authLastName"
              class="auth-input"
              type="text"
              autocomplete="family-name"
              placeholder="Nachname"
              required
            >
            <label class="meta-label" for="magic-link-email">E-Mail</label>
            <input
              id="magic-link-email"
              v-model="authEmail"
              class="auth-input"
              type="email"
              autocomplete="email"
              placeholder="name@beispiel.de"
              required
            >
            <button class="save-button auth-submit" type="submit" :disabled="authSending">
              {{ authSending ? 'Wird versendet…' : 'Magic Link senden' }}
            </button>
          </form>

          <p class="helper-copy">
            Redirect URL: <code>{{ magicLinkRedirectTo }}</code>
          </p>
        </section>

        <div v-if="authError" class="error-banner">
          ⚠️ {{ authError }}
        </div>

        <div v-if="authInfo" class="success-banner">
          {{ authInfo }}
        </div>
      </template>

      <template v-else>
        <div class="page-header">
          <h1 class="page-title">Meine Module</h1>
          <p class="page-subtitle">Wähle deinen Studiengang und die SPO, speichere die Auswahl im Demo-Profil und sieh direkt die zugehörigen Module.</p>
        </div>

        <div class="profile-grid">
          <section class="profile-panel">
            <span class="panel-eyebrow">Demo-Profil</span>
            <h2 class="panel-title">Alex Beispiel</h2>

            <div class="profile-meta">
              <div class="profile-meta-item">
                <span class="meta-label">E-Mail</span>
                <span class="meta-value">{{ demoUserProfile?.email ?? 'alex.beispiel@htwg-konstanz.de' }}</span>
              </div>
              <div class="profile-meta-item">
                <span class="meta-label">Hochschule</span>
                <span class="meta-value">HTWG Konstanz</span>
              </div>
            </div>
          </section>

          <section class="profile-panel">
            <span class="panel-eyebrow">Gespeicherte Auswahl</span>
            <h2 class="panel-title">Studiengang und SPO</h2>

            <p class="profile-selection" :class="savedStudyProgram ? 'profile-selection-active' : ''">
              {{ savedStudyProgram ? getStudyProgramLabel(savedStudyProgram) : 'Noch kein Studiengang gespeichert.' }}
            </p>
            <p class="profile-selection profile-selection-secondary" :class="savedSpo ? 'profile-selection-active' : ''">
              {{ savedSpo ? getSpoLabel(savedSpo) : savedStudyProgram ? 'Noch keine SPO gespeichert.' : 'Bitte zuerst eine Auswahl treffen.' }}
            </p>

            <p class="helper-copy">
              {{ selectionDirty ? 'Du hast Änderungen, die noch nicht im Demo-Profil gespeichert sind.' : 'Auswahl und Demo-Profil sind aktuell gleich.' }}
            </p>
          </section>
        </div>

        <div class="controls-bar">
          <SpoSelector
            v-model="selectedStudyProgramId"
            :items="studyProgramItems"
            :loading="loading && !studyPrograms.length"
            label="Studiengang"
            placeholder="— Studiengang auswählen —"
          />
          <SpoSelector
            v-model="selectedSpoId"
            :items="spoItems"
            :loading="false"
            label="SPO"
            placeholder="— SPO auswählen —"
          />
        </div>

        <div class="selection-toolbar">
          <div class="selection-toolbar-inner">
            <div class="selection-toolbar-copy">
              <p class="selection-toolbar-title">Auswahl speichern</p>
              <p class="helper-copy">
                Studiengang und SPO werden für den Demo-User in <code>users</code> gespeichert.
              </p>
            </div>

            <button
              class="save-button"
              type="button"
              :disabled="profileSaving || !selectedStudyProgramId || !selectionDirty"
              @click="saveStudyProfileSelection"
            >
              {{ profileSaving ? 'Wird gespeichert…' : 'Im Demo-Profil speichern' }}
            </button>
          </div>
        </div>

        <div v-if="profileError" class="error-banner">
          {{ profileError }}
        </div>

        <div v-if="profileInfo" class="success-banner">
          {{ profileInfo }}
        </div>

        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

        <div v-if="moduleStatusError" class="info-banner">
          {{ moduleStatusError }}
        </div>

        <div v-if="categoryError" class="info-banner">
           {{ categoryError }}
        </div>

        <div v-if="selectedSpoId && !canEditModuleStatuses" class="info-banner">
           Speichere zuerst die aktuelle Studiengang- und SPO-Auswahl im Demo-Profil, damit Modulstatus und Kategorien persistent geändert werden können.
        </div>

        <template v-if="selectedSpoId && !loading">
          <ModuleList :modules="modules" @select="selectedModule = $event" />
        </template>

        <div v-else-if="!selectedStudyProgramId" class="empty-state">
          <div class="empty-icon"></div>
          <p>Wähle einen Studiengang aus, um fortzufahren.</p>
        </div>

        <div v-else-if="!selectedSpoId" class="empty-state">
          <div class="empty-icon"></div>
          <p>Wähle eine SPO aus, um die zugehörigen Module anzuzeigen.</p>
        </div>
      </template>
    </main>
  </div>

  <ModuleDrawer
    v-if="currentUser"
    :module="selectedModule"
    :categories="allCategories"
    :saving="savingModuleId === selectedModule?.id"
    :disabled="!canEditModuleStatuses"
    :error="moduleStatusError"
    :category-saving="savingCategoryModuleId === selectedModule?.id"
    :category-disabled="!canEditModuleStatuses"
    :category-error="categoryError"
    @close="selectedModule = null"
    @update-status="saveModuleStatus"
    @update-categories="saveModuleCategories"
  />
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(8px);
}

.header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon { font-size: 1.3rem; }

.brand-logo {
  height: 28px;
  width: auto;
  display: block;
}

.brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.session-email {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.ghost-button {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  cursor: pointer;
}

.app-main {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.auth-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auth-input {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  padding: 10px 12px;
  font: inherit;
}

.auth-submit {
  width: fit-content;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.page-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.profile-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.panel-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
}

.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-meta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.meta-value {
  font-size: 0.92rem;
  color: var(--color-text);
}

.profile-selection {
  margin: 0;
  font-size: 0.92rem;
  color: var(--color-text-muted);
}

.profile-selection-secondary {
  font-size: 0.84rem;
}

.profile-selection-active {
  color: var(--color-text);
}

.helper-copy {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.helper-copy code {
  color: var(--color-text);
}

.controls-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.controls-bar > * {
  flex: 1;
  min-width: 200px;
}

.selection-toolbar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 16px;
}

.selection-toolbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.selection-toolbar-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selection-toolbar-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text);
}

.save-button {
  border: none;
  border-radius: var(--radius-control);
  min-height: 42px;
  padding: 11px 16px;
  font: inherit;
  font-weight: 700;
  color: white;
  background: var(--color-primary);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  flex-shrink: 0;
}

.save-button:hover:enabled {
  transform: translateY(-1px);
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.error-banner {
  padding: 12px 16px;
  background: var(--color-error-bg);
  border: 1px solid var(--color-error-border);
  border-radius: 8px;
  color: var(--color-error);
  font-size: 0.88rem;
}

.info-banner {
  padding: 12px 16px;
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning-border);
  border-radius: 8px;
  color: var(--color-warning);
  font-size: 0.88rem;
}

.success-banner {
  padding: 12px 16px;
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  border-radius: 8px;
  color: var(--color-success);
  font-size: 0.88rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.empty-icon { font-size: 2.5rem; }

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .app-main {
    padding: 24px 16px 60px;
    gap: 20px;
  }
  .header-inner {
    padding: 0 16px;
  }
  .theme-toggle {
    padding: 7px 12px;
    font-size: 0.76rem;
  }
  .controls-bar {
    flex-direction: column;
  }
  .controls-bar > * {
    min-width: unset;
  }
  .selection-toolbar {
    padding: 12px;
  }
  .selection-toolbar-inner {
    flex-direction: column;
    align-items: stretch;
  }
  .save-button {
    width: 100%;
  }
  .page-title {
    font-size: 1.4rem;
  }
}
</style>
