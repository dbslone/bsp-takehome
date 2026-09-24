import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { useEffect, useState } from 'react'
import { api } from '../api'

type HealthState = { kind: 'loading' } | { kind: 'ok' } | { kind: 'error' }

function BackendStatusButton() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    api
      .get<{ status: string }>('/health')
      .then(() => setHealth({ kind: 'ok' }))
      .catch(() => setHealth({ kind: 'error' }))
  }, [])

  const label = health.kind === 'loading' ? 'Checking' : health.kind === 'ok' ? 'OK' : 'Unreachable'

  return (
    <Button
      component="output"
      aria-label={`Backend status: ${label}`}
      size="small"
      variant="outlined"
      color={health.kind === 'ok' ? 'success' : health.kind === 'error' ? 'error' : 'inherit'}
      startIcon={
        health.kind === 'loading' ? <CircularProgress color="inherit" size={14} /> : undefined
      }
      sx={{ pointerEvents: 'none' }}
    >
      {label}
    </Button>
  )
}

export default BackendStatusButton
