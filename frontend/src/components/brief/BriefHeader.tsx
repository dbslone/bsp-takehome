import ArrowBack from '@mui/icons-material/ArrowBack'
import CategoryOutlined from '@mui/icons-material/CategoryOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'
import { briefFileUrl } from '../../api'
import { briefTitle } from '../../briefForm'
import { formatDateTime } from '../../format'
import type { Brief } from '../../types'

function BriefHeader({ brief }: { brief: Brief }) {
  return (
    <Stack spacing={1.5}>
      <Button
        component={Link}
        to="/"
        size="small"
        startIcon={<ArrowBack />}
        sx={{ alignSelf: 'flex-start', color: 'text.secondary', ml: -1 }}
      >
        All briefs
      </Button>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h2" sx={{ wordBreak: 'break-word' }}>
            {briefTitle(brief)}
          </Typography>
          <HeaderMeta brief={brief} />
        </Box>
        <Button
          component="a"
          href={briefFileUrl(brief.id)}
          variant="contained"
          startIcon={<DownloadOutlined />}
          sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
        >
          Download file
        </Button>
      </Stack>
    </Stack>
  )
}

function HeaderMeta({ brief }: { brief: Brief }) {
  const contentType = brief.contentType.trim()
  return (
    <Stack
      direction="row"
      spacing={1.5}
      useFlexGap
      sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1 }}
    >
      {contentType && (
        <Chip
          size="small"
          icon={<CategoryOutlined />}
          label={contentType}
          color="primary"
          variant="outlined"
        />
      )}
      <Typography variant="body2" color="text.secondary">
        Created {formatDateTime(brief.createdAt)}
      </Typography>
      {brief.updatedAt !== brief.createdAt && (
        <Typography variant="body2" color="text.secondary">
          Updated {formatDateTime(brief.updatedAt)}
        </Typography>
      )}
    </Stack>
  )
}

export default BriefHeader
