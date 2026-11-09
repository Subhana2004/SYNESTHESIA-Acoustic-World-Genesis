import { describe, expect, it } from 'vitest'
import { estimatePitch, mapAcoustics, type AcousticFeatures } from './features'

function sine(frequency: number, sampleRate = 48000, size = 2048): Float32Array {
  return Float32Array.from({ length: size }, (_, i) => Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5)
}
const sample: AcousticFeatures = { timestamp: 0, rms: 0.1, pitchHz: 220, pitchConfidence: 0.95, spectralCentroidHz: 500, onsetStrength: 0, isSilent: false }

describe('pitch estimation', () => {
  it('estimates a stable sine-wave pitch', () => {
    const result = estimatePitch(sine(220), 48000)
    expect(result.pitchHz).not.toBeNull()
    expect(result.pitchHz as number).toBeGreaterThan(205)
    expect(result.pitchHz as number).toBeLessThan(235)
  })
  it('does not invent pitch for silence', () => {
    expect(estimatePitch(new Float32Array(2048), 48000).pitchHz).toBeNull()
  })
})
describe('acoustic mapping', () => {
  it('keeps controls bounded', () => {
    const c = mapAcoustics(sample)
    expect(c.elevation).toBeGreaterThanOrEqual(0)
    expect(c.elevation).toBeLessThanOrEqual(1)
    expect(c.intensity).toBeGreaterThanOrEqual(0)
    expect(c.intensity).toBeLessThanOrEqual(1)
  })
  it('marks pitch unavailable when no estimate exists', () => {
    expect(mapAcoustics({ ...sample, pitchHz: null, pitchConfidence: 0 }).pitchAvailable).toBe(false)
  })
})
