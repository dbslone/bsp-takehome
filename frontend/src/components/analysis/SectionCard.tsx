import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

type SectionCardProps = {
  title: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
}

function SectionCard({ title, icon, action, children }: SectionCardProps) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary' }}
        >
          {icon}
          <Typography variant="h6" component="h4" color="text.primary" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {action}
        </Stack>
        {children}
      </Stack>
    </Paper>
  )
}

export default SectionCard
