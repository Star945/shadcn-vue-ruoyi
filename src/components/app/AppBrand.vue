<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { resolveIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

withDefaults(defineProps<{
  compact?: boolean
  class?: string
}>(), {
  compact: false,
  class: '',
})
</script>

<template>
  <RouterLink
    to="/index"
    :class="cn('flex min-w-0 items-center gap-3 rounded-[var(--button-radius)] transition hover:opacity-95', compact ? 'px-2 py-1.5' : 'px-0 py-0', $props.class)"
  >
    <div class="flex aspect-square size-8 items-center justify-center rounded-xl bg-white/15 text-current shadow-sm ring-1 ring-white/10">
      <component :is="resolveIcon('sparkles')" class="size-4" />
    </div>
    <div v-if="!compact" class="grid min-w-0 flex-1 text-left text-sm leading-tight">
      <span class="truncate font-semibold">RuoYi Modern 后台</span>
      <span class="truncate text-xs opacity-80">Vue 3 管理后台</span>
    </div>
  </RouterLink>
</template>
