# Project Status

Last updated: 2026-11-10

## Milestones

| Milestone | Status | Evidence / notes |
|---|---|---|
| M0 — Architecture and feasibility | In progress | Architecture and risk decisions documented in ARCHITECTURE.md |
| M1 — Audio foundation | In progress | Browser microphone capture and initial feature extraction scaffolded |
| M2 — Acoustic terrain genesis | In progress | Bounded moving-front heightfield sculpting scaffolded |
| M3 — Persistence and replay | Not started | IndexedDB and deterministic feature-stream replay remain outstanding |
| M4 — Environment construction | Not started | Materials, vegetation, water, clouds and biomes remain outstanding |
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

## Verification status

No build, unit test, browser test, or target-device performance result is claimed as passing until it has actually been run. This repository change is an implementation checkpoint; execute the commands in README.md locally and update this file with observed results.

## Known limitations

- Pitch estimation is a lightweight autocorrelation starter, not a validated production pitch tracker.
- Rhythm is not yet robustly estimated; onset strength is only a simple frame-to-frame energy change.
- The first renderer updates a single heightfield mesh; large worlds need chunking and profiling.
- Save/load, import/export, undo, and replay are not implemented yet.
- Spectral centroid is measured but not yet used to change environment materials.
- No AI/ML model is required or included in this first version.

## Next steps

1. Install dependencies and run build + tests.
2. Validate pitch behavior with synthetic sine, noise, and silence fixtures.
3. Test microphone permissions and lifecycle in Chromium.
4. Tune brush radius, front speed, and acoustic response using real users.
5. Introduce deterministic feature-stream recording and persistence only after the world-state format stabilizes.
