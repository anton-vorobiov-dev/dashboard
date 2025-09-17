// src/lib/idb.ts
import { openDB, type DBSchema, type IDBPDatabase, type StoreNames } from 'idb'
import { toRaw } from 'vue'
import type { Dashboard, Widget, View } from '@/stores/dashboard'

// Make sure values are plain JSON (no Vue proxies/functions)
function toPlain<T>(v: T): T {
  const raw = toRaw(v) as any
  return JSON.parse(JSON.stringify(raw))
}

interface FinanceDB extends DBSchema {
  dashboards: { key: string; value: Dashboard }
  widgets: { key: string; value: Widget }
  views: { key: string; value: View }

  snapshot_dashboards: { key: string; value: Dashboard }
  snapshot_widgets: { key: string; value: Widget }
  snapshot_views: { key: string; value: View }

  meta: { key: string; value: any }
}

// Use the exact literal union that idb expects
type StoreName = StoreNames<FinanceDB>;

let _db: IDBPDatabase<FinanceDB> | null = null

export async function getDB() {
  if (_db) return _db
  _db = await openDB<FinanceDB>('finance-dash', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('dashboards')) db.createObjectStore('dashboards')
      if (!db.objectStoreNames.contains('widgets')) db.createObjectStore('widgets')
      if (!db.objectStoreNames.contains('views')) db.createObjectStore('views')

      if (!db.objectStoreNames.contains('snapshot_dashboards')) db.createObjectStore('snapshot_dashboards')
      if (!db.objectStoreNames.contains('snapshot_widgets')) db.createObjectStore('snapshot_widgets')
      if (!db.objectStoreNames.contains('snapshot_views')) db.createObjectStore('snapshot_views')

      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
  })
  return _db
}

export async function putMany<T>(store: StoreName, entries: Record<string, T>) {
  const db = await getDB()
  const tx = db.transaction(store, 'readwrite')
  for (const [k, v] of Object.entries(entries)) {
    await tx.store.put(toPlain(v) as any, k)
  }
  await tx.done
}

export async function getAll<T>(store: StoreName): Promise<Record<string, T>> {
  const db = await getDB()
  const tx = db.transaction(store, 'readonly')
  const keys = await tx.store.getAllKeys()
  const out: Record<string, T> = {}
  for (const k of keys as string[]) {
    out[k] = (await tx.store.get(k)) as T
  }
  await tx.done
  return out
}

export async function putOne<T>(store: StoreName, key: string, value: T) {
  const db = await getDB()
  await db.put(store, toPlain(value) as any, key)
}

export async function clearStore(store: StoreName) {
  const db = await getDB()
  await db.clear(store)
}
