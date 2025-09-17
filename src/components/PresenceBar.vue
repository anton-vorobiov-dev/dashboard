<template>
  <div class="flex items-center gap-2">
    <!-- Inline avatar stack with tooltips -->
    <div v-if="online.length" class="flex -space-x-2">
      <Avatar v-for="u in online" :key="u.userId" :label="initials(u.name)" shape="circle" size="normal"
        class="ring-2 ring-surface-0" :style="{ backgroundColor: u.color, color: 'white' }" v-tooltip="tooltipFor(u)" />
    </div>

    <Tag :value="online.length === 1 ? 'Only you online' : online.length + ' online'" />
  </div>
</template>

<script setup lang="ts">
// Global presence bar with per-avatar tooltips.
// If avatar belongs to the local user, tooltip shows "You".
import { usePresence } from '@/collab/usePresence'
import { getOrCreateIdentity } from '@/collab/names'
import Avatar from 'primevue/avatar'
import Tag from 'primevue/tag'

const { online } = usePresence()
const me = getOrCreateIdentity()

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

const tooltipFor = (u: { userId: string; name: string }) =>
  u.userId === me.id ? 'You' : u.name
</script>

<script lang="ts">
export default {
  components: { Avatar, Tag },
}
</script>

<style>
:deep(.p-avatar-label) {
  user-select: none;
  -webkit-user-select: none;
}
</style>
