// src/collab/useLocalBroadcast.ts
import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'

const u8ToB64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8))
const b64ToU8 = (b64: string) => new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)))

export function initLocalBroadcast(dashboardId: string, doc: Y.Doc, awareness: Awareness) {
  const bc = new BroadcastChannel(`y:${dashboardId}`)

  bc.onmessage = (ev) => {
    const { type, payload } = ev.data || {}
    if (type === 'y-update') Y.applyUpdate(doc, b64ToU8(payload), 'bc')
    if (type === 'awareness') applyAwarenessUpdate(awareness, b64ToU8(payload), 'bc')
  }

  const onDocUpdate = (update: Uint8Array, origin: any) => {
    if (origin === 'bc') return
    bc.postMessage({ type: 'y-update', payload: u8ToB64(update) })
  }
  doc.on('update', onDocUpdate)

  const onAwareness = ({ added, updated, removed }: any, origin: any) => {
    if (origin === 'bc') return
    const ids = [...added, ...updated, ...removed]
    const update = encodeAwarenessUpdate(awareness, ids)
    bc.postMessage({ type: 'awareness', payload: u8ToB64(update) })
  }
  awareness.on('update', onAwareness)

  return {
    destroy() {
      doc.off('update', onDocUpdate)
      awareness.off('update', onAwareness)
      bc.close()
    }
  }
}
