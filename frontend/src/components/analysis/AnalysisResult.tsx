import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import type { BriefAnalysis } from '../../types'
import AudienceCard from './AudienceCard'
import NextActionList from './NextActionList'
import RiskList from './RiskList'
import StrengthList from './StrengthList'
import SummaryCard from './SummaryCard'

function AnalysisResult({ result }: { result: BriefAnalysis }) {
  return (
    <Stack spacing={2}>
      <SummaryCard themes={result.themes} />
      <AudienceCard audience={result.audience} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <StrengthList strengths={result.strengths} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <RiskList risks={result.risks} />
        </Grid>
      </Grid>
      <NextActionList actions={result.nextActions} />
    </Stack>
  )
}

export default AnalysisResult
