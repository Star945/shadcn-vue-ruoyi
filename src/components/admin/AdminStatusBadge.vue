<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '@/components/ui/badge'

const props = withDefaults(defineProps<{
  label: string
  activeLabels?: string[]
  softLabels?: string[]
  dangerLabels?: string[]
}>(), {
  activeLabels: () => ['正常', '显示', '启用', '已启用', '稳定', '成功', '已就绪'],
  softLabels: () => ['停用', '关闭', '隐藏', '禁用', '暂停', '未读'],
  dangerLabels: () => ['异常', '失败', '错误', '告警', '关注', '危险'],
})

const variant = computed(() => {
  if (props.activeLabels.includes(props.label)) {
    return 'default'
  }

  if (props.dangerLabels.includes(props.label)) {
    return 'destructive'
  }

  if (props.softLabels.includes(props.label)) {
    return 'secondary'
  }

  return 'outline'
})
</script>

<template>
  <Badge :variant="variant" class="min-w-[3.5rem]">
    {{ label }}
  </Badge>
</template>
