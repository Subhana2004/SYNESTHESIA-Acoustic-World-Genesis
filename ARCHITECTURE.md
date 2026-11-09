# SYNESTHESIA — M0 Architecture

## Product constraint

SYNESTHESIA creates persistent geometry from acoustic characteristics. It is not a speech-command interface and not a transient audio visualizer. Audio processing must not depend on the renderer.

## Runtime flow

Microphone → AudioCapture → FeatureExtractor → AcousticMapper → SculptingController → TerrainGenerator → WorldState → Renderer / PersistenceManager.

ApplicationController coordinates permission, start/stop, and lifecycle. Audio analysis must not live inside rendering callbacks.

## Module boundaries

| Module | Responsibility | Must not own |
|---|---|---|
| AudioCapture | Microphone lifecycle and Web Audio graph | Terrain or rendering |
| FeatureExtractor | Measurements from time-domain/frequency data | User-facing interpretation |
| AcousticMapper | Normalized acoustic features to artistic controls | Microphone access |
| SculptingController | Spatial placement, brush footprint, bounded updates | WebGL objects |
| TerrainGenerator | Deterministic heightfield mutation | Browser permission |
| Renderer | Display world state and camera | Audio feature estimation |
| PersistenceManager | Versioned local save/load, gallery, replay and validated import/export | Audio capture |
| ApplicationController | Coordinate application lifecycle | Geometry algorithms |

## Initial acoustic grammar

These are controllable artistic mappings, not claims about a universal physical relationship between sound and geography.

- Pitch (when confidence is adequate) → target elevation.
- RMS energy → deformation strength.
- Pitch change → surface roughness.
- Spectral centroid → secondary material parameter (reserved for a later environment pass).
- Onset strength → localized accent (reserved for a later pass).
- Silence → stop applying edits; preserve current terrain.

If pitch confidence is low, the mapper uses a neutral pitch control and marks pitch as unavailable. It does not infer pitch from noise or silence.

## Spatial model

Use a bounded, seeded heightfield as the first terrain representation. A generation front moves across the X axis. Each accepted feature frame applies a Gaussian brush around the current front position. The brush has a finite radius and a clamped displacement, preventing unbounded spikes. This converts a time stream into an accumulated spatial record.

The initial prototype uses one mesh for clarity. Chunking and incremental GPU updates are required before scaling the world.

## Feasibility and risks

1. **Pitch ambiguity:** breath, whispers, unvoiced consonants, and noisy input may have no stable fundamental. Mitigation: confidence threshold and nullable pitch.
2. **Browser audio permissions:** microphone access requires user action and a secure context. Mitigation: explicit start button and visible error state.
3. **Main-thread load:** naive per-frame analysis and full mesh recomputation can cause stutter. Mitigation: throttle sculpting updates, keep geometry bounded, profile before increasing resolution, then move expensive work to workers.
4. **Terrain quality:** arbitrary vertex displacement can create spikes. Mitigation: smooth spatial kernel, bounded increments, and seeded base terrain.
5. **Determinism:** microphone streams vary. Mitigation: separate feature stream from terrain mutation so recorded feature fixtures can replay deterministically.
6. **Persistence:** storing raw meshes is costly and brittle. Prefer versioned seed + heightfield + mapping settings; add IndexedDB after the core data model stabilizes.
7. **Low-end hardware:** integrated graphics require modest grid resolution, restrained lighting, and quality presets.

## First vertical slice acceptance

- Request microphone permission only after explicit user action.
- Produce measured, finite RMS and spectral values.
- Return pitch only when periodicity confidence passes a threshold.
- Map features to bounded terrain edits.
- Preserve terrain when input stops.
- Allow camera exploration independent of audio.
- Keep mapping and terrain functions testable without WebGL.

## Decisions to revisit

- Whether to adopt YIN or a more robust autocorrelation implementation after fixture evaluation.
- Whether terrain should become chunked tiles or a clipmap.
- How to represent undo/history and collaborative world metadata.
- IndexedDB schema and import/export format.
