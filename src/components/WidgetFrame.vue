<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi" :class="widgetRef?.type === 'chart' ? 'pi-chart-line' : 'pi-table'" />
            <span>{{ widgetRef?.title }}</span>
          </div>
          <Tag v-if="isDirty" value="Unsaved" severity="warning" />
        </div>

        <div class="flex items-center gap-3">
          <InputText v-model="titleBuffer" class="w-48" @blur="renameViaY" />
        </div>
      </div>
    </template>

    <template #content>
      <Tabs v-model:value="activeViewId" scrollable>
        <TabList>
          <Tab v-for="view in views" :key="view.id" :value="view.id">
            Tab: {{ view.name }}
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel v-for="view in views" :key="view.id" :value="view.id">
            <div class="flex items-center gap-2 mb-2">
              <Button label="Last 7d" size="small" outlined @click="setRangeViaY(view.id, '7d')" />
              <Button label="30d" size="small" outlined @click="setRangeViaY(view.id, '30d')" />
              <Button label="90d" size="small" outlined @click="setRangeViaY(view.id, '90d')" />
              <Tag v-if="isViewDirty(view.id)" value="view changed" severity="info" />
            </div>

            <ChartView v-if="widgetRef?.type === 'chart'" :view-id="view.id" :active="activeViewId === view.id" />
            <div v-else class="p-3 border rounded">Table placeholder</div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>

    <template #footer>
      <div class="w-full flex justify-between">
        <Button label="Reset" icon="pi pi-refresh" size="small" severity="secondary" text outlined :disabled="!isDirty"
          @click="resetWidgetLocal" />

        <Button label="Save widget" icon="pi pi-save" size="small" :loading="saving" :disabled="!isDirty"
          @click="save" />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
/**
 * Widget frame without any per-widget presence.
 * Edits are written directly to Y.Doc; Y->Pinia binding in the parent updates UI.
 */
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDashStore } from '@/stores/dashboard'
import { useCollab } from '@/collab/provide'

import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

import ChartView from '@/components/chart/ChartView.vue'

const props = defineProps<{ widgetId: string }>()

const dash = useDashStore()
const { widget, widgetViews, isWidgetDirty, isViewDirty } = storeToRefs(dash) as any

const widgetRef = computed(() => widget.value(props.widgetId))
const views = computed(() => widgetViews.value(props.widgetId))
const isDirty = computed(() => isWidgetDirty.value(props.widgetId))
const saving = computed(() => !!dash.saving.widget[props.widgetId])

const titleBuffer = ref('')
watch(widgetRef, (w) => (titleBuffer.value = w?.title ?? ''), { immediate: true })

// Active tab (tracks view.id)
const activeViewId = ref<string>('')
watch(views, (arr) => {
  if (!arr?.length) return
  if (!arr.find(v => v.id === activeViewId.value)) activeViewId.value = arr[0].id
}, { immediate: true })

// Write edits directly into Y.Doc (parent observes Y->Pinia)
const collab = useCollab()

function setRangeViaY(viewId: string, range: '7d' | '30d' | '90d') {
  if (!collab) return
  const root = collab.doc.getMap('state')
  const yViews = root.get('views')
  const v = yViews.get(viewId) || {}
  const state = { ...(v.state || {}), dateRange: range }
  collab.doc.transact(() => yViews.set(viewId, { ...v, state }))
}

function renameViaY() {
  const newTitle = titleBuffer.value
  if (!newTitle || newTitle === widgetRef.value?.title) return
  if (!collab) return
  const root = collab.doc.getMap('state')
  const yWidgets = root.get('widgets')
  const w = yWidgets.get(props.widgetId) || {}
  collab.doc.transact(() => yWidgets.set(props.widgetId, { ...w, title: newTitle }))
}

// Save/Reset use your existing store actions (snapshots + IndexedDB)
function save() { dash.saveWidget(props.widgetId) }
function resetWidgetLocal() { dash.resetWidget(props.widgetId) }
</script>

<script lang="ts">
export default {
  components: {
    Card, Button, Tag, InputText,
    Tabs, TabList, Tab, TabPanels, TabPanel,
    ChartView
  }
}
</script>

<style scoped>
/* Keep the card layout height; underlying element still has .p-card class */
.p-card {
  min-height: 420px;
  display: flex;
  flex-direction: column;
}
</style>
