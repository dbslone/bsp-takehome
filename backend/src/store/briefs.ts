import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { clipBriefText } from '../briefFields.js'
import { getPool } from '../db/pool.js'
import { asRecord, ID_PATTERN, requiredString, timestamp } from './row.js'
import type { Brief, BriefFile, BriefPatch, BriefText, BriefUpload, IncomingFile } from './types.js'

const BRIEF_COLUMNS = `id, title, description, content_type, target_audience, notes,
  file_name, file_mime, file_size, created_at, updated_at`

function asBrief(row: unknown): Brief {
  const value = asRecord(row, 'brief row')
  const createdAt = timestamp(value.created_at)
  const updatedAt = timestamp(value.updated_at)
  if (!createdAt || !updatedAt || typeof value.file_size !== 'number') {
    throw new Error('Invalid brief row')
  }

  return {
    id: requiredString(value.id, 'brief row'),
    title: requiredString(value.title, 'brief row'),
    description: requiredString(value.description, 'brief row'),
    contentType: requiredString(value.content_type, 'brief row'),
    targetAudience: requiredString(value.target_audience, 'brief row'),
    notes: requiredString(value.notes, 'brief row'),
    file: {
      originalName: requiredString(value.file_name, 'brief row'),
      mimeType: requiredString(value.file_mime, 'brief row'),
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

function briefText(existing: Brief, patch: BriefPatch): BriefText {
  return {
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description,
    contentType: patch.contentType ?? existing.contentType,
    targetAudience: patch.targetAudience ?? existing.targetAudience,
    notes: patch.notes ?? existing.notes,
  }
}

async function readBrief(id: string): Promise<Brief | null> {
  if (!ID_PATTERN.test(id)) return null
  const result = await getPool().query(`SELECT ${BRIEF_COLUMNS} FROM briefs WHERE id = $1`, [id])
  const row: unknown = result.rows[0]
  return row ? asBrief(row) : null
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
  const bytes = fileBytes(value.file_bytes)
  if (!bytes) return null
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

export async function fillBlankBriefFields(id: string, extracted: BriefText): Promise<void> {
  if (!ID_PATTERN.test(id)) return
  const text = clipBriefText(extracted)
  await getPool().query(
    `UPDATE briefs SET
      title = CASE WHEN btrim(title) = '' AND $2 <> '' THEN $2 ELSE title END,
      description = CASE WHEN btrim(description) = '' AND $3 <> '' THEN $3 ELSE description END,
      content_type = CASE WHEN btrim(content_type) = '' AND $4 <> '' THEN $4 ELSE content_type END,
      target_audience = CASE WHEN btrim(target_audience) = '' AND $5 <> '' THEN $5 ELSE target_audience END,
      notes = CASE WHEN btrim(notes) = '' AND $6 <> '' THEN $6 ELSE notes END,
      updated_at = CASE
        WHEN (btrim(title) = '' AND $2 <> '')
          OR (btrim(description) = '' AND $3 <> '')
          OR (btrim(content_type) = '' AND $4 <> '')
          OR (btrim(target_audience) = '' AND $5 <> '')
          OR (btrim(notes) = '' AND $6 <> '')
        THEN $7
        ELSE updated_at
      END
    WHERE id = $1`,
    [
      id,
      text.title,
      text.description,
      text.contentType,
      text.targetAudience,
      text.notes,
      new Date().toISOString(),
    ],
  )
}

function fileBytes(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof Uint8Array) return Buffer.from(value)
  return null
}

export async function updateBrief(id: string, patch: BriefPatch): Promise<Brief | null> {
  const existing = await readBrief(id)
  if (!existing) return null
  const text = briefText(existing, patch)
  const now = new Date().toISOString()
  if (patch.file) return updateBriefFile(id, text, patch.file, now)
  return updateBriefText(id, text, now)
}

async function updateBriefFile(
  id: string,
  text: BriefText,
  file: IncomingFile,
  now: string,
): Promise<Brief | null> {
  const stored = storedFile(file)
  const result = await getPool().query(
    `UPDATE briefs SET
      title = $2, description = $3, content_type = $4, target_audience = $5, notes = $6,
      file_name = $7, file_mime = $8, file_size = $9, file_bytes = $10, updated_at = $11
    WHERE id = $1
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
    ],
  )
  const row: unknown = result.rows[0]
  return row ? asBrief(row) : null
}

async function updateBriefText(id: string, text: BriefText, now: string): Promise<Brief | null> {
  const result = await getPool().query(
    `UPDATE briefs SET
      title = $2, description = $3, content_type = $4, target_audience = $5, notes = $6,
      updated_at = $7
    WHERE id = $1
    RETURNING ${BRIEF_COLUMNS}`,
    [id, text.title, text.description, text.contentType, text.targetAudience, text.notes, now],
  )
  const row: unknown = result.rows[0]
  return row ? asBrief(row) : null
}

export async function removeBrief(id: string): Promise<boolean> {
  if (!ID_PATTERN.test(id)) return false
  const result = await getPool().query(`DELETE FROM briefs WHERE id = $1`, [id])
  return (result.rowCount ?? 0) > 0
}
