<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  cardClass?: string
  headerClass?: string
  contentClass?: string
  hideHeader?: boolean
}>(), {
  title: '',
  description: '',
  cardClass: '',
  headerClass: '',
  contentClass: '',
  hideHeader: false,
})
</script>

<template>
  <Card :class="cn('border-white/60 bg-white/75 dark:border-white/10 dark:bg-white/5', cardClass)">
    <CardHeader
      v-if="!props.hideHeader && (props.title || props.description || $slots.headerExtra)"
      :class="headerClass"
    >
      <div class="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div class="min-w-0 space-y-1.5">
          <CardTitle v-if="title">{{ title }}</CardTitle>
          <CardDescription v-if="description">{{ description }}</CardDescription>
        </div>
        <div v-if="$slots.headerExtra" class="grid w-full grid-cols-1 gap-2 md:flex md:w-auto md:justify-end [&>*]:w-full md:[&>*]:w-auto">
          <slot name="headerExtra" />
        </div>
      </div>
    </CardHeader>
    <CardContent :class="contentClass">
      <slot />
    </CardContent>
  </Card>
</template>
