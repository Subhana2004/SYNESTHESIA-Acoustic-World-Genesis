import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { deleteWorld, listSavedWorlds, loadWorld, renameWorld, restoreWorld, saveWorld, snapshotWorld, parseWorldFile, type RecordedSculpt, type SavedWorldSummary } from './persistence'
import { replayTerrain, type TerrainState } from './terrain'

type Props = { terrain: TerrainState; history: MutableRefObject<RecordedSculpt[]>; discoveredIds: string[]; events: import('./worldEvents').WorldEvent[]; stop: () => void; onWorldChange: (count: number, discoveredIds?: string[], events?: import('./worldEvents').WorldEvent[]) => void }

function WorldPreview({ values }: { values: number[] }) {
  const min = Math.min(...values)
  const range = Math.max(0.001, Math.max(...values) - min)
  const points = values.map((value, index) => {
    const x = values.length > 1 ? (index / (values.length - 1)) * 180 : 90
    const y = 39 - ((value - min) / range) * 31
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return <svg className="world-preview" viewBox="0 0 180 46" role="img" aria-label="Terrain silhouette preview">
    <path d="M0 43 H180" />
    <polyline points={points} />
  </svg>
}

export function WorldMemory({ terrain, history, discoveredIds, events, stop, onWorldChange }: Props) {
  const [worlds, setWorlds] = useState<SavedWorldSummary[]>([])
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const importInput = useRef<HTMLInputElement>(null)
  const refresh = async () => { const items = await listSavedWorlds(); setWorlds(items) }
  const selectedWorld = worlds.find(world => world.id === selected)

  useEffect(() => { void refresh().catch(e => setMessage(e instanceof Error ? e.message : 'Could not read saved worlds.')) }, [])

  const save = async () => {
    stop(); setBusy(true); setMessage('')
    try {
      const record = snapshotWorld(terrain, 'World ' + new Date().toLocaleString(), history.current, discoveredIds, events)
      await saveWorld(record); await refresh(); setSelected(record.id); setRenameValue(record.name)
      setMessage('World saved in this browser.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save this world.') }
    finally { setBusy(false) }
  }

  const load = async (id = selected) => {
    if (!id) return
    stop(); setBusy(true); setMessage('')
    try {
      const record = await loadWorld(id)
      if (!record) throw new Error('Saved world not found.')
      restoreWorld(terrain, record)
      history.current = record.history.map(item => ({ features: { ...item.features }, deltaSeconds: item.deltaSeconds }))
      onWorldChange(record.history.length, record.discoveredLandmarkIds ?? [], record.events ?? []); setMessage(`“${record.name}” restored with ${record.discoveredLandmarkIds?.length ?? 0} discoveries.`)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not load this world.') }
    finally { setBusy(false) }
  }

  const replay = () => {
    stop()
    const replayHistory = history.current.map(item => ({ features: { ...item.features }, deltaSeconds: item.deltaSeconds }))
    const replayed = replayTerrain(terrain.seed, terrain.size, terrain.worldWidth, replayHistory)
    terrain.heights.set(replayed.heights)
    terrain.frontX = replayed.frontX
    onWorldChange(replayHistory.length, discoveredIds, events)
    setMessage('Creation replayed from the recorded acoustic feature stream.')
  }

  const exportSelected = async () => {
    if (!selected) return
    setBusy(true); setMessage('')
    try {
      const record = await loadWorld(selected)
      if (!record) throw new Error('Saved world not found.')
      const file = new Blob([JSON.stringify({ format: 'SYNESTHESIA_WORLD', formatVersion: 1, world: record }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `synesthesia-${record.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'world'}.synworld.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('World export prepared as a .synworld.json file.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not export this world.') }
    finally { setBusy(false) }
  }

  const importSelectedFile = async (file?: File) => {
    if (!file) return
    setBusy(true); setMessage('')
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('World files must be smaller than 20 MB.')
      const parsed: unknown = JSON.parse(await file.text())
      const record = parseWorldFile(parsed)
      await saveWorld(record)
      await refresh()
      setSelected(record.id)
      setRenameValue(record.name)
      setConfirmDelete(false)
      setMessage(`“${record.name}” imported into this browser.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not import this file.')
    } finally {
      setBusy(false)
      if (importInput.current) importInput.current.value = ''
    }
  }

  const rename = async () => {
    if (!selected) return
    setBusy(true); setMessage('')
    try {
      await renameWorld(selected, renameValue)
      await refresh()
      setMessage('World renamed.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not rename this world.') }
    finally { setBusy(false) }
  }

  const remove = async () => {
    if (!selected) return
    setBusy(true); setMessage('')
    try {
      await deleteWorld(selected)
      setWorlds(current => current.filter(world => world.id !== selected))
      setSelected(''); setRenameValue(''); setConfirmDelete(false)
      setMessage('Saved world deleted from this browser.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not delete this world.') }
    finally { setBusy(false) }
  }

  return <section className="memory-tools" aria-label="World memory">
    <div className="memory-heading">
      <div className="eyebrow">WORLD MEMORY · LOCAL TO THIS BROWSER</div>
      <span>{worlds.length} {worlds.length === 1 ? 'WORLD' : 'WORLDS'}</span>
    </div>
    <div className="memory-actions">
      <button className="secondary" onClick={save} disabled={busy}>SAVE CURRENT WORLD</button>
      <button className="secondary" onClick={replay} disabled={busy || history.current.length === 0}>REPLAY CREATION</button>
      <button className="secondary" onClick={() => importInput.current?.click()} disabled={busy}>IMPORT WORLD</button>
      <input ref={importInput} className="world-file-input" type="file" accept=".json,.synworld.json,application/json" aria-label="Choose a SYNESTHESIA world file" onChange={e => void importSelectedFile(e.target.files?.[0])} />
    </div>

    {worlds.length === 0 ? <p className="memory-empty">Your gallery is quiet for now. Generate a landscape and save it to begin your collection.</p> :
      <div className="world-gallery">
        {worlds.map(world => <button type="button" className={`world-card ${selected === world.id ? 'selected' : ''}`} key={world.id}
          onClick={() => { setSelected(world.id); setRenameValue(world.name); setConfirmDelete(false) }} aria-pressed={selected === world.id}>
          <WorldPreview values={world.preview} />
          <span className="world-card-name">{world.name}</span>
          <span className="world-card-meta">{new Date(world.savedAt).toLocaleDateString()} · SEED {world.seed}</span>
          <span className="world-card-meta">{world.sculptCount.toLocaleString()} SCULPT SAMPLES</span>
          <span className="world-card-meta">{world.eventCount} PHENOMENA · {world.discoveredBiomeCount} BIOMES FOUND</span>
          <span className="world-card-meta">{world.discoveredCount} / {world.landmarkCount} LANDMARKS · {world.explorationPercent}% EXPLORED</span>
          <span className="world-exploration-track" role="progressbar" aria-label={world.name + ' exploration'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={world.explorationPercent}><span style={{ width: world.explorationPercent + '%' }} /></span>
        </button>)}
      </div>
    }

    {selectedWorld && <div className="world-management">
      <div className="memory-actions world-manage-row">
        <input aria-label="World name" maxLength={64} value={renameValue} onChange={e => setRenameValue(e.target.value)} />
        <button className="secondary" onClick={rename} disabled={busy || !renameValue.trim() || renameValue.trim() === selectedWorld.name}>RENAME</button>
        <button className="secondary danger-action" onClick={() => setConfirmDelete(value => !value)} disabled={busy}>DELETE</button>
        <button className="secondary load-action" onClick={() => void load()} disabled={busy}>LOAD WORLD</button>
        <button className="secondary export-action" onClick={() => void exportSelected()} disabled={busy}>EXPORT FILE</button>
      </div>
      {confirmDelete && <div className="delete-confirm" role="group" aria-label="Confirm world deletion">
        <span>Delete “{selectedWorld.name}” permanently from this browser?</span>
        <button className="secondary danger-action" onClick={() => void remove()} disabled={busy}>YES, DELETE</button>
        <button className="secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>CANCEL</button>
      </div>}
    </div>}

    {message && <p className="memory-message" role="status">{message}</p>}
    <p className="memory-privacy">Saved locally in this browser. Microphone recordings are never stored.</p>
  </section>
}
