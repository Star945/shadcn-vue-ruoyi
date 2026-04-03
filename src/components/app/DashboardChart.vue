<script setup lang="ts">
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useUiStore } from '@/stores/ui'

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const ui = useUiStore()

const props = defineProps<{
  data: number[]
  labels: string[]
  height?: string
}>()

const chartOption = computed(() => {
  const isDark = ui.theme === 'dark'
  const primaryColor = ui.themeApplication.customTheme?.primary || (isDark ? '#2dd4bf' : '#0f766e')
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      textStyle: {
        color: isDark ? '#f8fafc' : '#0f172a'
      }
    },
    grid: {
      left: '0%',
      right: '2%',
      top: '5%',
      bottom: '0%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.labels,
      axisLabel: {
        color: isDark ? '#94a3b8' : '#64748b'
      },
      axisLine: {
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
        }
      }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        }
      },
      axisLabel: {
        color: isDark ? '#94a3b8' : '#64748b'
      }
    },
    series: [
      {
        data: props.data,
        type: 'line',
        smooth: true,
        showSymbol: false,
        itemStyle: {
          color: primaryColor
        },
        lineStyle: {
          width: 3,
          shadowColor: 'rgba(0,0,0,0.1)',
          shadowBlur: 10,
          shadowOffsetY: 5
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${primaryColor}66` }, // 40% opacity approx
              { offset: 1, color: `${primaryColor}00` }  // 0% opacity
            ]
          }
        }
      }
    ]
  }
})
</script>

<template>
  <div :style="{ height: height || '240px', width: '100%' }">
    <VChart :option="chartOption" autoresize />
  </div>
</template>
