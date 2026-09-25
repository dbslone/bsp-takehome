import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseModelResponse } from './run.js'

const analysis = {
  themes: {
    summary: 'A creative brief for PayPal.',
    primaryThemes: ['payments'],
    contentType: 'Creative brief',
    tone: ['professional'],
  },
  audience: {
    statedAudience: null,
    interpretation: 'Consumers and merchants.',
    segments: [{ title: 'Merchants', detail: 'Need reliable checkout.' }],
  },
  strengths: [{ title: 'Clear format', detail: 'The PDF is structured.' }],
  risks: [
    {
      title: 'Missing budget',
      detail: 'No spend is stated.',
      kind: 'missing',
      severity: 'high',
    },
  ],
  nextActions: [{ title: 'Ask for budget', detail: 'Confirm the range.', priority: 'now' }],
}

describe('parseModelResponse', () => {
  it('closes a truncated analysis and leaves extracted fields empty', () => {
    const raw = `${JSON.stringify(analysis).slice(0, -1)}\n${'\n'.repeat(20)}`
    const parsed = parseModelResponse(raw)
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(parsed.result.themes.summary, analysis.themes.summary)
    assert.deepEqual(parsed.extracted, {
      title: '',
      description: '',
      contentType: '',
      targetAudience: '',
      notes: '',
    })
  })

  it('keeps extracted text from a complete response', () => {
    const parsed = parseModelResponse(
      JSON.stringify({ ...analysis, extracted: { ...emptyExtracted(), title: 'PayPal' } }),
    )
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(parsed.extracted.title, 'PayPal')
  })
})

function emptyExtracted() {
  return { title: '', description: '', contentType: '', targetAudience: '', notes: '' }
}
