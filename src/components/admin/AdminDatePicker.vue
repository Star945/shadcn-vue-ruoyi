<script setup lang="ts">
import type { DateValue } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'
import { CalendarIcon, XIcon } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  class?: HTMLAttributes['class']
  disabled?: boolean
}>(), {
  placeholder: '请选择日期',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const formatter = new DateFormatter('zh-CN', {
  dateStyle: 'medium',
})

const selectedDate = ref<DateValue | undefined>()

function parseDateValue(value?: string) {
  if (!value) {
    return undefined
  }

  try {
    return parseDate(value)
  }
  catch {
    return undefined
  }
}

watch(
  () => props.modelValue,
  (value) => {
    selectedDate.value = parseDateValue(value)
  },
  { immediate: true },
)

const displayValue = computed(() => {
  if (!selectedDate.value) {
    return props.placeholder
  }
  return formatter.format(selectedDate.value.toDate(getLocalTimeZone()))
})

function handleDateChange(value: DateValue | undefined) {
  selectedDate.value = value
  emit('update:modelValue', value?.toString() ?? '')
}

function clearDate() {
  handleDateChange(undefined)
}
</script>

<template>
  <div :class="cn('flex items-center gap-2', props.class)">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          :disabled="disabled"
          class="w-full justify-start text-left font-normal"
          :class="!selectedDate ? 'text-muted-foreground' : undefined"
        >
          <CalendarIcon class="size-4 text-muted-foreground" />
          <span class="truncate">{{ displayValue }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
        <Calendar :model-value="selectedDate" initial-focus @update:model-value="handleDateChange" />
      </PopoverContent>
    </Popover>

    <Button
      v-if="selectedDate"
      variant="ghost"
      size="icon-sm"
      class="shrink-0"
      @click="clearDate"
    >
      <XIcon class="size-4" />
      <span class="sr-only">清空日期</span>
    </Button>
  </div>
</template>
