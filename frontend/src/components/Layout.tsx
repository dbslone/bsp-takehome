import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { NavLink, Outlet } from 'react-router'
import BackendStatusButton from './BackendStatusButton'
import ColorModeToggle from './ColorModeToggle'

const navButtonSx = {
  color: 'text.secondary',
  '&.active': { color: 'primary.main', bgcolor: 'action.selected' },
} as const

function Layout() {
  return (
    <>
      <AppBar position="sticky">
        <Container maxWidth="md">
          <Toolbar disableGutters sx={{ gap: 2 }}>
            <Typography variant="h6" component="h1">
              BSP Takehome
            </Typography>
            <Box component="nav" sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
              <Button component={NavLink} to="/" end sx={navButtonSx}>
                Home
              </Button>
            </Box>
            <ColorModeToggle />
            <BackendStatusButton />
          </Toolbar>
        </Container>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </>
  )
}

export default Layout
