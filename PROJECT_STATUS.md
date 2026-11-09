# Project Status

Last updated: 2026-11-10

## Milestones

| Milestone | Status | Evidence / notes |
|---|---|---|
| M0 — Architecture and feasibility | In progress | Architecture and risk decisions documented in ARCHITECTURE.md |
| M1 — Audio foundation | In progress | Browser microphone capture and initial feature extraction scaffolded; automated verification still needs confirmation |
| M2 — Acoustic terrain genesis | Initial implementation in progress | Hybrid landforms, dark renderer palette, sound-reactive teal/violet lighting and onset accents committed |
| M3 — Persistence and replay | Not started | Durable IndexedDB save/load and deterministic feature-stream replay remain outstanding |
| M4 — Environment construction | Not started | Extended materials, vegetation, water, clouds and biomes remain outstanding |
| M5 — Visual and interaction refinement | Not started | Accessibility, responsive controls and performance profiling remain outstanding |
| M6 — Integration and validation | Not started | Full browser/device validation remains outstanding |

## Current implementation

The current branch contains a first end-to-end prototype and the first M2 visual pass:
- User-initiated microphone access through Web Audio API.
- RMS, confidence-gated autocorrelation pitch, spectral centroid and onset estimate.
- Deterministic acoustic mapping.
- Seeded hybrid heightfield with rolling forms, ridge lines, basin and mountain-like peaks.
- Bounded localized terrain deformation and a moving generation front.
- Dark navy/purple scene palette, distance fog, cool directional lighting and restrained teal/violet atmospheric lights.
- Spectral centroid mapped to a teal-to-violet lighting balance.
- Onset strength mapped to a short-lived accent-light pulse near the current generation front.
- Seeded drifting valley mist rendered as a lightweight point cloud.
- A restrained star field and emissive teal/violet mineral spires placed on elevated terrain.
- A reflective, emissive water surface and fine luminous rim in the generated lowland basin.
- Terrain vertex colours now shift subtly between teal and violet with spectral centroid; updates are smoothed and throttled.
- Orbit exploration supports pan and zoom, with a one-click camera reset.
- Environmental motion continues independently of microphone input; terrain geometry is not changed by these ambient effects.
- Dark application interface to match the in-world visual direction.
- Unit tests for core mapping, terrain behaviour and bounded atmospheric controls.

## M2 visual and behaviour decisions

See M2_DESIGN.md for the full design and acceptance criteria.

- Terrain direction: hybrid natural landforms with restrained surreal details.
- Atmosphere: dark, cinematic palette with selective teal, violet and moonlit accents.
- Behaviour: terrain evolves during live sound input and remains intact when input pauses; subtle ambient motion may continue independently.
- Persistence boundary: durable save/load across browser sessions is M3, not yet implemented.

## Verification status

GitHub Actions reported successful unit-test and production-build runs for the sound-reactive atmosphere changes (commit e300b403). The environmental mist, stars and ridge-crystal implementation passed GitHub Actions unit tests and production build. The newer basin-water, terrain palette and camera-control commits are awaiting their own CI result. Browser microphone/rendering checks and target-device profiling remain outstanding.

## Known limitations

- Pitch estimation is a lightweight autocorrelation starter, not a validated production pitch tracker.
- Rhythm is not yet robustly estimated; onset strength is only a simple frame-to-frame energy change.
- The first renderer updates a single heightfield mesh; large worlds need chunking and profiling.
- Save/load, import/export, undo, and replay are not implemented yet.
- Atmospheric response drives lights and a subtle, smoothed terrain vertex-colour shift; water and terrain materials remain procedural.
- Mist, stars and ridge crystals are a first lightweight environmental pass; density, visibility and performance still need browser review.
- No AI/ML model is required or included in this first version.

## Next steps

1. Confirm CI for basin water, spectral terrain tint and camera controls.
2. Inspect water placement, reflections, camera framing and visual balance in a real browser.
3. Verify pause/silence preservation, reset determinism and ambient motion.
4. Stabilise the world-state schema before M3 persistence and replay.
