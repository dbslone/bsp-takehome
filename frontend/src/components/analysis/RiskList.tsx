import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { BriefAnalysis } from '../../types'
import { itemKey } from './itemKey'
import ItemRow from './ItemRow'
import SectionCard from './SectionCard'

type Risk = BriefAnalysis['risks'][number]
type Severity = Risk['severity']

const SEVERITIES: Severity[] = ['high', 'medium', 'low']
const SEVERITY_COLOR = { low: 'default', medium: 'warning', high: 'error' } as const
const SEVERITY_BORDER = { low: 'divider', medium: 'warning.main', high: 'error.main' } as const
const KIND_LABEL = { risk: 'Risk', ambiguity: 'Ambiguity', missing: 'Missing' } as const

function RiskList({ risks }: { risks: Risk[] }) {
  const sorted = risks.toSorted(
    (a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity),
  )
  return (
    <SectionCard
      title="Risks and gaps"
      icon={<WarningAmberOutlined />}
      action={<SeverityCounts risks={risks} />}
    >
      {sorted.length === 0 ? (
        <Typography color="text.secondary">None noted</Typography>
      ) : (
        <Stack spacing={2}>
          {sorted.map((risk) => (
            <Box
              key={itemKey(risk)}
              sx={{ pl: 1.5, borderLeft: 3, borderColor: SEVERITY_BORDER[risk.severity] }}
            >
              <ItemRow item={risk}>
                <Chip size="small" variant="outlined" label={KIND_LABEL[risk.kind]} />
                <Chip size="small" color={SEVERITY_COLOR[risk.severity]} label={risk.severity} />
              </ItemRow>
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  )
}

function SeverityCounts({ risks }: { risks: Risk[] }) {
  const counts = SEVERITIES.map((severity) => ({
    severity,
    count: risks.filter((risk) => risk.severity === severity).length,
  })).filter(({ count }) => count > 0)

  return (
    <Stack direction="row" spacing={0.5}>
      {counts.map(({ severity, count }) => (
        <Chip
          key={severity}
          size="small"
          variant="outlined"
          color={SEVERITY_COLOR[severity]}
          label={`${count} ${severity}`}
        />
      ))}
    </Stack>
  )
}

export default RiskList
