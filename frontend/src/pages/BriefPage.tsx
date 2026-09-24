import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../api'
import BriefAnalysisPanel from '../components/BriefAnalysisPanel'
import BriefHeader from '../components/brief/BriefHeader'
import BriefPageSkeleton from '../components/brief/BriefPageSkeleton'
import BriefSidebar from '../components/brief/BriefSidebar'
import type { Brief } from '../types'

type BriefState =
  | { kind: 'loading' }
  | { kind: 'ok'; id: string; brief: Brief }
  | { kind: 'not-found'; id: string }
  | { kind: 'error'; id: string }

function BriefPage() {
  const { id } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<BriefState>({ kind: 'loading' })
  const [refreshError, setRefreshError] = useState(false)

  useEffect(() => {
    if (!id) return

    const request = attempt
    let cancelled = false
    api
      .get<Brief>(`/briefs/${id}`)
      .then((res) => {
        if (cancelled || request !== attempt) return
        setState({ kind: 'ok', id, brief: res.data })
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
  }, [id, attempt])

  const refreshBrief = useCallback(() => {
    if (!id) return
    api
      .get<Brief>(`/briefs/${id}`)
      .then((res) => {
        setRefreshError(false)
        setState((current) => {
          if (current.kind !== 'ok' || current.id !== id) return current
          return { kind: 'ok', id, brief: res.data }
        })
      })
      .catch(() => setRefreshError(true))
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
    return <BriefPageSkeleton />
  }

  if (view.kind === 'error') {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Alert severity="error">Could not load brief</Alert>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={() => {
              setState({ kind: 'loading' })
              setAttempt((current) => current + 1)
            }}
          >
            Retry
          </Button>
          <Button component={Link} to="/">
            Go back home
          </Button>
        </Stack>
      </Stack>
    )
  }

  const { brief } = view

  return (
    <Stack spacing={3}>
      <BriefHeader brief={brief} />
      {refreshError && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={refreshBrief}>
              Retry
            </Button>
          }
        >
          Could not refresh brief details
        </Alert>
      )}
      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <BriefAnalysisPanel key={brief.id} briefId={brief.id} onSettled={refreshBrief} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ alignSelf: 'stretch' }}>
          <BriefSidebar brief={brief} />
        </Grid>
      </Grid>
    </Stack>
  )
}

export default BriefPage
