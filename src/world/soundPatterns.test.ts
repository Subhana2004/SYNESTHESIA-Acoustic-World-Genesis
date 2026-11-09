import { describe, expect, it } from 'vitest'
import { updateSoundPattern, type SoundPatternState } from './soundPatterns'

const initial = (): SoundPatternState => ({ sustainedSince: null, onsetTimes: [], lastOnset: -Infinity })

describe('sound pattern classification', () => {
  it('recognises a sustained tone after a stable energy window', () => {
    const first = updateSoundPattern(initial(), 0.7, 0.1, 1000)
    const second = updateSoundPattern(first.state, 0.7, 0.1, 1900)
    expect(first.pattern).toBe('ambient')
    expect(second.pattern).toBe('sustained')
  })

  it('recognises a short onset as an accent', () => {
    const result = updateSoundPattern(initial(), 0.25, 0.9, 1000)
    expect(result.pattern).toBe('accent')
  })

  it('recognises evenly spaced onset pulses as rhythm', () => {
    let state = initial()
    let result = updateSoundPattern(state, 0.2, 0.9, 1000)
    state = result.state
    for (const time of [1500, 2000, 2500]) {
      result = updateSoundPattern(state, 0.2, 0.9, time)
      state = result.state
    }
    expect(result.pattern).toBe('rhythmic')
    expect(result.rhythmStrength).toBeGreaterThan(0.8)
  })

  it('does not classify irregular pulses as a stable rhythm', () => {
    let state = initial()
    let result = updateSoundPattern(state, 0.2, 0.9, 1000)
    state = result.state
    for (const time of [1250, 1900, 2200]) {
      result = updateSoundPattern(state, 0.2, 0.9, time)
      state = result.state
    }
    expect(result.pattern).not.toBe('rhythmic')
  })

  it('bounds stored onset history to five events', () => {
    let state = initial()
    let result = updateSoundPattern(state, 0.2, 0.9, 1000)
    state = result.state
    for (const time of [1300, 1600, 1900, 2200, 2500, 2800]) {
      result = updateSoundPattern(state, 0.2, 0.9, time)
      state = result.state
    }
    expect(result.state.onsetTimes).toHaveLength(5)
  })
})
