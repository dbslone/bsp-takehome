import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api'
import AddBriefDialog from '../components/AddBriefDialog'
import type { Brief } from '../types'

type BriefsState = { kind: 'loading' } | { kind: 'ok'; briefs: Brief[] } | { kind: 'error' }

function HomePage() {
  const navigate = useNavigate()
  const [briefs, setBriefs] = useState<BriefsState>({ kind: 'loading' })
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(() => {
    api
      .get<Brief[]>('/briefs')
      .then((res) => setBriefs({ kind: 'ok', briefs: res.data }))
      .catch(() => setBriefs({ kind: 'error' }))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Stack spacing={2}>
      {briefs.kind === 'loading' && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      )}
      {briefs.kind === 'error' && <Alert severity="error">Could not load briefs</Alert>}
      {briefs.kind === 'ok' && briefs.briefs.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'center', py: 6 }}>
          <Typography color="text.secondary">No briefs found</Typography>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Add brief
          </Button>
        </Stack>
      )}
      {briefs.kind === 'ok' && briefs.briefs.length > 0 && (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" component="h2">
              Briefs
            </Typography>
            <Button variant="contained" onClick={() => setDialogOpen(true)}>
              Add brief
            </Button>
          </Stack>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Content type</TableCell>
                  <TableCell>Audience</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {briefs.briefs.map((brief) => (
                  <TableRow
                    key={brief.id}
                    hover
                    tabIndex={0}
                    aria-label={`Open ${brief.title}`}
                    onClick={() => navigate(`/brief/${brief.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/brief/${brief.id}`)
                      }
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{brief.title}</TableCell>
                    <TableCell>{textOrDash(brief.contentType)}</TableCell>
                    <TableCell>{textOrDash(brief.targetAudience)}</TableCell>
                    <TableCell>{brief.file.originalName}</TableCell>
                    <TableCell>{formatDate(brief.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      <AddBriefDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={load} />
    </Stack>
  )
}

function textOrDash(value: string): string {
  return value.trim() ? value : '—'
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

export default HomePage
