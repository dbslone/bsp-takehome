import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Brief } from '../../types'
import DetailField from './DetailField'
import FileCard from './FileCard'

function BriefSidebar({ brief }: { brief: Brief }) {
  return (
    <Paper sx={{ p: 2.5, position: { md: 'sticky' }, top: { md: 88 } }}>
      <Stack spacing={2} divider={<Divider flexItem />}>
        <Typography variant="h6" component="h3">
          Brief details
        </Typography>
        <DetailField label="Description" value={brief.description} />
        <DetailField label="Target audience" value={brief.targetAudience} />
        <DetailField label="Notes" value={brief.notes} />
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Attachment
          </Typography>
          <FileCard briefId={brief.id} file={brief.file} />
        </Stack>
      </Stack>
    </Paper>
  )
}

export default BriefSidebar
