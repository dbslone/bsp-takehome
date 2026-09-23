import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h4" component="h2">
        Page not found
      </Typography>
      <Typography color="text.secondary">
        The page you are looking for doesn&apos;t exist.
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Go back home
      </Button>
    </Stack>
  )
}

export default NotFoundPage
