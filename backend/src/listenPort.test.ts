import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { listenPort } from './listenPort.js'

describe('listenPort', () => {
  it('defaults when unset', () => {
    assert.equal(listenPort(undefined), 3001)
  })

  it('accepts a numeric port', () => {
    assert.equal(listenPort('4000'), 4000)
  })

  it('rejects a non-integer', () => {
    assert.throws(() => listenPort('abc'), /PORT must be an integer/)
  })

  it('rejects a port outside 1 to 65535', () => {
    assert.throws(() => listenPort('0'), /PORT must be an integer/)
    assert.throws(() => listenPort('70000'), /PORT must be an integer/)
  })
})
