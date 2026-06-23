import { onMounted, onUnmounted, ref } from 'vue'

// Polls the self-hosted Uptime Kuma public status page (see deploy/README.md)
// so the app can warn the user when the database or the client server is down.
//
// Two endpoints are read, both same-origin via the nginx proxy:
//   /api/status-page/<slug>            → maps monitor name → id
//   /api/status-page/heartbeat/<slug>  → latest heartbeat per monitor id
//
// Fail-open: if the status service itself is unreachable we report "unknown"
// (null) and the banner stays hidden — we never cry wolf over our own monitor.

type Health = boolean | null // true = up, false = down, null = unknown

const SLUG = import.meta.env.VITE_STATUS_PAGE_SLUG?.trim() || 'campus'
const API_BASE = import.meta.env.VITE_STATUS_API_BASE?.trim() || '/api/status-page'
export const statusPageUrl = import.meta.env.VITE_STATUS_PAGE_URL?.trim() || null

const POLL_INTERVAL_MS = 60_000

// Uptime Kuma heartbeat status codes: 0 = down, 1 = up, 2 = pending, 3 = maintenance.
const KUMA_STATUS_UP = 1

interface KumaMonitor {
  id: number
  name: string
}

interface KumaConfigResponse {
  publicGroupList?: { monitorList?: KumaMonitor[] }[]
}

interface KumaHeartbeat {
  status: number
}

interface KumaHeartbeatResponse {
  heartbeatList?: Record<string, KumaHeartbeat[]>
}

function matchMonitorId(monitors: KumaMonitor[], needles: string[]): number | null {
  const found = monitors.find((m) =>
    needles.some((n) => m.name.toLowerCase().includes(n)),
  )
  return found?.id ?? null
}

function latestHealth(beats: KumaHeartbeat[] | undefined): Health {
  if (!beats || beats.length === 0) return null
  return beats[beats.length - 1].status === KUMA_STATUS_UP
}

export function useServiceStatus() {
  const dbUp = ref<Health>(null)
  const appUp = ref<Health>(null)
  const lastChecked = ref<Date | null>(null)

  // Monitor ids are resolved once from the config endpoint, then reused.
  let dbMonitorId: number | null = null
  let appMonitorId: number | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  async function resolveMonitorIds(): Promise<void> {
    if (dbMonitorId !== null || appMonitorId !== null) return
    const res = await fetch(`${API_BASE}/${SLUG}`, { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as KumaConfigResponse
    const monitors = (data.publicGroupList ?? []).flatMap((g) => g.monitorList ?? [])
    dbMonitorId = matchMonitorId(monitors, ['supabase', 'db'])
    appMonitorId = matchMonitorId(monitors, ['frontend'])
  }

  async function poll(): Promise<void> {
    try {
      await resolveMonitorIds()
      const res = await fetch(`${API_BASE}/heartbeat/${SLUG}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as KumaHeartbeatResponse
      const beats = data.heartbeatList ?? {}
      if (dbMonitorId !== null) dbUp.value = latestHealth(beats[String(dbMonitorId)])
      if (appMonitorId !== null) appUp.value = latestHealth(beats[String(appMonitorId)])
      lastChecked.value = new Date()
    } catch {
      // Status service unreachable → leave values as-is (fail-open).
    }
  }

  onMounted(() => {
    void poll()
    timer = setInterval(() => void poll(), POLL_INTERVAL_MS)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    timer = null
  })

  return { dbUp, appUp, lastChecked, statusPageUrl }
}
