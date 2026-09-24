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
  options: { plugins: Plugin[]; schema: Record<string, unknown> },
): Promise<Completion> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not set on the server')
  }

  const primary = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL
  const models = [primary, ...FALLBACK_MODELS.filter((model) => model !== primary)]

  let res: Response
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'BSP Brief Analysis',
      },
      body: JSON.stringify({
        models,
        messages,
        plugins: options.plugins,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'brief_analysis', strict: true, schema: options.schema },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new OpenRouterError(`OpenRouter did not respond within ${TIMEOUT_MS / 1000} seconds`)
    }
    throw new OpenRouterError('Could not reach OpenRouter')
  }

  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new OpenRouterError(`OpenRouter returned ${res.status}: ${errorMessage(body)}`)
  }

  const model = stringAt(body, ['model']) ?? primary
  const content = stringAt(body, ['choices', 0, 'message', 'content'])
  if (!content) {
    const upstream = errorMessage(body)
    throw new OpenRouterError(
      upstream === 'Unknown error' ? 'The model returned an empty response' : upstream,
      model,
    )
  }
  return { model, content }
}

function valueAt(value: unknown, path: (string | number)[]): unknown {
  let current = value
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string | number, unknown>)[key]
  }
  return current
}

function stringAt(value: unknown, path: (string | number)[]): string | undefined {
  const found = valueAt(value, path)
  return typeof found === 'string' ? found : undefined
}

function errorMessage(body: unknown): string {
  return (
    stringAt(body, ['error', 'message']) ??
    stringAt(body, ['choices', 0, 'error', 'message']) ??
    'Unknown error'
  )
}
