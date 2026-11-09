import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { TerrainState } from './terrain'

export class WorldScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180)
  private controls: OrbitControls
  private geometry: THREE.PlaneGeometry
  private mesh: THREE.Mesh
  private frame = 0
  private disposed = false

  constructor(private host: HTMLDivElement, private terrain: TerrainState) {
    this.scene.background = new THREE.Color('#aab8ad')
    this.scene.fog = new THREE.Fog('#aab8ad', 24, 82)
    this.camera.position.set(24, 19, 29)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    host.appendChild(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 0.6, 0)
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.minDistance = 8
    this.controls.maxDistance = 70
    this.scene.add(new THREE.HemisphereLight('#edf4e9', '#53645b', 2))
    const sun = new THREE.DirectionalLight('#fff0d5', 2.2)
    sun.position.set(-18, 30, 12)
    this.scene.add(sun)
    this.geometry = new THREE.PlaneGeometry(terrain.worldWidth, terrain.worldWidth, terrain.size - 1, terrain.size - 1)
    this.geometry.rotateX(-Math.PI / 2)
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.vertexColors(), 3))
    this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }))
    this.scene.add(this.mesh)
    this.updateTerrain()
    this.resize()
    window.addEventListener('resize', this.resize)
    this.animate()
  }

  private vertexColors(): number[] {
    const colors: number[] = []
    for (const h of this.terrain.heights) {
      const color = new THREE.Color().setHSL(0.28 - Math.max(0, h) * 0.012, 0.18 + Math.min(0.18, Math.max(0, h) * 0.025), 0.28 + Math.min(0.24, Math.max(0, h) * 0.035))
      colors.push(color.r, color.g, color.b)
    }
    return colors
  }

  updateTerrain(): void {
    const positions = this.geometry.attributes.position as THREE.BufferAttribute
    const colors = this.geometry.attributes.color as THREE.BufferAttribute
    for (let i = 0; i < this.terrain.heights.length; i++) {
      const h = this.terrain.heights[i]
      positions.setY(i, h)
      const color = new THREE.Color().setHSL(0.28 - Math.max(0, h) * 0.012, 0.18 + Math.min(0.18, Math.max(0, h) * 0.025), 0.28 + Math.min(0.24, Math.max(0, h) * 0.035))
      colors.setXYZ(i, color.r, color.g, color.b)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    this.geometry.computeVertexNormals()
  }

  private resize = (): void => {
    if (this.disposed) return
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  private animate = (): void => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.animate)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    window.removeEventListener('resize', this.resize)
    this.controls.dispose()
    this.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
