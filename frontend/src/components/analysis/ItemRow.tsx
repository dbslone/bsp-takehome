import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import type { AnalysisItem } from '../../types'

function ItemRow({ item, children }: { item: AnalysisItem; children?: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
        {children}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {item.detail}
      </Typography>
    </Stack>
  )
}

export default ItemRow
