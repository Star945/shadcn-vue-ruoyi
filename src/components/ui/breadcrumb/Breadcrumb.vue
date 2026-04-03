<script lang="ts" setup>
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <nav
    aria-label="面包屑导航"
    data-slot="breadcrumb"
    :class="cn('overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', props.class)"
  >
    <slot />
  </nav>
</template>
