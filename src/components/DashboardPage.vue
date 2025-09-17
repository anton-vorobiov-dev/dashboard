<!-- src/components/DashboardPage.vue -->
<template>
  <div class="p-4 space-y-3">
    <div class="flex justify-between items-center gap-3">
      <div class="flex gap-2 items-center">
        <h2 class="text-xl font-semibold">{{ dashboardRef?.name }}</h2>
        <Badge v-if="dirtyCount > 0" :value="`${dirtyCount} unsaved`" severity="warning" />
      </div>

      <div class="flex gap-2">
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
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useDashStore } from '@/stores/dashboard'
import WidgetFrame from '@/components/WidgetFrame.vue'
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
  dash.resetDashboard(dashboardId)
}

onMounted(async () => {
  await dash.bootstrap()
})
</script>
