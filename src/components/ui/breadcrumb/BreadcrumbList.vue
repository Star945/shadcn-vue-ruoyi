<script lang="ts" setup>
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <ol
    data-slot="breadcrumb-list"
    :class="cn('flex w-max min-w-full flex-nowrap items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground sm:gap-2.5', props.class)"
  >
    <slot />
  </ol>
</template>
