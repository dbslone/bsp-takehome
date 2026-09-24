import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../api'
import type { Brief } from '../types'

type BriefState =
  | { kind: 'loading' }
  | { kind: 'ok'; id: string; brief: Brief }
  | { kind: 'not-found'; id: string }
  | { kind: 'error'; id: string }

function BriefPage() {
  const { id } = useParams()
  const [state, setState] = useState<BriefState>({ kind: 'loading' })

  useEffect(() => {
    if (!id) return

    let cancelled = false
    api
      .get<Brief>(`/briefs/${id}`)
      .then((res) => {
        if (!cancelled) setState({ kind: 'ok', id, brief: res.data })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setState({ kind: 'not-found', id })
          return
        }
        setState({ kind: 'error', id })
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const view =
    id && state.kind !== 'loading' && state.id === id ? state : { kind: 'loading' as const }

  if (!id || view.kind === 'not-found') {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h4" component="h2">
          Brief not found
        </Typography>
        <Typography color="text.secondary">This brief does not exist.</Typography>
        <Button component={Link} to="/" variant="contained">
          Go back home
        </Button>
      </Stack>
    )
  }

  if (view.kind === 'loading') {
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading…</Typography>
      </Stack>
    )
  }

  if (view.kind === 'error') {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Alert severity="error">Could not load brief</Alert>
        <Button component={Link} to="/">
          Go back home
        </Button>
      </Stack>
    )
  }

  const { brief } = view

  return (
    <Stack spacing={3}>
      <Button component={Link} to="/" sx={{ alignSelf: 'flex-start' }}>
        Back
      </Button>
      <Typography variant="h4" component="h2">
        {brief.title}
      </Typography>
      <Stack spacing={2}>
        <Field label="Description" value={brief.description} />
        <Field label="Content type" value={brief.contentType} />
        <Field label="Target audience" value={brief.targetAudience} />
        <Field label="Notes" value={brief.notes} />
        <Field label="File" value={brief.file.originalName} />
        <Field label="File type" value={brief.file.mimeType} />
        <Field label="File size" value={formatBytes(brief.file.size)} />
        <Field label="Created" value={formatDateTime(brief.createdAt)} />
        <Field label="Updated" value={formatDateTime(brief.updatedAt)} />
      </Stack>
      <Button
        component="a"
        href={`/api/briefs/${brief.id}/file`}
        variant="contained"
        sx={{ alignSelf: 'flex-start' }}
      >
        Download file
      </Button>
    </Stack>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{value.trim() ? value : '—'}</Typography>
    </Stack>
  )
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default BriefPage
