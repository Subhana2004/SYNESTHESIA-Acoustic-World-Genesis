# SYNESTHESIA — M2 Design: Acoustic Terrain Genesis

## 1. Design intent

M2 turns the M0/M1 acoustic-to-heightfield prototype into a recognisable SYNESTHESIA world: **hybrid natural terrain, a dark atmospheric visual language, and two complementary behaviours—live evolution and persistent geography**.

The world should feel explorable rather than like a flat audio visualizer. Mountains, valleys, ridges, plains and basins provide geographic readability. Surreal silhouettes, luminous accents, fog and restrained environmental motion make the landscape feel dreamlike without losing its natural structure.

This is a design specification. It does not claim that the visual systems or durable save/load are already implemented.

## 2. Visual direction

### 2.1 Terrain language: hybrid

Use recognisable landforms as the primary structure:
- Broad valleys and basins create navigable low areas.
- Mountain chains and ridges create silhouettes and elevation changes.
- Rolling plains and plateaus provide quieter transitions.
- Water-like or reflective lowland features may be introduced as a later environment layer.

Add surreal elements as accents rather than replacing geography:
- Unusually smooth or curved ridgelines.
- Isolated luminous formations or mineral-like highlights.
- Localised glowing seams around newly sculpted regions.
- Atmospheric depth that makes distant terrain feel mysterious.

Avoid a uniformly spiky noise surface. Large-scale forms should read first; fine detail should remain subordinate.

### 2.2 Dark atmosphere and palette

The world should remain dark even when brightly reacting to sound. Use light as a selective signal, not as a full-scene wash.

| Role | Suggested colour | Use |
|---|---|---|
| Deep space / background | `#080A12` | Scene background |
| Distant horizon | `#111827` | Fog and far distance |
| Base terrain | `#24243A` | Shadowed slopes |
| Ridge / elevated terrain | `#46506D` | Readable landform highlights |
| Bioluminescent teal | `#55D6C2` | Sound-reactive accents |
| Electric violet | `#9B7BFF` | Rare spectral highlights |
| Moonlit lavender | `#C4C9E8` | Upper-facing surfaces / mist |
| Warm amber | `#D59B75` | Rare onset or landmark accent |

These are initial design tokens, not final art-direction constraints. Keep contrast high enough to distinguish terrain, controls and status indicators. Avoid making every vertex emissive.

### 2.3 Lighting and atmosphere

- Use a dark scene background and distance fog to create depth.
- Use cool, low-intensity ambient illumination with a directional moonlight-like source.
- Reserve emissive accents for recent sound activity, special terrain features or landmarks.
- Add subtle mist/particle motion only when performance allows.
- Keep camera navigation and terrain readability usable on low-end integrated graphics.

## 3. World behaviour: evolving and persistent

SYNESTHESIA has two layers of behaviour. They must not be conflated.

### 3.1 Live evolution

While microphone input is active:
- Accepted acoustic feature frames sculpt the terrain through bounded, localised edits.
- A generation front advances through the world.
- The environment may respond subtly to current energy and spectral brightness (for example, a glow pulse or material shift), but these transient responses must not rewrite terrain every render frame.
- Analysis and terrain mutation remain decoupled from the Three.js render loop.

When input is paused or silence is detected:
- No new terrain deformation is applied.
- Existing terrain remains unchanged.
- Low-cost ambient effects may continue, so the world does not feel switched off.

### 3.2 Persistent geography

A sound-created landform is part of the world, not a temporary waveform. Therefore:
- Pausing input must preserve all accepted terrain edits.
- Transient signal values (current RMS, pitch and centroid) are not themselves persistent world data.
- The world state should be serialisable independently of the renderer.
- A stable world identity should include a seed, schema version and mapping configuration.
- Durable save/load across browser sessions belongs to M3, using a versioned representation (seed + terrain state + relevant settings), preferably in IndexedDB.
- M2 should keep the terrain data model deterministic and serialisation-friendly, but must not imply that cross-session persistence exists until M3 is implemented and tested.

### 3.3 Reset and future history

- Reset is an explicit destructive action that returns the active world to its initial seeded state.
- M2 should not silently reset on pause, microphone failure or component rerender.
- Undo, branching, snapshots and replay are deferred until the world-state format is stable.

## 4. Acoustic-to-world design grammar

The mapping remains an artistic control system, not a universal scientific relationship between sound and geography.

| Acoustic feature | Primary world response | Guardrail |
|---|---|---|
| Confident pitch | Controls target elevation band | If confidence is low, treat pitch as unavailable |
| RMS energy | Controls deformation strength and scale | Clamp displacement and smooth the brush |
| Pitch change | Influences local roughness / ridge character | Smooth transitions; avoid vertex spikes |
| Spectral centroid | Future material brightness / teal-violet accent | Keep visual response bounded and secondary |
| Onset strength | Future localised glow, ripple or landmark accent | Do not create large terrain jumps from one onset |
| Silence | Stops terrain edits | Never erase or flatten existing terrain |

The first M2 implementation should prioritise robust landform shaping and dark materials. Spectral/onset-driven environmental effects can follow once the base terrain is stable.

## 5. Proposed architecture

Keep the existing separation between audio, terrain state and renderer. Introduce or formalise these responsibilities as M2 grows:

| Component | Responsibility |
|---|---|
| AcousticMapper | Convert measured features into normalised artistic controls |
| SculptingController | Decide where, when and how strongly to apply a terrain brush |
| TerrainGenerator | Produce deterministic base forms and bounded terrain edits |
| WorldState | Own seed, heightfield, generation-front position and versioned world metadata |
| EnvironmentRenderer | Render terrain materials, lighting, fog and optional atmosphere |
| WorldMotionController | Animate non-destructive ambient effects independently of terrain mutation |
| PersistenceManager (M3) | Save/load versioned WorldState; not part of M2 acceptance |

The renderer must consume world state; it must not own acoustic analysis or be the source of truth for terrain.

## 6. M2 implementation sequence

1. **Landform quality:** improve the seeded base heightfield so it contains broad geographic forms rather than only low-amplitude noise.
2. **Sound sculpting:** tune brush radius, falloff, displacement and generation-front movement; preserve deterministic bounded edits.
3. **Dark rendering:** introduce the palette, dark background, fog, cool lighting and terrain elevation shading.
4. **Live feedback:** add restrained, temporary visual feedback for active sound without making the entire scene flash.
5. **World lifecycle:** verify that pause and silence preserve terrain, while explicit reset restores the seed.
6. **Performance and tests:** test deterministic terrain fixtures, bounds, silence behaviour, repeated edits and renderer cleanup; profile before adding particles or high-resolution geometry.

## 7. M2 acceptance criteria

M2 is complete when:
- The terrain reads as a hybrid natural landscape with a few intentional surreal details.
- The scene uses the agreed dark atmospheric palette and maintains legible depth.
- Live acoustic input visibly evolves the terrain in bounded, spatially localised ways.
- Pausing or silence stops sculpting without removing existing geography.
- Subtle ambient motion can continue independently of microphone input.
- Reset is explicit and deterministic.
- Terrain generation and mapping remain testable without WebGL.
- The data model is ready for versioned persistence, while cross-session save/load is clearly tracked as M3 unless deliberately brought forward.
- Build, unit tests and browser microphone/rendering checks are recorded as observed results, not assumed.

## 8. Out of scope for M2

- Cross-session IndexedDB save/load, import/export and replay (M3).
- Full biome simulation, complex vegetation, realistic water and weather systems (later environment milestone).
- AI interpretation of speech or semantic sound labels.
- Multiplayer or shared worlds.
- Expensive volumetric effects before performance profiling.

## 9. Product decision record

- Terrain style: **Hybrid natural + surreal**.
- Atmosphere: **Dark, cinematic, atmospheric**.
- World behaviour: **Both live-evolving and persistent**.
- Persistence boundary: **In-session terrain preservation is required in M2; durable browser-session persistence is planned for M3**.
