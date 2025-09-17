<!-- src/components/WidgetFrame.vue -->
<template>
  <div>
    <!-- <template #title> -->
    <div class="w-full flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i class="pi" :class="widgetRef?.type === 'chart' ? 'pi-chart-line' : 'pi-table'" />
        <span>{{ widgetRef?.title }}</span>
        <p-tag v-if="isDirty" value="Unsaved" severity="warning" />
      </div>

      <div class="flex w-full justify-space-between items-center gap-2">
        <p-inputtext v-model="titleBuffer" class="w-48" @blur="rename" />
        <p-button label="Reset" icon="pi pi-refresh" size="small" severity="secondary" text outlined
          :disabled="!isDirty" @click="resetWidgetLocal" />
        <p-button label="Save widget" icon="pi pi-save" size="small" :loading="saving" :disabled="!isDirty"
          @click="save" />
      </div>
    </div>
    <!-- </template> -->

    <div>
      <!-- v4 Tabs -->
      <Tabs v-model:value="activeViewId" scrollable>
        <TabList>
          <Tab v-for="view in views" :key="view.id" :value="view.id">
            {{ view.name }}
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel v-for="view in views" :key="view.id" :value="view.id">
            <div class="flex items-center gap-2 mb-2">
              <p-button label="Last 7d" size="small" outlined @click="setRange(view.id, '7d')" />
              <p-button label="30d" size="small" outlined @click="setRange(view.id, '30d')" />
              <p-button label="90d" size="small" outlined @click="setRange(view.id, '90d')" />
              <p-tag v-if="isViewDirty(view.id)" value="view changed" severity="info" />
            </div>

            <!-- важливо: передаємо, чи панель активна -->
            <ChartView v-if="widgetRef?.type === 'chart'" :view-id="view.id" :active="activeViewId === view.id" />
            <div v-else class="p-3 border rounded">Table placeholder</div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDashStore } from '@/stores/dashboard' // ← переконайся, що шлях до стора правильний

import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'

import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

import ChartView from './chart/ChartView.vue'

const props = defineProps<{ widgetId: string }>()

const dash = useDashStore()
const { widget, widgetViews, isWidgetDirty, isViewDirty } = storeToRefs(dash) as any

const widgetRef = computed(() => widget.value(props.widgetId))
const views = computed(() => widgetViews.value(props.widgetId))
const isDirty = computed(() => isWidgetDirty.value(props.widgetId))
const saving = computed(() => !!dash.saving.widget[props.widgetId])


const titleBuffer = ref('')
watch(widgetRef, (w) => (titleBuffer.value = w?.title ?? ''), { immediate: true })

// керуємо активною вкладкою через id
const activeViewId = ref<string>('')

watch(views, (arr) => {
  if (!arr?.length) return
  if (!arr.find(v => v.id === activeViewId.value)) {
    activeViewId.value = arr[0].id
  }
}, { immediate: true })

function setRange(viewId: string, range: '7d' | '30d' | '90d') {
  dash.updateViewState(viewId, { dateRange: range })
}
function rename() {
  if (titleBuffer.value && titleBuffer.value !== widgetRef.value?.title) {
    dash.renameWidget(props.widgetId, titleBuffer.value)
  }
}
function save() {
  dash.saveWidget(props.widgetId)
}

function resetWidgetLocal() {
  // можна кинути confirm(), якщо треба підтвердження:
  // if (!confirm('Reset this widget to last saved state?')) return
  dash.resetWidget(props.widgetId)
}
</script>

<script lang="ts">
export default {
  components: {
    'p-card': Card,
    'p-button': Button,
    'p-tag': Tag,
    'p-inputtext': InputText,
    Tabs, TabList, Tab, TabPanels, TabPanel
  }
}
</script>

<style scoped>
.p-card {
  height: 420px;
  display: flex;
  flex-direction: column;
}
</style>
