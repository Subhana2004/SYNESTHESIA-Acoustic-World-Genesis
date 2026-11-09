import { describe, expect, it } from 'vitest'
import { createTerrain } from './terrain'
import { createWorldEvent, validateWorldEvents } from './worldEvents'

const features = {
  timestamp: 1234, rms: 0.2, pitchHz: 520, pitchConfidence: 0.9,
  spectralCentroidHz: 1800, onsetStrength: 0.9, isSilent: false,
}

describe('sound-driven world events', () => {
  it('creates a deterministic meteor shower for a strong accent', () => {
    const terrain = createTerrain()
    const first = createWorldEvent(terrain, features, 'accent', 4)
    const second = createWorldEvent(terrain, features, 'accent', 4)
    expect(first).toEqual(second)
    expect(first?.kind).toBe('meteor-shower')
    expect(first?.id).toBe(`event-${terrain.seed}-4`)
  })

  it('does not create events from silence or ambient sound', () => {
    const terrain = createTerrain()
    expect(createWorldEvent(terrain, { ...features, isSilent: true }, 'accent', 1)).toBeNull()
    expect(createWorldEvent(terrain, features, 'ambient', 1)).toBeNull()
  })

  it('validates and bounds a restored event journal', () => {
    const event = createWorldEvent(createTerrain(), features, 'accent', 2)!
    expect(validateWorldEvents([event, { ...event, intensity: 8 }, null])).toEqual([event])
    expect(validateWorldEvents('not an event list')).toEqual([])
    expect(validateWorldEvents(Array.from({ length: 105 }, (_, index) => ({ ...event, id: String(index) })))).toHaveLength(100)
  })
})
