type ErrorBody = { status: number; error: string }

export function errorBody(err: unknown): ErrorBody {
  const parsed = parserError(err)
  if (parsed?.type === 'entity.parse.failed') return { status: 400, error: 'Invalid JSON' }
  if (parsed?.type === 'entity.too.large')
    return { status: 413, error: 'Request body is too large' }
  return { status: 500, error: 'Something went wrong' }
}

function parserError(err: unknown): { status: number; type: string } | null {
  if (typeof err !== 'object' || err === null) return null
  if (!('status' in err) || !('type' in err)) return null
  const { status, type } = err
  if (typeof status !== 'number' || typeof type !== 'string') return null
  return { status, type }
}
