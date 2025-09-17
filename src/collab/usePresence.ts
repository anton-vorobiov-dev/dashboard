// Global presence (Figma-style) atop the whole page using Y.js Awareness.
// - Keeps a heartbeat to mark the local user as "online".
// - Exposes a reactive `online` list of users (fresh within STALE_MS).
// - No per-widget/view tracking here.

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCollab } from './provide'

export type PresenceUser = {
  userId: string
  name: string
  color: string
  lastSeen?: number
}

const STALE_MS = 15_000   // consider user offline if no heartbeat for 15s
const HEARTBEAT_MS = 5_000

export function usePresence() {
  const collab = useCollab() // provided synchronously in DashboardPage
  const now = ref(Date.now())
  const version = ref(0)     // bumps on awareness updates to trigger recompute

  let heartbeatTimer: number | null = null
  let tickTimer: number | null = null
  let detachAwareness: (() => void) | null = null

  // Pull all awareness states (non-reactive by default) and make it reactive
  const states = computed<PresenceUser[]>(() => {
    void version.value
    if (!collab) return []
    return Array.from(collab.awareness.getStates().values()) as PresenceUser[]
  })

  // Filter only "fresh" users
  const online = computed<PresenceUser[]>(() => {
    const t = now.value
    return states.value.filter(s => (t - (s.lastSeen ?? 0)) < STALE_MS)
  })

  function heartbeatOnce() {
    if (!collab) return
    collab.awareness.setLocalStateField('lastSeen', Date.now())
  }

  onMounted(() => {
    if (collab) {
      const onAwarenessUpdate = () => (version.value++)
      collab.awareness.on('update', onAwarenessUpdate)
      detachAwareness = () => collab.awareness.off('update', onAwarenessUpdate)
      heartbeatOnce()
    }
    heartbeatTimer = window.setInterval(heartbeatOnce, HEARTBEAT_MS)
    tickTimer = window.setInterval(() => (now.value = Date.now()), 1_000)

    const onVis = () => { if (document.visibilityState === 'visible') heartbeatOnce() }
    document.addEventListener('visibilitychange', onVis)
    const prev = detachAwareness
    detachAwareness = () => { prev && prev(); document.removeEventListener('visibilitychange', onVis) }
  })

  onBeforeUnmount(() => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (tickTimer) clearInterval(tickTimer)
    detachAwareness && detachAwareness()
  })

  return { online }
}
