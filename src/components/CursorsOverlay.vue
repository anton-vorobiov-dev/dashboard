<template>
  <!-- Full-page overlay; does not intercept pointer events -->
  <div class="fixed inset-0 pointer-events-none z-[9999]">
    <!-- Render remote cursors (exclude self) -->
    <div v-for="c in remoteCursors" :key="c.userId" class="absolute will-change-transform"
      :style="{ transform: `translate(${Math.round(c.x)}px, ${Math.round(c.y)}px)` }">
      <!-- Cursor glyph -->
      <svg width="18" height="26" viewBox="0 0 18 26" fill="none"
        :style="{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))' }">
        <!-- simple pointer shape -->
        <path :fill="c.color" d="M2 1 L16 13 L10 14 L9 23 L6 23 L7 14 L2 13 Z" />
        <path fill="white" fill-opacity=".85" d="M2 1 L16 13 L10 14 L9 23 L8 23 L8 14 L2 13 Z" />
      </svg>

      <!-- Name badge -->
      <div class="mt-1 px-2 py-0.5 rounded text-xs font-medium text-white" :style="{ backgroundColor: c.color }">
        {{ c.isYou ? 'You' : c.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Global cursors overlay using Y.js Awareness.
// - Sends local cursor (clientX/Y) on pointermove throttled to rAF.
// - Renders other users' cursors with name bubbles.
// - Excludes self and stale users.

import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useCollab } from '@/collab/provide'
import { getOrCreateIdentity } from '@/collab/names'

type CursorState = { x: number; y: number; visible?: boolean }
type AwarenessState = {
  userId: string
  name: string
  color: string
  lastSeen?: number
  cursor?: CursorState
}

const collab = useCollab() // provided in DashboardPage
const me = getOrCreateIdentity()

const now = ref(Date.now())
const version = ref(0) // bumps when awareness updates
const STALE_MS = 15_000

// Derive remote cursors (others, visible, fresh)
const remoteCursors = computed(() => {
  void version.value; // dependency on awareness changes
  if (!collab) return []
  const t = now.value
  const arr = Array.from(collab.awareness.getStates().values()) as AwarenessState[]
  return arr
    .filter(s => s.userId !== me.id)
    .filter(s => (t - (s.lastSeen ?? 0)) < STALE_MS)
    .filter(s => !!s.cursor?.visible)
    .map(s => ({
      userId: s.userId,
      name: s.name,
      color: s.color,
      x: s.cursor!.x,
      y: s.cursor!.y,
      isYou: false
    }))
})

// rAF-throttled sender for local cursor
let scheduled = false
let lastX = 0, lastY = 0

function scheduleSend() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    if (!collab) return
    // update cursor + heartbeat
    collab.awareness.setLocalStateField('cursor', { x: lastX, y: lastY, visible: true })
    collab.awareness.setLocalStateField('lastSeen', Date.now())
    scheduled = false
  })
}

// Handlers
function onMove(e: PointerEvent) {
  lastX = e.clientX
  lastY = e.clientY
  scheduleSend()
}
function onEnter() {
  if (!collab) return
  collab.awareness.setLocalStateField('cursor', { x: lastX, y: lastY, visible: true })
  collab.awareness.setLocalStateField('lastSeen', Date.now())
}
function onLeave() {
  if (!collab) return
  collab.awareness.setLocalStateField('cursor', { x: lastX, y: lastY, visible: false })
}
function onVisChange() {
  if (document.visibilityState === 'hidden') onLeave()
  else onEnter()
}

onMounted(() => {
  if (!collab) return
  const onAwarenessUpdate = () => (version.value++)
  collab.awareness.on('update', onAwarenessUpdate)

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerenter', onEnter, { passive: true })
  window.addEventListener('pointerleave', onLeave, { passive: true })
  document.addEventListener('visibilitychange', onVisChange)

  // Tick clock to expire stale users smoothly
  const tick = setInterval(() => (now.value = Date.now()), 1000)

  onBeforeUnmount(() => {
    collab.awareness.off('update', onAwarenessUpdate)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerenter', onEnter)
    window.removeEventListener('pointerleave', onLeave)
    document.removeEventListener('visibilitychange', onVisChange)
    clearInterval(tick)
    // ensure we hide our cursor on unmount
    onLeave()
  })
})
</script>

<style scoped>
/* Nothing special; we pin the overlay to the viewport. */
</style>
