import type { AcousticFeatures } from '../audio/features'
import type { TerrainState } from './terrain'
import { getBiomeWeights } from './biomes'

export type WorldEventKind = 'meteor-shower' | 'aurora' | 'echo-bloom' | 'mire-lights'
export type WorldEventBiome = 'mire' | 'forest' | 'highlands'

export interface WorldEvent {
  id: string
  kind: WorldEventKind
  biome: WorldEventBiome
  x: number
  z: number
  intensity: number
  timestamp: number
}

export function createWorldEvent(
  terrain: TerrainState,
  features: AcousticFeatures,
  pattern: 'ambient' | 'sustained' | 'accent' | 'rhythmic',
  sequence: number,
): WorldEvent | null {
  if (features.isSilent) return null
  const x = Math.max(-terrain.worldWidth / 2, Math.min(terrain.worldWidth / 2, terrain.frontX))
  const z = Math.sin((x + terrain.worldWidth / 2) * 0.11) * 2.5
  const gx = Math.max(0, Math.min(terrain.size - 1, Math.round(((x / terrain.worldWidth) + 0.5) * (terrain.size - 1))))
  const gz = Math.max(0, Math.min(terrain.size - 1, Math.round(((z / terrain.worldWidth) + 0.5) * (terrain.size - 1))))
  const elevation = terrain.heights[gz * terrain.size + gx] ?? 0
  const weights = getBiomeWeights(elevation)
  const biome: WorldEventBiome = weights.mire >= weights.forest && weights.mire >= weights.highlands
    ? 'mire' : weights.highlands >= weights.forest ? 'highlands' : 'forest'
  let kind: WorldEventKind | null = null
  if (pattern === 'accent' && features.onsetStrength >= 0.78) kind = 'meteor-shower'
  else if (pattern === 'sustained' && (features.pitchHz ?? 0) >= 420 && biome === 'highlands') kind = 'aurora'
  else if (pattern === 'rhythmic' && biome === 'forest') kind = 'echo-bloom'
  else if (pattern === 'rhythmic' && biome === 'mire') kind = 'mire-lights'
  if (!kind) return null
  return {
    id: `event-${terrain.seed}-${sequence}`,
    kind,
    biome,
    x,
    z,
    intensity: Math.max(0.25, Math.min(1, features.rms * 3.2 + features.onsetStrength * 0.45)),
    timestamp: features.timestamp,
  }
}

export function validateWorldEvents(value: unknown): WorldEvent[] {
  if (!Array.isArray(value)) return []
  const kinds: WorldEventKind[] = ['meteor-shower', 'aurora', 'echo-bloom', 'mire-lights']
  const biomes: WorldEventBiome[] = ['mire', 'forest', 'highlands']
  return value.slice(-100).filter((item): item is WorldEvent =>
    !!item && typeof item === 'object' &&
    typeof item.id === 'string' && item.id.length <= 100 &&
    kinds.includes(item.kind) && biomes.includes(item.biome) &&
    Number.isFinite(item.x) && Number.isFinite(item.z) &&
    Number.isFinite(item.intensity) && item.intensity >= 0 && item.intensity <= 1 &&
    Number.isFinite(item.timestamp),
  )
}
