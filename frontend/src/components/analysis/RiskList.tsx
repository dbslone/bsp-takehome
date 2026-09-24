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
  const sorted = risks.toSorted((a, b) => severityRank(a.severity) - severityRank(b.severity))
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
              sx={{ pl: 1.5, borderLeft: 3, borderColor: severityBorder(risk.severity) }}
            >
              <ItemRow item={risk}>
                <Chip size="small" variant="outlined" label={kindLabel(risk.kind)} />
                <Chip size="small" color={severityColor(risk.severity)} label={risk.severity} />
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
          color={severityColor(severity)}
          label={`${count} ${severity}`}
        />
      ))}
    </Stack>
  )
}

function severityRank(severity: string): number {
  if (severity === 'high') return 0
  if (severity === 'medium') return 1
  if (severity === 'low') return 2
  return 3
}

function severityColor(severity: string): 'default' | 'warning' | 'error' {
  if (severity === 'low' || severity === 'medium' || severity === 'high') {
    return SEVERITY_COLOR[severity]
  }
  return 'default'
}

function severityBorder(severity: string): string {
  if (severity === 'low' || severity === 'medium' || severity === 'high') {
    return SEVERITY_BORDER[severity]
  }
  return 'divider'
}

function kindLabel(kind: string): string {
  if (kind === 'risk' || kind === 'ambiguity' || kind === 'missing') return KIND_LABEL[kind]
  return 'Issue'
}

export default RiskList
