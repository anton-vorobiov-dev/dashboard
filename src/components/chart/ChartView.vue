<!-- src/components/chart/ChartView.vue -->
<template>
  <div ref="el" style="width: 100%; height: 300px" />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useDashStore } from '@/stores/dashboard'

const props = defineProps<{ viewId: string; active?: boolean }>()

const dash = useDashStore()
const view = computed(() => dash.views[props.viewId])

const el = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function makeSeries(range?: '7d' | '30d' | '90d') {
  const len = range === '90d' ? 90 : range === '30d' ? 30 : 7
  return Array.from({ length: len }, (_, i) => [i, Math.round(100 + Math.sin(i / 2) * 20 + Math.random() * 10)])
}

function render() {
  if (!el.value) return
  if (!chart) chart = echarts.init(el.value)
  chart.setOption({
    grid: { left: 32, top: 16, right: 16, bottom: 32 },
    xAxis: { type: 'category', boundaryGap: false, axisLabel: { show: false } },
    yAxis: { type: 'value' },
    tooltip: { trigger: 'axis' },
    series: [{
      type: 'line',
      smooth: true,
      areaStyle: {},
      data: makeSeries(view.value?.state.dateRange)
    }]
  })
  chart.resize()
}

function onWindowResize() {
  chart?.resize()
}

onMounted(() => {
  render()
  ro = new ResizeObserver(() => chart?.resize())
  if (el.value) ro.observe(el.value)
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', onWindowResize)
  chart?.dispose()
  chart = null
})

watch(() => props.active, (isActive) => {
  if (isActive) nextTick(() => chart?.resize())
})

watch(() => view.value?.state, () => render(), { deep: true })
</script>
