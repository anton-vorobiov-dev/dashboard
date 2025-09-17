// src/lib/idb.ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { toRaw } from 'vue'

// 🔧 робимо звичайний plain-об'єкт (без Proxy/refs/functions)
function toPlain<T>(v: T): T {
  // знімаємо верхній Proxy
  const raw = toRaw(v) as any
  // глибока серіалізація у JSON (нашi дані — прості POJO, тож ок)
  return JSON.parse(JSON.stringify(raw))
}

interface FinanceDB extends DBSchema {
  dashboards: { key: string; value: any }
  widgets: { key: string; value: any }
  views: { key: string; value: any }

  snapshot_dashboards: { key: string; value: any }
  snapshot_widgets: { key: string; value: any }
  snapshot_views: { key: string; value: any }

  meta: { key: string; value: any }
}

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

export async function putMany<T>(store: keyof FinanceDB, entries: Record<string, T>) {
  const db = await getDB()
  const tx = db.transaction(store, 'readwrite')
  for (const [k, v] of Object.entries(entries)) {
    await tx.store.put(toPlain(v), k)   // ← 👈 важливо
  }
  await tx.done
}

export async function getAll<T>(store: keyof FinanceDB): Promise<Record<string, T>> {
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

export async function putOne<T>(store: keyof FinanceDB, key: string, value: T) {
  const db = await getDB()
  await db.put(store, toPlain(value) as any, key)  // ← 👈 і тут
}

export async function clearStore(store: keyof FinanceDB) {
  const db = await getDB()
  await db.clear(store)
}
