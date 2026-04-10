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
    :class="cn(
      'group relative flex min-w-0 items-center gap-3 overflow-hidden transition duration-300 hover:-translate-y-[1px]',
      compact
        ? 'size-11 justify-center rounded-[calc(var(--radius)*1.1)] border border-white/12 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--sidebar-primary)_92%,white)_0%,color-mix(in_oklab,var(--primary)_42%,var(--sidebar-primary))_100%)] text-white shadow-[0_20px_40px_-22px_rgba(15,23,42,0.75)]'
        : 'rounded-[calc(var(--radius)*1.25)] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.86)_58%,color-mix(in_oklab,var(--primary)_8%,white)_100%)] px-3 py-2.5 text-slate-950 shadow-[0_24px_44px_-30px_rgba(15,23,42,0.45)] ring-1 ring-white/60 dark:border-white/10 dark:bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sidebar-primary)_88%,black)_0%,color-mix(in_oklab,var(--sidebar-primary)_78%,var(--primary))_58%,color-mix(in_oklab,var(--accent)_22%,var(--sidebar-primary))_100%)] dark:text-white dark:ring-white/10',
      $props.class,
    )"
    :style="compact
      ? { boxShadow: '0 20px 42px -24px var(--surface-glow-primary)' }
      : { boxShadow: '0 26px 52px -32px var(--surface-glow-primary)' }"
  >
    <span
      v-if="!compact"
      class="pointer-events-none absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.58),transparent_72%)] opacity-75 dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_72%)]"
    />
    <span
      v-if="!compact"
      class="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-[linear-gradient(90deg,color-mix(in_oklab,var(--theme-primary)_16%,transparent),color-mix(in_oklab,var(--theme-primary)_72%,var(--theme-accent)),color-mix(in_oklab,var(--theme-accent)_24%,transparent))]"
    />
    <div class="relative flex aspect-square size-10 items-center justify-center rounded-[calc(var(--radius)*0.95)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--sidebar-primary)_88%,white)_0%,color-mix(in_oklab,var(--primary)_48%,var(--sidebar-primary))_100%)] text-white shadow-[0_18px_34px_-18px_rgba(15,23,42,0.7)] ring-1 ring-black/5 dark:ring-white/12">
      <component :is="resolveIcon('sparkles')" class="size-[18px]" />
    </div>
    <div v-if="!compact" class="relative grid min-w-0 flex-1 text-left text-sm leading-tight">
      <span class="truncate text-[15px] font-semibold tracking-tight text-slate-950 dark:text-white">RuoYi Modern 后台</span>
      <span class="truncate text-[10px] font-medium uppercase tracking-[0.26em] text-slate-500 dark:text-white/62">Vue 3 Operations Console</span>
    </div>
    <span
      v-if="!compact"
      class="pointer-events-none absolute right-3 top-3 size-2.5 rounded-full bg-[var(--theme-accent)] shadow-[0_0_0_4px_color-mix(in_oklab,var(--theme-accent)_16%,transparent)]"
    />
  </RouterLink>
</template>
