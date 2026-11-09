# SYNESTHESIA — Acoustic World Genesis

**Worlds born from sound.**

SYNESTHESIA is an experimental browser-based creative instrument that turns non-semantic acoustic patterns into persistent, explorable 3D environments. It treats sound as a material for making places, not as language to transcribe.

## What it does

- **Listen locally:** microphone access starts only after an explicit user action. The browser extracts RMS energy, confidence-gated pitch, spectral centroid and onset strength using the Web Audio API.
- **Sculpt terrain:** a deterministic seeded heightfield evolves at the generation front. Bounded acoustic edits remain when input pauses.
- **Grow biomes:** mire, echo forest and crystal highlands contain distinct seeded flora, reflective water, floating rock formations, clouds, mist and crystals.
- **Respond to sound:** spectral colour, energy, pitch, accents and rhythmic patterns animate the atmosphere, spatial wavefronts and sound motes.
- **Discover landmarks:** inspect the 3D terrain or keyboard-operable minimap to reveal named landmarks and record field notes.
- **Trigger phenomena:** strong accents, sustained high tones and rhythmic patterns can create biome-aware meteor showers, auroras, echo blooms and mire lights.
- **Remember worlds:** save and restore worlds in browser IndexedDB, replay their acoustic feature history, rename or delete gallery entries, and export/import portable .synworld.json files.
- **Explore responsively:** orbit, pan, zoom, inspect and navigate on desktop or touch devices.

## Privacy

- Microphone access is opt-in and requested only after selecting **Begin listening**.
- Audio is analysed in the browser. Raw microphone recordings are never saved or uploaded.
- Saved worlds contain terrain state, measured acoustic feature history, discovered landmark IDs and derived world-event metadata—not audio samples.
- Saved worlds remain in the current browser profile on the current device unless explicitly exported.
- The app does not use speech recognition or interpret spoken words.

## Run locally

Requirements: Node.js 20+, npm, a modern browser with Web Audio API and WebGL 2 support.

~~~bash
npm install
npm run dev
~~~

Open the local Vite URL, select **Begin listening**, and grant microphone permission. Hum, sing a sustained tone, or make rhythmic non-verbal sounds to influence the environment. Select **Pause input** to preserve the landscape while ambient motion continues.

Microphone access requires localhost or HTTPS.

## Commands

~~~bash
npm run dev       # local development server
npm run build     # TypeScript checks and production Vite build
npm run preview   # serve the production build
npm test          # unit tests
npm run test:e2e  # Playwright desktop/mobile browser tests
~~~

The Three.js renderer is lazy-loaded and split from the initial interface bundle. The browser test suite uses Chromium with a software WebGL renderer and a fake microphone. CI runs both desktop and mobile viewport projects, plus a production dependency audit.

## Current architecture

~~~text
Microphone
  → Web Audio analyser
  → acoustic feature extraction
  → pattern classification and acoustic mapping
  → deterministic terrain sculpting
  → Three.js world and environment
  → local IndexedDB + portable world files
~~~

The renderer does not own audio analysis. The saved feature stream can reproduce terrain without storing the original recording.

## Known limitations

- Pitch estimation is a lightweight, decimated autocorrelation implementation; it is not a studio-grade pitch tracker.
- Rhythm classification uses a short onset-timing heuristic, not a dedicated beat tracker.
- Terrain is a single bounded heightfield mesh; very large worlds will need chunking or a clipmap.
- Local IndexedDB data is browser/device-specific. There is no cloud sync or collaboration.
- Browser automation validates the main interaction paths, but real microphone quality and performance still need checks on physical low-powered devices.
- WebGL context-loss recovery and undo/redo are not implemented.

See PROJECT_STATUS.md, ARCHITECTURE.md, and M2_DESIGN.md for implementation and design details.
