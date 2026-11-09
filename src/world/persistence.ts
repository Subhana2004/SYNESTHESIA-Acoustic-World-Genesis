import type { AcousticFeatures } from '../audio/features'
import { createTerrain, type TerrainState } from './terrain'
import { discoverWorldLandmarks } from './discovery'
import { deriveSoundTraces } from './soundTraces'
import { validateWorldEvents, type WorldEvent } from './worldEvents'

export interface RecordedSculpt {
  features: AcousticFeatures
  deltaSeconds: number
}

export interface SavedWorld {
  id: string
  name: string
  savedAt: number
  version: 1
  size: number
  worldWidth: number
  seed: number
  frontX: number
  heights: number[]
  history: RecordedSculpt[]
  discoveredLandmarkIds?: string[]
  events?: WorldEvent[]
}

const DATABASE = 'synesthesia-worlds'
const STORE = 'worlds'
const VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support local world storage.'))
      return
    }
    const request = indexedDB.open(DATABASE, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open world storage.'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('World storage request failed.'))
  })
}


function normalizeSavedWorld(value: unknown, requireIdentity = false): SavedWorld {
  const validNumber = (item: unknown): item is number => typeof item === 'number' && Number.isFinite(item)
  if (!value || typeof value !== 'object') throw new Error('The world file is incomplete or contains invalid terrain data.')
  const record = value as Partial<SavedWorld>
  if (record.version !== 1 || typeof record.name !== 'string' ||
    !validNumber(record.size) || !Number.isInteger(record.size) || record.size < 2 || record.size > 512 ||
    !validNumber(record.worldWidth) || record.worldWidth <= 0 || record.worldWidth > 1024 ||
    !validNumber(record.seed) || !Number.isSafeInteger(record.seed) || record.seed < 0 || record.seed > 0xffffffff ||
    !validNumber(record.frontX) || Math.abs(record.frontX) > record.worldWidth / 2 ||
    !Array.isArray(record.heights) || record.heights.length !== record.size * record.size ||
    !record.heights.every(height => validNumber(height) && height >= -20 && height <= 20) ||
    !Array.isArray(record.history) || record.history.length > 20000 ||
    (requireIdentity && (typeof record.id !== 'string' || !validNumber(record.savedAt)))) {
    throw new Error('This saved world is invalid or uses an unsupported format.')
  }
  const historyIsValid = record.history.every(item => {
    if (!item || typeof item !== 'object') return false
    const entry = item as RecordedSculpt
    const features = entry.features
    return validNumber(entry.deltaSeconds) && entry.deltaSeconds >= 0 && entry.deltaSeconds <= 10 &&
      !!features && validNumber(features.timestamp) && validNumber(features.rms) && features.rms >= 0 && features.rms <= 1 &&
      (features.pitchHz === null || (validNumber(features.pitchHz) && features.pitchHz >= 0 && features.pitchHz <= 24000)) &&
      validNumber(features.pitchConfidence) && features.pitchConfidence >= 0 && features.pitchConfidence <= 1 &&
      validNumber(features.spectralCentroidHz) && features.spectralCentroidHz >= 0 && features.spectralCentroidHz <= 24000 &&
      validNumber(features.onsetStrength) && features.onsetStrength >= 0 && features.onsetStrength <= 1 &&
      typeof features.isSilent === 'boolean'
  })
  if (!historyIsValid) throw new Error('The world file contains invalid acoustic history.')
  const allowedIds = new Set(['basin', 'summit', 'grove', 'echo'])
  const discoveredLandmarkIds = Array.isArray(record.discoveredLandmarkIds)
    ? [...new Set(record.discoveredLandmarkIds.filter(id => typeof id === 'string' && allowedIds.has(id)))]
    : []
  const events = validateWorldEvents(record.events).filter(event =>
    Math.abs(event.x) <= record.worldWidth! / 2 && Math.abs(event.z) <= record.worldWidth! / 2,
  )
  return {
    ...(record as SavedWorld),
    id: typeof record.id === 'string' ? record.id : 'imported-world',
    name: record.name.trim().slice(0, 64) || 'Imported world',
    savedAt: validNumber(record.savedAt) ? record.savedAt : Date.now(),
    heights: [...record.heights],
    history: record.history.map(item => ({ features: { ...item.features }, deltaSeconds: item.deltaSeconds })),
    discoveredLandmarkIds,
    events,
  }
}

export async function saveWorld(snapshot: SavedWorld): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE, 'readwrite')
    await requestResult(transaction.objectStore(STORE).put(snapshot))
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this world.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('World save was cancelled.'))
    })
  } finally {
    db.close()
  }
}

export interface SavedWorldSummary {
  id: string
  name: string
  savedAt: number
  seed: number
  preview: number[]
  sculptCount: number
  discoveredCount: number
  landmarkCount: number
  explorationPercent: number
  eventCount: number
  discoveredBiomeCount: number
}

export async function listSavedWorlds(): Promise<SavedWorldSummary[]> {
  const db = await openDatabase()
  try {
    const records = await requestResult<SavedWorld[]>(db.transaction(STORE, 'readonly').objectStore(STORE).getAll())
    const validRecords = records.flatMap(record => {
      try { return [normalizeSavedWorld(record, true)] } catch { return [] }
    })
    return validRecords.map(record => {
      const row = Math.floor(record.size / 2) * record.size
      const stride = Math.max(1, Math.floor(record.size / 40))
      const preview = Array.from({ length: Math.ceil(record.size / stride) }, (_, index) =>
        record.heights[row + Math.min(record.size - 1, index * stride)] ?? 0)
      const terrain = createTerrain(record.size, record.worldWidth, record.seed)
      terrain.heights.set(record.heights)
      terrain.frontX = record.frontX
      const traces = deriveSoundTraces(terrain, record.history)
      const landmarks = discoverWorldLandmarks(terrain, traces)
      const discovered = new Set(Array.isArray(record.discoveredLandmarkIds) ? record.discoveredLandmarkIds : [])
      const discoveredLandmarks = landmarks.filter(item => discovered.has(item.id))
      const discoveredCount = discoveredLandmarks.length
      const discoveredBiomeCount = new Set(discoveredLandmarks.map(item => item.biome)).size
      return {
        id: record.id, name: record.name, savedAt: record.savedAt, seed: record.seed,
        preview, sculptCount: record.history.length, discoveredCount,
        landmarkCount: landmarks.length,
        explorationPercent: landmarks.length ? Math.round(discoveredCount / landmarks.length * 100) : 0,
        eventCount: (record.events ?? []).length,
        discoveredBiomeCount,
      }
    }).sort((a, b) => b.savedAt - a.savedAt)
  } finally {
    db.close()
  }
}

export async function renameWorld(id: string, name: string): Promise<void> {
  const cleanName = name.trim().slice(0, 64)
  if (!cleanName) throw new Error('Enter a name for this world.')
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    const record = await requestResult<SavedWorld | undefined>(store.get(id))
    if (!record) throw new Error('Saved world not found.')
    record.name = cleanName
    await requestResult(store.put(record))
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not rename this world.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('World rename was cancelled.'))
    })
  } finally {
    db.close()
  }
}

export async function loadWorld(id: string): Promise<SavedWorld | undefined> {
  const db = await openDatabase()
  try {
    const record = await requestResult<SavedWorld | undefined>(db.transaction(STORE, 'readonly').objectStore(STORE).get(id))
    return record ? normalizeSavedWorld(record, true) : undefined
  } finally {
    db.close()
  }
}

export async function deleteWorld(id: string): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE, 'readwrite')
    await requestResult(transaction.objectStore(STORE).delete(id))
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete this world.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('World deletion was cancelled.'))
    })
  } finally {
    db.close()
  }
}

export function snapshotWorld(
  terrain: TerrainState,
  name: string,
  history: RecordedSculpt[],
  discoveredLandmarkIds: string[] = [],
  events: WorldEvent[] = [],
): SavedWorld {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `world-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: name.trim() || `World ${new Date().toLocaleString()}`,
    savedAt: Date.now(),
    version: 1,
    size: terrain.size,
    worldWidth: terrain.worldWidth,
    seed: terrain.seed,
    frontX: terrain.frontX,
    heights: Array.from(terrain.heights),
    history: history.map(item => ({ features: { ...item.features }, deltaSeconds: item.deltaSeconds })),
    discoveredLandmarkIds: [...new Set(discoveredLandmarkIds.filter(id => ['basin', 'summit', 'grove', 'echo'].includes(id)))],
    events: validateWorldEvents(events),
  }
}

export function restoreWorld(terrain: TerrainState, saved: SavedWorld): void {
  if (terrain.size !== saved.size || terrain.worldWidth !== saved.worldWidth) {
    throw new Error('This world uses a different terrain resolution and cannot be loaded here yet.')
  }
  terrain.heights.set(saved.heights)
  terrain.frontX = saved.frontX
  terrain.seed = saved.seed
}

export function parseWorldFile(value: unknown): SavedWorld {
  if (!value || typeof value !== 'object') throw new Error('This file is not a SYNESTHESIA world.')
  const envelope = value as { format?: unknown; formatVersion?: unknown; world?: unknown }
  if (envelope.format !== 'SYNESTHESIA_WORLD' || envelope.formatVersion !== 1 ||
    !envelope.world || typeof envelope.world !== 'object') {
    throw new Error('Unsupported world file. Choose a SYNESTHESIA world export.')
  }
  const record = normalizeSavedWorld(envelope.world)
  return {
    ...record,
    id: globalThis.crypto?.randomUUID?.() ?? `world-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    savedAt: Date.now(),
  } as SavedWorld
}
