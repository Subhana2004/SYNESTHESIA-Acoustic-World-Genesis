export interface BiomeWeights {
  mire: number
  forest: number
  highlands: number
}

/** Smooth elevation bands keep biome transitions continuous rather than striped. */
export function getBiomeWeights(height: number): BiomeWeights {
  const smoothstep = (edge0: number, edge1: number, value: number) => {
    const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }
  const mire = 1 - smoothstep(-0.05, 0.55, height)
  const highlands = smoothstep(0.95, 1.45, height)
  const forest = Math.max(0, 1 - mire - highlands)
  const total = Math.max(0.0001, mire + forest + highlands)
  return { mire: mire / total, forest: forest / total, highlands: highlands / total }
}
