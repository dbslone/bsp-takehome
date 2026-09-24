import path from 'node:path'
import type { BriefPatch, BriefText } from './store/types.js'

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt'])

export const SHORT_FIELD_MAX = 255
export const LONG_FIELD_MAX = 10_000

type FieldKey = keyof BriefText

type FieldRule = {
  key: FieldKey
  label: string
  max: number
}

const FIELDS: FieldRule[] = [
  { key: 'title', label: 'Title', max: SHORT_FIELD_MAX },
  { key: 'description', label: 'Description', max: LONG_FIELD_MAX },
  { key: 'contentType', label: 'Content type', max: SHORT_FIELD_MAX },
  { key: 'targetAudience', label: 'Target audience', max: SHORT_FIELD_MAX },
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

export function briefUploadError(originalName: string): string | null {
  const extension = path.extname(originalName).toLowerCase()
  if (ALLOWED_EXTENSIONS.has(extension)) return null
  return 'Upload must be a PDF, DOCX, or plain text file'
}

export function clipBriefText(text: BriefText): BriefText {
  return {
    title: clip(text.title, SHORT_FIELD_MAX),
    description: clip(text.description, LONG_FIELD_MAX),
    contentType: clip(text.contentType, SHORT_FIELD_MAX),
    targetAudience: clip(text.targetAudience, SHORT_FIELD_MAX),
    notes: clip(text.notes, LONG_FIELD_MAX),
  }
}

function emptyBriefText(): BriefText {
  return { title: '', description: '', contentType: '', targetAudience: '', notes: '' }
}

function readText(body: Record<string, unknown>, field: FieldRule): string | FieldFailure {
  const value = body[field.key]
  if (typeof value !== 'string') return { ok: false, error: `${field.label} must be text` }
  const trimmed = value.trim()
  if (trimmed.length > field.max) {
    return { ok: false, error: `${field.label} must be ${field.max} characters or fewer` }
  }
  return trimmed
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max)
}
