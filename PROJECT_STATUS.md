# Project Status

Last updated: 2026-11-10

## Milestones

| Milestone | Status | Evidence / notes |
|---|---|---|
| M0 — Architecture and feasibility | In progress | Architecture and risk decisions documented in ARCHITECTURE.md |
| M1 — Audio foundation | In progress | Browser microphone capture and initial feature extraction scaffolded; automated verification still needs confirmation |
| M2 — Acoustic terrain genesis | Design specified; implementation in progress | Product direction and acceptance criteria recorded in M2_DESIGN.md; bounded moving-front heightfield sculpting is scaffolded |
| M3 — Persistence and replay | Not started | Durable IndexedDB save/load and deterministic feature-stream replay remain outstanding |
| M4 — Environment construction | Not started | Extended materials, vegetation, water, clouds and biomes remain outstanding |
| M5 — Visual and interaction refinement | Not started | Accessibility, responsive controls and performance profiling remain outstanding |
| M6 — Integration and validation | Not started | Full browser/device validation remains outstanding |

## Current implementation

The initial branch contains a first end-to-end prototype:
- User-initiated microphone access through Web Audio API.
- RMS, confidence-gated autocorrelation pitch, spectral centroid and onset estimate.
- Deterministic acoustic mapping.
- Seeded heightfield with bounded localized terrain deformation and a moving generation front.
- Three.js terrain rendering and orbit-style camera controls.
- Unit tests for core mapping and terrain behavior.

## M2 visual and behaviour decisions

See M2_DESIGN.md for the full design and acceptance criteria.

- Terrain direction: hybrid natural landforms with restrained surreal details.
- Atmosphere: dark, cinematic palette with selective teal, violet and moonlit accents.
- Behaviour: terrain evolves during live sound input and remains intact when input pauses; subtle ambient motion may continue independently.
- Persistence boundary: durable save/load across browser sessions is M3, not yet implemented.

## Verification status

No build, unit test, browser test, or target-device performance result is claimed as passing until it has actually been run. This repository change is a design checkpoint; execute the commands in README.md and update this file with observed results.

## Known limitations

- Pitch estimation is a lightweight autocorrelation starter, not a validated production pitch tracker.
- Rhythm is not yet robustly estimated; onset strength is only a simple frame-to-frame energy change.
- The first renderer updates a single heightfield mesh; large worlds need chunking and profiling.
- Save/load, import/export, undo, and replay are not implemented yet.
- Spectral centroid is measured but not yet used to change environment materials.
- No AI/ML model is required or included in this first version.

## Next steps

1. Confirm the M1 build and test pipeline with an actual successful run.
2. Improve broad landform generation and bounded acoustic sculpting against the M2 design.
3. Apply the dark material, lighting and fog direction.
4. Verify pause/silence preservation, reset determinism and ambient motion.
5. Stabilise the world-state schema before M3 persistence and replay.
