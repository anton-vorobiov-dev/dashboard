<!-- src/components/DashboardPage.vue -->
<template>
  <div class="p-4 space-y-3">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-semibold">{{ dashboard_?.name }}</h2>

      <p-badge v-if="dirtyCount > 0" :value="`${dirtyCount} unsaved`" severity="warning" />
      <p-button label="Reset dashboard" icon="pi pi-refresh" severity="secondary" text outlined
        :disabled="dirtyCount === 0" @click="resetDash" />
      <p-button label="Save dashboard" icon="pi pi-save" :loading="savingDash" :disabled="dirtyCount === 0"
        @click="saveDash" />
    </div>

    <div class="grid md:grid-cols-2 gap-3">
      <WidgetFrame v-for="wid in dashboard_?.widgetIds" :key="wid" :widget-id="wid" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useDashStore } from '@/stores/dashboard'
import WidgetFrame from './WidgetFrame.vue'
import Button from 'primevue/button'
import Badge from 'primevue/badge'

const dash = useDashStore()
const { dashboard, countDirtyWidgets } = storeToRefs(dash) as any

const dashboardId = 'd1'
const dashboardRef = computed(() => dashboard.value(dashboardId))
const dirtyCount = computed(() => countDirtyWidgets.value(dashboardId))
const savingDash = computed(() => !!dash.saving.dashboard[dashboardId])

function saveDash() {
  dash.saveDashboard(dashboardId)
}

function resetDash() {
  // if (!confirm('Reset the whole dashboard to last saved state?')) return
  dash.resetDashboard(dashboardId)
}

// onMounted(() => {
//   if (!dashboardRef.value) dash.loadInitial()
//   await dash.bootstrap()
// })

onMounted(async () => {
  await dash.bootstrap()        // ← гідратація з IndexedDB або сід
})

const dashboard_ = dashboardRef // alias for template
</script>

<script lang="ts">
export default {
  components: { 'p-button': Button, 'p-badge': Badge }
}
</script>
