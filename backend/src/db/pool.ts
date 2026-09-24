import { Pool, type PoolConfig } from 'pg'

let pool: Pool | undefined

function databaseConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  const sslMode = sslModeOf(connectionString)
  const useSsl =
    process.env.DATABASE_SSL === 'true' ||
    sslMode === 'require' ||
    sslMode === 'verify-ca' ||
    sslMode === 'verify-full'

  return {
    connectionString: useSsl ? withoutSslMode(connectionString) : connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  }
}

function sslModeOf(connectionString: string): string | null {
  try {
    return new URL(connectionString).searchParams.get('sslmode')
  } catch {
    return null
  }
}

function withoutSslMode(connectionString: string): string {
  const url = new URL(connectionString)
  url.searchParams.delete('sslmode')
  return url.toString()
}

export function getPool(): Pool {
  pool ??= new Pool(databaseConfig())
  return pool
}

export async function pingStore(): Promise<void> {
  await getPool().query('SELECT 1')
}
