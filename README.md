# SYNESTHESIA — Acoustic World Genesis

**Worlds born from sound.** SYNESTHESIA is an experimental, browser-based project that turns live acoustic characteristics into a persistent, explorable 3D environment.

Instead of transcribing speech or interpreting words, it treats sound as a creative input. A user can hum, speak, tap or make other sounds; the application measures acoustic features locally and uses them to shape a procedural landscape.

**Live demo:** https://synesthesia-acoustic-world-genesis.vercel.app  
**Repository:** https://github.com/Subhana2004/SYNESTHESIA-Acoustic-World-Genesis

> **Project status:** Ongoing experimental project. The browser MVP and milestones M0–M6 are implemented; automated validation is passing. Physical-device microphone and GPU-performance checks remain outstanding.

## What it does

- Captures microphone input only after the user selects **Begin listening**.
- Analyses the incoming signal in the browser and extracts RMS energy, confidence-gated pitch, spectral centroid and onset strength.
- Maps those features to bounded terrain changes and non-destructive environmental responses.
- Builds a seeded, deterministic heightfield that can be explored as a 3D world.
- Generates three elevation-based environments: **mire**, **echo forest** and **crystal highlands**.
- Adds procedural flora, floating rocks, clouds, mist, stars, ridge crystals, basin water, sound traces and occasional world phenomena.
- Provides camera controls, a keyboard-operable minimap, terrain inspection, landmarks and field/event journals.
- Saves and restores worlds locally, with replay and validated JSON import/export.

## How it works

The application separates audio analysis, world-state mutation, rendering and persistence. Audio processing does not run inside the 3D renderer.

```text
Microphone
   │  (explicit user permission)
   ▼
AudioCapture / AudioEngine
   ▼
FeatureExtractor
   ├── RMS energy
   ├── confidence-gated pitch
   ├── spectral centroid
   └── onset strength
   ▼
AcousticMapper
   ├── terrain controls
   └── atmosphere controls
   ▼
SculptingController / TerrainGenerator
   ▼
WorldState
   ├── Three.js renderer
   ├── exploration and discovery
   └── IndexedDB persistence
```

### 1. Acoustic feature extraction

The Web Audio API supplies time-domain and frequency-domain data. The feature extractor measures:

| Feature | How it is estimated | Role in the world |
|---|---|---|
| RMS energy | Root-mean-square amplitude of the time-domain signal | Controls terrain deformation strength and visual energy |
| Pitch | Autocorrelation with a confidence threshold | Influences target elevation and tonal atmosphere |
| Spectral centroid | Magnitude-weighted average frequency | Influences the environment's spectral colour blend |
| Onset strength | Positive change in RMS relative to the previous frame | Drives transient accents and sound-reactive phenomena |
| Silence | RMS below the configured threshold | Stops terrain edits while preserving the existing world |

Pitch is treated as unavailable when the signal is not sufficiently periodic or confidence is below the threshold. The current pitch estimator is a lightweight autocorrelation implementation, not a validated production pitch tracker. Rhythm/pattern classification is heuristic.

### 2. Mapping sound to geometry and atmosphere

The mapper normalizes measured features into bounded artistic controls. These are design choices for this project, not claims that a particular frequency universally corresponds to a particular landform.

- **Confident pitch → elevation:** pitch is normalized over the supported range and influences the target terrain height.
- **RMS energy → deformation strength:** louder accepted input can produce stronger, but clamped, terrain changes.
- **Pitch confidence → roughness control:** uncertain pitch does not get treated as a reliable note.
- **Spectral centroid → palette:** spectral brightness shifts the environment's colour blend.
- **Onset strength → accents:** transient changes can produce wavefronts, traces and occasional phenomena.
- **Silence or paused input → no sculpting:** existing terrain remains intact.

### 3. Procedural terrain and 3D rendering

The world begins with a deterministic seeded heightfield containing broad landforms, ridges, peaks and a basin. Accepted acoustic frames apply a spatially localized Gaussian brush near a moving generation front. Brush radius, time step and displacement are bounded to avoid unrestrained spikes.

The world is rendered with **Three.js**. The renderer consumes world state; it does not own microphone capture or feature estimation. Environment details are generated from the world seed, and the renderer is lazy-loaded to reduce the initial interface bundle.

### 4. Persistence and exploration

World snapshots are stored in **IndexedDB** in the current browser profile/device. The application supports save, load, rename, delete, deterministic feature-history replay, and validated JSON import/export. It also tracks discoveries and world-event history.

Cloud synchronization and collaboration are not implemented.

## Architecture and technology

| Area | Implementation |
|---|---|
| UI | React 18, TypeScript |
| Build and development | Vite |
| 3D graphics | Three.js |
| Audio input and analysis | Browser Web Audio API |
| Terrain | Seeded procedural heightfield and bounded Gaussian-brush sculpting |
| Persistence | IndexedDB and validated JSON import/export |
| Unit testing | Vitest |
| Browser testing | Playwright |
| Continuous integration | GitHub Actions |

## Run locally

### Requirements

- Node.js 20 or a compatible modern Node.js release
- npm
- A modern browser with WebGL and microphone support for the full experience

### Setup

```bash
git clone https://github.com/Subhana2004/SYNESTHESIA-Acoustic-World-Genesis.git
cd SYNESTHESIA-Acoustic-World-Genesis
npm install
npm run dev
```

Open the local URL printed by Vite. Microphone access requires a secure context (normally localhost during development) and is requested only when **Begin listening** is selected.

### Checks

```bash
npm test
npm run build
npm run test:e2e
```

The project status records 57 unit tests across 9 files and 16 Playwright browser checks passing, alongside TypeScript checks, a production Vite build and a production dependency audit. Browser checks use Chromium, software WebGL and a fake microphone; they are not a substitute for physical-device testing.

## Privacy

- Microphone access is opt-in and begins only after an explicit user action.
- Acoustic analysis runs locally in the browser.
- Raw microphone recordings are not saved or uploaded.
- Saved worlds contain terrain state and derived acoustic metadata, not raw audio samples.
- Persistence is local to the browser profile/device. JSON export is the transfer mechanism; cloud sync is not available.

## Current limitations and next steps

- Validate microphone behaviour and rendering performance on physical iOS and lower-powered Android devices.
- Profile on real GPUs and across browsers.
- Improve pitch estimation and rhythm detection beyond the current lightweight/heuristic methods.
- Consider terrain chunking or a clipmap for larger worlds.
- Undo/redo, cloud sync, collaboration and WebGL context-loss recovery are not implemented.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for milestone details, verification notes and the current status.

## Scope clarification

SYNESTHESIA is a procedural, audio-driven 3D environment project. It does **not** currently implement machine-learning-based 3D reconstruction, NeRF, or 3D Gaussian Splatting (3DGS). Its relevance to 3D graphics research is its separation of real-time input analysis, procedural geometry, rendering, world state and evaluation-oriented engineering—not an existing 3DGS implementation.
