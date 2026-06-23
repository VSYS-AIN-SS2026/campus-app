const NETWORK_PATTERNS = [
  'failed to fetch',
  'load failed',
  'networkerror',
  'network request failed',
  'fetch error',
  'err_network',
  'err_internet_disconnected',
]

function isNetworkError(message: string): boolean {
  const lower = message.toLowerCase()
  return NETWORK_PATTERNS.some(p => lower.includes(p))
}

export function normalizeError(error: unknown, fallback?: string): string {
  if (!navigator.onLine) {
    return 'Keine Internetverbindung. Bitte prüfe deine Verbindung und versuche es erneut.'
  }

  const message = (() => {
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as Record<string, unknown>).message)
    }
    if (typeof error === 'string') return error
    return ''
  })()

  if (isNetworkError(message)) {
    return 'Verbindungsproblem. Bitte prüfe deine Internetverbindung.'
  }

  const lower = message.toLowerCase()

  if (lower.includes('jwt expired') || lower.includes('token is expired')) {
    return 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.'
  }

  if (lower.includes('not authorized') || lower.includes('unauthorized') || lower.includes('permission denied')) {
    return 'Keine Berechtigung für diese Aktion.'
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Der Server antwortet nicht. Bitte versuche es später erneut.'
  }

  return fallback ?? 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
}
