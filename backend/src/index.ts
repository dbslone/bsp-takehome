import express from 'express'
import cors from 'cors'
import { briefsRouter } from './routes/briefs.js'
import { initStore } from './store.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)

await initStore()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/briefs', briefsRouter)

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})
