<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase'
import CombinedWeekView from '../components/teamWeek/CombinedWeekView.vue'
import TeamAppointmentSearchForm from '../components/teamWeek/TeamAppointmentSearchForm.vue'
import AppointmentDetailDialog from '../components/teamWeek/AppointmentDetailDialog.vue'
import CreateAppointmentDialog from '../components/teamWeek/CreateAppointmentDialog.vue'
import {
  BROWSER_TIME_ZONE,
  localDateKey,
  localHhMm,
  localWeekdayIndex,
  mondayOf,
  weekRangeUtc,
} from '../utils/datetime'
import type {
  CombinedAppointment,
  CombinedSearchSlot,
  CombinedWeekMember,
  FreeSlotSearchParams,
  MemberScheduleSlot,
  MyAppointmentInvitation,
  NewAppointmentInput,
} from '../types/teamWeek'

const route = useRoute()
const teamId = route.params.id as string

// ===================== Team-Mitglieder + Stundenpläne =====================
interface TeamScheduleRow {
  member_id: string
  member_name: string
  day_index: number | null
  start_time: string | null
  end_time: string | null
  title: string | null
  status: string | null
}

const members = ref<CombinedWeekMember[]>([])
const memberSlots = ref<MemberScheduleSlot[]>([])
const scheduleLoading = ref(false)

async function loadTeamSchedule(showLoader = false) {
  if (!supabase) return
  if (showLoader) scheduleLoading.value = true
  const monday = mondayOf(weekStart.value)
  const { data, error: err } = await supabase.rpc('get_team_week_schedule', {
    p_team_id: teamId,
    p_week_start: localDateKey(monday),
    p_time_zone: BROWSER_TIME_ZONE,
  })
  scheduleLoading.value = false
  if (err || !data) return

  const rows = data as TeamScheduleRow[]

  // Deduplicate members preserving DB order.
  const memberMap = new Map<string, string>()
  for (const row of rows) {
    if (!memberMap.has(row.member_id)) {
      memberMap.set(row.member_id, row.member_name)
    }
  }
  members.value = Array.from(memberMap.entries()).map(([id, name]) => ({ id, name }))

  memberSlots.value = rows
    .filter(row => row.day_index != null && row.start_time != null && row.end_time != null)
    .map(row => ({
      memberId: row.member_id,
      dayIndex: row.day_index as number,
      startTime: (row.start_time as string).slice(0, 5),
      endTime: (row.end_time as string).slice(0, 5),
      title: row.title ?? undefined,
      state: row.status === 'belegt' ? 'active' : row.status === 'ausgeblendet' ? 'hidden' : row.status === 'abgewählt' ? 'deselected' : undefined,
    }))
}

// ===================== Suche =====================
const weekStart = ref<Date>(mondayOf(new Date()))
const loading = ref(false)
const error = ref<string | null>(null)
const searchPerformed = ref(false)
const searchResults = ref<CombinedSearchSlot[]>([])

interface FreeSlotRow {
  starts_at: string
  ends_at: string
  duration_minutes: number
}

function toSearchSlot(row: FreeSlotRow): CombinedSearchSlot {
  const start = new Date(row.starts_at)
  const end = new Date(row.ends_at)
  const dayIndex = localWeekdayIndex(start)
  return {
    id: `${row.starts_at}-${row.ends_at}`,
    dayIndex,
    startTime: localHhMm(start),
    endTime: localHhMm(end),
    label: 'frei',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }
}

// ===================== Termine =====================
interface AppointmentInvitationRow {
  user_id: string | null
  name: string | null
  status: string
}
interface AppointmentRow {
  id: string
  title: string
  description: string | null
  created_by: string
  starts_at: string
  ends_at: string
  invitations: AppointmentInvitationRow[] | null
}

const appointments = ref<CombinedAppointment[]>([])
const appointmentsError = ref<string | null>(null)

async function loadAppointments() {
  if (!supabase) return
  const { fromIso, toIso } = weekRangeUtc(weekStart.value)

  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id

  const { data, error: rpcError } = await supabase.rpc('get_team_appointments', {
    p_team_id: teamId,
    p_from: fromIso,
    p_to: toIso,
  })

  if (rpcError) {
    appointmentsError.value = rpcError.message
    appointments.value = []
    return
  }

  appointmentsError.value = null
  const rows = (data ?? []) as AppointmentRow[]
  appointments.value = rows
    .filter((row) => {
      if (!currentUserId) return true
      const myInvite = (row.invitations ?? []).find((inv) => inv.user_id === currentUserId)
      return !myInvite || myInvite.status !== 'declined'
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      createdBy: row.created_by,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      attendees: (row.invitations ?? [])
        .filter((inv) => inv.status !== 'declined')
        .map((inv) => ({
          userId: inv.user_id ?? undefined,
          name: inv.name ?? 'Unbekannt',
          status: inv.status,
        })),
    }))
}

// ===================== Meine offenen Einladungen =====================
interface InvitationRow {
  invitation_id: string
  status: string
  appointment_id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  team_id: string
  team_name: string
}

const myInvitations = ref<MyAppointmentInvitation[]>([])
const invitationsError = ref<string | null>(null)
const answeringId = ref<string | null>(null)

async function loadMyInvitations() {
  if (!supabase) return
  const { data, error: rpcError } = await supabase.rpc('get_my_appointment_invitations', { p_team_id: teamId })
  if (rpcError) {
    invitationsError.value = rpcError.message
    myInvitations.value = []
    return
  }
  invitationsError.value = null
  myInvitations.value = ((data ?? []) as InvitationRow[]).map((row) => ({
    invitationId: row.invitation_id,
    status: row.status,
    appointmentId: row.appointment_id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    teamId: row.team_id,
    teamName: row.team_name,
  }))
}

async function onAnswer(invitationId: string, status: 'accepted' | 'declined') {
  if (!supabase || answeringId.value) return
  answeringId.value = invitationId
  invitationsError.value = null

  const invitation = myInvitations.value.find((inv) => inv.invitationId === invitationId)
  const appointmentId = invitation?.appointmentId

  // Optimistically remove from local state
  myInvitations.value = myInvitations.value.filter((inv) => inv.invitationId !== invitationId)

  const { error: rpcError } = await supabase.rpc('respond_to_appointment_invitation', {
    p_invitation_id: invitationId,
    p_status: status,
  })

  answeringId.value = null

  if (rpcError) {
    // Restore on error
    if (invitation) myInvitations.value.push(invitation)
    invitationsError.value = rpcError.message
    return
  }

  if (status === 'declined' && appointmentId) {
    appointments.value = appointments.value.filter((a) => a.id !== appointmentId)
  }
}

const invitationDateFormat = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})
function formatInvitation(invitation: MyAppointmentInvitation): string {
  return `${invitationDateFormat.format(new Date(invitation.startsAt))}–${localHhMm(new Date(invitation.endsAt))}`
}

// ===================== Realtime: appointment_invitations =====================
let invChannel: RealtimeChannel | null = null
let invChannelConnectedOnce = false
let authStateUnsub: (() => void) | null = null

function subscribeToInvitationInserts() {
  if (!supabase) return
  if (invChannel) {
    void supabase.removeChannel(invChannel)
    invChannel = null
  }
  invChannelConnectedOnce = false
  invChannel = supabase
    .channel(`appointment-invitations:${teamId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'appointment_invitations' },
      (payload) => {
        const row = payload.new as { id: string; status: string }
        if (
          row.status === 'pending' &&
          !myInvitations.value.some((inv) => inv.invitationId === row.id)
        ) {
          void loadMyInvitations()
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (invChannelConnectedOnce) {
          void loadMyInvitations()
        }
        invChannelConnectedOnce = true
      }
    })
}

function teardownInvitationsChannel() {
  if (supabase && invChannel) {
    void supabase.removeChannel(invChannel)
    invChannel = null
  }
}

function setupInvitationsRealtime() {
  subscribeToInvitationInserts()
  if (!supabase) return
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') subscribeToInvitationInserts()
    if (event === 'SIGNED_OUT') teardownInvitationsChannel()
  })
  authStateUnsub = () => subscription.unsubscribe()
}

function teardownInvitationsRealtime() {
  teardownInvitationsChannel()
  authStateUnsub?.()
  authStateUnsub = null
}

// Wochenwechsel: Suchergebnisse verwerfen, Termine und persönliche Slots neu laden.
watch(weekStart, () => {
  searchResults.value = []
  searchPerformed.value = false
  error.value = null
  void loadAppointments()
  void loadTeamSchedule()
})

async function onSearch(params: FreeSlotSearchParams) {
  if (!supabase) {
    error.value = 'Supabase nicht konfiguriert.'
    return
  }

  const monday = mondayOf(weekStart.value)
  loading.value = true
  error.value = null

  const { data, error: rpcError } = await supabase.rpc('get_team_free_slots', {
    p_team_id: teamId,
    p_week_start: localDateKey(monday),
    p_duration_minutes: params.durationMinutes,
    p_min_start: params.minStart,
    p_max_end: params.maxEnd,
    p_excluded_weekdays: params.excludedWeekdays,
    p_time_zone: BROWSER_TIME_ZONE,
  })

  loading.value = false

  if (rpcError) {
    error.value = rpcError.message
    searchResults.value = []
    searchPerformed.value = false
    return
  }

  searchPerformed.value = true
  searchResults.value = ((data ?? []) as FreeSlotRow[]).map(toSearchSlot)
}

// ===================== Termin-Detail-Dialog =====================
const currentUserId = ref<string | null>(null)
const selectedAppointment = ref<CombinedAppointment | null>(null)
const editDialogOpen = ref(false)
const editLoading = ref(false)
const editError = ref<string | null>(null)

function onSelectAppointment(id: string) {
  selectedAppointment.value = appointments.value.find(a => a.id === id) ?? null
  editDialogOpen.value = !!selectedAppointment.value
  editError.value = null
}

async function onUpdateAppointment(payload: NewAppointmentInput) {
  if (!supabase || !selectedAppointment.value) return
  editLoading.value = true
  editError.value = null

  const { error: rpcError } = await supabase.rpc('update_team_appointment', {
    p_appointment_id: selectedAppointment.value.id,
    p_title: payload.title,
    p_description: payload.description,
    p_starts_at: payload.startsAt,
    p_ends_at: payload.endsAt,
  })

  editLoading.value = false

  if (rpcError) {
    editError.value = rpcError.message
    return
  }

  editDialogOpen.value = false
  selectedAppointment.value = null
  await loadAppointments()
}

async function onDeleteAppointment(id: string) {
  if (!supabase) return
  editLoading.value = true
  editError.value = null

  const { error: rpcError } = await supabase.rpc('delete_team_appointment', {
    p_appointment_id: id,
  })

  editLoading.value = false

  if (rpcError) {
    editError.value = rpcError.message
    return
  }

  editDialogOpen.value = false
  selectedAppointment.value = null
  appointments.value = appointments.value.filter(a => a.id !== id)
  await loadMyInvitations()
}

// ===================== Termin-Erstell-Dialog =====================
const dialogOpen = ref(false)
const dialogStart = ref<Date | null>(null)
const dialogEnd = ref<Date | null>(null)
const createLoading = ref(false)
const createError = ref<string | null>(null)

function onSelectSlot(id: string) {
  const slot = searchResults.value.find((entry) => entry.id === id)
  if (!slot?.startsAt || !slot.endsAt) return
  dialogStart.value = new Date(slot.startsAt)
  dialogEnd.value = new Date(slot.endsAt)
  createError.value = null
  dialogOpen.value = true
}

async function onCreate(payload: NewAppointmentInput) {
  if (!supabase) {
    createError.value = 'Supabase nicht konfiguriert.'
    return
  }

  createLoading.value = true
  createError.value = null

  const { error: rpcError } = await supabase.rpc('create_team_appointment', {
    p_team_id: teamId,
    p_title: payload.title,
    p_description: payload.description,
    p_starts_at: payload.startsAt,
    p_ends_at: payload.endsAt,
  })

  createLoading.value = false

  if (rpcError) {
    createError.value = rpcError.message
    return
  }

  dialogOpen.value = false
  await Promise.all([loadAppointments(), loadMyInvitations()])
}

onMounted(async () => {
  const { data: { user } } = await supabase!.auth.getUser()
  currentUserId.value = user?.id ?? null
  void loadTeamSchedule(true)
  void loadAppointments()
  void loadMyInvitations()
  setupInvitationsRealtime()
})

onUnmounted(() => {
  teardownInvitationsRealtime()
})
</script>

<template>
  <section class="suggestions" :data-team-id="teamId">
    <header class="suggestions__intro">
      <h2 class="suggestions__heading">Terminvorschläge</h2>
      <p class="suggestions__subtitle">
        Finde gemeinsame freie Termine basierend auf den Wochenplänen der Team-Mitglieder.
      </p>
    </header>

    <section class="invitations" aria-label="Meine offenen Einladungen">
      <h3 class="invitations__title">Meine offenen Einladungen</h3>
      <p v-if="invitationsError" class="invitations__error" role="alert">{{ invitationsError }}</p>
      <p v-else-if="myInvitations.length === 0" class="invitations__empty">Keine offenen Einladungen.</p>
      <ul v-else class="invitations__list">
        <li v-for="invitation in myInvitations" :key="invitation.invitationId" class="invitation">
          <div class="invitation__info">
            <strong class="invitation__name">{{ invitation.title }}</strong>
            <span class="invitation__meta">{{ invitation.teamName }} · {{ formatInvitation(invitation) }}</span>
          </div>
          <div class="invitation__actions">
            <button
              type="button"
              class="app-button invitation__accept"
              :disabled="answeringId === invitation.invitationId"
              @click="onAnswer(invitation.invitationId, 'accepted')"
            >Zusagen</button>
            <button
              type="button"
              class="app-button"
              :disabled="answeringId === invitation.invitationId"
              @click="onAnswer(invitation.invitationId, 'declined')"
            >Absagen</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Search panel -->
    <section class="suggestions__search" aria-label="Suchformular">
      <TeamAppointmentSearchForm
        v-model:week-start="weekStart"
        :loading="loading"
        @submit="onSearch"
      />
      <p v-if="loading" class="search-status">Suche läuft…</p>
      <p v-else-if="error" class="search-status search-status--error" role="alert">{{ error }}</p>
      <p v-if="appointmentsError" class="search-status search-status--error" role="alert">{{ appointmentsError }}</p>
    </section>

    <!-- Group calendar: all members' schedules, team appointments, search results -->
    <div class="suggestions__week" aria-label="Gruppenkalender">
      <p v-if="scheduleLoading" class="search-status">Stundenpläne werden geladen…</p>
      <CombinedWeekView
        v-else
        v-model:week-start="weekStart"
        :members="members"
        :slots="memberSlots"
        :appointments="appointments"
        :search-results="searchResults"
        :loading="loading"
        :search-performed="searchPerformed"
        @select-search-slot="onSelectSlot"
        @select-appointment="onSelectAppointment"
      />
    </div>

    <CreateAppointmentDialog
      :open="dialogOpen"
      :start="dialogStart"
      :end="dialogEnd"
      :loading="createLoading"
      :error="createError"
      @close="dialogOpen = false"
      @submit="onCreate"
    />

    <AppointmentDetailDialog
      :open="editDialogOpen"
      :appointment="selectedAppointment"
      :current-user-id="currentUserId"
      :loading="editLoading"
      :error="editError"
      @close="editDialogOpen = false"
      @update="onUpdateAppointment"
      @delete="onDeleteAppointment"
    />
  </section>
</template>

<style scoped>
.suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.suggestions__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.suggestions__heading {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.suggestions__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.6;
  margin: 0;
}

.suggestions__search {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.suggestions__week {
  min-height: 28rem;
  display: flex;
  flex-direction: column;
}

.invitations {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-raised);
  padding: var(--space-2xl);
}

.invitations__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
}

.invitations__empty {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.invitations__error {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-error, #dc2626);
}

.invitations__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.invitation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
  padding: var(--space-md);
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius-control, 0.375rem);
  background: var(--color-surface);
}

.invitation__info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.invitation__name {
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.invitation__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.invitation__actions {
  display: flex;
  gap: var(--space-sm);
}

.invitation__accept {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.invitation--unread {
  border-left: 0.1875rem solid var(--color-primary);
}

.search-status {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.search-status--error {
  color: var(--color-error, #dc2626);
  padding: var(--space-md);
  border: 0.0625rem solid var(--color-error-border, var(--color-border));
  border-radius: var(--radius-lg);
  background: var(--color-error-bg, transparent);
}
</style>
