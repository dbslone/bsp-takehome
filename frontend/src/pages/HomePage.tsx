import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { api } from '../api'

type HealthState = { kind: 'loading' } | { kind: 'ok'; status: string } | { kind: 'error' }

function HomePage() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    api
      .get<{ status: string }>('/health')
      .then((res) => setHealth({ kind: 'ok', status: res.data.status }))
      .catch(() => setHealth({ kind: 'error' }))
  }, [])

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Backend status
        </Typography>
        {health.kind === 'loading' && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Checking…</Typography>
          </Stack>
        )}
        {health.kind === 'ok' && (
          <Alert severity="success">
            Backend is <strong>{health.status}</strong>
          </Alert>
        )}
        {health.kind === 'error' && <Alert severity="error">Backend is unreachable</Alert>}
      </CardContent>
    </Card>
  )
}

export default HomePage
