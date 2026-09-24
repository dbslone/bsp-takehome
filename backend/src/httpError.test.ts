import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { errorBody } from './httpError.js'

describe('errorBody', () => {
  it('maps invalid JSON to 400', () => {
    const err = new SyntaxError('Unexpected token')
    Object.assign(err, { status: 400, type: 'entity.parse.failed' })
    assert.deepEqual(errorBody(err), { status: 400, error: 'Invalid JSON' })
  })

  it('maps an oversized body to 413', () => {
    const err = new Error('too large')
    Object.assign(err, { status: 413, type: 'entity.too.large' })
    assert.deepEqual(errorBody(err), { status: 413, error: 'Request body is too large' })
  })

  it('hides unexpected failures', () => {
    assert.deepEqual(errorBody(new Error('database down')), {
      status: 500,
      error: 'Something went wrong',
    })
  })
})
