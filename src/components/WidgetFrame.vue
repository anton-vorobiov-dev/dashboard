<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi" :class="widgetRef?.type === 'chart' ? 'pi-chart-line' : 'pi-table'" />
          <span>{{ widgetRef?.title }}</span>
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
            {{ view.name }}
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel v-for="view in views" :key="view.id" :value="view.id">
            <div class="flex items-center gap-2 mb-2">
              <!-- range controls -->
              <template v-if="view?.state?.chartKind !== 'donut'">
                <Button label="Last 7d" size="small" :outlined="view.state.dateRange !== '7d'"
                  @click="setRangeViaY(view.id, '7d')" />
                <Button label="30d" size="small" :outlined="view.state.dateRange !== '30d'"
                  @click="setRangeViaY(view.id, '30d')" />
                <Button label="90d" size="small" :outlined="view.state.dateRange !== '90d'"
                  @click="setRangeViaY(view.id, '90d')" />
              </template>
              <Tag v-if="isViewDirty(view.id)" value="view changed" severity="info" />

              <!-- chart kind selector (per view) -->
              <div class="ml-auto flex items-center gap-2">
                <span class="text-xs text-surface-500">Chart:</span>
                <SelectButton :options="chartKindOptions as any" optionLabel="label" optionValue="value"
                  :modelValue="view?.state?.chartKind ?? 'line'"
                  @update:modelValue="(v: 'line' | 'bar' | 'donut') => setChartKindViaY(view.id, v)" :allowEmpty="false"
                  size="small" />
              </div>
            </div>

            <component v-if="widgetRef?.type === 'chart'" :is="viewChartComp(view)" :view-id="view.id"
              :active="activeViewId === view.id" :key="widgetRef?.type + view.id" />
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
 * Adds per-view chart kind selector: 'line' | 'bar' | 'donut'
 * Stores selection in view.state.chartKind (in Y.Doc) so both tabs see it.
 */
import { computed, ref, watch } from 'vue'
import type * as Y from 'yjs'
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
import SelectButton from 'primevue/selectbutton'

import ChartView from './chart/ChartView.vue'
import BarChartView from './chart/BarChartView.vue'
import DonutChartView from './chart/DonutChartView.vue'

type ChartKind = 'line' | 'bar' | 'donut'

const props = defineProps<{ widgetId: string }>()
const dash = useDashStore()
const { widget, widgetViews, isWidgetDirty, isViewDirty } = storeToRefs(dash) as any

const widgetRef = computed(() => widget.value(props.widgetId))
const views = computed(() => widgetViews.value(props.widgetId))
const isDirty = computed(() => isWidgetDirty.value(props.widgetId))
const saving = computed(() => !!dash.saving.widget[props.widgetId])

const titleBuffer = ref('')
watch(widgetRef, (w) => (titleBuffer.value = w?.title ?? ''), { immediate: true })

const activeViewId = ref<string>('')
watch(views, (arr: Array<{ id: string }>) => {
  if (!arr?.length) return
  if (!arr.find(v => v.id === activeViewId.value)) activeViewId.value = arr[0].id
}, { immediate: true })

const collab = useCollab()

function setRangeViaY(viewId: string, range: '7d' | '30d' | '90d') {
  if (!collab) return
  const root = collab.doc.getMap('state') as Y.Map<any>
  const yViews = root.get('views') as Y.Map<any>
  const v = (yViews.get(viewId) as any) || {}
  const state = { ...(v.state || {}), dateRange: range }
  collab.doc.transact(() => yViews.set(viewId, { ...v, state }))
}

function setChartKindViaY(viewId: string, kind: ChartKind) {
  if (!collab) return
  const root = collab.doc.getMap('state') as Y.Map<any>
  const yViews = root.get('views') as Y.Map<any>
  const v = (yViews.get(viewId) as any) || {}
  const state = { ...(v.state || {}), chartKind: kind }
  collab.doc.transact(() => yViews.set(viewId, { ...v, state }))
}

function renameViaY() {
  const newTitle = titleBuffer.value
  if (!newTitle || newTitle === widgetRef.value?.title) return
  if (!collab) return
  const root = collab.doc.getMap('state') as Y.Map<any>
  const yWidgets = root.get('widgets') as Y.Map<any>
  const w = (yWidgets.get(props.widgetId) as any) || {}
  collab.doc.transact(() => yWidgets.set(props.widgetId, { ...w, title: newTitle }))
}

function save() { dash.saveWidget(props.widgetId) }
function resetWidgetLocal() { dash.resetWidget(props.widgetId) }

// helper to pick component by kind
function viewChartComp(view: any) {
  const kind: ChartKind = view?.state?.chartKind ?? 'line'
  return kind === 'bar' ? BarChartView : kind === 'donut' ? DonutChartView : ChartView
}

const chartKindOptions = [
  { label: 'Line', value: 'line' },
  { label: 'Bar', value: 'bar' },
  { label: 'Donut', value: 'donut' }
] as const
</script>

<style scoped>
.p-card {
  min-height: 420px;
  display: flex;
  flex-direction: column;
}
</style>
