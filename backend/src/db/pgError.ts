export function postgresCode(err: unknown): string | null {
  if (typeof err !== 'object' || err === null || !('code' in err)) return null
  return typeof err.code === 'string' ? err.code : null
}
