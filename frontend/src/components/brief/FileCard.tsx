import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useBriefDownload } from '../../fileDownload'
import { formatBytes } from '../../format'
import type { BriefFile } from '../../types'

function FileCard({ briefId, file }: { briefId: string; file: BriefFile }) {
  const Icon = file.mimeType === 'application/pdf' ? PictureAsPdfOutlined : DescriptionOutlined
  const download = useBriefDownload(briefId, file.originalName)
  return (
    <Stack spacing={1}>
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
          <IconButton
            aria-label="Download file"
            disabled={download.downloading}
            onClick={() => void download.download()}
          >
            <DownloadOutlined />
          </IconButton>
        </Tooltip>
      </Stack>
      {download.error && <Alert severity="error">{download.error}</Alert>}
    </Stack>
  )
}

export default FileCard
