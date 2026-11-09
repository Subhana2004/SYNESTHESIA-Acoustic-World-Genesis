import { useMemo } from 'react'
import { getBiomeWeights } from './biomes'
import type { TerrainState } from './terrain'
import type { WorldLandmark } from './discovery'

type Props = {
  terrain: TerrainState
  revision: number
  selected: { x: number; z: number } | null
  onSelect: (x: number, z: number) => void
  landmarks: WorldLandmark[]
  discoveredIds: string[]
}

const biomeColor = (height: number): string => {
  const weights = getBiomeWeights(height)
  if (weights.highlands >= weights.forest && weights.highlands >= weights.mire) return '#b18be5'
  if (weights.forest >= weights.mire) return '#4caa91'
  return '#547d87'
}

export function WorldMap({ terrain, revision, selected, onSelect, landmarks, discoveredIds }: Props) {
  const cells = useMemo(() => {
    const count = 25
    const result: Array<{ x: number; z: number; color: string }> = []
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        const gx = Math.round(col / (count - 1) * (terrain.size - 1))
        const gz = Math.round(row / (count - 1) * (terrain.size - 1))
        result.push({
          x: col,
          z: row,
          color: biomeColor(terrain.heights[gz * terrain.size + gx]),
        })
      }
    }
    return result
  }, [terrain, revision])

  const front = ((terrain.frontX + terrain.worldWidth / 2) / terrain.worldWidth) * 100
  const selectedX = selected ? ((selected.x + terrain.worldWidth / 2) / terrain.worldWidth) * 100 : null
  const selectedZ = selected ? ((terrain.worldWidth / 2 - selected.z) / terrain.worldWidth) * 100 : null

  return <section className="world-map-panel" aria-label="World navigation map">
    <div className="map-heading">
      <div><div className="eyebrow">WORLD NAVIGATION</div><p>SELECT A REGION TO EXPLORE</p></div>
      <span>25 × 25</span>
    </div>
    <svg className="world-map" viewBox="0 0 100 100" role="button" tabIndex={0} aria-label="World map. Select a region to inspect its biome and elevation." onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(0, 0) } }} onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect()
      const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      const pz = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      onSelect((px - 0.5) * terrain.worldWidth, (0.5 - pz) * terrain.worldWidth)
    }}>
      {cells.map(cell => <rect key={cell.z * 25 + cell.x} x={cell.x * 4} y={cell.z * 4} width="4.1" height="4.1" fill={cell.color} />)}
      <line x1={front} y1="0" x2={front} y2="100" stroke="#f1d79c" strokeWidth="0.8" strokeDasharray="2 2" />
      {landmarks.map(item => { const x = ((item.x + terrain.worldWidth / 2) / terrain.worldWidth) * 100; const y = ((terrain.worldWidth / 2 - item.z) / terrain.worldWidth) * 100; const color = item.kind === 'basin' ? '#55d6c2' : item.kind === 'summit' ? '#b18be5' : item.kind === 'grove' ? '#7ed5a8' : '#f2c879'; const found = discoveredIds.includes(item.id); return <g key={item.id} pointerEvents="none"><circle cx={x} cy={y} r={found ? 2.4 : 1.8} fill={color} stroke={found ? '#fff' : '#111426'} strokeWidth={found ? 0.8 : 0.5} /><circle cx={x} cy={y} r={3.2} fill="none" stroke={color} strokeWidth="0.35" opacity="0.65" /></g> })}\n      {selectedX !== null && selectedZ !== null && <g pointerEvents="none"><circle cx={selectedX} cy={selectedZ} r="3.1" fill="none" stroke="#fff" strokeWidth="1.1" /><circle cx={selectedX} cy={selectedZ} r="1" fill="#fff" /></g>}
    </svg>
    <div className="map-legend"><span><i className="mire" /> MIRE</span><span><i className="forest" /> FOREST</span><span><i className="highlands" /> HIGHLANDS</span><span><i className="front" /> FRONT</span></div>
  </section>
}
