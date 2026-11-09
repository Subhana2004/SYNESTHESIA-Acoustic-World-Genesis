import { describe, expect, it } from 'vitest'
import { parseWorldFile } from './persistence'

const world = {
  id: 'original-id',
  name: 'A quiet valley',
  savedAt: 100,
  version: 1,
  size: 2,
  worldWidth: 10,
  seed: 42,
  frontX: 3,
  heights: [0, 1, 2, 3],
  history: [{
    features: {
      timestamp: 10,
      rms: 0.1,
      pitchHz: 220,
      pitchConfidence: 0.9,
      spectralCentroidHz: 800,
      onsetStrength: 0.2,
      isSilent: false,
    },
    deltaSeconds: 0.09,
  }],
}

const file = (value: unknown) => ({ format: 'SYNESTHESIA_WORLD', formatVersion: 1, world: value })

describe('portable world files', () => {
  it('imports a valid world with a fresh local identity', () => {
    const imported = parseWorldFile(file(world))
    expect(imported.name).toBe('A quiet valley')
    expect(imported.seed).toBe(42)
    expect(imported.heights).toEqual(world.heights)
    expect(imported.history).toHaveLength(1)
    expect(imported.id).not.toBe('original-id')
    expect(imported.savedAt).toBeGreaterThan(100)
  })

  it('rejects an unknown file format', () => {
    expect(() => parseWorldFile({ world })).toThrow('Unsupported world file')
  })

  it('rejects an invalid heightfield', () => {
    expect(() => parseWorldFile(file({ ...world, heights: [0, 1] }))).toThrow('invalid terrain data')
  })

  it('rejects invalid acoustic history', () => {
    const invalid = { ...world, history: [{ features: { ...world.history[0].features, rms: Number.NaN }, deltaSeconds: 0.1 }] }
    expect(() => parseWorldFile(file(invalid))).toThrow('invalid acoustic history')
  })

  it('rejects oversized histories', () => {
    expect(() => parseWorldFile(file({ ...world, history: Array(20001).fill(world.history[0]) }))).toThrow('invalid terrain data')
  })
})
