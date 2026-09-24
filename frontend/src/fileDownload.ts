import { useState } from 'react'
import { api } from './api'
import { apiErrorMessage } from './apiError'

export function useBriefDownload(briefId: string, filename: string) {
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setDownloading(true)
    setError(null)
    try {
      await saveBriefFile(briefId, filename)
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Could not download the file'))
    } finally {
      setDownloading(false)
    }
  }

  return { error, downloading, download }
}

async function saveBriefFile(briefId: string, filename: string): Promise<void> {
  const res = await api.get<Blob>(`/briefs/${briefId}/file`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
