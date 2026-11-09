# Project Status

Last updated: 2026-11-10

## Milestones

| Milestone | Status | Evidence / notes |
|---|---|---|
| M0 — Architecture and feasibility | In progress | Architecture and risk decisions documented in ARCHITECTURE.md |
| M1 — Audio foundation | In progress | Browser microphone capture and initial feature extraction scaffolded; automated verification still needs confirmation |
| M2 — Acoustic terrain genesis | Initial implementation in progress | Hybrid landforms, dark renderer palette, sound-reactive teal/violet lighting and onset accents committed |
| M3 — Persistence and replay | Initial implementation in progress | IndexedDB save/load, visual world gallery, rename/delete, portable JSON export/import and deterministic feature-stream replay committed; browser validation pending |
| M4 — Environment construction | Initial implementation in progress | Seeded flora, floating rocks and drifting clouds; elevation-based mire, forest and crystal-highland biomes now blend smoothly, with spectral centroid shifting the palette and input energy controlling luminous intensity |
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
- Elevation defines three continuous biome regions: luminous mire in lowlands, echo forest across middle elevations and crystal highlands on peaks. Live spectral brightness shifts their shared accent palette, while signal energy increases the luminous response.
- Orbit exploration supports pan and zoom, with a one-click camera reset.
- Versioned IndexedDB world storage records terrain dimensions, seed, heightfield, generation front and bounded acoustic sculpt history.
- Local world gallery supports save, visual terrain-profile previews, rename, delete, load, portable world-file export/import and deterministic replay of the recorded feature stream; no microphone audio samples are stored.
- Environmental motion continues independently of microphone input; terrain geometry is not changed by these ambient effects.
- Dark application interface to match the in-world visual direction.
- Unit tests for core mapping, terrain behaviour and bounded atmospheric controls.

## M2 visual and behaviour decisions

See M2_DESIGN.md for the full design and acceptance criteria.

- Terrain direction: hybrid natural landforms with restrained surreal details.
- Atmosphere: dark, cinematic palette with selective teal, violet and moonlit accents.
- Behaviour: terrain evolves during live sound input and remains intact when input pauses; subtle ambient motion may continue independently.
- Persistence boundary: M3 now includes browser-local save/load, gallery management and deterministic feature replay; real-browser validation remains pending.

## Verification status

GitHub Actions reported successful unit-test and production-build runs for the M3 persistence baseline at commit 94ca3e2. The M3.2 gallery changes have triggered new CI runs; their final result is pending. Browser microphone/rendering checks, IndexedDB save/reload validation and target-device profiling remain outstanding.

## Known limitations

- Pitch estimation is a lightweight autocorrelation starter, not a validated production pitch tracker.
- Rhythm is not yet robustly estimated; onset strength is only a simple frame-to-frame energy change.
- The first renderer updates a single heightfield mesh; large worlds need chunking and profiling.
- Undo is not implemented yet; IndexedDB save/load, gallery management, validated portable JSON export/import and deterministic feature replay are implemented but need browser validation.
- Atmospheric response drives lights and a subtle, smoothed terrain vertex-colour shift; water and terrain materials remain procedural.
- Mist, stars and ridge crystals are a first lightweight environmental pass; density, visibility and performance still need browser review.
- No AI/ML model is required or included in this first version.

## Next steps

1. Confirm CI for IndexedDB save/load, replay and the M2 renderer updates.
2. Validate save → reload → restore in a real browser, including malformed or unavailable storage.
3. Inspect biome transitions, water placement, reflections, camera framing and visual balance.
4. Plan export/import and undo after the versioned world format is validated.
