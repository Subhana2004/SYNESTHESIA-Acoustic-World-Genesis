import { extractFeatures, type AcousticFeatures } from './features'
import type { AudioInput } from './AudioInput'

/**
 * Plays a user-selected local audio file and analyses it through the same
 * Web Audio feature extractor used by microphone input. Audio never leaves
 * the browser and the object URL is revoked when playback stops.
 */
export class FileAudioInput implements AudioInput {
  readonly kind = 'file' as const
  private context: AudioContext | null = null
  private element: HTMLAudioElement | null = null
  private source: MediaElementAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private frameId = 0
  private previousRms = 0
  private lastAnalysisAt = 0
  private timeData: Float32Array | null = null
  private frequencyData: Uint8Array | null = null
  private objectUrl: string | null = null
  private cancelled = false

  constructor(private readonly file: File) {}

  async start(onFeatures: (features: AcousticFeatures) => void): Promise<void> {
    this.stop()
    this.cancelled = false

    const context = new AudioContext()
    const element = new Audio()
    const objectUrl = URL.createObjectURL(this.file)
    this.context = context
    this.element = element
    this.objectUrl = objectUrl

    element.src = objectUrl
    element.preload = 'auto'
    element.crossOrigin = 'anonymous'

    const source = context.createMediaElementSource(element)
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.25
    source.connect(analyser)
    analyser.connect(context.destination)
    this.source = source
    this.analyser = analyser
    this.timeData = new Float32Array(analyser.fftSize)
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount)

    await context.resume()
    if (this.cancelled) return
    await element.play()
    if (this.cancelled) return

    const sample = (now: number) => {
      if (this.cancelled || !this.analyser || !this.context || !this.timeData || !this.frequencyData) return
      if (now - this.lastAnalysisAt >= 50) {
        this.lastAnalysisAt = now
        this.analyser.getFloatTimeDomainData(this.timeData)
        this.analyser.getByteFrequencyData(this.frequencyData)
        const features = extractFeatures(
          this.timeData,
          this.frequencyData,
          this.context.sampleRate,
          this.previousRms,
          now,
        )
        this.previousRms = features.rms
        onFeatures(features)
      }
      if (!this.element?.ended) this.frameId = requestAnimationFrame(sample)
    }

    element.addEventListener('ended', this.handleEnded, { once: true })
    this.frameId = requestAnimationFrame(sample)
  }

  private handleEnded = () => {
    this.stop()
  }

  stop(): void {
    this.cancelled = true
    cancelAnimationFrame(this.frameId)
    this.element?.removeEventListener('ended', this.handleEnded)
    this.element?.pause()
    if (this.element) this.element.removeAttribute('src')
    this.source?.disconnect()
    this.analyser?.disconnect()
    if (this.context) void this.context.close()
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    this.context = null
    this.element = null
    this.source = null
    this.analyser = null
    this.timeData = null
    this.frequencyData = null
    this.objectUrl = null
    this.previousRms = 0
    this.lastAnalysisAt = 0
  }
}
