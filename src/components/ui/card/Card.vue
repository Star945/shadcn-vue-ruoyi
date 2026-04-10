<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn(
        'admin-shell-panel text-card-foreground relative flex flex-col gap-4 overflow-hidden py-4 sm:gap-6 sm:py-6',
        props.class,
        'rounded-[var(--radius-xl)]',
      )
    "
  >
    <slot />
  </div>
</template>
