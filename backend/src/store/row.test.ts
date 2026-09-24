import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { asRecord, requiredString, timestamp } from './row.js'

describe('row mapping', () => {
  it('rejects a row that is not an object', () => {
    assert.throws(() => asRecord(null, 'brief row'), /Invalid brief row/)
  })

  it('reads a Date or a string timestamp', () => {
    const date = new Date('2026-09-24T00:00:00.000Z')
    assert.equal(timestamp(date), '2026-09-24T00:00:00.000Z')
    assert.equal(timestamp('2026-09-24'), '2026-09-24')
    assert.equal(timestamp(1), null)
  })

  it('requires text fields to be strings', () => {
    assert.equal(requiredString('title', 'brief row'), 'title')
    assert.throws(() => requiredString(1, 'brief row'), /Invalid brief row/)
  })
})
