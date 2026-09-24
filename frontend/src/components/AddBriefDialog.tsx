import Close from '@mui/icons-material/Close'
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState, type DragEvent, type FormEvent, type MouseEvent } from 'react'
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
  const [fileInputKey, setFileInputKey] = useState(0)
  const [dragDepth, setDragDepth] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const dragOver = dragDepth > 0 && !submitting

  function resetForm() {
    setValues(EMPTY_BRIEF_FORM)
    setFieldErrors({})
    setFile(null)
    setFileInputKey((key) => key + 1)
    setDragDepth(0)
    setError(null)
    setSubmitting(false)
  }

  function updateField(field: BriefFormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => clearFieldError(current, field))
  }

  function chooseFile(next: File | null) {
    setFile(next)
    setError(next ? uploadError(next) : null)
  }

  function handleClose() {
    if (submitting) return
    resetForm()
    onClose()
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragDepth((depth) => depth + 1)
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = submitting ? 'none' : 'copy'
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragDepth((depth) => Math.max(0, depth - 1))
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragDepth(0)
    if (submitting) return
    const dropped = event.dataTransfer.files[0]
    if (dropped) chooseFile(dropped)
  }

  function handleClearFile(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    chooseFile(null)
    setFileInputKey((key) => key + 1)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const errors = validateBriefForm(values)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    const fileError = uploadError(file)
    if (fileError || !file) {
      setError(fileError ?? 'A file is required')
      return
    }

    const body = new FormData()
    appendBriefFields(body, values)
    body.set('file', file)

    setSubmitting(true)
    setError(null)
    try {
      const created = await api.post<Brief & { analysisError?: string }>('/briefs', body)
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
            <BriefFormFields
              values={values}
              errors={fieldErrors}
              disabled={submitting}
              onChange={updateField}
            />
            <Box
              component="label"
              data-drag-over={dragOver ? 'true' : undefined}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={(theme) => ({
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                px: 2,
                py: 3,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.default',
                textAlign: 'center',
                cursor: submitting ? 'default' : 'pointer',
                pointerEvents: submitting ? 'none' : 'auto',
                transition: theme.transitions.create(['border-color', 'background-color']),
                ...(!submitting && {
                  '&:hover, &:focus-within, &[data-drag-over="true"]': {
                    borderStyle: 'solid',
                    borderColor: 'primary.main',
                    backgroundColor: `rgba(${theme.vars?.palette.primary.mainChannel ?? '79 70 229'} / 0.08)`,
                  },
                }),
              })}
            >
              <Box
                component="input"
                key={fileInputKey}
                type="file"
                accept=".pdf,.docx,.txt"
                disabled={submitting}
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                sx={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  p: 0,
                  m: -1,
                  overflow: 'hidden',
                  clip: 'rect(0 0 0 0)',
                  clipPath: 'inset(50%)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              />
              {file && (
                <IconButton
                  type="button"
                  size="small"
                  aria-label="Remove file"
                  disabled={submitting}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                  onClick={handleClearFile}
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                  <Close fontSize="small" />
                </IconButton>
              )}
              {file ? (
                <InsertDriveFileOutlined sx={{ color: 'primary.main', fontSize: 32 }} />
              ) : (
                <CloudUploadOutlined sx={{ color: 'primary.main', fontSize: 32 }} />
              )}
              {file ? (
                <Typography sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>
                  {file.name}
                </Typography>
              ) : (
                <Typography>Drop a file here, or click to browse</Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {file ? formatBytes(file.size) : 'PDF, DOCX, or TXT. 10 MB max.'}
              </Typography>
            </Box>
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

function appendBriefFields(body: FormData, values: BriefFormValues) {
  body.set('title', values.title.trim())
  body.set('description', values.description.trim())
  body.set('contentType', values.contentType.trim())
  body.set('targetAudience', values.targetAudience.trim())
  body.set('notes', values.notes.trim())
}

function clearFieldError(errors: BriefFormErrors, field: BriefFormField): BriefFormErrors {
  if (!errors[field]) return errors
  const next = { ...errors }
  delete next[field]
  return next
}

function uploadError(file: File | null): string | null {
  if (!file) return 'A file is required'
  if (file.size === 0) return 'File is empty'
  if (!ALLOWED_EXTENSIONS.has(fileExtension(file.name))) {
    return 'Upload must be a PDF, DOCX, or plain text file'
  }
  if (file.size > MAX_UPLOAD_BYTES) return 'File must be 10 MB or smaller'
  return null
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return ''
  return name.slice(dot).toLowerCase()
}

function briefId(data: Brief): string | null {
  if (typeof data.id !== 'string') return null
  const id = data.id.trim()
  return id || null
}

export default AddBriefDialog
