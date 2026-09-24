import Close from '@mui/icons-material/Close'
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'
import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react'

type FileDropzoneProps = {
  file: File | null
  disabled: boolean
  onChange: (file: File | null) => void
}

function FileDropzone({ file, disabled, onChange }: FileDropzoneProps) {
  const [fileInputKey, setFileInputKey] = useState(0)
  const [dragDepth, setDragDepth] = useState(0)
  const previousFile = useRef(file)
  const dragOver = dragDepth > 0 && !disabled

  useEffect(() => {
    if (previousFile.current && !file) setFileInputKey((key) => key + 1)
    previousFile.current = file
  }, [file])

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragDepth(0)
    if (disabled) return
    const dropped = event.dataTransfer.files[0]
    if (dropped) onChange(dropped)
  }

  function handleClearFile(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    setFileInputKey((key) => key + 1)
    onChange(null)
  }

  return (
    <Box
      component="label"
      data-drag-over={dragOver ? 'true' : undefined}
      onDragEnter={(event) => trackDrag(event, () => setDragDepth((depth) => depth + 1))}
      onDragOver={(event) => {
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
      }}
      onDragLeave={(event) =>
        trackDrag(event, () => setDragDepth((depth) => Math.max(0, depth - 1)))
      }
      onDrop={handleDrop}
      sx={(theme) => dropzoneSx(theme, disabled)}
    >
      <FileInput inputKey={fileInputKey} disabled={disabled} onChange={(next) => onChange(next)} />
      {file && (
        <IconButton
          type="button"
          size="small"
          aria-label="Remove file"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={handleClearFile}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <Close fontSize="small" />
        </IconButton>
      )}
      <DropzoneLabel file={file} />
    </Box>
  )
}

function FileInput({
  inputKey,
  disabled,
  onChange,
}: {
  inputKey: number
  disabled: boolean
  onChange: (file: File | null) => void
}) {
  return (
    <Box
      component="input"
      key={inputKey}
      type="file"
      accept=".pdf,.docx,.txt"
      disabled={disabled}
      onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      sx={{
        position: 'absolute',
        width: 1,
        height: 1,
        p: 0,
        m: -1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    />
  )
}

function DropzoneLabel({ file }: { file: File | null }) {
  return (
    <>
      {file ? (
        <InsertDriveFileOutlined sx={{ color: 'primary.main', fontSize: 32 }} />
      ) : (
        <CloudUploadOutlined sx={{ color: 'primary.main', fontSize: 32 }} />
      )}
      {file ? (
        <Typography sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{file.name}</Typography>
      ) : (
        <Typography>Drop a file here, or click to browse</Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        {file ? formatBytes(file.size) : 'Optional. PDF, DOCX, or TXT. 10 MB max.'}
      </Typography>
    </>
  )
}

function trackDrag(event: DragEvent<HTMLLabelElement>, update: () => void) {
  event.preventDefault()
  event.stopPropagation()
  update()
}

function dropzoneSx(theme: Theme, disabled: boolean) {
  return {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.5,
    px: 2,
    py: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'divider',
    borderRadius: 1,
    bgcolor: 'background.default',
    textAlign: 'center',
    cursor: disabled ? 'default' : 'pointer',
    pointerEvents: disabled ? 'none' : 'auto',
    transition: theme.transitions.create(['border-color', 'background-color']),
    ...(!disabled && {
      '&:hover, &:focus-within, &[data-drag-over="true"]': {
        borderStyle: 'solid',
        borderColor: 'primary.main',
        backgroundColor: `rgba(${theme.vars?.palette.primary.mainChannel ?? '79 70 229'} / 0.08)`,
      },
    }),
  }
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default FileDropzone
