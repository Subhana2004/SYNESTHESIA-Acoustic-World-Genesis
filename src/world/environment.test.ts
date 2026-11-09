import { describe, expect, it } from 'vitest'
import { createTerrain } from './terrain'
import { generateEnvironmentLayout } from './environment'

describe('procedural environment layout', () => {
  it('is deterministic for a fixed terrain seed', () => {
    const terrain = createTerrain()
    expect(generateEnvironmentLayout(terrain)).toEqual(generateEnvironmentLayout(createTerrain()))
  })

  it('changes placements when the terrain seed changes', () => {
    const first = generateEnvironmentLayout(createTerrain(81, 48, 2026))
    const second = generateEnvironmentLayout(createTerrain(81, 48, 2027))
    expect(first.floatingRocks).not.toEqual(second.floatingRocks)
  })

  it('keeps every placement finite and inside the world footprint', () => {
    const terrain = createTerrain()
    const layout = generateEnvironmentLayout(terrain)
    for (const point of [...layout.flora, ...layout.floatingRocks, ...layout.clouds]) {
      expect(Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)).toBe(true)
      expect(Math.abs(point.x)).toBeLessThanOrEqual(terrain.worldWidth / 2)
      expect(Math.abs(point.z)).toBeLessThanOrEqual(terrain.worldWidth / 2)
    }
    expect(layout.flora.length).toBeGreaterThan(20)
    expect(layout.floatingRocks).toHaveLength(9)
    expect(layout.clouds).toHaveLength(7)
  })

  it('places vegetation on suitable ground and above the basin', () => {
    const terrain = createTerrain()
    const layout = generateEnvironmentLayout(terrain)
    for (const plant of layout.flora) {
      expect(plant.y).toBeGreaterThanOrEqual(0.08)
      expect(Math.hypot(plant.x - terrain.worldWidth * 0.06, plant.z - terrain.worldWidth * 0.04)).toBeGreaterThanOrEqual(5.1)
    }
  })
})
