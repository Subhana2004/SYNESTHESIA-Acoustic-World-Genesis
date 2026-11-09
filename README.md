# SYNESTHESIA — Acoustic World Genesis

**Worlds Born From Sound.**

SYNESTHESIA is an experimental browser-based creative instrument that turns non-semantic acoustic patterns into persistent, explorable 3D terrain.

The first vertical slice proves the core loop:

**Microphone → measured acoustic features → acoustic mapping → persistent terrain → navigable 3D scene**

It does not interpret spoken words. Pitch, energy, spectral brightness, onsets, and silence are treated as creative controls.

## Requirements

- Node.js 20 or newer
- npm
- A modern browser with Web Audio API and WebGL support
- Microphone permission for live input (localhost is treated as a secure context)

## Run locally

    npm install
    npm run dev

Open the local URL printed by Vite. Select Begin listening and grant microphone permission. Hum or make non-verbal sounds to sculpt the terrain. Select Pause input to preserve the current landscape.

## Commands

    npm run dev       # local development server
    npm run build     # production TypeScript + Vite build
    npm run preview   # preview the production build
    npm run test      # unit tests

## Design principles

- Audio analysis is local; no audio is uploaded.
- Spoken language is not transcribed or semantically interpreted.
- Low-confidence pitch is represented as unavailable, never fabricated.
- Terrain changes are bounded and spatially localized.
- Silence pauses sculpting; it does not erase geometry.
- Fixed inputs and seeds should produce repeatable world state.

## Current scope

The first slice includes microphone capture, RMS energy, a confidence-gated autocorrelation pitch estimate, spectral centroid, a simple onset measure, a deterministic acoustic mapper, a seeded heightfield, and a Three.js scene. Persistence, robust rhythm analysis, terrain chunking, export, and advanced environment systems remain future milestones.

See PROJECT_STATUS.md for progress and verified checks.
