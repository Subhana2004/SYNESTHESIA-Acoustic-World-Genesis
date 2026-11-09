import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine } from './audio/AudioEngine'
import type { AcousticFeatures } from './audio/features'
import { createTerrain, sculptTerrain } from './world/terrain'
import { WorldScene } from './world/WorldScene'

const terrain = createTerrain()

export default function App() {
  const viewport = useRef<HTMLDivElement>(null)
  const scene = useRef<WorldScene | null>(null)
  const audio = useRef<AudioEngine | null>(null)
  const lastUpdate = useRef(0)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const [features, setFeatures] = useState<AcousticFeatures | null>(null)
  const [updates, setUpdates] = useState(0)

  useEffect(() => {
    if (!viewport.current) return
    const instance = new WorldScene(viewport.current, terrain)
    scene.current = instance
    return () => { instance.dispose(); scene.current = null }
  }, [])

  const stop = useCallback(() => {
    audio.current?.stop()
    audio.current = null
    setListening(false)
  }, [])
  useEffect(() => () => audio.current?.stop(), [])

  const start = async () => {
    setError('')
    const engine = new AudioEngine()
    audio.current = engine
    try {
      await engine.start((f) => {
        setFeatures(f)
        const now = performance.now()
        if (now - lastUpdate.current < 90) return
        const dt = lastUpdate.current === 0 ? 0.09 : (now - lastUpdate.current) / 1000
        lastUpdate.current = now
        const before = terrain.frontX
        sculptTerrain(terrain, f, dt)
        if (terrain.frontX !== before) {
          scene.current?.updateTerrain()
          setUpdates(v => v + 1)
        }
      })
      setListening(true)
    } catch (e) {
      engine.stop()
      audio.current = null
      setError(e instanceof Error ? e.message : 'Unable to start microphone input.')
    }
  }

  const reset = () => {
    stop()
    const fresh = createTerrain()
    terrain.heights.set(fresh.heights)
    terrain.frontX = fresh.frontX
    lastUpdate.current = 0
    scene.current?.updateTerrain()
    setUpdates(0)
    setFeatures(null)
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
      <div className="world-head"><span>WORLD / 001</span><span className={listening ? 'live' : ''}><i /> {listening ? 'LISTENING' : 'WORLD AT REST'}</span></div>
      <div className="viewport" ref={viewport}>
        <div className="hint">DRAG TO ORBIT · SCROLL TO EXPLORE</div>
        <div className="coords">X {terrain.frontX.toFixed(1)} · SEED {terrain.seed}</div>
      </div>
      <div className="world-foot"><span>AN EXPLORABLE RECORD OF YOUR SOUND</span><span>{String(updates).padStart(4, '0')} SCULPT UPDATES</span></div>
    </section>

    <section className="panel">
      <div className="instrument">
        <div className="eyebrow">THE ACOUSTIC INSTRUMENT</div>
        <h2>{listening ? 'Your world is listening.' : 'Make the first sound.'}</h2>
        <p>{listening ? 'Change your pitch, volume, and rhythm. The terrain will keep what you create.' : 'Microphone access starts only when you choose. No speech recognition, no uploads.'}</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          {!listening ? <button className="primary" onClick={start}><i /> Begin listening</button> : <button className="primary pause" onClick={stop}><i /> Pause input</button>}
          <button className="secondary" onClick={reset}>Reset world</button>
        </div>
      </div>
      <div className="readouts" aria-live="polite">
        <div><span>FUNDAMENTAL / HZ</span><strong>{features?.pitchHz ? Math.round(features.pitchHz) : '—'}</strong><small>{features?.pitchHz ? 'CONFIDENCE ' + Math.round(features.pitchConfidence * 100) + '%' : 'NO STABLE PITCH'}</small></div>
        <div><span>RMS ENERGY</span><strong>{features ? features.rms.toFixed(3) : '0.000'}</strong><small>{features?.isSilent ? 'SILENCE' : features ? 'SIGNAL DETECTED' : 'AWAITING INPUT'}</small></div>
        <div><span>SPECTRAL CENTROID</span><strong>{features ? Math.round(features.spectralCentroidHz).toLocaleString() : '—'}</strong><small>HZ · SPECTRAL BRIGHTNESS</small></div>
      </div>
    </section>
    <footer><span>DESIGNED TO BE PERFORMED, NOT PROMPTED.</span><span>NO AUDIO IS STORED OR TRANSMITTED.</span></footer>
  </main>
}
