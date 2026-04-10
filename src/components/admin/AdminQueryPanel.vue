<script setup lang="ts">
import { ChevronDown, ChevronUp, RotateCcw, Search, SlidersHorizontal } from 'lucide-vue-next'
import { computed, ref, useSlots } from 'vue'

import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  embedded?: boolean
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
  embedded: false,
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
  <div v-if="embedded" class="space-y-4">
    <div class="px-0 py-0">
      <div class="flex flex-wrap items-center gap-2.5">
        <div
          :class="cn(
            'flex flex-wrap items-center gap-2.5',
            '[&>[data-admin-form-root]]:w-full sm:[&>[data-admin-form-root]]:w-auto',
            '[&>[data-admin-form-root]]:min-w-[10.5rem] [&>[data-admin-form-root]]:max-w-[16rem]',
            '[&_[data-admin-form-content]]:w-full',
            props.hideLabels && '[&_[data-admin-form-label]]:hidden [&_[data-admin-form-root]]:space-y-0',
            '[&_[data-slot=input]]:h-10 [&_[data-slot=input]]:bg-background/85',
            '[&_[data-slot=select-trigger]]:h-10 [&_[data-slot=select-trigger]]:bg-background/85',
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
              class="min-w-[96px]"
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
    </div>

    <div v-if="hasAdvanced && advancedOpen" class="border-t border-border/60 pt-3">
      <div
        :class="cn(
          'grid gap-3 justify-items-start [&>*]:w-full [&>*]:max-w-[16rem]',
          props.hideLabels && '[&_[data-admin-form-label]]:hidden [&_[data-admin-form-root]]:space-y-0',
          props.advancedGridClass || props.gridClass,
        )"
      >
        <slot name="advanced" />
      </div>
    </div>
  </div>

  <AdminSectionCard
    v-else
    hide-header
    card-class="admin-shell-panel"
    content-class="space-y-4 px-4 py-4 sm:px-5 sm:py-5"
  >
    <div class="px-0 py-0">
      <div class="flex flex-wrap items-center gap-2.5">
      <div
        :class="cn(
          'flex flex-wrap items-center gap-2.5',
          '[&>[data-admin-form-root]]:w-full sm:[&>[data-admin-form-root]]:w-auto',
          '[&>[data-admin-form-root]]:min-w-[10.5rem] [&>[data-admin-form-root]]:max-w-[16rem]',
          '[&_[data-admin-form-content]]:w-full',
          props.hideLabels && '[&_[data-admin-form-label]]:hidden [&_[data-admin-form-root]]:space-y-0',
          '[&_[data-slot=input]]:h-10 [&_[data-slot=input]]:bg-background/85',
          '[&_[data-slot=select-trigger]]:h-10 [&_[data-slot=select-trigger]]:bg-background/85',
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
            class="min-w-[96px]"
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
    </div>

    <div v-if="hasAdvanced && advancedOpen" class="border-t border-border/60 pt-3">
      <div
        :class="cn(
          'grid gap-3 justify-items-start [&>*]:w-full [&>*]:max-w-[16rem]',
          props.hideLabels && '[&_[data-admin-form-label]]:hidden [&_[data-admin-form-root]]:space-y-0',
          props.advancedGridClass || props.gridClass,
        )"
      >
        <slot name="advanced" />
      </div>
    </div>
  </AdminSectionCard>
</template>
