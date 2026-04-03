<script setup lang="ts">
import { computed } from 'vue'
import { MoreHorizontal } from 'lucide-vue-next'

import type { AdminTableActionItem } from '@/components/admin/data-table'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const props = withDefaults(defineProps<{
  items: Array<AdminTableActionItem>
  row?: Record<string, any>
  index?: number
  collapseAfter?: number
  inlineLimit?: number
  customClass?: string
}>(), {
  row: () => ({}),
  index: 0,
  collapseAfter: 3,
  inlineLimit: 2,
  customClass:''
})

function resolveToggle(value: boolean | ((row: Record<string, any>, index: number) => boolean) | undefined, fallback = true) {
  if (typeof value === 'function') {
    return value(props.row, props.index)
  }
  if (typeof value === 'boolean') {
    return value
  }
  return fallback
}

const visibleItems = computed(() => props.items.filter(item => resolveToggle(item.visible, true)))
const inlineItems = computed(() => visibleItems.value.length > props.collapseAfter ? visibleItems.value.slice(0, props.inlineLimit) : visibleItems.value)
const overflowItems = computed(() => visibleItems.value.length > props.collapseAfter ? visibleItems.value.slice(props.inlineLimit) : [])

function isDisabled(item: AdminTableActionItem) {
  return resolveToggle(item.disabled, false)
}

function actionClass(item: AdminTableActionItem) {
  if (item.tone === 'danger') {
    return 'text-destructive hover:text-destructive/80'
  }
  if (item.tone === 'muted') {
    return 'text-muted-foreground hover:text-foreground'
  }
  return 'text-foreground/90 hover:text-foreground'
}

function trigger(item: AdminTableActionItem, event?: Event) {
  event?.stopPropagation()
  if (isDisabled(item)) {
    return
  }
  item.onClick?.(props.row, props.index)
}
</script>

<template>
  <div v-if="visibleItems.length" class="flex flex-wrap justify-start gap-x-2 gap-y-1 sm:justify-end">
    <Button
      v-for="(item, actionIndex) in inlineItems"
      :key="item.key ?? `${item.label}-${actionIndex}`"
      size="sm"
      variant="link"
      class="h-auto !px-0 text-xs"
      :class="[actionClass(item), item.icon ? 'gap-1' : '',]"
      :disabled="isDisabled(item)"
      :title="item.label"
      :aria-label="item.label"
      @click="trigger(item, $event)"
    >
      <component :is="item.icon" v-if="item.icon" class="size-3.5" />
      {{ item.label }}
    </Button>

    <DropdownMenu v-if="overflowItems.length">
      <DropdownMenuTrigger as-child>
        <Button size="sm" variant="link" class="h-auto gap-1 px-0 text-xs text-muted-foreground hover:text-foreground">
          更多
          <MoreHorizontal class="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-36">
        <DropdownMenuItem
          v-for="(item, actionIndex) in overflowItems"
          :key="item.key ?? `overflow-${item.label}-${actionIndex}`"
          :disabled="isDisabled(item)"
          :variant="item.tone === 'danger' ? 'destructive' : 'default'"
          :title="item.label"
          @select.prevent="trigger(item)"
        >
          <component :is="item.icon" v-if="item.icon" class="mr-2 size-3.5" />
          <span>{{ item.label }}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
