import type { AcousticFeatures } from '../audio/features'
import { mapAcoustics } from '../audio/features'

export interface TerrainState {
  readonly size: number
  readonly worldWidth: number
  readonly heights: Float32Array
  frontX: number
  seed: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const gaussian = (x: number, z: number, cx: number, cz: number, sx: number, sz: number) =>
  Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((z - cz) ** 2) / (2 * sz * sz)))

export function createTerrain(size = 81, worldWidth = 48, seed = 2026): TerrainState {
  const heights = new Float32Array(size * size)
  let state = seed >>> 0
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296 }

  // Seeded landmark placement keeps the broad geography repeatable.
  const landmarks = Array.from({ length: 7 }, (_, index) => ({
    x: -0.72 + index * 0.24 + (random() - 0.5) * 0.12,
    z: (random() - 0.5) * 1.25,
    height: 0.48 + random() * 0.42,
    spread: 0.12 + random() * 0.09,
  }))

  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / (size - 1)) * 2 - 1
      const nz = (z / (size - 1)) * 2 - 1
      const rolling = Math.sin(nx * 5.2 + Math.sin(nz * 3.1)) * Math.cos(nz * 4.4) * 0.24
      const ridgeLine = Math.pow(Math.max(0, Math.sin(nx * 7.4 + Math.sin(nz * 4.8) * 0.8)), 3) * 0.34
      const basin = -gaussian(nx, nz, 0.12, -0.08, 0.38, 0.28) * 0.34
      const peaks = landmarks.reduce((sum, p) =>
        sum + gaussian(nx, nz, p.x, p.z, p.spread, p.spread * 1.35) * p.height, 0)
      const detail = (random() - 0.5) * 0.035
      heights[z * size + x] = clamp(rolling + ridgeLine + peaks + basin + detail - 0.05, -1.2, 2.8)
    }
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
    t.heights[index] = clamp(t.heights[index] + change, -1.2, 6.5)
  }
  t.frontX = Math.min(t.worldWidth * 0.42, t.frontX + dt * (1.6 + c.intensity * 1.8))
}

export function terrainChecksum(t: TerrainState): number {
  let hash = 2166136261
  for (let i = 0; i < t.heights.length; i++) { hash ^= Math.round(t.heights[i] * 10000); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}
