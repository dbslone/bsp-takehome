import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

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
  tempPath: string
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

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function dataRoot(): string {
  return path.resolve(process.env.DATA_DIR ?? 'data')
}

export function briefsDir(): string {
  return path.join(dataRoot(), 'briefs')
}

export function tmpDir(): string {
  return path.join(dataRoot(), 'tmp')
}

function briefDir(id: string): string {
  return path.join(briefsDir(), id)
}

export async function initStore(): Promise<void> {
  await mkdir(briefsDir(), { recursive: true })
  await mkdir(tmpDir(), { recursive: true })
}

function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'ENOENT'
}

function isBriefFile(value: unknown): value is BriefFile {
  if (typeof value !== 'object' || value === null) return false
  const file = value as Record<string, unknown>
  return (
    typeof file.originalName === 'string' &&
    typeof file.mimeType === 'string' &&
    typeof file.size === 'number'
  )
}

function isBrief(value: unknown): value is Brief {
  if (typeof value !== 'object' || value === null) return false
  const brief = value as Record<string, unknown>
  return (
    typeof brief.id === 'string' &&
    typeof brief.title === 'string' &&
    typeof brief.description === 'string' &&
    typeof brief.contentType === 'string' &&
    typeof brief.targetAudience === 'string' &&
    typeof brief.notes === 'string' &&
    isBriefFile(brief.file) &&
    typeof brief.createdAt === 'string' &&
    typeof brief.updatedAt === 'string'
  )
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  const tmp = `${filePath}.${randomUUID()}.tmp`
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`)
  await rename(tmp, filePath)
}

async function readBrief(id: string): Promise<Brief | null> {
  if (!ID_PATTERN.test(id)) return null
  try {
    const raw = await readFile(path.join(briefDir(id), 'brief.json'), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (!isBrief(parsed) || parsed.id !== id) return null
    return parsed
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
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

export async function listBriefs(): Promise<Brief[]> {
  let entries
  try {
    entries = await readdir(briefsDir(), { withFileTypes: true })
  } catch (err) {
    if (isNotFound(err)) return []
    throw err
  }

  const briefs: Brief[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const brief = await readBrief(entry.name)
    if (brief) briefs.push(brief)
  }

  briefs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  return briefs
}

export async function getBrief(id: string): Promise<Brief | null> {
  return readBrief(id)
}

export function briefUploadPath(id: string): string | null {
  if (!ID_PATTERN.test(id)) return null
  return path.join(briefDir(id), 'upload')
}

export async function createBrief(text: BriefText, file: IncomingFile): Promise<Brief> {
  const id = randomUUID()
  const dir = briefDir(id)
  await mkdir(dir, { recursive: true })
  try {
    await rename(file.tempPath, path.join(dir, 'upload'))
    const now = new Date().toISOString()
    const brief: Brief = {
      id,
      title: text.title,
      description: text.description,
      contentType: text.contentType,
      targetAudience: text.targetAudience,
      notes: text.notes,
      file: storedFile(file),
      createdAt: now,
      updatedAt: now,
    }
    await writeJson(path.join(dir, 'brief.json'), brief)
    return brief
  } catch (err) {
    await rm(dir, { recursive: true, force: true })
    throw err
  }
}

export async function updateBrief(id: string, patch: BriefPatch): Promise<Brief | null> {
  const existing = await readBrief(id)
  if (!existing) return null

  const dir = briefDir(id)
  if (patch.file) {
    await rename(patch.file.tempPath, path.join(dir, 'upload'))
  }

  const brief: Brief = {
    id: existing.id,
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description,
    contentType: patch.contentType ?? existing.contentType,
    targetAudience: patch.targetAudience ?? existing.targetAudience,
    notes: patch.notes ?? existing.notes,
    file: patch.file ? storedFile(patch.file) : existing.file,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  await writeJson(path.join(dir, 'brief.json'), brief)
  return brief
}

export async function removeBrief(id: string): Promise<boolean> {
  if (!(await readBrief(id))) return false
  await rm(briefDir(id), { recursive: true, force: true })
  return true
}
