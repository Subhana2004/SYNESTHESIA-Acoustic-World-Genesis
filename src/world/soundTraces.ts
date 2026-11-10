import type { AcousticFeatures } from '../audio/features'
import { mapAcoustics } from '../audio/features'
import type { TerrainState } from './terrain'

export type TraceKind = 'low' | 'high' | 'accent'
export interface SoundTrace { x: number; y: number; z: number; kind: TraceKind; strength: number }
export interface TraceEvent { features: AcousticFeatures; deltaSeconds: number }

/** Reconstruct the generation-front positions from existing replay events.
 * Traces are derived visuals; the saved world format does not change.
 */
export function deriveSoundTraces(terrain: TerrainState, history: readonly TraceEvent[], maxTraces = 80): SoundTrace[] {
  const traces: SoundTrace[] = []
  let front = -terrain.worldWidth * 0.42
  let lastTraceX = -Infinity
  const step = terrain.worldWidth / (terrain.size - 1)
  for (const event of history) {
    const f = event.features
    if (f.isSilent) continue
    const controls = mapAcoustics(f)
    const dt = Math.min(Math.max(event.deltaSeconds, 0), 0.12)
    front = Math.min(terrain.worldWidth * 0.42, front + dt * (1.6 + controls.intensity * 1.8))
    const accent = f.onsetStrength >= 0.42
    const pitched = controls.pitchAvailable
    if (!accent && !pitched) continue
    if (front - lastTraceX < (accent ? 0.55 : 1.4)) continue
    const kind: TraceKind = accent ? 'accent' : controls.elevation >= 0.52 ? 'high' : 'low'
    const x = front
    const z = Math.sin((x + terrain.worldWidth / 2) * 0.11) * 2.5
    const col = Math.max(0, Math.min(terrain.size - 1, Math.round(x / step + (terrain.size - 1) / 2)))
    const row = Math.max(0, Math.min(terrain.size - 1, Math.round(z / step + (terrain.size - 1) / 2)))
    const y = terrain.heights[row * terrain.size + col]
    traces.push({ x, y, z, kind, strength: Math.min(1, Math.max(0.25, accent ? f.onsetStrength : controls.intensity)) })
    lastTraceX = front
    if (traces.length >= maxTraces) break
  }
  return traces
}
