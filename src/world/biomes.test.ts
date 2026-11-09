import { describe, expect, it } from 'vitest'
import { getBiomeWeights } from './biomes'

describe('sound-responsive biome elevation bands', () => {
  it('assigns low terrain to the luminous mire', () => {
    expect(getBiomeWeights(-0.8).mire).toBeGreaterThan(0.99)
  })

  it('assigns middle elevations to the echo forest', () => {
    expect(getBiomeWeights(0.7).forest).toBeGreaterThan(0.8)
  })

  it('assigns high terrain to crystal highlands', () => {
    expect(getBiomeWeights(2.4).highlands).toBeGreaterThan(0.99)
  })

  it('keeps weights normalized and bounded across transitions', () => {
    for (let height = -1.2; height <= 6.5; height += 0.07) {
      const weights = getBiomeWeights(height)
      const values = Object.values(weights)
      expect(values.every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true)
      expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 8)
    }
  })
})
