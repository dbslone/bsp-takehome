import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { briefFileUrl } from '../../api'
import { formatBytes } from '../../format'
import type { BriefFile } from '../../types'

function FileCard({ briefId, file }: { briefId: string; file: BriefFile }) {
  const Icon = file.mimeType === 'application/pdf' ? PictureAsPdfOutlined : DescriptionOutlined
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        p: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'action.hover',
      }}
    >
      <Icon color="primary" />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Tooltip title={file.originalName}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
            {file.originalName}
          </Typography>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" noWrap component="p">
          {file.mimeType} · {formatBytes(file.size)}
        </Typography>
      </Box>
      <Tooltip title="Download file">
        <IconButton component="a" href={briefFileUrl(briefId)} aria-label="Download file">
          <DownloadOutlined />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}

export default FileCard
