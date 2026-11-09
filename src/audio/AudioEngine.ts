import { extractFeatures, type AcousticFeatures } from './features'

export class AudioEngine {
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private frameId = 0
  private previousRms = 0
  private timeData: Float32Array | null = null
  private frequencyData: Uint8Array | null = null

  async start(onFeatures: (features: AcousticFeatures) => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is unavailable. Use localhost or HTTPS in a modern browser.')
    this.stop()
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    this.context = new AudioContext()
    await this.context.resume()
    const source = this.context.createMediaStreamSource(this.stream)
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.25
    source.connect(this.analyser)
    this.timeData = new Float32Array(this.analyser.fftSize)
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)

    const sample = () => {
      if (!this.analyser || !this.context || !this.timeData || !this.frequencyData) return
      this.analyser.getFloatTimeDomainData(this.timeData)
      this.analyser.getByteFrequencyData(this.frequencyData)
      const f = extractFeatures(this.timeData, this.frequencyData, this.context.sampleRate, this.previousRms)
      this.previousRms = f.rms
      onFeatures(f)
      this.frameId = requestAnimationFrame(sample)
    }
    this.frameId = requestAnimationFrame(sample)
  }

  stop(): void {
    cancelAnimationFrame(this.frameId)
    this.stream?.getTracks().forEach(track => track.stop())
    this.stream = null
    if (this.context) void this.context.close()
    this.context = null
    this.analyser = null
    this.timeData = null
    this.frequencyData = null
    this.previousRms = 0
  }
}
