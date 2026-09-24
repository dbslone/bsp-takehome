import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ModelResponse, modelResponseJsonSchema } from './schema.js'

const validResponse = {
  themes: {
    summary: 'A short film brief.',
    primaryThemes: ['launch'],
    contentType: 'brand film',
    tone: ['warm'],
  },
  audience: {
    statedAudience: null,
    interpretation: 'People deciding whether to buy.',
    segments: [],
  },
  strengths: [],
  risks: [{ title: 'No budget', detail: 'Spend is unstated.', kind: 'missing', severity: 'high' }],
  nextActions: [{ title: 'Ask for budget', detail: 'Confirm the range.', priority: 'now' }],
  extracted: {
    title: '',
    description: '',
    contentType: '',
    targetAudience: '',
    notes: '',
  },
}

describe('ModelResponse', () => {
  it('accepts a complete analysis', () => {
    assert.equal(ModelResponse.safeParse(validResponse).success, true)
  })

  it('rejects a risk severity outside the enum', () => {
    const response = {
      ...validResponse,
      risks: [{ ...validResponse.risks[0], severity: 'urgent' }],
    }
    assert.equal(ModelResponse.safeParse(response).success, false)
  })

  it('publishes a JSON schema without the draft keyword', () => {
    assert.equal(typeof modelResponseJsonSchema, 'object')
    assert.equal('$schema' in modelResponseJsonSchema, false)
  })
})
