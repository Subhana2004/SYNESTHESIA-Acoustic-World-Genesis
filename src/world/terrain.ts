import type { AcousticFeatures } from '../audio/features'
import { mapAcoustics } from '../audio/features'

export interface TerrainState {
  readonly size: number
  readonly worldWidth: number
  readonly heights: Float32Array
  frontX: number
  seed: number
}

export function createTerrain(size = 81, worldWidth = 48, seed = 2026): TerrainState {
  const heights = new Float32Array(size * size)
  let state = seed >>> 0
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296 }
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const broad = Math.sin(x * 0.075 + seed * 0.001) * Math.cos(z * 0.06) * 0.16
    heights[z * size + x] = broad + (random() - 0.5) * 0.025
  }
  return { size, worldWidth, heights, frontX: -worldWidth * 0.42, seed }
}

export function sculptTerrain(t: TerrainState, f: AcousticFeatures, deltaSeconds: number): void {
  if (f.isSilent) return
  const c = mapAcoustics(f)
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.12)
  const step = t.worldWidth / (t.size - 1)
  const radius = 3.1
  const cells = Math.ceil(radius / step)
  const x = t.frontX
  const z = Math.sin((x + t.worldWidth / 2) * 0.11) * 2.5
  const target = c.pitchAvailable ? 0.35 + c.elevation * 4.2 : 0.45
  const strength = (0.12 + c.intensity * 1.15) * dt * 12
  const gx0 = Math.round((x + t.worldWidth / 2) / step)
  const gz0 = Math.round((z + t.worldWidth / 2) / step)
  for (let dz = -cells; dz <= cells; dz++) for (let dx = -cells; dx <= cells; dx++) {
    const gx = gx0 + dx, gz = gz0 + dz
    if (gx < 0 || gz < 0 || gx >= t.size || gz >= t.size) continue
    const distance = Math.sqrt(dx * dx + dz * dz) * step
    if (distance > radius) continue
    const falloff = Math.exp(-(distance * distance) / (2 * 1.35 * 1.35))
    const index = gz * t.size + gx
    const ripple = Math.sin(gx * 0.42 + gz * 0.31) * c.roughness * 0.12
    const change = (target + ripple - t.heights[index]) * strength * falloff
    t.heights[index] = Math.max(-1.2, Math.min(6.5, t.heights[index] + change))
  }
  t.frontX = Math.min(t.worldWidth * 0.42, t.frontX + dt * (1.6 + c.intensity * 1.8))
}

export function terrainChecksum(t: TerrainState): number {
  let hash = 2166136261
  for (let i = 0; i < t.heights.length; i++) { hash ^= Math.round(t.heights[i] * 10000); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}
