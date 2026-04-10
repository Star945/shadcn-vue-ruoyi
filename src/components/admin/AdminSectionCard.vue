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
  <Card :class="cn('admin-shell-panel-strong', cardClass)">
    <CardHeader
      v-if="!props.hideHeader && (props.title || props.description || $slots.headerExtra)"
      :class="cn('border-b border-border/55 pb-4 sm:pb-5', headerClass)"
    >
      <div class="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div class="min-w-0 space-y-1.5">
          <CardTitle v-if="title" class="text-base font-semibold tracking-tight sm:text-lg">{{ title }}</CardTitle>
          <CardDescription v-if="description" class="max-w-2xl text-sm leading-6 text-muted-foreground/90">{{ description }}</CardDescription>
        </div>
        <div v-if="$slots.headerExtra" class="grid w-full grid-cols-1 gap-2 md:flex md:w-auto md:flex-wrap md:justify-end [&>*]:w-full md:[&>*]:w-auto">
          <slot name="headerExtra" />
        </div>
      </div>
    </CardHeader>
    <CardContent :class="cn('pt-4 sm:pt-5', contentClass)">
      <slot />
    </CardContent>
  </Card>
</template>
