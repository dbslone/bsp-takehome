import Refresh from '@mui/icons-material/Refresh'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { formatDateTime } from '../../format'
import type { Analysis, AnalysisStatus } from '../../types'

const STATUS_CHIP = {
  pending: { label: 'Analyzing', color: 'info' },
  error: { label: 'Failed', color: 'error' },
  succeeded: { label: 'Complete', color: 'success' },
} as const satisfies Record<AnalysisStatus, { label: string; color: string }>

type AnalysisHeaderProps = {
  latest: Analysis | null
  shown: Analysis | null
  starting: boolean
  onStart: () => void
}

function AnalysisHeader({ latest, shown, starting, onStart }: AnalysisHeaderProps) {
  return (
    <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Box sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" component="h3">
            Analysis
          </Typography>
          {latest && <StatusChip status={latest.status} />}
        </Stack>
        {shown && (
          <Typography variant="caption" color="text.secondary">
            {shown.model ?? 'Unknown model'} ·{' '}
            {formatDateTime(shown.completedAt ?? shown.createdAt)}
          </Typography>
        )}
      </Box>
      {latest && latest.status !== 'pending' && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh />}
          onClick={onStart}
          loading={starting}
        >
          Re-analyze
        </Button>
      )}
    </Stack>
  )
}

function StatusChip({ status }: { status: string }) {
  const chip = statusChip(status)
  return <Chip size="small" variant="outlined" color={chip.color} label={chip.label} />
}

function statusChip(status: string): { label: string; color: ChipColor } {
  if (status === 'pending' || status === 'error' || status === 'succeeded') {
    return STATUS_CHIP[status]
  }
  return { label: 'Unknown', color: 'default' }
}

type ChipColor = 'default' | 'info' | 'error' | 'success'

export default AnalysisHeader
