import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { Pool, type PoolConfig } from 'pg'

export type BriefFile = {
  originalName: string
  mimeType: string
  size: number
}

export type Brief = {
  id: string
  title: string
  description: string
  contentType: string
  targetAudience: string
  notes: string
  file: BriefFile
  createdAt: string
  updatedAt: string
}

export type IncomingFile = {
  buffer: Buffer
  originalName: string
  mimeType: string
  size: number
}

export type BriefText = {
  title: string
  description: string
  contentType: string
  targetAudience: string
  notes: string
}

export type BriefPatch = {
  title?: string
  description?: string
  contentType?: string
  targetAudience?: string
  notes?: string
  file?: IncomingFile
}

export type BriefUpload = {
  originalName: string
  mimeType: string
  bytes: Buffer
}

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BRIEF_COLUMNS = `id, title, description, content_type, target_audience, notes,
  file_name, file_mime, file_size, created_at, updated_at`

const SCHEMA = `
CREATE TABLE IF NOT EXISTS briefs (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  content_type text NOT NULL,
  target_audience text NOT NULL,
  notes text NOT NULL,
  file_name text NOT NULL,
  file_mime text NOT NULL,
  file_size integer NOT NULL,
  file_bytes bytea NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
)
`

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

function getPool(): Pool {
  pool ??= new Pool(databaseConfig())
  return pool
}

export async function initStore(): Promise<void> {
  await getPool().query(SCHEMA)
}

export async function pingStore(): Promise<void> {
  await getPool().query('SELECT 1')
}

function timestamp(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

function asBrief(row: unknown): Brief {
  if (typeof row !== 'object' || row === null) {
    throw new Error('Invalid brief row')
  }
  const value = row as Record<string, unknown>
  const createdAt = timestamp(value.created_at)
  const updatedAt = timestamp(value.updated_at)
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.content_type !== 'string' ||
    typeof value.target_audience !== 'string' ||
    typeof value.notes !== 'string' ||
    typeof value.file_name !== 'string' ||
    typeof value.file_mime !== 'string' ||
    typeof value.file_size !== 'number' ||
    !createdAt ||
    !updatedAt
  ) {
    throw new Error('Invalid brief row')
  }

  return {
    id: value.id,
    title: value.title,
    description: value.description,
    contentType: value.content_type,
    targetAudience: value.target_audience,
    notes: value.notes,
    file: {
      originalName: value.file_name,
      mimeType: value.file_mime,
      size: value.file_size,
    },
    createdAt,
    updatedAt,
  }
}

function storedFile(file: IncomingFile): BriefFile {
  const originalName = path.basename(file.originalName).trim() || 'upload'
  return {
    originalName,
    mimeType: file.mimeType,
    size: file.size,
  }
}

async function readBrief(id: string): Promise<Brief | null> {
  if (!ID_PATTERN.test(id)) return null
  const result = await getPool().query(`SELECT ${BRIEF_COLUMNS} FROM briefs WHERE id = $1`, [id])
  const row: unknown = result.rows[0]
  if (!row) return null
  return asBrief(row)
}

export async function listBriefs(): Promise<Brief[]> {
  const result = await getPool().query(
    `SELECT ${BRIEF_COLUMNS} FROM briefs ORDER BY created_at DESC`,
  )
  return result.rows.map((row) => asBrief(row))
}

export async function getBrief(id: string): Promise<Brief | null> {
  return readBrief(id)
}

export async function getBriefFile(id: string): Promise<BriefUpload | null> {
  if (!ID_PATTERN.test(id)) return null
  const result = await getPool().query(
    `SELECT file_name, file_mime, file_bytes FROM briefs WHERE id = $1`,
    [id],
  )
  const row: unknown = result.rows[0]
  if (typeof row !== 'object' || row === null) return null
  const value = row as Record<string, unknown>
  if (typeof value.file_name !== 'string' || typeof value.file_mime !== 'string') return null
  const bytes = value.file_bytes
  if (!Buffer.isBuffer(bytes)) return null
  return {
    originalName: value.file_name,
    mimeType: value.file_mime,
    bytes,
  }
}

export async function createBrief(text: BriefText, file: IncomingFile): Promise<Brief> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const stored = storedFile(file)
  const result = await getPool().query(
    `INSERT INTO briefs (
      id, title, description, content_type, target_audience, notes,
      file_name, file_mime, file_size, file_bytes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING ${BRIEF_COLUMNS}`,
    [
      id,
      text.title,
      text.description,
      text.contentType,
      text.targetAudience,
      text.notes,
      stored.originalName,
      stored.mimeType,
      stored.size,
      file.buffer,
      now,
      now,
    ],
  )
  return asBrief(result.rows[0])
}

export async function updateBrief(id: string, patch: BriefPatch): Promise<Brief | null> {
  const existing = await readBrief(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const title = patch.title ?? existing.title
  const description = patch.description ?? existing.description
  const contentType = patch.contentType ?? existing.contentType
  const targetAudience = patch.targetAudience ?? existing.targetAudience
  const notes = patch.notes ?? existing.notes

  if (patch.file) {
    const stored = storedFile(patch.file)
    const result = await getPool().query(
      `UPDATE briefs SET
        title = $2,
        description = $3,
        content_type = $4,
        target_audience = $5,
        notes = $6,
        file_name = $7,
        file_mime = $8,
        file_size = $9,
        file_bytes = $10,
        updated_at = $11
      WHERE id = $1
      RETURNING ${BRIEF_COLUMNS}`,
      [
        id,
        title,
        description,
        contentType,
        targetAudience,
        notes,
        stored.originalName,
        stored.mimeType,
        stored.size,
        patch.file.buffer,
        now,
      ],
    )
    const row: unknown = result.rows[0]
    return row ? asBrief(row) : null
  }

  const result = await getPool().query(
    `UPDATE briefs SET
      title = $2,
      description = $3,
      content_type = $4,
      target_audience = $5,
      notes = $6,
      updated_at = $7
    WHERE id = $1
    RETURNING ${BRIEF_COLUMNS}`,
    [id, title, description, contentType, targetAudience, notes, now],
  )
  const row: unknown = result.rows[0]
  return row ? asBrief(row) : null
}

export async function removeBrief(id: string): Promise<boolean> {
  if (!ID_PATTERN.test(id)) return false
  const result = await getPool().query(`DELETE FROM briefs WHERE id = $1`, [id])
  return (result.rowCount ?? 0) > 0
}
