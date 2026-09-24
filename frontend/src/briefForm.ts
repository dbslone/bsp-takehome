export const SHORT_FIELD_MAX = 255
export const LONG_FIELD_MAX = 10_000

export type BriefFormValues = {
  title: string
  description: string
  contentType: string
  targetAudience: string
  notes: string
}

export type BriefFormField = keyof BriefFormValues

export type BriefFormErrors = Partial<Record<BriefFormField, string>>

type FieldRule = {
  key: BriefFormField
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

export const EMPTY_BRIEF_FORM: BriefFormValues = {
  title: '',
  description: '',
  contentType: '',
  targetAudience: '',
  notes: '',
}

export function isBriefFieldRequired(field: BriefFormField, hasFile: boolean): boolean {
  if (field === 'title') return true
  if (hasFile || field === 'notes') return false
  return true
}

export function validateBriefForm(values: BriefFormValues, hasFile: boolean): BriefFormErrors {
  const errors: BriefFormErrors = {}
  for (const field of FIELDS) {
    if (isBriefFieldRequired(field.key, hasFile) && values[field.key].trim().length === 0) {
      errors[field.key] = `${field.label} is required`
      continue
    }
    const message = lengthError(field.label, values[field.key], field.max)
    if (message) errors[field.key] = message
  }
  return errors
}

export function charactersRemaining(value: string, max: number): string {
  const remaining = Math.max(0, max - value.length)
  return `${remaining} characters remaining`
}

export function briefTitle(brief: {
  title: string
  file: { originalName: string } | null
}): string {
  return brief.title.trim() || brief.file?.originalName || 'Untitled'
}

function lengthError(label: string, value: string, max?: number): string | undefined {
  if (max === undefined || value.trim().length <= max) return undefined
  return `${label} must be ${max} characters or fewer`
}
