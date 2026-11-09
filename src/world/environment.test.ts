import { describe, expect, it } from 'vitest'
import { createTerrain } from './terrain'
import { generateEnvironmentLayout } from './environment'
import { getBiomeWeights } from './biomes'

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

  it('populates all three biomes with species suited to their elevation', () => {
    const terrain = createTerrain()
    const flora = generateEnvironmentLayout(terrain).flora
    const counts = { mire: 0, forest: 0, highlands: 0 }
    for (const plant of flora) {
      counts[plant.biome] += 1
      const weights = getBiomeWeights(plant.y)
      const expected = weights.mire >= weights.forest && weights.mire >= weights.highlands
        ? 'mire'
        : weights.forest >= weights.highlands ? 'forest' : 'highlands'
      expect(plant.biome).toBe(expected)
    }
    expect(counts.mire).toBeGreaterThan(0)
    expect(counts.forest).toBeGreaterThan(0)
    expect(counts.highlands).toBeGreaterThan(0)
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
