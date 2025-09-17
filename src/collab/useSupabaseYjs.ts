// src/collab/useSupabaseYjs.ts
import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { IndexeddbPersistence } from 'y-indexeddb'

const u8ToB64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8))
const b64ToU8 = (b64: string) => new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)))

export interface CollabCtx {
  doc: Y.Doc
  awareness: Awareness
  channel: RealtimeChannel
  destroy: () => void
}

export async function initCollab({
  supabase,
  dashboardId,
  user
}: {
  supabase: SupabaseClient,
  dashboardId: string,
  user: { id: string; name: string; color?: string }
}): Promise<CollabCtx> {
  const doc = new Y.Doc()
  const awareness = new Awareness(doc)

  const idb = new IndexeddbPersistence(`y:${dashboardId}`, doc)
  await idb.whenSynced

  awareness.setLocalState({
    userId: user.id,
    name: user.name,
    color: user.color || '#4f46e5',
    activeViewId: null
  })

  const channel = supabase.channel(`doc:${dashboardId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: user.id }
    }
  })

  channel.on('broadcast', { event: 'y-update' }, (payload) => {
    const update = b64ToU8(payload.payload.update)
    Y.applyUpdate(doc, update, 'sb')
  })

  channel.on('broadcast', { event: 'awareness' }, (payload) => {
    const update = b64ToU8(payload.payload.update)
    applyAwarenessUpdate(awareness, update, 'sb')
  })

  const onDocUpdate = (update: Uint8Array, origin: any) => {
    if (origin === 'sb') return 
    channel.send({
      type: 'broadcast',
      event: 'y-update',
      payload: { update: u8ToB64(update) }
    })
  }
  doc.on('update', onDocUpdate)

  const onAwareness = ({ added, updated, removed }: any, origin: any) => {
    if (origin === 'sb') return
    const ids = [...added, ...updated, ...removed]
    const update = encodeAwarenessUpdate(awareness, ids)
    channel.send({ type: 'broadcast', event: 'awareness', payload: { update: u8ToB64(update) } })
  }
  awareness.on('update', onAwareness)

  await channel.subscribe()

  return {
    doc,
    awareness,
    channel,
    destroy() {
      doc.off('update', onDocUpdate)
      awareness.off('update', onAwareness)
      channel.unsubscribe()
      doc.destroy()
    }
  }
}
