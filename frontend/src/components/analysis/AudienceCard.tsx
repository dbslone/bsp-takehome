import GroupsOutlined from '@mui/icons-material/GroupsOutlined'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import type { BriefAnalysis } from '../../types'
import { itemKey } from './itemKey'
import ItemRow from './ItemRow'
import SectionCard from './SectionCard'

function AudienceCard({ audience }: { audience: BriefAnalysis['audience'] }) {
  return (
    <SectionCard title="Target audience" icon={<GroupsOutlined />}>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Labeled label="Stated in the brief">
            {audience.statedAudience ? (
              <Typography variant="body2">{audience.statedAudience}</Typography>
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                Not stated
              </Typography>
            )}
          </Labeled>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Labeled label="Our read">
            <Typography variant="body2">{audience.interpretation}</Typography>
          </Labeled>
        </Grid>
      </Grid>
      {audience.segments.length > 0 && (
        <Labeled label="Segments">
          <Grid container spacing={1.5}>
            {audience.segments.map((segment) => (
              <Grid key={itemKey(segment)} size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{
                    p: 1.5,
                    height: '100%',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <ItemRow item={segment} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Labeled>
      )}
    </SectionCard>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {label}
      </Typography>
      {children}
    </Stack>
  )
}

export default AudienceCard
