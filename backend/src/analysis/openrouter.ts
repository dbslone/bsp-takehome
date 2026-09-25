const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free'
const FALLBACK_MODELS = ['qwen/qwen3.8-27b:free', 'openrouter/free']
const TIMEOUT_MS = 90_000

export type ContentPart =
  { type: 'text'; text: string } | { type: 'file'; file: { filename: string; file_data: string } }

export type Message = { role: 'system'; content: string } | { role: 'user'; content: ContentPart[] }

export type Plugin = { id: 'file-parser'; pdf: { engine: 'cloudflare-ai' } }

export type Completion = {
  model: string
  content: string
}

export class OpenRouterError extends Error {
  readonly model: string | undefined

  constructor(message: string, model?: string) {
    super(message)
    this.name = 'OpenRouterError'
    this.model = model
  }
}

export async function callOpenRouter(
  messages: Message[],
  options: { plugins: Plugin[]; schema: Record<string, unknown>; signal?: AbortSignal },
): Promise<Completion> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not set on the server')
  }

  const primary = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL
  const models = [primary, ...FALLBACK_MODELS.filter((model) => model !== primary)]
  const signal = requestSignal(options.signal)
  let lastError = new OpenRouterError('The model returned an empty response', primary)

  for (const model of models) {
    if (signal.aborted) break
    try {
      return await requestModel(apiKey, model, messages, options, signal)
    } catch (err: unknown) {
      lastError = nextError(err, options.signal, signal, model)
    }
  }
  throw lastError
}

async function requestModel(
  apiKey: string,
  model: string,
  messages: Message[],
  options: { plugins: Plugin[]; schema: Record<string, unknown> },
  signal: AbortSignal,
): Promise<Completion> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'BSP Brief Analysis',
    },
    body: JSON.stringify({
      model,
      messages,
      plugins: options.plugins,
      reasoning: { effort: 'none' },
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'brief_analysis', strict: true, schema: options.schema },
      },
    }),
    signal,
  })

  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new OpenRouterError(`OpenRouter returned ${res.status}: ${errorMessage(body)}`, model)
  }

  const content = completionText(body)
  if (!content) {
    const upstream = errorMessage(body)
    throw new OpenRouterError(
      upstream === 'Unknown error' ? 'The model returned an empty response' : upstream,
      stringAt(body, ['model']) ?? model,
    )
  }
  return { model: stringAt(body, ['model']) ?? model, content }
}

function nextError(
  err: unknown,
  cancel: AbortSignal | undefined,
  signal: AbortSignal,
  model: string,
): OpenRouterError {
  if (cancel?.aborted) throw new OpenRouterError('Analysis was cancelled')
  if (signal.aborted || (err instanceof Error && err.name === 'TimeoutError')) {
    throw new OpenRouterError(`OpenRouter did not respond within ${TIMEOUT_MS / 1000} seconds`)
  }
  if (err instanceof OpenRouterError) return err
  return new OpenRouterError('Could not reach OpenRouter', model)
}

function valueAt(value: unknown, path: (string | number)[]): unknown {
  let current = value
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string | number, unknown>)[key]
  }
  return current
}

export function completionText(body: unknown): string | undefined {
  const message = valueAt(body, ['choices', 0, 'message'])
  return (
    textValue(valueAt(message, ['content'])) ??
    textValue(valueAt(message, ['reasoning'])) ??
    textValue(detailText(valueAt(message, ['reasoning_details'])))
  )
}

function textValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (!Array.isArray(value)) return undefined
  const text = value.map(partText).join('')
  return text.trim() || undefined
}

function partText(part: unknown): string {
  if (typeof part === 'string') return part
  if (typeof part !== 'object' || part === null) return ''
  const text = (part as Record<string, unknown>).text
  return typeof text === 'string' ? text : ''
}

function detailText(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map(partText).join('')
}

function stringAt(value: unknown, path: (string | number)[]): string | undefined {
  const found = valueAt(value, path)
  return typeof found === 'string' ? found : undefined
}

function requestSignal(cancel: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  return cancel ? AbortSignal.any([timeout, cancel]) : timeout
}

function errorMessage(body: unknown): string {
  return (
    stringAt(body, ['error', 'message']) ??
    stringAt(body, ['choices', 0, 'error', 'message']) ??
    'Unknown error'
  )
}
