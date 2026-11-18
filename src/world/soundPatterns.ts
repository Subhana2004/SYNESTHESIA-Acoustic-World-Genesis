export type SoundPattern = 'ambient' | 'sustained' | 'accent' | 'rhythmic'

export interface SoundPatternState {
  sustainedSince: number | null
  onsetTimes: number[]
  lastOnset: number
}

export interface SoundPatternResult {
  state: SoundPatternState
  pattern: SoundPattern
  rhythmStrength: number
  /** Estimated quarter-note tempo, reported only when the pulse is stable. */
  tempoBpm: number | null
  /** Median interval between detected onset pulses. */
  beatIntervalMs: number | null
  /** Stability score from 0 (irregular) to 1 (highly regular). */
  tempoConfidence: number
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Classifies short windows of acoustic controls without retaining audio samples.
 * Only a handful of onset timestamps are kept in memory. Tempo is estimated
 * from the median inter-onset interval so one missed/extra accent has less
 * influence than it would with a simple average.
 */
export function updateSoundPattern(
  previous: SoundPatternState,
  energy: number,
  onsetPulse: number,
  nowMs: number,
): SoundPatternResult {
  const safeEnergy = Math.min(1, Math.max(0, energy))
  const safeOnset = Math.min(1, Math.max(0, onsetPulse))
  const sustainedSince = safeEnergy >= 0.38 && safeOnset < 0.48
    ? previous.sustainedSince ?? nowMs
    : safeEnergy < 0.24 ? null : previous.sustainedSince

  let onsetTimes = previous.onsetTimes.filter(time => nowMs - time <= 4000)
  let lastOnset = previous.lastOnset
  if (safeOnset >= 0.55 && nowMs - lastOnset >= 120) {
    onsetTimes = [...onsetTimes, nowMs].slice(-7)
    lastOnset = nowMs
  }

  const intervals = onsetTimes.slice(1).map((time, index) => time - onsetTimes[index])
  let rhythmStrength = 0
  let tempoBpm: number | null = null
  let beatIntervalMs: number | null = null
  let tempoConfidence = 0

  if (intervals.length >= 3) {
    const interval = median(intervals)
    const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length
    const variance = intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1
    const bpm = 60000 / interval
    // This first live estimator deliberately reports a conservative 50–200 BPM
    // range; half/double-time ambiguity is left unresolved rather than guessed.
    if (bpm >= 50 && bpm <= 200 && coefficientOfVariation <= 0.32) {
      tempoConfidence = Math.min(1, Math.max(0, 1 - coefficientOfVariation / 0.32))
      rhythmStrength = tempoConfidence * Math.min(1, intervals.length / 3)
      tempoBpm = bpm
      beatIntervalMs = interval
    }
  }

  const sustained = sustainedSince !== null && nowMs - sustainedSince >= 850
  const rhythmic = rhythmStrength > 0
  const pattern: SoundPattern = rhythmic
    ? 'rhythmic'
    : sustained
      ? 'sustained'
      : safeOnset >= 0.55
        ? 'accent'
        : 'ambient'

  return {
    state: { sustainedSince, onsetTimes, lastOnset },
    pattern,
    rhythmStrength,
    tempoBpm,
    beatIntervalMs,
    tempoConfidence,
  }
}
