import { randomUUID } from 'node:crypto'
import { getPool } from '../db/pool.js'
import { asRecord, ID_PATTERN, requiredString, timestamp } from './row.js'
import type { Analysis, AnalysisState, AnalysisStatus } from './types.js'

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
  const result = await getPool().query(
    `INSERT INTO brief_analyses (id, brief_id, status, created_at)
    VALUES ($1, $2, 'pending', $3)
    RETURNING ${ANALYSIS_COLUMNS}`,
    [randomUUID(), briefId, new Date().toISOString()],
  )
  return asAnalysis(result.rows[0])
}

export async function completeAnalysis(
  id: string,
  outcome: { model: string; result: unknown },
): Promise<void> {
  await getPool().query(
    `UPDATE brief_analyses
    SET status = 'succeeded', model = $2, result = $3, completed_at = $4
    WHERE id = $1`,
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
    WHERE id = $1`,
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

export async function hasPendingAnalysis(briefId: string): Promise<boolean> {
  if (!ID_PATTERN.test(briefId)) return false
  const result = await getPool().query(
    `SELECT 1 FROM brief_analyses WHERE brief_id = $1 AND status = 'pending' LIMIT 1`,
    [briefId],
  )
  return (result.rowCount ?? 0) > 0
}

export async function failInterruptedAnalyses(): Promise<void> {
  await getPool().query(
    `UPDATE brief_analyses
    SET status = 'error', error = 'Interrupted by server restart', completed_at = now()
    WHERE status = 'pending'`,
  )
}
