import { onMounted, onUnmounted, ref } from 'vue'

export function useConnectionStatus() {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const justReconnected = ref(false)

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function handleOnline() {
    isOnline.value = true
    justReconnected.value = true
    reconnectTimer = setTimeout(() => {
      justReconnected.value = false
    }, 4000)
  }

  function handleOffline() {
    isOnline.value = false
    justReconnected.value = false
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (reconnectTimer !== null) clearTimeout(reconnectTimer)
  })

  return { isOnline, justReconnected }
}
