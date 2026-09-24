import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { postgresCode } from './pgError.js'

describe('postgresCode', () => {
  it('reads a string code from an error', () => {
    assert.equal(postgresCode({ code: '23505' }), '23505')
  })

  it('ignores values that are not database errors', () => {
    assert.equal(postgresCode(new Error('down')), null)
    assert.equal(postgresCode({ code: 23505 }), null)
    assert.equal(postgresCode(null), null)
  })
})
