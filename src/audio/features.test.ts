import { describe, expect, it } from 'vitest'
import { estimatePitch, mapAcoustics, mapAtmosphere, type AcousticFeatures } from './features'

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
  it('tracks a lower 110 Hz tone', () => {
    const result = estimatePitch(sine(110), 48000)
    expect(result.pitchHz).not.toBeNull()
    expect(result.pitchHz as number).toBeGreaterThan(100)
    expect(result.pitchHz as number).toBeLessThan(120)
  })
  it('tracks a higher 440 Hz tone', () => {
    const result = estimatePitch(sine(440), 48000)
    expect(result.pitchHz).not.toBeNull()
    expect(result.pitchHz as number).toBeGreaterThan(425)
    expect(result.pitchHz as number).toBeLessThan(455)
  })

  it('tracks the lower and upper edges of the supported pitch band', () => {
    const low = estimatePitch(sine(65), 48000)
    const high = estimatePitch(sine(880), 48000)
    expect(low.pitchHz).not.toBeNull()
    expect(low.pitchHz as number).toBeGreaterThan(60)
    expect(low.pitchHz as number).toBeLessThan(70)
    expect(high.pitchHz).not.toBeNull()
    expect(high.pitchHz as number).toBeGreaterThan(850)
    expect(high.pitchHz as number).toBeLessThan(910)
  })
  it('does not invent pitch for silence', () => {
    expect(estimatePitch(new Float32Array(2048), 48000).pitchHz).toBeNull()
  })
  it('rejects deterministic broadband noise as an unstable pitch', () => {
    let state = 123456789
    const noise = Float32Array.from({ length: 2048 }, () => {
      state = (1664525 * state + 1013904223) >>> 0
      return (state / 4294967296 - 0.5) * 0.8
    })
    expect(estimatePitch(noise, 48000).pitchHz).toBeNull()
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
describe('atmosphere mapping', () => {
  it('maps higher spectral brightness toward violet', () => {
    const low = mapAtmosphere({ ...sample, spectralCentroidHz: 300 })
    const high = mapAtmosphere({ ...sample, spectralCentroidHz: 5000 })
    expect(low.spectralBlend).toBeLessThan(high.spectralBlend)
  })
  it('keeps onset pulses and energy bounded', () => {
    const controls = mapAtmosphere({ ...sample, onsetStrength: 1.8, rms: 0.5 })
    expect(controls.onsetPulse).toBe(1)
    expect(controls.energy).toBe(1)
    expect(controls.pitchTone).toBeGreaterThanOrEqual(0)
    expect(controls.pitchTone).toBeLessThanOrEqual(1)
  })
  it('maps higher stable pitches to a higher pitch tone', () => {
    const low = mapAtmosphere({ ...sample, pitchHz: 100 })
    const high = mapAtmosphere({ ...sample, pitchHz: 700 })
    expect(low.pitchTone).toBeLessThan(high.pitchTone)
  })
  it('does not emit an onset pulse during silence', () => {
    const controls = mapAtmosphere({ ...sample, isSilent: true, onsetStrength: 1 })
    expect(controls.onsetPulse).toBe(0)
    expect(controls.energy).toBe(0)
    expect(controls.pitchTone).toBe(0.35)
  })
})
