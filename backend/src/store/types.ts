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
  file: BriefFile | null
  createdAt: string
  updatedAt: string
}

export type IncomingFile = {
  buffer: Buffer
  originalName: string
  mimeType: string
  size: number
}

export type BriefText = {
  title: string
  description: string
  contentType: string
  targetAudience: string
  notes: string
}

export type BriefPatch = {
  title?: string
  description?: string
  contentType?: string
  targetAudience?: string
  notes?: string
  file?: IncomingFile
}

export type BriefUpload = {
  originalName: string
  mimeType: string
  bytes: Buffer
}

export type AnalysisStatus = 'pending' | 'succeeded' | 'error'

export type Analysis = {
  id: string
  briefId: string
  status: AnalysisStatus
  model: string | null
  result: unknown
  error: string | null
  createdAt: string
  completedAt: string | null
}

export type AnalysisState = {
  latest: Analysis | null
  latestSucceeded: Analysis | null
}
