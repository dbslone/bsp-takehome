import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useColorScheme } from '@mui/material/styles'

function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme()

  if (!mode) {
    return null
  }

  const resolvedMode = mode === 'system' ? systemMode : mode
  const nextMode = resolvedMode === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${nextMode} mode`

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(nextMode)} color="inherit">
        {resolvedMode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
      </IconButton>
    </Tooltip>
  )
}

export default ColorModeToggle
