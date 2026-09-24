import { migrate } from '../db/migrate.js'
import { failInterruptedAnalyses } from './analyses.js'

export async function initStore(): Promise<void> {
  await migrate()
  await failInterruptedAnalyses()
}

export { pingStore } from '../db/pool.js'
