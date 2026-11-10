import { getBiomeWeights } from './biomes'
import type { TerrainState } from './terrain'
import type { SoundTrace } from './soundTraces'

export type LandmarkKind = 'basin' | 'summit' | 'grove' | 'echo'

export interface WorldLandmark {
  id: string
  kind: LandmarkKind
  name: string
  description: string
  x: number
  z: number
  elevation: number
  biome: 'mire' | 'forest' | 'highlands'
  traceKind?: SoundTrace['kind']
  strength?: number
}

function biomeAt(height: number): WorldLandmark['biome'] {
  const weights = getBiomeWeights(height)
  if (weights.highlands >= weights.forest && weights.highlands >= weights.mire) return 'highlands'
  return weights.forest >= weights.mire ? 'forest' : 'mire'
}

export function discoverWorldLandmarks(terrain: TerrainState, traces: readonly SoundTrace[] = []): WorldLandmark[] {
  const half = terrain.worldWidth / 2
  const step = terrain.worldWidth / (terrain.size - 1)
  let lowest = { col: 0, row: 0, height: Infinity }
  let highest = { col: 0, row: 0, height: -Infinity }
  let grove = { col: 0, row: 0, height: -Infinity, score: -Infinity }
  const margin = terrain.size > 6 ? 2 : 0

  for (let row = margin; row < terrain.size - margin; row += 1) {
    for (let col = margin; col < terrain.size - margin; col += 1) {
      const height = terrain.heights[row * terrain.size + col]
      if (height < lowest.height) lowest = { col, row, height }
      if (height > highest.height) highest = { col, row, height }
      const forest = getBiomeWeights(height).forest
      const score = forest * 2 + height * 0.08
      if (score > grove.score) grove = { col, row, height, score }
    }
  }

  const point = (cell: { col: number; row: number; height: number }) => ({
    x: cell.col * step - half,
    z: cell.row * step - half,
    elevation: cell.height,
    biome: biomeAt(cell.height),
  })
  const basin = point(lowest)
  const summit = point(highest)
  const forestGrove = point(grove)
  const landmarks: WorldLandmark[] = [
    { id: 'basin', kind: 'basin', name: 'The Quiet Basin', description: 'A lowland hollow where the terrain settles into a sheltered bowl.', ...basin },
    { id: 'summit', kind: 'summit', name: 'The Violet Crown', description: 'The highest reachable point in this world, shaped by its original seed.', ...summit },
  ]

  if (Math.hypot(forestGrove.x - basin.x, forestGrove.z - basin.z) > 3.2 &&
      Math.hypot(forestGrove.x - summit.x, forestGrove.z - summit.z) > 3.2) {
    landmarks.push({
      id: 'grove', kind: 'grove', name: 'The Echo Grove',
      description: 'A forest-rich pocket where luminous growth gathers across the slopes.',
      ...forestGrove,
    })
  }

  const strongestTrace = [...traces].sort((a, b) => b.strength - a.strength)[0]
  if (strongestTrace) {
    const separated = landmarks.every(item => Math.hypot(item.x - strongestTrace.x, item.z - strongestTrace.z) > 2.4)
    if (separated) {
      landmarks.push({
        id: 'echo', kind: 'echo', name: 'Resonance Shrine',
        description: 'A landmark left by a distinct acoustic event in your recorded sound history.',
        x: strongestTrace.x, z: strongestTrace.z, elevation: strongestTrace.y,
        biome: biomeAt(strongestTrace.y), traceKind: strongestTrace.kind, strength: strongestTrace.strength,
      })
    }
  }
  return landmarks
}
