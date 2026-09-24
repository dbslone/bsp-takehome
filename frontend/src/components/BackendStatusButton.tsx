import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'

type HealthState = { kind: 'loading' } | { kind: 'ok' } | { kind: 'error' }

function BackendStatusButton() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })
  const abortRef = useRef<AbortController | null>(null)

  const check = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    api
      .get<{ status: string }>('/health', { signal: controller.signal })
      .then((res) => setHealth(res.data.status === 'ok' ? { kind: 'ok' } : { kind: 'error' }))
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return
        setHealth({ kind: 'error' })
      })
  }, [])

  useEffect(() => {
    check()
    return () => abortRef.current?.abort()
  }, [check])

  const label = health.kind === 'loading' ? 'Checking' : health.kind === 'ok' ? 'OK' : 'Unreachable'

  return (
    <Button
      aria-label={`Backend status: ${label}. Select to check again.`}
      size="small"
      variant="outlined"
      disabled={health.kind === 'loading'}
      onClick={() => {
        setHealth({ kind: 'loading' })
        check()
      }}
      color={health.kind === 'ok' ? 'success' : health.kind === 'error' ? 'error' : 'inherit'}
      startIcon={
        health.kind === 'loading' ? <CircularProgress color="inherit" size={14} /> : undefined
      }
    >
      {label}
    </Button>
  )
}

export default BackendStatusButton
