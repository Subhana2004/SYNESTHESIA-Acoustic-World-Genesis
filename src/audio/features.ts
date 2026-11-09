export interface AcousticFeatures {
  timestamp: number
  rms: number
  pitchHz: number | null
  pitchConfidence: number
  spectralCentroidHz: number
  onsetStrength: number
  isSilent: boolean
}

export interface AcousticControls {
  elevation: number
  intensity: number
  roughness: number
  pitchAvailable: boolean
}

export interface AtmosphereControls {
  spectralBlend: number
  onsetPulse: number
  energy: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function mapAtmosphere(f: AcousticFeatures): AtmosphereControls {
  // A logarithmic range gives useful control across low and high spectral-centroid values.
  const minHz = 250
  const maxHz = 6000
  const safeCentroid = clamp(f.spectralCentroidHz, minHz, maxHz)
  const spectralBlend = clamp(Math.log(safeCentroid / minHz) / Math.log(maxHz / minHz), 0, 1)
  return {
    spectralBlend,
    onsetPulse: f.isSilent ? 0 : clamp(f.onsetStrength, 0, 1),
    energy: f.isSilent ? 0 : clamp((f.rms - 0.012) / 0.22, 0, 1),
  }
}

export function estimatePitch(samples: Float32Array, sampleRate: number): { pitchHz: number | null; confidence: number } {
  const n = samples.length
  if (n < 32) return { pitchHz: null, confidence: 0 }
  let mean = 0
  for (let i = 0; i < n; i++) mean += samples[i]
  mean /= n
  let energy = 0
  for (let i = 0; i < n; i++) energy += (samples[i] - mean) ** 2
  if (energy / n < 0.00002) return { pitchHz: null, confidence: 0 }

  const minLag = Math.max(2, Math.floor(sampleRate / 1000))
  const maxLag = Math.min(Math.floor(sampleRate / 65), Math.floor(n / 2))
  let bestLag = -1
  let best = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    let cross = 0, left = 0, right = 0
    for (let i = 0; i < n - lag; i++) {
      const a = samples[i] - mean
      const b = samples[i + lag] - mean
      cross += a * b
      left += a * a
      right += b * b
    }
    const denom = Math.sqrt(left * right)
    const corr = denom > 0 ? cross / denom : 0
    if (corr > best) { best = corr; bestLag = lag }
  }
  if (bestLag < 0 || best < 0.72) return { pitchHz: null, confidence: clamp(best, 0, 1) }
  return { pitchHz: sampleRate / bestLag, confidence: clamp(best, 0, 1) }
}

export function extractFeatures(time: Float32Array, spectrum: Uint8Array, sampleRate: number, previousRms = 0, timestamp = performance.now()): AcousticFeatures {
  let sum = 0
  for (let i = 0; i < time.length; i++) sum += time[i] * time[i]
  const rms = Math.sqrt(sum / Math.max(1, time.length))
  const pitch = estimatePitch(time, sampleRate)
  let weighted = 0, total = 0
  for (let i = 0; i < spectrum.length; i++) {
    const magnitude = spectrum[i] / 255
    weighted += (i / spectrum.length) * (sampleRate / 2) * magnitude
    total += magnitude
  }
  return {
    timestamp, rms, pitchHz: pitch.pitchHz, pitchConfidence: pitch.confidence,
    spectralCentroidHz: total > 0 ? weighted / total : 0,
    onsetStrength: clamp((rms - previousRms) * 8, 0, 1),
    isSilent: rms < 0.012,
  }
}

export function mapAcoustics(f: AcousticFeatures): AcousticControls {
  const pitchAvailable = f.pitchHz !== null && f.pitchConfidence >= 0.72
  const pitch = pitchAvailable ? f.pitchHz as number : 180
  return {
    elevation: clamp(Math.log2(pitch / 65) / Math.log2(1000 / 65), 0, 1),
    intensity: clamp((f.rms - 0.012) / 0.22, 0, 1),
    roughness: pitchAvailable ? clamp(1 - f.pitchConfidence, 0, 1) : 0.35,
    pitchAvailable,
  }
}
