import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { beginBriefRun, cancelBrief, endBriefRun } from './inflight.js'

describe('in-flight analysis', () => {
  it('cancels only the brief that was deleted', () => {
    const kept = beginBriefRun('analysis-kept', 'brief-kept')
    const cancelled = beginBriefRun('analysis-cancelled', 'brief-cancelled')

    cancelBrief('brief-cancelled')

    assert.equal(cancelled.aborted, true)
    assert.equal(kept.aborted, false)
    endBriefRun('analysis-kept')
  })

  it('forgets a finished run so a later cancel does not abort it', () => {
    const signal = beginBriefRun('analysis-done', 'brief-done')
    endBriefRun('analysis-done')
    cancelBrief('brief-done')
    assert.equal(signal.aborted, false)
  })
})
