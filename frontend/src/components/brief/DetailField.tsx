import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

function DetailField({ label, value }: { label: string; value: string }) {
  const text = value.trim()
  return (
    <Stack spacing={0.5}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {label}
      </Typography>
      {text ? (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {text}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
          Not provided
        </Typography>
      )}
    </Stack>
  )
}

export default DetailField
