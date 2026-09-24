import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { apiErrorMessage } from '../apiError'
import {
  EMPTY_BRIEF_FORM,
  validateBriefForm,
  type BriefFormErrors,
  type BriefFormField,
  type BriefFormValues,
} from '../briefForm'
import type { Brief } from '../types'
import BriefFormFields from './brief/BriefFormFields'
import FileDropzone from './brief/FileDropzone'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt'])

type AddBriefDialogProps = {
  open: boolean
  onClose: () => void
  onCreated: (warning?: string) => void
}

function AddBriefDialog({ open, onClose, onCreated }: AddBriefDialogProps) {
  const [values, setValues] = useState<BriefFormValues>(EMPTY_BRIEF_FORM)
  const [fieldErrors, setFieldErrors] = useState<BriefFormErrors>({})
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setValues(EMPTY_BRIEF_FORM)
    setFieldErrors({})
    setFile(null)
    setError(null)
    setSubmitting(false)
  }

  function updateField(field: BriefFormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => clearFieldError(current, field))
  }

  function chooseFile(next: File | null) {
    setFile(next)
    setFieldErrors({})
    setError(next ? uploadError(next) : null)
  }

  function handleClose() {
    if (submitting) return
    resetForm()
    onClose()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const fileError = file ? uploadError(file) : null
    setError(fileError)
    const errors = validateBriefForm(values, Boolean(file))
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || fileError) return

    setSubmitting(true)
    try {
      const created = await api.post<Brief & { analysisError?: string }>(
        '/briefs',
        briefBody(values, file),
      )
      if (!briefId(created.data)) {
        setError('Could not create brief')
        setSubmitting(false)
        return
      }
      const warning = created.data.analysisError
        ? `Brief saved, but analysis could not start. ${created.data.analysisError}`
        : undefined
      resetForm()
      onCreated(warning)
      onClose()
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Could not create brief'))
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Add brief</DialogTitle>
      <Stack component="form" onSubmit={(event) => void handleSubmit(event)}>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <FileDropzone file={file} disabled={submitting} onChange={chooseFile} />
            <BriefFormFields
              values={values}
              errors={fieldErrors}
              disabled={submitting}
              hasFile={Boolean(file)}
              onChange={updateField}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add brief'}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  )
}

function briefBody(values: BriefFormValues, file: File | null): FormData {
  const body = new FormData()
  body.set('title', values.title.trim())
  body.set('description', values.description.trim())
  body.set('contentType', values.contentType.trim())
  body.set('targetAudience', values.targetAudience.trim())
  body.set('notes', values.notes.trim())
  if (file) body.set('file', file)
  return body
}

function uploadError(file: File): string | null {
  if (file.size === 0) return 'File is empty'
  if (!ALLOWED_EXTENSIONS.has(fileExtension(file.name))) {
    return 'Upload must be a PDF, DOCX, or plain text file'
  }
  if (file.size > MAX_UPLOAD_BYTES) return 'File must be 10 MB or smaller'
  return null
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return ''
  return name.slice(dot).toLowerCase()
}

function clearFieldError(errors: BriefFormErrors, field: BriefFormField): BriefFormErrors {
  if (!errors[field]) return errors
  const next = { ...errors }
  delete next[field]
  return next
}

function briefId(data: Brief): string | null {
  if (typeof data.id !== 'string') return null
  const id = data.id.trim()
  return id || null
}

export default AddBriefDialog
