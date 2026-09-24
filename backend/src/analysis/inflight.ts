type Run = { briefId: string; controller: AbortController }

const runs = new Map<string, Run>()

export function beginBriefRun(analysisId: string, briefId: string): AbortSignal {
  const controller = new AbortController()
  runs.set(analysisId, { briefId, controller })
  return controller.signal
}

export function cancelBrief(briefId: string): void {
  for (const [analysisId, run] of runs) {
    if (run.briefId !== briefId) continue
    runs.delete(analysisId)
    run.controller.abort()
  }
}

export function endBriefRun(analysisId: string): void {
  runs.delete(analysisId)
}
