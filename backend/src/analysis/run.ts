import type { z } from 'zod'
import {
  analysisIsPending,
  completeAnalysis,
  createAnalysis,
  failAnalysis,
  fillBlankBriefFields,
  getBrief,
  getBriefFile,
  replacePendingAnalysis,
  type Analysis,
  type Brief,
  type BriefText,
  type BriefUpload,
} from '../store/index.js'
import { fileContent, type FileContent } from './extract.js'
import { beginBriefRun, cancelBrief, endBriefRun } from './inflight.js'
import {
  callOpenRouter,
  OpenRouterError,
  type Completion,
  type ContentPart,
  type Plugin,
} from './openrouter.js'
import {
  BriefAnalysis,
  ModelResponse,
  modelResponseJsonSchema,
  type BriefAnalysis as AnalysisResult,
} from './schema.js'

const SYSTEM_PROMPT = `You are a senior creative strategist reviewing a creative brief for a production team.
Read the brief form fields and any attached file, then respond with a single JSON object that matches the provided schema exactly. Do not include any text outside the JSON.

- extracted: title, description, contentType, targetAudience, and notes taken from the attached file. Form lines that say "(not provided)" are blank. Use an empty string when the file does not state a value. If no file is attached, leave every extracted field as an empty string. Title and content type must each be 255 characters or fewer.
- themes: summarize the brief, list its primary themes, classify the content type, and describe the tone.
- audience: quote the stated audience (or null if none), explain who the audience really is, and list useful segments.
- strengths: what the brief does well and the creative opportunities it opens up.
- risks: risks, ambiguities, and missing information (budget, timeline, deliverables, success metrics, approvals, mandatories). Set kind and severity for each.
- nextActions: concrete next steps for the team, each with a priority.

Be specific to this brief. Avoid generic advice.`

export async function startAnalysis(briefId: string): Promise<Analysis> {
  const analysis = await createAnalysis(briefId)
  void runAnalysis(analysis.id, briefId)
  return analysis
}

export async function restartAnalysis(briefId: string): Promise<Analysis> {
  cancelBrief(briefId)
  const analysis = await replacePendingAnalysis(briefId)
  void runAnalysis(analysis.id, briefId)
  return analysis
}

async function runAnalysis(analysisId: string, briefId: string): Promise<void> {
  const signal = beginBriefRun(analysisId, briefId)
  try {
    if (signal.aborted || !(await analysisIsPending(analysisId))) return
    await settle(analysisId, briefId, await analyze(briefId, signal))
  } catch (err: unknown) {
    console.error(`Analysis ${analysisId} failed`, err)
    await settle(analysisId, briefId, {
      ok: false,
      error: 'Unexpected error while analyzing the brief',
    }).catch((saveErr: unknown) => {
      console.error(`Could not save failure for ${analysisId}`, saveErr)
    })
  } finally {
    endBriefRun(analysisId)
  }
}

async function settle(analysisId: string, briefId: string, outcome: Outcome): Promise<void> {
  if (!(await analysisIsPending(analysisId))) return
  if (!outcome.ok) {
    await failAnalysis(analysisId, outcome).catch((saveErr: unknown) => {
      console.error(`Could not save failure for ${analysisId}`, saveErr)
    })
    return
  }
  await fillBlankBriefFields(briefId, outcome.extracted)
  await completeAnalysis(analysisId, { model: outcome.model, result: outcome.result })
}

type Outcome =
  | { ok: true; model: string; result: AnalysisResult; extracted: BriefText }
  | { ok: false; error: string; model?: string; rawResponse?: string }

async function analyze(briefId: string, signal: AbortSignal): Promise<Outcome> {
  if (signal.aborted) return { ok: false, error: 'Analysis was cancelled' }
  const [brief, file] = await Promise.all([getBrief(briefId), getBriefFile(briefId)])
  if (!brief) return { ok: false, error: 'The brief or its file no longer exists' }
  if (!file) return reviewForm(brief, signal)
  return reviewFile(brief, file, signal)
}

async function reviewForm(brief: Brief, signal: AbortSignal): Promise<Outcome> {
  const text = [
    `Brief form fields:\n${formFields(brief)}`,
    'No file is attached. Leave every extracted field as an empty string.',
  ].join('\n\n')
  return requestModel([{ type: 'text', text }], [], signal)
}

async function reviewFile(brief: Brief, file: BriefUpload, signal: AbortSignal): Promise<Outcome> {
  let content: FileContent
  try {
    content = await fileContent(file)
  } catch {
    return { ok: false, error: 'Could not read text from the uploaded file' }
  }
  const parts: ContentPart[] = [
    { type: 'text', text: `Brief form fields:\n${formFields(brief)}` },
    ...content.parts,
  ]
  return requestModel(parts, content.plugins, signal)
}

function formFields(brief: BriefText): string {
  return [
    `Title: ${brief.title || '(not provided)'}`,
    `Description: ${brief.description || '(not provided)'}`,
    `Content type: ${brief.contentType || '(not provided)'}`,
    `Target audience: ${brief.targetAudience || '(not provided)'}`,
    `Notes: ${brief.notes || '(not provided)'}`,
  ].join('\n')
}

async function requestModel(
  parts: ContentPart[],
  plugins: Plugin[],
  signal: AbortSignal,
): Promise<Outcome> {
  let completion: Completion
  try {
    completion = await callOpenRouter(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: parts },
      ],
      { plugins, schema: modelResponseJsonSchema, signal },
    )
  } catch (err: unknown) {
    if (err instanceof OpenRouterError) return { ok: false, error: err.message, model: err.model }
    throw err
  }
  return readModelResponse(completion)
}

function readModelResponse(completion: Completion): Outcome {
  const { model, content: raw } = completion
  const parsed = parseModelResponse(raw)
  if (!parsed.ok) return { ...parsed, model, rawResponse: raw }
  return { ok: true, model, result: parsed.result, extracted: parsed.extracted }
}

export function parseModelResponse(raw: string): ModelParse {
  const json = parseJson(raw)
  if (!json.ok) return { ok: false, error: 'The model did not return valid JSON' }

  const parsed = ModelResponse.safeParse(supplyExtracted(json.value))
  if (!parsed.success) {
    return {
      ok: false,
      error: `Response did not match the expected format: ${describeIssues(parsed.error)}`,
    }
  }

  const { extracted, ...result } = parsed.data
  return { ok: true, result, extracted }
}

type ModelParse =
  { ok: true; result: AnalysisResult; extracted: BriefText } | { ok: false; error: string }

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(modelJson(raw)) }
  } catch {
    return { ok: false }
  }
}

function modelJson(raw: string): string {
  const text = unwrapJson(raw)
  const start = text.indexOf('{')
  if (start === -1) return text
  const body = text.slice(start)
  const end = body.lastIndexOf('}')
  if (end === -1) return `${body.trimEnd()}}`
  const after = body.slice(end + 1).trim()
  if (after.includes(']')) return `${body.trimEnd()}}`
  return body.slice(0, end + 1)
}

function unwrapJson(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
}

function supplyExtracted(value: unknown): unknown {
  if (!isRecord(value) || 'extracted' in value) return value
  if (!BriefAnalysis.safeParse(value).success) return value
  return {
    ...value,
    extracted: { title: '', description: '', contentType: '', targetAudience: '', notes: '' },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function describeIssues(error: z.ZodError): string {
  const described = error.issues.slice(0, 3).map((issue) => {
    const where = issue.path
      .map((key, index) =>
        typeof key === 'number' ? `[${key}]` : `${index ? '.' : ''}${String(key)}`,
      )
      .join('')
    return where ? `${where} (${issue.message})` : issue.message
  })
  const more = error.issues.length > 3 ? ` and ${error.issues.length - 3} more` : ''
  return described.join('; ') + more
}
