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
- Dark application interface to match the in-world visual direction.
- Unit tests for core mapping, terrain behaviour and bounded atmospheric controls.

## M2 visual and behaviour decisions

See M2_DESIGN.md for the full design and acceptance criteria.

- Terrain direction: hybrid natural landforms with restrained surreal details.
- Atmosphere: dark, cinematic palette with selective teal, violet and moonlit accents.
- Behaviour: terrain evolves during live sound input and remains intact when input pauses; subtle ambient motion may continue independently.
- Persistence boundary: durable save/load across browser sessions is M3, not yet implemented.

## Verification status

The previous CI run showed that unit tests passed but TypeScript production build failed due to incompatible Vite plugin type identities. The configuration has been adjusted at the plugin boundary. A new CI run is in progress; do not treat the build as passing until GitHub Actions reports success. Browser microphone/rendering checks and target-device profiling remain outstanding.

## Known limitations

- Pitch estimation is a lightweight autocorrelation starter, not a validated production pitch tracker.
- Rhythm is not yet robustly estimated; onset strength is only a simple frame-to-frame energy change.
- The first renderer updates a single heightfield mesh; large worlds need chunking and profiling.
- Save/load, import/export, undo, and replay are not implemented yet.
- Atmospheric response currently drives lights rather than persistent terrain materials.
- Current ambient motion is deliberately restrained; richer environmental animation is still future work.
- No AI/ML model is required or included in this first version.

## Next steps

1. Confirm the M2 build and test pipeline with a successful CI run.
2. Inspect and tune spectral lighting and onset accents in a real browser with live microphone input.
3. Verify pause/silence preservation, reset determinism and ambient motion.
4. Stabilise the world-state schema before M3 persistence and replay.
