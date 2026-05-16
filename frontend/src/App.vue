<script setup lang="ts">
import AuthGate from './components/AuthGate.vue'
import ModuleDrawer from './components/ModuleDrawer.vue'
import PlannerViewShell from './components/PlannerViewShell.vue'
import ProfileSelectionPanel from './components/ProfileSelectionPanel.vue'
import WeeklySchedule from './components/WeeklySchedule.vue'
import { useAppController } from './composables/useAppController'

const { magicLinkRedirectTo, allCategories, activePlannerView, authEmail, authError, authFirstName, authInfo, authLastName, authLoading, authSending, canEditModuleStatuses, categoryError, currentUser, currentUserEmail, demoUserProfile, error, isWeeklyPreviewMode, lastHiddenSeries, loading, modules, moduleStatusError, profileError, profileInfo, profileSaving, savedSpo, savedStudyProgram, savingCategoryModuleId, savingModuleId, scheduleVisibilityError, scheduleVisibilityInfo, selectedModule, selectedSpoId, selectedStudyProgramId, selectionDirty, spoItems, studyProgramItems, visibleWeeklyPreviewEvents, visibleWeeklyScheduleEvents, weekStartDate, getSpoLabel, getStudyProgramLabel, hideScheduleSeries, saveModuleCategories, saveModuleStatus, saveStudyProfileSelection, sendMagicLink, signOut, undoHideScheduleSeries } = useAppController()
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
      <template v-if="isWeeklyPreviewMode">
        <WeeklySchedule
          :events="visibleWeeklyPreviewEvents"
          :loading="false"
          :error="null"
          :week-start="weekStartDate"
          @hide-series="hideScheduleSeries($event.seriesId, $event.title)"
        />
      </template>

      <template v-else-if="authLoading">
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

      <template v-else>
        <div class="page-header">
          <h1 class="page-title">Meine Module</h1>
          <p class="page-subtitle">Wähle deinen Studiengang und die SPO, speichere die Auswahl im Demo-Profil und sieh direkt die zugehörigen Module.</p>
        </div>

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
          :modules="modules"
          :visible-weekly-schedule-events="visibleWeeklyScheduleEvents"
          :week-start-date="weekStartDate"
          @update:active-planner-view="activePlannerView = $event"
          @hide-series="hideScheduleSeries($event.seriesId, $event.title)"
          @undo-hide-series="undoHideScheduleSeries"
          @select-module="selectedModule = $event"
        />
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

<style scoped src="./app.css"></style>
