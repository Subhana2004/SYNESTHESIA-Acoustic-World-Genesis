import { describe, expect, it } from 'vitest'
import { createTerrain } from './terrain'
import { deriveSoundTraces } from './soundTraces'
import type { AcousticFeatures } from '../audio/features'

const feature = (pitchHz: number | null, onsetStrength = 0): AcousticFeatures => ({
  timestamp: 0, rms: 0.15, pitchHz, pitchConfidence: pitchHz === null ? 0 : 0.98,
  spectralCentroidHz: 1000, onsetStrength, isSilent: false,
})
const event = (features: AcousticFeatures) => ({ features, deltaSeconds: 0.12 })

describe('spatial sound traces', () => {
  it('distinguishes low, high and sharp-accent signatures', () => {
    const history = [
      ...Array.from({ length: 14 }, () => event(feature(100))),
      ...Array.from({ length: 14 }, () => event(feature(750))),
      ...Array.from({ length: 14 }, () => event(feature(null, 0.9))),
    ]
    const traces = deriveSoundTraces(createTerrain(), history)
    expect(traces.map(trace => trace.kind)).toContain('low')
    expect(traces.map(trace => trace.kind)).toContain('high')
    expect(traces.map(trace => trace.kind)).toContain('accent')
  })

  it('is deterministic and bounded for long histories', () => {
    const terrain = createTerrain()
    const history = Array.from({ length: 2000 }, () => event(feature(320)))
    const a = deriveSoundTraces(terrain, history, 12)
    expect(a).toEqual(deriveSoundTraces(terrain, history, 12))
    expect(a.length).toBeLessThanOrEqual(12)
    expect(a.every(trace => Number.isFinite(trace.y))).toBe(true)
  })

  it('ignores silent events and unknown pitch without accents', () => {
    const history = [event({ ...feature(null), isSilent: true }), event(feature(null))]
    expect(deriveSoundTraces(createTerrain(), history)).toEqual([])
  })
})
