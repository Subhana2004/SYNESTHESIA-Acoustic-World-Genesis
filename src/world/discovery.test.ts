import { describe, expect, it } from 'vitest'
import { createTerrain } from './terrain'
import { discoverWorldLandmarks } from './discovery'

describe('world discovery landmarks', () => {
  it('creates deterministic landmarks for the same terrain seed', () => {
    const first = discoverWorldLandmarks(createTerrain(41, 48, 2026))
    const second = discoverWorldLandmarks(createTerrain(41, 48, 2026))
    expect(first).toEqual(second)
  })

  it('creates a basin and summit inside world bounds', () => {
    const terrain = createTerrain()
    const landmarks = discoverWorldLandmarks(terrain)
    expect(landmarks.some(item => item.kind === 'basin')).toBe(true)
    expect(landmarks.some(item => item.kind === 'summit')).toBe(true)
    expect(landmarks.every(item => Number.isFinite(item.elevation) &&
      Math.abs(item.x) <= terrain.worldWidth / 2 &&
      Math.abs(item.z) <= terrain.worldWidth / 2)).toBe(true)
  })

  it('adds an acoustic landmark for a sufficiently separated sound trace', () => {
    const terrain = createTerrain()
    const landmarks = discoverWorldLandmarks(terrain, [
      { x: 0, y: 1.2, z: 18, kind: 'accent', strength: 0.95 },
    ])
    expect(landmarks.some(item => item.kind === 'echo' && item.traceKind === 'accent')).toBe(true)
  })

  it('does not duplicate a sound landmark close to an existing place', () => {
    const terrain = createTerrain()
    const landmarks = discoverWorldLandmarks(terrain, [
      { x: 0, y: -0.5, z: 0, kind: 'low', strength: 0.8 },
    ])
    expect(landmarks.filter(item => item.kind === 'echo')).toHaveLength(0)
  })
})
