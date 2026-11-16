import type { AcousticFeatures } from './features'

export type AudioInputKind = 'microphone' | 'file'

/** A source-agnostic stream of timestamped acoustic measurements. */
export interface AudioInput {
  readonly kind: AudioInputKind
  start(onFeatures: (features: AcousticFeatures) => void, onEnded?: () => void): Promise<void>
  stop(): void
}
