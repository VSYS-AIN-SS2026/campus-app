import { computed, ref } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../supabase'

export interface GlobalNotification {
  id: string
  teamId: string | null
  type: string
  title: string
  body: string
  payload: Record<string, unknown>
  createdAt: string
  readAt: string | null
}

interface NotificationRow {
  id: string
  team_id: string | null
  type: string
  title: string
  body: string
  payload: Record<string, unknown>
  created_at: string
  read_at: string | null
}

function mapRow(row: NotificationRow): GlobalNotification {
  return {
    id: row.id,
    teamId: row.team_id,
    type: row.type,
    title: row.title,
    body: row.body,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    readAt: row.read_at,
  }
}

// Module-level singleton: shared across all callers.
const allNotifications = ref<GlobalNotification[]>([])
const unreadCount = computed(() => allNotifications.value.filter(n => !n.readAt).length)

let channel: RealtimeChannel | null = null

async function fetchAllNotifications() {
  if (!supabase) return
  const { data, error } = await supabase.rpc('get_my_notifications')
  if (error || !data) return
  allNotifications.value = (data as NotificationRow[]).map(mapRow)
}

async function markRead(id: string) {
  // Optimistic: update local state immediately.
  const notif = allNotifications.value.find(n => n.id === id)
  if (notif && !notif.readAt) {
    notif.readAt = new Date().toISOString()
  }
  if (!supabase) return
  await supabase.rpc('mark_notification_read', { p_id: id })
}

async function markAllRead() {
  const unread = allNotifications.value.filter(n => !n.readAt)
  const now = new Date().toISOString()
  for (const n of unread) {
    n.readAt = now
  }
  if (!supabase || unread.length === 0) return
  await Promise.all(unread.map(n => supabase!.rpc('mark_notification_read', { p_id: n.id })))
}

function subscribeToInserts() {
  if (!supabase) return
  if (channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
  // RLS on notifications (recipient_id = auth.uid()) ensures only the current
  // user's own rows are delivered by Realtime.
  channel = supabase
    .channel('notifications-global-inbox')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        const row = payload.new as NotificationRow
        allNotifications.value.unshift(mapRow(row))
      },
    )
    .subscribe()
}

function teardownNotifications() {
  if (supabase && channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
}

async function deleteNotification(id: string) {
  allNotifications.value = allNotifications.value.filter(n => n.id !== id)
  if (!supabase) return
  await supabase.rpc('delete_notification', { p_id: id })
}

async function deleteAllNotifications() {
  const ids = allNotifications.value.map(n => n.id)
  allNotifications.value = []
  if (!supabase || ids.length === 0) return
  await Promise.all(ids.map(id => supabase!.rpc('delete_notification', { p_id: id })))
}

export function useNotifications() {
  return {
    allNotifications,
    unreadCount,
    fetchAllNotifications,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
    subscribeToInserts,
    teardownNotifications,
  }
}
