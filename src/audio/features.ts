export interface AcousticFeatures {
  timestamp: number
  rms: number
  pitchHz: number | null
  pitchConfidence: number
  spectralCentroidHz: number
  onsetStrength: number
  isSilent: boolean
  /** Normalized spectral energy in bass (20–250 Hz), mid (250–2,000 Hz), and treble (2,000 Hz+). */
  bassEnergy?: number
  midEnergy?: number
  trebleEnergy?: number
  /** Spectral flatness: near 0 is tonal, near 1 is noise-like. */
  spectralFlatness?: number
  /** Fraction of samples that cross zero. */
  zeroCrossingRate?: number
  /** Frequency below which 85% of spectral magnitude is concentrated. */
  spectralRolloffHz?: number
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
  pitchTone: number
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
    pitchTone: f.isSilent || f.pitchHz === null || f.pitchConfidence < 0.72
      ? 0.35
      : clamp(Math.log2(f.pitchHz / 65) / Math.log2(1000 / 65), 0, 1),
  }
}

export function estimatePitch(samples: Float32Array, sampleRate: number): { pitchHz: number | null; confidence: number } {
  // A 2x decimation keeps the 65–1000 Hz pitch band intact while reducing
  // the quadratic autocorrelation work by roughly four times.
  const stride = 2
  const n = Math.floor(samples.length / stride)
  if (n < 32) return { pitchHz: null, confidence: 0 }
  const effectiveRate = sampleRate / stride
  let mean = 0
  for (let i = 0; i < n; i++) mean += samples[i * stride]
  mean /= n
  let energy = 0
  for (let i = 0; i < n; i++) energy += (samples[i * stride] - mean) ** 2
  if (energy / n < 0.00002) return { pitchHz: null, confidence: 0 }

  const minLag = Math.max(2, Math.floor(effectiveRate / 1000))
  const maxLag = Math.min(Math.floor(effectiveRate / 65), Math.floor(n / 2))
  let bestLag = -1
  let best = 0
  const correlations = new Float32Array(maxLag + 1)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let cross = 0, left = 0, right = 0
    for (let i = 0; i < n - lag; i++) {
      const a = samples[i * stride] - mean
      const b = samples[(i + lag) * stride] - mean
      cross += a * b
      left += a * a
      right += b * b
    }
    const denom = Math.sqrt(left * right)
    const corr = denom > 0 ? cross / denom : 0
    correlations[lag] = corr
    if (corr > best) best = corr
  }
  const threshold = Math.max(0.72, best * 0.97)
  for (let lag = minLag; lag <= maxLag; lag++) {
    const current = correlations[lag]
    const previous = lag > minLag ? correlations[lag - 1] : -Infinity
    const next = lag < maxLag ? correlations[lag + 1] : -Infinity
    if (current >= threshold && current >= previous && current >= next) {
      bestLag = lag
      break
    }
  }
  if (bestLag < 0 || best < 0.72) return { pitchHz: null, confidence: clamp(best, 0, 1) }
  return { pitchHz: effectiveRate / bestLag, confidence: clamp(correlations[bestLag], 0, 1) }
}

/** Extracts lightweight time- and frequency-domain descriptors from one analyser frame. */
export function extractFeatures(time: Float32Array, spectrum: Uint8Array, sampleRate: number, previousRms = 0, timestamp = performance.now()): AcousticFeatures {
  let sum = 0
  let crossings = 0
  for (let i = 0; i < time.length; i++) {
    sum += time[i] * time[i]
    if (i > 0 && ((time[i - 1] < 0 && time[i] >= 0) || (time[i - 1] >= 0 && time[i] < 0))) crossings++
  }
  const rms = Math.sqrt(sum / Math.max(1, time.length))
  const pitch = estimatePitch(time, sampleRate)
  let weighted = 0, total = 0, bass = 0, mid = 0, treble = 0
  let logMagnitudeSum = 0, positiveBins = 0
  const magnitudes = new Float32Array(spectrum.length)
  for (let i = 0; i < spectrum.length; i++) {
    const magnitude = spectrum[i] / 255
    const frequency = i * sampleRate / (2 * spectrum.length)
    magnitudes[i] = magnitude
    weighted += frequency * magnitude
    total += magnitude
    if (frequency < 250) bass += magnitude * magnitude
    else if (frequency < 2000) mid += magnitude * magnitude
    else treble += magnitude * magnitude
    if (magnitude > 0) {
      logMagnitudeSum += Math.log(magnitude)
      positiveBins++
    }
  }
  const powerTotal = bass + mid + treble
  let rolloffHz = 0
  if (total > 0) {
    let cumulative = 0
    for (let i = 0; i < magnitudes.length; i++) {
      cumulative += magnitudes[i]
      if (cumulative >= total * 0.85) {
        rolloffHz = i * sampleRate / (2 * magnitudes.length)
        break
      }
    }
  }
  const silent = rms < 0.012
  return {
    timestamp, rms, pitchHz: pitch.pitchHz, pitchConfidence: pitch.confidence,
    spectralCentroidHz: total > 0 ? weighted / total : 0,
    onsetStrength: clamp((rms - previousRms) * 8, 0, 1),
    isSilent: silent,
    bassEnergy: !silent && powerTotal > 0 ? bass / powerTotal : 0,
    midEnergy: !silent && powerTotal > 0 ? mid / powerTotal : 0,
    trebleEnergy: !silent && powerTotal > 0 ? treble / powerTotal : 0,
    spectralFlatness: positiveBins > 0 && total > 0
      ? clamp(Math.exp(logMagnitudeSum / positiveBins) / (total / spectrum.length), 0, 1)
      : 0,
    zeroCrossingRate: time.length > 1 ? crossings / (time.length - 1) : 0,
    spectralRolloffHz: rolloffHz,
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
