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
}

/**
 * Classifies short windows of acoustic controls without retaining audio samples.
 * Only a handful of onset timestamps are kept in memory.
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
    onsetTimes = [...onsetTimes, nowMs].slice(-5)
    lastOnset = nowMs
  }

  const intervals = onsetTimes.slice(1).map((time, index) => time - onsetTimes[index])
  let rhythmStrength = 0
  if (intervals.length >= 3) {
    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    const variance = intervals.reduce((sum, interval) => sum + (interval - mean) ** 2, 0) / intervals.length
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1
    if (mean >= 180 && mean <= 1200 && coefficientOfVariation <= 0.32) {
      rhythmStrength = Math.min(1, (1 - coefficientOfVariation / 0.32) * Math.min(1, intervals.length / 3))
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

  return { state: { sustainedSince, onsetTimes, lastOnset }, pattern, rhythmStrength }
}
