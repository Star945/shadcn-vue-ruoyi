<script setup lang="ts">
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'

import { resolveThemeVisuals } from '@/theme'
import { useUiStore } from '@/stores/ui'

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const ui = useUiStore()

const props = defineProps<{
  data: number[]
  labels: string[]
  height?: string
}>()

const themeVisuals = computed(() => resolveThemeVisuals(ui.themeApplication))

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    padding: [10, 12],
    backgroundColor: themeVisuals.value.chartTooltipBackground,
    borderColor: themeVisuals.value.chartTooltipBorder,
    borderWidth: 1,
    textStyle: {
      color: themeVisuals.value.chartTooltipText,
    },
    extraCssText: 'border-radius: 18px; box-shadow: 0 18px 36px -24px rgba(15,23,42,0.45);',
  },
  grid: {
    left: '0%',
    right: '2%',
    top: '8%',
    bottom: '2%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.labels,
    axisLabel: {
      color: themeVisuals.value.chartAxis,
      margin: 14,
    },
    axisLine: {
      lineStyle: {
        color: themeVisuals.value.chartGrid,
      },
    },
    axisTick: {
      show: false,
    },
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: themeVisuals.value.chartAxis,
      margin: 12,
    },
    axisLine: {
      show: false,
    },
    axisTick: {
      show: false,
    },
    splitLine: {
      lineStyle: {
        color: themeVisuals.value.chartGrid,
        type: 'dashed',
      },
    },
  },
  series: [
    {
      data: props.data,
      type: 'line',
      smooth: true,
      showSymbol: false,
      symbolSize: 8,
      emphasis: {
        focus: 'series',
      },
      itemStyle: {
        color: themeVisuals.value.chartLineStart,
      },
      lineStyle: {
        width: 3.5,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: themeVisuals.value.chartLineStart },
            { offset: 1, color: themeVisuals.value.chartLineEnd },
          ],
        },
        shadowColor: themeVisuals.value.glowPrimary,
        shadowBlur: 18,
        shadowOffsetY: 8,
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: themeVisuals.value.chartAreaStart },
            { offset: 1, color: themeVisuals.value.chartAreaEnd },
          ],
        },
      },
    },
  ],
}))
</script>

<template>
  <div :style="{ height: height || '240px', width: '100%' }">
    <VChart :option="chartOption" autoresize />
  </div>
</template>
