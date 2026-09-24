export const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function asRecord(row: unknown, label: string): Record<string, unknown> {
  if (typeof row !== 'object' || row === null) {
    throw new Error(`Invalid ${label}`)
  }
  return row as Record<string, unknown>
}

export function timestamp(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

export function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${label}`)
  }
  return value
}
