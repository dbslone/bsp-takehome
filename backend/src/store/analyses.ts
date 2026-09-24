import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { postgresCode } from '../db/pgError.js'
import { getPool } from '../db/pool.js'
import { asRecord, ID_PATTERN, requiredString, timestamp } from './row.js'
import type { Analysis, AnalysisState, AnalysisStatus } from './types.js'

const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

export class AnalysisAlreadyRunning extends Error {
  constructor() {
    super('An analysis is already in progress')
    this.name = 'AnalysisAlreadyRunning'
  }
}

export class BriefNotFound extends Error {
  constructor() {
    super('Not found')
    this.name = 'BriefNotFound'
  }
}

const ANALYSIS_COLUMNS = 'id, brief_id, status, model, result, error, created_at, completed_at'

function isAnalysisStatus(value: unknown): value is AnalysisStatus {
  return value === 'pending' || value === 'succeeded' || value === 'error'
}

function asAnalysis(row: unknown): Analysis {
  const value = asRecord(row, 'analysis row')
  const createdAt = timestamp(value.created_at)
  if (!isAnalysisStatus(value.status) || !createdAt) {
    throw new Error('Invalid analysis row')
  }

  return {
    id: requiredString(value.id, 'analysis row'),
    briefId: requiredString(value.brief_id, 'analysis row'),
    status: value.status,
    model: typeof value.model === 'string' ? value.model : null,
    result: value.result ?? null,
    error: typeof value.error === 'string' ? value.error : null,
    createdAt,
    completedAt: timestamp(value.completed_at),
  }
}

export async function createAnalysis(briefId: string): Promise<Analysis> {
  return insertPending(getPool(), briefId)
}

export async function replacePendingAnalysis(briefId: string): Promise<Analysis> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await supersedePending(client, briefId)
    const analysis = await insertPending(client, briefId)
    await client.query('COMMIT')
    return analysis
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function completeAnalysis(
  id: string,
  outcome: { model: string; result: unknown },
): Promise<void> {
  await getPool().query(
    `UPDATE brief_analyses
    SET status = 'succeeded', model = $2, result = $3, completed_at = $4
    WHERE id = $1 AND status = 'pending'`,
    [id, outcome.model, JSON.stringify(outcome.result), new Date().toISOString()],
  )
}

export async function failAnalysis(
  id: string,
  outcome: { error: string; model?: string; rawResponse?: string },
): Promise<void> {
  await getPool().query(
    `UPDATE brief_analyses
    SET status = 'error', error = $2, model = $3, raw_response = $4, completed_at = $5
    WHERE id = $1 AND status = 'pending'`,
    [
      id,
      outcome.error,
      outcome.model ?? null,
      outcome.rawResponse ?? null,
      new Date().toISOString(),
    ],
  )
}

export async function getAnalysisState(briefId: string): Promise<AnalysisState> {
  if (!ID_PATTERN.test(briefId)) return { latest: null, latestSucceeded: null }
  const [latest, latestSucceeded] = await Promise.all([
    getPool().query(
      `SELECT ${ANALYSIS_COLUMNS} FROM brief_analyses
      WHERE brief_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [briefId],
    ),
    getPool().query(
      `SELECT ${ANALYSIS_COLUMNS} FROM brief_analyses
      WHERE brief_id = $1 AND status = 'succeeded' ORDER BY created_at DESC LIMIT 1`,
      [briefId],
    ),
  ])
  const latestRow: unknown = latest.rows[0]
  const succeededRow: unknown = latestSucceeded.rows[0]
  return {
    latest: latestRow ? asAnalysis(latestRow) : null,
    latestSucceeded: succeededRow ? asAnalysis(succeededRow) : null,
  }
}

export async function analysisIsPending(id: string): Promise<boolean> {
  if (!ID_PATTERN.test(id)) return false
  const result = await getPool().query(
    `SELECT 1 FROM brief_analyses WHERE id = $1 AND status = 'pending'`,
    [id],
  )
  return (result.rowCount ?? 0) > 0
}

export async function hasPendingAnalysis(briefId: string): Promise<boolean> {
  if (!ID_PATTERN.test(briefId)) return false
  const result = await getPool().query(
    `SELECT 1 FROM brief_analyses WHERE brief_id = $1 AND status = 'pending' LIMIT 1`,
    [briefId],
  )
  return (result.rowCount ?? 0) > 0
}

type Queryable = Pool | PoolClient

async function supersedePending(client: PoolClient, briefId: string): Promise<void> {
  await client.query(
    `UPDATE brief_analyses
    SET status = 'error', error = 'Superseded by a newer analysis', completed_at = $2
    WHERE brief_id = $1 AND status = 'pending'`,
    [briefId, new Date().toISOString()],
  )
}

async function insertPending(db: Queryable, briefId: string): Promise<Analysis> {
  try {
    const result = await db.query(
      `INSERT INTO brief_analyses (id, brief_id, status, created_at)
      VALUES ($1, $2, 'pending', $3)
      RETURNING ${ANALYSIS_COLUMNS}`,
      [randomUUID(), briefId, new Date().toISOString()],
    )
    return asAnalysis(result.rows[0])
  } catch (err: unknown) {
    if (postgresCode(err) === UNIQUE_VIOLATION) throw new AnalysisAlreadyRunning()
    if (postgresCode(err) === FOREIGN_KEY_VIOLATION) throw new BriefNotFound()
    throw err
  }
}

export async function failInterruptedAnalyses(): Promise<void> {
  await getPool().query(
    `UPDATE brief_analyses
    SET status = 'error', error = 'Interrupted by server restart', completed_at = now()
    WHERE status = 'pending'`,
  )
}
