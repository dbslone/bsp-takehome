export type BriefFile = {
  originalName: string
  mimeType: string
  size: number
}

export type Brief = {
  id: string
  title: string
  description: string
  contentType: string
  targetAudience: string
  notes: string
  file: BriefFile
  createdAt: string
  updatedAt: string
}

export type AnalysisItem = {
  title: string
  detail: string
}

export type BriefAnalysis = {
  themes: {
    summary: string
    primaryThemes: string[]
    contentType: string
    tone: string[]
  }
  audience: {
    statedAudience: string | null
    interpretation: string
    segments: AnalysisItem[]
  }
  strengths: AnalysisItem[]
  risks: (AnalysisItem & {
    kind: 'risk' | 'ambiguity' | 'missing'
    severity: 'low' | 'medium' | 'high'
  })[]
  nextActions: (AnalysisItem & { priority: 'now' | 'soon' | 'later' })[]
}

export type AnalysisStatus = 'pending' | 'succeeded' | 'error'

export type Analysis = {
  id: string
  briefId: string
  status: AnalysisStatus
  model: string | null
  result: BriefAnalysis | null
  error: string | null
  createdAt: string
  completedAt: string | null
}

export type AnalysisState = {
  latest: Analysis | null
  latestSucceeded: Analysis | null
}
