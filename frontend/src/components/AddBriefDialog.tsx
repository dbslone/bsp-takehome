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
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import axios from 'axios'
import { useState, type DragEvent, type FormEvent, type MouseEvent } from 'react'
import { api } from '../api'
import type { Brief } from '../types'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt'])

type AddBriefDialogProps = {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function AddBriefDialog({ open, onClose, onCreated }: AddBriefDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [dragDepth, setDragDepth] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const dragOver = dragDepth > 0 && !submitting

  function resetForm() {
    setTitle('')
    setDescription('')
    setContentType('')
    setTargetAudience('')
    setNotes('')
    setFile(null)
    setFileInputKey((key) => key + 1)
    setDragDepth(0)
    setError(null)
    setSubmitting(false)
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
    if (dropped) setFile(dropped)
  }

  function handleClearFile(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    setFile(null)
    setFileInputKey((key) => key + 1)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    if (!file) {
      setError('A file is required')
      return
    }
    const extension = fileExtension(file.name)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      setError('Upload must be a PDF, DOCX, or plain text file')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File must be 10 MB or smaller')
      return
    }

    const body = new FormData()
    body.set('title', trimmedTitle)
    body.set('description', description.trim())
    body.set('contentType', contentType.trim())
    body.set('targetAudience', targetAudience.trim())
    body.set('notes', notes.trim())
    body.set('file', file)

    setSubmitting(true)
    setError(null)
    try {
      await api.post<Brief>('/briefs', body)
      resetForm()
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(errorMessage(err))
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
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Content type"
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              fullWidth
            />
            <TextField
              label="Target audience"
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
              fullWidth
            />
            <TextField
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              multiline
              minRows={2}
              fullWidth
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
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data: unknown = err.response?.data
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = data.error
      if (typeof message === 'string' && message) return message
    }
  }
  return 'Could not create brief'
}

export default AddBriefDialog
