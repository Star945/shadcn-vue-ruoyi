<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { OverlayScrollbar } from '@/components/ui/overlay-scrollbar'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <OverlayScrollbar
    data-slot="sidebar-content"
    data-sidebar="content"
    orientation="vertical"
    :class="cn('min-h-0 flex-1', props.class)"
    viewport-class="h-full"
    view-class="flex min-h-full flex-col gap-2 pr-2 group-data-[collapsible=icon]:pr-0"
  >
    <slot />
  </OverlayScrollbar>
</template>
