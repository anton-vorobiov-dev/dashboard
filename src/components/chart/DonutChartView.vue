<script setup lang="ts">
/**
 * Donut chart with robust sizing (same strategy as Bar).
 */
import { onMounted, onBeforeUnmount, ref, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

const props = defineProps<{ viewId: string; active?: boolean }>()
const isActive = computed(() => !!props.active)

function makeSlices() {
  const labels = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']
  return labels.map(name => ({ name, value: Math.round(10 + Math.random() * 90) }))
}

const el = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

const visibleWidth = () => (el.value ? el.value.getBoundingClientRect().width : 0)

async function afterVisibleResize() {
  await nextTick()
  requestAnimationFrame(() => {
    if (!el.value) return
    if (!chart) {
      const w = visibleWidth()
      if (w <= 0) {
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
    tooltip: { trigger: 'item' },
    legend: { orient: 'horizontal', top: 0 },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: makeSlices()
    }]
  })
}

watch(isActive, (a) => { if (a) afterVisibleResize() })

onMounted(() => {
  if (isActive.value) afterVisibleResize()

  if ('ResizeObserver' in window && el.value) {
    ro = new ResizeObserver(() => { if (chart) chart.resize() })
    ro.observe(el.value)
  }
  const onWin = () => chart?.resize()
  const onVis = () => { if (document.visibilityState === 'visible' && isActive.value) afterVisibleResize() }
  window.addEventListener('resize', onWin)
  document.addEventListener('visibilitychange', onVis)

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
