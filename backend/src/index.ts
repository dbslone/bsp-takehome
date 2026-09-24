import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import cors from 'cors'
import { errorBody } from './httpError.js'
import { listenPort } from './listenPort.js'
import { briefsRouter } from './routes/briefs.js'
import { initStore, pingStore } from './store/index.js'

const app = express()
const port = listenPort(process.env.PORT)

await initStore()

app.use(cors())
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await pingStore()
    res.json({ status: 'ok' })
  } catch {
    res.status(503).json({ status: 'error' })
  }
})

app.use('/api/briefs', briefsRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

const staticDir = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : fileURLToPath(new URL('../../frontend/dist', import.meta.url))
const indexHtml = path.join(staticDir, 'index.html')

if (existsSync(indexHtml)) {
  app.use(express.static(staticDir))
  app.get('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      next()
      return
    }
    res.sendFile(indexHtml)
  })
}

const handleError: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err)
    return
  }
  const body = errorBody(err)
  if (body.status >= 500) console.error(err)
  res.status(body.status).json({ error: body.error })
}

app.use(handleError)

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})
