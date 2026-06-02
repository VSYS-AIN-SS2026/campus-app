<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AuthGate from './components/AuthGate.vue'
import HiddenPage from './components/HiddenPage.vue'
import LsfEventImportModal from './components/LsfEventImportModal.vue'
import ModuleDrawer from './components/ModuleDrawer.vue'
import PlannerViewShell from './components/PlannerViewShell.vue'
import ProfileSelectionPanel from './components/ProfileSelectionPanel.vue'
import Sidebar from './components/Sidebar.vue'
import { useAppController } from './composables/useAppController'
import { useNotifications } from './composables/useNotifications'
import { useTeams } from './composables/useTeams'

const { magicLinkRedirectTo, allCategories, activePlannerView, authEmail, authError, authFirstName, authInfo, authLastName, authLoading, authSending, canEditModuleStatuses, categoryError, currentUser, currentUserEmail, userProfile, displayedWeeklyScheduleEvents, error, hiddenOccurrenceItems, hiddenPageEntries, hiddenPageError, hiddenPageLoading, hiddenSeriesItems, lastHiddenSeries, loadImportedEvents, loading, lsfImportModule, modules, moduleStatusError, profileError, profileInfo, profileSaving, savedSpo, savedStudyProgram, savingCategoryModuleId, savingModuleId, scheduleVisibilityError, scheduleVisibilityInfo, selectedModule, selectedSpoId, selectedStudyProgramId, selectionDirty, showHiddenEvents, spoItems, studyProgramItems, weekStartDate, getSpoLabel, getStudyProgramLabel, hideScheduleOccurrence, hideScheduleSeries, saveModuleCategories, saveModuleStatus, saveStudyProfileSelection, sendMagicLink, showAllScheduleSeries, showScheduleSeries, signOut, undoHideScheduleSeries } = useAppController()
const { invitationCount, fetchMyInvitations, subscribeToInvitations, unsubscribeFromInvitations } = useTeams()
const {
  allNotifications,
  unreadCount,
  fetchAllNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
  subscribeToInserts,
  teardownNotifications,
} = useNotifications()

function toggleShowHiddenEvents() {
  showHiddenEvents.value = !showHiddenEvents.value
}

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

// ── Notification inbox ──────────────────────────────────────────
const notifOpen = ref(false)
const notifBtnRef = ref<HTMLElement | null>(null)
const notifPanelRef = ref<HTMLElement | null>(null)

const notifDateFmt = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})
function formatNotifDate(iso: string): string {
  return notifDateFmt.format(new Date(iso))
}

// Group by team; use payload.team_name for the label, fall back to "Allgemein".
const groupedNotifications = computed(() => {
  const groups = new Map<string | null, { label: string; items: typeof allNotifications.value }>()
  for (const n of allNotifications.value) {
    const key = n.teamId
    if (!groups.has(key)) {
      const label = key
        ? ((n.payload as Record<string, unknown>).team_name as string | undefined) ?? 'Team'
        : 'Allgemein'
      groups.set(key, { label, items: [] })
    }
    groups.get(key)!.items.push(n)
  }
  return Array.from(groups.values())
})

function onDocMousedown(e: MouseEvent) {
  if (
    notifOpen.value &&
    !notifBtnRef.value?.contains(e.target as Node) &&
    !notifPanelRef.value?.contains(e.target as Node)
  ) {
    notifOpen.value = false
  }
}

const derivedSidebarSection = computed<SidebarSection>(() => {
  if (isTeamsRoute.value) return 'teams'
  if (activePlannerView.value === 'week') return 'calendar'
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

const isHiddenView = computed(() => route.path === '/schedule/hidden')

onMounted(() => {
  void fetchMyInvitations()
  void fetchAllNotifications()
  subscribeToInserts()
  document.addEventListener('mousedown', onDocMousedown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocMousedown)
  teardownNotifications()
  unsubscribeFromInvitations()
})

watch(currentUser, (user) => {
  if (user?.id) {
    subscribeToInserts()
    subscribeToInvitations(user.id)
  } else {
    teardownNotifications()
    unsubscribeFromInvitations()
  }
})

function navigateToHiddenPage() {
  void router.push('/schedule/hidden')
}

function navigateToMain() {
  void router.push('/')
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
            v-if="currentUser"
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
          <!-- Notification inbox bell -->
          <div v-if="currentUser" class="notif-wrap">
            <button
              ref="notifBtnRef"
              type="button"
              class="notif-btn ghost-button"
              :aria-label="`Benachrichtigungen${unreadCount > 0 ? `, ${unreadCount} ungelesen` : ''}`"
              :aria-expanded="notifOpen"
              @click="notifOpen = !notifOpen"
            >
              <span aria-hidden="true">🔔</span>
              <span v-if="unreadCount > 0" class="notif-badge" aria-hidden="true">
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </span>
            </button>

            <div
              v-if="notifOpen"
              ref="notifPanelRef"
              class="notif-panel"
              role="dialog"
              aria-label="Benachrichtigungen"
            >
              <div class="notif-panel-head">
                <span class="notif-panel-title">Benachrichtigungen</span>
                <div class="notif-panel-actions">
                  <button
                    v-if="allNotifications.length > 0"
                    type="button"
                    class="notif-action-btn"
                    @click="deleteAllNotifications"
                  >Alle löschen</button>
                  <button
                    v-if="unreadCount > 0"
                    type="button"
                    class="notif-action-btn"
                    @click="markAllRead"
                  >Alle als gelesen</button>
                </div>
              </div>

              <p v-if="groupedNotifications.length === 0" class="notif-empty">
                Keine Benachrichtigungen.
              </p>

              <template v-for="group in groupedNotifications" :key="group.label">
                <div class="notif-group-header">{{ group.label }}</div>
                <div
                  v-for="notif in group.items"
                  :key="notif.id"
                  class="notif-item-row"
                >
                  <button
                    type="button"
                    class="notif-item"
                    :class="{ 'notif-item--unread': !notif.readAt }"
                    @click="markRead(notif.id)"
                  >
                    <span class="notif-item-title">{{ notif.title }}</span>
                    <span class="notif-item-body">{{ notif.body }}</span>
                    <span class="notif-item-time">{{ formatNotifDate(notif.createdAt) }}</span>
                  </button>
                  <button
                    type="button"
                    class="notif-delete-btn"
                    :aria-label="`Benachrichtigung löschen: ${notif.title}`"
                    title="Löschen"
                    @click.stop="deleteNotification(notif.id)"
                  >&times;</button>
                </div>
              </template>
            </div>
          </div>

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
            class="logout-button"
            aria-label="Abmelden"
            title="Abmelden"
            @click="signOut"
          >
            <svg class="logout-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M9 7.5V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="logout-label">Abmelden</span>
          </button>
        </div>
      </div>
     </header>

    <template v-if="isHiddenView">
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
            v-if="currentUser && sidebarOpen"
            class="sidebar-overlay"
            aria-hidden="true"
            @click="sidebarOpen = false"
          />
        </transition>
        <Sidebar
          v-if="currentUser"
          id="app-sidebar"
          :active-section="sidebarActiveSection"
          :is-open="sidebarOpen"
          :team-invitation-count="invitationCount"
          @navigate="onSidebarNavigate"
        />
        <div class="app-content">
          <main class="app-main">
            <template v-if="authLoading">
              <div class="loading-state">
                <div class="spinner" />
                <p>Session wird geladen…</p>
              </div>
            </template>

            <template v-else-if="!currentUser">
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
            <template v-else-if="isTeamsRoute">
              <RouterView />
            </template>
            <template v-else>
              <section id="module-header-section" class="content-section">
                <section id="profile-section" class="content-subsection">
                <ProfileSelectionPanel
                  :user-profile="userProfile"
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
                  @hide-occurrence="hideScheduleOccurrence($event)"
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
  /* Adjust for header (3.5rem) */
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

.logout-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface-raised);
  color: var(--color-text);
  border-radius: 999px;
  padding: 8px 14px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
}

.logout-icon {
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
}

.logout-button:hover {
  border-color: color-mix(in srgb, var(--color-error, #dc2626) 55%, var(--color-border));
  color: var(--color-error, #dc2626);
  background: color-mix(in srgb, var(--color-error-bg, #fee2e2) 35%, var(--color-surface-raised));
  transform: translateY(-1px);
}

.logout-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--color-error, #dc2626) 60%, transparent);
  outline-offset: 2px;
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

  .logout-label {
    display: none;
  }

  .logout-button {
    padding: 7px 9px;
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

/* ── Notification inbox ──────────────────────────────────────── */
.notif-wrap {
  position: relative;
}

.notif-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 8px 10px;
  font-size: 1rem;
  line-height: 1;
}

.notif-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  display: inline-grid;
  place-items: center;
  line-height: 1;
  pointer-events: none;
}

.notif-panel {
  position: fixed;
  top: 3.625rem; /* just below the 56px header */
  right: 1rem;
  width: 22rem;
  max-height: 28rem;
  overflow-y: auto;
  background: var(--color-surface-raised);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg, 0.75rem);
  box-shadow: 0 8px 32px color-mix(in srgb, black 14%, transparent);
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.notif-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.5rem;
  border-bottom: 0.0625rem solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-surface-raised);
  z-index: 1;
}

.notif-panel-title {
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: 700;
  color: var(--color-text);
}

.notif-panel-actions {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

.notif-action-btn {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-primary);
  background: none;
  border: none;
  padding: 0.125rem 0.25rem;
  cursor: pointer;
  font: inherit;
  border-radius: 0.25rem;
}

.notif-action-btn:hover {
  text-decoration: underline;
}

.notif-empty {
  margin: 0;
  padding: 1.25rem 1rem;
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-text-muted);
  text-align: center;
}

.notif-group-header {
  padding: 0.5rem 1rem 0.25rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  background: var(--color-surface);
  position: sticky;
  top: 2.75rem; /* below panel head */
}

.notif-item {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  width: 100%;
  padding: 0.625rem 1rem;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 0.0625rem solid var(--color-border);
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: background 0.12s ease;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item:hover {
  background: color-mix(in srgb, var(--color-primary) 6%, transparent);
}

.notif-item--unread {
  background: var(--color-primary-glow);
}

.notif-item--unread:hover {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.notif-item-title {
  font-size: var(--font-size-xs, 0.75rem);
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

.notif-item-body {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-item-time {
  font-size: 0.66rem;
  color: var(--color-text-muted);
  margin-top: 0.125rem;
}

.notif-item-row {
  display: flex;
  align-items: stretch;
  border-bottom: 0.0625rem solid var(--color-border);
}

.notif-item-row:last-child {
  border-bottom: none;
}

.notif-item {
  flex: 1;
  min-width: 0;
  border-bottom: none !important;
}

.notif-delete-btn {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 2rem;
  background: none;
  border: none;
  font-size: 1.05rem;
  line-height: 1;
  color: var(--color-text-muted);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease, color 0.12s ease;
}

.notif-item-row:hover .notif-delete-btn {
  opacity: 1;
}

.notif-delete-btn:hover {
  color: var(--color-error, #dc2626);
}
</style>
