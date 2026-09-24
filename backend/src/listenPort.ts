export function listenPort(raw: string | undefined): number {
  const value = raw ?? '3001'
  if (!/^\d+$/.test(value)) {
    throw new Error('PORT must be an integer from 1 to 65535')
  }
  const port = Number(value)
  if (port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535')
  }
  return port
}
