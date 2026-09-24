import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import axios from 'axios'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api'
import type { Analysis, AnalysisItem, AnalysisState, BriefAnalysis } from '../types'

const POLL_MS = 3000

type PanelState = { kind: 'loading' } | { kind: 'ok'; data: AnalysisState } | { kind: 'error' }

const SEVERITY_COLOR = { low: 'default', medium: 'warning', high: 'error' } as const
const PRIORITY_COLOR = { now: 'primary', soon: 'secondary', later: 'default' } as const
const KIND_LABEL = { risk: 'Risk', ambiguity: 'Ambiguity', missing: 'Missing' } as const

function BriefAnalysisPanel({ briefId }: { briefId: string }) {
  const [state, setState] = useState<PanelState>({ kind: 'loading' })
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .get<AnalysisState>(`/briefs/${briefId}/analysis`)
      .then((res) => setState({ kind: 'ok', data: res.data }))
      .catch(() => setState({ kind: 'error' }))
  }, [briefId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (state.kind !== 'ok' || state.data.latest?.status !== 'pending') return
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
        setStartError('Could not start the analysis')
      })
      .finally(() => {
        setStarting(false)
        load()
      })
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h3">
        Analysis
      </Typography>
      {startError && <Alert severity="error">{startError}</Alert>}
      {state.kind === 'loading' && <Progress label="Loading analysis…" />}
      {state.kind === 'error' && <Alert severity="error">Could not load the analysis</Alert>}
      {state.kind === 'ok' && (
        <AnalysisBody data={state.data} starting={starting} onStart={start} />
      )}
    </Stack>
  )
}

function AnalysisBody({
  data,
  starting,
  onStart,
}: {
  data: AnalysisState
  starting: boolean
  onStart: () => void
}) {
  const { latest, latestSucceeded } = data

  if (!latest) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography color="text.secondary">This brief hasn't been analyzed yet.</Typography>
        <Button variant="contained" onClick={onStart} loading={starting}>
          Analyze
        </Button>
      </Stack>
    )
  }

  const olderSucceeded = latestSucceeded && latestSucceeded.id !== latest.id

  return (
    <Stack spacing={2}>
      {latest.status === 'pending' && <Progress label="Analyzing brief… this can take a minute." />}
      {latest.status === 'error' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={onStart} loading={starting}>
              Retry
            </Button>
          }
        >
          Analysis failed: {latest.error ?? 'Unknown error'}
        </Alert>
      )}
      {latest.status === 'succeeded' && latest.result && <AnalysisResult analysis={latest} />}
      {olderSucceeded && latestSucceeded.result && (
        <>
          <Typography variant="body2" color="text.secondary">
            Showing the previous successful analysis from{' '}
            {formatDateTime(latestSucceeded.completedAt ?? latestSucceeded.createdAt)}.
          </Typography>
          <AnalysisResult analysis={latestSucceeded} />
        </>
      )}
    </Stack>
  )
}

function AnalysisResult({ analysis }: { analysis: Analysis }) {
  const result: BriefAnalysis | null = analysis.result
  if (!result) return null

  return (
    <Stack spacing={2}>
      <Section title="Themes and classification">
        <Typography>{result.themes.summary}</Typography>
        <Labeled label="Content type">
          <Typography>{result.themes.contentType}</Typography>
        </Labeled>
        <Labeled label="Primary themes">
          <Chips values={result.themes.primaryThemes} />
        </Labeled>
        <Labeled label="Tone">
          <Chips values={result.themes.tone} />
        </Labeled>
      </Section>

      <Section title="Target audience">
        <Labeled label="Stated in the brief">
          <Typography>{result.audience.statedAudience ?? 'Not stated'}</Typography>
        </Labeled>
        <Labeled label="Interpretation">
          <Typography>{result.audience.interpretation}</Typography>
        </Labeled>
        {result.audience.segments.length > 0 && (
          <Labeled label="Segments">
            <Items items={result.audience.segments} />
          </Labeled>
        )}
      </Section>

      <Section title="Strengths and opportunities">
        <Items items={result.strengths} />
      </Section>

      <Section title="Risks, ambiguities, and missing information">
        {result.risks.length === 0 ? (
          <NoneNoted />
        ) : (
          <Stack spacing={1.5}>
            {result.risks.map((risk) => (
              <ItemRow key={itemKey(risk)} item={risk}>
                <Chip size="small" variant="outlined" label={KIND_LABEL[risk.kind]} />
                <Chip size="small" color={SEVERITY_COLOR[risk.severity]} label={risk.severity} />
              </ItemRow>
            ))}
          </Stack>
        )}
      </Section>

      <Section title="Recommended next actions">
        {result.nextActions.length === 0 ? (
          <NoneNoted />
        ) : (
          <Stack spacing={1.5}>
            {result.nextActions.map((action) => (
              <ItemRow key={itemKey(action)} item={action}>
                <Chip
                  size="small"
                  color={PRIORITY_COLOR[action.priority]}
                  label={action.priority}
                />
              </ItemRow>
            ))}
          </Stack>
        )}
      </Section>

      <Typography variant="body2" color="text.secondary">
        {analysis.model ?? 'Unknown model'} ·{' '}
        {formatDateTime(analysis.completedAt ?? analysis.createdAt)}
      </Typography>
    </Stack>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" component="h4">
          {title}
        </Typography>
        {children}
      </Stack>
    </Paper>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Stack>
  )
}

function Chips({ values }: { values: string[] }) {
  if (values.length === 0) return <Typography>—</Typography>
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
      {values.map((value) => (
        <Chip key={value} size="small" label={value} />
      ))}
    </Stack>
  )
}

function Items({ items }: { items: AnalysisItem[] }) {
  if (items.length === 0) return <NoneNoted />
  return (
    <Stack spacing={1.5}>
      {items.map((item) => (
        <ItemRow key={itemKey(item)} item={item} />
      ))}
    </Stack>
  )
}

function ItemRow({ item, children }: { item: AnalysisItem; children?: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
        {children}
      </Stack>
      <Typography color="text.secondary">{item.detail}</Typography>
    </Stack>
  )
}

function NoneNoted() {
  return <Typography color="text.secondary">None noted</Typography>
}

function itemKey(item: AnalysisItem): string {
  return `${item.title}-${item.detail}`
}

function Progress({ label }: { label: string }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <CircularProgress size={20} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  )
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export default BriefAnalysisPanel
