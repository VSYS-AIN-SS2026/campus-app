<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AuthGate from './components/AuthGate.vue'
import ModuleDrawer from './components/ModuleDrawer.vue'
import PlannerViewShell from './components/PlannerViewShell.vue'
import ProfileSelectionPanel from './components/ProfileSelectionPanel.vue'
import WeeklySchedule from './components/WeeklySchedule.vue'
import Sidebar from './components/Sidebar.vue'
import { useAppController } from './composables/useAppController'

const { magicLinkRedirectTo, allCategories, activePlannerView, authEmail, authError, authFirstName, authInfo, authLastName, authLoading, authSending, canEditModuleStatuses, categoryError, currentUser, currentUserEmail, demoUserProfile, error, hiddenSeriesItems, isWeeklyPreviewMode, lastHiddenSeries, loading, modules, moduleStatusError, profileError, profileInfo, profileSaving, savedSpo, savedStudyProgram, savingCategoryModuleId, savingModuleId, scheduleVisibilityError, scheduleVisibilityInfo, selectedModule, selectedSpoId, selectedStudyProgramId, selectionDirty, spoItems, studyProgramItems, visibleWeeklyPreviewEvents, visibleWeeklyScheduleEvents, weekStartDate, getSpoLabel, getStudyProgramLabel, hideScheduleSeries, saveModuleCategories, saveModuleStatus, saveStudyProfileSelection, sendMagicLink, showAllScheduleSeries, showScheduleSeries, signOut, undoHideScheduleSeries } = useAppController()
// =====================
// DEV-BYPASS-START: Demo-User für Preview ohne Login
// Entferne diesen Block nach dem Development!
const isDevBypass = typeof window !== 'undefined' && window.location.search.includes('devpreview=1')
// =====================
// DEV-BYPASS-END

type SidebarSection = 'modules' | 'calendar' | 'profile'

const sidebarActiveSection = ref<SidebarSection>('modules')

const derivedSidebarSection = computed<SidebarSection>(() => {
  if (isWeeklyPreviewMode.value || activePlannerView.value === 'week') {
    return 'calendar'
  }

  return 'modules'
})

watch(derivedSidebarSection, (section) => {
  if (sidebarActiveSection.value !== 'profile') {
    sidebarActiveSection.value = section
  }
}, { immediate: true })

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

    <div class="app-layout">
      <Sidebar
        v-if="currentUser || isDevBypass || isWeeklyPreviewMode"
        :active-section="sidebarActiveSection"
        @navigate="onSidebarNavigate"
      />
      <div class="app-content">
        <main class="app-main">
          <template v-if="isWeeklyPreviewMode">
            <section id="planner-section" class="content-section">
              <WeeklySchedule
                :events="visibleWeeklyPreviewEvents"
                :hidden-series-items="hiddenSeriesItems"
                :loading="false"
                :error="null"
                :week-start="weekStartDate"
                @hide-series="hideScheduleSeries($event.seriesId, $event.title)"
                @show-series="showScheduleSeries"
                @show-all-series="showAllScheduleSeries"
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
          <template v-else-if="!currentUser && !isDevBypass">
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
                :modules="modules"
                :visible-weekly-schedule-events="visibleWeeklyScheduleEvents"
                :week-start-date="weekStartDate"
                @update:active-planner-view="activePlannerView = $event"
                @hide-series="hideScheduleSeries($event.seriesId, $event.title)"
                @show-series="showScheduleSeries"
                @show-all-series="showAllScheduleSeries"
                @undo-hide-series="undoHideScheduleSeries"
                @select-module="selectedModule = $event"
              />
              </section>
            </section>
          </template>
        </main>
      </div>
    </div>
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
</template>

<style scoped src="./app.css"></style>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-layout {
  display: flex;
  min-height: calc(100vh - 56px);
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
</style>
