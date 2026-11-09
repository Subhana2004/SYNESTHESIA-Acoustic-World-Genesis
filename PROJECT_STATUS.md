# SYNESTHESIA — Project Status

Last updated: 2026-11-10

## Milestone status

| Milestone | Status | Delivered |
|---|---|---|
| M0 — Architecture and feasibility | Complete | Browser-first architecture, privacy boundary, deterministic terrain and risk decisions |
| M1 — Audio foundation | Complete | Opt-in Web Audio capture, RMS, confidence-gated pitch, spectral centroid and onset features |
| M2 — Acoustic terrain genesis | Complete | Seeded hybrid terrain, bounded sound-driven sculpting, dark 3D renderer and camera exploration |
| M3 — Persistence and replay | Complete | IndexedDB gallery, save/load, rename/delete, deterministic feature replay, validated JSON import/export and per-world discovery/event state |
| M4 — Environment construction | Complete | Three elevation biomes, biome-specific flora, floating rocks, clouds, mist, water, sound waves, motes, sound traces and procedural phenomena |
| M5 — Visual and interaction refinement | Complete | Responsive controls, camera tools, minimap, field notes, landmark discovery, event journal, keyboard exploration, per-world statistics and resource lifecycle fixes |
| M6 — Integration and validation | In progress | Unit/build CI is established; Playwright desktop/mobile browser smoke tests have been added and await the first full CI result |

## Current feature set

### Audio and terrain
- Microphone permission is requested only after the user selects **Begin listening**.
- Audio is analysed locally into RMS energy, confidence-gated autocorrelation pitch, spectral centroid and onset strength.
- Pitch estimation uses 2x decimation to reduce autocorrelation work while retaining the supported 65–1000 Hz band.
- Acoustic features sculpt a deterministic seeded heightfield at a bounded generation front.
- Silence and paused input preserve the existing terrain.
- The feature stream is bounded to 20,000 sculpt samples; no raw audio is persisted.

### Environments and sound response
- Three continuous elevation biomes: mire, echo forest and crystal highlands.
- Each biome has distinct procedural flora and emissive behaviour.
- Floating rocks, clouds, mist, stars, ridge crystals and basin water are seeded from world identity.
- Spectral brightness, energy, pitch, accents and rhythmic patterns influence lighting, colour, wavefronts, motes and ambient motion.
- Sound traces are reconstructed from feature history and capped at 80.
- World phenomena include meteor showers, highland auroras, echo blooms and mire lights. Up to 100 events are stored per world.

### Exploration and world memory
- A clickable and keyboard-operable 25×25 biome minimap supports region inspection.
- Terrain inspection reports biome, elevation, coordinates and nearby sound traces.
- Named landmarks can be discovered in the 3D scene or minimap and tracked in a field journal.
- Saved worlds retain discovered landmark IDs and world-event history.
- The gallery displays terrain previews, seed, sculpt sample count, exploration completion, phenomena count and discovered biome count.
- Save, load, rename, delete, replay, export and import are implemented.
- Import and local-load validation bounds dimensions, heightfield values, acoustic history, discovery IDs and event metadata. Older saved worlds without optional discovery/event fields remain compatible.
- Persistence is local to the current browser profile/device. Export is the portable transfer mechanism; cloud sync is not implemented.

## Recent stabilization work

- Fixed terrain-space Z orientation for flora placement, ridge crystals and basin water so generated environment objects align with the rendered heightfield.
- Rebuilds seed-dependent environment objects, water, mist and stars when a different saved world is loaded.
- Keeps event markers anchored to the evolving terrain surface and allows event selection in the 3D scene and event journal.
- Fixed event-marker disposal so refreshing landmark markers no longer disposes the event journal's geometry.
- Added complete cleanup for Three.js geometry/material resources and a ResizeObserver for responsive viewport sizing.
- Reset acoustic-pattern state between worlds.
- Hardened microphone startup cancellation, including permission prompts that resolve after a reset or component unmount.
- Added keyboard arrow navigation to the minimap and visible keyboard focus styles.
- Added Playwright checks for rendering, camera controls, minimap navigation, microphone permission failure/success, mobile overflow, and world save/export/import/load/rename/delete.

## Verification

- GitHub Actions previously passed the M5.6 unit-test and production-build checks at commit 7077ba3.
- The expanded Playwright workflow now runs unit tests, a production build, and desktop/mobile Chromium browser checks with software WebGL and a fake microphone.
- The first expanded CI run for the current branch is pending. Do not treat browser validation as complete until that run passes.
- Physical-device microphone quality, real GPU profiling and browser-specific WebGL behaviour remain outside automated CI.

## Known limitations and next validation targets

- Pitch estimation is a lightweight autocorrelation starter, not a validated production pitch tracker.
- Rhythm detection is heuristic onset-interval classification, not a dedicated beat tracker.
- The world uses a single heightfield mesh; larger worlds need chunking or a clipmap.
- Undo/redo, cloud sync, collaborative worlds and WebGL context-loss recovery are not implemented.
- Test on at least one physical iOS device and one lower-powered Android device before a public release.
