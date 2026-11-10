import { describe, expect, it } from 'vitest'
import { parseWorldFile, snapshotWorld } from './persistence'
import { createTerrain } from './terrain'
import { createWorldEvent } from './worldEvents'

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
  it('preserves discovered landmark ids in portable world files', () => {
    const imported = parseWorldFile(file({ ...world, discoveredLandmarkIds: ['basin', 'grove', 'basin', 'unknown'] }))
    expect(imported.discoveredLandmarkIds).toEqual(['basin', 'grove'])
  })

  it('defaults older world files to an empty discovery record', () => {
    const imported = parseWorldFile(file(world))
    expect(imported.discoveredLandmarkIds).toEqual([])
  })

  it('includes discoveries in a new world snapshot', () => {
    const snapshot = snapshotWorld(createTerrain(), 'Test world', [], ['summit', 'echo', 'summit'])
    expect(snapshot.discoveredLandmarkIds).toEqual(['summit', 'echo'])
  })

  it('includes event history in saved world snapshots', () => {
    const event = createWorldEvent(createTerrain(), {
      timestamp: 1234, rms: 0.2, pitchHz: 520, pitchConfidence: 0.9,
      spectralCentroidHz: 1800, onsetStrength: 0.9, isSilent: false,
    }, 'accent', 5)!
    const snapshot = snapshotWorld(createTerrain(), 'Eventful world', [], [], [event])
    expect(snapshot.events).toEqual([event])
  })

  it('rejects corrupted acoustic feature values and world dimensions', () => {
    const invalidHistory = { ...world, history: [{ ...world.history[0], features: { ...world.history[0].features, rms: 2 } }] }
    expect(() => parseWorldFile(file(invalidHistory))).toThrow('invalid acoustic history')
    expect(() => parseWorldFile(file({ ...world, worldWidth: 2048 }))).toThrow('invalid terrain data')
  })

  it('drops event markers outside the imported world bounds', () => {
    const event = createWorldEvent(createTerrain(), {
      timestamp: 1234, rms: 0.2, pitchHz: 520, pitchConfidence: 0.9,
      spectralCentroidHz: 1800, onsetStrength: 0.9, isSilent: false,
    }, 'accent', 6)!
    event.x = 0
    event.z = 0
    const imported = parseWorldFile(file({ ...world, events: [event, { ...event, x: 100 }] }))
    expect(imported.events).toEqual([event])
  })

  it('preserves a validated event journal when importing a world', () => {
    const event = createWorldEvent(createTerrain(), {
      timestamp: 1234, rms: 0.2, pitchHz: 520, pitchConfidence: 0.9,
      spectralCentroidHz: 1800, onsetStrength: 0.9, isSilent: false,
    }, 'accent', 3)!
    event.x = 0
    event.z = 0
    const imported = parseWorldFile(file({ ...world, events: [event, { ...event, intensity: 4 }] }))
    expect(imported.events).toEqual([event])
  })

})
