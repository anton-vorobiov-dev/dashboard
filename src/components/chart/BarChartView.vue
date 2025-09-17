<script setup lang="ts">
/**
 * Bar chart with robust sizing:
 * - init only when active & visible
 * - nextTick + rAF before init/resize
 * - ResizeObserver + window/visibility handlers
 */
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useDashStore } from '@/stores/dashboard'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, DatasetComponent, DataZoomComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([BarChart, TooltipComponent, GridComponent, DatasetComponent, DataZoomComponent, CanvasRenderer])

const props = defineProps<{ viewId: string; active?: boolean }>()
const isActive = computed(() => !!props.active)
const dash = useDashStore()
const viewRef = computed(() => dash.views?.[props.viewId] ?? null)
const daysForRange = (r?: string) => (r === '90d' ? 90 : r === '30d' ? 30 : 7)

function makeData() {
  const r = viewRef.value?.state?.dateRange as string | undefined
  const n = daysForRange(r)
  const today = new Date()
  const labels: string[] = []
  const values: number[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`)
    values.push(Math.round(50 + Math.random() * 50))
  }
  return { labels, values }
}

const data = computed(makeData)

const el = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

const visibleWidth = () => (el.value ? el.value.getBoundingClientRect().width : 0)

async function afterVisibleResize() {
  await nextTick()
  requestAnimationFrame(() => {
    if (!el.value) return
    if (!chart) {
      // init only when container has a real width
      const w = visibleWidth()
      if (w <= 0) {
        // try again next frame
        requestAnimationFrame(() => { if (!chart) afterVisibleResize() })
        return
      }
      chart = echarts.init(el.value!)
    }
    render()
    chart.resize()
  })
}

function render() {
  if (!chart) return
  chart.setOption({
    grid: { left: 40, right: 16, top: 10, bottom: 30 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.value.labels },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: data.value.values }]
  })
}

watch(() => viewRef.value?.state?.dateRange, () => { if (chart) render() })
watch(isActive, (a) => { if (a) afterVisibleResize() })

onMounted(() => {
  if (isActive.value) afterVisibleResize()

  // ResizeObserver to follow container size
  if ('ResizeObserver' in window && el.value) {
    ro = new ResizeObserver(() => { if (chart) chart.resize() })
    ro.observe(el.value)
  }
  // Window + tab visibility
  const onWin = () => chart?.resize()
  const onVis = () => { if (document.visibilityState === 'visible' && isActive.value) afterVisibleResize() }
  window.addEventListener('resize', onWin)
  document.addEventListener('visibilitychange', onVis)

  // cleanup
  onBeforeUnmount(() => {
    ro?.disconnect(); ro = null
    window.removeEventListener('resize', onWin)
    document.removeEventListener('visibilitychange', onVis)
    chart?.dispose(); chart = null
  })
})
</script>

<template>
  <div ref="el" style="width: 100%; height: 300px;" />
</template>
