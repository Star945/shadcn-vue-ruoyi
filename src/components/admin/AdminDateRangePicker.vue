<script setup lang="ts">
import type { DateRange, DateValue } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

import { DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { CalendarIcon, XIcon } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  start?: string
  end?: string
  placeholder?: string
  class?: HTMLAttributes['class']
  disabled?: boolean
  numberOfMonths?: number
}>(), {
  placeholder: '请选择日期范围',
  disabled: false,
  numberOfMonths: 2,
})

const emit = defineEmits<{
  (e: 'update:start', value: string): void
  (e: 'update:end', value: string): void
}>()

const formatter = new DateFormatter('zh-CN', {
  dateStyle: 'medium',
})

const fallbackDate: DateValue = today(getLocalTimeZone())
const placeholderValue = ref<DateValue>(fallbackDate)
const selectedRange = ref<DateRange | undefined>()

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

function buildRange(start?: string, end?: string): DateRange | undefined {
  const startValue = parseDateValue(start)
  const endValue = parseDateValue(end)

  if (!startValue && !endValue) {
    return undefined
  }

  return {
    start: startValue,
    end: endValue,
  }
}

function syncFromProps(start?: string, end?: string) {
  selectedRange.value = buildRange(start, end)
  placeholderValue.value = parseDateValue(start) ?? parseDateValue(end) ?? fallbackDate
}

watch(
  () => [props.start, props.end] as const,
  ([start, end]) => {
    syncFromProps(start, end)
  },
  { immediate: true },
)

const calendarPlaceholder = computed(() => placeholderValue.value as DateValue)
const hasValue = computed(() => Boolean(selectedRange.value?.start || selectedRange.value?.end))
const displayValue = computed(() => {
  const startValue = selectedRange.value?.start
  const endValue = selectedRange.value?.end

  if (startValue && endValue) {
    return `${formatter.format(startValue.toDate(getLocalTimeZone()))} - ${formatter.format(endValue.toDate(getLocalTimeZone()))}`
  }

  if (startValue) {
    return formatter.format(startValue.toDate(getLocalTimeZone()))
  }

  if (endValue) {
    return formatter.format(endValue.toDate(getLocalTimeZone()))
  }

  return props.placeholder
})

function emitRange(nextValue: DateRange | undefined) {
  selectedRange.value = nextValue
  placeholderValue.value = nextValue?.start ?? nextValue?.end ?? fallbackDate
  emit('update:start', nextValue?.start?.toString() ?? '')
  emit('update:end', nextValue?.end?.toString() ?? '')
}

function handleStartValueUpdate(startValue: DateRange['start'] | undefined) {
  if (startValue) {
    placeholderValue.value = startValue
  }
}

function clearRange(event?: Event) {
  event?.stopPropagation()
  emitRange(undefined)
}
</script>

<template>
  <div :class="cn('relative w-full min-w-0', props.class)">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          :disabled="disabled"
          class="w-full justify-start pr-10 text-left font-normal"
          :class="!hasValue ? 'text-muted-foreground' : undefined"
        >
          <CalendarIcon class="size-4 text-muted-foreground" />
          <span class="truncate">{{ displayValue }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
        <RangeCalendar
          :model-value="selectedRange"
          :placeholder="calendarPlaceholder"
          weekday-format="short"
          :number-of-months="numberOfMonths"
          initial-focus
          @update:model-value="emitRange"
          @update:start-value="handleStartValueUpdate"
        />
      </PopoverContent>
    </Popover>

    <Button
      v-if="hasValue"
      variant="ghost"
      size="icon-sm"
      class="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-full"
      @click="clearRange"
    >
      <XIcon class="size-4" />
      <span class="sr-only">清空日期范围</span>
    </Button>
  </div>
</template>
