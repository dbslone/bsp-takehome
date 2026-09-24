import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PoolClient } from 'pg'
import { getPool } from './pool.js'

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url))
const MIGRATION_NAME = /^\d{3}_.+\.sql$/

const MIGRATION_LOCK = 814_214

export async function migrate(): Promise<void> {
  const client = await getPool().connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK])
    await ensureMigrationsTable(client)
    for (const id of await pendingMigrationIds(client)) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, id), 'utf8')
      await applyMigration(client, id, sql)
    }
  } finally {
    await unlockMigrations(client)
    client.release()
  }
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

async function unlockMigrations(client: PoolClient): Promise<void> {
  await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK]).catch((err: unknown) => {
    console.error('Could not release migration lock', err)
  })
}

async function pendingMigrationIds(client: PoolClient): Promise<string[]> {
  const names = (await readdir(MIGRATIONS_DIR)).filter((name) => MIGRATION_NAME.test(name))
  // oxlint-disable-next-line unicorn/no-array-sort -- this is a fresh local array
  names.sort()
  const applied = await appliedMigrationIds(client)
  return names.filter((name) => !applied.has(name))
}

async function appliedMigrationIds(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ id: string }>('SELECT id FROM schema_migrations')
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
