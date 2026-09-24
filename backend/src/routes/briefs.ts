import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { startAnalysis } from '../analysis/run.js'
import { briefPatchFromBody, briefTextFromBody, briefUploadError } from '../briefFields.js'
import {
  createBrief,
  getAnalysisState,
  getBrief,
  getBriefFile,
  hasPendingAnalysis,
  listBriefs,
  removeBrief,
  updateBrief,
  type IncomingFile,
} from '../store/index.js'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
})

export const briefsRouter = Router()

briefsRouter.get('/', async (_req, res) => {
  res.json(await listBriefs())
})

briefsRouter.post('/', receiveUpload, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'A file is required' })
    return
  }
  const uploadError = briefUploadError(req.file.originalname)
  if (uploadError) {
    res.status(400).json({ error: uploadError })
    return
  }
  const parsed = briefTextFromBody(readBody(req.body))
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }

  const brief = await createBrief(parsed.text, incomingFile(req.file))
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

  const parsed = briefPatchFromBody(readBody(req.body))
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const patch = parsed.patch

  if (req.file) {
    const uploadError = briefUploadError(req.file.originalname)
    if (uploadError) {
      res.status(400).json({ error: uploadError })
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

function incomingFile(file: Express.Multer.File): IncomingFile {
  return {
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }
}
