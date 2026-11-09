import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine } from './audio/AudioEngine'
import { mapAtmosphere, type AcousticFeatures } from './audio/features'
import { createTerrain, sculptTerrain } from './world/terrain'
import { WorldScene } from './world/WorldScene'
import { WorldMemory } from './world/WorldMemory'
import type { RecordedSculpt } from './world/persistence'
import type { SoundPattern } from './world/soundPatterns'
import { deriveSoundTraces, type SoundTrace } from './world/soundTraces'
import { WorldMap } from './world/WorldMap'
import type { TerrainInspection } from './world/WorldScene'
import { discoverWorldLandmarks, type WorldLandmark } from './world/discovery'

const terrain = createTerrain()

export default function App() {
  const viewport = useRef<HTMLDivElement>(null)
  const scene = useRef<WorldScene | null>(null)
  const audio = useRef<AudioEngine | null>(null)
  const lastUpdate = useRef(0)
  const history = useRef<RecordedSculpt[]>([])
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const [listening, setListening] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [features, setFeatures] = useState<AcousticFeatures | null>(null)
  const [updates, setUpdates] = useState(0)
  const [soundPattern, setSoundPattern] = useState<SoundPattern>('ambient')
  const [inspection, setInspection] = useState<TerrainInspection | null>(null)
  const [nearbyTrace, setNearbyTrace] = useState<SoundTrace | null>(null)
  const [landmarks, setLandmarks] = useState<WorldLandmark[]>(() => discoverWorldLandmarks(terrain))
  const [discoveredIds, setDiscoveredIds] = useState<string[]>([])
  const generationProgress = Math.min(100, Math.max(0, ((terrain.frontX + terrain.worldWidth * 0.42) / (terrain.worldWidth * 0.84)) * 100))

  useEffect(() => {
    if (!viewport.current) return
    const instance = new WorldScene(viewport.current, terrain)
    scene.current = instance
    instance.updateDiscoveries(landmarks)
    return () => { instance.dispose(); scene.current = null }
  }, [])

  const stop = useCallback(() => {
    audio.current?.stop()
    audio.current = null
    setListening(false)
    setStarting(false)
  }, [])
  useEffect(() => () => { audio.current?.stop() }, [])

  const start = async () => {
    if (starting || listening) return
    setStarting(true)
    setError('')
    const engine = new AudioEngine()
    audio.current = engine
    try {
      await engine.start((f) => {
        setFeatures(f)
        const activePattern = scene.current?.updateAcousticAtmosphere(mapAtmosphere(f), terrain.frontX)
        if (activePattern) setSoundPattern(current => current === activePattern ? current : activePattern)
        const now = performance.now()
        if (now - lastUpdate.current < 90) return
        const dt = lastUpdate.current === 0 ? 0.09 : (now - lastUpdate.current) / 1000
        lastUpdate.current = now
        const before = terrain.frontX
        sculptTerrain(terrain, f, dt)
        if (terrain.frontX !== before) {
          history.current.push({ features: { ...f }, deltaSeconds: dt })
          if (history.current.length > 20000) history.current.shift()
          scene.current?.updateTerrain()
          if (history.current.length % 10 === 1) {
            scene.current?.updateSoundTraces(history.current)
            const nextLandmarks = discoverWorldLandmarks(terrain, deriveSoundTraces(terrain, history.current))
            setLandmarks(nextLandmarks)
            scene.current?.updateDiscoveries(nextLandmarks)
          }
          scene.current?.updateAcousticAtmosphere(mapAtmosphere(f), terrain.frontX)
          setUpdates(v => v + 1)
        }
      })
      setListening(true)
    } catch (e) {
      engine.stop()
      audio.current = null
      setError(e instanceof Error ? e.message : 'Unable to start microphone input.')
    } finally {
      setStarting(false)
    }
  }

  const inspectLocation = (x: number, z: number) => {
    const result = scene.current?.inspectWorldPoint(x, z)
    if (!result) return
    setInspection(result)
    const traces = deriveSoundTraces(terrain, history.current)
    const nearest = traces.reduce<{ trace: SoundTrace; distance: number } | null>((best, trace) => {
      const distance = Math.hypot(trace.x - result.x, trace.z - result.z)
      return !best || distance < best.distance ? { trace, distance } : best
    }, null)
    setNearbyTrace(nearest && nearest.distance <= 3.5 ? nearest.trace : null)
    const nearestLandmark = landmarks.reduce<{ item: WorldLandmark; distance: number } | null>((best, item) => {
      const distance = Math.hypot(item.x - result.x, item.z - result.z)
      return !best || distance < best.distance ? { item, distance } : best
    }, null)
    if (nearestLandmark && nearestLandmark.distance <= 2.4) {
      setDiscoveredIds(current => current.includes(nearestLandmark.item.id) ? current : [...current, nearestLandmark.item.id])
    }
  }

  const discoverLandmark = (id: string) => {
    const landmark = landmarks.find(item => item.id === id)
    if (!landmark) return
    setDiscoveredIds(current => current.includes(id) ? current : [...current, id])
    inspectLocation(landmark.x, landmark.z)
  }

  const reset = () => {
    stop()
    const fresh = createTerrain()
    terrain.heights.set(fresh.heights)
    terrain.frontX = fresh.frontX
    lastUpdate.current = 0
    scene.current?.updateTerrain()
    scene.current?.clearInspection()
    scene.current?.updateSoundTraces([])
    scene.current?.updateAcousticAtmosphere({ spectralBlend: 0.35, onsetPulse: 0, energy: 0, pitchTone: 0.35 }, terrain.frontX)
    setUpdates(0)
    setFeatures(null)
    setSoundPattern('ambient')
    setInspection(null)
    setNearbyTrace(null)
    setDiscoveredIds([])
    const initialLandmarks = discoverWorldLandmarks(terrain)
    setLandmarks(initialLandmarks)
    scene.current?.updateDiscoveries(initialLandmarks)
    history.current = []
  }

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">S</span>SYNESTHESIA</a>
      <span className="top-note">ACOUSTIC WORLD GENESIS <i /> EXPERIMENT 001</span>
      <span className="local"><i /> LOCAL PROCESSING</span>
    </header>

    <section className="intro">
      <div className="eyebrow">A NEW MEDIUM FOR CREATION</div>
      <h1>Worlds born<br /><em>from sound.</em></h1>
      <p>Give sound a place to exist. Hum, breathe, and explore the landscape as it takes shape beneath your voice.</p>
    </section>

    <section className="world">
      <div className="world-head"><span>WORLD / 001</span><span className={listening ? 'live' : ''}><i /> {listening ? 'LISTENING' : 'WORLD AT REST'} · {soundPattern.toUpperCase()}</span></div>
      <div className="viewport" ref={viewport} onPointerDown={event => { pointerStart.current = { x: event.clientX, y: event.clientY } }} onPointerUp={event => { const startPoint = pointerStart.current; pointerStart.current = null; if (!startPoint || Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) > 7) return; const landmarkId = scene.current?.pickDiscoveryAt(event.clientX, event.clientY); if (landmarkId) { discoverLandmark(landmarkId); return } const result = scene.current?.inspectAt(event.clientX, event.clientY); if (result) inspectLocation(result.x, result.z) }}>
        <div className="hint">DRAG TO ORBIT · SCROLL TO EXPLORE</div>
        <div className="view-controls" aria-label="Camera controls" onPointerDown={event => event.stopPropagation()}><button className="view-reset" onClick={() => scene.current?.zoomBy(0.82)} aria-label="Zoom in">+</button><button className="view-reset" onClick={() => scene.current?.zoomBy(1.22)} aria-label="Zoom out">−</button><button className="view-reset" onClick={() => scene.current?.resetCamera()} aria-label="Reset camera view">RESET</button></div>
        <div className="coords">X {terrain.frontX.toFixed(1)} · SEED {terrain.seed}</div>
      </div>
      <div className="world-foot"><span>AN EXPLORABLE RECORD OF YOUR SOUND</span><span>{String(updates).padStart(4, '0')} SCULPT UPDATES</span></div><div className="generation-track" role="progressbar" aria-label="World generation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(generationProgress)}><div className="generation-fill" style={{ width: generationProgress + '%' }} /></div><div className="generation-caption"><span>GENERATION FRONT</span><span>{Math.round(generationProgress)}% EXPLORED</span></div>
    </section>
    <div className="exploration-layout">
      <WorldMap terrain={terrain} revision={updates} selected={inspection} onSelect={inspectLocation} landmarks={landmarks} discoveredIds={discoveredIds} />
      <section className="inspection-panel" aria-live="polite">
        <div className="eyebrow">FIELD NOTES</div>
        {inspection ? <><h3>{inspection.biome.toUpperCase()} REGION</h3><p>Elevation <strong>{inspection.elevation.toFixed(2)}</strong></p><p>World position <strong>{inspection.x.toFixed(1)}, {inspection.z.toFixed(1)}</strong></p>{nearbyTrace ? <div className="landmark-note"><span>NEARBY SOUND LANDMARK</span><strong>{nearbyTrace.kind.toUpperCase()} SIGNATURE</strong><small>Intensity {Math.round(nearbyTrace.strength * 100)}% · derived from your acoustic history</small></div> : <p className="inspection-muted">No recorded sound landmark nearby. Create more sound to leave traces in this region.</p>}</> : <><h3>Choose a place to explore.</h3><p>Click the terrain or select a region on the minimap to inspect its biome, elevation and nearby sound traces.</p></>}
      </section>
    </div>


    <section className="discovery-journal">
      <div className="journal-heading"><div><div className="eyebrow">WORLD DISCOVERY</div><h2>Field journal</h2></div><span>{discoveredIds.length} / {landmarks.length} FOUND · {landmarks.length ? Math.round(discoveredIds.filter(id => landmarks.some(item => item.id === id)).length / landmarks.length * 100) : 0}% EXPLORED</span></div>
      <div className="journal-grid">{landmarks.map(item => {
        const found = discoveredIds.includes(item.id)
        return <article className={found ? 'journal-entry found' : 'journal-entry unfound'} key={item.id}>
          {found ? <>
            <span className="journal-kind">{item.biome.toUpperCase()} · {item.kind.toUpperCase()}</span>
            <h3>{item.name}</h3><p>{item.description}</p>
            <small>ELEVATION {item.elevation.toFixed(2)} · {item.x.toFixed(1)}, {item.z.toFixed(1)}</small>
          </> : <>
            <span className="journal-kind">UNDISCOVERED</span>
            <h3>Uncharted signal</h3>
            <p>Find the glowing landmark in the world or select its marker on the minimap.</p>
            <small>UNKNOWN COORDINATES</small>
          </>}
        </article>
      })}</div>
    </section>

    <section className="panel">
      <div className="instrument">
        <div className="eyebrow">THE ACOUSTIC INSTRUMENT</div>
        <h2>{listening ? 'Your world is listening.' : 'Make the first sound.'}</h2>
        <p>{listening ? 'Change your pitch, volume, and rhythm. The terrain will keep what you create.' : 'Microphone access starts only when you choose. No speech recognition, no uploads.'}</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          {!listening ? <button className="primary" onClick={start} disabled={starting}><i /> {starting ? 'Requesting microphone…' : 'Begin listening'}</button> : <button className="primary pause" onClick={stop}><i /> Pause input</button>}
          <button className="secondary" onClick={reset}>Reset world</button>
        </div>
      </div>
      <WorldMemory terrain={terrain} history={history} discoveredIds={discoveredIds} stop={stop} onWorldChange={(count, restoredDiscoveredIds = []) => {
        scene.current?.updateTerrain()
        scene.current?.clearInspection()
        scene.current?.updateSoundTraces(history.current)
        scene.current?.updateAcousticAtmosphere({ spectralBlend: 0.35, onsetPulse: 0, energy: 0, pitchTone: 0.35 }, terrain.frontX)
        scene.current?.resetCamera()
        setUpdates(count)
        setFeatures(null)
        setSoundPattern('ambient')
        setInspection(null)
        setNearbyTrace(null)
        setDiscoveredIds(restoredDiscoveredIds)
        const restoredLandmarks = discoverWorldLandmarks(terrain, deriveSoundTraces(terrain, history.current))
        setLandmarks(restoredLandmarks)
        scene.current?.updateDiscoveries(restoredLandmarks)
      }} />
      <div className="readouts" aria-live="polite">
        <div><span>FUNDAMENTAL / HZ</span><strong>{features?.pitchHz ? Math.round(features.pitchHz) : '—'}</strong><small>{features?.pitchHz ? 'CONFIDENCE ' + Math.round(features.pitchConfidence * 100) + '%' : 'NO STABLE PITCH'}</small></div>
        <div><span>RMS ENERGY</span><strong>{features ? features.rms.toFixed(3) : '0.000'}</strong><small>{features?.isSilent ? 'SILENCE' : features ? 'SIGNAL DETECTED' : 'AWAITING INPUT'}</small></div>
        <div><span>SPECTRAL CENTROID</span><strong>{features ? Math.round(features.spectralCentroidHz).toLocaleString() : '—'}</strong><small>HZ · SPECTRAL BRIGHTNESS</small></div>
      </div>
    </section>
    <footer><span>DESIGNED TO BE PERFORMED, NOT PROMPTED.</span><span>NO AUDIO IS STORED OR TRANSMITTED.</span></footer>
  </main>
}
