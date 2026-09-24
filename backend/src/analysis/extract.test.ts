import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fileContent } from './extract.js'

describe('fileContent', () => {
  it('sends a pdf as a base64 data URL', async () => {
    const content = await fileContent({
      originalName: 'brief.PDF',
      mimeType: 'application/pdf',
      bytes: Buffer.from('%PDF-1.4'),
    })
    const part = content.parts[0]
    assert.equal(part?.type, 'file')
    if (part?.type !== 'file') return
    assert.equal(part.file.filename, 'brief.PDF')
    assert.match(part.file.file_data, /^data:application\/pdf;base64,/)
    assert.equal(content.plugins[0]?.id, 'file-parser')
  })

  it('inlines plain text', async () => {
    const content = await fileContent({
      originalName: 'notes.txt',
      mimeType: 'text/plain',
      bytes: Buffer.from('  Hello brief  '),
    })
    const part = content.parts[0]
    assert.equal(part?.type, 'text')
    if (part?.type !== 'text') return
    assert.match(part.text, /notes\.txt/)
    assert.match(part.text, /Hello brief/)
    assert.deepEqual(content.plugins, [])
  })

  it('rejects a docx that is not a document', async () => {
    await assert.rejects(
      fileContent({
        originalName: 'brief.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        bytes: Buffer.from('PK not a document'),
      }),
    )
  })
})
