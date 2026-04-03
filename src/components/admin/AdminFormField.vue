<script setup lang="ts">
import { cn } from '@/lib/utils'

withDefaults(defineProps<{
  label: string
  fieldClass?: string
  labelClass?: string
  contentClass?: string
  hideLabel?: boolean
}>(), {
  fieldClass: '',
  labelClass: '',
  contentClass: '',
  hideLabel: false,
})
</script>

<template>
  <div data-admin-form-root :class="cn('space-y-2', fieldClass)">
    <p v-if="!hideLabel" data-admin-form-label :class="cn('text-sm font-medium leading-5', labelClass)">{{ label }}</p>
    <div data-admin-form-content :class="contentClass">
      <slot />
    </div>
  </div>
</template>
