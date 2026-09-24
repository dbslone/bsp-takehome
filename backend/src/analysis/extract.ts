import path from 'node:path'
import mammoth from 'mammoth'
import type { BriefUpload } from '../store/index.js'
import type { ContentPart, Plugin } from './openrouter.js'

export type FileContent = {
  parts: ContentPart[]
  plugins: Plugin[]
}

export async function fileContent(file: BriefUpload): Promise<FileContent> {
  const extension = path.extname(file.originalName).toLowerCase()

  if (extension === '.pdf') {
    return {
      parts: [
        {
          type: 'file',
          file: {
            filename: file.originalName,
            file_data: `data:application/pdf;base64,${file.bytes.toString('base64')}`,
          },
        },
      ],
      plugins: [{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }],
    }
  }

  const text =
    extension === '.docx'
      ? (await mammoth.extractRawText({ buffer: file.bytes })).value
      : file.bytes.toString('utf8')

  return {
    parts: [{ type: 'text', text: `Attached file (${file.originalName}):\n\n${text.trim()}` }],
    plugins: [],
  }
}
