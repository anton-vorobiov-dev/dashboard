// src/collab/usePresence.ts
// Presence service (Figma-style) with explicit start/stop and a tiny hook.
// - No Vue lifecycle APIs here, so it can be used anywhere without warnings.
// - DashboardPage should call startPresence(awareness) once and stopPresence() on unmount.

import { ref, computed } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

export type PresenceUser = {
  userId: string
  name: string
  color: string
  lastSeen?: number
}

const STALE_MS = 15_000
const HEARTBEAT_MS = 5_000

let awarenessRef: Awareness | null = null
let hbTimer: number | null = null
let tickTimer: number | null = null
let offAwareness: (() => void) | null = null

const onlineRef = ref<PresenceUser[]>([])

function recompute() {
  if (!awarenessRef) { onlineRef.value = []; return }
  const t = Date.now()
  const arr = Array.from(awarenessRef.getStates().values()) as PresenceUser[]
  onlineRef.value = arr.filter(s => (t - (s.lastSeen ?? 0)) < STALE_MS)
}

function heartbeat() {
  if (!awarenessRef) return
  awarenessRef.setLocalStateField('lastSeen', Date.now())
}

function onVisibility() {
  if (document.visibilityState === 'visible') heartbeat()
}

/** Call once per page after you have an Awareness instance */
export function startPresence(a: Awareness) {
  if (awarenessRef) return // already started
  awarenessRef = a

  const onAw = () => recompute()
  a.on('update', onAw)
  offAwareness = () => a.off('update', onAw)

  // initial push
  heartbeat()
  recompute()

  // timers
  hbTimer = window.setInterval(heartbeat, HEARTBEAT_MS)
  tickTimer = window.setInterval(recompute, 1000)

  // visibility refresh
  document.addEventListener('visibilitychange', onVisibility)
}

/** Call on page unmount */
export function stopPresence() {
  if (!awarenessRef) return
  offAwareness?.()
  offAwareness = null
  if (hbTimer) { clearInterval(hbTimer); hbTimer = null }
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
  document.removeEventListener('visibilitychange', onVisibility)
  awarenessRef = null
  onlineRef.value = []
}

/** Tiny hook to read the reactive list */
export function usePresence() {
  return { online: computed(() => onlineRef.value) }
}
