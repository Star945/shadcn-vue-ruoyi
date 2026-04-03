<script setup lang="ts">
import { ChevronDown, ChevronUp, RotateCcw, Search, SlidersHorizontal } from 'lucide-vue-next'
import { computed, ref, useSlots } from 'vue'

import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  gridClass?: string
  advancedGridClass?: string
  fieldWrapClass?: string
  queryText?: string
  resetText?: string
  advancedText?: string
  collapseText?: string
  hideLabels?: boolean
}>(), {
  title: '',
  description: '',
  gridClass: 'sm:grid-cols-2 xl:grid-cols-3',
  advancedGridClass: '',
  fieldWrapClass: '',
  queryText: '查询',
  resetText: '重置',
  advancedText: '高级搜索',
  collapseText: '收起筛选',
  hideLabels: true,
})

const emit = defineEmits<{
  (e: 'query'): void
  (e: 'reset'): void
}>()

const slots = useSlots()
const advancedOpen = ref(false)
const hasAdvanced = computed(() => Boolean(slots.advanced))
</script>

<template>
  <AdminSectionCard
    hide-header
    card-class="border-white/50 bg-white/60 shadow-sm"
    content-class="space-y-3 px-4 py-4 sm:px-5 sm:py-5"
  >
    <div class="flex flex-wrap items-center gap-3">
      <div
        :class="cn(
          'flex flex-wrap items-center gap-3',
          '[&>[data-admin-form-root]]:w-full sm:[&>[data-admin-form-root]]:w-auto',
          '[&>[data-admin-form-root]]:min-w-[11rem] [&>[data-admin-form-root]]:max-w-[26rem]',
          '[&_[data-admin-form-content]]:w-full',
          props.hideLabels && '[&_[data-admin-form-label]]:hidden [&_[data-admin-form-root]]:space-y-0',
          props.fieldWrapClass,
        )"
      >
        <slot />
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions">
          <Button size="sm" class="min-w-[88px]" @click="emit('query')">
            <Search class="size-4" />
            {{ queryText }}
          </Button>
          <Button variant="outline" size="sm" class="min-w-[88px]" @click="emit('reset')">
            <RotateCcw class="size-4" />
            {{ resetText }}
          </Button>
          <Button
            v-if="hasAdvanced"
            variant="ghost"
            size="sm"
            class="min-w-[112px]"
            @click="advancedOpen = !advancedOpen"
          >
            <SlidersHorizontal class="size-4" />
            {{ advancedOpen ? collapseText : advancedText }}
            <ChevronUp v-if="advancedOpen" class="size-4" />
            <ChevronDown v-else class="size-4" />
          </Button>
        </slot>
      </div>
    </div>

    <div v-if="hasAdvanced && advancedOpen" class="border-t border-border/60 pt-3">
      <div
        :class="cn(
          'grid gap-3 justify-items-start [&>*]:w-full [&>*]:max-w-[26rem]',
          props.hideLabels && '[&_[data-admin-form-label]]:hidden [&_[data-admin-form-root]]:space-y-0',
          props.advancedGridClass || props.gridClass,
        )"
      >
        <slot name="advanced" />
      </div>
    </div>
  </AdminSectionCard>
</template>
