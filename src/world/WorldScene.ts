import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { AtmosphereControls } from '../audio/features'
import type { TerrainState } from './terrain'
import { generateEnvironmentLayout } from './environment'
import { getBiomeWeights } from './biomes'

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
  private violetLight: THREE.PointLight
  private accentLight: THREE.PointLight
  private targetTeal = 0.55
  private targetViolet = 0.35
  private targetPulse = 0
  private currentPulse = 0
  private targetAccentX = 0
  private targetAccentZ = 0
  private mist: THREE.Points
  private mistPositions: Float32Array
  private mistPhases: Float32Array
  private stars: THREE.Points
  private crystals: THREE.Group
  private water: THREE.Mesh
  private waterRing: THREE.Mesh
  private waterMaterial: THREE.MeshStandardMaterial
  private targetPaletteBlend = 0.35
  private currentPaletteBlend = 0.35
  private targetBiomeEnergy = 0
  private currentBiomeEnergy = 0
  private flora: THREE.Group
  private floatingRocks: THREE.InstancedMesh
  private clouds: THREE.Group

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
    this.controls.enablePan = true
    this.controls.enableZoom = true
    this.controls.screenSpacePanning = false
    this.controls.target.set(0, 0.4, 0)
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.minDistance = 8
    this.controls.maxDistance = 70

    this.scene.add(new THREE.HemisphereLight('#a9b4d8', '#111322', 0.9))
    const moon = new THREE.DirectionalLight('#c4c9e8', 1.55)
    moon.position.set(-18, 30, 12)
    this.scene.add(moon)
    this.tealLight = new THREE.PointLight('#55d6c2', 0, 38, 2)
    this.tealLight.position.set(-10, 5, 2)
    this.scene.add(this.tealLight)
    this.violetLight = new THREE.PointLight('#9b7bff', 0, 34, 2)
    this.violetLight.position.set(12, 4, -12)
    this.scene.add(this.violetLight)
    this.accentLight = new THREE.PointLight('#55d6c2', 0, 18, 2)
    this.accentLight.position.set(0, 2.5, 0)
    this.scene.add(this.accentLight)

    // Lightweight point sprites provide drifting valley mist without a particle-system dependency.
    const mistCount = 260
    this.mistPositions = new Float32Array(mistCount * 3)
    this.mistPhases = new Float32Array(mistCount)
    let randomState = terrain.seed >>> 0
    const random = () => {
      randomState = (1664525 * randomState + 1013904223) >>> 0
      return randomState / 4294967296
    }
    for (let i = 0; i < mistCount; i++) {
      this.mistPositions[i * 3] = (random() - 0.5) * terrain.worldWidth
      this.mistPositions[i * 3 + 1] = 0.45 + random() * 2.4
      this.mistPositions[i * 3 + 2] = (random() - 0.5) * terrain.worldWidth
      this.mistPhases[i] = random() * Math.PI * 2
    }
    const mistGeometry = new THREE.BufferGeometry()
    mistGeometry.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3))
    const mistMaterial = new THREE.PointsMaterial({
      color: '#8b9dc7', size: 0.22, transparent: true, opacity: 0.2,
      depthWrite: false, sizeAttenuation: true,
    })
    this.mist = new THREE.Points(mistGeometry, mistMaterial)
    this.scene.add(this.mist)

    const starPositions: number[] = []
    for (let i = 0; i < 420; i++) {
      const angle = random() * Math.PI * 2
      const radius = 48 + random() * 38
      starPositions.push(Math.cos(angle) * radius, 13 + random() * 28, Math.sin(angle) * radius)
    }
    const starGeometry = new THREE.BufferGeometry()
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
    this.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
      color: '#c4c9e8', size: 0.16, transparent: true, opacity: 0.72,
      depthWrite: false, sizeAttenuation: true,
    }))
    this.scene.add(this.stars)

    this.crystals = this.createRidgeCrystals()
    this.scene.add(this.crystals)

    const environment = this.createEnvironment()
    this.flora = environment.flora
    this.floatingRocks = environment.floatingRocks
    this.clouds = environment.clouds
    this.scene.add(this.flora, this.floatingRocks, this.clouds)

    const waterParts = this.createBasinWater()
    this.water = waterParts.surface
    this.waterRing = waterParts.ring
    this.waterMaterial = waterParts.material
    this.scene.add(this.water, this.waterRing)

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

  updateAcousticAtmosphere(controls: AtmosphereControls, frontX: number): void {
    const blend = THREE.MathUtils.clamp(controls.spectralBlend, 0, 1)
    this.targetPaletteBlend = blend
    const energy = THREE.MathUtils.clamp(controls.energy, 0, 1)
    this.targetBiomeEnergy = energy
    this.targetTeal = 0.18 + (1 - blend) * 1.15 + energy * 0.35
    this.targetViolet = 0.18 + blend * 1.2 + energy * 0.25
    this.targetPulse = Math.max(this.targetPulse, THREE.MathUtils.clamp(controls.onsetPulse, 0, 1))
    this.targetAccentX = THREE.MathUtils.clamp(frontX, -this.terrain.worldWidth / 2, this.terrain.worldWidth / 2)
    this.targetAccentZ = Math.sin((this.targetAccentX + this.terrain.worldWidth / 2) * 0.11) * 2.5
    const accentColor = new THREE.Color('#55d6c2').lerp(new THREE.Color('#9b7bff'), blend)
    this.accentLight.color.copy(accentColor)
  }

  private createEnvironment(): { flora: THREE.Group; floatingRocks: THREE.InstancedMesh; clouds: THREE.Group } {
    const layout = generateEnvironmentLayout(this.terrain)
    const flora = new THREE.Group()
    const transform = new THREE.Object3D()
    const species = [
      {
        biome: 'mire',
        stemGeometry: new THREE.CylinderGeometry(0.035, 0.075, 0.7, 5),
        crownGeometry: new THREE.IcosahedronGeometry(0.15, 1),
        stemColor: '#254c4c', crownColor: '#9ee9dc', emissive: '#2cbaaa',
        hueStart: 0.46, hueRange: 0.17,
      },
      {
        biome: 'forest',
        stemGeometry: new THREE.CylinderGeometry(0.055, 0.09, 0.48, 7),
        crownGeometry: new THREE.SphereGeometry(0.22, 9, 7),
        stemColor: '#493d50', crownColor: '#b4a0cf', emissive: '#7554a0',
        hueStart: 0.72, hueRange: 0.12,
      },
      {
        biome: 'highlands',
        stemGeometry: new THREE.ConeGeometry(0.12, 0.72, 5),
        crownGeometry: new THREE.OctahedronGeometry(0.17, 0),
        stemColor: '#41445f', crownColor: '#d2c6ff', emissive: '#8972db',
        hueStart: 0.65, hueRange: 0.12,
      },
    ] as const

    for (const speciesType of species) {
      const plants = layout.flora.filter(plant => plant.biome === speciesType.biome)
      if (plants.length === 0) continue
      const stemMaterial = new THREE.MeshStandardMaterial({
        color: speciesType.stemColor, roughness: 0.72, metalness: 0.12,
      })
      const crownMaterial = new THREE.MeshStandardMaterial({
        color: speciesType.crownColor, emissive: speciesType.emissive,
        emissiveIntensity: 1.45, roughness: 0.3, metalness: 0.08,
      })
      const stems = new THREE.InstancedMesh(speciesType.stemGeometry, stemMaterial, plants.length)
      const crowns = new THREE.InstancedMesh(speciesType.crownGeometry, crownMaterial, plants.length)
      crowns.userData.biome = speciesType.biome
      crowns.userData.pulseOffset = speciesType.biome === 'mire' ? 0 : speciesType.biome === 'forest' ? 1.7 : 3.2
      crowns.userData.baseEmissive = 1.45
      plants.forEach((plant, index) => {
        const height = (speciesType.biome === 'forest' ? 0.48 : 0.72) * plant.scale
        transform.position.set(plant.x, plant.y + height * 0.5, plant.z)
        transform.rotation.set(0, plant.hue * Math.PI * 2, (plant.hue - 0.5) * 0.16)
        transform.scale.set(plant.scale, plant.scale, plant.scale)
        transform.updateMatrix()
        stems.setMatrixAt(index, transform.matrix)

        transform.position.set(plant.x, plant.y + height * 0.92, plant.z)
        transform.scale.setScalar(plant.scale * (0.72 + plant.hue * 0.28))
        transform.updateMatrix()
        crowns.setMatrixAt(index, transform.matrix)
        crowns.setColorAt(index, new THREE.Color().setHSL(
          speciesType.hueStart + plant.hue * speciesType.hueRange, 0.62, 0.66,
        ))
      })
      stems.instanceMatrix.needsUpdate = true
      crowns.instanceMatrix.needsUpdate = true
      flora.add(stems, crowns)
    }

    const rockGeometry = new THREE.DodecahedronGeometry(1, 0)
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: '#45465f', emissive: '#17152b', emissiveIntensity: 0.28,
      roughness: 0.92, metalness: 0.12, flatShading: true,
    })
    const floatingRocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, layout.floatingRocks.length)
    layout.floatingRocks.forEach((rock, index) => {
      transform.position.set(rock.x, rock.y, rock.z)
      transform.rotation.set(rock.rotation * 0.35, rock.rotation, rock.rotation * 0.2)
      transform.scale.set(rock.scale * 1.25, rock.scale * 0.72, rock.scale)
      transform.updateMatrix()
      floatingRocks.setMatrixAt(index, transform.matrix)
    })
    floatingRocks.instanceMatrix.needsUpdate = true

    const clouds = new THREE.Group()
    const cloudGeometry = new THREE.SphereGeometry(1, 12, 8)
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: '#8585ad', transparent: true, opacity: 0.13,
      roughness: 1, depthWrite: false,
    })
    layout.clouds.forEach(cloud => {
      const cluster = new THREE.Group()
      const lobes = [
        { x: 0, y: 0, z: 0, scale: 1.0 },
        { x: 0.72, y: 0.12, z: 0.18, scale: 0.72 },
        { x: -0.68, y: -0.08, z: -0.12, scale: 0.82 },
      ]
      lobes.forEach(lobe => {
        const puff = new THREE.Mesh(cloudGeometry, cloudMaterial)
        puff.position.set(lobe.x * cloud.scale, lobe.y * cloud.scale, lobe.z * cloud.scale)
        puff.scale.set(cloud.scale * lobe.scale, cloud.scale * 0.34 * lobe.scale, cloud.scale * 0.62 * lobe.scale)
        cluster.add(puff)
      })
      cluster.position.set(cloud.x, cloud.y, cloud.z)
      cluster.userData.phase = cloud.phase
      cluster.userData.baseX = cloud.x
      clouds.add(cluster)
    })
    return { flora, floatingRocks, clouds }
  }

  private createBasinWater(): { surface: THREE.Mesh; ring: THREE.Mesh; material: THREE.MeshStandardMaterial } {
    // The basin is centred near the lowland depression defined by the terrain generator.
    const centerX = this.terrain.worldWidth * 0.06
    const centerZ = this.terrain.worldWidth * 0.04
    const step = this.terrain.worldWidth / (this.terrain.size - 1)
    const centerCol = Math.round(centerX / step + (this.terrain.size - 1) / 2)
    const centerRow = Math.round((this.terrain.size - 1) / 2 - centerZ / step)
    let basinFloor = Infinity
    for (let row = Math.max(0, centerRow - 7); row <= Math.min(this.terrain.size - 1, centerRow + 7); row++) {
      for (let col = Math.max(0, centerCol - 7); col <= Math.min(this.terrain.size - 1, centerCol + 7); col++) {
        basinFloor = Math.min(basinFloor, this.terrain.heights[row * this.terrain.size + col])
      }
    }
    const waterLevel = basinFloor + 0.16
    const material = new THREE.MeshStandardMaterial({
      color: '#276b83', emissive: '#103b58', emissiveIntensity: 0.32,
      metalness: 0.62, roughness: 0.2, transparent: true, opacity: 0.72,
      depthWrite: false, side: THREE.DoubleSide,
    })
    const geometry = new THREE.CircleGeometry(3.15, 64)
    geometry.rotateX(-Math.PI / 2)
    const surface = new THREE.Mesh(geometry, material)
    surface.position.set(centerX, waterLevel, centerZ)
    surface.renderOrder = 1

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#58cfc6', transparent: true, opacity: 0.38,
      side: THREE.DoubleSide, depthWrite: false,
    })
    const ringGeometry = new THREE.TorusGeometry(3.18, 0.035, 6, 80)
    ringGeometry.rotateX(Math.PI / 2)
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.set(centerX, waterLevel + 0.025, centerZ)
    ring.renderOrder = 2
    return { surface, ring, material }
  }

  resetCamera(): void {
    this.camera.position.set(24, 19, 29)
    this.controls.target.set(0, 0.4, 0)
    this.controls.update()
  }

  private createRidgeCrystals(): THREE.Group {
    const group = new THREE.Group()
    const candidates: Array<{ x: number; z: number; y: number }> = []
    const stride = 3
    for (let row = 1; row < this.terrain.size - 1; row += stride) {
      for (let col = 1; col < this.terrain.size - 1; col += stride) {
        const index = row * this.terrain.size + col
        const height = this.terrain.heights[index]
        if (height < 1.05) continue
        const x = (col / (this.terrain.size - 1) - 0.5) * this.terrain.worldWidth
        const z = (0.5 - row / (this.terrain.size - 1)) * this.terrain.worldWidth
        candidates.push({ x, z, y: height })
      }
    }
    candidates.sort((a, b) => b.y - a.y)
    const chosen: typeof candidates = []
    for (const candidate of candidates) {
      if (chosen.every(other => Math.hypot(other.x - candidate.x, other.z - candidate.z) > 4.2)) {
        chosen.push(candidate)
      }
      if (chosen.length >= 18) break
    }

    const teal = new THREE.MeshStandardMaterial({
      color: '#55d6c2', emissive: '#168d82', emissiveIntensity: 1.25,
      roughness: 0.34, metalness: 0.18,
    })
    const violet = new THREE.MeshStandardMaterial({
      color: '#a58cff', emissive: '#5638a8', emissiveIntensity: 1.35,
      roughness: 0.3, metalness: 0.2,
    })
    chosen.forEach((point, index) => {
      const height = 0.55 + (index % 4) * 0.22
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(0.16 + (index % 3) * 0.045, height, 5),
        index % 3 === 0 ? violet : teal,
      )
      crystal.position.set(point.x, point.y + height * 0.42, point.z)
      crystal.rotation.z = (index % 2 ? 1 : -1) * 0.12
      group.add(crystal)
    })
    return group
  }

  private terrainColor(height: number): THREE.Color {
    const biomes = getBiomeWeights(height)
    const weights = [biomes.mire, biomes.forest, biomes.highlands]

    // Each elevation band has its own identity; the live spectrum shifts the
    // shared accent from glacial teal toward dreamlike violet.
    const palettes = [
      new THREE.Color('#174b55'), // luminous mire
      new THREE.Color('#285b50'), // echo forest
      new THREE.Color('#51446f'), // crystal highlands
    ]
    const base = palettes[0].clone().multiplyScalar(weights[0])
      .add(palettes[1].clone().multiplyScalar(weights[1]))
      .add(palettes[2].clone().multiplyScalar(weights[2]))
    const spectralAccent = new THREE.Color('#287e83').lerp(new THREE.Color('#9870c7'), this.currentPaletteBlend)
    const energyAccent = new THREE.Color('#172536').lerp(spectralAccent, 0.12 + this.currentBiomeEnergy * 0.3)
    return base.lerp(energyAccent, 0.22 + this.currentBiomeEnergy * 0.12)
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

  private updateTerrainColors(): void {
    const colors = this.geometry.attributes.color as THREE.BufferAttribute
    for (let i = 0; i < this.terrain.heights.length; i++) {
      const color = this.terrainColor(this.terrain.heights[i])
      colors.setXYZ(i, color.r, color.g, color.b)
    }
    colors.needsUpdate = true
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
    this.tealLight.intensity = THREE.MathUtils.lerp(this.tealLight.intensity, this.targetTeal, 0.035)
    this.violetLight.intensity = THREE.MathUtils.lerp(this.violetLight.intensity, this.targetViolet, 0.035)
    this.currentPulse = THREE.MathUtils.lerp(this.currentPulse, this.targetPulse, 0.22)
    this.currentPaletteBlend = THREE.MathUtils.lerp(this.currentPaletteBlend, this.targetPaletteBlend, 0.025)
    this.currentBiomeEnergy = THREE.MathUtils.lerp(this.currentBiomeEnergy, this.targetBiomeEnergy, 0.04)
    if (Math.floor(performance.now() / 16) % 8 === 0) this.updateTerrainColors()
    this.water.rotation.y = Math.sin(time * 1.8) * 0.012
    this.waterMaterial.emissiveIntensity = 0.24 + Math.sin(time * 2.2) * 0.08
    this.waterMaterial.opacity = 0.68 + Math.sin(time * 1.3) * 0.035
    this.waterRing.rotation.z = Math.sin(time * 0.7) * 0.025
    this.flora.rotation.z = Math.sin(time * 1.7) * 0.006
    this.flora.children.forEach(species => {
      species.children.forEach(object => {
        if (!(object instanceof THREE.InstancedMesh) || object.userData.biome === undefined) return
        const biome = String(object.userData.biome)
        const phase = Number(object.userData.pulseOffset) || 0
        const frequency = biome === 'mire' ? 1.25 : biome === 'forest' ? 0.72 : 1.8
        const pulse = (Math.sin(time * frequency * 3 + phase) + 1) * 0.5
        const onsetBoost = this.currentPulse * (biome === 'highlands' ? 1.35 : 0.85)
        const energyBoost = this.currentBiomeEnergy * (biome === 'forest' ? 0.75 : 1.1)
        const material = object.material as THREE.MeshStandardMaterial
        material.emissiveIntensity = 0.85 + pulse * 0.7 + energyBoost + onsetBoost
        const breath = 1 + pulse * 0.025 + onsetBoost * 0.018
        object.scale.setScalar(breath)
      })
    })
    this.floatingRocks.rotation.y = time * 0.045
    const rockMaterial = this.floatingRocks.material as THREE.MeshStandardMaterial
    rockMaterial.emissiveIntensity = 0.22 + this.currentBiomeEnergy * 0.55 + this.currentPulse * 0.75
    rockMaterial.emissive.copy(new THREE.Color('#17152b').lerp(
      new THREE.Color('#4c3e83'), this.currentPaletteBlend,
    ))
    this.clouds.children.forEach(cluster => {
      const phase = Number(cluster.userData.phase) || 0
      const baseX = Number(cluster.userData.baseX) || 0
      cluster.position.x = baseX + Math.sin(time * 0.7 + phase) * (0.18 + this.currentBiomeEnergy * 0.32)
      cluster.position.y += Math.sin(time * 0.35 + phase) * 0.0008
      cluster.rotation.y = Math.sin(time * 0.4 + phase) * 0.035
      cluster.children.forEach(puff => {
        if (!(puff instanceof THREE.Mesh)) return
        const material = puff.material as THREE.MeshStandardMaterial
        material.color.set('#8585ad').lerp(new THREE.Color('#8b72c8'), this.currentPaletteBlend)
        material.opacity = 0.1 + this.currentBiomeEnergy * 0.08 + this.currentPulse * 0.045
      })
    })
    this.targetPulse *= 0.9
    this.accentLight.intensity = this.currentPulse * 5.5
    this.accentLight.position.set(this.targetAccentX, 2.5, this.targetAccentZ)
    const mistPositions = this.mist.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < this.mistPhases.length; i++) {
      const offset = i * 3
      this.mistPositions[offset] += Math.sin(time * 2 + this.mistPhases[i]) * 0.0018
      this.mistPositions[offset + 1] += Math.sin(time * 1.4 + this.mistPhases[i]) * 0.0012
      if (this.mistPositions[offset] > this.terrain.worldWidth / 2) this.mistPositions[offset] = -this.terrain.worldWidth / 2
      if (this.mistPositions[offset] < -this.terrain.worldWidth / 2) this.mistPositions[offset] = this.terrain.worldWidth / 2
    }
    mistPositions.needsUpdate = true
    this.mist.rotation.y = Math.sin(time * 0.35) * 0.025
    this.stars.rotation.y = time * 0.018
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    window.removeEventListener('resize', this.resize)
    this.controls.dispose()
    this.geometry.dispose()
    this.water.geometry.dispose()
    this.waterMaterial.dispose()
    this.waterRing.geometry.dispose()
    ;(this.waterRing.material as THREE.Material).dispose()
    this.mist.geometry.dispose()
    ;(this.mist.material as THREE.Material).dispose()
    this.stars.geometry.dispose()
    ;(this.stars.material as THREE.Material).dispose()
    this.crystals.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
    const environmentGeometries = new Set<THREE.BufferGeometry>()
    const environmentMaterials = new Set<THREE.Material>()
    for (const group of [this.flora, this.clouds]) group.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
        environmentGeometries.add(object.geometry)
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach(material => environmentMaterials.add(material))
      }
    })
    environmentGeometries.add(this.floatingRocks.geometry)
    const rockMaterials = Array.isArray(this.floatingRocks.material) ? this.floatingRocks.material : [this.floatingRocks.material]
    rockMaterials.forEach(material => environmentMaterials.add(material))
    environmentGeometries.forEach(geometry => geometry.dispose())
    environmentMaterials.forEach(material => material.dispose())
    const crystalMaterials = new Set<THREE.Material>()
    this.crystals.traverse(object => {
      if (object instanceof THREE.Mesh) {
        const material = object.material
        if (Array.isArray(material)) material.forEach(item => crystalMaterials.add(item))
        else crystalMaterials.add(material)
      }
    })
    crystalMaterials.forEach(material => material.dispose())
    ;(this.mesh.material as THREE.Material).dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
