import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { briefContentError, briefTextFromBody, briefUploadError } from './briefFields.js'

const examplesDir = fileURLToPath(new URL('../../example-briefs/', import.meta.url))

type ExampleCase = {
  name: string
  file: string
  fields: Record<string, unknown>
  expect: 'success' | 'fail'
}

function loadCases(): ExampleCase[] {
  const raw: unknown = JSON.parse(readFileSync(path.join(examplesDir, 'cases.json'), 'utf8'))
  if (!Array.isArray(raw) || raw.length < 4) {
    throw new Error('example-briefs/cases.json must list at least 4 cases')
  }
  return raw.map(asExample)
}

describe('brief file content', () => {
  it('rejects an empty file', () => {
    assert.equal(briefContentError('notes.txt', Buffer.alloc(0)), 'File is empty')
  })

  it('rejects a pdf without a pdf header', () => {
    assert.equal(briefContentError('notes.pdf', Buffer.from('hello')), 'File content is not a PDF')
  })

  it('accepts a pdf header', () => {
    assert.equal(briefContentError('notes.pdf', Buffer.from('%PDF-1.4')), null)
  })

  it('rejects binary text', () => {
    assert.equal(
      briefContentError('notes.txt', Buffer.from([0x68, 0x00])),
      'Text file contains binary data',
    )
  })

  it('rejects a docx that is not a zip', () => {
    assert.equal(
      briefContentError('notes.docx', Buffer.from('hello')),
      'File content is not a DOCX document',
    )
  })

  it('accepts a docx zip header', () => {
    assert.equal(briefContentError('notes.docx', Buffer.from([0x50, 0x4b, 0x03, 0x04])), null)
  })
})

describe('example briefs', () => {
  for (const example of loadCases()) {
    it(`${example.name} ${example.expect === 'success' ? 'succeeds' : 'fails'}`, () => {
      readFileSync(path.join(examplesDir, example.file))
      const text = briefTextFromBody(example.fields)
      const uploadError = briefUploadError(example.file)
      const ok = text.ok && uploadError === null
      assert.equal(ok, example.expect === 'success')
    })
  }
})

function asExample(value: unknown): ExampleCase {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid example case')
  const record = value as Record<string, unknown>
  const name = requiredString(record.name, 'name')
  const expect = record.expect
  if (expect !== 'success' && expect !== 'fail') {
    throw new Error(`${name} has an invalid expect`)
  }
  if (typeof record.fields !== 'object' || record.fields === null || Array.isArray(record.fields)) {
    throw new Error(`${name} is missing fields`)
  }
  return {
    name,
    file: requiredString(record.file, 'file'),
    fields: record.fields as Record<string, unknown>,
    expect,
  }
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`Example case ${label} is required`)
  return value
}
