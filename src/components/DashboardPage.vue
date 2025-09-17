<template>
  <div class="p-4 space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div class="flex gap-2 items-center">
        <h2 class="text-xl font-semibold">{{ dashboardRef?.name }}</h2>
        <Badge v-if="dirtyCount > 0" :value="`${dirtyCount} unsaved`" severity="warning" />
      </div>
      <!-- Global presence bar (Figma-style) -->
      <PresenceBar />

      <div class="flex gap-2 items-center">
        <Button label="Reset dashboard" icon="pi pi-refresh" severity="secondary" text outlined
          :disabled="dirtyCount === 0" @click="resetDash" />

        <Button label="Save dashboard" icon="pi pi-save" :loading="savingDash" :disabled="dirtyCount === 0"
          @click="saveDash" />
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-3">
      <WidgetFrame v-for="wid in dashboardRef?.widgetIds" :key="wid" :widget-id="wid" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Dashboard page with global presence only.
 * - Provides Y.Doc & Awareness synchronously (so children can inject).
 * - Binds Y state -> Pinia (observeDeep) to reflect realtime edits.
 * - Uses BroadcastChannel for local "multiplayer" dev testing.
 */
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDashStore } from '@/stores/dashboard'
import WidgetFrame from '@/components/WidgetFrame.vue'
import PresenceBar from '@/components/PresenceBar.vue'

import Button from 'primevue/button'
import Badge from 'primevue/badge'

/* ---- Collab (Y.js + BroadcastChannel) ---- */
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { IndexeddbPersistence } from 'y-indexeddb'
import { initLocalBroadcast } from '@/collab/useLocalBroadcast'
import { provideCollab } from '@/collab/provide'
import { getOrCreateIdentity } from '@/collab/names'

const dash = useDashStore()
const { dashboard, countDirtyWidgets } = storeToRefs(dash) as any

const dashboardId = 'd1'
const dashboardRef = computed(() => dashboard.value(dashboardId))
const dirtyCount = computed(() => countDirtyWidgets.value(dashboardId))
const savingDash = computed(() => !!dash.saving.dashboard[dashboardId])

function saveDash() { dash.saveDashboard(dashboardId) }
function resetDash() { dash.resetDashboard(dashboardId) }

let cleanup: Array<() => void> = []

/** Create doc/awareness synchronously and provide immediately */
const doc = new Y.Doc()
const awareness = new Awareness(doc)
provideCollab({ doc, awareness, destroy: () => { } })

onMounted(async () => {
  // Load current & snapshots from IndexedDB (your store bootstrap)
  await dash.bootstrap()

  // Local identity (Savanna-style name & color)
  const me = getOrCreateIdentity()
  awareness.setLocalState({ userId: me.id, name: me.name, color: me.color, lastSeen: Date.now() })

  // Offline cache for Y document (separate from your Pinia/IDB)
  const idb = new IndexeddbPersistence(`y:${dashboardId}`, doc)
  await idb.whenSynced

  // Ensure root maps exist
  const root = doc.getMap('state')
  if (!root.has('dashboards')) root.set('dashboards', new Y.Map())
  if (!root.has('widgets')) root.set('widgets', new Y.Map())
  if (!root.has('views')) root.set('views', new Y.Map())

  const yDash = root.get('dashboards') as Y.Map<any>
  const yWid = root.get('widgets') as Y.Map<any>
  const yView = root.get('views') as Y.Map<any>

  // If Y is empty, seed it from current store (first load)
  if (yDash.size === 0 && Object.keys(dash.dashboards).length) {
    doc.transact(() => {
      for (const [k, v] of Object.entries(dash.dashboards)) yDash.set(k, JSON.parse(JSON.stringify(v)))
      for (const [k, v] of Object.entries(dash.widgets)) yWid.set(k, JSON.parse(JSON.stringify(v)))
      for (const [k, v] of Object.entries(dash.views)) yView.set(k, JSON.parse(JSON.stringify(v)))
    })
  }

  // Minimal Y -> Pinia binding (so UI reacts to remote edits)
  const pushAll = () => {
    dash.dashboards = yDash.toJSON()
    dash.widgets = yWid.toJSON()
    dash.views = yView.toJSON()
  }
  const obs = () => pushAll()
  yDash.observeDeep(obs)
  yWid.observeDeep(obs)
  yView.observeDeep(obs)
  cleanup.push(() => {
    yDash.unobserveDeep(obs)
    yWid.unobserveDeep(obs)
    yView.unobserveDeep(obs)
  })
  // Initial push
  pushAll()

  // Dev multiplayer via BroadcastChannel (replace with Supabase in prod)
  const bc = initLocalBroadcast(dashboardId, doc, awareness)
  cleanup.push(() => bc.destroy())
})

onBeforeUnmount(() => cleanup.forEach(fn => fn()))
</script>

<script lang="ts">
export default {
  components: { Button, Badge, WidgetFrame, PresenceBar }
}
</script>
