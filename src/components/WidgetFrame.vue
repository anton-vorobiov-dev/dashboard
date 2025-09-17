<!-- src/components/WidgetFrame.vue -->
<template>
  <Card>
    <template #title>
      <div class="w-full flex items-center justify-between">
        <div class="flex items-center gap-2 flex-grow w-max max-w-[75%]">
          <i class="pi" :class="widgetRef?.type === 'chart' ? 'pi-chart-line' : 'pi-table'" />
          <span class="w-max max-w-[75%]">{{ widgetRef?.title }}</span>
          <Tag v-if="isDirty" value="Unsaved" severity="warning" />
        </div>

        <div class="flex">
          <InputText v-model="titleBuffer" class="w-48" @blur="rename" />
        </div>
      </div>
    </template>

    <template #content>
      <div>
        <Tabs v-model:value="activeViewId" scrollable>
          <TabList class="">
            <Tab v-for="view in views" :key="view.id" :value="view.id">
              Tab: {{ view.name }}
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel v-for="view in views" :key="view.id" :value="view.id">
              <div class="flex items-center gap-2 mb-2">
                <Button label="Last 7d" size="small" outlined @click="setRange(view.id, '7d')" />
                <Button label="30d" size="small" outlined @click="setRange(view.id, '30d')" />
                <Button label="90d" size="small" outlined @click="setRange(view.id, '90d')" />
                <Tag v-if="isViewDirty(view.id)" value="view changed" severity="info" />
              </div>

              <ChartView v-if="widgetRef?.type === 'chart'" :view-id="view.id" :active="activeViewId === view.id" />
              <div v-else class="p-3 border rounded">Table placeholder</div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-4 mt-1">
        <Button label="Reset" icon="pi pi-refresh" size="small" severity="secondary" text outlined :disabled="!isDirty"
          @click="resetWidgetLocal" />
        <Button label="Save widget" icon="pi pi-save" size="small" :loading="saving" :disabled="!isDirty"
          @click="save" />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDashStore } from '@/stores/dashboard'

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
  dash.resetWidget(props.widgetId)
}
</script>

<style scoped>
.p-card {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

:deep(.p-tablist-tab-list) {
  border: none;
  display: flex;
  gap: .75rem;
}
</style>
