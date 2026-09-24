import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

function RouteErrorPage() {
  const error = useRouteError()
  console.error(error)
  const detail = isRouteErrorResponse(error) ? error.statusText : ''

  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Alert severity="error">{detail || 'This page could not be displayed'}</Alert>
      <Button component={Link} to="/" variant="contained">
        Go back home
      </Button>
    </Stack>
  )
}

export default RouteErrorPage
