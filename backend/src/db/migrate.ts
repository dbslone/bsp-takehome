import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PoolClient } from 'pg'
import { getPool } from './pool.js'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url))
const MIGRATION_NAME = /^\d{3}_.+\.sql$/

export async function migrate(): Promise<void> {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  for (const id of await pendingMigrationIds()) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, id), 'utf8')
    const client = await pool.connect()
    try {
      await applyMigration(client, id, sql)
    } finally {
      client.release()
    }
  }
}

async function pendingMigrationIds(): Promise<string[]> {
  const names = (await readdir(MIGRATIONS_DIR)).filter((name) => MIGRATION_NAME.test(name))
  // oxlint-disable-next-line unicorn/no-array-sort -- this is a fresh local array
  names.sort()
  const applied = await appliedMigrationIds()
  return names.filter((name) => !applied.has(name))
}

async function appliedMigrationIds(): Promise<Set<string>> {
  const result = await getPool().query<{ id: string }>('SELECT id FROM schema_migrations')
  return new Set(result.rows.map((row) => row.id))
}

async function applyMigration(client: PoolClient, id: string, sql: string): Promise<void> {
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}
