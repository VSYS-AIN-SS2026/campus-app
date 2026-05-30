<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase'
import CombinedWeekView from '../components/teamWeek/CombinedWeekView.vue'
import TeamAppointmentSearchForm from '../components/teamWeek/TeamAppointmentSearchForm.vue'
import CreateAppointmentDialog from '../components/teamWeek/CreateAppointmentDialog.vue'
import type {
  AppNotification,
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

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

// =====================================================================
// DEMO-DATEN für die Belegt-Spur (Mitglieder-Stundenpläne) – ersetzt eine
// spätere Story durch echte Daten (Endpunkt für Mitglieder-Stundenpläne).
// Termine, Einladungen und Suche laufen bereits über echte Endpunkte.
// =====================================================================
const sampleMembers: CombinedWeekMember[] = [
  { id: 'm-anna', name: 'Anna Demo' },
  { id: 'm-ben', name: 'Ben Demo' },
  { id: 'm-carla', name: 'Carla Demo' },
]

const sampleSlots: MemberScheduleSlot[] = [
  // Montag: identischer Slot aller drei (wird zusammengefasst)
  { memberId: 'm-anna', dayIndex: 0, startTime: '08:00', endTime: '10:00', title: 'Vorlesung' },
  { memberId: 'm-ben', dayIndex: 0, startTime: '08:00', endTime: '10:00', title: 'Vorlesung' },
  { memberId: 'm-carla', dayIndex: 0, startTime: '08:00', endTime: '10:00', title: 'Vorlesung' },
  // Montag: zwei Mitglieder
  { memberId: 'm-anna', dayIndex: 0, startTime: '10:00', endTime: '12:00', title: 'Übung' },
  { memberId: 'm-ben', dayIndex: 0, startTime: '10:00', endTime: '12:00', title: 'Übung' },
  // Montag: ein Mitglied
  { memberId: 'm-carla', dayIndex: 0, startTime: '13:00', endTime: '15:00', title: 'Labor' },
  // Dienstag: Teilüberlappung -> segmentierte Blöcke
  { memberId: 'm-anna', dayIndex: 1, startTime: '09:00', endTime: '11:00', title: 'Seminar' },
  { memberId: 'm-ben', dayIndex: 1, startTime: '10:00', endTime: '12:00', title: 'Seminar' },
  // Mittwoch: ausgeblendet zählt weiterhin als belegt
  { memberId: 'm-anna', dayIndex: 2, startTime: '08:00', endTime: '09:30', title: 'Tutorium', state: 'hidden' },
  { memberId: 'm-ben', dayIndex: 2, startTime: '08:00', endTime: '09:30', title: 'Tutorium' },
  // Mittwoch: abgewählt -> komplett herausgefiltert (erzeugt keinen Block)
  { memberId: 'm-carla', dayIndex: 2, startTime: '14:00', endTime: '16:00', title: 'Optional', state: 'deselected' },
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

// ===================== Suche (echter Endpoint) =====================
function mondayOf(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return day
}

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
  return {
    id: `${row.starts_at}-${row.ends_at}`,
    dayIndex: (start.getDay() + 6) % 7,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    label: 'frei',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }
}

// ===================== Termine (echte Daten) =====================
interface AppointmentInvitationRow {
  name: string | null
  status: string
}
interface AppointmentRow {
  id: string
  title: string
  starts_at: string
  ends_at: string
  invitations: AppointmentInvitationRow[] | null
}

const appointments = ref<CombinedAppointment[]>([])
const appointmentsError = ref<string | null>(null)

async function loadAppointments() {
  if (!supabase) {
    return
  }
  const monday = mondayOf(weekStart.value)
  const weekEnd = new Date(monday)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { data, error: rpcError } = await supabase.rpc('get_team_appointments', {
    p_team_id: teamId,
    p_from: monday.toISOString(),
    p_to: weekEnd.toISOString(),
  })

  if (rpcError) {
    appointmentsError.value = rpcError.message
    appointments.value = []
    return
  }

  appointmentsError.value = null
  appointments.value = ((data ?? []) as AppointmentRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    // Decliner werden nicht als Teilnehmer (belegt) geführt.
    attendees: (row.invitations ?? [])
      .filter((invitation) => invitation.status !== 'declined')
      .map((invitation) => ({ name: invitation.name ?? 'Unbekannt', status: invitation.status })),
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
  if (!supabase) {
    return
  }
  const { data, error: rpcError } = await supabase.rpc('get_my_appointment_invitations')
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
  if (!supabase || answeringId.value) {
    return
  }
  answeringId.value = invitationId
  invitationsError.value = null

  const { error: rpcError } = await supabase.rpc('respond_to_appointment_invitation', {
    p_invitation_id: invitationId,
    p_status: status,
  })

  answeringId.value = null

  if (rpcError) {
    invitationsError.value = rpcError.message
    return
  }

  // Statuswechsel sofort sichtbar: Liste + Wochenansicht aktualisieren.
  await Promise.all([loadMyInvitations(), loadAppointments(), loadNotifications()])
}

const invitationDateFormat = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})
function formatInvitation(invitation: MyAppointmentInvitation): string {
  const end = new Date(invitation.endsAt)
  return `${invitationDateFormat.format(new Date(invitation.startsAt))}–${pad(end.getHours())}:${pad(end.getMinutes())}`
}

// ===================== Benachrichtigungen =====================
interface NotificationRow {
  id: string
  type: string
  title: string
  body: string
  created_at: string
  read_at: string | null
}

const notifications = ref<AppNotification[]>([])
const unreadCount = computed(() => notifications.value.filter((n) => !n.readAt).length)

async function loadNotifications() {
  if (!supabase) {
    return
  }
  const { data, error: rpcError } = await supabase.rpc('get_my_notifications')
  if (rpcError) {
    return
  }
  notifications.value = ((data ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  }))
}

async function onMarkRead(id: string) {
  if (!supabase) {
    return
  }
  await supabase.rpc('mark_notification_read', { p_id: id })
  await loadNotifications()
}

function formatNotificationTime(createdAt: string): string {
  return invitationDateFormat.format(new Date(createdAt))
}

// Wochenwechsel: alte Suchergebnisse verwerfen, Termine der neuen Woche laden.
watch(weekStart, () => {
  searchResults.value = []
  searchPerformed.value = false
  error.value = null
  void loadAppointments()
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
    p_week_start: `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`,
    p_duration_minutes: params.durationMinutes,
    p_min_start: params.minStart,
    p_max_end: params.maxEnd,
    p_excluded_weekdays: params.excludedWeekdays,
    p_time_zone: localTimeZone,
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

// ===================== Termin-Erstell-Dialog =====================
const dialogOpen = ref(false)
const dialogStart = ref<Date | null>(null)
const dialogEnd = ref<Date | null>(null)
const createLoading = ref(false)
const createError = ref<string | null>(null)

function onSelectSlot(id: string) {
  const slot = searchResults.value.find((entry) => entry.id === id)
  if (!slot?.startsAt || !slot.endsAt) {
    return
  }
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
  // Neuen Termin (+ eigene accepted-Einladung) sichtbar machen.
  await Promise.all([loadAppointments(), loadMyInvitations(), loadNotifications()])
}

onMounted(() => {
  void loadAppointments()
  void loadMyInvitations()
  void loadNotifications()
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

    <section class="invitations" aria-label="Benachrichtigungen">
      <h3 class="invitations__title">
        Benachrichtigungen
        <span v-if="unreadCount" class="notif-badge">{{ unreadCount }}</span>
      </h3>
      <p v-if="notifications.length === 0" class="invitations__empty">Keine Benachrichtigungen.</p>
      <ul v-else class="invitations__list">
        <li
          v-for="notification in notifications"
          :key="notification.id"
          class="invitation"
          :class="{ 'invitation--unread': !notification.readAt }"
        >
          <div class="invitation__info">
            <strong class="invitation__name">{{ notification.title }}</strong>
            <span class="invitation__meta">{{ notification.body }}</span>
            <span class="invitation__meta">{{ formatNotificationTime(notification.createdAt) }}</span>
          </div>
          <div class="invitation__actions">
            <button
              v-if="!notification.readAt"
              type="button"
              class="app-button"
              @click="onMarkRead(notification.id)"
            >Gelesen</button>
          </div>
        </li>
      </ul>
    </section>

    <div class="suggestions__layout">
      <aside class="suggestions__search" aria-label="Suchformular">
        <TeamAppointmentSearchForm
          v-model:week-start="weekStart"
          :loading="loading"
          @submit="onSearch"
        />
        <p v-if="loading" class="search-status">Suche läuft…</p>
        <p v-else-if="error" class="search-status search-status--error" role="alert">{{ error }}</p>
      </aside>

      <!-- Container für die kombinierte Wochenansicht -->
      <div class="suggestions__week" aria-label="Kombinierte Wochenansicht">
        <p v-if="appointmentsError" class="search-status search-status--error" role="alert">{{ appointmentsError }}</p>
        <CombinedWeekView
          v-model:week-start="weekStart"
          :members="sampleMembers"
          :slots="sampleSlots"
          :appointments="appointments"
          :search-results="searchResults"
          :search-performed="searchPerformed"
          @select-search-slot="onSelectSlot"
        />
      </div>
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

/* Layout-Container: Such-Form links, Wochenansicht rechts.
   Stapelt auf schmalen Viewports. */
.suggestions__layout {
  display: grid;
  grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
  gap: var(--space-2xl);
  align-items: start;
}

@media (max-width: 48rem) {
  .suggestions__layout {
    grid-template-columns: 1fr;
  }
}

.suggestions__search {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.suggestions__week {
  min-width: 0;
  min-height: 18rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
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

.notif-badge {
  display: inline-grid;
  place-items: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  margin-left: 0.5rem;
  border-radius: 999rem;
  background: var(--color-primary);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
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
