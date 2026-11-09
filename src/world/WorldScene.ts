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
  private tealLight: THREE.PointLight

  constructor(private host: HTMLDivElement, private terrain: TerrainState) {
    this.scene.background = new THREE.Color('#080a12')
    this.scene.fog = new THREE.FogExp2('#111827', 0.022)
    this.camera.position.set(24, 19, 29)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    host.appendChild(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 0.4, 0)
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.minDistance = 8
    this.controls.maxDistance = 70

    this.scene.add(new THREE.HemisphereLight('#a9b4d8', '#111322', 0.9))
    const moon = new THREE.DirectionalLight('#c4c9e8', 1.55)
    moon.position.set(-18, 30, 12)
    this.scene.add(moon)
    this.tealLight = new THREE.PointLight('#55d6c2', 18, 38, 2)
    this.tealLight.position.set(-10, 5, 2)
    this.scene.add(this.tealLight)
    const violetLight = new THREE.PointLight('#9b7bff', 11, 34, 2)
    violetLight.position.set(12, 4, -12)
    this.scene.add(violetLight)

    this.geometry = new THREE.PlaneGeometry(terrain.worldWidth, terrain.worldWidth, terrain.size - 1, terrain.size - 1)
    this.geometry.rotateX(-Math.PI / 2)
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.vertexColors(), 3))
    this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.88, metalness: 0.08,
    }))
    this.scene.add(this.mesh)
    this.updateTerrain()
    this.resize()
    window.addEventListener('resize', this.resize)
    this.animate()
  }

  private terrainColor(height: number): THREE.Color {
    const deep = new THREE.Color('#171a2a')
    const slope = new THREE.Color('#343a56')
    const high = new THREE.Color('#65708e')
    const crest = new THREE.Color('#a3a9c7')
    if (height < 0.15) return deep.lerp(slope, THREE.MathUtils.smoothstep(height, -0.8, 0.15))
    if (height < 1.15) return slope.lerp(high, THREE.MathUtils.smoothstep(height, 0.15, 1.15))
    return high.lerp(crest, THREE.MathUtils.smoothstep(height, 1.15, 3.2))
  }

  private vertexColors(): number[] {
    const colors: number[] = []
    for (const height of this.terrain.heights) {
      const color = this.terrainColor(height)
      colors.push(color.r, color.g, color.b)
    }
    return colors
  }

  updateTerrain(): void {
    const positions = this.geometry.attributes.position as THREE.BufferAttribute
    const colors = this.geometry.attributes.color as THREE.BufferAttribute
    for (let i = 0; i < this.terrain.heights.length; i++) {
      const height = this.terrain.heights[i]
      positions.setY(i, height)
      const color = this.terrainColor(height)
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
    const time = performance.now() * 0.00025
    this.tealLight.position.x = -10 + Math.sin(time) * 2.2
    this.tealLight.position.z = 2 + Math.cos(time * 0.8) * 2
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
