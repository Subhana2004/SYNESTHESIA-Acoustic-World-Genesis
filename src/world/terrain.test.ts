import { describe, expect, it } from 'vitest'
import { createTerrain, sculptTerrain, terrainChecksum } from './terrain'
import type { AcousticFeatures } from '../audio/features'
const tone: AcousticFeatures = { timestamp: 1, rms: 0.18, pitchHz: 220, pitchConfidence: 0.95, spectralCentroidHz: 800, onsetStrength: 0.2, isSilent: false }

describe('terrain generation', () => {
  it('is repeatable for a fixed seed', () => expect(terrainChecksum(createTerrain())).toBe(terrainChecksum(createTerrain())))
  it('preserves terrain and generation front during silence', () => {
    const t = createTerrain(), before = terrainChecksum(t), front = t.frontX
    sculptTerrain(t, { ...tone, isSilent: true, rms: 0 }, 0.1)
    expect(terrainChecksum(t)).toBe(before)
    expect(t.frontX).toBe(front)
  })
  it('sculpts bounded geometry for an active tone', () => {
    const t = createTerrain(), before = terrainChecksum(t)
    for (let i = 0; i < 30; i++) sculptTerrain(t, tone, 0.09)
    expect(terrainChecksum(t)).not.toBe(before)
    expect(Math.min(...t.heights)).toBeGreaterThanOrEqual(-1.2)
    expect(Math.max(...t.heights)).toBeLessThanOrEqual(6.5)
  })
})
