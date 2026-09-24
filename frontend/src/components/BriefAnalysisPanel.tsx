import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { apiErrorMessage } from '../apiError'
import { formatDateTime } from '../format'
import type { Analysis, AnalysisState } from '../types'
import AnalysisHeader from './analysis/AnalysisHeader'
import AnalysisResult from './analysis/AnalysisResult'
import Progress from './analysis/Progress'

const POLL_MS = 3000

type PanelState = { kind: 'loading' } | { kind: 'ok'; data: AnalysisState } | { kind: 'error' }

function BriefAnalysisPanel({ briefId, onSettled }: { briefId: string; onSettled?: () => void }) {
  const [state, setState] = useState<PanelState>({ kind: 'loading' })
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [pollWarning, setPollWarning] = useState<string | null>(null)
  const onSettledRef = useRef(onSettled)
  const previousStatus = useRef<string | null>(null)
  const pendingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const retryRef = useRef<number | null>(null)
  const loadRef = useRef<() => void>(() => undefined)

  const load = useCallback(() => {
    if (retryRef.current !== null) {
      window.clearTimeout(retryRef.current)
      retryRef.current = null
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    api
      .get<AnalysisState>(`/briefs/${briefId}/analysis`, { signal: controller.signal })
      .then((res) => {
        pendingRef.current = res.data.latest?.status === 'pending'
        setPollWarning(null)
        setState({ kind: 'ok', data: res.data })
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return
        if (pendingRef.current) {
          setPollWarning('Could not refresh the analysis. Retrying…')
          retryRef.current = window.setTimeout(() => loadRef.current(), POLL_MS)
          return
        }
        setState({ kind: 'error' })
      })
  }, [briefId])

  useEffect(() => {
    loadRef.current = load
    load()
    return () => {
      abortRef.current?.abort()
      if (retryRef.current !== null) window.clearTimeout(retryRef.current)
    }
  }, [load])

  useEffect(() => {
    onSettledRef.current = onSettled
  }, [onSettled])

  useEffect(() => {
    if (state.kind !== 'ok') return
    const status = state.data.latest?.status ?? null
    if (previousStatus.current === 'pending' && status && status !== 'pending') {
      onSettledRef.current?.()
    }
    previousStatus.current = status
  }, [state])

  useEffect(() => {
    const pending = state.kind === 'ok' && state.data.latest?.status === 'pending'
    if (!pending) return
    const timer = window.setTimeout(load, POLL_MS)
    return () => window.clearTimeout(timer)
  }, [state, load])

  const start = () => {
    setStarting(true)
    setStartError(null)
    api
      .post<Analysis>(`/briefs/${briefId}/analysis`)
      .catch((err: unknown) => {
        if (axios.isAxiosError(err) && err.response?.status === 409) return
        setStartError(apiErrorMessage(err, 'Could not start the analysis'))
      })
      .finally(() => {
        setStarting(false)
        load()
      })
  }

  const data = state.kind === 'ok' ? state.data : null

  return (
    <Stack spacing={2}>
      <AnalysisHeader
        latest={data?.latest ?? null}
        shown={data?.latestSucceeded ?? null}
        starting={starting}
        onStart={start}
      />
      {startError && <Alert severity="error">{startError}</Alert>}
      {pollWarning && <Alert severity="warning">{pollWarning}</Alert>}
      {state.kind === 'loading' && <Progress label="Loading analysis…" />}
      {state.kind === 'error' && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setState({ kind: 'loading' })
                load()
              }}
            >
              Retry
            </Button>
          }
        >
          Could not load the analysis
        </Alert>
      )}
      {data && <AnalysisBody data={data} starting={starting} onStart={start} />}
    </Stack>
  )
}

type AnalysisBodyProps = { data: AnalysisState; starting: boolean; onStart: () => void }

function AnalysisBody({ data, starting, onStart }: AnalysisBodyProps) {
  const { latest, latestSucceeded } = data
  if (!latest) return <EmptyState starting={starting} onStart={onStart} />

  const showingOlder = latestSucceeded && latestSucceeded.id !== latest.id

  return (
    <Stack spacing={2}>
      {latest.status === 'pending' && (
        <Paper sx={{ p: 2 }}>
          <Progress label="Analyzing brief… this can take a minute." />
        </Paper>
      )}
      {latest.status === 'error' && (
        <Alert severity="error">Analysis failed: {latest.error ?? 'Unknown error'}</Alert>
      )}
      {showingOlder && (
        <Typography variant="body2" color="text.secondary">
          Showing the previous successful analysis from{' '}
          {formatDateTime(latestSucceeded.completedAt ?? latestSucceeded.createdAt)}.
        </Typography>
      )}
      {latestSucceeded?.result && <AnalysisResult result={latestSucceeded.result} />}
    </Stack>
  )
}

function EmptyState({ starting, onStart }: { starting: boolean; onStart: () => void }) {
  return (
    <Paper sx={{ p: 4, borderStyle: 'dashed' }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <AutoAwesomeOutlined color="primary" sx={{ fontSize: 40 }} />
        <Typography variant="h6" component="p">
          No analysis yet
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
          Generate themes, audience insights, risks and recommended next actions for this brief.
        </Typography>
        <Button variant="contained" onClick={onStart} loading={starting}>
          Analyze brief
        </Button>
      </Stack>
    </Paper>
  )
}

export default BriefAnalysisPanel
