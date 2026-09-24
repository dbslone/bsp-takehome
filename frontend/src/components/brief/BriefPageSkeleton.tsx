import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

function BriefPageSkeleton() {
  return (
    <Stack spacing={3} aria-busy="true" aria-label="Loading brief">
      <Stack spacing={1.5}>
        <Skeleton width={90} />
        <Skeleton variant="text" sx={{ fontSize: '2.125rem', maxWidth: 420 }} />
        <Skeleton width={260} />
      </Stack>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={160} />
            <Skeleton variant="rounded" height={220} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={320} />
        </Grid>
      </Grid>
    </Stack>
  )
}

export default BriefPageSkeleton
