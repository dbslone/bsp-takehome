import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { completionText } from './openrouter.js'

describe('completionText', () => {
  it('reads message content', () => {
    const body = { choices: [{ message: { content: '{"ok":true}' } }] }
    assert.equal(completionText(body), '{"ok":true}')
  })

  it('joins content parts', () => {
    const body = {
      choices: [{ message: { content: [{ type: 'text', text: '{"a":' }, { text: '1}' }] } }],
    }
    assert.equal(completionText(body), '{"a":1}')
  })

  it('uses reasoning when content is empty', () => {
    const body = {
      choices: [{ message: { content: null, reasoning: 'thinking\n{"themes":{}}' } }],
    }
    assert.equal(completionText(body), 'thinking\n{"themes":{}}')
  })

  it('returns nothing when the message is empty', () => {
    assert.equal(completionText({ choices: [{ message: { content: '  ' } }] }), undefined)
  })
})
