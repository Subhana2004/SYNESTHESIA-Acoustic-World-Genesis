import type { TerrainState } from './terrain'
import { getBiomeWeights } from './biomes'

export type BiomeKind = 'mire' | 'forest' | 'highlands'

export interface FloraPlacement {
  biome: BiomeKind
  x: number
  y: number
  z: number
  scale: number
  hue: number
}

export interface FloatingRockPlacement {
  x: number
  y: number
  z: number
  scale: number
  rotation: number
}

export interface CloudPlacement {
  x: number
  y: number
  z: number
  scale: number
  phase: number
}

export interface EnvironmentLayout {
  flora: FloraPlacement[]
  floatingRocks: FloatingRockPlacement[]
  clouds: CloudPlacement[]
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

function sampleHeight(terrain: TerrainState, x: number, z: number): number {
  const col = Math.round((x / terrain.worldWidth + 0.5) * (terrain.size - 1))
  const row = Math.round((0.5 - z / terrain.worldWidth) * (terrain.size - 1))
  const safeCol = Math.max(0, Math.min(terrain.size - 1, col))
  const safeRow = Math.max(0, Math.min(terrain.size - 1, row))
  return terrain.heights[safeRow * terrain.size + safeCol]
}

/** Creates a repeatable set of decorative environment placements for a terrain seed. */
export function generateEnvironmentLayout(terrain: TerrainState): EnvironmentLayout {
  const random = createRandom(terrain.seed ^ 0x5f3759df)
  const half = terrain.worldWidth / 2
  const flora: FloraPlacement[] = []

  for (let attempt = 0; attempt < 1200 && flora.length < 88; attempt++) {
    const x = (random() * 2 - 1) * half * 0.94
    const z = (random() * 2 - 1) * half * 0.94
    // Keep the reflective basin open; crystal growths are allowed on high ridges.
    if (Math.hypot(x - terrain.worldWidth * 0.06, z - terrain.worldWidth * 0.04) < 5.1) continue
    const y = sampleHeight(terrain, x, z)
    if (y < 0.08 || y > 3.2) continue
    const weights = getBiomeWeights(y)
    const biome: BiomeKind = weights.mire >= weights.forest && weights.mire >= weights.highlands
      ? 'mire'
      : weights.forest >= weights.highlands ? 'forest' : 'highlands'
    flora.push({ biome, x, y, z, scale: 0.65 + random() * 0.75, hue: random() })
  }

  const floatingRocks: FloatingRockPlacement[] = []
  for (let i = 0; i < 9; i++) {
    const x = (random() * 2 - 1) * half * 0.82
    const z = (random() * 2 - 1) * half * 0.82
    const ground = sampleHeight(terrain, x, z)
    floatingRocks.push({
      x,
      y: Math.max(ground + 4.2, 4.8 + random() * 4.8),
      z,
      scale: 0.7 + random() * 1.15,
      rotation: random() * Math.PI * 2,
    })
  }

  const clouds: CloudPlacement[] = Array.from({ length: 7 }, () => ({
    x: (random() * 2 - 1) * half * 0.9,
    y: 8.5 + random() * 5.5,
    z: (random() * 2 - 1) * half * 0.9,
    scale: 1.5 + random() * 2.4,
    phase: random() * Math.PI * 2,
  }))

  return { flora, floatingRocks, clouds }
}
