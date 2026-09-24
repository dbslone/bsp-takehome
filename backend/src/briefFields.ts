import path from 'node:path'
import type { BriefPatch, BriefText } from './store/types.js'

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt'])

export const SHORT_FIELD_MAX = 255
export const LONG_FIELD_MAX = 10_000

type FieldKey = keyof BriefText

type FieldRule = {
  key: FieldKey
  label: string
  max?: number
}

const FIELDS: FieldRule[] = [
  { key: 'title', label: 'Title', max: SHORT_FIELD_MAX },
  { key: 'description', label: 'Description', max: LONG_FIELD_MAX },
  { key: 'contentType', label: 'Content type', max: SHORT_FIELD_MAX },
  { key: 'targetAudience', label: 'Target audience' },
  { key: 'notes', label: 'Notes', max: LONG_FIELD_MAX },
]

type FieldFailure = { ok: false; error: string }

export type BriefTextResult = { ok: true; text: BriefText } | FieldFailure

export type BriefPatchResult = { ok: true; patch: BriefPatch } | FieldFailure

export function briefTextFromBody(body: Record<string, unknown>): BriefTextResult {
  const text = emptyBriefText()
  for (const field of FIELDS) {
    const value = field.key in body ? readText(body, field) : ''
    if (typeof value !== 'string') return value
    text[field.key] = value
  }
  return { ok: true, text }
}

export function briefPatchFromBody(body: Record<string, unknown>): BriefPatchResult {
  const patch: BriefPatch = {}
  for (const field of FIELDS) {
    if (!(field.key in body)) continue
    const value = readText(body, field)
    if (typeof value !== 'string') return value
    patch[field.key] = value
  }
  return { ok: true, patch }
}

export function briefPresenceError(text: BriefText, hasFile: boolean): string | null {
  for (const field of FIELDS) {
    if (!isRequired(field.key, hasFile) || text[field.key].trim()) continue
    return `${field.label} is required`
  }
  return null
}

export function briefUploadError(originalName: string): string | null {
  const extension = path.extname(originalName).toLowerCase()
  if (ALLOWED_EXTENSIONS.has(extension)) return null
  return 'Upload must be a PDF, DOCX, or plain text file'
}

export function briefContentError(originalName: string, bytes: Buffer): string | null {
  const extensionError = briefUploadError(originalName)
  if (extensionError) return extensionError
  if (bytes.length === 0) return 'File is empty'
  return contentError(path.extname(originalName).toLowerCase(), bytes)
}

export function clipBriefText(text: BriefText): BriefText {
  const clipped = emptyBriefText()
  for (const field of FIELDS) {
    clipped[field.key] = limitText(text[field.key], field.max)
  }
  return clipped
}

function isRequired(key: FieldKey, hasFile: boolean): boolean {
  if (key === 'title') return true
  if (hasFile || key === 'notes') return false
  return true
}

function emptyBriefText(): BriefText {
  return { title: '', description: '', contentType: '', targetAudience: '', notes: '' }
}

function readText(body: Record<string, unknown>, field: FieldRule): string | FieldFailure {
  const value = body[field.key]
  if (typeof value !== 'string') return { ok: false, error: `${field.label} must be text` }
  const trimmed = value.trim()
  if (field.max !== undefined && trimmed.length > field.max) {
    return { ok: false, error: `${field.label} must be ${field.max} characters or fewer` }
  }
  return trimmed
}

function limitText(value: string, max: number | undefined): string {
  const trimmed = value.trim()
  return max === undefined ? trimmed : trimmed.slice(0, max)
}

function contentError(extension: string, bytes: Buffer): string | null {
  if (extension === '.pdf' && !bytes.subarray(0, 1024).includes('%PDF-')) {
    return 'File content is not a PDF'
  }
  if (extension === '.docx' && !isZip(bytes)) return 'File content is not a DOCX document'
  if (extension === '.txt' && bytes.includes(0)) return 'Text file contains binary data'
  return null
}

function isZip(bytes: Buffer): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b
}
