import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { BriefAnalysis } from '../../types'

function SummaryCard({ themes }: { themes: BriefAnalysis['themes'] }) {
  return (
    <Paper
      sx={(theme) => ({
        p: 3,
        bgcolor: theme.alpha((theme.vars ?? theme).palette.primary.main, 0.06),
        borderColor: theme.alpha((theme.vars ?? theme).palette.primary.main, 0.25),
      })}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'primary.main' }}>
          <AutoAwesomeOutlined fontSize="small" />
          <Typography variant="overline" sx={{ lineHeight: 1.5, fontWeight: 600 }}>
            Summary
          </Typography>
          <Chip
            size="small"
            color="primary"
            label={themes.contentType}
            sx={{ ml: 'auto !important' }}
          />
        </Stack>
        <Typography sx={{ fontSize: '1.125rem', lineHeight: 1.6 }}>{themes.summary}</Typography>
        <ChipGroup label="Primary themes" values={themes.primaryThemes} variant="filled" />
        <ChipGroup label="Tone" values={themes.tone} variant="outlined" />
      </Stack>
    </Paper>
  )
}

type ChipGroupProps = { label: string; values: string[]; variant: 'filled' | 'outlined' }

function ChipGroup({ label, values, variant }: ChipGroupProps) {
  if (values.length === 0) return null
  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {label}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {values.map((value) => (
          <Chip key={value} label={value} variant={variant} />
        ))}
      </Stack>
    </Stack>
  )
}

export default SummaryCard
