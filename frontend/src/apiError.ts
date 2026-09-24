import axios from 'axios'

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback
  if (err.code === 'ECONNABORTED') return 'The request timed out'
  const message = errorText(err.response?.data)
  return message ?? fallback
}

function errorText(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('error' in data)) return null
  const message = data.error
  return typeof message === 'string' && message ? message : null
}
