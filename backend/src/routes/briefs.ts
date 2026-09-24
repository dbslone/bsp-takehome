import path from 'node:path'
import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { startAnalysis } from '../analysis/run.js'
import {
  createBrief,
  getAnalysisState,
  getBrief,
  getBriefFile,
  hasPendingAnalysis,
  listBriefs,
  removeBrief,
  updateBrief,
  type BriefPatch,
  type IncomingFile,
} from '../store.js'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
})

export const briefsRouter = Router()

briefsRouter.get('/', async (_req, res) => {
  res.json(await listBriefs())
})

briefsRouter.post('/', receiveUpload, async (req, res) => {
  const body = readBody(req.body)
  const title = textField(body, 'title')
  if (!title) {
    res.status(400).json({ error: 'Title is required' })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'A file is required' })
    return
  }
  if (!isAllowedUpload(req.file)) {
    res.status(400).json({ error: 'Upload must be a PDF, DOCX, or plain text file' })
    return
  }

  const brief = await createBrief(
    {
      title,
      description: textField(body, 'description') ?? '',
      contentType: textField(body, 'contentType') ?? '',
      targetAudience: textField(body, 'targetAudience') ?? '',
      notes: textField(body, 'notes') ?? '',
    },
    incomingFile(req.file),
  )
  await queueAnalysis(brief.id)
  res.status(201).json(brief)
})

briefsRouter.get('/:id/analysis', async (req, res) => {
  const brief = await getBrief(req.params.id)
  if (!brief) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(await getAnalysisState(brief.id))
})

briefsRouter.post('/:id/analysis', async (req, res) => {
  const brief = await getBrief(req.params.id)
  if (!brief) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  if (await hasPendingAnalysis(brief.id)) {
    res.status(409).json({ error: 'An analysis is already in progress' })
    return
  }
  res.status(202).json(await startAnalysis(brief.id))
})

briefsRouter.get('/:id/file', async (req, res) => {
  const file = await getBriefFile(req.params.id)
  if (!file) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  res.type(file.mimeType || 'application/octet-stream')
  res.attachment(file.originalName)
  res.send(file.bytes)
})

briefsRouter.get('/:id', async (req, res) => {
  const brief = await getBrief(req.params.id)
  if (!brief) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(brief)
})

briefsRouter.patch('/:id', receiveUpload, async (req: Request<{ id: string }>, res) => {
  const existing = await getBrief(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const body = readBody(req.body)
  const patch: BriefPatch = {}
  if ('title' in body) {
    const title = textField(body, 'title')
    if (!title) {
      res.status(400).json({ error: 'Title is required' })
      return
    }
    patch.title = title
  }
  for (const key of ['description', 'contentType', 'targetAudience', 'notes'] as const) {
    if (key in body) {
      patch[key] = textField(body, key) ?? ''
    }
  }

  if (req.file) {
    if (!isAllowedUpload(req.file)) {
      res.status(400).json({ error: 'Upload must be a PDF, DOCX, or plain text file' })
      return
    }
    patch.file = incomingFile(req.file)
  }

  const brief = await updateBrief(req.params.id, patch)
  if (!brief) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  if (Object.keys(patch).length > 0) {
    await queueAnalysis(brief.id)
  }
  res.json(brief)
})

briefsRouter.delete('/:id', async (req, res) => {
  const removed = await removeBrief(req.params.id)
  if (!removed) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.status(204).end()
})

async function queueAnalysis(briefId: string): Promise<void> {
  try {
    await startAnalysis(briefId)
  } catch (err: unknown) {
    console.error(`Could not start analysis for brief ${briefId}`, err)
  }
}

function receiveUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next()
      return
    }
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'File must be 10 MB or smaller' : 'Invalid upload'
      res.status(400).json({ error: message })
      return
    }
    next(err)
  })
}

function readBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    return body as Record<string, unknown>
  }
  return {}
}

function textField(body: Record<string, unknown>, key: string): string | undefined {
  if (!(key in body)) return undefined
  const value = body[key]
  if (typeof value !== 'string') return undefined
  return value.trim()
}

function isAllowedUpload(file: Express.Multer.File): boolean {
  return ALLOWED_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())
}

function incomingFile(file: Express.Multer.File): IncomingFile {
  return {
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }
}
