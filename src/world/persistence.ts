import type { AcousticFeatures } from '../audio/features'
import type { TerrainState } from './terrain'

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
}

export async function listSavedWorlds(): Promise<SavedWorldSummary[]> {
  const db = await openDatabase()
  try {
    const records = await requestResult<SavedWorld[]>(db.transaction(STORE, 'readonly').objectStore(STORE).getAll())
    return records.map(record => {
      const row = Math.floor(record.size / 2) * record.size
      const stride = Math.max(1, Math.floor(record.size / 40))
      const preview = Array.from({ length: Math.ceil(record.size / stride) }, (_, index) =>
        record.heights[row + Math.min(record.size - 1, index * stride)] ?? 0)
      return { id: record.id, name: record.name, savedAt: record.savedAt, seed: record.seed, preview, sculptCount: record.history.length }
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
    if (!record || record.version !== 1 || !Array.isArray(record.heights) ||
      record.heights.length !== record.size * record.size ||
      !Array.isArray(record.history) ||
      !record.history.every(item => Number.isFinite(item.deltaSeconds) && item.features &&
        Number.isFinite(item.features.rms) && Number.isFinite(item.features.timestamp))) {
      throw new Error('This saved world is invalid or uses an unsupported format.')
    }
    return record
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
