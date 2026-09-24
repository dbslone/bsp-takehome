import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlineOutlined'
import TrendingUp from '@mui/icons-material/TrendingUp'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { AnalysisItem } from '../../types'
import { itemKey } from './itemKey'
import ItemRow from './ItemRow'
import SectionCard from './SectionCard'

function StrengthList({ strengths }: { strengths: AnalysisItem[] }) {
  return (
    <SectionCard title="Strengths and opportunities" icon={<TrendingUp />}>
      {strengths.length === 0 ? (
        <Typography color="text.secondary">None noted</Typography>
      ) : (
        <Stack spacing={2}>
          {strengths.map((item) => (
            <Stack key={itemKey(item)} direction="row" spacing={1.5}>
              <CheckCircleOutline color="success" fontSize="small" sx={{ mt: 0.25 }} />
              <ItemRow item={item} />
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  )
}

export default StrengthList
