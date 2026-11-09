import { useEffect, useState, type MutableRefObject } from 'react'
import { listSavedWorlds, loadWorld, restoreWorld, saveWorld, snapshotWorld } from './persistence'
import { replayTerrain, type TerrainState } from './terrain'
import type { RecordedSculpt } from './persistence'

type SavedWorldSummary = { id: string; name: string; savedAt: number; seed: number }
type Props = { terrain: TerrainState; history: MutableRefObject<RecordedSculpt[]>; stop: () => void; onWorldChange: (count: number) => void }

export function WorldMemory({ terrain, history, stop, onWorldChange }: Props) {
  const [worlds, setWorlds] = useState<SavedWorldSummary[]>([])
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const refresh = async () => { const items = await listSavedWorlds(); setWorlds(items) }
  useEffect(() => { void refresh().catch(e => setMessage(e instanceof Error ? e.message : 'Could not read saved worlds.')) }, [])
  const save = async () => {
    stop(); setBusy(true); setMessage('')
    try {
      const record = snapshotWorld(terrain, 'World ' + new Date().toLocaleString(), history.current)
      await saveWorld(record); await refresh(); setSelected(record.id); setMessage('World saved in this browser.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save this world.') }
    finally { setBusy(false) }
  }
  const load = async () => {
    if (!selected) return
    stop(); setBusy(true); setMessage('')
    try {
      const record = await loadWorld(selected)
      if (!record) throw new Error('Saved world not found.')
      restoreWorld(terrain, record)
      history.current = record.history.map(item => ({ features: { ...item.features }, deltaSeconds: item.deltaSeconds }))
      onWorldChange(record.history.length); setMessage('World restored.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not load this world.') }
    finally { setBusy(false) }
  }
  const replay = () => {
    stop()
    const events = history.current.map(item => ({ features: { ...item.features }, deltaSeconds: item.deltaSeconds }))
    const replayed = replayTerrain(terrain.seed, terrain.size, terrain.worldWidth, events)
    terrain.heights.set(replayed.heights)
    terrain.frontX = replayed.frontX
    onWorldChange(events.length)
    setMessage('Creation replayed from the recorded acoustic feature stream.')
  }
  return <div className="memory-tools">
    <div className="eyebrow">WORLD MEMORY · LOCAL TO THIS BROWSER</div>
    <div className="memory-actions">
      <button className="secondary" onClick={save} disabled={busy}>SAVE WORLD</button>
      <button className="secondary" onClick={replay} disabled={busy || history.current.length === 0}>REPLAY HISTORY</button>
    </div>
    <div className="memory-actions">
      <select aria-label="Saved worlds" value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="">Choose a saved world ({worlds.length})</option>
        {worlds.map(world => <option key={world.id} value={world.id}>{world.name} · seed {world.seed}</option>)}
      </select>
      <button className="secondary" onClick={load} disabled={busy || !selected}>LOAD</button>
    </div>
    {message && <p className="memory-message" role="status">{message}</p>}
  </div>
}
