<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AuthGate from './components/AuthGate.vue'
import HiddenPage from './components/HiddenPage.vue'
import LsfEventImportModal from './components/LsfEventImportModal.vue'
import ModuleDrawer from './components/ModuleDrawer.vue'
import PlannerViewShell from './components/PlannerViewShell.vue'
import ProfileSelectionPanel from './components/ProfileSelectionPanel.vue'
import WeeklySchedule from './components/WeeklySchedule.vue'
import Sidebar from './components/Sidebar.vue'
import { useAppController } from './composables/useAppController'

const { magicLinkRedirectTo, allCategories, activePlannerView, authEmail, authError, authFirstName, authInfo, authLastName, authLoading, authSending, canEditModuleStatuses, categoryError, currentUser, currentUserEmail, demoUserProfile, displayedWeeklyPreviewEvents, displayedWeeklyScheduleEvents, error, hiddenOccurrenceItems, hiddenPageEntries, hiddenPageError, hiddenPageLoading, hiddenSeriesItems, isWeeklyPreviewMode, lastHiddenSeries, loadImportedEvents, loading, lsfImportModule, modules, moduleStatusError, profileError, profileInfo, profileSaving, savedSpo, savedStudyProgram, savingCategoryModuleId, savingModuleId, scheduleVisibilityError, scheduleVisibilityInfo, selectedModule, selectedSpoId, selectedStudyProgramId, selectionDirty, showHiddenEvents, spoItems, studyProgramItems, visibleWeeklyPreviewEvents, visibleWeeklyScheduleEvents, weekStartDate, getSpoLabel, getStudyProgramLabel, hideScheduleOccurrence, hideScheduleSeries, saveModuleCategories, saveModuleStatus, saveStudyProfileSelection, sendMagicLink, showAllScheduleOccurrences, showAllScheduleSeries, showScheduleOccurrence, showScheduleSeries, signOut, undoHideScheduleSeries } = useAppController()

function toggleShowHiddenEvents() {
  showHiddenEvents.value = !showHiddenEvents.value
}

// ===================== AUTH-BYPASS-START =====================
// Skip login screen in dev with VITE_AUTH_BYPASS=true
const isAuthBypassEnabled = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true'
// ===================== AUTH-BYPASS-END =====================

// =====================
// DEV-BYPASS-START: Demo-User für Preview ohne Login
// Entferne diesen Block nach dem Development!
const isDevBypass = typeof window !== 'undefined' && (
  window.location.search.includes('devpreview=1') || isAuthBypassEnabled
)
// =====================
// DEV-BYPASS-END

type SidebarSection = 'modules' | 'calendar' | 'profile' | 'teams'
type ThemeMode = 'light' | 'dark'

const route = useRoute()
const router = useRouter()
const isTeamsRoute = computed(() => route.path.startsWith('/teams'))

const THEME_STORAGE_KEY = 'themeMode'

function getInitialThemeMode(): ThemeMode {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return 'light'
}

function applyThemeMode(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
}

const sidebarActiveSection = ref<SidebarSection>('modules')
const sidebarOpen = ref(false)
const themeMode = ref<ThemeMode>(getInitialThemeMode())

const derivedSidebarSection = computed<SidebarSection>(() => {
  if (isTeamsRoute.value) return 'teams'
  if (isWeeklyPreviewMode.value || activePlannerView.value === 'week') return 'calendar'
  return 'modules'
})

watch(derivedSidebarSection, (section) => {
  if (sidebarActiveSection.value !== 'profile') {
    sidebarActiveSection.value = section
  }
}, { immediate: true })

watch(themeMode, (mode) => {
  localStorage.setItem(THEME_STORAGE_KEY, mode)
  applyThemeMode(mode)
}, { immediate: true })

const activeView = ref<'main' | 'hidden'>('main')

function updateActiveView() {
  const hash = window.location.hash
  activeView.value = hash === '#/schedule/hidden' ? 'hidden' : 'main'
}

let hashInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  window.addEventListener('hashchange', updateActiveView)
  updateActiveView()
  hashInterval = setInterval(updateActiveView, 500)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', updateActiveView)
  if (hashInterval) clearInterval(hashInterval)
})

function navigateToHiddenPage() {
  window.location.hash = '#/schedule/hidden'
}

function navigateToMain() {
  if (window.location.hash === '#/schedule/hidden') {
    window.history.back()
  } else {
    window.location.hash = '#/'
  }
}

function scrollToSection(sectionId: string) {
  const targetElement = document.getElementById(sectionId)

  if (!targetElement) {
    return false
  }

  targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

async function onSidebarNavigate(target: SidebarSection) {
  sidebarActiveSection.value = target
  sidebarOpen.value = false

  if (target === 'teams') {
    router.push('/teams')
    return
  }

  if (isTeamsRoute.value) {
    await router.push('/')
    await nextTick()
  }

  if (target === 'calendar') {
    activePlannerView.value = 'week'
    await nextTick()
    scrollToSection('planner-section')

    return
  }

  if (target === 'profile') {
    await nextTick()
    scrollToSection('profile-section')

    return
  }

  activePlannerView.value = 'modules'
  await nextTick()
  scrollToSection('module-header-section')
}
</script>
<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <img src="/favicon.ico" alt="HTWG Logo" class="brand-logo" />
          <span class="brand-name">Campus App</span>
        </div>
        <div class="header-actions">
          <button
            v-if="currentUser || isDevBypass || isWeeklyPreviewMode || isTeamsRoute"
            type="button"
            class="sidebar-toggle ghost-button"
            :aria-expanded="sidebarOpen"
            aria-controls="app-sidebar"
            aria-label="Navigation ein-/ausblenden"
            @click="sidebarOpen = !sidebarOpen"
          >
            <span class="sidebar-toggle-icon" :class="{ open: sidebarOpen }">☰</span>
          </button>
          <span v-if="currentUser" class="session-email">{{ currentUserEmail }}</span>
          <button
            type="button"
            class="theme-toggle"
            @click="themeMode = themeMode === 'light' ? 'dark' : 'light'"
          >
            {{ themeMode === 'light' ? 'Dark mode' : 'Light mode' }}
          </button>
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

    <!-- ===================== AUTH-BYPASS-START ===================== -->
    <div v-if="isAuthBypassEnabled && currentUser" class="auth-bypass-banner">
      <span class="bypass-label">Development Mode: Auth-Bypass aktiv</span>
      <span class="bypass-user">Benutzer: {{ currentUser.user_metadata?.full_name || 'Demo User' }}</span>
    </div>
    <!-- ===================== AUTH-BYPASS-END ===================== -->

    <template v-if="activeView === 'hidden'">
      <HiddenPage
        :entries="hiddenPageEntries"
        :loading="hiddenPageLoading"
        :error="hiddenPageError"
        @back="navigateToMain"
        @show-series="showScheduleSeries"
      />
    </template>

    <template v-else>
      <div class="app-layout">
        <transition name="sidebar-overlay">
          <div
            v-if="(currentUser || isDevBypass || isWeeklyPreviewMode || isTeamsRoute) && sidebarOpen"
            class="sidebar-overlay"
            aria-hidden="true"
            @click="sidebarOpen = false"
          />
        </transition>
        <Sidebar
          v-if="currentUser || isDevBypass || isWeeklyPreviewMode || isTeamsRoute"
          id="app-sidebar"
          :active-section="sidebarActiveSection"
          :is-open="sidebarOpen"
          @navigate="onSidebarNavigate"
        />
        <div class="app-content">
          <main class="app-main">
            <template v-if="isWeeklyPreviewMode">
              <section id="planner-section" class="content-section">
                <WeeklySchedule
                  :events="displayedWeeklyPreviewEvents"
                  :hidden-series-items="hiddenSeriesItems"
                  :show-hidden-events="showHiddenEvents"
                  :loading="false"
                  :error="null"
                  :week-start="weekStartDate"
                  @hide-series="hideScheduleSeries($event.seriesId, $event.title)"
                  @show-series="showScheduleSeries"
                  @show-all-series="showAllScheduleSeries"
                  @toggle-show-hidden="toggleShowHiddenEvents"
                  @navigate-to-hidden-page="navigateToHiddenPage"
                />
              </section>
            </template>

            <template v-else-if="authLoading">
              <div class="loading-state">
                <div class="spinner" />
                <p>Session wird geladen…</p>
              </div>
            </template>

            <!-- ===================== DEV-BYPASS-START ===================== -->
            <template v-else-if="!currentUser && !isDevBypass && !isAuthBypassEnabled">
              <AuthGate
                :magic-link-redirect-to="magicLinkRedirectTo"
                :auth-first-name="authFirstName"
                :auth-last-name="authLastName"
                :auth-email="authEmail"
                :auth-sending="authSending"
                :auth-error="authError"
                :auth-info="authInfo"
                @update:auth-first-name="authFirstName = $event"
                @update:auth-last-name="authLastName = $event"
                @update:auth-email="authEmail = $event"
                @submit="sendMagicLink"
              />
            </template>
            <!-- ===================== DEV-BYPASS-END ===================== -->
            <template v-else-if="isTeamsRoute">
              <RouterView />
            </template>
            <template v-else>
              <section id="module-header-section" class="content-section">
                <section id="profile-section" class="content-subsection">
                <ProfileSelectionPanel
                  :demo-user-profile="demoUserProfile"
                  :saved-study-program="savedStudyProgram"
                  :saved-spo="savedSpo"
                  :selection-dirty="selectionDirty"
                  :selected-study-program-id="selectedStudyProgramId"
                  :selected-spo-id="selectedSpoId"
                  :study-program-items="studyProgramItems"
                  :spo-items="spoItems"
                  :loading="loading"
                  :profile-saving="profileSaving"
                  :profile-error="profileError"
                  :profile-info="profileInfo"
                  :get-study-program-label="getStudyProgramLabel"
                  :get-spo-label="getSpoLabel"
                  @update:selected-study-program-id="selectedStudyProgramId = $event"
                  @update:selected-spo-id="selectedSpoId = $event"
                  @save="saveStudyProfileSelection"
                />
                </section>

                <section id="planner-section" class="content-subsection">
                <PlannerViewShell
                  :selected-study-program-id="selectedStudyProgramId"
                  :selected-spo-id="selectedSpoId"
                  :active-planner-view="activePlannerView"
                  :can-edit-module-statuses="canEditModuleStatuses"
                  :loading="loading"
                  :error="error"
                  :module-status-error="moduleStatusError"
                  :category-error="categoryError"
                  :schedule-visibility-error="scheduleVisibilityError"
                  :schedule-visibility-info="scheduleVisibilityInfo"
                  :last-hidden-series="lastHiddenSeries"
                  :hidden-series-items="hiddenSeriesItems"
                  :hidden-occurrence-items="hiddenOccurrenceItems"
                  :modules="modules"
                  :visible-weekly-schedule-events="displayedWeeklyScheduleEvents"
                  :show-hidden-events="showHiddenEvents"
                  :week-start-date="weekStartDate"
                  @update:active-planner-view="activePlannerView = $event"
                  @hide-series="hideScheduleSeries($event.seriesId, $event.title)"
                  @show-series="showScheduleSeries"
                  @show-all-series="showAllScheduleSeries"
                  @toggle-show-hidden="toggleShowHiddenEvents"
                  @navigate-to-hidden-page="navigateToHiddenPage"
                  @undo-hide-series="undoHideScheduleSeries"
                  @select-module="selectedModule = $event"
                />
                </section>
              </section>
            </template>
          </main>
        </div>
      </div>
    </template>
  </div>

  <!-- ===================== DEV-BYPASS-START ===================== -->
  <ModuleDrawer
    v-if="currentUser || isDevBypass"
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
  <!-- ===================== DEV-BYPASS-END ===================== -->

  <LsfEventImportModal
    :module="lsfImportModule"
    @close="lsfImportModule = null"
    @imported="loadImportedEvents"
  />
</template>

<style scoped src="./app.css"></style>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-layout {
  display: flex;
  /* Adjust for header (3.5rem) + optional bypass banner (~2.5rem in dev) */
  min-height: calc(100vh - 3.5rem);
  position: relative;
}

.sidebar-overlay {
  display: none;
}

.sidebar-toggle {
  display: none;
  padding: 0.375rem 0.5rem;
  font-size: 1.1rem;
  line-height: 1;
}

.sidebar-toggle-icon {
  display: inline-block;
  transition: transform 0.2s;
}

.sidebar-toggle-icon.open {
  transform: rotate(90deg);
}

.sidebar-overlay-enter-active,
.sidebar-overlay-leave-active {
  transition: opacity 0.2s;
}

.sidebar-overlay-enter-from,
.sidebar-overlay-leave-to {
  opacity: 0;
}

.theme-toggle {
  border: 1px solid var(--color-border);
  background: var(--color-surface-raised);
  color: var(--color-text);
  border-radius: 999px;
  padding: 8px 14px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.theme-toggle:hover {
  border-color: var(--color-primary-light);
  transform: translateY(-1px);
}

@media (max-width: 45em) {
  .sidebar-toggle {
    display: inline-flex;
    align-items: center;
    order: -1;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 3.5rem;
    left: 0;
    right: 0;
    bottom: 0;
    background: color-mix(in srgb, black 40%, transparent);
    z-index: 19;
  }

  .theme-toggle {
    padding: 7px 12px;
    font-size: 0.76rem;
  }
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.header-inner {
  max-width: none;
  width: 100%;
  padding-left: 8px;
}

/* ===================== AUTH-BYPASS-START ===================== */
.auth-bypass-banner {
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  color: white;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.bypass-label {
  flex: 0 0 auto;
}

.bypass-user {
  flex: 1 1 auto;
  opacity: 0.95;
  font-size: 0.76rem;
}
/* ===================== AUTH-BYPASS-END ===================== */
</style>
